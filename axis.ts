import {
  createPublicClient,
  http,
  parseAbi,
  isAddress,
  type Address,
} from "viem";
import { base } from "viem/chains";

/**
 * Axis Robotics Activity Score
 *
 * IMPORTANT:
 * All activity data is read directly from the Axis Robotics
 * contract on Base.
 */

export const CONTRACT =
  "0xF91A90baA9E044Da084df369445A59D859d640dB" as Address;

const RPC_URL = "https://mainnet.base.org";

const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

/**
 * Axis contract ABI
 */
const ABI = parseAbi([
  "function getUserRecords(address user) view returns (uint256[])",
  "function records(uint256) view returns (uint256 dataId, uint256 taskId, address user, uint256 score, uint256 simulationTime, uint256 timestamp, bool invalidated)",
]);

export type RecordItem = {
  dataId: bigint;
  taskId: bigint;
  score: number;
  simulationTime: number;
  timestamp: number;
  invalidated: boolean;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Retry an RPC request.
 *
 * Handles Base public RPC 429/rate-limit errors.
 */
async function readWithRetry<T>(
  fn: () => Promise<T>,
  retries = 5,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === retries) {
        break;
      }

      // 1s -> 2s -> 4s -> 8s -> 16s
      const delay = 1000 * Math.pow(2, attempt);

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Small delay between Axis record RPC calls.
 *
 * This is intentionally conservative because
 * mainnet.base.org can return HTTP 429.
 */
async function rpcDelay() {
  await sleep(500);
}

const clamp = (
  n: number,
  min = 0,
  max = 100,
) => Math.max(min, Math.min(max, n));

function normalize(value: number, cap: number) {
  if (cap <= 0) return 0;
  return clamp((value / cap) * 100);
}

/**
 * Calculate Axis activity metrics.
 *
 * Model:
 *
 * 30% signed trajectories
 * 25% verified
 * 25% average score / quality
 * 10% diversity
 * 10% consistency
 */
export function calculateMetrics(records: RecordItem[]) {
  /**
   * Only non-invalidated Axis records count.
   */
  const valid = records.filter((r) => !r.invalidated);

  /**
   * Number of signed trajectories.
   */
  const signed = valid.length;

  /**
   * Verification percentage.
   *
   * If a record exists but is invalidated, it is treated
   * as not verified.
   */
  const verified =
    records.length > 0
      ? (valid.length / records.length) * 100
      : 0;

  /**
   * Average Axis task score.
   */
  const avgScore =
    valid.length > 0
      ? valid.reduce((sum, r) => sum + r.score, 0) / valid.length
      : 0;

  /**
   * Unique Axis tasks.
   */
  const tasks = new Set(
    valid.map((r) => r.taskId.toString()),
  );

  /**
   * Diversity:
   * 25 unique tasks = 100.
   */
  const diversity = normalize(tasks.size, 25);

  /**
   * Quality is the average score reported by Axis.
   */
  const quality = clamp(avgScore);

  /**
   * Activity volume.
   *
   * 30 valid trajectories = 100.
   */
  const volumeScore = normalize(signed, 30);

  /**
   * Active days.
   */
  const activeDays = new Set(
    valid.map((r) =>
      new Date(r.timestamp * 1000)
        .toISOString()
        .slice(0, 10),
    ),
  );

  const sortedDays = Array.from(activeDays).sort();

  /**
   * Best consecutive-day streak.
   */
  let bestStreak = 0;
  let current = 0;
  let previous = "";

  for (const day of sortedDays) {
    if (!previous) {
      current = 1;
    } else {
      const a = new Date(`${previous}T00:00:00Z`).getTime();
      const b = new Date(`${day}T00:00:00Z`).getTime();

      const difference = b - a;

      if (difference === 86400000) {
        current += 1;
      } else {
        current = 1;
      }
    }

    bestStreak = Math.max(bestStreak, current);
    previous = day;
  }

  /**
   * Consistency:
   *
   * 12 active days -> 60 points
   * 8-day streak -> 40 points
   *
   * Maximum = 100.
   */
  const consistency = clamp(
    Math.min(activeDays.size, 12) * 5 +
      Math.min(bestStreak, 8) * 5,
  );

  /**
   * Final Axis Activity Score.
   */
  const activityScore = Math.round(
    volumeScore * 0.30 +
      verified * 0.25 +
      quality * 0.25 +
      diversity * 0.10 +
      consistency * 0.10,
  );

  /**
   * Simulation time metrics.
   */
  const fastest =
    valid.length > 0
      ? Math.min(
          ...valid.map(
            (r) => r.simulationTime / 1000,
          ),
        )
      : 0;

  const slowest =
    valid.length > 0
      ? Math.max(
          ...valid.map(
            (r) => r.simulationTime / 1000,
          ),
        )
      : 0;

  const totalTime =
    valid.length > 0
      ? valid.reduce(
          (sum, r) => sum + r.simulationTime,
          0,
        ) / 1000
      : 0;

  return {
    trajectories: signed,
    signed,

    verified,
    avgScore,
    quality,

    diversity,
    tasks: tasks.size,

    activeDays: activeDays.size,
    bestStreak,

    fastest,
    slowest,
    totalTime,

    consistency,

    activityScore,

    records: valid,
  };
}

/**
 * Read Axis data for a wallet.
 *
 * IMPORTANT:
 * This function reads ONLY from the Axis Robotics contract.
 */
export async function getWalletData(wallet: string) {
  if (!isAddress(wallet)) {
    throw new Error("Invalid EVM wallet address");
  }

  const user = wallet as Address;

  /**
   * STEP 1
   *
   * Ask the Axis contract which record IDs belong
   * to this wallet.
   */
  const ids = await readWithRetry(() =>
    client.readContract({
      address: CONTRACT,
      abi: ABI,
      functionName: "getUserRecords",
      args: [user],
    }),
  );

  /**
   * No Axis records.
   */
  if (!ids || ids.length === 0) {
    return {
      wallet: user,
      records: [],
      metrics: calculateMetrics([]),
    };
  }

  const records: RecordItem[] = [];

  /**
   * STEP 2
   *
   * Read every Axis record individually.
   *
   * Sequential requests are intentional.
   * This prevents Base RPC 429 errors.
   */
  for (const id of ids) {
    try {
      const r = await readWithRetry(() =>
        client.readContract({
          address: CONTRACT,
          abi: ABI,
          functionName: "records",
          args: [id],
        }),
      );

      records.push({
        dataId: r[0],
        taskId: r[1],
        score: Number(r[3]),
        simulationTime: Number(r[4]),
        timestamp: Number(r[5]),
        invalidated: Boolean(r[6]),
      });
    } catch (error) {
      /**
       * If one Axis record fails after all retries,
       * continue with the remaining Axis records.
       *
       * This prevents the UI from staying in Loading forever.
       */
      console.warn(
        `Axis record ${id.toString()} failed`,
        error,
      );
    }

    /**
     * Important for Base public RPC rate limiting.
     */
    await rpcDelay();
  }

  /**
   * STEP 3
   *
   * Calculate score ONLY from the Axis records
   * successfully read above.
   */
  return {
    wallet: user,
    records,
    metrics: calculateMetrics(records),
  };
}
