import "server-only";

import type { NextRequest } from "next/server";
import { getTeacherUsernameFromToken, readBearerToken } from "./teacherAuthServer";
import { requireSupabaseAdmin } from "./supabaseAdmin";

const teacherSessionColumns = "id, pin_code, title, selected_week, current_module, current_run_number, current_module_turn, module_turn_counters, module_stage, is_module_started, module_started_at, is_active, fault_injected, teacher_username, created_at";

export function teacherFromRequest(request: NextRequest) {
  return getTeacherUsernameFromToken(readBearerToken(request.headers.get("authorization")));
}

export async function ownedSession(sessionId: string, teacherUsername: string) {
  const client = requireSupabaseAdmin();
  const { data, error } = await client
    .from("sessions")
    .select(teacherSessionColumns)
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { session: null, owned: false };
  return { session: data, owned: data.teacher_username === teacherUsername };
}

export async function ownedSessionByPin(pin: string, teacherUsername: string) {
  const client = requireSupabaseAdmin();
  const { data, error } = await client
    .from("sessions")
    .select(teacherSessionColumns)
    .eq("pin_code", pin)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { session: null, owned: false };
  return { session: data, owned: data.teacher_username === teacherUsername };
}
