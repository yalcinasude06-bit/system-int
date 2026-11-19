import { loopSignCases, type LoopPolarity, type LoopType } from "./loopSignsContent.ts";

export const LOOP_SIGNS_GAME_ID = "week-7-loop-signs-v4";

export type LoopSignAttempt = {
  caseId: string;
  signs: LoopPolarity[];
  loopType: LoopType | null;
};

export function toggleLoopSign(value: LoopPolarity | null): LoopPolarity {
  return value === "+" ? "-" : "+";
}

export function scoreLoopSignAttempt(index: number, attempt: LoopSignAttempt): number {
  const item = loopSignCases[index];
  if (!item || attempt.caseId !== item.id || attempt.signs.length !== item.signs.length) return 0;
  if (attempt.signs.some((sign) => sign !== "+" && sign !== "-")) return 0;
  const correct = item.signs.reduce((total, sign, signIndex) => total + Number(attempt.signs[signIndex] === sign), 0);
  if (index === 4) return Math.round((16 * correct) / item.signs.length) + (attempt.loopType === item.loopType ? 4 : 0);
  return Math.round((20 * correct) / item.signs.length);
}

export function scoreLoopSignAttempts(attempts: LoopSignAttempt[]): number {
  return attempts.slice(0, loopSignCases.length).reduce((total, attempt, index) => total + scoreLoopSignAttempt(index, attempt), 0);
}
