"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useAnswerReviewTimer() {
  const timeoutRef = useRef<number | null>(null);
  const callbackRef = useRef<(() => void) | null>(null);
  const remainingRef = useRef(0);
  const resumedAtRef = useRef(0);
  const sessionRef = useRef(0);
  const activeRef = useRef(false);
  const [remainingMs, setRemainingMs] = useState(0);

  const clearScheduled = useCallback(() => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const schedule = useCallback((sessionId: number) => {
    clearScheduled();
    if (!activeRef.current || document.hidden) return;
    resumedAtRef.current = performance.now();
    timeoutRef.current = window.setTimeout(() => {
      if (!activeRef.current || sessionRef.current !== sessionId) return;
      activeRef.current = false;
      remainingRef.current = 0;
      setRemainingMs(0);
      timeoutRef.current = null;
      callbackRef.current?.();
    }, Math.max(0, remainingRef.current));
  }, [clearScheduled]);

  const cancel = useCallback(() => {
    clearScheduled();
    sessionRef.current += 1;
    activeRef.current = false;
    callbackRef.current = null;
    remainingRef.current = 0;
    setRemainingMs(0);
  }, [clearScheduled]);

  const start = useCallback((durationMs: number, onComplete: () => void, initialRemainingMs = durationMs) => {
    clearScheduled();
    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    callbackRef.current = onComplete;
    remainingRef.current = Math.max(0, Math.min(durationMs, initialRemainingMs));
    setRemainingMs(remainingRef.current);
    activeRef.current = true;
    schedule(sessionId);
  }, [clearScheduled, schedule]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (!activeRef.current) return;
      if (document.hidden) {
        const elapsed = Math.max(0, performance.now() - resumedAtRef.current);
        remainingRef.current = Math.max(0, remainingRef.current - elapsed);
        setRemainingMs(remainingRef.current);
        clearScheduled();
        return;
      }
      schedule(sessionRef.current);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [clearScheduled, schedule]);

  useEffect(() => cancel, [cancel]);

  return { start, cancel, remainingMs };
}
