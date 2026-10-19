"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowLeftRight, Check, CircleX, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import {
  answerSignature,
  buildLoopRepairRound,
  correctAnswerSignature,
  incorrectLinkIds,
  initialLinkStates,
  isValidAttemptSignature,
  loopGroupLabels,
  scoreLoopAttempts,
  type LoopAttempt,
  type LoopLink,
  type LoopLinkState,
  type LoopRepairCase,
  type Polarity,
} from "./loopRepairContent";

const gameId = "week-7-loop-repair-v2";
const legacyGameId = "week-7-loop-repair-v1";
const reviewDuration = 1000;

type DraftPayload = {
  gameId?: unknown;
  selectedCaseIds?: unknown;
  attempts?: unknown;
  completions?: unknown;
  currentIndex?: unknown;
  currentLinks?: unknown;
};

type ReviewState = {
  correct: boolean;
  errorIds: string[];
};

const copy = {
  tr: {
    title: "HAFTA 7 · MODÜL 1",
    diagram: "Diyagram",
    score: "Puan",
    instruction: "Bağlantıları düzenle; hazır olduğunda Kontrol Et’e bas.",
    rule: "Tamamen doğru diyagram 20 puan. Hız veya fazladan dokunma cezası yok.",
    check: "Kontrol Et",
    sign: "İlişki işaretini değiştir",
    direction: "Ok yönünü ters çevir",
    correct: "Diyagram doğru · +20 puan",
    incorrect: (count: number) => `${count} bağlantı hatalı · +0 puan`,
    completed: "Beş diyagram da kontrol edildi",
    partial: "Kontrol edilen diyagramlar kaydedildi",
    detail: (score: number) => `Kazanılan puan: ${score}/100. Bu modülde hız bonusu yoktur.`,
    locked: "Bu döngü turu tamamlandı",
    lockedDetail: "Yanıtların kilitlendi. Öğretmenin sonuçları açıklamasını bekle.",
    saving: "Yanıtlar kaydediliyor…",
    saveError: "Yanıtlar kaydedilemedi. İlerlemen korundu.",
    retry: "Tekrar kaydet",
    reinforcing: "R · Pekiştirici",
    balancing: "B · Dengeleyici",
  },
  en: {
    title: "WEEK 7 · MODULE 1",
    diagram: "Diagram",
    score: "Score",
    instruction: "Edit the links, then press Check when you are ready.",
    rule: "A fully correct diagram is worth 20 points. There is no speed or extra-tap penalty.",
    check: "Check",
    sign: "Toggle relation sign",
    direction: "Reverse arrow direction",
    correct: "Diagram correct · +20 points",
    incorrect: (count: number) => `${count} incorrect ${count === 1 ? "link" : "links"} · +0 points`,
    completed: "All five diagrams checked",
    partial: "Checked diagrams were saved",
    detail: (score: number) => `Score earned: ${score}/100. This module has no speed bonus.`,
    locked: "This loop round is complete",
    lockedDetail: "Your answers are locked. Wait for the teacher to reveal the results.",
    saving: "Saving answers…",
    saveError: "The answers could not be saved. Your progress is preserved.",
    retry: "Save again",
    reinforcing: "R · Reinforcing",
    balancing: "B · Balancing",
  },
} as const;

function selectedCasesMatch(payload: DraftPayload | undefined, round: LoopRepairCase[]) {
  return Array.isArray(payload?.selectedCaseIds)
    && payload.selectedCaseIds.join("|") === round.map((item) => item.id).join("|");
}

function restoredAttempts(draft: ModuleDraft | null | undefined, round: LoopRepairCase[]) {
  const payload = draft?.payload as DraftPayload | undefined;
  if (!selectedCasesMatch(payload, round)) return [];
  const values = payload?.gameId === gameId && Array.isArray(payload.attempts)
    ? payload.attempts
    : payload?.gameId === legacyGameId && Array.isArray(payload.completions)
      ? payload.completions
      : null;
  if (!values) return [];

  const restored: LoopAttempt[] = [];
  for (const value of values) {
    if (!value || typeof value !== "object") break;
    const attempt = value as Partial<LoopAttempt>;
    const current = round[restored.length];
    if (!current || attempt.caseId !== current.id || typeof attempt.signature !== "string") break;
    const valid = payload?.gameId === legacyGameId
      ? attempt.signature === correctAnswerSignature(current)
      : isValidAttemptSignature(current, attempt.signature);
    if (!valid) break;
    restored.push({ caseId: current.id, signature: attempt.signature });
  }
  return restored;
}

function restoredLinks(draft: ModuleDraft | null | undefined, item: LoopRepairCase, currentIndex: number, selectedIds: string[]) {
  const payload = draft?.payload as DraftPayload | undefined;
  if ((payload?.gameId !== gameId && payload?.gameId !== legacyGameId)
    || payload.currentIndex !== currentIndex
    || !Array.isArray(payload.selectedCaseIds)
    || payload.selectedCaseIds.join("|") !== selectedIds.join("|")
    || !Array.isArray(payload.currentLinks)
    || payload.currentLinks.length !== item.links.length) return initialLinkStates(item);

  const states: LoopLinkState[] = [];
  for (let index = 0; index < item.links.length; index += 1) {
    const value = payload.currentLinks[index];
    const definition = item.links[index]!;
    if (!value || typeof value !== "object") return initialLinkStates(item);
    const state = value as Partial<LoopLinkState>;
    const canonicalDirection = state.from === definition.from && state.to === definition.to;
    const reversedDirection = state.from === definition.to && state.to === definition.from;
    if (state.id !== definition.id
      || (!canonicalDirection && !reversedDirection)
      || (state.polarity !== "+" && state.polarity !== "-")) return initialLinkStates(item);
    states.push({ id: definition.id, from: state.from!, to: state.to!, polarity: state.polarity });
  }
  return states;
}

function quadraticPoint(start: { x: number; y: number }, control: { x: number; y: number }, end: { x: number; y: number }, t: number) {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  };
}

function edgeGeometry(item: LoopRepairCase, definition: LoopLink) {
  const from = item.nodes.find((node) => node.id === definition.from)!;
  const to = item.nodes.find((node) => node.id === definition.to)!;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const unitX = dx / length;
  const unitY = dy / length;
  const start = { x: from.x + unitX * 12, y: from.y + unitY * 12 };
  const end = { x: to.x - unitX * 12, y: to.y - unitY * 12 };
  const bend = definition.bend ?? 0;
  const control = {
    x: (start.x + end.x) / 2 - unitY * bend,
    y: (start.y + end.y) / 2 + unitX * bend,
  };
  const midpoint = quadraticPoint(start, control, end, .5);
  const signBase = quadraticPoint(start, control, end, .31);
  const signOffset = bend === 0 ? 5.5 : Math.sign(bend) * 3.5;
  const signPoint = {
    x: Math.min(95, Math.max(5, signBase.x - unitY * signOffset)),
    y: Math.min(95, Math.max(5, signBase.y + unitX * signOffset)),
  };
  return {
    path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    midpoint,
    signPoint,
  };
}

function LoopDiagram({ item, states, locked, review, flashKey, locale, onPolarity, onDirection }: {
  item: LoopRepairCase;
  states: LoopLinkState[];
  locked: boolean;
  review: ReviewState | null;
  flashKey: string;
  locale: "tr" | "en";
  onPolarity: (linkId: string) => void;
  onDirection: (linkId: string) => void;
}) {
  const text = copy[locale];
  const normalMarker = `loop-arrow-${item.id}-normal`;
  const correctMarker = `loop-arrow-${item.id}-correct`;
  const errorMarker = `loop-arrow-${item.id}-error`;

  return <div className={`loop-diagram ${item.nodes.length === 5 ? "five-node" : "four-node"} ${review?.correct ? "solved" : ""}`} data-case-id={item.id}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id={normalMarker} className="loop-marker-normal" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
        <marker id={correctMarker} className="loop-marker-correct" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
        <marker id={errorMarker} className="loop-marker-error" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
      </defs>
      {states.map((state, index) => {
        const definition = item.links[index]!;
        const geometry = edgeGeometry(item, definition);
        const forward = state.from === definition.from && state.to === definition.to;
        const error = Boolean(review?.errorIds.includes(state.id));
        const edgeState = review?.correct ? "correct" : error ? "error" : "normal";
        const marker = edgeState === "correct" ? correctMarker : edgeState === "error" ? errorMarker : normalMarker;
        return <path
          key={state.id}
          className={`loop-edge edge-${edgeState}`}
          data-link-id={state.id}
          data-direction={forward ? "forward" : "reverse"}
          d={geometry.path}
          markerStart={!forward ? `url(#${marker})` : undefined}
          markerEnd={forward ? `url(#${marker})` : undefined}
        />;
      })}
    </svg>
    {item.nodes.map((node) => <div key={node.id} className={`loop-node ${review?.correct ? "node-solved" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }}><span>{node.label[locale]}</span></div>)}
    {states.map((state, index) => {
      const definition = item.links[index]!;
      const geometry = edgeGeometry(item, definition);
      const error = Boolean(review?.errorIds.includes(state.id));
      const controlState = review?.correct ? "link-correct" : error ? "link-error" : "";
      return <div key={state.id} className={controlState}>
        <button
          type="button"
          className={`loop-sign-control ${flashKey === `${state.id}:sign` ? "changed" : ""}`}
          style={{ left: `${geometry.signPoint.x}%`, top: `${geometry.signPoint.y}%` } as CSSProperties}
          disabled={locked}
          data-link-id={state.id}
          data-control="polarity"
          aria-label={`${text.sign}: ${state.polarity}`}
          onClick={() => onPolarity(state.id)}
        ><b>{state.polarity === "+" ? "+" : "−"}</b></button>
        <button
          type="button"
          className={`loop-direction-control ${flashKey === `${state.id}:direction` ? "changed" : ""}`}
          style={{ left: `${geometry.midpoint.x}%`, top: `${geometry.midpoint.y}%` } as CSSProperties}
          disabled={locked}
          data-link-id={state.id}
          data-control="direction"
          aria-label={`${text.direction}: ${item.nodes.find((node) => node.id === state.from)?.label[locale]} → ${item.nodes.find((node) => node.id === state.to)?.label[locale]}`}
          onClick={() => onDirection(state.id)}
        ><ArrowLeftRight aria-hidden="true" /></button>
      </div>;
    })}
  </div>;
}

export function Week7LoopRepair({ onSubmit, onDraft, existingSubmission, existingDraft, forceSubmit, seedKey }: LearningModuleProps & { seedKey: string }) {
  const { locale } = useI18n();
  const text = copy[locale];
  const round = useMemo(() => buildLoopRepairRound(seedKey), [seedKey]);
  const selectedIds = useMemo(() => round.map((item) => item.id), [round]);
  const hydrated = useMemo(() => restoredAttempts(existingDraft, round), [existingDraft, round]);
  const initialIndex = Math.min(hydrated.length, round.length - 1);
  const [index, setIndex] = useState(initialIndex);
  const [attempts, setAttempts] = useState(hydrated);
  const [states, setStates] = useState(() => restoredLinks(existingDraft, round[initialIndex]!, initialIndex, selectedIds));
  const [review, setReview] = useState<ReviewState | null>(null);
  const [flashKey, setFlashKey] = useState("");
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const attemptsRef = useRef(hydrated);
  const statesRef = useRef(states);
  const lockedRef = useRef(hydrated.length === round.length);
  const hydrationHandled = useRef(false);
  const submissionStarted = useRef(false);
  const advanceTimer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);
  const current = round[index]!;
  const currentScore = scoreLoopAttempts(round, attempts);

  const clearTimers = useCallback(() => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    advanceTimer.current = null;
    flashTimer.current = null;
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const submissionFor = useCallback((checkedAttempts: LoopAttempt[], completionReason: "draft" | "completed" | "teacher-ended", currentIndex: number, currentLinks: LoopLinkState[]): ModuleSubmission => ({
    stage: 1,
    score: scoreLoopAttempts(round, checkedAttempts),
    payload: {
      gameId,
      selectedCaseIds: selectedIds,
      attempts: checkedAttempts,
      currentIndex,
      currentLinks,
      answeredCount: checkedAttempts.length,
      diagramCount: round.length,
      pointsPerDiagram: 20,
      scoringRule: "20-per-correct-checked-diagram-no-tap-deduction",
      completionReason,
    },
  }), [round, selectedIds]);

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true);
    setSubmitFailed(false);
    try {
      const accepted = await onSubmit(submission);
      if (accepted === false) setSubmitFailed(true);
    } catch {
      setSubmitFailed(true);
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit]);

  const finalize = useCallback(async (checkedAttempts: LoopAttempt[], reason: "completed" | "teacher-ended") => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true;
    lockedRef.current = true;
    clearTimers();
    const submission = submissionFor(checkedAttempts, reason, Math.min(checkedAttempts.length, round.length - 1), statesRef.current);
    setAttempts(checkedAttempts);
    setFinalSubmission(submission);
    setCompleted(true);
    await submitResult(submission);
  }, [clearTimers, existingSubmission, round.length, submissionFor, submitResult]);

  const advance = useCallback((checkedAttempts: LoopAttempt[]) => {
    if (completed || existingSubmission || forceSubmit || submissionStarted.current) return;
    if (checkedAttempts.length >= round.length) {
      void finalize(checkedAttempts, "completed");
      return;
    }
    const nextIndex = checkedAttempts.length;
    const nextStates = initialLinkStates(round[nextIndex]!);
    setIndex(nextIndex);
    setStates(nextStates);
    statesRef.current = nextStates;
    setReview(null);
    lockedRef.current = false;
    void onDraft?.(submissionFor(checkedAttempts, "draft", nextIndex, nextStates));
  }, [completed, existingSubmission, finalize, forceSubmit, onDraft, round, submissionFor]);

  const applyChange = useCallback((linkId: string, control: "sign" | "direction") => {
    if (lockedRef.current || completed || existingSubmission || forceSubmit) return;
    const nextStates = statesRef.current.map((state) => state.id !== linkId ? state : control === "sign"
      ? { ...state, polarity: (state.polarity === "+" ? "-" : "+") as Polarity }
      : { ...state, from: state.to, to: state.from });
    setStates(nextStates);
    statesRef.current = nextStates;
    setFlashKey(`${linkId}:${control}`);
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashKey(""), 360);
    void onDraft?.(submissionFor(attemptsRef.current, "draft", index, nextStates));
  }, [completed, existingSubmission, forceSubmit, index, onDraft, submissionFor]);

  const checkDiagram = useCallback(() => {
    if (lockedRef.current || completed || existingSubmission || forceSubmit) return;
    lockedRef.current = true;
    const errorIds = incorrectLinkIds(current, statesRef.current);
    const nextAttempts = [...attemptsRef.current, { caseId: current.id, signature: answerSignature(statesRef.current) }];
    attemptsRef.current = nextAttempts;
    setAttempts(nextAttempts);
    setReview({ correct: errorIds.length === 0, errorIds });
    void onDraft?.(submissionFor(nextAttempts, "draft", index, statesRef.current));
    advanceTimer.current = window.setTimeout(() => advance(nextAttempts), reviewDuration);
  }, [advance, completed, current, existingSubmission, forceSubmit, index, onDraft, submissionFor]);

  useEffect(() => {
    if (hydrationHandled.current) return;
    hydrationHandled.current = true;
    if (hydrated.length === round.length && !existingSubmission && !completed) void finalize(hydrated, "completed");
  }, [completed, existingSubmission, finalize, hydrated, round.length]);

  useEffect(() => {
    if (forceSubmit && !completed && !existingSubmission) void finalize(attemptsRef.current, "teacher-ended");
  }, [completed, existingSubmission, finalize, forceSubmit]);

  if (existingSubmission && !completed) return <section className="panel module-shell loop-repair-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  if (completed) return <section className="panel module-shell loop-repair-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><Sparkles size={42} /><h2>{attempts.length === round.length ? text.completed : text.partial}</h2><p>{text.detail(finalSubmission?.score ?? currentScore)}</p>{submitting && <div className="notice">{text.saving}</div>}{submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>{text.retry}</Button></>}</div></section>;

  return <section className="panel module-shell loop-repair-shell">
    <header className="loop-repair-header">
      <div><span className="module-title-chip">{text.title}</span><small>{loopGroupLabels[current.group][locale]}</small></div>
      <div className="loop-repair-stats"><span>{text.diagram} <b>{index + 1}/{round.length}</b></span><span>{text.score} <b>{currentScore}</b></span></div>
    </header>
    <div className="loop-repair-progress" aria-label={`${text.diagram} ${index + 1} / ${round.length}`}>{round.map((item, itemIndex) => <i key={item.id} className={itemIndex < attempts.length ? "done" : itemIndex === index ? "active" : ""} />)}</div>
    <p className="loop-repair-situation" data-i18n-skip>{current.situation[locale]}</p>
    <LoopDiagram item={current} states={states} locked={Boolean(review) || completed || Boolean(existingSubmission) || Boolean(forceSubmit)} review={review} flashKey={flashKey} locale={locale} onPolarity={(linkId) => applyChange(linkId, "sign")} onDirection={(linkId) => applyChange(linkId, "direction")} />
    <div className={`loop-repair-feedback ${review ? review.correct ? "review-correct" : "review-incorrect" : "idle"}`} aria-live="polite">
      {!review ? <><div className="loop-repair-guidance"><strong>{text.instruction}</strong><small>{text.rule}</small></div><Button className="loop-repair-check" icon={<Check size={18} />} onClick={checkDiagram}>{text.check}</Button></> : review.correct ? <><span><Check aria-hidden="true" /> {text.correct}</span><div className="loop-repair-types">{current.loops.map((loop, loopIndex) => <b key={`${loop.type}:${loopIndex}`}>{loop.type === "R" ? text.reinforcing : text.balancing}</b>)}</div><p data-i18n-skip>{current.explanation[locale]}</p></> : <span><CircleX aria-hidden="true" /> {text.incorrect(review.errorIds.length)}</span>}
    </div>
  </section>;
}
