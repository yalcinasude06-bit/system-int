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
  nickname: string,
  avatar: string,
): Promise<Student> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("students")
    .insert({ session_id: sessionId, nickname: nickname.trim(), avatar })
    .select()
    .single();
  if (error) throw error;
  return data as Student;
}

export async function saveSubmission(input: {
  sessionId: string;
  studentId: string;
  moduleId: ModuleId;
  stage: number;
  payload: Record<string, unknown>;
  score: number;
}): Promise<Submission> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("submissions")
    .upsert(
      {
        session_id: input.sessionId,
        student_id: input.studentId,
        module_id: input.moduleId,
        stage: input.stage,
        payload: input.payload,
        score: input.score,
        is_submitted: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,student_id,module_id,stage" },
    )
    .select()
    .single();
  if (error) throw error;

  await client.rpc("increment_student_score", {
    target_student_id: input.studentId,
    new_score: input.score,
  });
  return data as Submission;
}

export async function updateSession(
  sessionId: string,
  patch: Partial<Pick<Session, "current_module" | "module_stage" | "fault_injected" | "is_active">>,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("sessions").update(patch).eq("id", sessionId);
  if (error) throw error;
}
