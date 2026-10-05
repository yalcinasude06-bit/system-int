import type { ModuleId, Session, Student, StudentProfile, Submission } from "@/types";
import { requireSupabase, supabase } from "./supabase";

type DatabaseFailure = { code?: string; message?: string };

const transientDatabaseCodes = new Set([
  "08000", "08003", "08006", "40001", "40P01", "53300", "55P03", "57014",
  "PGRST000", "PGRST001", "PGRST002",
]);

function databaseFailure(error: unknown): DatabaseFailure {
  return typeof error === "object" && error !== null ? error as DatabaseFailure : {};
}

function isTransientDatabaseFailure(error: unknown) {
  const failure = databaseFailure(error);
  const message = failure.message || (error instanceof Error ? error.message : "");
  return Boolean(
    (failure.code && transientDatabaseCodes.has(failure.code))
    || /fetch|network|timeout|connection|too many|temporarily|resource/i.test(message),
  );
}

function readableDatabaseError(error: unknown, fallback: string) {
  const message = databaseFailure(error).message || (error instanceof Error ? error.message : "");
  if (/session (?:is not active|was not found)/i.test(message)) return new Error("Oturum bulunamadı veya sona erdi.");
  if (/student does not belong/i.test(message)) return new Error("Katılımcı kaydı bulunamadı. Lütfen yeniden katılın.");
  if (databaseFailure(error).code === "23505") return new Error("Benzersiz PIN üretilemedi. Lütfen tekrar deneyin.");
  if (isTransientDatabaseFailure(error)) return new Error("Veritabanı şu anda yoğun. Lütfen birkaç saniye sonra tekrar deneyin.");
  return new Error(message || fallback);
}

function retryDelay(attempt: number) {
  const base = Math.min(180 * (2 ** attempt), 1800);
  return new Promise((resolve) => setTimeout(resolve, base + Math.floor(Math.random() * 140)));
}

export function createPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createSession(title: string): Promise<Session> {
  const client = requireSupabase();
  let lastError: unknown;
  for (let attempt = 0; attempt < 7; attempt += 1) {
    try {
      const { data, error } = await client
        .from("sessions")
        .insert({ title: title.trim() || "Sistem Analizi Dersi", pin_code: createPin() })
        .select()
        .single();
      if (!error && data) return data as Session;
      lastError = error;
      if (error?.code !== "23505" && !isTransientDatabaseFailure(error)) throw error;
    } catch (caught) {
      lastError = caught;
      if (!isTransientDatabaseFailure(caught)) throw readableDatabaseError(caught, "Oturum oluşturulamadı.");
    }
    if (attempt < 6) await retryDelay(attempt);
  }
  throw readableDatabaseError(lastError, "Oturum oluşturulamadı. Lütfen tekrar deneyin.");
}

export async function getSessionByPin(pin: string): Promise<Session | null> {
  if (!supabase) return null;
  let lastError: unknown;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("pin_code", pin)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as Session | null;
    } catch (caught) {
      lastError = caught;
      if (!isTransientDatabaseFailure(caught) || attempt === 3) break;
      await retryDelay(attempt);
    }
  }

  throw readableDatabaseError(lastError, "Oturum yüklenemedi.");
}

export async function joinSession(
  pin: string,
  studentNumber: string,
  fullName: string,
  avatar: string,
): Promise<Student> {
  const client = requireSupabase();
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const { data, error } = await client.rpc("join_session_student", {
        target_pin: pin,
        target_student_number: studentNumber.trim(),
        target_full_name: fullName.trim(),
        target_avatar: avatar,
      });
      if (error) throw error;
      if (!data) throw new Error("Öğrenci kaydı oluşturulamadı.");
      return data as Student;
    } catch (caught) {
      lastError = caught;
      if (!isTransientDatabaseFailure(caught) || attempt === 4) break;
      await retryDelay(attempt);
    }
  }

  throw readableDatabaseError(lastError, "Derse katılınamadı.");
}

export interface StudentGameState {
  session: Session;
  student: Student;
  profile: StudentProfile | null;
  submissions: Submission[];
  classmates: Student[];
  feedback_keys: string[];
}

export async function getStudentGameState(pin: string, studentId: string): Promise<StudentGameState> {
  const client = requireSupabase();
  let lastError: unknown;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const { data, error } = await client.rpc("get_student_game_state", {
        target_pin: pin,
        target_student_id: studentId,
      });
      if (error) throw error;
      if (!data) throw new Error("Oyun durumu yüklenemedi.");
      return data as StudentGameState;
    } catch (caught) {
      lastError = caught;
      if (!isTransientDatabaseFailure(caught) || attempt === 3) break;
      await retryDelay(attempt);
    }
  }

  throw readableDatabaseError(lastError, "Oturum yüklenemedi.");
}

export async function saveSubmission(input: {
  sessionId: string;
  studentId: string;
  studentNumber: string;
  weekId: number;
  moduleId: ModuleId;
  stage: number;
  payload: Record<string, unknown>;
  score: number;
}): Promise<{ submission: Submission; wasNew: boolean }> {
  const client = requireSupabase();
  const { data, error } = await client
    .rpc("submit_module_once", {
      target_session_id: input.sessionId,
      target_student_id: input.studentId,
      target_week_id: input.weekId,
      target_module_id: input.moduleId,
      target_stage: input.stage,
      new_payload: input.payload,
      new_score: input.score,
    });
  if (error) throw error;
  const result = data as { submission: Submission; was_new: boolean };
  return { submission: result.submission, wasNew: result.was_new };
}

export async function submitModuleFeedback(input: {
  sessionId: string;
  studentId: string;
  weekId: number;
  moduleId: ModuleId;
  funRating: number;
  difficultyRating: number;
  comment: string;
}): Promise<{ wasNew: boolean }> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("submit_module_feedback", {
    target_session_id: input.sessionId,
    target_student_id: input.studentId,
    target_week_id: input.weekId,
    target_module_id: input.moduleId,
    target_fun_rating: input.funRating,
    target_difficulty_rating: input.difficultyRating,
    target_comment: input.comment.trim().slice(0, 500),
  });
  if (error) throw readableDatabaseError(error, "Geri bildirim gönderilemedi.");
  const result = data as { was_new?: boolean } | null;
  return { wasNew: Boolean(result?.was_new) };
}

export async function updateSession(
  sessionId: string,
  patch: Partial<Pick<Session, "selected_week" | "current_module" | "module_stage" | "is_module_started" | "module_started_at" | "fault_injected" | "is_active">>,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("sessions").update(patch).eq("id", sessionId);
  if (error) throw error;
}

export async function startSessionModule(sessionId: string, moduleId: ModuleId): Promise<Session> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("start_session_module", {
    target_session_id: sessionId,
    target_module_id: moduleId,
  });
  if (error) throw error;
  return data as Session;
}

export async function cancelSessionModuleStart(sessionId: string): Promise<Session> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("cancel_session_module_start", {
    target_session_id: sessionId,
  });
  if (error) throw error;
  return data as Session;
}
