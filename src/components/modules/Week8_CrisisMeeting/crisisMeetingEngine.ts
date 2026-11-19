import { crisisCases } from "./crisisMeetingContent.ts";

export const CRISIS_MEETING_GAME_ID = "week-8-crisis-meeting-v1";
export type CrisisAttempt = { caseId: string; allocation: number[] };

export function crisisDistance(allocation: number[], ideal: number[]) {
  return Math.round(allocation.reduce((sum, value, index) => sum + Math.abs(value - (ideal[index] ?? 0)), 0) / 2);
}

export function scoreCrisisAttempt(attempt: CrisisAttempt, index: number) {
  const current = crisisCases[index];
  if (!current || attempt.caseId !== current.id || attempt.allocation.length !== 4) return 0;
  if (attempt.allocation.some((value) => !Number.isInteger(value) || value < 0 || value > 3) || attempt.allocation.reduce((a, b) => a + b, 0) !== 3) return 0;
  return [20, 16, 12, 8, 4][Math.min(4, crisisDistance(attempt.allocation, current.ideal))] ?? 4;
}

export function scoreCrisisAttempts(attempts: CrisisAttempt[]) {
  return Math.min(100, attempts.reduce((sum, attempt, index) => sum + scoreCrisisAttempt(attempt, index), 0));
}

export function crisisGauges(index: number, allocation: number[]) {
  const current = crisisCases[index]!;
  return current.stakeholders.reduce((totals, stakeholder, stakeholderIndex) => totals.map((value, gaugeIndex) => value + stakeholder.impact[gaugeIndex] * (allocation[stakeholderIndex] ?? 0)) as [number, number, number], [50, 50, 50] as [number, number, number]).map((value) => Math.max(8, Math.min(96, value))) as [number, number, number];
}
