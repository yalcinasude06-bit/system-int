import { stockRaceRounds, type StockRaceRound, type StockTank, type TankId } from "./stockRaceContent.ts";

export const STOCK_RACE_GAME_ID = "week-7-stock-race-v1";
export const STOCK_RACE_MS_PER_SECOND = 420;

export type StockRaceAttempt = {
  roundId: string;
  prediction: TankId;
};

function ratesAt(tank: StockTank, time: number) {
  const changed = tank.change && time >= tank.change.at;
  return {
    inflow: changed && tank.change?.field === "inflow" ? tank.change.value : tank.inflow,
    outflow: changed && tank.change?.field === "outflow" ? tank.change.value : tank.outflow,
  };
}

export function stockAtTime(tank: StockTank, time: number): number {
  const firstDuration = tank.change ? Math.min(time, tank.change.at) : time;
  const first = tank.start + firstDuration * (tank.inflow - tank.outflow);
  if (!tank.change || time <= tank.change.at) return Math.max(0, Math.min(100, first));
  const changed = ratesAt(tank, time);
  const result = first + (time - tank.change.at) * (changed.inflow - changed.outflow);
  return Math.max(0, Math.min(100, result));
}

export function timeToTarget(tank: StockTank, target: number): number {
  if (tank.start >= target) return 0;
  const firstRate = tank.inflow - tank.outflow;
  if (!tank.change) return firstRate > 0 ? (target - tank.start) / firstRate : Number.POSITIVE_INFINITY;
  const valueAtChange = tank.start + firstRate * tank.change.at;
  if (firstRate > 0 && valueAtChange >= target) return (target - tank.start) / firstRate;
  const changed = ratesAt(tank, tank.change.at);
  const secondRate = changed.inflow - changed.outflow;
  return secondRate > 0 ? tank.change.at + (target - valueAtChange) / secondRate : Number.POSITIVE_INFINITY;
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
