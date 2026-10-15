export const MODULE_STARTED_EVENT = "module_started";

export type ModuleStartedBroadcastPayload = {
  type: typeof MODULE_STARTED_EVENT;
  runNumber: number;
  startedAt: string;
};

export type ModuleStartSessionSnapshot = {
  current_run_number: number;
  is_module_started: boolean;
  module_started_at: string | null;
};

export function moduleStartChannelTopic(sessionId: string) {
  return `session-module-start:${sessionId}`;
}

function normalizeStartedAt(value: unknown) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function createModuleStartedPayload(session: unknown): ModuleStartedBroadcastPayload | null {
  const candidate = Array.isArray(session) ? session[0] : session;
  if (!candidate || typeof candidate !== "object") return null;
  const record = candidate as Record<string, unknown>;
  const runNumber = record.current_run_number;
  const startedAt = normalizeStartedAt(record.module_started_at);
  if (!Number.isSafeInteger(runNumber) || Number(runNumber) < 1 || !startedAt) return null;
  return { type: MODULE_STARTED_EVENT, runNumber: Number(runNumber), startedAt };
}

export function parseModuleStartedPayload(payload: unknown): ModuleStartedBroadcastPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const startedAt = normalizeStartedAt(record.startedAt);
  if (record.type !== MODULE_STARTED_EVENT || !Number.isSafeInteger(record.runNumber) || Number(record.runNumber) < 1 || !startedAt) return null;
  return { type: MODULE_STARTED_EVENT, runNumber: Number(record.runNumber), startedAt };
}

export function moduleStartedEventKey(payload: ModuleStartedBroadcastPayload) {
  return `${payload.runNumber}:${payload.startedAt}`;
}

export function shouldRefreshForModuleStart(
  payload: ModuleStartedBroadcastPayload,
  current: ModuleStartSessionSnapshot,
  lastHandledEventKey: string,
) {
  if (payload.runNumber < current.current_run_number) return false;
  if (moduleStartedEventKey(payload) === lastHandledEventKey) return false;
  const currentStartedAt = normalizeStartedAt(current.module_started_at);
  if (
    payload.runNumber === current.current_run_number
    && current.is_module_started
    && currentStartedAt === payload.startedAt
  ) return false;
  return true;
}
