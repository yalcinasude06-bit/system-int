"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Coins, FileSearch, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import styles from "../week8Games.module.css";
import { evidenceCases } from "./evidenceMarketContent";
import { EVIDENCE_MARKET_GAME_ID, scoreEvidenceAttempt, scoreEvidenceAttempts, type EvidenceAttempt } from "./evidenceMarketEngine";

type DraftPayload = { gameId?: unknown; attempts?: unknown; currentOpened?: unknown; currentSolution?: unknown };
const copy = {
  tr: { title: "8. HAFTA · MODÜL 2", case: "Vaka", score: "Puan", credit: "Kalan Kredi", instruction: "100 kredi var. Kanıt aç, sonra çözümü seç.", goal: "HEDEF", market: "Kanıt Pazarı", desk: "Masamdaki Kanıtlar", solution: "Çözüm", open: "Aç", lock: "Çözümü Kilitle", next: "Sonraki Vaka", finish: "Pazarı Tamamla", required: "Gerekli kanıt", extra: "Ekstra harcama", best: "En uygun çözüm", chooseTwo: "Çözüm için en az 2 kanıt aç.", locked: "Bu pazar turundaki yanıtların kilitli.", complete: "Kanıt pazarı tamamlandı", partial: "Kısmi araştırman kaydedildi", saving: "Sonuç kaydediliyor…", failed: "Sonuç kaydedilemedi. İlerlemen korundu.", retry: "Tekrar kaydet" },
  en: { title: "WEEK 8 · MODULE 2", case: "Case", score: "Score", credit: "Credit Left", instruction: "You have 100 credits. Open evidence, then choose.", goal: "GOAL", market: "Evidence Market", desk: "Evidence on My Desk", solution: "Solution", open: "Open", lock: "Lock Solution", next: "Next Case", finish: "Complete Market", required: "Required evidence", extra: "Extra spending", best: "Best solution", chooseTwo: "Open at least 2 evidence cards to decide.", locked: "Your answers for this market round are locked.", complete: "Evidence market complete", partial: "Your partial research was saved", saving: "Saving result…", failed: "Result could not be saved. Your progress is preserved.", retry: "Save again" },
} as const;

function restore(draft?: ModuleDraft | null) {
  const payload = draft?.payload as DraftPayload | undefined;
  const attempts: EvidenceAttempt[] = [];
  if (payload?.gameId === EVIDENCE_MARKET_GAME_ID && Array.isArray(payload.attempts)) for (const value of payload.attempts) {
    if (!value || typeof value !== "object") break;
    const candidate = value as EvidenceAttempt;
    const currentCase = evidenceCases[attempts.length];
    if (!currentCase || candidate.caseId !== currentCase.id || !Array.isArray(candidate.opened) || candidate.opened.some((id) => typeof id !== "string") || !currentCase.solutions.some((item) => item.id === candidate.solutionId)) break;
    attempts.push({ caseId: candidate.caseId, opened: [...candidate.opened], solutionId: candidate.solutionId });
  }
  const current = evidenceCases[Math.min(attempts.length, 4)]!;
  const opened = Array.isArray(payload?.currentOpened) ? [...new Set(payload.currentOpened.filter((id): id is string => typeof id === "string" && current.evidence.some((item) => item.id === id)))] : [];
  const solution = typeof payload?.currentSolution === "string" && current.solutions.some((item) => item.id === payload.currentSolution) ? payload.currentSolution : null;
  return { attempts, opened, solution };
}

export function Week8EvidenceMarket({ onSubmit, onDraft, existingSubmission, existingDraft, forceSubmit }: LearningModuleProps) {
  const { locale } = useI18n(); const text = copy[locale]; const reduceMotion = useReducedMotion();
  const restored = useMemo(() => restore(existingDraft), [existingDraft]);
  const [attempts, setAttempts] = useState(restored.attempts);
  const [opened, setOpened] = useState(restored.opened);
  const [solution, setSolution] = useState<string | null>(restored.solution);
  const [review, setReview] = useState<EvidenceAttempt | null>(null);
  const [finalizing, setFinalizing] = useState(false); const [submitting, setSubmitting] = useState(false); const [failed, setFailed] = useState(false); const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const attemptsRef = useRef(restored.attempts); const openedRef = useRef(restored.opened); const submittedRef = useRef(false);
  const index = review ? Math.max(0, attempts.length - 1) : Math.min(attempts.length, evidenceCases.length - 1); const current = evidenceCases[index]!;
  const score = scoreEvidenceAttempts(attempts); const spent = current.evidence.filter((item) => opened.includes(item.id)).reduce((sum, item) => sum + item.cost, 0); const credit = 100 - spent;

  const submissionFor = useCallback((nextAttempts: EvidenceAttempt[], reason: "draft" | "completed" | "teacher-ended", currentOpened: string[], currentSolution: string | null): ModuleSubmission => ({ stage: 1, score: scoreEvidenceAttempts(nextAttempts), payload: { gameId: EVIDENCE_MARKET_GAME_ID, attempts: nextAttempts, currentOpened, currentSolution, answeredCount: nextAttempts.length, stageCount: evidenceCases.length, completionReason: reason } }), []);
  const saveDraft = useCallback((nextOpened: string[], nextSolution: string | null) => { void onDraft?.(submissionFor(attemptsRef.current, "draft", nextOpened, nextSolution)); }, [onDraft, submissionFor]);
  const send = useCallback(async (submission: ModuleSubmission) => { setSubmitting(true); setFailed(false); try { if (await onSubmit(submission) === false) setFailed(true); } catch { setFailed(true); } finally { setSubmitting(false); } }, [onSubmit]);
  const finalize = useCallback((nextAttempts: EvidenceAttempt[], reason: "completed" | "teacher-ended") => { if (submittedRef.current || existingSubmission) return; submittedRef.current = true; const submission = submissionFor(nextAttempts, reason, [], null); setFinalSubmission(submission); setFinalizing(true); setReview(null); void send(submission); }, [existingSubmission, send, submissionFor]);

  const openEvidence = (id: string) => {
    const card = current.evidence.find((item) => item.id === id); if (!card || review || finalizing || opened.includes(id) || card.cost > credit || forceSubmit) return;
    const next = [...opened, id]; openedRef.current = next; setOpened(next); saveDraft(next, solution);
  };
  const choose = (id: string) => { if (opened.length < 2 || review || finalizing || forceSubmit) return; setSolution(id); saveDraft(openedRef.current, id); };
  const lock = () => { if (!solution || opened.length < 2 || review || finalizing) return; const attempt = { caseId: current.id, opened: [...opened], solutionId: solution }; const next = [...attemptsRef.current, attempt]; attemptsRef.current = next; setAttempts(next); setReview(attempt); void onDraft?.(submissionFor(next, "draft", [], null)); };
  const advance = () => { if (!review || finalizing) return; if (attemptsRef.current.length >= evidenceCases.length) { finalize(attemptsRef.current, "completed"); return; } openedRef.current = []; setOpened([]); setSolution(null); setReview(null); };

  useEffect(() => { if (forceSubmit && !finalizing && !existingSubmission) finalize(attemptsRef.current, "teacher-ended"); }, [existingSubmission, finalizing, finalize, forceSubmit]);
  useEffect(() => { if (restored.attempts.length === evidenceCases.length && !existingSubmission) finalize(restored.attempts, "completed"); }, [existingSubmission, finalize, restored.attempts]);

  if (existingSubmission) return <section className={`${styles.shell} ${styles.centered}`}><LockKeyhole size={44} /><h2>{text.locked}</h2></section>;
  if (finalizing) return <section className={`${styles.shell} ${styles.centered}`}><Sparkles size={46} /><h2>{attempts.length === evidenceCases.length ? text.complete : text.partial}</h2><p>{submitting ? text.saving : failed ? text.failed : ""}</p>{failed && finalSubmission && <button className={styles.secondaryButton} onClick={() => void send(finalSubmission)}><RotateCcw size={17} />{text.retry}</button>}</section>;
  const roundPoints = review ? scoreEvidenceAttempt(review, index) : 0;

  return <section className={`${styles.shell} ${styles.marketShell}`} data-week8-game="evidence-market">
    <header className={styles.header}><b>{text.title}</b><span>{text.case} <strong>{index + 1}/5</strong></span><span>{text.credit} <strong>{credit}</strong></span><span>{text.score} <strong>{score}</strong></span></header>
    <div className={styles.progress}>{evidenceCases.map((item, itemIndex) => <i key={item.id} className={itemIndex < attempts.length ? styles.done : itemIndex === index ? styles.active : ""} />)}</div>
    <div className={styles.caseBrief}><div><small>{current.title[locale]}</small><h1>{current.situation[locale]}</h1></div><span><b>{text.goal}</b>{current.target[locale]}</span></div>
    <p className={styles.instruction}><Coins size={19} />{text.instruction}</p>
    <div className={styles.marketLayout}>
      <section><h2><FileSearch />{text.market}</h2><div className={styles.evidenceGrid}>{current.evidence.map((card) => { const isOpen = opened.includes(card.id); const required = review && current.required.includes(card.id); return <motion.button layout key={card.id} type="button" className={`${styles.evidenceCard} ${isOpen ? styles.open : ""} ${required ? styles.required : ""}`} disabled={Boolean(review) || isOpen || card.cost > credit} onClick={() => openEvidence(card.id)} whileTap={{ scale: .97 }} animate={isOpen && !reduceMotion ? { rotateY: [90, 0] } : undefined}><span className={styles.price}>{card.cost} ◉</span>{isOpen ? <><strong>{card.title[locale]}</strong><small>{card.detail[locale]}</small>{required && <em>{text.required}</em>}</> : <><FileSearch /><strong>{card.title[locale]}</strong><small>{text.open}</small></>}</motion.button>; })}</div></section>
      <aside className={styles.desk}><h2>{text.desk}</h2><div><AnimatePresence>{opened.map((id) => { const card = current.evidence.find((item) => item.id === id)!; return <motion.span key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><Check />{card.title[locale]}</motion.span>; })}</AnimatePresence>{opened.length === 0 && <small>—</small>}</div></aside>
    </div>
    <section className={styles.solutions}><h2>{text.solution}</h2><div>{current.solutions.map((item) => <motion.button type="button" key={item.id} disabled={opened.length < 2 || Boolean(review)} className={`${solution === item.id ? styles.selected : ""} ${review && item.id === current.correct ? styles.correct : ""} ${review && solution === item.id && item.id !== current.correct ? styles.wrong : ""}`} onClick={() => choose(item.id)} animate={review && solution === item.id && item.id !== current.correct && !reduceMotion ? { x: [0, -3, 3, 0] } : undefined}>{item.text[locale]}</motion.button>)}</div>{opened.length < 2 && <small>{text.chooseTwo}</small>}</section>
    {review && <motion.div className={`${styles.result} ${review.solutionId === current.correct ? styles.success : ""}`} initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}><span>{review.solutionId === current.correct ? <Check /> : "◌"}</span><div><strong>{text.best} · +{roundPoints}/20</strong><p>{current.learning[locale]}</p><small>{review.opened.filter((id) => !current.required.includes(id)).length ? text.extra : `${text.required} ✓`}</small></div></motion.div>}
    <footer className={styles.actions}>{review ? <button className={styles.primaryButton} onClick={advance}>{attempts.length === 5 ? text.finish : text.next}</button> : <button className={styles.primaryButton} disabled={!solution || opened.length < 2} onClick={lock}>{text.lock}</button>}</footer>
  </section>;
}
