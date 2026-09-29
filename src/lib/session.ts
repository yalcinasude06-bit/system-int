import type { ModuleId, Session, Student, Submission } from "@/types";
import { requireSupabase, supabase } from "./supabase";

export function createPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createSession(title: string): Promise<Session> {
  const client = requireSupabase();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await client
      .from("sessions")
      .insert({ title: title.trim() || "Sistem Analizi Dersi", pin_code: createPin() })
      .select()
      .single();
    if (!error && data) return data as Session;
    if (error?.code !== "23505") throw error;
  }
  throw new Error("Benzersiz PIN üretilemedi. Lütfen tekrar deneyin.");
}

export async function getSessionByPin(pin: string): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("pin_code", pin)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data as Session | null;
}

export async function joinSession(
  sessionId: string,
  studentNumber: string,
  fullName: string,
  avatar: string,
): Promise<Student> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("students")
    .upsert(
      {
        session_id: sessionId,
        student_number: studentNumber.trim(),
        nickname: fullName.trim(),
        avatar,
        last_active: new Date().toISOString(),
      },
      { onConflict: "session_id,student_number" },
    )
    .select()
    .single();
  if (error) throw error;
  const { error: profileError } = await client.from("student_profiles").upsert(
    {
      student_number: studentNumber.trim(),
      full_name: fullName.trim(),
      last_seen: new Date().toISOString(),
    },
    { onConflict: "student_number" },
  );
  if (profileError) throw profileError;
  return data as Student;
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

export async function updateSession(
  sessionId: string,
  patch: Partial<Pick<Session, "selected_week" | "current_module" | "module_stage" | "fault_injected" | "is_active">>,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("sessions").update(patch).eq("id", sessionId);
  if (error) throw error;
}
