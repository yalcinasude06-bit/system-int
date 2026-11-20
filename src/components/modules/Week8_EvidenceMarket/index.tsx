"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, Coins, FileSearch, FolderOpen, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import styles from "../week8Games.module.css";
import { evidenceCases } from "./evidenceMarketContent";
import { EVIDENCE_MARKET_GAME_ID, scoreEvidenceAttempt, scoreEvidenceAttempts, type EvidenceAttempt } from "./evidenceMarketEngine";

type DraftPayload = { gameId?: unknown; attempts?: unknown; currentOpened?: unknown; currentSolution?: unknown };

type EvidenceVisualKind = "bars" | "route" | "schedule" | "checklist" | "distribution" | "network" | "timeline" | "matrix" | "document";

function evidenceVisualKind(id: string): EvidenceVisualKind {
  if (/density|complaints|overtime/.test(id)) return id === "complaints" ? "distribution" : "bars";
  if (/route/.test(id)) return "route";
  if (/shift|meetings/.test(id)) return "schedule";
  if (/training|skills/.test(id)) return "matrix";
  if (/dependency|versions|manual/.test(id)) return "network";
  if (/timeline|variance|pilot/.test(id)) return "timeline";
  if (/maintenance|quality|observation/.test(id)) return "checklist";
  return "document";
}

function EvidenceVisual({ id }: { id: string }) {
  const kind = evidenceVisualKind(id);
  return <svg className={styles.evidenceVisual} viewBox="0 0 120 72" aria-hidden="true">
    <rect x="4" y="4" width="112" height="64" rx="10" fill="#f8fbff" stroke="#cbdbea" />
    {kind === "bars" && <><path d="M19 57V43h14v14M40 57V28h14v29M61 57V36h14v21M82 57V19h14v38" fill="#72a4dc" /><path d="M16 58h86" stroke="#7990a8" strokeWidth="2" /></>}
    {kind === "distribution" && <><circle cx="44" cy="36" r="20" fill="none" stroke="#d6e4ef" strokeWidth="10" /><path d="M44 16a20 20 0 0 1 18 29" fill="none" stroke="#ef8e75" strokeWidth="10" /><rect x="75" y="20" width="25" height="5" rx="2.5" fill="#ef8e75" /><rect x="75" y="33" width="19" height="5" rx="2.5" fill="#72a4dc" /><rect x="75" y="46" width="12" height="5" rx="2.5" fill="#68b99a" /></>}
    {kind === "route" && <><path d="M20 52c15-33 23 6 40-23s27 24 42-8" fill="none" stroke="#75a5dc" strokeWidth="7" strokeLinecap="round" strokeDasharray="4 5" /><circle cx="20" cy="52" r="6" fill="#68b99a" /><circle cx="102" cy="21" r="6" fill="#ef9b64" /><circle cx="60" cy="29" r="12" fill="#f5cb63" opacity=".5" /></>}
    {kind === "schedule" && <><path d="M19 20h82v38H19zM19 32h82M19 45h82M40 20v38M61 20v38M82 20v38" fill="none" stroke="#9fb3c7" strokeWidth="2" /><rect x="42" y="34" width="17" height="9" rx="2" fill="#67b99a" /><rect x="63" y="47" width="17" height="9" rx="2" fill="#efb15b" /><rect x="84" y="22" width="15" height="8" rx="2" fill="#6f9fda" /></>}
    {kind === "matrix" && <><path d="M18 18h84v40H18zM18 31h84M18 44h84M39 18v40M60 18v40M81 18v40" fill="none" stroke="#a9bbc9" strokeWidth="2" /><path d="m43 37 4 4 8-9m28 12 4 4 8-9m-32-14 4 4 8-9" fill="none" stroke="#52a984" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></>}
    {kind === "network" && <><path d="M28 36h28m12 0h25M62 31 45 18m17 23-17 14" stroke="#7c9fc4" strokeWidth="3" /><circle cx="25" cy="36" r="10" fill="#75a5dc" /><circle cx="62" cy="36" r="11" fill="#f0bd67" /><circle cx="98" cy="36" r="10" fill="#67b99a" /><circle cx="42" cy="16" r="7" fill="#d7a2c5" /><circle cx="42" cy="57" r="7" fill="#ef987b" /></>}
    {kind === "timeline" && <><path d="M17 40h87" stroke="#91a8bc" strokeWidth="3" /><circle cx="25" cy="40" r="7" fill="#67b99a" /><circle cx="50" cy="40" r="7" fill="#75a5dc" /><circle cx="76" cy="40" r="7" fill="#f0bd67" /><circle cx="101" cy="40" r="7" fill="#ef8e75" /><path d="M25 23v10m25-3v3m26-15v15m25-7v7" stroke="#879bad" strokeWidth="3" strokeLinecap="round" /></>}
    {kind === "checklist" && <><path d="m24 23 5 5 9-11m-14 22 5 5 9-11m-14 22 5 5 9-11" fill="none" stroke="#55a987" strokeWidth="3" strokeLinecap="round" /><path d="M46 23h49M46 39h38M46 55h45" stroke="#8ca5bc" strokeWidth="5" strokeLinecap="round" /></>}
    {kind === "document" && <><path d="M31 16h58v43H31z" fill="#fff" stroke="#9eb3c6" strokeWidth="2" /><path d="M42 28h36M42 38h31M42 48h22" stroke="#76a2ce" strokeWidth="4" strokeLinecap="round" /><circle cx="85" cy="54" r="9" fill="#f1bd5f" /></>}
  </svg>;
}

const copy = {
  tr: { title: "8. HAFTA · MODÜL 2", case: "Vaka", score: "Puan", credit: "Kalan Kredi", instruction: "Dosyaları incele, kanıtlarla karar ver.", goal: "HEDEF", market: "Kanıt Dosyaları", desk: "Masamdaki Kanıtlar", solution: "Çözüm Seç", open: "İncele", lock: "Çözümü Kilitle", next: "Sonraki Vaka", finish: "Pazarı Tamamla", required: "İlgili kanıt", extra: "Ekstra harcama", best: "Karar sonucu", chooseTwo: "Karar vermek için en az 2 kanıt aç.", locked: "Bu pazar turundaki yanıtların kilitli.", complete: "Kanıt pazarı tamamlandı", partial: "Kısmi araştırman kaydedildi", saving: "Sonuç kaydediliyor…", failed: "Sonuç kaydedilemedi. İlerlemen korundu.", retry: "Tekrar kaydet", decide: "Çözüm Seç", back: "Kanıtlara Dön", noCredit: "Bu dosya için yeterli kredin yok.", approved: "ONAY", unsuitable: "UYGUN DEĞİL" },
  en: { title: "WEEK 8 · MODULE 2", case: "Case", score: "Score", credit: "Credit Left", instruction: "Inspect the files and decide from the evidence.", goal: "GOAL", market: "Evidence Files", desk: "Evidence on My Desk", solution: "Choose a Solution", open: "Inspect", lock: "Lock Solution", next: "Next Case", finish: "Complete Market", required: "Relevant evidence", extra: "Extra spending", best: "Decision result", chooseTwo: "Open at least 2 evidence files to decide.", locked: "Your answers for this market round are locked.", complete: "Evidence market complete", partial: "Your partial research was saved", saving: "Saving result…", failed: "Result could not be saved. Your progress is preserved.", retry: "Save again", decide: "Choose Solution", back: "Back to Evidence", noCredit: "You do not have enough credit for this file.", approved: "APPROVED", unsuitable: "NOT SUITABLE" },
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
  const [phase, setPhase] = useState<"inspect" | "decide">("inspect");
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(restored.opened.at(-1) ?? null);
  const [creditWarning, setCreditWarning] = useState(false);
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
    const card = current.evidence.find((item) => item.id === id); if (!card || review || finalizing || forceSubmit) return;
    setSelectedEvidence(id); setCreditWarning(false);
    if (opened.includes(id)) return;
    if (card.cost > credit) { setCreditWarning(true); return; }
    const next = [...opened, id]; openedRef.current = next; setOpened(next); saveDraft(next, solution);
  };
  const choose = (id: string) => { if (opened.length < 2 || review || finalizing || forceSubmit) return; setSolution(id); saveDraft(openedRef.current, id); };
  const lock = () => { if (!solution || opened.length < 2 || review || finalizing) return; const attempt = { caseId: current.id, opened: [...opened], solutionId: solution }; const next = [...attemptsRef.current, attempt]; attemptsRef.current = next; setAttempts(next); setReview(attempt); void onDraft?.(submissionFor(next, "draft", [], null)); };
  const advance = () => { if (!review || finalizing) return; if (attemptsRef.current.length >= evidenceCases.length) { finalize(attemptsRef.current, "completed"); return; } openedRef.current = []; setOpened([]); setSolution(null); setSelectedEvidence(null); setCreditWarning(false); setPhase("inspect"); setReview(null); };

  useEffect(() => { if (forceSubmit && !finalizing && !existingSubmission) finalize(attemptsRef.current, "teacher-ended"); }, [existingSubmission, finalizing, finalize, forceSubmit]);
  useEffect(() => { if (restored.attempts.length === evidenceCases.length && !existingSubmission) finalize(restored.attempts, "completed"); }, [existingSubmission, finalize, restored.attempts]);

  if (existingSubmission) return <section className={`${styles.shell} ${styles.centered}`}><LockKeyhole size={44} /><h2>{text.locked}</h2></section>;
  if (finalizing) return <section className={`${styles.shell} ${styles.centered}`}><Sparkles size={46} /><h2>{attempts.length === evidenceCases.length ? text.complete : text.partial}</h2><p>{submitting ? text.saving : failed ? text.failed : ""}</p>{failed && finalSubmission && <button className={styles.secondaryButton} onClick={() => void send(finalSubmission)}><RotateCcw size={17} />{text.retry}</button>}</section>;
  const roundPoints = review ? scoreEvidenceAttempt(review, index) : 0;
  const selectedCard = current.evidence.find((item) => item.id === selectedEvidence) ?? null;
  const decisionCorrect = Boolean(review && review.solutionId === current.correct);

  return <section className={`${styles.shell} ${styles.marketShell}`} data-week8-game="evidence-market">
    <header className={styles.header}><b>{text.title}</b><span>{text.case} <strong>{index + 1}/5</strong></span><span>{text.credit} <strong>{credit}</strong></span><span>{text.score} <strong>{score}</strong></span></header>
    <div className={styles.progress}>{evidenceCases.map((item, itemIndex) => <i key={item.id} className={itemIndex < attempts.length ? styles.done : itemIndex === index ? styles.active : ""} />)}</div>
    <div className={styles.caseBrief}><div><small>{current.title[locale]}</small><h1>{current.situation[locale]}</h1></div><span><b>{text.goal}</b>{current.target[locale]}</span></div>
    <p className={styles.instruction}><Coins size={19} />{text.instruction}</p>
    <div className={`${styles.researchDesk} ${phase === "decide" || review ? styles.decisionPhase : ""}`}>
      <section className={styles.fileShelf} aria-label={text.market}>
        <h2><FileSearch />{text.market}</h2>
        <div className={styles.evidenceGrid}>{current.evidence.map((card, cardIndex) => {
          const isOpen = opened.includes(card.id); const required = Boolean(review && current.required.includes(card.id)); const selected = selectedEvidence === card.id;
          return <motion.button layout key={card.id} type="button" className={`${styles.evidenceCard} ${isOpen ? styles.open : ""} ${required ? styles.required : ""} ${selected ? styles.selectedEvidence : ""} ${card.cost > credit && !isOpen ? styles.unaffordable : ""}`} disabled={Boolean(review)} onClick={() => openEvidence(card.id)} whileTap={{ scale: .97 }} aria-pressed={selected}>
            <span className={styles.folderTab}>{cardIndex + 1}</span><span className={styles.price}>{card.cost} ◉</span>
            <motion.span className={styles.folderCover} animate={isOpen && !reduceMotion ? { rotateX: [0, -72, 0], y: [0, 5, 0] } : undefined} transition={{ duration: .55 }}><FolderOpen /><strong>{card.title[locale]}</strong><small>{isOpen ? text.open : locale === "tr" ? "DOSYA" : "FILE"}</small></motion.span>
            {isOpen && <Check className={styles.openCheck} />}
          </motion.button>;
        })}</div>
      </section>

      <AnimatePresence mode="wait">
        {phase === "inspect" && !review ? <motion.aside key="preview" className={styles.reportPreview} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
          {selectedCard && opened.includes(selectedCard.id) ? <><div className={styles.reportHeading}><span>{selectedCard.title[locale]}</span><b>{current.title[locale]}</b></div><EvidenceVisual id={selectedCard.id} /><p>{selectedCard.detail[locale]}</p></> : <><FileSearch size={34} /><strong>{text.instruction}</strong><small>{creditWarning ? text.noCredit : text.chooseTwo}</small></>}
        </motion.aside> : <motion.section key="decision" className={styles.decisionBoard} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
          <div className={styles.desk}><h2>{text.desk}</h2><div>{opened.map((id) => { const card = current.evidence.find((item) => item.id === id)!; return <button type="button" key={id} className={review && current.required.includes(id) ? styles.relevantChip : ""} disabled={Boolean(review)} onClick={() => { setSelectedEvidence(id); setPhase("inspect"); }}><Check />{card.title[locale]}</button>; })}</div></div>
          <div className={styles.solutions}><h2>{text.solution}</h2><div>{current.solutions.map((item) => <motion.button type="button" key={item.id} disabled={Boolean(review)} className={`${solution === item.id ? styles.selected : ""} ${review && item.id === current.correct ? styles.correct : ""} ${review && solution === item.id && item.id !== current.correct ? styles.wrong : ""}`} onClick={() => choose(item.id)} animate={review && solution === item.id && item.id !== current.correct && !reduceMotion ? { x: [0, -3, 3, 0] } : undefined}>{item.text[locale]}{review && solution === item.id && <motion.span className={`${styles.decisionStamp} ${decisionCorrect ? styles.approvedStamp : styles.rejectedStamp}`} initial={{ opacity: 0, scale: 1.6, rotate: -12 }} animate={{ opacity: 1, scale: 1, rotate: -6 }} transition={{ delay: reduceMotion ? 0 : .35 }}>{decisionCorrect ? text.approved : text.unsuitable}</motion.span>}</motion.button>)}</div></div>
        </motion.section>}
      </AnimatePresence>
    </div>
    {review && <motion.div className={`${styles.result} ${decisionCorrect ? styles.success : ""}`} initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}><span>{decisionCorrect ? <Check /> : "◌"}</span><div><strong>{text.best} · +{roundPoints}/20</strong><p>{current.learning[locale]}</p></div></motion.div>}
    <footer className={styles.actions}>
      {!review && phase === "decide" && <button className={styles.secondaryButton} onClick={() => setPhase("inspect")}><ArrowLeft size={17} />{text.back}</button>}
      {review ? <button className={styles.primaryButton} onClick={advance}>{attempts.length === 5 ? text.finish : text.next}</button> : phase === "inspect" ? <button className={styles.primaryButton} disabled={opened.length < 2} onClick={() => setPhase("decide")}>{text.decide}</button> : <button className={styles.primaryButton} disabled={!solution} onClick={lock}>{text.lock}</button>}
    </footer>
  </section>;
}
