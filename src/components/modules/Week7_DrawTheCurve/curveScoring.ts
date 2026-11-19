import { curveRounds, type CurveRound } from "./curveContent.ts";

export const DRAW_CURVE_GAME_ID = "week-7-draw-curve-v1";
export const CURVE_SAMPLE_COUNT = 32;

export type NormalizedPoint = { x: number; y: number };
export type CurveAttempt = { roundId: string; points: NormalizedPoint[] };

export function targetValue(roundId: string, x: number): number {
  const u = Math.max(0, Math.min(1, x));
  switch (roundId) {
    case "DC1": return .38 + .38 * u;
    case "DC2": return .31 + .12 * (Math.exp(1.5 * u) - 1);
    case "DC3": return .39 + .43 * (1 - Math.exp(-3 * u));
    case "DC4": return .235 + .64 / (1 + Math.exp(-6 * (u - .45)));
    case "DC5": return .54 + .2 * Math.exp(-.75 * u) * Math.sin(3.5 * Math.PI * u);
    default: return 0;
  }
}

export function targetPoints(roundId: string, count = CURVE_SAMPLE_COUNT): NormalizedPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const x = index / (count - 1);
    return { x, y: targetValue(roundId, x) };
  });
}

export function resamplePoints(points: NormalizedPoint[], count = CURVE_SAMPLE_COUNT): NormalizedPoint[] {
  const sorted = points
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .map((point) => ({ x: Math.max(0, Math.min(1, point.x)), y: Math.max(0, Math.min(1, point.y)) }))
    .sort((a, b) => a.x - b.x);
  if (sorted.length < 2) return [];
  const result: NormalizedPoint[] = [];
  let cursor = 0;
  for (let index = 0; index < count; index += 1) {
    const x = index / (count - 1);
    while (cursor < sorted.length - 2 && sorted[cursor + 1]!.x < x) cursor += 1;
    const left = sorted[cursor]!;
    const right = sorted[Math.min(cursor + 1, sorted.length - 1)]!;
    const span = Math.max(.0001, right.x - left.x);
    const ratio = Math.max(0, Math.min(1, (x - left.x) / span));
    result.push({ x, y: left.y + (right.y - left.y) * ratio });
  }
  return result;
}

function directionChanges(points: NormalizedPoint[]) {
  let previous = 0;
  let changes = 0;
  for (let index = 1; index < points.length; index += 1) {
    const delta = points[index]!.y - points[index - 1]!.y;
    const direction = Math.abs(delta) < .008 ? previous : Math.sign(delta);
    if (previous && direction && direction !== previous) changes += 1;
    if (direction) previous = direction;
  }
  return changes;
}

export function scoreCurvePoints(round: CurveRound, points: NormalizedPoint[]): number {
  const sampled = points.length === CURVE_SAMPLE_COUNT ? points : resamplePoints(points);
  if (sampled.length !== CURVE_SAMPLE_COUNT) return 0;
  const target = targetPoints(round.id);
  const meanError = sampled.reduce((sum, point, index) => sum + Math.abs(point.y - target[index]!.y), 0) / CURVE_SAMPLE_COUNT;
  const similarity = Math.round(14 * (1 - Math.min(1, meanError / .35)));
  const targetDelta = target.at(-1)!.y - target[0]!.y;
  const studentDelta = sampled.at(-1)!.y - sampled[0]!.y;
  const trend = Math.abs(targetDelta) < .08
    ? Math.abs(studentDelta) < .25 ? 3 : 0
    : Math.sign(targetDelta) === Math.sign(studentDelta) ? 3 : 0;
  const shape = Math.abs(directionChanges(sampled) - directionChanges(target)) <= 1 ? 3 : 0;
  return Math.max(0, Math.min(20, similarity + trend + shape));
}

export function scoreCurveAttempts(attempts: CurveAttempt[]): number {
  return attempts.slice(0, curveRounds.length).reduce((total, attempt, index) => {
    const round = curveRounds[index];
    if (!round || attempt.roundId !== round.id) return total;
    return total + scoreCurvePoints(round, attempt.points);
  }, 0);
}
