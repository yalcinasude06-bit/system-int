import "server-only";

import type { NextRequest } from "next/server";
import { getTeacherUsernameFromToken, readBearerToken } from "./teacherAuthServer";
import { requireSupabaseAdmin } from "./supabaseAdmin";

export function teacherFromRequest(request: NextRequest) {
  return getTeacherUsernameFromToken(readBearerToken(request.headers.get("authorization")));
}

export async function ownedSession(sessionId: string, teacherUsername: string) {
  const client = requireSupabaseAdmin();
  const { data, error } = await client
    .from("sessions")
    .select("*")
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
    .select("*")
    .eq("pin_code", pin)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { session: null, owned: false };
  return { session: data, owned: data.teacher_username === teacherUsername };
}
