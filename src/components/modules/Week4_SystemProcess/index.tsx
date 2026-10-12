"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, GripVertical, LockKeyhole, MousePointerClick, RotateCcw, Sparkles, Trash2, Undo2, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import { buildSystemProcessRound, type PresentedSystemProcessCard, type SystemProcessTarget } from "./systemProcessContent";

type Placement = SystemProcessTarget | "pool";
type Placements = Record<string, Placement>;
type Flyer = { id: string; left: number; top: number; x: number; y: number; width: number };
type PointerCandidate = { id: string; pointerId: number; startX: number; startY: number; left: number; top: number; width: number };
type PointerFlyer = Flyer;
type DraftPayload = { placements?: unknown; submittedPlacements?: unknown; evaluatedPlacements?: unknown; isChecked?: unknown };

const pointsPerCard = 10;
const targets: SystemProcessTarget[] = ["is", "isNot"];

const copy = {
  tr: {
    title: "Hafta 4 · Modül 3: Sistem Nedir, Ne Değildir?",
    instruction: "Sistem düşüncesine uygun ifadeleri ayır.",
    interactionHint: "Kartı sürükle veya seç; sonra doğru hedefe dokun.",
    pool: "Kartlar",
    poolHint: "Kartları doğru alana sürükle.",
    is: "SİSTEMDİR",
    isNot: "UYGUN DEĞİL",
    empty: "Kartı buraya bırak",
    selected: "seçildi",
    return: "Kartı havuza geri al",
    placed: "kart yerleştirildi",
    check: "Kontrol Et",
    checkHint: "Kontrol etmek için tüm 6 kartı yerleştir.",
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
    title: "Week 4 · Module 3: What Is and Is Not a System?",
    instruction: "Separate the statements that align with systems thinking.",
    interactionHint: "Drag or select a card, then tap the correct target.",
    pool: "Cards",
    poolHint: "Drag the cards to the correct area.",
    is: "SYSTEM",
    isNot: "NOT SUITABLE",
    empty: "Drop a card here",
    selected: "selected",
    return: "Return card to the pool",
    placed: "cards placed",
    check: "Check",
    checkHint: "Place all 6 cards before checking.",
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
} as const;

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
  const [pointerFlyer, setPointerFlyer] = useState<PointerFlyer | null>(null);
  const [swallowFlyer, setSwallowFlyer] = useState<Flyer | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<SystemProcessTarget | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [settlingCardId, setSettlingCardId] = useState<string | null>(null);
  const [evaluationSnapshot, setEvaluationSnapshot] = useState<Placements | null>(initialSnapshot);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const placementsRef = useRef(initialPlacements);
  const snapshotRef = useRef<Placements | null>(initialSnapshot);
  const submissionStarted = useRef(false);
  const resumedCheckedDraft = useRef(false);
  const checkStarted = useRef(Boolean(initialSnapshot));
  const timerIds = useRef<number[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const pointerCandidate = useRef<PointerCandidate | null>(null);
  const suppressClick = useRef(false);
  const trashBusy = useRef(false);
  const pendingTrashCard = useRef<string | null>(null);
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
    setPointerFlyer(null);
    setSwallowFlyer(null);
    await submitResult(submission);
  }, [clearTimers, existingSubmission, submissionFor, submitResult]);

  useEffect(() => {
    if (!forceSubmit || completed || existingSubmission) return;
    if (pendingTrashCard.current) {
      placementsRef.current = { ...placementsRef.current, [pendingTrashCard.current]: "isNot" };
      pendingTrashCard.current = null;
    }
    const snapshot = snapshotRef.current ?? placementsRef.current;
    void finalize(snapshot, "teacher-ended");
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

  const commitMove = useCallback((cardId: string, target: Placement) => {
    if (checked || completed || existingSubmission || forceSubmit) return;
    const nextPlacements = { ...placementsRef.current, [cardId]: target };
    setPlacements(nextPlacements);
    setSelectedCardId(null);
    setDragOverTarget(null);
    if (target !== "pool") {
      setSettlingCardId(cardId);
      const settleTimer = window.setTimeout(() => setSettlingCardId(null), reduceMotion ? 0 : 280);
      timerIds.current.push(settleTimer);
    }
    saveDraft(nextPlacements);
  }, [checked, completed, existingSubmission, forceSubmit, reduceMotion, saveDraft]);

  const swallowIntoTrash = useCallback((cardId: string) => {
    if (trashBusy.current || checked || completed || existingSubmission || forceSubmit) return;
    const board = boardRef.current?.getBoundingClientRect();
    const cardBox = boardRef.current?.querySelector<HTMLElement>(`[data-system-card="${cardId}"]`)?.getBoundingClientRect();
    const mouth = boardRef.current?.querySelector<HTMLElement>("[data-system-trash-mouth]")?.getBoundingClientRect();
    if (reduceMotion || !board || !cardBox || !mouth) {
      commitMove(cardId, "isNot");
      return;
    }
    trashBusy.current = true;
    pendingTrashCard.current = cardId;
    setSelectedCardId(null);
    setTrashOpen(true);
    setSwallowFlyer({
      id: cardId,
      left: cardBox.left - board.left,
      top: cardBox.top - board.top,
      width: cardBox.width,
      x: mouth.left - cardBox.left + (mouth.width - cardBox.width) / 2,
      y: mouth.top - cardBox.top + mouth.height / 2,
    });
    const swallowTimer = window.setTimeout(() => {
      commitMove(cardId, "isNot");
      pendingTrashCard.current = null;
      trashBusy.current = false;
      setSwallowFlyer(null);
      setTrashOpen(false);
    }, 520);
    timerIds.current.push(swallowTimer);
  }, [checked, commitMove, completed, existingSubmission, forceSubmit, reduceMotion]);

  const placeCard = useCallback((cardId: string, target: SystemProcessTarget) => {
    if (target === "isNot") swallowIntoTrash(cardId);
    else commitMove(cardId, target);
  }, [commitMove, swallowIntoTrash]);

  const select = useCallback((cardId: string) => {
    if (checked || completed || existingSubmission || forceSubmit || trashBusy.current) return;
    if (placements[cardId] !== "pool") {
      commitMove(cardId, "pool");
      return;
    }
    setSelectedCardId((current) => current === cardId ? null : cardId);
  }, [checked, commitMove, completed, existingSubmission, forceSubmit, placements]);

  const activateZone = useCallback((target: SystemProcessTarget) => {
    if (selectedCardId) placeCard(selectedCardId, target);
  }, [placeCard, selectedCardId]);

  const onZoneKeyDown = useCallback((event: KeyboardEvent<HTMLElement>, target: SystemProcessTarget) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activateZone(target);
  }, [activateZone]);

  const targetAt = useCallback((x: number, y: number) => {
    const value = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-system-target]")?.dataset.systemTarget;
    return value === "is" || value === "isNot" ? value : null;
  }, []);

  const onPointerDown = useCallback((event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (trashBusy.current || checked) return;
    const board = boardRef.current?.getBoundingClientRect();
    const card = event.currentTarget.getBoundingClientRect();
    if (!board) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerCandidate.current = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: card.left - board.left,
      top: card.top - board.top,
      width: card.width,
    };
  }, [checked]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const candidate = pointerCandidate.current;
    if (!candidate || candidate.pointerId !== event.pointerId) return;
    const x = event.clientX - candidate.startX;
    const y = event.clientY - candidate.startY;
    if (Math.hypot(x, y) < 7) return;
    event.preventDefault();
    setPointerFlyer({ id: candidate.id, left: candidate.left, top: candidate.top, width: candidate.width, x, y });
    setDragOverTarget(targetAt(event.clientX, event.clientY));
  }, [targetAt]);

  const finishPointer = useCallback((event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const candidate = pointerCandidate.current;
    if (!candidate || candidate.pointerId !== event.pointerId) return;
    const moved = Math.hypot(event.clientX - candidate.startX, event.clientY - candidate.startY) >= 7;
    pointerCandidate.current = null;
    setPointerFlyer(null);
    setDragOverTarget(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!moved || cancelled) return;
    suppressClick.current = true;
    const target = targetAt(event.clientX, event.clientY);
    if (target) placeCard(candidate.id, target);
  }, [placeCard, targetAt]);

  const finishCorrection = useCallback((snapshot: Placements, wrongIds: string[]) => {
    const corrected = { ...snapshot };
    cards.forEach((card) => { if (wrongIds.includes(card.id)) corrected[card.id] = card.target; });
    placementsRef.current = corrected;
    setPlacements(corrected);
    setFlyers([]);
    setCorrecting(false);
    setTrashOpen(false);
    setCorrectionComplete(true);
    setAnnouncement(text.corrected);
    const reviewTimer = window.setTimeout(() => void finalize(snapshot, "completed"), reduceMotion ? 900 : 1900);
    timerIds.current.push(reviewTimer);
  }, [cards, finalize, reduceMotion, text.corrected]);

  const measureFlyers = useCallback((wrongIds: string[]) => {
    const boardElement = boardRef.current;
    const board = boardElement?.getBoundingClientRect();
    if (!board || !boardElement) return [];
    return wrongIds.flatMap((id) => {
      const card = cards.find((item) => item.id === id);
      const cardBox = boardElement.querySelector<HTMLElement>(`[data-system-card="${id}"]`)?.getBoundingClientRect();
      const targetElement = card?.target === "isNot"
        ? boardElement.querySelector<HTMLElement>("[data-system-trash-mouth]")
        : boardElement.querySelector<HTMLElement>(`[data-system-target="${card?.target}"]`);
      const targetBox = targetElement?.getBoundingClientRect();
      if (!cardBox || !targetBox) return [];
      const left = cardBox.left - board.left;
      const top = cardBox.top - board.top;
      const targetLeft = targetBox.left - board.left + Math.max(8, (targetBox.width - cardBox.width) / 2);
      const targetTop = targetBox.top - board.top + (card?.target === "isNot" ? targetBox.height / 2 : 54);
      return [{ id, left, top, x: targetLeft - left, y: targetTop - top, width: cardBox.width }];
    });
  }, [cards]);

  const check = useCallback(() => {
    if (checkStarted.current || completed || currentPlacedCount !== cards.length || trashBusy.current) return;
    checkStarted.current = true;
    const snapshot = { ...placementsRef.current };
    const wrongIds = cards.filter((card) => snapshot[card.id] !== card.target).map((card) => card.id);
    snapshotRef.current = snapshot;
    setEvaluationSnapshot(snapshot);
    setChecked(true);
    setSelectedCardId(null);
    setAnnouncement(text.checking);
    void onDraft?.(submissionFor(snapshot, "draft", snapshot));
    const flashDelay = reduceMotion ? 0 : 650;
    const travelDelay = reduceMotion ? 0 : 760;
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
      setTrashOpen(wrongIds.some((id) => cards.find((card) => card.id === id)?.target === "isNot"));
      const travelTimer = window.setTimeout(() => finishCorrection(snapshot, wrongIds), travelDelay);
      timerIds.current.push(travelTimer);
    }, flashDelay);
    timerIds.current.push(flashTimer);
  }, [cards, completed, currentPlacedCount, finalize, finishCorrection, measureFlyers, onDraft, reduceMotion, submissionFor, text.allCorrect, text.checking]);

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
  const trashCount = cardsFor("isNot").length;

  return <section className="panel module-shell system-process-shell">
    <div className="module-topline"><div className="module-title-chip">{text.title}</div><strong>{currentPlacedCount} / {cards.length}</strong></div>
    <div className="system-process-copy"><p>{text.instruction}</p><span>{text.interactionHint}</span></div>
    <div className="system-process-board" ref={boardRef}>
      <div className="system-process-zones">
        {targets.map((target) => <section
          key={target}
          role="region"
          aria-label={`${text[target]}. ${text.empty}`}
          className={`system-process-zone ${target} ${selectedCardId ? "ready" : ""} ${dragOverTarget === target ? "drag-over" : ""}`}
          data-system-target={target}
          tabIndex={0}
          onKeyDown={(event) => onZoneKeyDown(event, target)}
          onClick={() => activateZone(target)}
        >
          <header><span>{target === "is" ? <Check size={20} /> : <Trash2 size={20} />}</span><div><h2>{text[target]}</h2><small>{cardsFor(target).length} {text.placed}</small></div></header>
          {target === "is"
            ? <div className="system-accept-visual" aria-hidden="true"><Check size={34} /><span>{text.is}</span></div>
            : <div className={`system-trash ${trashOpen ? "open" : ""}`} aria-hidden="true"><div className="system-trash-lid" data-system-trash-mouth><i /></div><div className="system-trash-body"><Trash2 size={42} /><b>{trashCount}</b></div></div>}
          <div className="system-zone-cards">
            {cardsFor(target).map((card) => <button
              data-system-card={card.id}
              key={card.id}
              type="button"
              className={`system-process-card placed ${settlingCardId === card.id ? "settling" : ""} ${isWrong(card.id) ? "wrong-placement" : ""} ${correcting && isWrong(card.id) ? "flying-source" : ""}`}
              onClick={(event) => { event.stopPropagation(); select(card.id); }}
            ><span data-i18n-skip>{card.text[locale]}</span>{isWrong(card.id) ? <X size={15} aria-hidden="true" /> : isCorrectPlacement(card.id) ? <Check size={15} aria-hidden="true" /> : <Undo2 size={15} aria-label={text.return} />}</button>)}
            {cardsFor(target).length === 0 && <p className="system-zone-empty">{text.empty}</p>}
          </div>
        </section>)}
      </div>
      <section className="system-card-pool">
        <div className="system-region-heading"><div><h2>{text.pool}</h2><p>{text.poolHint}</p></div><MousePointerClick size={22} aria-hidden="true" /></div>
        <div className="system-card-list">
          {cardsFor("pool").map((card) => <button
            data-system-card={card.id}
            key={card.id}
            type="button"
            className={`system-process-card ${selectedCardId === card.id ? "selected" : ""} ${pointerFlyer?.id === card.id || swallowFlyer?.id === card.id ? "dragging-source" : ""}`}
            onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } select(card.id); }}
            onPointerDown={(event) => onPointerDown(event, card.id)}
            onPointerMove={onPointerMove}
            onPointerUp={(event) => finishPointer(event)}
            onPointerCancel={(event) => finishPointer(event, true)}
            aria-pressed={selectedCardId === card.id}
          ><GripVertical size={17} aria-hidden="true" /><span data-i18n-skip>{card.text[locale]}</span>{selectedCardId === card.id && <small>{text.selected}</small>}</button>)}
          {cardsFor("pool").length === 0 && <p className="system-pool-empty">{text.checkHint}</p>}
        </div>
      </section>
      {pointerFlyer && <div className="system-process-pointer-flyer" style={{ left: pointerFlyer.left, top: pointerFlyer.top, width: pointerFlyer.width, transform: `translate3d(${pointerFlyer.x}px,${pointerFlyer.y}px,0)` }} data-i18n-skip>{cards.find((card) => card.id === pointerFlyer.id)?.text[locale]}</div>}
      <AnimatePresence>{swallowFlyer && <motion.div key={swallowFlyer.id} className="system-process-flyer trash-flight" style={{ left: swallowFlyer.left, top: swallowFlyer.top, width: swallowFlyer.width }} initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: swallowFlyer.x, y: swallowFlyer.y, opacity: .2, scale: .24 }} exit={{ opacity: 0 }} transition={{ duration: .48, ease: "easeIn" }} data-i18n-skip>{cards.find((card) => card.id === swallowFlyer.id)?.text[locale]}</motion.div>}</AnimatePresence>
      <AnimatePresence>{flyers.map((flyer) => { const card = cards.find((item) => item.id === flyer.id); return card ? <motion.div key={flyer.id} className={`system-process-flyer ${card.target === "isNot" ? "trash-flight" : ""}`} style={{ left: flyer.left, top: flyer.top, width: flyer.width }} initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: flyer.x, y: flyer.y, opacity: card.target === "isNot" ? .15 : 1, scale: card.target === "isNot" ? .25 : 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .72, ease: "easeInOut" }} data-i18n-skip>{card.text[locale]}</motion.div> : null; })}</AnimatePresence>
    </div>
    <div className="system-process-footer"><div aria-live="polite">{announcement || (currentPlacedCount < cards.length ? text.checkHint : "")}{evaluationSnapshot && !completed && <strong>{text.firstCheck}: {firstScore}/{cards.length}</strong>}</div><Button icon={<Check size={18} />} disabled={currentPlacedCount !== cards.length || checked || Boolean(swallowFlyer)} onClick={check}>{text.check}</Button></div>
    {correctionComplete && reviewCards.length > 0 && <section className="system-process-review"><h3>{text.review}</h3>{reviewCards.map((card) => <details key={card.id}><summary data-i18n-skip>{card.text[locale]}</summary><p data-i18n-skip>{card.explanation[locale]}</p></details>)}</section>}
  </section>;
}
