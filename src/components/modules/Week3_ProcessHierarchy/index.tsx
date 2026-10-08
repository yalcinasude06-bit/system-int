"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, LockKeyhole, MousePointerClick, RotateCcw, Sparkles, Undo2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleSubmission } from "@/types";
import {
  buildProcessHierarchyRounds,
  processLayerLabels,
  processLayerOrder,
  type ProcessCard,
  type ProcessLayer,
} from "./processHierarchyContent";

type SlotMap = Record<ProcessLayer, string | null>;

type RoundResult = {
  round: number;
  hierarchyId: string;
  placements: Record<ProcessLayer, {
    cardId: string;
    actualLayer: ProcessLayer;
    expectedLayer: ProcessLayer;
    correct: boolean;
  }>;
  correctCount: number;
};

type TouchDrag = {
  cardId: string;
  text: string;
  x: number;
  y: number;
  overLayer: ProcessLayer | null;
  overDeck: boolean;
};

const emptySlots = (): SlotMap => ({ core: null, subprocess: null, activity: null });
const pointsPerPlacement = 100 / 15;

const copy = {
  tr: {
    title: "Hafta 3 · Modül 1: Süreç Hiyerarşisi",
    pyramid: "Piramit",
    trayTitle: "Karışık örnekler",
    trayHint: "Kartı sürükle veya seçip piramitteki bir yuvaya dokun.",
    trayEmpty: "Tüm kartlar piramitte. Son yerleşim değerlendiriliyor…",
    returnCard: "Seçili kartı havuza geri al",
    selected: "seçildi",
    slotEmpty: "Bu katmana kart bırak",
    success: "Harika! Üç katman da doğru.",
    error: "Yanlış katmanlar kırmızıyla gösterildi. Sıradaki piramide geçiliyor.",
    complete: "Beş piramit tamamlandı",
    partial: "Kısmi piramit turun kaydediliyor",
    completeDetail: "Yerleştirmelerin kaydedildi. Öğretmen sonuçları açıklayana kadar puanın gizli kalacak.",
    partialDetail: "Tamamladığın piramitlerdeki doğru yerleştirmelerin korunuyor.",
    locked: "Bu modül tamamlandı",
    lockedDetail: "Yanıtın kilitlendi. Öğretmen sonuçları açıklayana kadar bekleyin.",
    saving: "Yanıt kaydediliyor…",
    saveError: "Yanıt kaydedilemedi. İlerlemen korundu.",
    retry: "Kaydı tekrar dene",
  },
  en: {
    title: "Week 3 · Module 1: Process Hierarchy",
    pyramid: "Pyramid",
    trayTitle: "Mixed examples",
    trayHint: "Drag a card, or select it and tap a slot in the pyramid.",
    trayEmpty: "All cards are in the pyramid. Evaluating the last placement…",
    returnCard: "Return selected card to the pool",
    selected: "selected",
    slotEmpty: "Drop a card on this layer",
    success: "Great! All three layers are correct.",
    error: "Incorrect layers are highlighted in red. Moving to the next pyramid.",
    complete: "Five pyramids completed",
    partial: "Saving your partial pyramid round",
    completeDetail: "Your placements were saved. Your score stays hidden until the teacher reveals the results.",
    partialDetail: "Correct placements from the pyramids you completed are preserved.",
    locked: "This module is complete",
    lockedDetail: "Your answer is locked. Wait until the teacher reveals the results.",
    saving: "Saving your answer…",
    saveError: "The answer could not be saved. Your progress is preserved.",
    retry: "Try saving again",
  },
};

function cardForId(cards: ProcessCard[], cardId: string | null) {
  return cardId ? cards.find((card) => card.id === cardId) ?? null : null;
}

export function Week3ProcessHierarchy({
  onSubmit,
  onDraft,
  existingSubmission,
  forceSubmit,
  sessionId,
}: LearningModuleProps & { sessionId: string }) {
  const { locale } = useI18n();
  const text = copy[locale];
  const rounds = useMemo(() => buildProcessHierarchyRounds(sessionId), [sessionId]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [slots, setSlots] = useState<SlotMap>(emptySlots);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"active" | "success" | "error" | "complete">("active");
  const [wrongLayers, setWrongLayers] = useState<ProcessLayer[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const [touchDrag, setTouchDrag] = useState<TouchDrag | null>(null);
  const resultsRef = useRef<RoundResult[]>([]);
  const submissionStarted = useRef(false);
  const transitionTimer = useRef<number | null>(null);
  const touchStart = useRef<{ cardId: string; text: string; x: number; y: number; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);
  const currentRound = rounds[Math.min(roundIndex, rounds.length - 1)];

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true);
    setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) setSubmitFailed(true);
  }, [onSubmit]);

  const submissionForProgress = useCallback((progressResults: RoundResult[], completionReason: "completed" | "teacher-ended" | "draft", activeSlots?: SlotMap): ModuleSubmission => {
    const correctCount = progressResults.reduce((total, result) => total + result.correctCount, 0);
    return {
      stage: 1,
      score: Math.round(correctCount * pointsPerPlacement),
      payload: {
        mode: "process-hierarchy-pyramids",
        selectedHierarchyIds: rounds.map((round) => round.id),
        rounds: progressResults,
        correctCount,
        evaluatedPlacements: progressResults.length * 3,
        totalPlacements: 15,
        pointsPerPlacement,
        activeRound: activeSlots ? { round: roundIndex + 1, hierarchyId: currentRound.id, slots: activeSlots } : undefined,
        completionReason,
      },
    };
  }, [currentRound.id, roundIndex, rounds]);

  const finalize = useCallback(async (finalResults: RoundResult[], completionReason: "completed" | "teacher-ended") => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true;
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    const submission = submissionForProgress(finalResults, completionReason);
    setFinalSubmission(submission);
    setPhase("complete");
    await submitResult(submission);
  }, [existingSubmission, submissionForProgress, submitResult]);

  const advanceRound = useCallback((nextResults: RoundResult[]) => {
    if (roundIndex === rounds.length - 1) {
      void finalize(nextResults, "completed");
      return;
    }
    setRoundIndex((index) => index + 1);
    setSlots(emptySlots());
    setSelectedCardId(null);
    setWrongLayers([]);
    setAnnouncement("");
    setPhase("active");
  }, [finalize, roundIndex, rounds.length]);

  const evaluate = useCallback((nextSlots: SlotMap) => {
    const placements = Object.fromEntries(processLayerOrder.map((layer) => {
      const card = cardForId(currentRound.cards, nextSlots[layer]);
      return [layer, {
        cardId: card?.id ?? "",
        actualLayer: layer,
        expectedLayer: card?.layer ?? layer,
        correct: card?.layer === layer,
      }];
    })) as RoundResult["placements"];
    const incorrect = processLayerOrder.filter((layer) => !placements[layer].correct);
    const result: RoundResult = {
      round: roundIndex + 1,
      hierarchyId: currentRound.id,
      placements,
      correctCount: 3 - incorrect.length,
    };
    const nextResults = [...resultsRef.current, result];
    resultsRef.current = nextResults;
    void onDraft?.(submissionForProgress(nextResults, "draft", nextSlots));
    setWrongLayers(incorrect);
    setSelectedCardId(null);

    if (incorrect.length === 0) {
      setPhase("success");
      setAnnouncement(text.success);
      confetti({ particleCount: 54, spread: 66, startVelocity: 24, origin: { x: .68, y: .52 }, colors: ["#10b981", "#fbbf24", "#ffffff"] });
    } else {
      setPhase("error");
      setAnnouncement(text.error);
    }

    transitionTimer.current = window.setTimeout(() => advanceRound(nextResults), incorrect.length === 0 ? 1250 : 1750);
  }, [advanceRound, currentRound, onDraft, roundIndex, submissionForProgress, text.error, text.success]);

  const placeCard = useCallback((cardId: string, targetLayer: ProcessLayer) => {
    if (phase !== "active" || forceSubmit || existingSubmission) return;
    setSlots((current) => {
      const sourceLayer = processLayerOrder.find((layer) => current[layer] === cardId);
      if (sourceLayer === targetLayer) return current;
      const displacedCard = current[targetLayer];
      const next = { ...current };
      if (sourceLayer) next[sourceLayer] = displacedCard;
      next[targetLayer] = cardId;
      void onDraft?.(submissionForProgress(resultsRef.current, "draft", next));
      setSelectedCardId(null);
      if (processLayerOrder.every((layer) => next[layer])) window.setTimeout(() => evaluate(next), 0);
      return next;
    });
  }, [evaluate, existingSubmission, forceSubmit, onDraft, phase, submissionForProgress]);

  const returnToDeck = useCallback((cardId: string) => {
    if (phase !== "active" || forceSubmit || existingSubmission) return;
    setSlots((current) => {
      const sourceLayer = processLayerOrder.find((layer) => current[layer] === cardId);
      if (!sourceLayer) return current;
      const next = { ...current, [sourceLayer]: null };
      void onDraft?.(submissionForProgress(resultsRef.current, "draft", next));
      return next;
    });
    setSelectedCardId(null);
  }, [existingSubmission, forceSubmit, onDraft, phase, submissionForProgress]);

  useEffect(() => {
    if (!forceSubmit || phase === "complete" || existingSubmission) return;
    void finalize(resultsRef.current, "teacher-ended");
  }, [existingSubmission, finalize, forceSubmit, phase]);

  useEffect(() => () => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
  }, []);

  function selectCard(cardId: string) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (phase !== "active") return;
    setSelectedCardId((current) => current === cardId ? null : cardId);
  }

  function handleSlotKey(event: KeyboardEvent<HTMLDivElement>, layer: ProcessLayer, cardId: string | null) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (selectedCardId) placeCard(selectedCardId, layer);
    else if (cardId) selectCard(cardId);
  }

  function beginTouchDrag(event: PointerEvent<HTMLButtonElement>, card: ProcessCard) {
    if (event.pointerType === "mouse" || phase !== "active") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    touchStart.current = { cardId: card.id, text: card.text[locale], x: event.clientX, y: event.clientY, dragging: false };
  }

  function moveTouchDrag(event: PointerEvent<HTMLButtonElement>) {
    const start = touchStart.current;
    if (!start) return;
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (!start.dragging && distance < 8) return;
    start.dragging = true;
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const slot = target?.closest<HTMLElement>("[data-process-slot]");
    const deck = target?.closest<HTMLElement>("[data-process-deck]");
    setTouchDrag({
      cardId: start.cardId,
      text: start.text,
      x: event.clientX,
      y: event.clientY,
      overLayer: slot?.dataset.processSlot as ProcessLayer | undefined ?? null,
      overDeck: Boolean(deck),
    });
  }

  function endTouchDrag(event: PointerEvent<HTMLButtonElement>) {
    const start = touchStart.current;
    if (!start) return;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const layer = target?.closest<HTMLElement>("[data-process-slot]")?.dataset.processSlot as ProcessLayer | undefined;
    const overDeck = Boolean(target?.closest<HTMLElement>("[data-process-deck]"));
    if (start.dragging) {
      suppressClick.current = true;
      if (layer) placeCard(start.cardId, layer);
      else if (overDeck) returnToDeck(start.cardId);
    }
    touchStart.current = null;
    setTouchDrag(null);
  }

  function startNativeDrag(event: DragEvent<HTMLButtonElement>, cardId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/process-card", cardId);
    setSelectedCardId(cardId);
  }

  function dropOnLayer(event: DragEvent<HTMLDivElement>, layer: ProcessLayer) {
    event.preventDefault();
    const cardId = event.dataTransfer.getData("text/process-card");
    if (cardId) placeCard(cardId, layer);
  }

  function dropOnDeck(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const cardId = event.dataTransfer.getData("text/process-card");
    if (cardId) returnToDeck(cardId);
  }

  if (existingSubmission && phase !== "complete") {
    return <section className="panel module-shell hierarchy-module-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  }

  if (phase === "complete") {
    const endedByTeacher = finalSubmission?.payload?.completionReason === "teacher-ended";
    return <section className="panel module-shell hierarchy-module-shell">
      <div className="module-title-chip">{text.title}</div>
      <div className="module-complete-card"><Sparkles size={42} /><h2>{endedByTeacher ? text.partial : text.complete}</h2><p>{endedByTeacher ? text.partialDetail : text.completeDetail}</p>{submitting && <div className="notice">{text.saving}</div>}{submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>{text.retry}</Button></>}</div>
    </section>;
  }

  const placedIds = new Set(processLayerOrder.map((layer) => slots[layer]).filter(Boolean));
  const deckCards = currentRound.cards.filter((card) => !placedIds.has(card.id));
  const selectedIsPlaced = selectedCardId ? placedIds.has(selectedCardId) : false;

  const renderCard = (card: ProcessCard, location: "deck" | "slot", slotLayer?: ProcessLayer) => <button
    type="button"
    key={card.id}
    className={`hierarchy-card ${selectedCardId === card.id ? "selected" : ""}`}
    draggable={phase === "active"}
    aria-pressed={selectedCardId === card.id}
    aria-label={`${card.text[locale]}${selectedCardId === card.id ? `, ${text.selected}` : ""}`}
    onClick={(event) => {
      event.stopPropagation();
      if (slotLayer && selectedCardId && selectedCardId !== card.id) placeCard(selectedCardId, slotLayer);
      else selectCard(card.id);
    }}
    onDragStart={(event) => startNativeDrag(event, card.id)}
    onPointerDown={(event) => beginTouchDrag(event, card)}
    onPointerMove={moveTouchDrag}
    onPointerUp={endTouchDrag}
    onPointerCancel={() => { touchStart.current = null; setTouchDrag(null); }}
  >
    <GripVertical size={16} aria-hidden="true" />
    <span data-i18n-skip>{card.text[locale]}</span>
    <MousePointerClick className="hierarchy-pointer-hint" size={13} aria-hidden="true" />
    {location === "slot" && <small aria-hidden="true">↕</small>}
  </button>;

  return <section className="panel module-shell hierarchy-module-shell">
    <div className="module-topline hierarchy-topline">
      <div className="module-title-chip">{text.title}</div>
      <strong>{text.pyramid} {roundIndex + 1}/{rounds.length}</strong>
    </div>
    <div className="hierarchy-round-progress" aria-label={`${text.pyramid} ${roundIndex + 1}/${rounds.length}`}>
      {rounds.map((round, index) => <span key={round.id} className={index < roundIndex ? "done" : index === roundIndex ? "active" : ""} />)}
    </div>

    <AnimatePresence mode="wait">
      <motion.div
        key={currentRound.id}
        className={`hierarchy-game-layout ${phase}`}
        initial={{ opacity: 0, y: 18 }}
        animate={phase === "error" ? { opacity: 1, x: [0, -10, 9, -7, 5, 0] } : { opacity: 1, y: 0, scale: phase === "success" ? [1, 1.015, 1] : 1 }}
        exit={{ opacity: 0, scale: .94, y: -16 }}
        transition={{ duration: phase === "error" ? .48 : .34 }}
      >
        <div
          className={`hierarchy-deck ${touchDrag?.overDeck ? "drag-over" : ""}`}
          data-process-deck
          onDragOver={(event) => event.preventDefault()}
          onDrop={dropOnDeck}
        >
          <div className="hierarchy-deck-heading"><div><strong>{text.trayTitle}</strong><small>{text.trayHint}</small></div>{selectedIsPlaced && <button type="button" onClick={() => selectedCardId && returnToDeck(selectedCardId)}><Undo2 size={15} />{text.returnCard}</button>}</div>
          <div className="hierarchy-card-list">{deckCards.length ? deckCards.map((card) => renderCard(card, "deck")) : <p>{text.trayEmpty}</p>}</div>
        </div>

        <div className={`hierarchy-pyramid ${phase === "success" ? "is-success" : ""} ${phase === "error" ? "is-error" : ""}`}>
          {processLayerOrder.map((layer) => {
            const card = cardForId(currentRound.cards, slots[layer]);
            const wrong = wrongLayers.includes(layer);
            return <div
              key={layer}
              role="button"
              tabIndex={phase === "active" ? 0 : -1}
              data-process-slot={layer}
              className={`hierarchy-layer hierarchy-layer-${layer} ${card ? "filled" : ""} ${selectedCardId ? "can-drop" : ""} ${touchDrag?.overLayer === layer ? "drag-over" : ""} ${wrong ? "wrong" : ""}`}
              aria-label={`${processLayerLabels[layer][locale]}: ${card?.text[locale] ?? text.slotEmpty}`}
              onClick={() => selectedCardId ? placeCard(selectedCardId, layer) : card && selectCard(card.id)}
              onKeyDown={(event) => handleSlotKey(event, layer, card?.id ?? null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => dropOnLayer(event, layer)}
            >
              <strong data-i18n-skip>{processLayerLabels[layer][locale]}</strong>
              <div className="hierarchy-slot">{card ? renderCard(card, "slot", layer) : <><span>{text.slotEmpty}</span><MousePointerClick className="hierarchy-slot-pointer-hint" size={16} aria-hidden="true" /></>}</div>
              {wrong && <i aria-hidden="true">✕</i>}
            </div>;
          })}
        </div>
      </motion.div>
    </AnimatePresence>

    <div className={`hierarchy-announcement ${phase}`} aria-live="assertive">{announcement || text.trayHint}</div>
    {touchDrag && <div className="hierarchy-touch-card" style={{ transform: `translate3d(${touchDrag.x}px, ${touchDrag.y}px, 0)` }} data-i18n-skip>{touchDrag.text}</div>}
  </section>;
}
