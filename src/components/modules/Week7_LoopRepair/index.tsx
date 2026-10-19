"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowLeftRight, Check, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import {
  answerSignature,
  buildLoopRepairRound,
  correctAnswerSignature,
  initialLinkStates,
  isCaseSolved,
  loopGroupLabels,
  scoreLoopCompletions,
  type LoopCompletion,
  type LoopLink,
  type LoopLinkState,
  type LoopRepairCase,
  type Polarity,
} from "./loopRepairContent";

const gameId = "week-7-loop-repair-v1";
const solvedFeedbackDuration = 1100;

type DraftPayload = {
  gameId?: unknown;
  selectedCaseIds?: unknown;
  completions?: unknown;
  currentIndex?: unknown;
  currentLinks?: unknown;
};

const copy = {
  tr: {
    title: "HAFTA 7 · MODÜL 1",
    diagram: "Diyagram",
    score: "Puan",
    instruction: "İşarete veya yön kontrolüne dokun; bütün ilişkileri doğru hale getir.",
    rule: "Her tamamlanan diyagram 20 puan. Fazladan dokunuş puan düşürmez.",
    sign: "İlişki işaretini değiştir",
    direction: "Ok yönünü ters çevir",
    repaired: "Döngü onarıldı",
    completed: "Beş döngü de onarıldı",
    partial: "Tamamlanan döngüler kaydedildi",
    detail: "Her tamamen doğru diyagram 20 puandır; bu modülde hız bonusu yoktur.",
    locked: "Bu döngü turu tamamlandı",
    lockedDetail: "Yanıtların kilitlendi. Öğretmenin sonuçları açıklamasını bekle.",
    saving: "Onarımlar kaydediliyor…",
    saveError: "Onarımlar kaydedilemedi. İlerlemen korundu.",
    retry: "Tekrar kaydet",
    reinforcing: "R · Pekiştirici",
    balancing: "B · Dengeleyici",
  },
  en: {
    title: "WEEK 7 · MODULE 1",
    diagram: "Diagram",
    score: "Score",
    instruction: "Tap a sign or direction control and make every relation correct.",
    rule: "Each completed diagram is worth 20 points. Extra taps do not reduce the score.",
    sign: "Toggle relation sign",
    direction: "Reverse arrow direction",
    repaired: "Loop repaired",
    completed: "All five loops repaired",
    partial: "Completed loops were saved",
    detail: "Each fully correct diagram is worth 20 points; this module has no speed bonus.",
    locked: "This loop round is complete",
    lockedDetail: "Your answers are locked. Wait for the teacher to reveal the results.",
    saving: "Saving repairs…",
    saveError: "The repairs could not be saved. Your progress is preserved.",
    retry: "Save again",
    reinforcing: "R · Reinforcing",
    balancing: "B · Balancing",
  },
} as const;

function restoredCompletions(draft: ModuleDraft | null | undefined, round: LoopRepairCase[]) {
  const payload = draft?.payload as DraftPayload | undefined;
  if (payload?.gameId !== gameId || !Array.isArray(payload.selectedCaseIds) || payload.selectedCaseIds.join("|") !== round.map((item) => item.id).join("|") || !Array.isArray(payload.completions)) return [];
  const restored: LoopCompletion[] = [];
  for (const value of payload.completions) {
    if (!value || typeof value !== "object") break;
    const completion = value as Partial<LoopCompletion>;
    const current = round[restored.length];
    if (!current || completion.caseId !== current.id || completion.signature !== correctAnswerSignature(current)) break;
    restored.push({ caseId: completion.caseId, signature: completion.signature });
  }
  return restored;
}

function restoredLinks(draft: ModuleDraft | null | undefined, item: LoopRepairCase, currentIndex: number, selectedIds: string[]) {
  const payload = draft?.payload as DraftPayload | undefined;
  if (payload?.gameId !== gameId || payload.currentIndex !== currentIndex || !Array.isArray(payload.selectedCaseIds) || payload.selectedCaseIds.join("|") !== selectedIds.join("|") || !Array.isArray(payload.currentLinks) || payload.currentLinks.length !== item.links.length) return initialLinkStates(item);
  const nodeIds = new Set(item.nodes.map((node) => node.id));
  const states: LoopLinkState[] = [];
  for (let index = 0; index < item.links.length; index += 1) {
    const value = payload.currentLinks[index];
    if (!value || typeof value !== "object") return initialLinkStates(item);
    const state = value as Partial<LoopLinkState>;
    if (typeof state.id !== "string" || typeof state.from !== "string" || typeof state.to !== "string" || state.id !== item.links[index]?.id || !nodeIds.has(state.from) || !nodeIds.has(state.to) || state.from === state.to || (state.polarity !== "+" && state.polarity !== "-")) return initialLinkStates(item);
    states.push({ id: state.id, from: state.from, to: state.to, polarity: state.polarity });
  }
  return states;
}

function edgeGeometry(item: LoopRepairCase, state: LoopLinkState, definition: LoopLink) {
  const from = item.nodes.find((node) => node.id === state.from)!;
  const to = item.nodes.find((node) => node.id === state.to)!;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const unitX = dx / length;
  const unitY = dy / length;
  const start = { x: from.x + unitX * 9, y: from.y + unitY * 9 };
  const end = { x: to.x - unitX * 10, y: to.y - unitY * 10 };
  const bend = definition.bend ?? 0;
  const control = { x: (start.x + end.x) / 2 - unitY * bend, y: (start.y + end.y) / 2 + unitX * bend };
  const midpoint = {
    x: (start.x + 2 * control.x + end.x) / 4,
    y: (start.y + 2 * control.y + end.y) / 4,
  };
  return {
    path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    midpoint,
    vertical: Math.abs(dx) < Math.abs(dy),
    flat: Math.abs(dy) < Math.abs(dx) * .25,
  };
}

function LoopDiagram({ item, states, locked, solved, flashKey, locale, onPolarity, onDirection }: {
  item: LoopRepairCase;
  states: LoopLinkState[];
  locked: boolean;
  solved: boolean;
  flashKey: string;
  locale: "tr" | "en";
  onPolarity: (linkId: string) => void;
  onDirection: (linkId: string) => void;
}) {
  const text = copy[locale];
  const markerId = `loop-arrow-${item.id}`;
  return <div className={`loop-diagram ${item.nodes.length === 5 ? "five-node" : "four-node"} ${solved ? "solved" : ""}`} data-case-id={item.id}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs><marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>
      {states.map((state, index) => {
        const geometry = edgeGeometry(item, state, item.links[index]!);
        return <path key={state.id} className={`loop-edge ${solved ? "edge-solved" : ""}`} d={geometry.path} markerEnd={`url(#${markerId})`} />;
      })}
    </svg>
    {item.nodes.map((node) => <div key={node.id} className={`loop-node ${solved ? "node-solved" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }}><span>{node.label[locale]}</span></div>)}
    {states.map((state, index) => {
      const definition = item.links[index]!;
      const geometry = edgeGeometry(item, state, definition);
      return <div
        key={state.id}
        className={`loop-edge-controls ${geometry.vertical ? "vertical" : "horizontal"} ${geometry.flat ? "flat" : ""}`}
        style={{ left: `${geometry.midpoint.x}%`, top: `${geometry.midpoint.y}%` } as CSSProperties}
      >
        <button
          type="button"
          className={`loop-sign-control ${flashKey === `${state.id}:sign` ? "changed" : ""}`}
          disabled={locked}
          data-link-id={state.id}
          data-control="polarity"
          aria-label={`${text.sign}: ${state.polarity}`}
          onClick={() => onPolarity(state.id)}
        ><b>{state.polarity === "+" ? "+" : "−"}</b></button>
        <button
          type="button"
          className={`loop-direction-control ${flashKey === `${state.id}:direction` ? "changed" : ""}`}
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
  const hydrated = useMemo(() => restoredCompletions(existingDraft, round), [existingDraft, round]);
  const initialIndex = Math.min(hydrated.length, round.length - 1);
  const [index, setIndex] = useState(initialIndex);
  const [completions, setCompletions] = useState(hydrated);
  const [states, setStates] = useState(() => restoredLinks(existingDraft, round[initialIndex]!, initialIndex, selectedIds));
  const [solved, setSolved] = useState(hydrated.length === round.length);
  const [flashKey, setFlashKey] = useState("");
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const completionsRef = useRef(hydrated);
  const statesRef = useRef(states);
  const lockedRef = useRef(hydrated.length === round.length);
  const submissionStarted = useRef(false);
  const advanceTimer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);
  const current = round[index]!;
  const currentScore = scoreLoopCompletions(round, completions);

  const clearTimers = useCallback(() => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    advanceTimer.current = null;
    flashTimer.current = null;
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const submissionFor = useCallback((completedItems: LoopCompletion[], completionReason: "draft" | "completed" | "teacher-ended", currentIndex: number, currentLinks: LoopLinkState[]): ModuleSubmission => ({
    stage: 1,
    score: scoreLoopCompletions(round, completedItems),
    payload: {
      gameId,
      selectedCaseIds: selectedIds,
      completions: completedItems,
      currentIndex,
      currentLinks,
      answeredCount: completedItems.length,
      diagramCount: round.length,
      pointsPerDiagram: 20,
      scoringRule: "20-per-solved-diagram-no-tap-deduction",
      completionReason,
    },
  }), [round, selectedIds]);

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true);
    setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) setSubmitFailed(true);
  }, [onSubmit]);

  const finalize = useCallback(async (completedItems: LoopCompletion[], reason: "completed" | "teacher-ended") => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true;
    lockedRef.current = true;
    clearTimers();
    const submission = submissionFor(completedItems, reason, Math.min(completedItems.length, round.length - 1), statesRef.current);
    setCompletions(completedItems);
    setFinalSubmission(submission);
    setCompleted(true);
    await submitResult(submission);
  }, [clearTimers, existingSubmission, round.length, submissionFor, submitResult]);

  const advance = useCallback((completedItems: LoopCompletion[]) => {
    if (completed || existingSubmission || forceSubmit || submissionStarted.current) return;
    if (completedItems.length >= round.length) {
      void finalize(completedItems, "completed");
      return;
    }
    const nextIndex = completedItems.length;
    const nextStates = initialLinkStates(round[nextIndex]!);
    setIndex(nextIndex);
    setStates(nextStates);
    statesRef.current = nextStates;
    setSolved(false);
    lockedRef.current = false;
    void onDraft?.(submissionFor(completedItems, "draft", nextIndex, nextStates));
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

    if (!isCaseSolved(current, nextStates)) {
      void onDraft?.(submissionFor(completionsRef.current, "draft", index, nextStates));
      return;
    }

    lockedRef.current = true;
    const nextCompletions = [...completionsRef.current, { caseId: current.id, signature: answerSignature(nextStates) }];
    completionsRef.current = nextCompletions;
    setCompletions(nextCompletions);
    setSolved(true);
    void onDraft?.(submissionFor(nextCompletions, "draft", index, nextStates));
    advanceTimer.current = window.setTimeout(() => advance(nextCompletions), solvedFeedbackDuration);
  }, [advance, completed, current, existingSubmission, forceSubmit, index, onDraft, submissionFor]);

  useEffect(() => {
    if (hydrated.length === round.length && !existingSubmission && !completed) void finalize(hydrated, "completed");
  }, [completed, existingSubmission, finalize, hydrated, round.length]);

  useEffect(() => {
    if (forceSubmit && !completed && !existingSubmission) void finalize(completionsRef.current, "teacher-ended");
  }, [completed, existingSubmission, finalize, forceSubmit]);

  if (existingSubmission && !completed) return <section className="panel module-shell loop-repair-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  if (completed) return <section className="panel module-shell loop-repair-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><Sparkles size={42} /><h2>{completions.length === round.length ? text.completed : text.partial}</h2><p>{text.detail}</p>{submitting && <div className="notice">{text.saving}</div>}{submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>{text.retry}</Button></>}</div></section>;

  return <section className="panel module-shell loop-repair-shell">
    <header className="loop-repair-header">
      <div><span className="module-title-chip">{text.title}</span><small>{loopGroupLabels[current.group][locale]}</small></div>
      <div className="loop-repair-stats"><span>{text.diagram} <b>{index + 1}/{round.length}</b></span><span>{text.score} <b>{currentScore}</b></span></div>
    </header>
    <div className="loop-repair-progress" aria-label={`${text.diagram} ${index + 1} / ${round.length}`}>{round.map((item, itemIndex) => <i key={item.id} className={itemIndex < completions.length ? "done" : itemIndex === index ? "active" : ""} />)}</div>
    <p className="loop-repair-situation" data-i18n-skip>{current.situation[locale]}</p>
    <LoopDiagram item={current} states={states} locked={solved || completed || Boolean(existingSubmission) || Boolean(forceSubmit)} solved={solved} flashKey={flashKey} locale={locale} onPolarity={(linkId) => applyChange(linkId, "sign")} onDirection={(linkId) => applyChange(linkId, "direction")} />
    <div className={`loop-repair-feedback ${solved ? "visible" : ""}`} aria-live="polite">
      {solved ? <><span><Check aria-hidden="true" /> {text.repaired}</span><div className="loop-repair-types">{current.loops.map((loop, loopIndex) => <b key={`${loop.type}:${loopIndex}`}>{loop.type === "R" ? text.reinforcing : text.balancing}</b>)}</div><p data-i18n-skip>{current.explanation[locale]}</p></> : <><strong>{text.instruction}</strong><small>{text.rule}</small></>}
    </div>
  </section>;
}
