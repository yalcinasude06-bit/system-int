export const ANSWER_REVIEW_TOTAL_MS = 5000;
export const ANSWER_REVIEW_MARK_MS = 450;
export const ANSWER_REVIEW_MOVE_MS = 720;
export const MATCHING_ROUND_ONE_REVIEW_MS = 3800;

export type AnswerReviewPhase = "editing" | "marking" | "correcting" | "reviewing" | "submitting" | "done";

export function currentReviewTimestamp() {
  return Date.now();
}

export function remainingReviewTime(startedAt: number, durationMs: number, now = Date.now()) {
  if (!Number.isFinite(startedAt) || !Number.isFinite(durationMs)) return 0;
  return Math.max(0, durationMs - Math.max(0, now - startedAt));
}

export function evaluatePlacementSnapshot(
  snapshot: Record<string, string>,
  answerKey: Record<string, string>,
  maximumScore = 100,
) {
  const ids = Object.keys(answerKey);
  const correctCount = ids.filter((id) => snapshot[id] === answerKey[id]).length;
  return {
    correctCount,
    mistakes: ids.filter((id) => snapshot[id] !== answerKey[id]),
    score: ids.length ? Math.round((correctCount / ids.length) * maximumScore) : 0,
  };
}
