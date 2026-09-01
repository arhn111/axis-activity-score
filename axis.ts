import {
  createPublicClient,
  http,
  parseAbi,
  isAddress,
  type Address,
} from "viem";
import { base } from "viem/chains";

export const CONTRACT =
  "0xF91A90baA9E044Da084df369445A59D859d640dB" as Address;

// Base Mainnet RPC.
// Environment variable हो तो उसे use करेगा,
// वरना public Base RPC fallback रहेगा.
const RPC_URL =
  process.env.BASE_RPC_URL || "https://mainnet.base.org";

const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

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

const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));

function normalize(value: number, cap: number) {
  return clamp((value / cap) * 100);
}

/**
 * Retry helper.
 *
 * Axis data हमेशा उसी Axis contract से पढ़ा जाता है.
 * Retry सिर्फ RPC request failure / rate limit के लिए है.
 */
async function readWithRetry<T>(
  fn: () => Promise<T>,
  retries = 4
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === retries) {
        throw error;
      }

      // Exponential backoff:
      // 1s -> 2s -> 4s -> 8s
      const delay = 1000 * 2 ** attempt;

      await new Promise((resolve) =>
        setTimeout(resolve, delay)
      );
    }
  }

  throw lastError;
}

/**
 * Small delay between individual Axis record calls.
 * This prevents Base public RPC 429 errors.
 */
async function rpcDelay(ms = 250) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Axis Activity Score calculation.
 *
 * Same model as the current checker:
 *
 * 30% signed trajectories
 * 25% verified
 * 25% average score / quality
 * 10% diversity
 * 10% consistency
 */
export function calculateMetrics(records: RecordItem[]) {
  const valid = records.filter((r) => !r.invalidated);

  const signed = valid.length;

  const verified = records.length
    ? (valid.length / records.length) * 100
    : 0;

  const avgScore = valid.length
    ? valid.reduce((sum, r) => sum + r.score, 0) / valid.length
    : 0;

  const tasks = new Set(
    valid.map((r) => r.taskId.toString())
  );

  const diversity = normalize(tasks.size, 25);

  const quality = avgScore;

  // Active days
  const activeDays = new Set(
    valid.map((r) =>
      new Date(r.timestamp * 1000)
        .toISOString()
        .slice(0, 10)
    )
  );

  const sortedDays = Array.from(activeDays).sort();

  let bestStreak = 0;
  let currentStreak = 0;
  let previousDay = "";

  for (const day of sortedDays) {
    if (!previousDay) {
      currentStreak = 1;
    } else {
      const a = new Date(`${previousDay}T00:00:00Z`).getTime();
      const b = new Date(`${day}T00:00:00Z`).getTime();

      currentStreak =
        b - a === 86400000
          ? currentStreak + 1
          : 1;
    }

    bestStreak = Math.max(bestStreak, currentStreak);
    previousDay = day;
  }

  const consistency = clamp(
    Math.min(activeDays.size / 12, 1) * 60 +
      Math.min(bestStreak / 8, 1) * 40
  );

  const volumeScore = normalize(signed, 30);

  const activityScore = Math.round(
    volumeScore * 0.30 +
      verified * 0.25 +
      quality * 0.25 +
      diversity * 0.10 +
      consistency * 0.10
  );

  const fastest = valid.length
    ? Math.min(
        ...valid.map((r) => r.simulationTime)
      ) / 1000
    : 0;

  const slowest = valid.length
    ? Math.max(
        ...valid.map((r) => r.simulationTime)
      ) / 1000
    : 0;

  const totalTime = valid.reduce(
    (sum, r) => sum + r.simulationTime,
    0
  ) / 1000;

  return {
    trajectories: signed,
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
 * Data is read directly from the Axis Robotics contract.
 */
export async function getWalletData(wallet: string) {
  if (!isAddress(wallet)) {
    throw new Error("Invalid EVM wallet address");
  }

  const user = wallet as Address;

  // Step 1:
  // Ask the Axis contract which records belong to this wallet.
  const ids = await readWithRetry(() =>
    client.readContract({
      address: CONTRACT,
      abi: ABI,
      functionName: "getUserRecords",
      args: [user],
    })
  );

  const records: RecordItem[] = [];

  // Step 2:
  // Read each Axis record.
  // Delay + retry prevents Base RPC 429.
  for (const id of ids) {
    const r = await readWithRetry(() =>
      client.readContract({
        address: CONTRACT,
        abi: ABI,
        functionName: "records",
        args: [id],
      })
    );

    records.push({
      dataId: r[0],
      taskId: r[1],
      score: Number(r[3]),
      simulationTime: Number(r[4]),
      timestamp: Number(r[5]),
      invalidated: Boolean(r[6]),
    });

    await rpcDelay(250);
  }

  return {
    wallet: user,
    records,
    metrics: calculateMetrics(records),
  };
}
