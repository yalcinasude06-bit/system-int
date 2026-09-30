export const MODULE_COUNTDOWN_SECONDS = 10;

export function getRemainingCountdown(moduleStartedAt: string | null, nowMs = Date.now()): number {
  if (!moduleStartedAt) return 0;
  const startMs = new Date(moduleStartedAt).getTime();
  if (!Number.isFinite(startMs)) return 0;
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  return Math.max(0, MODULE_COUNTDOWN_SECONDS - elapsedSeconds);
}
