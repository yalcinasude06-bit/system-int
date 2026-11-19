"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, LockKeyhole, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import styles from "../week7Games.module.css";
import { loopSignCases, type LoopPolarity, type LoopSignCase, type LoopType } from "./loopSignsContent";
import { LOOP_SIGNS_GAME_ID, scoreLoopSignAttempt, scoreLoopSignAttempts, toggleLoopSign, type LoopSignAttempt } from "./loopSignsEngine";
import { WEEK7_REVIEW_TIMING } from "../week7ReviewTiming";

type DraftPayload = {
  gameId?: unknown;
  attempts?: unknown;
  currentIndex?: unknown;
  currentSigns?: unknown;
  currentLoopType?: unknown;
};

type Review = { incorrect: number[]; points: number };

const copy = {
  tr: {
    title: "7. HAFTA · MODÜL 1", stage: "Aşama", score: "Puan", instruction: "Boş işaretlere dokun: + / − seç.", reset: "Sıfırla", check: "Kontrol Et",
    loopQuestion: "Bu döngü?", reinforcing: "R Pekiştirici", balancing: "B Dengeleyici", same: "Aynı yönlü etki", opposite: "Ters yönlü etki",
    correct: "İşaretler tamamlandı", reconsider: "İşareti yeniden düşün", completed: "Beş döngüyü de tamamladın", partial: "Kontrol ettiğin aşamalar kaydedildi",
    saveError: "Yanıt kaydedilemedi. Bağlantını kontrol edip yeniden dene.", saving: "Yanıt kaydediliyor…", locked: "Bu turdaki yanıtların kilitli.", retry: "Tekrar kaydet",
  },
  en: {
    title: "WEEK 7 · MODULE 1", stage: "Stage", score: "Score", instruction: "Tap the empty signs: choose + / −.", reset: "Reset", check: "Check",
    loopQuestion: "What kind of loop?", reinforcing: "R Reinforcing", balancing: "B Balancing", same: "Same-direction effect", opposite: "Opposite-direction effect",
    correct: "Signs complete", reconsider: "Reconsider the sign", completed: "You completed all five loops", partial: "Your checked stages were saved",
    saveError: "Your answer could not be saved. Check your connection and try again.", saving: "Saving your answer…", locked: "Your answers for this round are locked.", retry: "Save again",
  },
} as const;

function validAttempt(value: unknown, index: number): value is LoopSignAttempt {
  if (!value || typeof value !== "object") return false;
  const attempt = value as Partial<LoopSignAttempt>;
  const item = loopSignCases[index];
  return Boolean(item && attempt.caseId === item.id && Array.isArray(attempt.signs)
    && attempt.signs.length === item.signs.length && attempt.signs.every((sign) => sign === "+" || sign === "-")
    && (attempt.loopType === null || attempt.loopType === "R" || attempt.loopType === "B"));
}

function restore(draft?: ModuleDraft | null) {
  const payload = draft?.payload as DraftPayload | undefined;
  if (payload?.gameId !== LOOP_SIGNS_GAME_ID || !Array.isArray(payload.attempts)) return { attempts: [] as LoopSignAttempt[], index: 0, signs: null, loopType: null as LoopType | null };
  const attempts: LoopSignAttempt[] = [];
  for (const value of payload.attempts) {
    if (!validAttempt(value, attempts.length)) break;
    attempts.push(value);
  }
  const index = Math.min(attempts.length, loopSignCases.length - 1);
  const current = loopSignCases[index]!;
  const signs = payload.currentIndex === index && Array.isArray(payload.currentSigns) && payload.currentSigns.length === current.signs.length
    && payload.currentSigns.every((sign) => sign === null || sign === "+" || sign === "-")
    ? payload.currentSigns as Array<LoopPolarity | null> : null;
  const loopType: LoopType | null = payload.currentIndex === index && (payload.currentLoopType === "R" || payload.currentLoopType === "B") ? payload.currentLoopType : null;
  return { attempts, index, signs, loopType };
}

function edgeGeometry(item: LoopSignCase, index: number, canvasWidth: number, canvasHeight: number) {
  const from = item.nodes[index]!;
  const to = item.nodes[(index + 1) % item.nodes.length]!;
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const dx = mid.x - 50;
  const dy = mid.y - 48;
  const length = Math.max(1, Math.hypot(dx, dy));
  const control = { x: mid.x + (dx / length) * 7, y: mid.y + (dy / length) * 7 };
  const nodeHalfWidth = Math.min(132, Math.max(78, canvasWidth * .22)) / canvasWidth * 50;
  const nodeHalfHeight = 25 / canvasHeight * 100;
  const boundary = (node: typeof from, toward: { x: number; y: number }) => {
    const vx = toward.x - node.x;
    const vy = toward.y - node.y;
    const scale = 1 / Math.max(Math.abs(vx) / Math.max(nodeHalfWidth, 1), Math.abs(vy) / Math.max(nodeHalfHeight, 1), .001);
    return { x: node.x + vx * scale, y: node.y + vy * scale };
  };
  const start = boundary(from, control);
  const end = boundary(to, control);
  const signLength = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
  const sign = { x: control.x + ((from.y - to.y) / signLength) * 8, y: control.y + ((to.x - from.x) / signLength) * 8 };
  return { path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`, sign };
}

function LoopCanvas({ item, signs, review, locked, onToggle }: { item: LoopSignCase; signs: Array<LoopPolarity | null>; review: Review | null; locked: boolean; onToggle: (index: number) => void }) {
  const { locale } = useI18n();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 300 });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => setCanvasSize({ width: canvas.clientWidth || 400, height: canvas.clientHeight || 300 });
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(canvas);
    return () => observer?.disconnect();
  }, []);
  return <div ref={canvasRef} className={styles.loopCanvas}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs><marker id={`w7-loop-arrow-${item.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0L10 5L0 10z" /></marker></defs>
      {item.edges.map((edge, index) => <path key={edge.id} className={`${styles.loopEdge} ${review ? styles.loopEdgeReviewed : ""}`} d={edgeGeometry(item, index, canvasSize.width, canvasSize.height).path} markerEnd={`url(#w7-loop-arrow-${item.id})`} />)}
    </svg>
    {item.nodes.map((node) => <span key={node.id} className={styles.loopNode} style={{ left: `${node.x}%`, top: `${node.y}%` }}>{node.label[locale]}</span>)}
    {item.edges.map((edge, index) => {
      const point = edgeGeometry(item, index, canvasSize.width, canvasSize.height).sign;
      const incorrect = Boolean(review?.incorrect.includes(index));
      const correct = Boolean(review) && !incorrect;
      return <span key={edge.id} className={styles.signPositioner} style={{ left: `${point.x}%`, top: `${point.y}%` } as CSSProperties}><motion.button type="button" whileTap={locked ? undefined : { scale: .82 }} className={`${styles.signButton} ${incorrect ? styles.incorrect : ""} ${correct ? styles.correct : ""}`} disabled={locked} aria-label={`${item.nodes[index]!.label[locale]} → ${item.nodes[(index + 1) % item.nodes.length]!.label[locale]}`} onClick={() => onToggle(index)}>
        {signs[index] === null ? "?" : signs[index] === "+" ? "+" : "−"}
        {review && <small>{edge.sign === "+" ? "+" : "−"}</small>}
      </motion.button></span>;
    })}
    {review && <div className={styles.loopPulse}><motion.div className={styles.loopPulseInner} initial={{ opacity: 0, scale: .65 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.65, 1, 1.04, 1.08] }} transition={{ duration: 1.05 }}><b>{item.loopType}</b><span aria-hidden="true">{item.loopType === "R" ? "↗" : "◎"}</span></motion.div></div>}
  </div>;
}

export function Week7LoopSigns({ onSubmit, onDraft, existingSubmission, existingDraft, forceSubmit }: LearningModuleProps) {
  const { locale } = useI18n();
  const text = copy[locale];
  const restored = useMemo(() => restore(existingDraft), [existingDraft]);
  const [index, setIndex] = useState(restored.index);
  const [attempts, setAttempts] = useState(restored.attempts);
  const [signs, setSigns] = useState<Array<LoopPolarity | null>>(() => restored.signs ?? loopSignCases[restored.index]!.signs.map(() => null));
  const [loopType, setLoopType] = useState<LoopType | null>(restored.loopType);
  const [review, setReview] = useState<Review | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const attemptsRef = useRef(restored.attempts);
  const signsRef = useRef(signs);
  const loopTypeRef = useRef(loopType);
  const submittedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const current = loopSignCases[index]!;
  const currentScore = scoreLoopSignAttempts(attempts);
  const allSignsFilled = signs.every((sign) => sign !== null);
  const canCheck = allSignsFilled && (index < 4 || loopType !== null) && !review;

  useEffect(() => () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); }, []);

  const submissionFor = useCallback((nextAttempts: LoopSignAttempt[], reason: "draft" | "completed" | "teacher-ended", nextIndex = index, nextSigns = signsRef.current, nextLoopType = loopTypeRef.current): ModuleSubmission => ({
    stage: 1,
    score: scoreLoopSignAttempts(nextAttempts),
    payload: { gameId: LOOP_SIGNS_GAME_ID, attempts: nextAttempts, currentIndex: nextIndex, currentSigns: nextSigns, currentLoopType: nextLoopType, answeredCount: nextAttempts.length, stageCount: loopSignCases.length, completionReason: reason },
  }), [index]);

  const send = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true); setFailed(false);
    try { if (await onSubmit(submission) === false) setFailed(true); } catch { setFailed(true); } finally { setSubmitting(false); }
  }, [onSubmit]);

  const finalize = useCallback((nextAttempts: LoopSignAttempt[], reason: "completed" | "teacher-ended") => {
    if (submittedRef.current || existingSubmission) return;
    submittedRef.current = true;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    const submission = submissionFor(nextAttempts, reason);
    setFinalSubmission(submission); setAttempts(nextAttempts); setFinalizing(true); void send(submission);
  }, [existingSubmission, send, submissionFor]);

  const advance = useCallback((nextAttempts: LoopSignAttempt[]) => {
    if (nextAttempts.length >= loopSignCases.length) { finalize(nextAttempts, "completed"); return; }
    const nextIndex = nextAttempts.length;
    const nextSigns = loopSignCases[nextIndex]!.signs.map(() => null);
    attemptsRef.current = nextAttempts; signsRef.current = nextSigns; loopTypeRef.current = null;
    setIndex(nextIndex); setAttempts(nextAttempts); setSigns(nextSigns); setLoopType(null); setReview(null);
    void onDraft?.(submissionFor(nextAttempts, "draft", nextIndex, nextSigns, null));
  }, [finalize, onDraft, submissionFor]);

  const saveDraft = useCallback((nextSigns = signsRef.current, nextLoop = loopTypeRef.current) => { void onDraft?.(submissionFor(attemptsRef.current, "draft", index, nextSigns, nextLoop)); }, [index, onDraft, submissionFor]);

  const toggle = (signIndex: number) => {
    if (review || finalizing || forceSubmit || existingSubmission) return;
    const next = signsRef.current.map((sign, itemIndex) => itemIndex === signIndex ? toggleLoopSign(sign) : sign);
    signsRef.current = next; setSigns(next); saveDraft(next, loopTypeRef.current);
  };

  const reset = () => {
    if (review || finalizing || forceSubmit || existingSubmission) return;
    const next = current.signs.map(() => null);
    signsRef.current = next; loopTypeRef.current = null; setSigns(next); setLoopType(null); saveDraft(next, null);
  };

  const chooseLoop = (value: LoopType) => {
    if (review || finalizing || forceSubmit || existingSubmission) return;
    loopTypeRef.current = value; setLoopType(value); saveDraft(signsRef.current, value);
  };

  const check = () => {
    if (!canCheck || finalizing || forceSubmit || existingSubmission) return;
    const attempt: LoopSignAttempt = { caseId: current.id, signs: signsRef.current as LoopPolarity[], loopType: index === 4 ? loopTypeRef.current : null };
    const points = scoreLoopSignAttempt(index, attempt);
    const incorrect = current.signs.flatMap((sign, signIndex) => sign === attempt.signs[signIndex] ? [] : [signIndex]);
    const next = [...attemptsRef.current, attempt];
    attemptsRef.current = next; setAttempts(next); setReview({ incorrect, points });
    void onDraft?.(submissionFor(next, "draft"));
    timerRef.current = window.setTimeout(() => advance(next), reduceMotion ? WEEK7_REVIEW_TIMING.loopSigns.reducedMotion : WEEK7_REVIEW_TIMING.loopSigns.normal);
  };

  useEffect(() => { if (forceSubmit && !finalizing && !existingSubmission) finalize(attemptsRef.current, "teacher-ended"); }, [finalizing, existingSubmission, finalize, forceSubmit]);
  useEffect(() => { if (restored.attempts.length === loopSignCases.length && !review && !existingSubmission) finalize(restored.attempts, "completed"); }, [existingSubmission, finalize, restored.attempts, review]);

  if (existingSubmission) return <section className={`${styles.shell} ${styles.centered}`}><LockKeyhole size={42} /><h2>{text.locked}</h2></section>;

  return <section className={styles.shell} data-week7-game="loop-signs">
    <header className={styles.header}><b>{text.title}</b><span>{text.stage} <strong>{index + 1}/5</strong></span><span>{text.score} <strong>{currentScore}</strong></span></header>
    <div className={styles.progress}>{loopSignCases.map((item, itemIndex) => <i key={item.id} className={itemIndex < attempts.length ? styles.done : itemIndex === index ? styles.active : ""} />)}</div>
    <div className={styles.prompt}><strong>{text.instruction}</strong><small>{current.assumption[locale]}</small></div>
    <LoopCanvas item={current} signs={signs} review={review} locked={Boolean(review) || Boolean(forceSubmit)} onToggle={toggle} />
    <div className={styles.feedback} aria-live="polite">
      {finalizing ? <><strong>{submitting ? text.saving : failed ? text.saveError : ""}</strong>{failed && finalSubmission && <button type="button" className={styles.retryButton} onClick={() => void send(finalSubmission)}><RotateCcw size={15} />{text.retry}</button>}</> : <>
      {review ? <><strong>{review.incorrect.length === 0 ? `✓ ${text.correct}` : `× ${text.reconsider}`} · +{review.points}/20</strong><small>{review.incorrect.length ? current.edges[review.incorrect[0]!]!.explanation[locale] : `${current.loopType} · ${current.loopType === "R" ? text.reinforcing : text.balancing}`}</small></> : <><strong>{current.situation[locale]}</strong><small>+ {text.same} · − {text.opposite}</small></>}
      </>}
    </div>
    {index === 4 && !review && <div className={styles.loopChoice}><b>{text.loopQuestion}</b><button type="button" disabled={finalizing} className={loopType === "R" ? styles.selected : ""} onClick={() => chooseLoop("R")}>{text.reinforcing}</button><button type="button" disabled={finalizing} className={loopType === "B" ? styles.selected : ""} onClick={() => chooseLoop("B")}>{text.balancing}</button></div>}
    <footer className={styles.actions}><button type="button" className={styles.secondaryButton} disabled={Boolean(review) || finalizing} onClick={reset}><RotateCcw size={17} />{text.reset}</button><button type="button" className={styles.primaryButton} disabled={!canCheck || finalizing} onClick={check}><Check size={18} />{text.check}</button></footer>
  </section>;
}
