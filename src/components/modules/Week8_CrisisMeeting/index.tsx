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

function MeetingAvatar({ index, reacting = false }: { index: number; reacting?: boolean }) {
  const palettes = [
    ["#315f8d", "#efb38f", "#173d63"],
    ["#7f527b", "#d99a78", "#57304f"],
    ["#39745d", "#bc7d5f", "#214d3c"],
    ["#9a6237", "#f0bd98", "#633919"],
  ] as const;
  const [shirt, skin, hair] = palettes[index % palettes.length]!;
  return <motion.svg className={styles.avatar} viewBox="0 0 72 72" aria-hidden="true" animate={reacting ? { y: [0, -3, 0], rotate: [0, index % 2 ? -2 : 2, 0] } : undefined} transition={{ duration: .72 }}>
    <circle cx="36" cy="36" r="34" fill="#f7fbff" />
    <path d="M13 68c2-18 11-27 23-27s21 9 23 27" fill={shirt} />
    <path d="M24 30c0-11 5-18 12-18s12 7 12 18c0 9-5 16-12 16s-12-7-12-16Z" fill={skin} />
    <path d="M23 29c0-13 6-20 14-20 8 0 13 7 13 18-5-2-9-6-11-11-3 6-9 10-16 11Z" fill={hair} />
    <circle cx="31" cy="31" r="1.4" fill="#28384a" /><circle cx="42" cy="31" r="1.4" fill="#28384a" />
    <path d={reacting ? "M32 37q4 4 8 0" : "M32 38h8"} fill="none" stroke="#8c4f42" strokeWidth="1.5" strokeLinecap="round" />
  </motion.svg>;
}

const copy = {
  tr: { title: "8. HAFTA · MODÜL 1", crisis: "Kriz", score: "Puan", instruction: "Kişiye dokun, 3 karar jetonunu dağıt.", goal: "HEDEF", next: "Sonraki Kriz", finish: "Toplantıyı Tamamla", flow: "Akış", quality: "Kalite", team: "Ekip", strong: "Güçlü denge", partial: "Kısmen uygun", oneSided: "Tek taraflı karar", locked: "Bu toplantı turundaki kararların kilitli.", saved: "Kararlar kaydediliyor…", failed: "Kararlar kaydedilemedi. İlerlemen korundu.", retry: "Tekrar kaydet", remove: "Jetonu geri al", complete: "Kriz toplantısı tamamlandı", early: "Kısmi kararların kaydedildi", tokensLeft: "Kalan jeton" },
  en: { title: "WEEK 8 · MODULE 1", crisis: "Crisis", score: "Score", instruction: "Tap a person to distribute 3 decision tokens.", goal: "GOAL", next: "Next Crisis", finish: "Complete Meeting", flow: "Flow", quality: "Quality", team: "Team", strong: "Strong balance", partial: "Partly suitable", oneSided: "One-sided decision", locked: "Your decisions for this meeting round are locked.", saved: "Saving decisions…", failed: "Decisions could not be saved. Your progress is preserved.", retry: "Save again", remove: "Take token back", complete: "Crisis meeting complete", early: "Your partial decisions were saved", tokensLeft: "Tokens left" },
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
  const displayedGauges = review ? gauges : [50, 50, 50];
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
    const currentAllocation = allocationRef.current;
    const currentTotal = currentAllocation.reduce((sum, value) => sum + value, 0);
    if (review || finalizing || forceSubmit || currentTotal >= 3) return;
    const next = currentAllocation.map((value, itemIndex) => itemIndex === stakeholderIndex ? value + 1 : value);
    const nextTotal = next.reduce((sum, value) => sum + value, 0);
    allocationRef.current = next; setAllocation(next);
    if (nextTotal < 3) { saveCurrentDraft(next); return; }

    const attempt = { caseId: current.id, allocation: [...next] };
    const nextAttempts = [...attemptsRef.current, attempt];
    attemptsRef.current = nextAttempts; setAttempts(nextAttempts); setReview(attempt);
    void onDraft?.(submissionFor(nextAttempts, "draft", emptyAllocation()));
  };

  const removeToken = (stakeholderIndex: number) => {
    const currentAllocation = allocationRef.current;
    if (review || finalizing || forceSubmit || currentAllocation[stakeholderIndex] === 0) return;
    const next = currentAllocation.map((value, itemIndex) => itemIndex === stakeholderIndex ? value - 1 : value);
    allocationRef.current = next; setAllocation(next); saveCurrentDraft(next);
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
      <div data-meeting-table className={`${styles.table} ${review ? styles.tableDecided : ""}`}>
        <div className={styles.decisionRing}><span>{review ? "✓" : "8"}</span>{review && <div className={styles.tableTokens}>{[0, 1, 2].map((token) => <motion.i key={token} initial={{ opacity: 0, scale: .4, x: (token - 1) * 28, y: 35 }} animate={{ opacity: 1, scale: 1, x: (token - 1) * 18, y: 18 }} transition={{ delay: reducedMotion ? 0 : token * .1 }}>●</motion.i>)}</div>}</div>
        {review && <motion.strong className={styles.tableVerdict} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : .45 }}>{verdict}</motion.strong>}
      </div>
      <div className={styles.stakeholders}>
        {current.stakeholders.map((stakeholder, stakeholderIndex) => <motion.article key={stakeholder.id} className={`${styles.stakeholder} ${review && current.ideal[stakeholderIndex] > 0 ? styles.ideal : ""} ${visibleAllocation[stakeholderIndex] ? styles.hasToken : ""}`} animate={review && current.ideal[stakeholderIndex] === 0 && visibleAllocation[stakeholderIndex] > 0 && !reducedMotion ? { x: [0, -3, 3, 0] } : undefined}>
          <button type="button" disabled={Boolean(review) || distributed >= 3} onClick={() => addToken(stakeholderIndex)} aria-label={`${stakeholder.role[locale]}: ${stakeholder.proposal[locale]}`}>
            <MeetingAvatar index={stakeholderIndex} reacting={Boolean(review)} />
            <div className={styles.speech}><strong>{stakeholder.role[locale]}</strong><small>{stakeholder.proposal[locale]}</small></div>
          </button>
          <div className={styles.tokens}>{Array.from({ length: visibleAllocation[stakeholderIndex] ?? 0 }, (_, tokenIndex) => <motion.button initial={{ scale: .35, x: stakeholderIndex % 2 ? -42 : 42, y: stakeholderIndex < 2 ? 42 : -42 }} animate={{ scale: 1, x: 0, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 19 }} type="button" key={tokenIndex} aria-label={text.remove} disabled={Boolean(review)} onClick={() => removeToken(stakeholderIndex)}>●</motion.button>)}</div>
        </motion.article>)}
      </div>
    </div>
    <div className={styles.gauges}>{[text.flow, text.quality, text.team].map((label, gaugeIndex) => <div key={label}><span><b>{label}</b><strong>{Math.round(displayedGauges[gaugeIndex] ?? 0)}</strong></span><i><motion.em animate={{ width: `${displayedGauges[gaugeIndex]}%` }} transition={{ duration: reducedMotion ? 0 : .75 }} /></i></div>)}</div>
    {review && <motion.div className={`${styles.result} ${distance === 0 ? styles.success : ""}`} initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}><span>{distance === 0 ? <Check /> : "◌"}</span><div><strong>{verdict} · +{roundPoints}/20</strong><p>{current.learning[locale]}</p></div></motion.div>}
    <footer className={styles.actions}><div className={styles.looseTokens} aria-label={`${text.tokensLeft}: ${Math.max(0, 3 - distributed)}`}>{Array.from({ length: Math.max(0, 3 - distributed) }, (_, item) => <motion.i key={item} layout>●</motion.i>)}</div>{review && <button className={styles.primaryButton} onClick={advance}>{attempts.length === 5 ? text.finish : text.next}</button>}</footer>
  </section>;
}
