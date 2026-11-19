import { evidenceCases } from "./evidenceMarketContent.ts";

export const EVIDENCE_MARKET_GAME_ID = "week-8-evidence-market-v1";
export type EvidenceAttempt = { caseId: string; opened: string[]; solutionId: string };

export function scoreEvidenceAttempt(attempt: EvidenceAttempt, index: number) {
  const current = evidenceCases[index];
  if (!current || attempt.caseId !== current.id || !current.solutions.some((item) => item.id === attempt.solutionId)) return 0;
  const unique = [...new Set(attempt.opened)];
  if (unique.length !== attempt.opened.length || unique.some((id) => !current.evidence.some((item) => item.id === id))) return 0;
  const spent = current.evidence.filter((item) => unique.includes(item.id)).reduce((sum, item) => sum + item.cost, 0);
  if (spent > 100 || unique.length < 2) return 0;
  return (attempt.solutionId === current.correct ? 12 : 0) + current.required.filter((id) => unique.includes(id)).length * 3 + (spent <= 70 ? 2 : 0);
}

export function scoreEvidenceAttempts(attempts: EvidenceAttempt[]) {
  return Math.min(100, attempts.reduce((sum, attempt, index) => sum + scoreEvidenceAttempt(attempt, index), 0));
}
