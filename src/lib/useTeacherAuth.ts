"use client";

import { useCallback, useEffect, useState } from "react";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";
const storageKey = "system-lab:teacher-auth";

export function useTeacherAuth() {
  const [status, setStatus] = useState<AuthStatus>("checking");

  useEffect(() => {
    const token = localStorage.getItem(storageKey);
    if (!token) {
      const timer = window.setTimeout(() => setStatus("unauthenticated"), 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    fetch("/api/teacher/auth", { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then((response) => {
        if (!response.ok) localStorage.removeItem(storageKey);
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
    localStorage.setItem(storageKey, data.token);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(storageKey);
    setStatus("unauthenticated");
  }, []);

  return { status, login, logout };
}
