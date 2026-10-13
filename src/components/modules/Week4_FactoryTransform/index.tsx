"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { AlertTriangle, Boxes, Check, Cog, LockKeyhole, MousePointerClick, Radio, RotateCcw, Users, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import {
  buildFactoryRound,
  clampMetric,
  factoryZoneLabels,
  type FactoryEffectType,
  type FactoryMetrics,
  type FactoryOption,
  type FactoryStageId,
  type FactoryZone,
} from "./factoryContent";

type Phase = "decision" | "outcome" | "recovery-choice";
type RecoveryOutcome = "not-needed" | "recovered" | "second-wrong" | "timeout" | "teacher-ended";

type FactoryAnswer = {
  scenarioId: string;
  stageId: FactoryStageId;
  roundId: number;
  offeredOptionIds: string[];
  firstOptionId: string;
  firstCorrect: boolean;
  recoveryOptionId: string | null;
  recoveryCorrectOption: boolean | null;
  clickedRepairZones: FactoryZone[];
  repairZone: FactoryZone;
  recoveryOutcome: RecoveryOutcome;
  points: number;
  effectType: FactoryEffectType;
};

type InProgress = {
  scenarioId: string;
  firstOptionId: string;
  recoveryOptionId: string | null;
  clickedRepairZones: FactoryZone[];
  deadlineEpoch: number;
};

type DraftPayload = {
  answers?: unknown;
  currentIndex?: unknown;
  metrics?: unknown;
  phase?: unknown;
  inProgress?: unknown;
  selectedOptionId?: unknown;
  activeEffect?: unknown;
  notification?: unknown;
};

const initialMetrics: FactoryMetrics = { production: 50, adaptation: 50, participation: 50 };
const recoveryWindowMs = 5000;

const copy = {
  tr: {
    title: "Hafta 4 · Modül 1: Fabrikayı Dönüştür",
    inspect: "Fabrikayı incele, karar ver; gerekirse 5 saniyede kurtar!",
    decision: "Karar",
    inspectHint: "Fabrikadaki işaretlere dokun, sorunu araştır.",
    choose: "Kararın",
    recoveryChoice: "Kurtarma modu: Kalan iki karardan doğru olanı seç.",
    recoveryTime: "Kurtarma süresi",
    eliminated: "elendi",
    repaired: "Fabrikayı zamanında kurtardın! +4 puan",
    secondWrong: "İkinci karar da sorunu çözemedi.",
    timeout: "Kurtarma süresi doldu.",
    locked: "Bu modül tamamlandı",
    lockedDetail: "Kararların kilitlendi. Öğretmen sonuçları açıklayana kadar bekleyin.",
    saving: "Yanıt kaydediliyor…",
    saveError: "Yanıt kaydedilemedi. İlerlemen korundu.",
    retry: "Kaydı tekrar dene",
  },
  en: {
    title: "Week 4 · Module 1: Transform the Factory",
    inspect: "Inspect the factory, decide, and rescue it in 5 seconds if needed!",
    decision: "Decision",
    inspectHint: "Tap the factory markers and investigate the problem.",
    choose: "Your decision",
    recoveryChoice: "Rescue mode: choose the correct one of the two remaining decisions.",
    recoveryTime: "Rescue time",
    eliminated: "eliminated",
    repaired: "You rescued the factory in time! +4 points",
    secondWrong: "The second decision did not solve the problem either.",
    timeout: "The rescue window expired.",
    locked: "This module is complete",
    lockedDetail: "Your decisions are locked. Wait until the teacher reveals the results.",
    saving: "Saving your answer…",
    saveError: "The answer could not be saved. Your progress is preserved.",
    retry: "Try saving again",
  },
} as const;

function isZone(value: unknown): value is FactoryZone {
  return value === "machine" || value === "sensor" || value === "workers";
}

function isEffect(value: unknown): value is FactoryEffectType {
  return ["organized", "overdrive", "jam", "feedback", "blind", "shortage", "cooperate", "conflict", "pollution", "recover"].includes(String(value));
}

function answersFromPayload(payload: DraftPayload | undefined): FactoryAnswer[] {
  const value = payload?.answers;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is FactoryAnswer => {
    if (!item || typeof item !== "object") return false;
    const answer = item as Partial<FactoryAnswer>;
    return typeof answer.scenarioId === "string" && typeof answer.firstOptionId === "string" && typeof answer.points === "number";
  });
}

function answersFromDraft(draft: ModuleDraft | null | undefined) {
  return answersFromPayload(draft?.payload as DraftPayload | undefined);
}

function metricsFromDraft(draft: ModuleDraft | null | undefined): FactoryMetrics {
  const value = (draft?.payload as DraftPayload | undefined)?.metrics;
  if (!value || typeof value !== "object") return initialMetrics;
  const candidate = value as Partial<FactoryMetrics>;
  if ([candidate.production, candidate.adaptation, candidate.participation].every((item) => typeof item === "number")) {
    return { production: clampMetric(candidate.production!), adaptation: clampMetric(candidate.adaptation!), participation: clampMetric(candidate.participation!) };
  }
  return initialMetrics;
}

function inProgressFromDraft(draft: ModuleDraft | null | undefined): InProgress | null {
  const value = (draft?.payload as DraftPayload | undefined)?.inProgress;
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<InProgress>;
  if (typeof candidate.scenarioId !== "string" || typeof candidate.firstOptionId !== "string" || typeof candidate.deadlineEpoch !== "number") return null;
  return {
    scenarioId: candidate.scenarioId,
    firstOptionId: candidate.firstOptionId,
    recoveryOptionId: typeof candidate.recoveryOptionId === "string" ? candidate.recoveryOptionId : null,
    clickedRepairZones: Array.isArray(candidate.clickedRepairZones) ? candidate.clickedRepairZones.filter(isZone) : [],
    deadlineEpoch: candidate.deadlineEpoch,
  };
}

function applyMetrics(current: FactoryMetrics, delta: FactoryMetrics) {
  return {
    production: clampMetric(current.production + delta.production),
    adaptation: clampMetric(current.adaptation + delta.adaptation),
    participation: clampMetric(current.participation + delta.participation),
  };
}

function FactoryScene({
  effect,
  inspectedZone,
  inspectedHint,
  onZone,
  locale,
}: {
  effect: FactoryEffectType | null;
  inspectedZone: FactoryZone | null;
  inspectedHint: string | null;
  onZone: (zone: FactoryZone) => void;
  locale: "tr" | "en";
}) {
  return <div className={`factory-scene ${effect ? `effect-${effect}` : ""}`}>
    <div className="factory-sky"><span /><span /><span /></div>
    <div className="factory-building"><b>SYS LAB</b><i /><i /><i /></div>
    <div className="factory-smoke" aria-hidden="true"><i /><i /><i /></div>
    <div className="factory-conveyor" aria-hidden="true"><div className="factory-belt"><i /><i /><i /><i /></div><span className="factory-package p1"><Boxes size={22} /></span><span className="factory-package p2"><Boxes size={22} /></span><span className="factory-package p3"><Boxes size={22} /></span></div>
    <button type="button" className={`factory-zone machine ${inspectedZone === "machine" ? "inspected" : ""}`} onClick={() => onZone("machine")} aria-label={factoryZoneLabels.machine[locale]} aria-expanded={inspectedZone === "machine" && Boolean(inspectedHint)} aria-controls={inspectedZone === "machine" && inspectedHint ? "factory-hint-machine" : undefined}>
      <span className="factory-machine"><Cog className="gear main" /><Cog className="gear small" /><i className="machine-light" /></span><span className="factory-zone-attention" aria-hidden="true"><MousePointerClick /><i>1</i></span><b><Cog size={15} /> {factoryZoneLabels.machine[locale]}</b>
      {inspectedZone === "machine" && inspectedHint && <span id="factory-hint-machine" className="factory-zone-hint" role="status" data-i18n-skip>{inspectedHint}</span>}
    </button>
    <button type="button" className={`factory-zone sensor ${inspectedZone === "sensor" ? "inspected" : ""}`} onClick={() => onZone("sensor")} aria-label={factoryZoneLabels.sensor[locale]} aria-expanded={inspectedZone === "sensor" && Boolean(inspectedHint)} aria-controls={inspectedZone === "sensor" && inspectedHint ? "factory-hint-sensor" : undefined}>
      <span className="factory-sensor"><Radio /><i /><i /><i /></span><span className="factory-zone-attention" aria-hidden="true"><MousePointerClick /><i>1</i></span><b><Radio size={15} /> {factoryZoneLabels.sensor[locale]}</b>
      {inspectedZone === "sensor" && inspectedHint && <span id="factory-hint-sensor" className="factory-zone-hint" role="status" data-i18n-skip>{inspectedHint}</span>}
    </button>
    <button type="button" className={`factory-zone workers ${inspectedZone === "workers" ? "inspected" : ""}`} onClick={() => onZone("workers")} aria-label={factoryZoneLabels.workers[locale]} aria-expanded={inspectedZone === "workers" && Boolean(inspectedHint)} aria-controls={inspectedZone === "workers" && inspectedHint ? "factory-hint-workers" : undefined}>
      <span className="factory-workers"><i /><i /><i /></span><span className="factory-zone-attention" aria-hidden="true"><MousePointerClick /><i>1</i></span><b><Users size={15} /> {factoryZoneLabels.workers[locale]}</b>
      {inspectedZone === "workers" && inspectedHint && <span id="factory-hint-workers" className="factory-zone-hint" role="status" data-i18n-skip>{inspectedHint}</span>}
    </button>
    <div className="factory-stock" aria-hidden="true"><Boxes /><Boxes /><Boxes /></div>
    <div className="factory-feedback-line" aria-hidden="true"><span>•••••</span></div>
    <div className="factory-fault" aria-hidden="true"><AlertTriangle /></div>
  </div>;
}

export function Week4FactoryTransform({
  onSubmit,
  onDraft,
  existingSubmission,
  existingDraft,
  forceSubmit,
  seedKey,
}: LearningModuleProps & { seedKey: string }) {
  const { locale } = useI18n();
  const t = copy[locale];
  const scenarios = useMemo(() => buildFactoryRound(seedKey), [seedKey]);
  const draftPayload = existingDraft?.payload as DraftPayload | undefined;
  const hydratedAnswers = useMemo(() => answersFromDraft(existingDraft), [existingDraft]);
  const hydratedProgress = useMemo(() => inProgressFromDraft(existingDraft), [existingDraft]);
  const legacyRepairDraft = draftPayload?.phase === "recovery-repair" && Boolean(hydratedProgress);
  const initialIndex = typeof draftPayload?.currentIndex === "number" ? Math.max(0, Math.min(scenarios.length - 1, draftPayload.currentIndex)) : Math.min(hydratedAnswers.length, scenarios.length - 1);
  const initialPhase: Phase = draftPayload?.phase === "outcome" || draftPayload?.phase === "recovery-choice" ? draftPayload.phase : legacyRepairDraft ? "recovery-choice" : "decision";
  const [index, setIndex] = useState(initialIndex);
  const [, setAnswers] = useState<FactoryAnswer[]>(hydratedAnswers);
  const [metrics, setMetrics] = useState<FactoryMetrics>(() => metricsFromDraft(existingDraft));
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [inProgress, setInProgress] = useState<InProgress | null>(hydratedProgress);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(typeof draftPayload?.selectedOptionId === "string" ? draftPayload.selectedOptionId : null);
  const [activeEffect, setActiveEffect] = useState<FactoryEffectType | null>(isEffect(draftPayload?.activeEffect) ? draftPayload.activeEffect : null);
  const [notification, setNotification] = useState(typeof draftPayload?.notification === "string" ? draftPayload.notification : "");
  const [inspectedZone, setInspectedZone] = useState<FactoryZone | null>(null);
  const [remainingMs, setRemainingMs] = useState(() => hydratedProgress ? Math.max(0, hydratedProgress.deadlineEpoch - Date.now()) : recoveryWindowMs);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const answersRef = useRef(hydratedAnswers);
  const metricsRef = useRef(metrics);
  const phaseRef = useRef<Phase>(initialPhase);
  const inProgressRef = useRef<InProgress | null>(hydratedProgress);
  const actionLocked = useRef(false);
  const submissionStarted = useRef(false);
  const deadlinePerf = useRef<number | null>(null);
  const activeDeadlineEpoch = useRef<number | null>(null);
  const timeoutResolver = useRef<() => void>(() => undefined);
  const advanceTimer = useRef<number | null>(null);
  const legacyRepairRestored = useRef(false);
  const reduceMotion = useReducedMotion();
  const current = scenarios[index]!;

  const submissionFor = useCallback((
    nextAnswers: FactoryAnswer[],
    nextMetrics: FactoryMetrics,
    completionReason: "completed" | "teacher-ended" | "draft",
    nextIndex: number,
    nextPhase: Phase,
    nextProgress: InProgress | null,
    nextSelected: string | null,
    nextEffect: FactoryEffectType | null,
    nextNotification: string,
  ): ModuleSubmission => ({
    stage: Math.min(3, Math.floor(nextIndex / 3) + 1),
    score: nextAnswers.reduce((total, answer) => total + answer.points, 0),
    payload: {
      mode: "factory-transformation",
      gameId: "week-4-factory-transformation-v1",
      selectedScenarioIds: scenarios.map((scenario) => scenario.id),
      offeredQuestions: scenarios.map((scenario) => ({ scenarioId: scenario.id, stageId: scenario.stage, optionIds: scenario.options.map((option) => option.id) })),
      answers: nextAnswers,
      currentIndex: nextIndex,
      currentScenarioId: scenarios[nextIndex]?.id ?? null,
      currentStageId: scenarios[nextIndex]?.stage ?? null,
      currentRoundId: nextIndex % 3 + 1,
      metrics: nextMetrics,
      phase: nextPhase,
      inProgress: nextProgress,
      selectedOptionId: nextSelected,
      activeEffect: nextEffect,
      notification: nextNotification,
      firstCorrectCount: nextAnswers.filter((answer) => answer.firstCorrect).length,
      recoveredCount: nextAnswers.filter((answer) => answer.recoveryOutcome === "recovered").length,
      unrecoveredCount: nextAnswers.filter((answer) => answer.recoveryOutcome === "second-wrong" || answer.recoveryOutcome === "timeout").length,
      answeredCount: nextAnswers.length,
      decisionCount: scenarios.length,
      maxBaseScore: 90,
      recoveryWindowMs,
      completionReason,
      completionStatus: completionReason === "completed" ? "completed" : completionReason === "teacher-ended" ? "incomplete" : "draft",
    },
  }), [scenarios]);

  const saveDraft = useCallback((nextAnswers: FactoryAnswer[], nextMetrics: FactoryMetrics, nextIndex: number, nextPhase: Phase, nextProgress: InProgress | null, nextSelected: string | null, nextEffect: FactoryEffectType | null, nextNotification: string) => {
    void onDraft?.(submissionFor(nextAnswers, nextMetrics, "draft", nextIndex, nextPhase, nextProgress, nextSelected, nextEffect, nextNotification));
  }, [onDraft, submissionFor]);

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true);
    setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) setSubmitFailed(true);
  }, [onSubmit]);

  const finalize = useCallback(async (nextAnswers: FactoryAnswer[], completionReason: "completed" | "teacher-ended", nextMetrics = metricsRef.current) => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true;
    actionLocked.current = true;
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    const submission = submissionFor(nextAnswers, nextMetrics, completionReason, index, "outcome", null, null, activeEffect, notification);
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    setFinalSubmission(submission);
    setCompleted(true);
    await submitResult(submission);
  }, [activeEffect, existingSubmission, index, notification, submissionFor, submitResult]);

  const commitResolvedAnswer = useCallback((answer: FactoryAnswer, nextMetrics: FactoryMetrics, nextEffect: FactoryEffectType, nextNotification: string) => {
    if (answersRef.current.some((item) => item.scenarioId === answer.scenarioId)) return;
    const nextAnswers = [...answersRef.current, answer];
    answersRef.current = nextAnswers;
    metricsRef.current = nextMetrics;
    phaseRef.current = "outcome";
    inProgressRef.current = null;
    activeDeadlineEpoch.current = null;
    deadlinePerf.current = null;
    setAnswers(nextAnswers);
    setMetrics(nextMetrics);
    setPhase("outcome");
    setInProgress(null);
    setActiveEffect(nextEffect);
    setNotification(nextNotification);
    setRemainingMs(0);
    saveDraft(nextAnswers, nextMetrics, index, "outcome", null, answer.recoveryOptionId ?? answer.firstOptionId, nextEffect, nextNotification);
  }, [index, saveDraft]);

  useEffect(() => {
    if (!legacyRepairDraft || legacyRepairRestored.current || completed || existingSubmission || forceSubmit) return;
    legacyRepairRestored.current = true;
    const progress = inProgressRef.current;
    if (!progress || progress.scenarioId !== current.id) {
      phaseRef.current = "decision";
      inProgressRef.current = null;
      setPhase("decision");
      setInProgress(null);
      setSelectedOptionId(null);
      setActiveEffect(null);
      setRemainingMs(recoveryWindowMs);
      saveDraft(answersRef.current, metricsRef.current, index, "decision", null, null, null, "");
      return;
    }
    const first = current.options.find((option) => option.id === progress.firstOptionId);
    const recovery = current.options.find((option) => option.id === progress.recoveryOptionId);
    if (!first) {
      phaseRef.current = "decision";
      inProgressRef.current = null;
      setPhase("decision");
      setInProgress(null);
      setSelectedOptionId(null);
      setActiveEffect(null);
      setRemainingMs(recoveryWindowMs);
      saveDraft(answersRef.current, metricsRef.current, index, "decision", null, null, null, "");
      return;
    }
    activeDeadlineEpoch.current = null;
    deadlinePerf.current = null;
    setRemainingMs(0);
    if (recovery?.isCorrect) {
      const nextMetrics = applyMetrics(metricsRef.current, { production: 6, adaptation: 6, participation: 6 });
      commitResolvedAnswer({
        scenarioId: current.id,
        stageId: current.stage,
        roundId: index % 3 + 1,
        offeredOptionIds: current.options.map((option) => option.id),
        firstOptionId: progress.firstOptionId,
        firstCorrect: false,
        recoveryOptionId: recovery.id,
        recoveryCorrectOption: true,
        clickedRepairZones: progress.clickedRepairZones,
        repairZone: current.repairZone,
        recoveryOutcome: "recovered",
        points: 4,
        effectType: "recover",
      }, nextMetrics, "recover", t.repaired);
      setSelectedOptionId(recovery.id);
      return;
    }
    commitResolvedAnswer({
      scenarioId: current.id,
      stageId: current.stage,
      roundId: index % 3 + 1,
      offeredOptionIds: current.options.map((option) => option.id),
      firstOptionId: progress.firstOptionId,
      firstCorrect: false,
      recoveryOptionId: recovery?.id ?? null,
      recoveryCorrectOption: recovery ? false : null,
      clickedRepairZones: progress.clickedRepairZones,
      repairZone: current.repairZone,
      recoveryOutcome: recovery ? "second-wrong" : "timeout",
      points: 0,
      effectType: first.effectType,
    }, metricsRef.current, first.effectType, recovery ? t.secondWrong : t.timeout);
  }, [commitResolvedAnswer, completed, current, existingSubmission, forceSubmit, index, legacyRepairDraft, saveDraft, t.repaired, t.secondWrong, t.timeout]);

  const resolveTimeout = useCallback(() => {
    if (phaseRef.current !== "recovery-choice") return;
    const progress = inProgressRef.current;
    if (!progress || progress.scenarioId !== current.id) return;
    const first = current.options.find((option) => option.id === progress.firstOptionId);
    if (!first) return;
    commitResolvedAnswer({
      scenarioId: current.id,
      stageId: current.stage,
      roundId: index % 3 + 1,
      offeredOptionIds: current.options.map((option) => option.id),
      firstOptionId: progress.firstOptionId,
      firstCorrect: false,
      recoveryOptionId: progress.recoveryOptionId,
      recoveryCorrectOption: progress.recoveryOptionId ? current.options.find((option) => option.id === progress.recoveryOptionId)?.isCorrect ?? false : null,
      clickedRepairZones: progress.clickedRepairZones,
      repairZone: current.repairZone,
      recoveryOutcome: "timeout",
      points: 0,
      effectType: first.effectType,
    }, metricsRef.current, first.effectType, t.timeout);
  }, [commitResolvedAnswer, current, index, t.timeout]);

  useEffect(() => {
    timeoutResolver.current = resolveTimeout;
  }, [resolveTimeout]);

  useEffect(() => {
    if (phase !== "recovery-choice" || !inProgress) return;
    if (activeDeadlineEpoch.current !== inProgress.deadlineEpoch) {
      const remaining = Math.max(0, inProgress.deadlineEpoch - Date.now());
      activeDeadlineEpoch.current = inProgress.deadlineEpoch;
      deadlinePerf.current = performance.now() + remaining;
    }
    const tick = () => {
      const next = Math.max(0, (deadlinePerf.current ?? performance.now()) - performance.now());
      setRemainingMs(next);
      if (next <= 0) timeoutResolver.current();
    };
    tick();
    const timer = window.setInterval(tick, 50);
    return () => window.clearInterval(timer);
  }, [inProgress, phase]);

  useEffect(() => {
    if (!forceSubmit || completed || existingSubmission || submissionStarted.current) return;
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    let finalAnswers = answersRef.current;
    const progress = inProgressRef.current;
    if (progress && !finalAnswers.some((answer) => answer.scenarioId === progress.scenarioId)) {
      const scenario = scenarios.find((item) => item.id === progress.scenarioId);
      const first = scenario?.options.find((option) => option.id === progress.firstOptionId);
      if (scenario && first) finalAnswers = [...finalAnswers, {
        scenarioId: scenario.id,
        stageId: scenario.stage,
        roundId: scenarios.indexOf(scenario) % 3 + 1,
        offeredOptionIds: scenario.options.map((option) => option.id),
        firstOptionId: progress.firstOptionId,
        firstCorrect: false,
        recoveryOptionId: progress.recoveryOptionId,
        recoveryCorrectOption: progress.recoveryOptionId ? scenario.options.find((option) => option.id === progress.recoveryOptionId)?.isCorrect ?? false : null,
        clickedRepairZones: progress.clickedRepairZones,
        repairZone: scenario.repairZone,
        recoveryOutcome: "teacher-ended",
        points: 0,
        effectType: first.effectType,
      }];
    }
    void finalize(finalAnswers, "teacher-ended");
  }, [completed, existingSubmission, finalize, forceSubmit, scenarios]);

  const chooseOption = useCallback((option: FactoryOption) => {
    if (completed || existingSubmission || forceSubmit || actionLocked.current) return;
    if (phaseRef.current === "decision") {
      actionLocked.current = true;
      setSelectedOptionId(option.id);
      setActiveEffect(option.effectType);
      setNotification(option.notification[locale]);
      const changedMetrics = applyMetrics(metricsRef.current, option.metrics);
      metricsRef.current = changedMetrics;
      setMetrics(changedMetrics);
      if (option.isCorrect) {
        commitResolvedAnswer({
          scenarioId: current.id,
          stageId: current.stage,
          roundId: index % 3 + 1,
          offeredOptionIds: current.options.map((item) => item.id),
          firstOptionId: option.id,
          firstCorrect: true,
          recoveryOptionId: null,
          recoveryCorrectOption: null,
          clickedRepairZones: [],
          repairZone: current.repairZone,
          recoveryOutcome: "not-needed",
          points: 10,
          effectType: option.effectType,
        }, changedMetrics, option.effectType, option.notification[locale]);
        actionLocked.current = false;
        return;
      }
      const deadlineEpoch = Date.now() + recoveryWindowMs;
      const progress: InProgress = { scenarioId: current.id, firstOptionId: option.id, recoveryOptionId: null, clickedRepairZones: [], deadlineEpoch };
      inProgressRef.current = progress;
      phaseRef.current = "recovery-choice";
      activeDeadlineEpoch.current = deadlineEpoch;
      deadlinePerf.current = performance.now() + recoveryWindowMs;
      setInProgress(progress);
      setPhase("recovery-choice");
      setRemainingMs(recoveryWindowMs);
      saveDraft(answersRef.current, changedMetrics, index, "recovery-choice", progress, option.id, option.effectType, option.notification[locale]);
      actionLocked.current = false;
      return;
    }

    if (phaseRef.current !== "recovery-choice" || !inProgressRef.current || option.id === inProgressRef.current.firstOptionId) return;
    if ((deadlinePerf.current ?? 0) <= performance.now()) { resolveTimeout(); return; }
    actionLocked.current = true;
    const progress = { ...inProgressRef.current, recoveryOptionId: option.id };
    inProgressRef.current = progress;
    setInProgress(progress);
    setSelectedOptionId(option.id);
    if (option.isCorrect) {
      activeDeadlineEpoch.current = null;
      deadlinePerf.current = null;
      setRemainingMs(0);
      const nextMetrics = applyMetrics(metricsRef.current, { production: 6, adaptation: 6, participation: 6 });
      commitResolvedAnswer({
        scenarioId: current.id,
        stageId: current.stage,
        roundId: index % 3 + 1,
        offeredOptionIds: current.options.map((item) => item.id),
        firstOptionId: progress.firstOptionId,
        firstCorrect: false,
        recoveryOptionId: option.id,
        recoveryCorrectOption: true,
        clickedRepairZones: progress.clickedRepairZones,
        repairZone: current.repairZone,
        recoveryOutcome: "recovered",
        points: 4,
        effectType: "recover",
      }, nextMetrics, "recover", t.repaired);
      setInspectedZone(null);
      actionLocked.current = false;
      return;
    }
    const nextMetrics = applyMetrics(metricsRef.current, option.metrics);
    commitResolvedAnswer({
      scenarioId: current.id,
      stageId: current.stage,
      roundId: index % 3 + 1,
      offeredOptionIds: current.options.map((item) => item.id),
      firstOptionId: progress.firstOptionId,
      firstCorrect: false,
      recoveryOptionId: option.id,
      recoveryCorrectOption: false,
      clickedRepairZones: progress.clickedRepairZones,
      repairZone: current.repairZone,
      recoveryOutcome: "second-wrong",
      points: 0,
      effectType: option.effectType,
    }, nextMetrics, option.effectType, t.secondWrong);
    actionLocked.current = false;
  }, [commitResolvedAnswer, completed, current, existingSubmission, forceSubmit, index, locale, resolveTimeout, saveDraft, t.repaired, t.secondWrong]);

  const handleZone = useCallback((zone: FactoryZone) => {
    if (completed || existingSubmission || forceSubmit) return;
    setInspectedZone(zone);
  }, [completed, existingSubmission, forceSubmit]);

  const advance = useCallback(() => {
    if (phaseRef.current !== "outcome" || completed || existingSubmission || forceSubmit) return;
    if (index === scenarios.length - 1) {
      void finalize(answersRef.current, "completed");
      return;
    }
    const nextIndex = index + 1;
    actionLocked.current = false;
    phaseRef.current = "decision";
    setIndex(nextIndex);
    setPhase("decision");
    setSelectedOptionId(null);
    setActiveEffect(null);
    setNotification("");
    setInspectedZone(null);
    setInProgress(null);
    setRemainingMs(recoveryWindowMs);
    saveDraft(answersRef.current, metricsRef.current, nextIndex, "decision", null, null, null, "");
  }, [completed, existingSubmission, finalize, forceSubmit, index, saveDraft, scenarios.length]);

  useEffect(() => {
    if (phase !== "outcome" || completed || existingSubmission || forceSubmit) return;
    const outcome = answersRef.current.find((answer) => answer.scenarioId === current.id);
    const delay = reduceMotion ? 80 : outcome?.recoveryOutcome === "recovered" ? 750 : 900;
    advanceTimer.current = window.setTimeout(advance, delay);
    return () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    };
  }, [advance, completed, current.id, existingSubmission, forceSubmit, phase, reduceMotion]);

  if (existingSubmission && !completed) {
    return <section className="panel module-shell factory-transform-shell"><div className="module-title-chip">{t.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{t.locked}</h2><p>{t.lockedDetail}</p></div></section>;
  }

  const progress = inProgress;
  const inspectedHint = inspectedZone ? current.hints[inspectedZone][locale] : null;

  return <section className="panel module-shell factory-transform-shell">
    <div className="module-title-chip">{t.title}</div>
    <div className="factory-decision-progress" aria-label={`${t.decision} ${index + 1} / ${scenarios.length}`}>{scenarios.map((scenario, itemIndex) => <i key={scenario.id} className={itemIndex < index ? "done" : itemIndex === index ? "active" : ""} />)}</div>
    <p className="factory-instruction">{t.inspect}</p>
    <FactoryScene effect={activeEffect} inspectedZone={inspectedZone} inspectedHint={inspectedHint} onZone={handleZone} locale={locale} />
    {phase === "decision" && <p className="factory-inspect-hint">{t.inspectHint}</p>}
    <div className="factory-decision-panel">
      {phase === "recovery-choice" && <div className="factory-recovery-inline" role="timer" aria-live="polite"><AlertTriangle size={16} aria-hidden="true" /><span>{t.recoveryChoice}</span><small>{t.recoveryTime}</small><b>{(remainingMs / 1000).toFixed(1)} sn</b><i style={{ width: `${Math.max(0, Math.min(100, remainingMs / recoveryWindowMs * 100))}%` }} /></div>}
      <div><span>{t.choose}</span><h2 data-i18n-skip>{current.question[locale]}</h2></div>
      <div className="factory-options">
        {current.options.map((option) => {
          const eliminated = progress?.firstOptionId === option.id;
          const selected = selectedOptionId === option.id;
          const reveal = phase === "outcome";
          const correct = option.isCorrect;
          return <button key={option.id} type="button" disabled={phase === "outcome" || eliminated} className={`${selected ? "selected" : ""} ${eliminated ? "eliminated" : ""} ${reveal && correct ? "correct" : ""} ${reveal && selected && !correct ? "wrong" : ""}`} onClick={() => chooseOption(option)}>
            <span>{reveal && correct ? <Check size={18} /> : reveal && selected && !correct ? <X size={18} /> : eliminated ? <X size={18} /> : <i />}</span>
            <b data-i18n-skip>{option.text[locale]}</b>
            {eliminated && phase !== "outcome" && <small>{t.eliminated}</small>}
          </button>;
        })}
      </div>
    </div>
    {submitting && <div className="notice">{t.saving}</div>}
    {submitFailed && finalSubmission && <><div className="notice error">{t.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>{t.retry}</Button></>}
  </section>;
}
