import { createPublicClient, http, parseAbi, isAddress, type Address } from "viem";
import { base } from "viem/chains";

export const CONTRACT = "0xF91A90baA9E044Da084df369445A59D859d640dB" as Address;
const client = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });

const ABI = parseAbi([
  "function getUserRecords(address user) view returns (uint256[])",
  "function records(uint256) view returns (uint256 dataId,uint256 taskId,address user,uint256 score,uint256 simulationTime,uint256 timestamp,bool invalidated)",
]);

export type RecordItem = {
  dataId: bigint; taskId: bigint; score: number; simulationTime: number;
  timestamp: number; invalidated: boolean;
};

const clamp = (n:number,min=0,max=100) => Math.max(min, Math.min(max,n));

function normalize(value:number, cap:number) {
  return clamp((value / cap) * 100);
}

/**
 * Score model for this unofficial checker.
 * Weights are intentionally kept in one place so you can tune them.
 *
 * 20% signed trajectories
 * 15% verified
 * 15% avg score
 * 10% points
 * 10% badges
 * 15% quality
 * 15% diversity
 *
 * IMPORTANT: Axis Points/Badges are not stored in AttemptRegistry.
 * Until you connect the official Axis account/API source, the fallback
 * estimates are clearly marked in the UI.
 */
export function calculateMetrics(records: RecordItem[]) {
  const valid = records.filter(r => !r.invalidated);
  const signed = valid.length;
  const verified = records.length ? (valid.length / records.length) * 100 : 0;
  const avgScore = valid.length ? valid.reduce((s,r)=>s+r.score,0)/valid.length : 0;

  const tasks = new Set(valid.map(r=>r.taskId.toString()));
  const diversity = normalize(tasks.size, 25);
  const quality = avgScore;

  // Transparent unofficial activity model using only fields available on-chain.
  // 30% signed trajectories + 25% verified + 25% avg/quality + 10% diversity
  // + 10% consistency.
  const volumeScore = normalize(signed, 30);

  const activeDays = new Set(valid.map(r => new Date(r.timestamp*1000).toISOString().slice(0,10)));
  const sortedDays = [...activeDays].sort();
  let bestStreak = 0, current = 0, prev = "";
  for (const day of sortedDays) {
    if (!prev) current = 1;
    else {
      const a = new Date(prev+"T00:00:00Z").getTime();
      const b = new Date(day+"T00:00:00Z").getTime();
      current = b-a === 86400000 ? current+1 : 1;
    }
    bestStreak = Math.max(bestStreak,current);
    prev = day;
  }

  // More active signing days and consecutive days increase consistency.
  const consistency = clamp(Math.min(activeDays.size * 12, 60) + Math.min(bestStreak * 8, 40));

  const activityScore = Math.round(
    volumeScore * .30 +
    verified * .25 +
    quality * .25 +
    diversity * .10 +
    consistency * .10
  );

  const fastest = valid.length ? Math.min(...valid.map(r=>r.simulationTime))/1000 : 0;
  const slowest = valid.length ? Math.max(...valid.map(r=>r.simulationTime))/1000 : 0;
  const totalTime = valid.reduce((s,r)=>s+r.simulationTime,0)/1000;

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
    records: valid
  };
}

export async function getWalletData(wallet:string) {
  if (!isAddress(wallet)) throw new Error("Invalid EVM wallet address");
  const user = wallet as Address;
  const ids = await client.readContract({ address: CONTRACT, abi: ABI, functionName:"getUserRecords", args:[user] });

  // Avoid an oversized browser RPC burst.
  const records: RecordItem[] = [];
  for (const id of ids) {
    const r = await client.readContract({ address: CONTRACT, abi: ABI, functionName:"records", args:[id] });
    records.push({
      dataId:r[0], taskId:r[1], score:Number(r[3]), simulationTime:Number(r[4]),
      timestamp:Number(r[5]), invalidated:r[6]
    });
  }
  return { wallet:user, records, metrics:calculateMetrics(records) };
}