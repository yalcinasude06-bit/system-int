"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, GripVertical, LockKeyhole, MousePointerClick, RotateCcw, Sparkles, Undo2, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import { buildSystemProcessRound, type PresentedSystemProcessCard, type SystemProcessTarget } from "./systemProcessContent";

type Placement = SystemProcessTarget | "pool";
type Placements = Record<string, Placement>;
type Flyer = { id: string; left: number; top: number; x: number; y: number; width: number };
type DraftPayload = { placements?: unknown; selectedCardIds?: unknown; submittedPlacements?: unknown; evaluatedPlacements?: unknown; isChecked?: unknown };

const pointsPerCard = 10;
const targets: SystemProcessTarget[] = ["is", "isNot"];

const copy = {
  tr: {
    title: "Hafta 4 · Modül 2: Sistem Süreci: Nedir, Ne Değildir?",
    instruction: "Kartı sürükle veya seç; sonra uygun alana bırak. Tüm kartlar yerleşince kontrol et.",
    pool: "Kart havuzu",
    poolHint: "Kartı seçip bir alana dokunabilir veya sürükleyebilirsin.",
    is: "NEDİR?",
    isNot: "NE DEĞİLDİR?",
    empty: "Kartı buraya bırak",
    selected: "seçildi",
    return: "Kartı havuza geri al",
    check: "Kontrol Et",
    checkHint: "Kontrol etmek için tüm 12 kartı yerleştir.",
    checking: "İlk yerleşimlerin kontrol ediliyor…",
    corrected: "Yanlış kartlar doğru alanlarına taşındı.",
    allCorrect: "Tüm kartlar ilk kontrolde doğru yerdeydi.",
    firstCheck: "İlk kontrolde doğru",
    review: "Kontrol sonrası kısa açıklamalar",
    completed: "Kart sınıflandırman kaydedildi",
    completedDetail: "Puanın yalnızca ilk kontroldeki doğru yerleşimlerden hesaplandı. Öğretmen sonuçları açıklayana kadar puanın gizli kalır.",
    partial: "Kısmi yerleşimin kaydedildi",
    partialDetail: "Öğretmen modülü sonlandırdığı için yerleştirdiğin kartlar kaydedildi.",
    locked: "Bu modül tamamlandı",
    lockedDetail: "Yanıtların kilitlendi. Öğretmen sonuçları açıklayana kadar bekleyin.",
    saving: "Yanıt kaydediliyor…",
    saveError: "Yanıt kaydedilemedi. İlerlemen korundu.",
    retry: "Kaydı tekrar dene",
  },
  en: {
    title: "Week 4 · Module 2: System Process: What It Is and Is Not",
    instruction: "Drag or select a card, then place it in the matching area. Check once all cards are placed.",
    pool: "Card pool",
    poolHint: "Select a card and tap an area, or drag it there.",
    is: "WHAT IT IS",
    isNot: "WHAT IT IS NOT",
    empty: "Drop a card here",
    selected: "selected",
    return: "Return card to the pool",
    check: "Check",
    checkHint: "Place all 12 cards before checking.",
    checking: "Checking your first placements…",
    corrected: "Incorrect cards moved to their correct areas.",
    allCorrect: "Every card was in the correct area on the first check.",
    firstCheck: "Correct on the first check",
    review: "Brief explanations after checking",
    completed: "Your card classification was saved",
    completedDetail: "Your score is calculated only from correct first placements. Your score stays hidden until the teacher reveals the results.",
    partial: "Your partial placement was saved",
    partialDetail: "The cards you placed were saved because the teacher ended the module.",
    locked: "This module is complete",
    lockedDetail: "Your answers are locked. Wait until the teacher reveals the results.",
    saving: "Saving your answer…",
    saveError: "The answer could not be saved. Your progress is preserved.",
    retry: "Try saving again",
  },
};

function emptyPlacements(cards: PresentedSystemProcessCard[]): Placements {
  return Object.fromEntries(cards.map((card) => [card.id, "pool"]));
}

function placementsFromDraft(cards: PresentedSystemProcessCard[], draft: ModuleDraft | null | undefined): Placements {
  const fallback = emptyPlacements(cards);
  const candidate = (draft?.payload as DraftPayload | undefined)?.placements;
  if (!candidate || typeof candidate !== "object") return fallback;
  for (const card of cards) {
    const value = (candidate as Record<string, unknown>)[card.id];
    if (value === "pool" || value === "is" || value === "isNot") fallback[card.id] = value;
  }
  return fallback;
}

function submittedPlacementsFromDraft(cards: PresentedSystemProcessCard[], draft: ModuleDraft | null | undefined): Placements | null {
  const payload = draft?.payload as DraftPayload | undefined;
  if (payload?.isChecked !== true) return null;
  const candidate = payload.submittedPlacements ?? payload.evaluatedPlacements;
  if (!candidate || typeof candidate !== "object") return null;
  const snapshot: Placements = {};
  for (const card of cards) {
    const value = (candidate as Record<string, unknown>)[card.id];
    if (value !== "is" && value !== "isNot") return null;
    snapshot[card.id] = value;
  }
  return snapshot;
}

function placedCount(placements: Placements) {
  return Object.values(placements).filter((placement) => placement !== "pool").length;
}

export function Week4SystemProcess({
  onSubmit,
  onDraft,
  existingSubmission,
  existingDraft,
  forceSubmit,
  seedKey,
}: LearningModuleProps & { seedKey: string }) {
  const { locale } = useI18n();
  const text = copy[locale];
  const cards = useMemo(() => buildSystemProcessRound(seedKey), [seedKey]);
  const initialPlacements = useMemo(() => placementsFromDraft(cards, existingDraft), [cards, existingDraft]);
  const initialSnapshot = useMemo(() => submittedPlacementsFromDraft(cards, existingDraft), [cards, existingDraft]);
  const [placements, setPlacements] = useState<Placements>(initialPlacements);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [checked, setChecked] = useState(Boolean(initialSnapshot));
  const [correcting, setCorrecting] = useState(false);
  const [correctionComplete, setCorrectionComplete] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [evaluationSnapshot, setEvaluationSnapshot] = useState<Placements | null>(initialSnapshot);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const placementsRef = useRef(initialPlacements);
  const snapshotRef = useRef<Placements | null>(initialSnapshot);
  const submissionStarted = useRef(false);
  const resumedCheckedDraft = useRef(false);
  const timerIds = useRef<number[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ id: string; x: number; y: number } | null>(null);
  const reduceMotion = useReducedMotion();
  const currentPlacedCount = placedCount(placements);
  const firstScore = evaluationSnapshot ? cards.filter((card) => evaluationSnapshot[card.id] === card.target).length : 0;

  const clearTimers = useCallback(() => {
    timerIds.current.forEach((timer) => window.clearTimeout(timer));
    timerIds.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const submissionFor = useCallback((nextPlacements: Placements, completionReason: "completed" | "teacher-ended" | "draft", evaluatedSnapshot?: Placements): ModuleSubmission => {
    const snapshot = evaluatedSnapshot ?? nextPlacements;
    const correctCount = cards.filter((card) => snapshot[card.id] === card.target).length;
    return {
      stage: 1,
      score: correctCount * pointsPerCard,
      payload: {
        mode: "system-process-is-or-is-not",
        selectedCardIds: cards.map((card) => card.id),
        placements: nextPlacements,
        evaluatedPlacements: evaluatedSnapshot ?? null,
        submittedPlacements: evaluatedSnapshot ?? null,
        correctedPlacements: evaluatedSnapshot && completionReason !== "draft" ? nextPlacements : null,
        isChecked: Boolean(evaluatedSnapshot),
        correctCount,
        answeredCount: placedCount(snapshot),
        cardCount: cards.length,
        pointsPerCard,
        completionReason,
      },
    };
  }, [cards]);

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true);
    setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) setSubmitFailed(true);
  }, [onSubmit]);

  const finalize = useCallback(async (snapshot: Placements, completionReason: "completed" | "teacher-ended") => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true;
    clearTimers();
    const evaluatedSnapshot = snapshotRef.current ? snapshot : completionReason === "completed" ? snapshot : undefined;
    const submission = submissionFor(placementsRef.current, completionReason, evaluatedSnapshot);
    setFinalSubmission(submission);
    setCompleted(true);
    setCorrecting(false);
    setFlyers([]);
    await submitResult(submission);
  }, [clearTimers, existingSubmission, submissionFor, submitResult]);

  useEffect(() => {
    if (forceSubmit && !completed && !existingSubmission) {
      const snapshot = snapshotRef.current ?? placementsRef.current;
      void finalize(snapshot, "teacher-ended");
    }
  }, [completed, existingSubmission, finalize, forceSubmit]);

  useEffect(() => {
    if (!initialSnapshot || resumedCheckedDraft.current || existingSubmission || forceSubmit || completed) return;
    resumedCheckedDraft.current = true;
    const corrected = { ...initialSnapshot };
    cards.forEach((card) => { corrected[card.id] = card.target; });
    placementsRef.current = corrected;
    snapshotRef.current = initialSnapshot;
    setPlacements(corrected);
    setCorrectionComplete(true);
    setAnnouncement(text.corrected);
    void finalize(initialSnapshot, "completed");
  }, [cards, completed, existingSubmission, finalize, forceSubmit, initialSnapshot, text.corrected]);

  const saveDraft = useCallback((nextPlacements: Placements) => {
    placementsRef.current = nextPlacements;
    void onDraft?.(submissionFor(nextPlacements, "draft"));
  }, [onDraft, submissionFor]);

  const move = useCallback((cardId: string, target: Placement) => {
    if (checked || completed || existingSubmission || forceSubmit) return;
    const nextPlacements = { ...placementsRef.current, [cardId]: target };
    setPlacements(nextPlacements);
    setSelectedCardId(null);
    saveDraft(nextPlacements);
  }, [checked, completed, existingSubmission, forceSubmit, saveDraft]);

  const select = useCallback((cardId: string) => {
    if (checked || completed || existingSubmission || forceSubmit) return;
    if (placements[cardId] !== "pool") {
      move(cardId, "pool");
      return;
    }
    setSelectedCardId((current) => current === cardId ? null : cardId);
  }, [checked, completed, existingSubmission, forceSubmit, move, placements]);

  const onDrop = useCallback((event: DragEvent<HTMLElement>, target: SystemProcessTarget) => {
    event.preventDefault();
    const cardId = event.dataTransfer.getData("text/plain");
    if (cardId) move(cardId, target);
  }, [move]);

  const activateZone = useCallback((target: SystemProcessTarget) => {
    if (selectedCardId) move(selectedCardId, target);
  }, [move, selectedCardId]);

  const onZoneKeyDown = useCallback((event: KeyboardEvent<HTMLElement>, target: SystemProcessTarget) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activateZone(target);
  }, [activateZone]);

  const finishCorrection = useCallback((snapshot: Placements, wrongIds: string[]) => {
    const corrected = { ...snapshot };
    cards.forEach((card) => { if (wrongIds.includes(card.id)) corrected[card.id] = card.target; });
    placementsRef.current = corrected;
    setPlacements(corrected);
    setFlyers([]);
    setCorrecting(false);
    setCorrectionComplete(true);
    setAnnouncement(text.corrected);
    const reviewTimer = window.setTimeout(() => void finalize(snapshot, "completed"), reduceMotion ? 1200 : 2200);
    timerIds.current.push(reviewTimer);
  }, [cards, finalize, reduceMotion, text.corrected]);

  const measureFlyers = useCallback((wrongIds: string[]) => {
    const boardElement = boardRef.current;
    const board = boardElement?.getBoundingClientRect();
    if (!board || !boardElement) return [];
    return wrongIds.flatMap((id) => {
      const card = cards.find((item) => item.id === id);
      const cardBox = boardElement.querySelector<HTMLElement>(`[data-system-card="${id}"]`)?.getBoundingClientRect();
      const zoneBox = card ? boardElement.querySelector<HTMLElement>(`[data-system-target="${card.target}"]`)?.getBoundingClientRect() : null;
      if (!cardBox || !zoneBox) return [];
      const left = cardBox.left - board.left;
      const top = cardBox.top - board.top;
      const targetLeft = zoneBox.left - board.left + Math.max(10, (zoneBox.width - cardBox.width) / 2);
      const targetTop = zoneBox.top - board.top + 34;
      return [{ id, left, top, x: targetLeft - left, y: targetTop - top, width: cardBox.width }];
    });
  }, [cards]);

  const check = useCallback(() => {
    if (checked || completed || currentPlacedCount !== cards.length) return;
    const snapshot = { ...placementsRef.current };
    const wrongIds = cards.filter((card) => snapshot[card.id] !== card.target).map((card) => card.id);
    snapshotRef.current = snapshot;
    setEvaluationSnapshot(snapshot);
    setChecked(true);
    setAnnouncement(text.checking);
    void onDraft?.(submissionFor(snapshot, "draft", snapshot));
    const flashDelay = reduceMotion ? 0 : 650;
    const travelDelay = reduceMotion ? 0 : 850;
    const flashTimer = window.setTimeout(() => {
      if (wrongIds.length === 0) {
        setCorrectionComplete(true);
        setAnnouncement(text.allCorrect);
        const reviewTimer = window.setTimeout(() => void finalize(snapshot, "completed"), reduceMotion ? 700 : 1200);
        timerIds.current.push(reviewTimer);
        return;
      }
      setCorrecting(true);
      setFlyers(measureFlyers(wrongIds));
      const travelTimer = window.setTimeout(() => finishCorrection(snapshot, wrongIds), travelDelay);
      timerIds.current.push(travelTimer);
    }, flashDelay);
    timerIds.current.push(flashTimer);
  }, [cards, checked, completed, currentPlacedCount, finalize, finishCorrection, measureFlyers, onDraft, reduceMotion, submissionFor, text.allCorrect, text.checking]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLButtonElement>, id: string) => {
    pointerStart.current = { id, x: event.clientX, y: event.clientY };
  }, []);

  const onPointerUp = useCallback((event: PointerEvent<HTMLButtonElement>, id: string) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || start.id !== id || Math.hypot(event.clientX - start.x, event.clientY - start.y) < 10) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-system-target]")?.dataset.systemTarget;
    if (target === "is" || target === "isNot") move(id, target);
  }, [move]);

  if (existingSubmission && !completed) {
    return <section className="panel module-shell system-process-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  }

  if (completed) {
    const snapshot = evaluationSnapshot ?? placements;
    const score = cards.filter((card) => snapshot[card.id] === card.target).length;
    const incorrectCards = evaluationSnapshot ? cards.filter((card) => evaluationSnapshot[card.id] !== card.target) : [];
    const endedByTeacher = finalSubmission?.payload.completionReason === "teacher-ended";
    return <section className="panel module-shell system-process-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><Sparkles size={42} /><h2>{endedByTeacher ? text.partial : text.completed}</h2><p>{endedByTeacher ? text.partialDetail : text.completedDetail}</p>{evaluationSnapshot && <strong>{text.firstCheck}: {score}/{cards.length}</strong>}{incorrectCards.length > 0 && <section className="system-process-review"><h3>{text.review}</h3>{incorrectCards.map((card) => <details key={card.id}><summary data-i18n-skip>{card.text[locale]}</summary><p data-i18n-skip>{card.explanation[locale]}</p></details>)}</section>}{submitting && <div className="notice">{text.saving}</div>}{submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>{text.retry}</Button></>}</div></section>;
  }

  const cardsFor = (target: Placement) => cards.filter((card) => placements[card.id] === target);
  const isWrong = (id: string) => checked && !correctionComplete && evaluationSnapshot?.[id] !== cards.find((card) => card.id === id)?.target;
  const isCorrectPlacement = (id: string) => checked && !isWrong(id);
  const reviewCards = evaluationSnapshot ? cards.filter((card) => evaluationSnapshot[card.id] !== card.target) : [];
  return <section className="panel module-shell system-process-shell">
    <div className="module-topline"><div className="module-title-chip">{text.title}</div><strong>{currentPlacedCount} / {cards.length}</strong></div>
    <p className="system-process-instruction">{text.instruction}</p>
    <div className="system-process-board" ref={boardRef}>
      <section className="system-card-pool"><div className="system-region-heading"><div><h2>{text.pool}</h2><p>{text.poolHint}</p></div><MousePointerClick size={22} aria-hidden="true" /></div><div className="system-card-list">
        {cardsFor("pool").map((card) => <button data-system-card={card.id} key={card.id} type="button" draggable={!checked} className={`system-process-card ${selectedCardId === card.id ? "selected" : ""}`} onClick={() => select(card.id)} onPointerDown={(event) => onPointerDown(event, card.id)} onPointerUp={(event) => onPointerUp(event, card.id)} onDragStart={(event) => event.dataTransfer.setData("text/plain", card.id)} aria-pressed={selectedCardId === card.id}><GripVertical size={17} aria-hidden="true" /><span data-i18n-skip>{card.text[locale]}</span>{selectedCardId === card.id && <small>{text.selected}</small>}</button>)}
        {cardsFor("pool").length === 0 && <p className="system-pool-empty">{text.checkHint}</p>}
      </div></section>
      <div className="system-process-zones">
        {targets.map((target) => <section key={target} role="region" aria-label={`${text[target]}. ${text.empty}`} className={`system-process-zone ${target} ${selectedCardId ? "ready" : ""}`} data-system-target={target} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, target)} tabIndex={0} onKeyDown={(event) => onZoneKeyDown(event, target)} onClick={() => activateZone(target)}>
          <header><span>{target === "is" ? <Check size={19} /> : <X size={19} />}</span><h2>{text[target]}</h2></header><div className="system-zone-cards">{cardsFor(target).map((card) => <button data-system-card={card.id} key={card.id} type="button" className={`system-process-card placed ${isWrong(card.id) ? "wrong-placement" : ""} ${correcting && isWrong(card.id) ? "flying-source" : ""}`} onClick={(event) => { event.stopPropagation(); select(card.id); }}><span data-i18n-skip>{card.text[locale]}</span>{isWrong(card.id) ? <X size={15} aria-hidden="true" /> : isCorrectPlacement(card.id) ? <Check size={15} aria-hidden="true" /> : <Undo2 size={15} aria-label={text.return} />}</button>)}{cardsFor(target).length === 0 && <p className="system-zone-empty">{text.empty}</p>}</div></section>)}
      </div>
      <AnimatePresence>{flyers.map((flyer) => { const card = cards.find((item) => item.id === flyer.id); return card ? <motion.div key={flyer.id} className="system-process-flyer" style={{ left: flyer.left, top: flyer.top, width: flyer.width }} initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: flyer.x, y: flyer.y, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.75, ease: "easeInOut" }} data-i18n-skip>{card.text[locale]}</motion.div> : null; })}</AnimatePresence>
    </div>
    <div className="system-process-footer"><div aria-live="polite">{announcement}{evaluationSnapshot && !completed && <strong>{text.firstCheck}: {firstScore}/{cards.length}</strong>}</div><Button icon={<Check size={18} />} disabled={currentPlacedCount !== cards.length || checked} onClick={check}>{text.check}</Button></div>
    {correctionComplete && reviewCards.length > 0 && <section className="system-process-review"><h3>{text.review}</h3>{reviewCards.map((card) => <details key={card.id}><summary data-i18n-skip>{card.text[locale]}</summary><p data-i18n-skip>{card.explanation[locale]}</p></details>)}</section>}
  </section>;
}
