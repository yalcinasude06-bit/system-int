"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Coins, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import styles from "../week8Games.module.css";
import { crisisCases } from "./crisisMeetingContent";
import { CRISIS_MEETING_GAME_ID, crisisDistance, crisisGauges, scoreCrisisAttempt, scoreCrisisAttempts, type CrisisAttempt } from "./crisisMeetingEngine";

type DraftPayload = { gameId?: unknown; attempts?: unknown; currentAllocation?: unknown };
const emptyAllocation = () => [0, 0, 0, 0];

const copy = {
  tr: { title: "8. HAFTA · MODÜL 1", crisis: "Kriz", score: "Puan", instruction: "3 jetonu dağıt. En iyi dengeyi kur.", goal: "HEDEF", apply: "Kararı Uygula", next: "Sonraki Kriz", finish: "Toplantıyı Tamamla", flow: "Akış", quality: "Kalite", team: "Ekip", strong: "Güçlü denge", partial: "Kısmen uygun", oneSided: "Tek taraflı karar", locked: "Bu toplantı turundaki kararların kilitli.", saved: "Kararlar kaydediliyor…", failed: "Kararlar kaydedilemedi. İlerlemen korundu.", retry: "Tekrar kaydet", remove: "Jetonu geri al", complete: "Kriz toplantısı tamamlandı", early: "Kısmi kararların kaydedildi" },
  en: { title: "WEEK 8 · MODULE 1", crisis: "Crisis", score: "Score", instruction: "Distribute 3 tokens. Build the best balance.", goal: "GOAL", apply: "Apply Decision", next: "Next Crisis", finish: "Complete Meeting", flow: "Flow", quality: "Quality", team: "Team", strong: "Strong balance", partial: "Partly suitable", oneSided: "One-sided decision", locked: "Your decisions for this meeting round are locked.", saved: "Saving decisions…", failed: "Decisions could not be saved. Your progress is preserved.", retry: "Save again", remove: "Take token back", complete: "Crisis meeting complete", early: "Your partial decisions were saved" },
} as const;

function restore(draft?: ModuleDraft | null) {
  const payload = draft?.payload as DraftPayload | undefined;
  const attempts: CrisisAttempt[] = [];
  if (payload?.gameId === CRISIS_MEETING_GAME_ID && Array.isArray(payload.attempts)) {
    for (const value of payload.attempts) {
      if (!value || typeof value !== "object") break;
      const candidate = value as CrisisAttempt;
      if (scoreCrisisAttempt(candidate, attempts.length) <= 0) break;
      attempts.push({ caseId: candidate.caseId, allocation: [...candidate.allocation] });
    }
  }
  const raw = payload?.currentAllocation;
  const allocation = Array.isArray(raw) && raw.length === 4 && raw.every((value) => Number.isInteger(value) && value >= 0 && value <= 3) && raw.reduce((sum, value) => sum + Number(value), 0) <= 3 ? raw.map(Number) : emptyAllocation();
  return { attempts, allocation };
}

export function Week8CrisisMeeting({ onSubmit, onDraft, existingSubmission, existingDraft, forceSubmit }: LearningModuleProps) {
  const { locale } = useI18n();
  const text = copy[locale];
  const reducedMotion = useReducedMotion();
  const restored = useMemo(() => restore(existingDraft), [existingDraft]);
  const [attempts, setAttempts] = useState(restored.attempts);
  const [allocation, setAllocation] = useState(restored.allocation);
  const [review, setReview] = useState<CrisisAttempt | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const attemptsRef = useRef(restored.attempts);
  const allocationRef = useRef(restored.allocation);
  const submittedRef = useRef(false);
  const index = review ? Math.max(0, attempts.length - 1) : Math.min(attempts.length, crisisCases.length - 1);
  const current = crisisCases[index]!;
  const distributed = allocation.reduce((sum, value) => sum + value, 0);
  const visibleAllocation = review?.allocation ?? allocation;
  const gauges = crisisGauges(index, visibleAllocation);
  const score = scoreCrisisAttempts(attempts);

  const submissionFor = useCallback((nextAttempts: CrisisAttempt[], reason: "draft" | "completed" | "teacher-ended", currentAllocation: number[]): ModuleSubmission => ({
    stage: 1,
    score: scoreCrisisAttempts(nextAttempts),
    payload: { gameId: CRISIS_MEETING_GAME_ID, attempts: nextAttempts, currentAllocation, answeredCount: nextAttempts.length, stageCount: crisisCases.length, completionReason: reason },
  }), []);

  const send = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true); setFailed(false);
    try { if (await onSubmit(submission) === false) setFailed(true); } catch { setFailed(true); } finally { setSubmitting(false); }
  }, [onSubmit]);

  const finalize = useCallback((nextAttempts: CrisisAttempt[], reason: "completed" | "teacher-ended") => {
    if (submittedRef.current || existingSubmission) return;
    submittedRef.current = true;
    const submission = submissionFor(nextAttempts, reason, emptyAllocation());
    setFinalSubmission(submission); setFinalizing(true); setReview(null); void send(submission);
  }, [existingSubmission, send, submissionFor]);

  const saveCurrentDraft = useCallback((nextAllocation: number[]) => {
    void onDraft?.(submissionFor(attemptsRef.current, "draft", nextAllocation));
  }, [onDraft, submissionFor]);

  const addToken = (stakeholderIndex: number) => {
    if (review || finalizing || forceSubmit || distributed >= 3) return;
    const next = allocation.map((value, itemIndex) => itemIndex === stakeholderIndex ? value + 1 : value);
    allocationRef.current = next; setAllocation(next); saveCurrentDraft(next);
  };

  const removeToken = (stakeholderIndex: number) => {
    if (review || finalizing || forceSubmit || allocation[stakeholderIndex] === 0) return;
    const next = allocation.map((value, itemIndex) => itemIndex === stakeholderIndex ? value - 1 : value);
    allocationRef.current = next; setAllocation(next); saveCurrentDraft(next);
  };

  const applyDecision = () => {
    if (distributed !== 3 || review || finalizing || forceSubmit) return;
    const attempt = { caseId: current.id, allocation: [...allocation] };
    const next = [...attemptsRef.current, attempt];
    attemptsRef.current = next; setAttempts(next); setReview(attempt);
    void onDraft?.(submissionFor(next, "draft", emptyAllocation()));
  };

  const advance = () => {
    if (!review || finalizing) return;
    if (attemptsRef.current.length >= crisisCases.length) { finalize(attemptsRef.current, "completed"); return; }
    const next = emptyAllocation(); allocationRef.current = next; setAllocation(next); setReview(null);
  };

  useEffect(() => { if (forceSubmit && !finalizing && !existingSubmission) finalize(attemptsRef.current, "teacher-ended"); }, [existingSubmission, finalizing, finalize, forceSubmit]);
  useEffect(() => { if (restored.attempts.length === crisisCases.length && !existingSubmission) finalize(restored.attempts, "completed"); }, [existingSubmission, finalize, restored.attempts]);

  if (existingSubmission) return <section className={`${styles.shell} ${styles.centered}`}><LockKeyhole size={44} /><h2>{text.locked}</h2></section>;
  if (finalizing) return <section className={`${styles.shell} ${styles.centered}`}><Sparkles size={46} /><h2>{attempts.length === crisisCases.length ? text.complete : text.early}</h2><p>{submitting ? text.saved : failed ? text.failed : ""}</p>{failed && finalSubmission && <button className={styles.secondaryButton} onClick={() => void send(finalSubmission)}><RotateCcw size={17} />{text.retry}</button>}</section>;

  const distance = review ? crisisDistance(review.allocation, current.ideal) : 0;
  const roundPoints = review ? scoreCrisisAttempt(review, index) : 0;
  const verdict = distance === 0 ? text.strong : distance === 1 ? text.partial : text.oneSided;

  return <section className={`${styles.shell} ${styles.crisisShell}`} data-week8-game="crisis-meeting">
    <header className={styles.header}><b>{text.title}</b><span>{text.crisis} <strong>{index + 1}/5</strong></span><span>{text.score} <strong>{score}</strong></span></header>
    <div className={styles.progress}>{crisisCases.map((item, itemIndex) => <i key={item.id} className={itemIndex < attempts.length ? styles.done : itemIndex === index ? styles.active : ""} />)}</div>
    <div className={styles.caseBrief}><div><small>{current.title[locale]}</small><h1>{current.situation[locale]}</h1></div><span><b>{text.goal}</b>{current.target[locale]}</span></div>
    <p className={styles.instruction}><Coins size={19} />{text.instruction}<b>{3 - distributed}</b></p>
    <div className={styles.meetingScene}>
      <motion.div className={styles.table} animate={reducedMotion ? undefined : { scale: [1, 1.012, 1] }} transition={{ duration: 4, repeat: Infinity }}><span>8</span></motion.div>
      <div className={styles.stakeholders}>
        {current.stakeholders.map((stakeholder, stakeholderIndex) => <motion.article key={stakeholder.id} className={`${styles.stakeholder} ${review && current.ideal[stakeholderIndex] > 0 ? styles.ideal : ""}`} animate={review && current.ideal[stakeholderIndex] === 0 && allocation[stakeholderIndex] > 0 && !reducedMotion ? { x: [0, -3, 3, 0] } : undefined}>
          <button type="button" disabled={Boolean(review) || distributed >= 3} onClick={() => addToken(stakeholderIndex)}><span>{stakeholder.icon}</span><div><strong>{stakeholder.role[locale]}</strong><small>{stakeholder.proposal[locale]}</small></div></button>
          <div className={styles.tokens}>{Array.from({ length: visibleAllocation[stakeholderIndex] ?? 0 }, (_, tokenIndex) => <motion.button initial={{ scale: 0, y: 15 }} animate={{ scale: 1, y: 0 }} type="button" key={tokenIndex} aria-label={text.remove} disabled={Boolean(review)} onClick={() => removeToken(stakeholderIndex)}>●</motion.button>)}</div>
        </motion.article>)}
      </div>
    </div>
    <div className={styles.gauges}>{[text.flow, text.quality, text.team].map((label, gaugeIndex) => <div key={label}><span><b>{label}</b><strong>{Math.round(gauges[gaugeIndex] ?? 0)}</strong></span><i><motion.em animate={{ width: `${gauges[gaugeIndex]}%` }} transition={{ duration: .6 }} /></i></div>)}</div>
    {review && <motion.div className={`${styles.result} ${distance === 0 ? styles.success : ""}`} initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}><span>{distance === 0 ? <Check /> : "◌"}</span><div><strong>{verdict} · +{roundPoints}/20</strong><p>{current.learning[locale]}</p></div></motion.div>}
    <footer className={styles.actions}><div className={styles.looseTokens}>{Array.from({ length: Math.max(0, 3 - distributed) }, (_, item) => <motion.i key={item} layout>●</motion.i>)}</div>{review ? <button className={styles.primaryButton} onClick={advance}>{attempts.length === 5 ? text.finish : text.next}</button> : <button className={styles.primaryButton} disabled={distributed !== 3} onClick={applyDecision}>{text.apply}</button>}</footer>
  </section>;
}
