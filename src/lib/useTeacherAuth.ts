"use client";

import { useCallback, useEffect, useState } from "react";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";
type StoredTeacherAuth = { token: string; username: string };

export const teacherAuthStorageKey = "system-lab:teacher-auth";

export function getStoredTeacherAuth(): StoredTeacherAuth | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(teacherAuthStorageKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredTeacherAuth>;
    if (typeof parsed.token === "string" && typeof parsed.username === "string") return parsed as StoredTeacherAuth;
  } catch {
    // Legacy releases stored just the token. It is revalidated below and then upgraded.
    return { token: raw, username: "" };
  }
  return null;
}

export function getTeacherToken() {
  return getStoredTeacherAuth()?.token || null;
}

export function clearTeacherAuth() {
  if (typeof window !== "undefined") sessionStorage.removeItem(teacherAuthStorageKey);
}

function persistTeacherAuth(auth: StoredTeacherAuth) {
  sessionStorage.setItem(teacherAuthStorageKey, JSON.stringify(auth));
}

export function useTeacherAuth() {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [username, setUsername] = useState("");

  useEffect(() => {
    // Remove credentials written by older releases; teacher access is tab-scoped now.
    localStorage.removeItem(teacherAuthStorageKey);
    localStorage.removeItem("system-lab:teacher-session");
    const stored = getStoredTeacherAuth();
    if (!stored?.token) {
      const timer = window.setTimeout(() => setStatus("unauthenticated"), 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    fetch("/api/teacher/auth", { headers: { Authorization: `Bearer ${stored.token}` }, signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => null) as { username?: unknown } | null;
        if (!response.ok || typeof data?.username !== "string") {
          clearTeacherAuth();
          setStatus("unauthenticated");
          return;
        }
        persistTeacherAuth({ token: stored.token, username: data.username });
        setUsername(data.username);
        setStatus("authenticated");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("unauthenticated");
      });
    return () => controller.abort();
  }, []);

  const login = useCallback(async (usernameInput: string, password: string) => {
    const response = await fetch("/api/teacher/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameInput, password }),
    });
    const data = await response.json() as { token?: unknown; username?: unknown; error?: string };
    if (!response.ok || typeof data.token !== "string" || typeof data.username !== "string") {
      throw new Error(data.error || "Giriş yapılamadı.");
    }
    persistTeacherAuth({ token: data.token, username: data.username });
    setUsername(data.username);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(() => {
    clearTeacherAuth();
    setUsername("");
    setStatus("unauthenticated");
  }, []);

  return { status, username, login, logout };
}
