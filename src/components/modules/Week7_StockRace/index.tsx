"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LockKeyhole, Play, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import styles from "../week7Games.module.css";
import { WEEK7_REVIEW_TIMING } from "../week7ReviewTiming";
import { stockRaceRounds, type StockTank, type TankId } from "./stockRaceContent";
import { raceResult, scoreStockRaceAttempts, stockAtTime, STOCK_RACE_GAME_ID, STOCK_RACE_MS_PER_SECOND, type StockRaceAttempt } from "./stockRaceEngine";

type DraftPayload = { gameId?: unknown; attempts?: unknown; currentIndex?: unknown; currentPrediction?: unknown };
type RaceReview = { winner: TankId; time: number; correct: boolean; roundIndex: number };

const copy = {
  tr: {
    title: "7. HAFTA · MODÜL 2", round: "Yarış", score: "Puan", target: "HEDEF", start: "Başlangıç", input: "Giriş", output: "Çıkış", choose: "Önce hangi depo?",
    run: "Yarışı Başlat", correct: "Doğru tahmin!", wrong: "Bu kez farklı depo kazandı.", result: (id: string, time: number) => `${id} ilk ulaştı · ${time.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} sn`,
    learning: "Başlangıç, Giriş ve Çıkış birlikte belirleyicidir.", saveError: "Yanıt kaydedilemedi. Bağlantını kontrol edip yeniden dene.", saving: "Yanıt kaydediliyor…", locked: "Bu yarış turundaki yanıtların kilitli.", retry: "Tekrar kaydet",
  },
  en: {
    title: "WEEK 7 · MODULE 2", round: "Race", score: "Score", target: "TARGET", start: "Start", input: "Inflow", output: "Outflow", choose: "Which tank arrives first?",
    run: "Start Race", correct: "Correct prediction!", wrong: "A different tank won this time.", result: (id: string, time: number) => `${id} arrived first · ${time.toLocaleString("en-US", { maximumFractionDigits: 1 })} s`,
    learning: "Start, Inflow, and Outflow determine the result together.", saveError: "Your answer could not be saved. Check your connection and try again.", saving: "Saving your answer…", locked: "Your answers for this race round are locked.", retry: "Save again",
  },
} as const;

function isAttempt(value: unknown, index: number): value is StockRaceAttempt {
  if (!value || typeof value !== "object") return false;
  const attempt = value as Partial<StockRaceAttempt>;
  const round = stockRaceRounds[index];
  return Boolean(round && attempt.roundId === round.id && round.tanks.some((tank) => tank.id === attempt.prediction));
}

function restore(draft?: ModuleDraft | null) {
  const payload = draft?.payload as DraftPayload | undefined;
  if (payload?.gameId !== STOCK_RACE_GAME_ID || !Array.isArray(payload.attempts)) return { attempts: [] as StockRaceAttempt[], prediction: null as TankId | null };
  const attempts: StockRaceAttempt[] = [];
  for (const value of payload.attempts) { if (!isAttempt(value, attempts.length)) break; attempts.push(value); }
  const current = stockRaceRounds[Math.min(attempts.length, 4)]!;
  const prediction = payload.currentIndex === attempts.length && current.tanks.some((tank) => tank.id === payload.currentPrediction) ? payload.currentPrediction as TankId : null;
  return { attempts, prediction };
}

function currentFlows(tank: StockTank, time: number) {
  if (!tank.change || time < tank.change.at) return { inflow: tank.inflow, outflow: tank.outflow };
  return { inflow: tank.change.field === "inflow" ? tank.change.value : tank.inflow, outflow: tank.change.field === "outflow" ? tank.change.value : tank.outflow };
}

export function Week7StockRace({ onSubmit, onDraft, existingSubmission, existingDraft, forceSubmit }: LearningModuleProps) {
  const { locale } = useI18n();
  const text = copy[locale];
  const restored = useMemo(() => restore(existingDraft), [existingDraft]);
  const [attempts, setAttempts] = useState(restored.attempts);
  const [prediction, setPrediction] = useState<TankId | null>(restored.prediction);
  const [clock, setClock] = useState(0);
  const [running, setRunning] = useState(false);
  const [review, setReview] = useState<RaceReview | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const attemptsRef = useRef(restored.attempts);
  const predictionRef = useRef<TankId | null>(restored.prediction);
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const submittedRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const index = review?.roundIndex ?? Math.min(attempts.length, stockRaceRounds.length - 1);
  const current = stockRaceRounds[index]!;
  const outcome = useMemo(() => raceResult(current), [current]);
  const score = scoreStockRaceAttempts(attempts);

  const clearTimers = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    frameRef.current = null; timerRef.current = null;
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const submissionFor = useCallback((nextAttempts: StockRaceAttempt[], reason: "draft" | "completed" | "teacher-ended", nextPrediction = predictionRef.current): ModuleSubmission => ({
    stage: 1,
    score: scoreStockRaceAttempts(nextAttempts),
    payload: { gameId: STOCK_RACE_GAME_ID, attempts: nextAttempts, currentIndex: Math.min(nextAttempts.length, 4), currentPrediction: nextPrediction, answeredCount: nextAttempts.length, stageCount: stockRaceRounds.length, completionReason: reason },
  }), []);

  const send = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true); setFailed(false);
    try { if (await onSubmit(submission) === false) setFailed(true); } catch { setFailed(true); } finally { setSubmitting(false); }
  }, [onSubmit]);

  const finalize = useCallback((nextAttempts: StockRaceAttempt[], reason: "completed" | "teacher-ended") => {
    if (submittedRef.current || existingSubmission) return;
    submittedRef.current = true; clearTimers();
    const submission = submissionFor(nextAttempts, reason, null);
    setFinalSubmission(submission); setAttempts(nextAttempts); setFinalizing(true); setRunning(false); void send(submission);
  }, [clearTimers, existingSubmission, send, submissionFor]);

  const advance = useCallback((nextAttempts: StockRaceAttempt[]) => {
    if (nextAttempts.length >= stockRaceRounds.length) { finalize(nextAttempts, "completed"); return; }
    attemptsRef.current = nextAttempts; predictionRef.current = null;
    setAttempts(nextAttempts); setPrediction(null); setClock(0); setReview(null); setRunning(false);
    void onDraft?.(submissionFor(nextAttempts, "draft", null));
  }, [finalize, onDraft, submissionFor]);

  const choose = (tankId: TankId) => {
    if (running || review || finalizing || forceSubmit || existingSubmission) return;
    predictionRef.current = tankId; setPrediction(tankId);
    void onDraft?.(submissionFor(attemptsRef.current, "draft", tankId));
  };

  const start = () => {
    const selected = predictionRef.current;
    if (!selected || running || review || finalizing || forceSubmit || existingSubmission) return;
    setRunning(true); setClock(0);
    const started = performance.now();
    const msPerSecond = reduceMotion ? 95 : STOCK_RACE_MS_PER_SECOND;
    const tick = (now: number) => {
      const time = Math.min(outcome.time, (now - started) / msPerSecond);
      setClock(time);
      if (time < outcome.time) { frameRef.current = requestAnimationFrame(tick); return; }
      frameRef.current = null; setRunning(false);
      const attempt: StockRaceAttempt = { roundId: current.id, prediction: selected };
      const next = [...attemptsRef.current, attempt];
      attemptsRef.current = next;
      setAttempts(next); setReview({ winner: outcome.winner, time: outcome.time, correct: selected === outcome.winner, roundIndex: index });
      void onDraft?.(submissionFor(next, "draft", null));
      timerRef.current = window.setTimeout(() => advance(next), reduceMotion ? WEEK7_REVIEW_TIMING.stockRace.reducedMotion : WEEK7_REVIEW_TIMING.stockRace.normal);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => { if (forceSubmit && !finalizing && !existingSubmission) finalize(attemptsRef.current, "teacher-ended"); }, [finalizing, existingSubmission, finalize, forceSubmit]);
  useEffect(() => { if (restored.attempts.length === stockRaceRounds.length && !review && !existingSubmission) finalize(restored.attempts, "completed"); }, [existingSubmission, finalize, restored.attempts, review]);

  if (existingSubmission) return <section className={`${styles.shell} ${styles.centered}`}><LockKeyhole size={42} /><h2>{text.locked}</h2></section>;

  return <section className={`${styles.shell} ${styles.stockShell}`} data-week7-game="stock-race">
    <header className={styles.header}><b>{text.title}</b><span>{text.round} <strong>{index + 1}/5</strong></span><span>{text.score} <strong>{score}</strong></span></header>
    <div className={styles.progress}>{stockRaceRounds.map((round, roundIndex) => <i key={round.id} className={roundIndex < attempts.length ? styles.done : roundIndex === index ? styles.active : ""} />)}</div>
    <div className={styles.prompt}><strong>{current.prompt[locale]}</strong><small>{current.note[locale]}</small></div>
    <div key={current.id} className={styles.tankStage} data-round-id={current.id} style={{ "--tank-count": current.tanks.length } as React.CSSProperties}>
      {current.tanks.map((tank) => {
        const level = stockAtTime(tank, clock);
        const flows = currentFlows(tank, clock);
        const winner = review?.winner === tank.id;
        return <motion.button type="button" key={tank.id} className={`${styles.tankCard} ${prediction === tank.id ? styles.selected : ""} ${winner ? styles.winner : ""}`} disabled={running || Boolean(review) || finalizing || Boolean(forceSubmit) || Boolean(existingSubmission)} whileTap={{ scale: .96 }} onClick={() => choose(tank.id)} aria-pressed={prediction === tank.id}>
          <div className={styles.tankVisual}><div className={styles.tankInterior}><div className={styles.water} style={{ height: `${level}%` }}><i /></div><div className={styles.tankTargetLine} style={{ bottom: `${current.target}%` }}>{tank.id === current.tanks[0]!.id && <span>{text.target} {current.target}</span>}</div></div><b>{Math.round(level)}</b><span className={styles.inflowDrop}>↓</span><span className={styles.outflowDrop}>↘</span></div>
          <strong>{tank.id}</strong><small>{text.start} {tank.start}</small>
          <div className={styles.flowLabels}><span>↓ {text.input} +{flows.inflow}</span><span>↘ {text.output} −{flows.outflow}</span></div>
        </motion.button>;
      })}
    </div>
    <div className={styles.feedback} aria-live="polite">{finalizing ? <><strong>{submitting ? text.saving : failed ? text.saveError : ""}</strong>{failed && finalSubmission && <button type="button" className={styles.retryButton} onClick={() => void send(finalSubmission)}><RotateCcw size={15} />{text.retry}</button>}</> : review ? <><strong>{review.correct ? `✓ ${text.correct}` : `× ${text.wrong}`} · +{review.correct ? 20 : 0}/20</strong><small>{text.result(review.winner, review.time)} · {text.learning}</small></> : <><strong>{text.choose}</strong><small>{current.note[locale]}</small></>}</div>
    <footer className={styles.actions}><div className={styles.tankChoices}>{current.tanks.map((tank) => <button key={tank.id} type="button" className={prediction === tank.id ? styles.selected : ""} disabled={running || Boolean(review) || finalizing} onClick={() => choose(tank.id)}>{tank.id}</button>)}</div><button type="button" className={styles.primaryButton} disabled={!prediction || running || Boolean(review) || finalizing} onClick={start}><Play size={18} fill="currentColor" />{text.run}</button></footer>
  </section>;
}
