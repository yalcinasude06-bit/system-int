import { stockRaceRounds, type StockRaceRound, type StockTank, type TankId } from "./stockRaceContent.ts";

export const STOCK_RACE_GAME_ID = "week-7-stock-race-v1";
export const STOCK_RACE_MS_PER_SECOND = 420;

export type StockRaceAttempt = {
  roundId: string;
  prediction: TankId;
};

export function stockAtTime(tank: StockTank, time: number): number {
  const level = tank.start + time * (tank.inflow - tank.outflow);
  return Math.max(0, Math.min(100, level));
}

export function timeToTarget(tank: StockTank, target: number): number {
  if (tank.start >= target) return 0;
  const netRate = tank.inflow - tank.outflow;
  return netRate > 0 ? (target - tank.start) / netRate : Number.POSITIVE_INFINITY;
}

export function raceResult(round: StockRaceRound) {
  const arrivals = round.tanks.map((tank) => ({ id: tank.id, time: timeToTarget(tank, round.target) }))
    .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
  return { winner: arrivals[0]!.id, time: arrivals[0]!.time, arrivals };
}

export function scoreStockRaceAttempts(attempts: StockRaceAttempt[]): number {
  return attempts.slice(0, stockRaceRounds.length).reduce((score, attempt, index) => {
    const round = stockRaceRounds[index];
    if (!round || attempt.roundId !== round.id || !round.tanks.some((tank) => tank.id === attempt.prediction)) return score;
    return score + (raceResult(round).winner === attempt.prediction ? 20 : 0);
  }, 0);
}
