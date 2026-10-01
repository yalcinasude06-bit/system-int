"use client";

import { useCallback, useEffect, useState } from "react";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";
export const teacherAuthStorageKey = "system-lab:teacher-auth";

export function useTeacherAuth() {
  const [status, setStatus] = useState<AuthStatus>("checking");

  useEffect(() => {
    // Remove credentials written by older releases; teacher access is tab-scoped now.
    localStorage.removeItem(teacherAuthStorageKey);
    localStorage.removeItem("system-lab:teacher-session");
    const token = sessionStorage.getItem(teacherAuthStorageKey);
    if (!token) {
      const timer = window.setTimeout(() => setStatus("unauthenticated"), 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    fetch("/api/teacher/auth", { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then((response) => {
        if (!response.ok) sessionStorage.removeItem(teacherAuthStorageKey);
        setStatus(response.ok ? "authenticated" : "unauthenticated");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("unauthenticated");
      });
    return () => controller.abort();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch("/api/teacher/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json() as { token?: string; error?: string };
    if (!response.ok || !data.token) throw new Error(data.error || "Giriş yapılamadı.");
    sessionStorage.setItem(teacherAuthStorageKey, data.token);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(teacherAuthStorageKey);
    setStatus("unauthenticated");
  }, []);

  return { status, login, logout };
}
