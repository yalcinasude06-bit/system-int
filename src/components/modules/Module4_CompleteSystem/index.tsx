"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, LockKeyhole, RotateCcw, Unlink, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import { ANSWER_REVIEW_MARK_MS, ANSWER_REVIEW_TOTAL_MS, MATCHING_ROUND_ONE_REVIEW_MS, currentReviewTimestamp, evaluatePlacementSnapshot, remainingReviewTime, type AnswerReviewPhase } from "@/lib/answerReview";
import { useAnswerReviewTimer } from "@/lib/useAnswerReviewTimer";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import { SystemTypeIllustration } from "./SystemTypeIllustration";

type SystemType = {
  id: string;
  name: string;
  visual: string;
  visualLabel: string;
  description: string;
  color: string;
};

type ConnectionLine = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  status: "pending" | "correct" | "wrong";
};

type MatchPointerDrag = { typeId: string; pointerId: number; x: number; y: number; startX: number; startY: number; moved: boolean };
type ReviewRound = 0 | 1 | null;
type DraftPayload = {
  matches?: unknown;
  roundIndex?: unknown;
  reviewRound?: unknown;
  reviewStartedAt?: unknown;
  reviewDurationMs?: unknown;
  firstPageSnapshot?: unknown;
  secondPageSnapshot?: unknown;
};

const systemTypes: SystemType[] = [
  { id: "natural", name: "Doğal Sistem", visual: "Akarsu ve doğal vadi", visualLabel: "Akarsu", description: "Sistem insan müdahalesi olmadan doğal yollarla oluşmuştur.", color: "#38bdf8" },
  { id: "human-made", name: "İnsan Yapımı Sistem", visual: "Büyük beton baraj", visualLabel: "Baraj", description: "İnsan tarafından tasarlanmış ve inşa edilmiştir.", color: "#818cf8" },
  { id: "static", name: "Statik Sistem", visual: "Üzerinde araç olmayan boş köprü", visualLabel: "Boş Köprü", description: "Yapı faaliyetsizdir ve durumunu korur.", color: "#94a3b8" },
  { id: "dynamic", name: "Dinamik Sistem", visual: "Çalışan fabrika robotları ve montaj hattı", visualLabel: "Fabrika", description: "Makineler ve akış sürekli hareket ve değişim içindedir.", color: "#f59e0b" },
  { id: "closed", name: "Kapalı Sistem", visual: "Mühürlü cam deney kapsülü", visualLabel: "Cam Kapsül", description: "Dış ortamla madde ve enerji alışverişi yoktur.", color: "#a78bfa" },
  { id: "open", name: "Açık Sistem", visual: "Güneş ve su alan canlı bitki", visualLabel: "Canlı Bitki", description: "Çevresiyle sürekli madde ve enerji alışverişi yapar.", color: "#34d399" },
  { id: "deterministic", name: "Deterministik Sistem", visual: "Kenetlenmiş metal dişli mekanizması", visualLabel: "Dişli Mekanizması", description: "Bir parçanın hareketi diğerini kesin biçimde belirler.", color: "#64748b" },
  { id: "stochastic", name: "Stokastik Sistem", visual: "Havaya atılmış iki oyun zarı", visualLabel: "Oyun Zarları", description: "Sonuç önceden kesin bilinemez, olasılığa bağlıdır.", color: "#f472b6" },
  { id: "physical", name: "Fiziksel Sistem", visual: "Gerçek metal çaydanlık", visualLabel: "Çaydanlık", description: "Maddi varlığı olan ve fiziksel olarak görülebilen sistemdir.", color: "#fb923c" },
  { id: "conceptual", name: "Kavramsal Sistem", visual: "Mimari blueprint planı", visualLabel: "Sistem Planı", description: "Fiziksel nesne değil, düşünce ve planın sembollerle gösterimidir.", color: "#60a5fa" },
];

const visualOrder = ["stochastic", "open", "human-made", "conceptual", "dynamic", "natural", "physical", "closed", "deterministic", "static"];
const systemRounds = [systemTypes.slice(0, 5), systemTypes.slice(5)];
const systemRoundIds = systemRounds.map((round) => round.map((system) => system.id));
const answerKey = Object.fromEntries(systemTypes.map((system) => [system.id, system.id]));

const copy = {
  tr: {
    title: "Modül 4: Sistem Türleri ve Görsel Eşleştirme",
    locked: "Bu modül tamamlandı",
    lockedDetail: "Yanıtın kilitlendi. Öğretmen sonuçları açıklayana kadar bekleyin.",
    types: "Sistem Türleri",
    visuals: "Görseller",
    connect: "BAĞLA",
    hint: "Sistem türünü görsele sürükleyin. İsterseniz türü ve ardından görseli seçebilirsiniz.",
    correct: "Doğru",
    wrong: "Yanlış",
    correctAnswer: "Doğrusu",
    correctedTarget: "Doğru hedef",
    firstReview: "İlk beş eşleşme kontrol edildi. Doğru karşılıkları inceleyebilirsin; ikinci tur otomatik açılacak.",
    finalReview: "İlk seçimlerin kontrol edildi. Doğru karşılıkları inceleyebilirsin.",
    allCorrect: "Bu turdaki beş eşleşmenin tamamı doğru.",
    check: "Eşleştirmeleri Kontrol Et",
    saving: "Yanıt kaydediliyor…",
    saveError: "Yanıt kaydedilemedi. İlk eşleştirmelerin korundu.",
    retry: "Kaydı tekrar dene",
    round: "Tur",
  },
  en: {
    title: "Module 4: Match System Types and Visuals",
    locked: "This module is complete",
    lockedDetail: "Your answer is locked. Wait until the teacher reveals the results.",
    types: "System Types",
    visuals: "Visuals",
    connect: "MATCH",
    hint: "Drag a system type to a visual, or select the type and then the visual.",
    correct: "Correct",
    wrong: "Incorrect",
    correctAnswer: "Correct answer",
    correctedTarget: "Correct target",
    firstReview: "The first five matches were checked. Review the correct pairs; round two will open automatically.",
    finalReview: "Your initial choices were checked. You can review the correct pairs.",
    allCorrect: "All five matches in this round are correct.",
    check: "Check Matches",
    saving: "Saving your answer…",
    saveError: "The answer could not be saved. Your initial matches are preserved.",
    retry: "Try saving again",
    round: "Round",
  },
} as const;

function validMatches(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const validIds = new Set(systemTypes.map((system) => system.id));
  return Object.fromEntries(Object.entries(value).filter(([typeId, visualId]) => validIds.has(typeId) && typeof visualId === "string" && validIds.has(visualId))) as Record<string, string>;
}

function draftPayload(draft?: ModuleDraft | null) {
  return (draft?.payload ?? {}) as DraftPayload;
}

function submissionForMatches(
  finalMatches: Record<string, string>,
  completionReason: "completed" | "teacher-ended" | "draft",
  state?: {
    roundIndex: number;
    reviewRound: ReviewRound;
    reviewStartedAt?: number;
    reviewDurationMs?: number;
    firstPageSnapshot?: Record<string, string> | null;
    secondPageSnapshot?: Record<string, string> | null;
  },
): ModuleSubmission {
  const evaluation = evaluatePlacementSnapshot(finalMatches, answerKey);
  return {
    score: evaluation.score,
    payload: {
      mode: "system-type-visual-batch-matching",
      matches: finalMatches,
      correctCount: evaluation.correctCount,
      answeredCount: Object.keys(finalMatches).length,
      matchCount: systemTypes.length,
      pointsPerMatch: 10,
      completionReason,
      ...(state ? {
        roundIndex: state.roundIndex,
        reviewRound: state.reviewRound,
        reviewStartedAt: state.reviewStartedAt ?? null,
        reviewDurationMs: state.reviewDurationMs ?? null,
        firstPageSnapshot: state.firstPageSnapshot ?? null,
        secondPageSnapshot: state.secondPageSnapshot ?? null,
      } : {}),
    },
  };
}

export function Module4CompleteSystem({ onSubmit, onDraft, existingSubmission, existingDraft, forceSubmit }: LearningModuleProps) {
  const { locale } = useI18n();
  const text = copy[locale];
  const payload = draftPayload(existingDraft);
  const restoredMatches = validMatches(payload.matches);
  const restoredReviewRound: ReviewRound = payload.reviewRound === 0 || payload.reviewRound === 1 ? payload.reviewRound : null;
  const restoredRoundIndex = restoredReviewRound ?? (payload.roundIndex === 1 ? 1 : 0);
  const restoredFirstSnapshot = validMatches(payload.firstPageSnapshot);
  const restoredSecondSnapshot = validMatches(payload.secondPageSnapshot);
  const restoredReviewSnapshot = restoredReviewRound === 0 ? restoredFirstSnapshot : restoredReviewRound === 1 ? restoredSecondSnapshot : {};
  const [roundIndex, setRoundIndex] = useState(restoredRoundIndex);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>(restoredMatches);
  const [lines, setLines] = useState<ConnectionLine[]>([]);
  const [phase, setPhase] = useState<AnswerReviewPhase>(existingSubmission ? "done" : restoredReviewRound !== null ? "reviewing" : "editing");
  const [reviewingRound, setReviewingRound] = useState<ReviewRound>(restoredReviewRound);
  const [reviewSnapshot, setReviewSnapshot] = useState<Record<string, string> | null>(Object.keys(restoredReviewSnapshot).length ? restoredReviewSnapshot : null);
  const [showCorrections, setShowCorrections] = useState(restoredReviewRound !== null);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const [pointerDrag, setPointerDrag] = useState<MatchPointerDrag | null>(null);
  const [dragOverVisual, setDragOverVisual] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const typeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const visualRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const pointerDragRef = useRef<MatchPointerDrag | null>(null);
  const suppressClickRef = useRef(false);
  const matchesRef = useRef<Record<string, string>>(restoredMatches);
  const phaseRef = useRef<AnswerReviewPhase>(existingSubmission ? "done" : restoredReviewRound !== null ? "reviewing" : "editing");
  const firstPageSnapshotRef = useRef<Record<string, string> | null>(Object.keys(restoredFirstSnapshot).length ? restoredFirstSnapshot : null);
  const secondPageSnapshotRef = useRef<Record<string, string> | null>(Object.keys(restoredSecondSnapshot).length ? restoredSecondSnapshot : null);
  const submissionStarted = useRef(Boolean(existingSubmission));
  const correctionTimers = useRef<number[]>([]);
  const restoredReviewStarted = useRef(false);
  const { start: startReviewClock, cancel: cancelReviewClock } = useAnswerReviewTimer();
  const interactionLocked = phase !== "editing";
  const currentSystems = systemRounds[roundIndex];
  const currentSystemIds = systemRoundIds[roundIndex];
  const currentVisualCards = visualOrder.filter((id) => currentSystemIds.includes(id)).map((id) => systemTypes.find((item) => item.id === id)!);
  const activeReviewSnapshot = reviewingRound === roundIndex ? reviewSnapshot : null;

  const clearCorrectionTimers = useCallback(() => {
    correctionTimers.current.forEach((timer) => window.clearTimeout(timer));
    correctionTimers.current = [];
  }, []);

  const resetPointerDrag = useCallback(() => {
    pointerDragRef.current = null;
    setPointerDrag(null);
    setDragOverVisual(null);
  }, []);

  const updateLines = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const boardRect = board.getBoundingClientRect();
    const source = activeReviewSnapshot ?? matches;
    const nextLines = Object.entries(source).filter(([typeId]) => currentSystemIds.includes(typeId)).flatMap(([typeId, visualId]) => {
      const typeNode = typeRefs.current[typeId];
      const visualNode = visualRefs.current[visualId];
      const system = systemTypes.find((item) => item.id === typeId);
      if (!typeNode || !visualNode || !system) return [];
      const typeRect = typeNode.getBoundingClientRect();
      const visualRect = visualNode.getBoundingClientRect();
      return [{
        id: typeId,
        x1: typeRect.right - boardRect.left,
        y1: typeRect.top + typeRect.height / 2 - boardRect.top,
        x2: visualRect.left - boardRect.left,
        y2: visualRect.top + visualRect.height / 2 - boardRect.top,
        color: system.color,
        status: activeReviewSnapshot ? typeId === visualId ? "correct" as const : "wrong" as const : "pending" as const,
      }];
    });
    setLines(nextLines);
  }, [activeReviewSnapshot, currentSystemIds, matches]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(updateLines);
    const observer = new ResizeObserver(updateLines);
    if (boardRef.current) observer.observe(boardRef.current);
    window.addEventListener("resize", updateLines);
    window.addEventListener("scroll", updateLines, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", updateLines);
      window.removeEventListener("scroll", updateLines);
    };
  }, [updateLines]);

  const saveDraft = useCallback((nextMatches: Record<string, string>, state: Parameters<typeof submissionForMatches>[2]) => {
    void onDraft?.(submissionForMatches(nextMatches, "draft", state));
  }, [onDraft]);

  const finalize = useCallback(async (snapshot: Record<string, string>, completionReason: "completed" | "teacher-ended") => {
    if (submissionStarted.current || existingSubmission) return;
    if (completionReason === "completed" && Object.keys(snapshot).length !== systemTypes.length) return;
    submissionStarted.current = true;
    clearCorrectionTimers();
    cancelReviewClock();
    phaseRef.current = "submitting";
    setPhase("submitting");
    const submission = submissionForMatches(snapshot, completionReason, {
      roundIndex,
      reviewRound: reviewingRound,
      firstPageSnapshot: firstPageSnapshotRef.current,
      secondPageSnapshot: secondPageSnapshotRef.current,
    });
    setFinalSubmission(submission);
    setSubmitting(true);
    setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) {
      submissionStarted.current = false;
      phaseRef.current = "reviewing";
      setPhase("reviewing");
      setSubmitFailed(true);
      return;
    }
    phaseRef.current = "done";
    setPhase("done");
  }, [cancelReviewClock, clearCorrectionTimers, existingSubmission, onSubmit, reviewingRound, roundIndex]);

  const finishFirstRoundReview = useCallback(() => {
    if (phaseRef.current !== "reviewing") return;
    clearCorrectionTimers();
    phaseRef.current = "editing";
    setPhase("editing");
    setReviewingRound(null);
    setReviewSnapshot(null);
    setShowCorrections(false);
    setLines([]);
    setRoundIndex(1);
    saveDraft(matchesRef.current, {
      roundIndex: 1,
      reviewRound: null,
      firstPageSnapshot: firstPageSnapshotRef.current,
      secondPageSnapshot: secondPageSnapshotRef.current,
    });
  }, [clearCorrectionTimers, saveDraft]);

  const startRoundReview = useCallback((targetRound: 0 | 1, nextMatches: Record<string, string>) => {
    if (phaseRef.current !== "editing") return;
    const ids = systemRoundIds[targetRound];
    const snapshot = Object.fromEntries(ids.map((id) => [id, nextMatches[id]]));
    const startedAt = currentReviewTimestamp();
    const duration = targetRound === 0 ? MATCHING_ROUND_ONE_REVIEW_MS : ANSWER_REVIEW_TOTAL_MS;
    phaseRef.current = "reviewing";
    setPhase("reviewing");
    setReviewingRound(targetRound);
    setReviewSnapshot(snapshot);
    setShowCorrections(false);
    setSelectedType(null);
    resetPointerDrag();
    if (targetRound === 0) {
      firstPageSnapshotRef.current = snapshot;
    } else {
      secondPageSnapshotRef.current = snapshot;
    }
    saveDraft(nextMatches, {
      roundIndex: targetRound,
      reviewRound: targetRound,
      reviewStartedAt: startedAt,
      reviewDurationMs: duration,
      firstPageSnapshot: targetRound === 0 ? snapshot : firstPageSnapshotRef.current,
      secondPageSnapshot: targetRound === 1 ? snapshot : secondPageSnapshotRef.current,
    });
    const correctionTimer = window.setTimeout(() => setShowCorrections(true), ANSWER_REVIEW_MARK_MS);
    correctionTimers.current.push(correctionTimer);
    startReviewClock(duration, targetRound === 0 ? finishFirstRoundReview : () => void finalize(nextMatches, "completed"));
  }, [finalize, finishFirstRoundReview, resetPointerDrag, saveDraft, startReviewClock]);

  useEffect(() => {
    if (restoredReviewRound === null || restoredReviewStarted.current || existingSubmission || forceSubmit) return;
    restoredReviewStarted.current = true;
    const duration = typeof payload.reviewDurationMs === "number" ? payload.reviewDurationMs : restoredReviewRound === 0 ? MATCHING_ROUND_ONE_REVIEW_MS : ANSWER_REVIEW_TOTAL_MS;
    const startedAt = typeof payload.reviewStartedAt === "number" ? payload.reviewStartedAt : currentReviewTimestamp();
    const callback = restoredReviewRound === 0 ? finishFirstRoundReview : () => void finalize(matchesRef.current, "completed");
    startReviewClock(duration, callback, remainingReviewTime(startedAt, duration));
  }, [existingSubmission, finalize, finishFirstRoundReview, forceSubmit, payload.reviewDurationMs, payload.reviewStartedAt, restoredReviewRound, startReviewClock]);

  useEffect(() => {
    if (!forceSubmit || phaseRef.current === "done" || existingSubmission) return;
    clearCorrectionTimers();
    cancelReviewClock();
    void finalize(matchesRef.current, "teacher-ended");
  }, [cancelReviewClock, clearCorrectionTimers, existingSubmission, finalize, forceSubmit]);

  useEffect(() => clearCorrectionTimers, [clearCorrectionTimers]);

  function selectType(id: string) {
    if (interactionLocked) return;
    setSelectedType((current) => current === id ? null : id);
  }

  function assignMatch(typeId: string, visualId: string) {
    if (interactionLocked) return;
    const next = { ...matchesRef.current };
    for (const [matchedTypeId, assignedVisual] of Object.entries(next)) {
      if (assignedVisual === visualId && matchedTypeId !== typeId) delete next[matchedTypeId];
    }
    next[typeId] = visualId;
    matchesRef.current = next;
    setMatches(next);
    setSelectedType(null);
    const pageComplete = currentSystemIds.every((id) => Boolean(next[id]));
    if (roundIndex === 0 && pageComplete) {
      startRoundReview(0, next);
      return;
    }
    saveDraft(next, {
      roundIndex,
      reviewRound: null,
      firstPageSnapshot: firstPageSnapshotRef.current,
      secondPageSnapshot: secondPageSnapshotRef.current,
    });
  }

  function assignVisual(visualId: string) {
    if (selectedType) assignMatch(selectedType, visualId);
  }

  function visualTargetAt(x: number, y: number) {
    const target = document.elementFromPoint(x, y) as HTMLElement | null;
    return target?.closest<HTMLElement>("[data-match-visual]")?.dataset.matchVisual || null;
  }

  function getTypePointerHandlers(typeId: string) {
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (interactionLocked || event.button !== 0) return;
        const next = { typeId, pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
        pointerDragRef.current = next;
        setPointerDrag(next);
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => {
        const current = pointerDragRef.current;
        if (!current || current.pointerId !== event.pointerId) return;
        event.preventDefault();
        const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 6;
        const next = { ...current, x: event.clientX, y: event.clientY, moved };
        pointerDragRef.current = next;
        setPointerDrag(next);
        setDragOverVisual(moved ? visualTargetAt(event.clientX, event.clientY) : null);
      },
      onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
        const current = pointerDragRef.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const visualId = current.moved ? visualTargetAt(event.clientX, event.clientY) : null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        resetPointerDrag();
        if (!current.moved) return;
        suppressClickRef.current = true;
        window.setTimeout(() => { suppressClickRef.current = false; }, 0);
        if (visualId && currentSystemIds.includes(visualId)) assignMatch(current.typeId, visualId);
      },
      onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (pointerDragRef.current?.pointerId === event.pointerId) resetPointerDrag();
      },
    };
  }

  function consumeSuppressedClick() {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }

  if (existingSubmission && phase !== "submitting") {
    return <section className="panel module-shell matching-module-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  }

  const currentReviewEvaluation = activeReviewSnapshot ? evaluatePlacementSnapshot(activeReviewSnapshot, Object.fromEntries(currentSystemIds.map((id) => [id, id]))) : null;
  const reviewAllCorrect = currentReviewEvaluation?.correctCount === currentSystemIds.length;

  return <section className="panel module-shell matching-module-shell">
    <div className="module-topline matching-topline"><div className="module-title-chip">{text.title}</div><strong>{Object.keys(matches).length} / {systemTypes.length} · {text.round} {roundIndex + 1} / 2</strong></div>
    <p className="touch-drag-hint"><span aria-hidden="true">☝️</span> {text.hint}</p>

    <div className="matching-board visual-only-board" ref={boardRef} key={roundIndex}>
      <svg className="matching-lines" aria-hidden="true">
        {lines.map((line) => {
          const stroke = line.status === "correct" ? "#10b981" : line.status === "wrong" ? "#f43f5e" : line.color;
          const middleX = (line.x1 + line.x2) / 2;
          const middleY = (line.y1 + line.y2) / 2;
          return <g key={line.id} className={`match-line-${line.status}`}><path d={`M ${line.x1} ${line.y1} C ${line.x1 + 28} ${line.y1}, ${line.x2 - 28} ${line.y2}, ${line.x2} ${line.y2}`} stroke={stroke} /><circle cx={line.x1} cy={line.y1} r="4" fill={stroke} /><circle cx={line.x2} cy={line.y2} r="4" fill={stroke} />{line.status !== "pending" && <g transform={`translate(${middleX} ${middleY})`}><circle r="11" fill={stroke} /><text textAnchor="middle" dominantBaseline="central">{line.status === "correct" ? "✓" : "×"}</text></g>}</g>;
        })}
      </svg>

      <div className="system-type-list">
        <h2>{text.types}</h2>
        {currentSystems.map((system, index) => {
          const assigned = (activeReviewSnapshot ?? matches)[system.id];
          const status = activeReviewSnapshot ? assigned === system.id ? "correct" : "wrong" : "";
          return <div className={`system-type-entry ${status}`} key={system.id}>
            <button type="button" ref={(node) => { typeRefs.current[system.id] = node; }} className={`${selectedType === system.id ? "selected" : ""} ${assigned ? "assigned" : ""} ${status}`} disabled={interactionLocked} {...getTypePointerHandlers(system.id)} onClick={() => { if (!consumeSuppressedClick()) selectType(system.id); }} data-pointer-source={pointerDrag?.typeId === system.id ? "true" : undefined} aria-label={`${system.name}${status ? `. ${status === "correct" ? text.correct : text.wrong}` : ""}`}>
              <span>{index + 1}</span><strong>{system.name}</strong>{assigned && !activeReviewSnapshot && <i aria-hidden="true"><Unlink size={15} /></i>}{status === "correct" && <Check size={18} aria-label={text.correct} />}{status === "wrong" && <X size={18} aria-label={text.wrong} />}
            </button>
            {status === "wrong" && showCorrections && <div className="type-result-explanation"><strong>✕ {text.wrong} · ✓ {text.correctAnswer}:</strong> {system.visualLabel}. {system.description}</div>}
          </div>;
        })}
      </div>

      <div className="matching-track" aria-hidden="true"><span>{text.connect}</span></div>

      <div className="system-visual-list visual-only-list">
        <h2>{text.visuals}</h2>
        {currentVisualCards.map((system) => {
          const source = activeReviewSnapshot ?? matches;
          const assignedType = Object.entries(source).find(([, visualId]) => visualId === system.id)?.[0];
          const status = activeReviewSnapshot && assignedType ? assignedType === system.id ? "correct" : "wrong" : "";
          const correctedTarget = Boolean(activeReviewSnapshot && showCorrections && activeReviewSnapshot[system.id] !== system.id);
          return <button type="button" key={system.id} ref={(node) => { visualRefs.current[system.id] = node; }} className={`${assignedType ? "assigned" : ""} ${status} ${correctedTarget ? "corrected-target" : ""} ${dragOverVisual === system.id ? "drag-over" : ""}`} disabled={interactionLocked} onClick={() => assignVisual(system.id)} aria-label={`${system.visual}${status ? `. ${status === "correct" ? text.correct : text.wrong}` : ""}${correctedTarget ? `. ${text.correctedTarget}` : ""}`} data-match-visual={system.id}>
            <SystemTypeIllustration type={system.id} /><span className="system-visual-name">{system.visualLabel}</span>{assignedType && !activeReviewSnapshot && <i aria-hidden="true">●</i>}{status === "correct" && <i><Check size={17} aria-label={text.correct} /></i>}{status === "wrong" && <i><X size={17} aria-label={text.wrong} /></i>}{correctedTarget && <small className="matching-correct-target">✓ {text.correctedTarget}</small>}
          </button>;
        })}
      </div>
    </div>

    {pointerDrag?.moved && <div className="pointer-drag-ghost matching-pointer-ghost" style={{ left: pointerDrag.x, top: pointerDrag.y }} aria-hidden="true">{systemTypes.find((system) => system.id === pointerDrag.typeId)?.name}</div>}
    {activeReviewSnapshot && <div className={reviewAllCorrect ? "notice success" : "notice matching-review-notice"} aria-live="polite">{reviewAllCorrect ? text.allCorrect : reviewingRound === 0 ? text.firstReview : text.finalReview}</div>}
    {roundIndex === 1 && <div className="button-row matching-actions"><Button disabled={interactionLocked || Object.keys(matches).length !== systemTypes.length} loading={submitting} icon={<Check size={18} />} onClick={() => startRoundReview(1, matchesRef.current)}>{text.check}</Button></div>}
    {submitting && <div className="notice">{text.saving}</div>}
    {submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => { submissionStarted.current = false; void finalize(validMatches(finalSubmission.payload.matches), String(finalSubmission.payload.completionReason) === "teacher-ended" ? "teacher-ended" : "completed"); }}>{text.retry}</Button></>}
  </section>;
}
