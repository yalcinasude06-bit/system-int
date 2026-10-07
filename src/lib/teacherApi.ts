"use client";

import type { Session, Student, StudentProfile, Submission } from "@/types";
import { clearTeacherAuth, getTeacherToken } from "@/lib/useTeacherAuth";

export type TeacherSessionSummary = Pick<
  Session,
  "id" | "pin_code" | "title" | "is_active" | "created_at" | "selected_week" | "current_module" | "module_stage" | "is_module_started"
>;

export type TeacherSessionDetails = {
  session: Session;
  students: Student[];
  profiles: StudentProfile[];
  submissions: Submission[];
};

async function teacherRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getTeacherToken();
  if (!token) throw new Error("Öğretmen oturumu bulunamadı.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const data = await response.json().catch(() => ({})) as T & { error?: unknown };
  if (!response.ok) {
    if (response.status === 401) clearTeacherAuth();
    const message = typeof data.error === "string" ? data.error : "Öğretmen işlemi tamamlanamadı.";
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function listTeacherSessions() {
  return (await teacherRequest<{ sessions: TeacherSessionSummary[] }>("/api/teacher/sessions")).sessions;
}

export async function getTeacherSession(pin: string) {
  return teacherRequest<TeacherSessionDetails>(`/api/teacher/sessions?pin=${encodeURIComponent(pin)}`);
}

export async function createTeacherSession(title?: string) {
  return (await teacherRequest<{ session: Session }>("/api/teacher/sessions", {
    method: "POST",
    body: JSON.stringify({ title }),
  })).session;
}

export async function patchTeacherSession(sessionId: string, patch: Record<string, unknown>) {
  return (await teacherRequest<{ session: Session }>(`/api/teacher/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify({ patch }),
  })).session;
}

export async function runTeacherModuleAction(sessionId: string, action: "start" | "cancel" | "finish", moduleId?: number) {
  return (await teacherRequest<{ session: Session }>(`/api/teacher/sessions/${sessionId}/module`, {
    method: "POST",
    body: JSON.stringify({ action, moduleId }),
  })).session;
}
