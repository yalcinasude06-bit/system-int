"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Check, CircleX, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
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
  normalizeLegacySignature,
  scoreLoopAttempt,
  scoreLoopAttempts,
  type LoopAttempt,
  type LoopLink,
  type LoopLinkState,
  type LoopRepairCase,
  type Polarity,
  type PredictionOptionId,
} from "./loopRepairContent";

const gameId = "week-7-loop-repair-v3";
const legacyV2GameId = "week-7-loop-repair-v2";
const legacyV1GameId = "week-7-loop-repair-v1";
const reviewDuration = 1400;

type DraftPayload = {
  gameId?: unknown;
  selectedCaseIds?: unknown;
  attempts?: unknown;
  completions?: unknown;
  currentIndex?: unknown;
  currentLinks?: unknown;
  currentPredictionChoiceId?: unknown;
};

type ReviewState = {
  errorIds: string[];
  predictionCorrect: boolean;
  points: number;
};

const predictionOptionIds: PredictionOptionId[] = ["A", "B", "C"];

const copy = {
  tr: {
    title: "HAFTA 7 · MODÜL 1",
    diagram: "Diyagram",
    score: "Puan",
    predictionTitle: "2. Sonucu tahmin et",
    instruction: "İki hatalı ilişki işaretini düzelt, ardından sonucu tahmin et.",
    rule: "İlişki işaretleri 12, sonuç tahmini 8 puan.",
    check: "Kontrol Et",
    sign: "İlişki işaretini değiştir",
    correctAnswer: "Doğru tahmin",
    points: (score: number) => `Bu vakadan +${score}/20 puan`,
    diagramCorrect: "Tüm ilişki işaretleri doğru",
    diagramErrors: (count: number) => `${count} ilişki işareti hatalı`,
    predictionCorrect: "Tahmin doğru",
    predictionIncorrect: "Tahmin yanlış",
    completed: "Beş vaka da kontrol edildi",
    partial: "Kontrol edilen vakalar kaydedildi",
    detail: (score: number) => `Kazanılan puan: ${score}/100. Hız bonusu veya dokunma cezası yoktur.`,
    locked: "Bu döngü turu tamamlandı",
    lockedDetail: "Yanıtların kilitlendi. Öğretmenin sonuçları açıklamasını bekle.",
    saving: "Yanıtlar kaydediliyor…",
    saveError: "Yanıtlar kaydedilemedi. İlerlemen korundu.",
    retry: "Tekrar kaydet",
  },
  en: {
    title: "WEEK 7 · MODULE 1",
    diagram: "Diagram",
    score: "Score",
    predictionTitle: "2. Predict the outcome",
    instruction: "Fix the two incorrect relation signs, then predict the outcome.",
    rule: "Relation signs are worth 12 points and the prediction is worth 8.",
    check: "Check",
    sign: "Toggle relation sign",
    correctAnswer: "Correct prediction",
    points: (score: number) => `+${score}/20 points for this case`,
    diagramCorrect: "All relation signs are correct",
    diagramErrors: (count: number) => `${count} incorrect relation ${count === 1 ? "sign" : "signs"}`,
    predictionCorrect: "Prediction correct",
    predictionIncorrect: "Prediction incorrect",
    completed: "All five cases checked",
    partial: "Checked cases were saved",
    detail: (score: number) => `Score earned: ${score}/100. There is no speed bonus or tap penalty.`,
    locked: "This loop round is complete",
    lockedDetail: "Your answers are locked. Wait for the teacher to reveal the results.",
    saving: "Saving answers…",
    saveError: "The answers could not be saved. Your progress is preserved.",
    retry: "Save again",
  },
} as const;

function isPredictionOptionId(value: unknown): value is PredictionOptionId {
  return typeof value === "string" && predictionOptionIds.includes(value as PredictionOptionId);
}

function selectedCasesMatch(payload: DraftPayload | undefined, round: LoopRepairCase[]) {
  return Array.isArray(payload?.selectedCaseIds)
    && payload.selectedCaseIds.join("|") === round.map((item) => item.id).join("|");
}

function restoredAttempts(draft: ModuleDraft | null | undefined, round: LoopRepairCase[]) {
  const payload = draft?.payload as DraftPayload | undefined;
  if (!selectedCasesMatch(payload, round)) return [];
  const isV3 = payload?.gameId === gameId;
  const isV2 = payload?.gameId === legacyV2GameId;
  const isV1 = payload?.gameId === legacyV1GameId;
  const values = (isV3 || isV2) && Array.isArray(payload?.attempts)
    ? payload.attempts
    : isV1 && Array.isArray(payload?.completions)
      ? payload.completions
      : null;
  if (!values) return [];

  const restored: LoopAttempt[] = [];
  for (const value of values) {
    if (!value || typeof value !== "object") break;
    const attempt = value as Partial<LoopAttempt>;
    const current = round[restored.length];
    if (!current || attempt.caseId !== current.id || typeof attempt.signature !== "string") break;
    if (isV1 && attempt.signature !== correctAnswerSignature(current)) break;
    const signature = isV3
      ? isValidAttemptSignature(current, attempt.signature) ? attempt.signature : null
      : normalizeLegacySignature(current, attempt.signature);
    if (!signature) break;
    const predictionChoiceId = isV3 && (attempt.predictionChoiceId === null || isPredictionOptionId(attempt.predictionChoiceId))
      ? attempt.predictionChoiceId
      : null;
    restored.push({ caseId: current.id, signature, predictionChoiceId });
  }
  return restored;
}

function restoredLinks(draft: ModuleDraft | null | undefined, item: LoopRepairCase, currentIndex: number, selectedIds: string[]) {
  const payload = draft?.payload as DraftPayload | undefined;
  const supported = payload?.gameId === gameId || payload?.gameId === legacyV2GameId || payload?.gameId === legacyV1GameId;
  if (!supported
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
    const reversedLegacyDirection = payload.gameId !== gameId && state.from === definition.to && state.to === definition.from;
    if (state.id !== definition.id
      || (!canonicalDirection && !reversedLegacyDirection)
      || (state.polarity !== "+" && state.polarity !== "-")) return initialLinkStates(item);
    states.push({ id: definition.id, from: definition.from, to: definition.to, polarity: state.polarity });
  }
  return states;
}

function restoredPrediction(draft: ModuleDraft | null | undefined, currentIndex: number, selectedIds: string[]) {
  const payload = draft?.payload as DraftPayload | undefined;
  return payload?.gameId === gameId
    && payload.currentIndex === currentIndex
    && Array.isArray(payload.selectedCaseIds)
    && payload.selectedCaseIds.join("|") === selectedIds.join("|")
    && isPredictionOptionId(payload.currentPredictionChoiceId)
    ? payload.currentPredictionChoiceId
    : null;
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
  const signBase = quadraticPoint(start, control, end, .5);
  const signOffset = bend === 0 ? 3 : Math.sign(bend) * 2.6;
  const signPoint = {
    x: Math.min(95, Math.max(5, signBase.x - unitY * signOffset)),
    y: Math.min(95, Math.max(5, signBase.y + unitX * signOffset)),
  };
  return {
    path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    signPoint,
  };
}

function LoopDiagram({ item, states, locked, review, flashKey, locale, onPolarity }: {
  item: LoopRepairCase;
  states: LoopLinkState[];
  locked: boolean;
  review: ReviewState | null;
  flashKey: string;
  locale: "tr" | "en";
  onPolarity: (linkId: string) => void;
}) {
  const text = copy[locale];
  const normalMarker = `loop-arrow-${item.id}-normal`;
  const correctMarker = `loop-arrow-${item.id}-correct`;
  const errorMarker = `loop-arrow-${item.id}-error`;
  const diagramCorrect = review?.errorIds.length === 0;

  return <div className={`loop-diagram ${item.nodes.length === 5 ? "five-node" : "four-node"} ${diagramCorrect ? "solved" : ""}`} data-case-id={item.id}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id={normalMarker} className="loop-marker-normal" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
        <marker id={correctMarker} className="loop-marker-correct" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
        <marker id={errorMarker} className="loop-marker-error" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
      </defs>
      {states.map((state, index) => {
        const definition = item.links[index]!;
        const geometry = edgeGeometry(item, definition);
        const error = Boolean(review?.errorIds.includes(state.id));
        const edgeState = review ? error ? "error" : "correct" : "normal";
        const marker = edgeState === "correct" ? correctMarker : edgeState === "error" ? errorMarker : normalMarker;
        return <path
          key={state.id}
          className={`loop-edge edge-${edgeState}`}
          data-link-id={state.id}
          data-direction="fixed"
          d={geometry.path}
          markerEnd={`url(#${marker})`}
        />;
      })}
    </svg>
    {item.nodes.map((node) => <div key={node.id} className={`loop-node ${diagramCorrect ? "node-solved" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }}><span>{node.label[locale]}</span></div>)}
    {states.map((state, index) => {
      const definition = item.links[index]!;
      const geometry = edgeGeometry(item, definition);
      const error = Boolean(review?.errorIds.includes(state.id));
      const controlState = review ? error ? "link-error" : "link-correct" : "";
      return <div key={state.id} className={controlState}>
        <button
          type="button"
          className={`loop-sign-control ${flashKey === state.id ? "changed" : ""}`}
          style={{ left: `${geometry.signPoint.x}%`, top: `${geometry.signPoint.y}%` } as CSSProperties}
          disabled={locked}
          data-link-id={state.id}
          data-control="polarity"
          aria-label={`${text.sign}: ${state.polarity}`}
          onClick={() => onPolarity(state.id)}
        ><b>{state.polarity === "+" ? "+" : "−"}</b></button>
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
  const [predictionChoice, setPredictionChoice] = useState<PredictionOptionId | null>(() => restoredPrediction(existingDraft, initialIndex, selectedIds));
  const [review, setReview] = useState<ReviewState | null>(null);
  const [flashKey, setFlashKey] = useState("");
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const attemptsRef = useRef(hydrated);
  const statesRef = useRef(states);
  const predictionRef = useRef(predictionChoice);
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

  const submissionFor = useCallback((checkedAttempts: LoopAttempt[], completionReason: "draft" | "completed" | "teacher-ended", currentIndex: number, currentLinks: LoopLinkState[], currentPredictionChoiceId: PredictionOptionId | null): ModuleSubmission => ({
    stage: 1,
    score: scoreLoopAttempts(round, checkedAttempts),
    payload: {
      gameId,
      selectedCaseIds: selectedIds,
      attempts: checkedAttempts,
      currentIndex,
      currentLinks,
      currentPredictionChoiceId,
      answeredCount: checkedAttempts.length,
      diagramCount: round.length,
      pointsPerDiagram: 12,
      pointsPerPrediction: 8,
      scoringRule: "12-sign-accuracy-plus-8-prediction-no-speed-or-tap-deduction",
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
    const submission = submissionFor(checkedAttempts, reason, Math.min(checkedAttempts.length, round.length - 1), statesRef.current, predictionRef.current);
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
    setPredictionChoice(null);
    predictionRef.current = null;
    setReview(null);
    lockedRef.current = false;
    void onDraft?.(submissionFor(checkedAttempts, "draft", nextIndex, nextStates, null));
  }, [completed, existingSubmission, finalize, forceSubmit, onDraft, round, submissionFor]);

  const applyPolarity = useCallback((linkId: string) => {
    if (lockedRef.current || completed || existingSubmission || forceSubmit) return;
    const nextStates = statesRef.current.map((state) => state.id !== linkId ? state : {
      ...state,
      polarity: (state.polarity === "+" ? "-" : "+") as Polarity,
    });
    setStates(nextStates);
    statesRef.current = nextStates;
    setFlashKey(linkId);
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashKey(""), 360);
    void onDraft?.(submissionFor(attemptsRef.current, "draft", index, nextStates, predictionRef.current));
  }, [completed, existingSubmission, forceSubmit, index, onDraft, submissionFor]);

  const selectPrediction = useCallback((choice: PredictionOptionId) => {
    if (lockedRef.current || completed || existingSubmission || forceSubmit) return;
    setPredictionChoice(choice);
    predictionRef.current = choice;
    void onDraft?.(submissionFor(attemptsRef.current, "draft", index, statesRef.current, choice));
  }, [completed, existingSubmission, forceSubmit, index, onDraft, submissionFor]);

  const checkCase = useCallback(() => {
    const choice = predictionRef.current;
    if (lockedRef.current || completed || existingSubmission || forceSubmit || !choice) return;
    lockedRef.current = true;
    const attempt: LoopAttempt = { caseId: current.id, signature: answerSignature(statesRef.current), predictionChoiceId: choice };
    const errorIds = incorrectLinkIds(current, statesRef.current);
    const points = scoreLoopAttempt(current, attempt);
    const nextAttempts = [...attemptsRef.current, attempt];
    attemptsRef.current = nextAttempts;
    setAttempts(nextAttempts);
    setReview({ errorIds, predictionCorrect: choice === current.prediction.correctOptionId, points });
    void onDraft?.(submissionFor(nextAttempts, "draft", index, statesRef.current, choice));
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

  const correctPrediction = current.prediction.options.find((option) => option.id === current.prediction.correctOptionId)!;
  const interactionLocked = Boolean(review) || completed || Boolean(existingSubmission) || Boolean(forceSubmit);

  return <section className="panel module-shell loop-repair-shell">
    <header className="loop-repair-header">
      <div><span className="module-title-chip">{text.title}</span><small>{loopGroupLabels[current.group][locale]}</small></div>
      <div className="loop-repair-stats"><span>{text.diagram} <b>{index + 1}/{round.length}</b></span><span>{text.score} <b>{currentScore}</b></span></div>
    </header>
    <div className="loop-repair-progress" aria-label={`${text.diagram} ${index + 1} / ${round.length}`}>{round.map((item, itemIndex) => <i key={item.id} className={itemIndex < attempts.length ? "done" : itemIndex === index ? "active" : ""} />)}</div>
    <p className="loop-repair-situation" data-i18n-skip>{current.situation[locale]}</p>
    <LoopDiagram item={current} states={states} locked={interactionLocked} review={review} flashKey={flashKey} locale={locale} onPolarity={applyPolarity} />
    <div className={`loop-prediction ${review ? "reviewing" : ""}`}>
      <div className="loop-prediction-head"><b>{text.predictionTitle}</b><strong data-i18n-skip>{current.prediction.question[locale]}</strong></div>
      <div className="loop-prediction-options">
        {current.prediction.options.map((option) => {
          const selected = predictionChoice === option.id;
          const correct = Boolean(review) && option.id === current.prediction.correctOptionId;
          const incorrect = Boolean(review) && selected && !correct;
          return <button
            type="button"
            key={option.id}
            className={`${selected ? "selected" : ""} ${correct ? "correct" : ""} ${incorrect ? "incorrect" : ""}`}
            disabled={interactionLocked}
            data-option-id={option.id}
            aria-pressed={selected}
            onClick={() => selectPrediction(option.id)}
          ><b>{option.id}</b><span data-i18n-skip>{option.text[locale]}</span></button>;
        })}
      </div>
      {review && <small className="loop-prediction-explanation" data-i18n-skip><b>{text.correctAnswer}: {correctPrediction.id} · {correctPrediction.text[locale]}.</b> {current.prediction.explanation[locale]}</small>}
    </div>
    <div className={`loop-repair-feedback ${review ? review.points === 20 ? "review-correct" : "review-incorrect" : "idle"}`} aria-live="polite">
      {!review ? <><div className="loop-repair-guidance"><strong>{text.instruction}</strong><small>{text.rule}</small></div><Button className="loop-repair-check" disabled={!predictionChoice} icon={<Check size={18} />} onClick={checkCase}>{text.check}</Button></> : <><span>{review.points === 20 ? <Check aria-hidden="true" /> : <CircleX aria-hidden="true" />} {text.points(review.points)}</span><div className="loop-repair-review-details"><b>{review.errorIds.length === 0 ? text.diagramCorrect : text.diagramErrors(review.errorIds.length)}</b><b>{review.predictionCorrect ? text.predictionCorrect : text.predictionIncorrect}</b></div></>}
    </div>
  </section>;
}
