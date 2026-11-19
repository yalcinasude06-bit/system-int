"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Eraser, LockKeyhole, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import styles from "../week7Games.module.css";
import { WEEK7_REVIEW_TIMING } from "../week7ReviewTiming";
import { curveRounds } from "./curveContent";
import { CURVE_SAMPLE_COUNT, DRAW_CURVE_GAME_ID, resamplePoints, scoreCurveAttempts, scoreCurvePoints, targetPoints, type CurveAttempt, type NormalizedPoint } from "./curveScoring";

type DraftPayload = { gameId?: unknown; attempts?: unknown; currentIndex?: unknown; currentPoints?: unknown };
type CurveReview = { points: number; sampled: NormalizedPoint[] };

const copy = {
  tr: {
    title: "7. HAFTA · MODÜL 3", stage: "Aşama", score: "Puan", instruction: "Çizginin devamını parmağınla tamamla.", today: "BUGÜN", time: "zaman", stock: "Stok", clear: "Temizle", check: "Kontrol Et",
    drawMore: "Gelecek alanında çizgiyi biraz daha uzat.", yourLine: "Senin çizgin", actual: "Gerçek davranış", saveError: "Yanıt kaydedilemedi. Bağlantını kontrol edip yeniden dene.", saving: "Yanıt kaydediliyor…", locked: "Bu çizim turundaki yanıtların kilitli.", retry: "Tekrar kaydet",
  },
  en: {
    title: "WEEK 7 · MODULE 3", stage: "Stage", score: "Score", instruction: "Complete the line with your finger.", today: "TODAY", time: "time", stock: "Stock", clear: "Clear", check: "Check",
    drawMore: "Extend the line farther into the future area.", yourLine: "Your line", actual: "Actual behavior", saveError: "Your answer could not be saved. Check your connection and try again.", saving: "Saving your answer…", locked: "Your answers for this drawing round are locked.", retry: "Save again",
  },
} as const;

function isPoint(value: unknown): value is NormalizedPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<NormalizedPoint>;
  return typeof point.x === "number" && Number.isFinite(point.x) && point.x >= 0 && point.x <= 1
    && typeof point.y === "number" && Number.isFinite(point.y) && point.y >= 0 && point.y <= 1;
}

function isAttempt(value: unknown, index: number): value is CurveAttempt {
  if (!value || typeof value !== "object") return false;
  const attempt = value as Partial<CurveAttempt>;
  return attempt.roundId === curveRounds[index]?.id && Array.isArray(attempt.points) && attempt.points.length === CURVE_SAMPLE_COUNT && attempt.points.every(isPoint);
}

function restore(draft?: ModuleDraft | null) {
  const payload = draft?.payload as DraftPayload | undefined;
  if (payload?.gameId !== DRAW_CURVE_GAME_ID || !Array.isArray(payload.attempts)) return { attempts: [] as CurveAttempt[], points: [] as NormalizedPoint[] };
  const attempts: CurveAttempt[] = [];
  for (const value of payload.attempts) { if (!isAttempt(value, attempts.length)) break; attempts.push(value); }
  const points = payload.currentIndex === attempts.length && Array.isArray(payload.currentPoints) && payload.currentPoints.length <= 96 && payload.currentPoints.every(isPoint) ? payload.currentPoints as NormalizedPoint[] : [];
  return { attempts, points };
}

function pathFromPoints(points: NormalizedPoint[], futureOnly = true) {
  if (!points.length) return "";
  return points.map((point, index) => {
    const x = futureOnly ? 42 + point.x * 55 : 7 + point.x * 35;
    const y = 92 - point.y * 82;
    return `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
}

export function Week7DrawTheCurve({ onSubmit, onDraft, existingSubmission, existingDraft, forceSubmit }: LearningModuleProps) {
  const { locale } = useI18n();
  const text = copy[locale];
  const restored = useMemo(() => restore(existingDraft), [existingDraft]);
  const [attempts, setAttempts] = useState(restored.attempts);
  const [points, setPoints] = useState(restored.points);
  const [drawing, setDrawing] = useState(false);
  const [review, setReview] = useState<CurveReview | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const attemptsRef = useRef(restored.attempts);
  const pointsRef = useRef(restored.points);
  const submittedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const index = Math.min(attempts.length, curveRounds.length - 1);
  const current = curveRounds[index]!;
  const score = scoreCurveAttempts(attempts);
  const enough = points.length >= 6 && Math.max(...points.map((point) => point.x), 0) - Math.min(...points.map((point) => point.x), 1) >= .55;
  const past = current.pastValues.map((y, pointIndex) => ({ x: pointIndex / (current.pastValues.length - 1), y }));

  useEffect(() => () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); }, []);

  const submissionFor = useCallback((nextAttempts: CurveAttempt[], reason: "draft" | "completed" | "teacher-ended", nextPoints = pointsRef.current): ModuleSubmission => ({
    stage: 1,
    score: scoreCurveAttempts(nextAttempts),
    payload: { gameId: DRAW_CURVE_GAME_ID, attempts: nextAttempts, currentIndex: Math.min(nextAttempts.length, 4), currentPoints: nextPoints, answeredCount: nextAttempts.length, stageCount: curveRounds.length, completionReason: reason },
  }), []);

  const send = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true); setFailed(false);
    try { if (await onSubmit(submission) === false) setFailed(true); } catch { setFailed(true); } finally { setSubmitting(false); }
  }, [onSubmit]);

  const finalize = useCallback((nextAttempts: CurveAttempt[], reason: "completed" | "teacher-ended") => {
    if (submittedRef.current || existingSubmission) return;
    submittedRef.current = true;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    const submission = submissionFor(nextAttempts, reason, []);
    setFinalSubmission(submission); setAttempts(nextAttempts); setFinalizing(true); void send(submission);
  }, [existingSubmission, send, submissionFor]);

  const advance = useCallback((nextAttempts: CurveAttempt[]) => {
    if (nextAttempts.length >= curveRounds.length) { finalize(nextAttempts, "completed"); return; }
    attemptsRef.current = nextAttempts; pointsRef.current = [];
    setAttempts(nextAttempts); setPoints([]); setReview(null);
    void onDraft?.(submissionFor(nextAttempts, "draft", []));
  }, [finalize, onDraft, submissionFor]);

  const pointFromEvent = (event: ReactPointerEvent<SVGSVGElement>): NormalizedPoint | null => {
    const rect = event.currentTarget.getBoundingClientRect();
    const futureLeft = rect.left + rect.width * .42;
    if (event.clientX < futureLeft) return null;
    const svgX = (event.clientX - rect.left) / rect.width * 100;
    const svgY = (event.clientY - rect.top) / rect.height * 100;
    return {
      x: Math.max(0, Math.min(1, (svgX - 42) / 55)),
      y: Math.max(0, Math.min(1, (92 - svgY) / 82)),
    };
  };

  const begin = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (review || finalizing || forceSubmit || existingSubmission) return;
    const point = pointFromEvent(event); if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId); setDrawing(true);
    const anchor = pointsRef.current.length ? pointsRef.current : [{ x: 0, y: current.pastValues.at(-1)! }];
    const next = [...anchor, point].slice(-96); pointsRef.current = next; setPoints(next);
  };

  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drawing || review || finalizing) return;
    const point = pointFromEvent(event); if (!point) return;
    const previous = pointsRef.current.at(-1);
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < .012) return;
    const next = [...pointsRef.current, point].slice(-96); pointsRef.current = next; setPoints(next);
  };

  const end = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drawing) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDrawing(false); void onDraft?.(submissionFor(attemptsRef.current, "draft", pointsRef.current));
  };

  const clear = () => {
    if (review || finalizing || forceSubmit || existingSubmission) return;
    pointsRef.current = []; setPoints([]); void onDraft?.(submissionFor(attemptsRef.current, "draft", []));
  };

  const check = () => {
    if (!enough || review || finalizing || forceSubmit || existingSubmission) return;
    const sampled = resamplePoints(pointsRef.current);
    const earned = scoreCurvePoints(current, sampled);
    const attempt: CurveAttempt = { roundId: current.id, points: sampled };
    const next = [...attemptsRef.current, attempt]; attemptsRef.current = next; setAttempts(next); setReview({ points: earned, sampled });
    void onDraft?.(submissionFor(next, "draft", sampled));
    timerRef.current = window.setTimeout(() => advance(next), reduceMotion ? WEEK7_REVIEW_TIMING.drawCurve.reducedMotion : WEEK7_REVIEW_TIMING.drawCurve.normal);
  };

  useEffect(() => { if (forceSubmit && !finalizing && !existingSubmission) finalize(attemptsRef.current, "teacher-ended"); }, [finalizing, existingSubmission, finalize, forceSubmit]);
  useEffect(() => { if (restored.attempts.length === curveRounds.length && !existingSubmission) finalize(restored.attempts, "completed"); }, [existingSubmission, finalize, restored.attempts]);

  if (existingSubmission) return <section className={`${styles.shell} ${styles.centered}`}><LockKeyhole size={42} /><h2>{text.locked}</h2></section>;

  const target = targetPoints(current.id);
  const sharedStart = current.pastValues.at(-1)!;
  const displayTarget = target.map((point, pointIndex) => pointIndex === 0 ? { ...point, y: sharedStart } : point);
  return <section className={`${styles.shell} ${styles.curveShell}`} data-week7-game="draw-curve">
    <header className={styles.header}><b>{text.title}</b><span>{text.stage} <strong>{index + 1}/5</strong></span><span>{text.score} <strong>{score}</strong></span></header>
    <div className={styles.progress}>{curveRounds.map((round, roundIndex) => <i key={round.id} className={roundIndex < attempts.length ? styles.done : roundIndex === index ? styles.active : ""} />)}</div>
    <div className={styles.prompt}><strong>{text.instruction}</strong></div>
    <div className={styles.chartWrap}>
      <span className={styles.yLabel}>{text.stock} ↑</span><span className={styles.xLabel}>{text.time} →</span><span className={styles.today}>{text.today}</span>
      <svg className={styles.drawSurface} viewBox="0 0 100 100" preserveAspectRatio="none" role="application" aria-label={text.instruction} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        <defs><pattern id={`w7-grid-${current.id}`} width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="rgba(64,92,82,.1)" strokeWidth=".5" /></pattern></defs>
        <rect x="4" y="7" width="92" height="86" rx="3" fill={`url(#w7-grid-${current.id})`} />
        <path className={styles.axis} d="M7 8V92H97" />
        <rect x="42" y="7" width="55" height="85" className={styles.futureArea} />
        <line x1="42" y1="7" x2="42" y2="92" className={styles.todayLine} />
        <path className={styles.pastCurve} d={pathFromPoints(past, false)} />
        {points.length > 1 && <path className={`${styles.studentCurve} ${review ? styles.reviewed : ""}`} d={pathFromPoints([{ x: 0, y: sharedStart }, ...points.filter((point) => point.x > 0)])} />}
        {review && <motion.path className={styles.actualCurve} d={pathFromPoints(displayTarget)} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: reduceMotion ? 0 : .95 }} />}
      </svg>
      <div className={styles.chartLegend}><span><i className={styles.studentLegend} />{text.yourLine}</span>{review && <span><i className={styles.actualLegend} />{text.actual}</span>}</div>
    </div>
    <div className={styles.feedback} aria-live="polite">{finalizing ? <><strong>{submitting ? text.saving : failed ? text.saveError : ""}</strong>{failed && finalSubmission && <button type="button" className={styles.retryButton} onClick={() => void send(finalSubmission)}><RotateCcw size={15} />{text.retry}</button>}</> : <><strong>{review ? `+${review.points}/20 · ${current.label[locale]}` : current.label[locale]}</strong><small>{current.prompt[locale]}</small>{!review && !enough && <small className={styles.curveWarning}>{text.drawMore}</small>}</>}</div>
    <footer className={styles.actions}><button type="button" className={styles.secondaryButton} disabled={Boolean(review) || finalizing} onClick={clear}><Eraser size={17} />{text.clear}</button><button type="button" className={styles.primaryButton} disabled={!enough || Boolean(review) || finalizing} onClick={check}><Check size={18} />{text.check}</button></footer>
  </section>;
}
