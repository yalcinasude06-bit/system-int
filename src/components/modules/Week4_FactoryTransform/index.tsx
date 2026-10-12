"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { AlertTriangle, Boxes, Check, Cog, LockKeyhole, Radio, RotateCcw, Sparkles, Users, X } from "lucide-react";
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

type Phase = "decision" | "outcome" | "recovery-choice" | "recovery-repair";
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
    stage: "Aşama",
    decision: "Karar",
    score: "Puan",
    production: "Üretim",
    adaptation: "Uyum",
    participation: "Çalışan Katılımı",
    representative: "temsili gösterge",
    factoryEvent: "Fabrikada ne oluyor?",
    inspectHint: "Fabrikadaki işaretlere dokun, sorunu araştır.",
    choose: "Kararın",
    correct: "Doğru sistem kararı!",
    wrong: "Bu karar fabrikada bir sorun zinciri başlattı.",
    recoveryChoice: "Kurtarma modu: Kalan iki karardan doğru olanı seç.",
    recoveryRepair: "Şimdi sarı yanıp sönen onarım bölgesine dokun.",
    recoveryTime: "Kurtarma süresi",
    eliminated: "elendi",
    repaired: "Fabrikayı zamanında kurtardın! +4 puan",
    secondWrong: "İkinci karar da sorunu çözemedi.",
    timeout: "Kurtarma süresi doldu.",
    wrongZone: "Bu bölge arızanın kaynağı değil; süre devam ediyor.",
    next: "Sonraki Karar",
    results: "Sonuçları Gör",
    effectFlow: "Neden-sonuç akışı",
    learning: "Bu aşamanın sistem dersi",
    completed: "Fabrika Dönüşümü Tamamlandı!",
    completedDetail: "Üç farklı sistem modelinde dokuz kararı tamamladın.",
    firstCorrect: "İlk denemede doğru",
    recovered: "Kurtarılan",
    unrecovered: "Kurtarılamayan",
    modelSummary: "Mekanik model düzeni, biyolojik model çevreye uyumu, sosyo-kültürel model ise ortak amaç ve katılımı öne çıkarır. Hiçbiri her durumda tek başına en iyi değildir.",
    partial: "Kısmi fabrika kararların kaydedildi",
    partialDetail: "Öğretmen modülü sonlandırdığı için o ana kadarki kararların güvenle kaydedildi.",
    locked: "Bu modül tamamlandı",
    lockedDetail: "Kararların kilitlendi. Öğretmen sonuçları açıklayana kadar bekleyin.",
    saving: "Yanıt kaydediliyor…",
    saveError: "Yanıt kaydedilemedi. İlerlemen korundu.",
    retry: "Kaydı tekrar dene",
    totalScore: "Toplam puan",
    correctCount: "Doğru",
    incorrectCount: "Yanlış",
    answerReview: "Kararların ve açıklamaları",
    yourAnswer: "İlk kararın",
    correctAnswer: "Doğru karar",
    notAnswered: "Yanıtlanmadı",
    continueFeedback: "Geri bildirime geç",
  },
  en: {
    title: "Week 4 · Module 1: Transform the Factory",
    inspect: "Inspect the factory, decide, and rescue it in 5 seconds if needed!",
    stage: "Stage",
    decision: "Decision",
    score: "Score",
    production: "Production",
    adaptation: "Adaptation",
    participation: "Employee Participation",
    representative: "illustrative metric",
    factoryEvent: "What is happening in the factory?",
    inspectHint: "Tap the factory markers and investigate the problem.",
    choose: "Your decision",
    correct: "Correct systems decision!",
    wrong: "This decision started a chain of problems in the factory.",
    recoveryChoice: "Rescue mode: choose the correct one of the two remaining decisions.",
    recoveryRepair: "Now tap the yellow flashing repair zone.",
    recoveryTime: "Rescue time",
    eliminated: "eliminated",
    repaired: "You rescued the factory in time! +4 points",
    secondWrong: "The second decision did not solve the problem either.",
    timeout: "The rescue window expired.",
    wrongZone: "This zone is not the source of the fault; the timer keeps running.",
    next: "Next Decision",
    results: "View Results",
    effectFlow: "Cause-and-effect flow",
    learning: "Systems lesson from this stage",
    completed: "Factory Transformation Complete!",
    completedDetail: "You completed nine decisions across three different system models.",
    firstCorrect: "Correct on first try",
    recovered: "Recovered",
    unrecovered: "Not recovered",
    modelSummary: "The mechanical model emphasizes order, the biological model adaptation to the environment, and the socio-cultural model shared purpose and participation. None is universally best on its own.",
    partial: "Your partial factory decisions were saved",
    partialDetail: "Your decisions up to that point were saved because the teacher ended the module.",
    locked: "This module is complete",
    lockedDetail: "Your decisions are locked. Wait until the teacher reveals the results.",
    saving: "Saving your answer…",
    saveError: "The answer could not be saved. Your progress is preserved.",
    retry: "Try saving again",
    totalScore: "Total score",
    correctCount: "Correct",
    incorrectCount: "Incorrect",
    answerReview: "Your decisions and explanations",
    yourAnswer: "Your first decision",
    correctAnswer: "Correct decision",
    notAnswered: "Not answered",
    continueFeedback: "Continue to feedback",
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
  repairTarget,
  inspectedZone,
  onZone,
  locale,
}: {
  effect: FactoryEffectType | null;
  repairTarget: FactoryZone | null;
  inspectedZone: FactoryZone | null;
  onZone: (zone: FactoryZone) => void;
  locale: "tr" | "en";
}) {
  return <div className={`factory-scene ${effect ? `effect-${effect}` : ""}`}>
    <div className="factory-sky"><span /><span /><span /></div>
    <div className="factory-building"><b>SYS LAB</b><i /><i /><i /></div>
    <div className="factory-smoke" aria-hidden="true"><i /><i /><i /></div>
    <div className="factory-conveyor" aria-hidden="true"><div className="factory-belt"><i /><i /><i /><i /></div><span className="factory-package p1"><Boxes size={22} /></span><span className="factory-package p2"><Boxes size={22} /></span><span className="factory-package p3"><Boxes size={22} /></span></div>
    <button type="button" className={`factory-zone machine ${repairTarget === "machine" ? "repair-target" : ""} ${inspectedZone === "machine" ? "inspected" : ""}`} onClick={() => onZone("machine")} aria-label={factoryZoneLabels.machine[locale]}>
      <span className="factory-machine"><Cog className="gear main" /><Cog className="gear small" /><i className="machine-light" /></span><i className="factory-zone-ping" /><b><Cog size={15} /> {factoryZoneLabels.machine[locale]}</b>
    </button>
    <button type="button" className={`factory-zone sensor ${repairTarget === "sensor" ? "repair-target" : ""} ${inspectedZone === "sensor" ? "inspected" : ""}`} onClick={() => onZone("sensor")} aria-label={factoryZoneLabels.sensor[locale]}>
      <span className="factory-sensor"><Radio /><i /><i /><i /></span><i className="factory-zone-ping" /><b><Radio size={15} /> {factoryZoneLabels.sensor[locale]}</b>
    </button>
    <button type="button" className={`factory-zone workers ${repairTarget === "workers" ? "repair-target" : ""} ${inspectedZone === "workers" ? "inspected" : ""}`} onClick={() => onZone("workers")} aria-label={factoryZoneLabels.workers[locale]}>
      <span className="factory-workers"><i /><i /><i /></span><i className="factory-zone-ping" /><b><Users size={15} /> {factoryZoneLabels.workers[locale]}</b>
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
  reviewMode,
  onReviewComplete,
  seedKey,
}: LearningModuleProps & { seedKey: string }) {
  const { locale } = useI18n();
  const t = copy[locale];
  const scenarios = useMemo(() => buildFactoryRound(seedKey), [seedKey]);
  const draftPayload = existingDraft?.payload as DraftPayload | undefined;
  const hydratedAnswers = useMemo(() => answersFromDraft(existingDraft), [existingDraft]);
  const hydratedProgress = useMemo(() => inProgressFromDraft(existingDraft), [existingDraft]);
  const initialIndex = typeof draftPayload?.currentIndex === "number" ? Math.max(0, Math.min(scenarios.length - 1, draftPayload.currentIndex)) : Math.min(hydratedAnswers.length, scenarios.length - 1);
  const initialPhase: Phase = draftPayload?.phase === "outcome" || draftPayload?.phase === "recovery-choice" || draftPayload?.phase === "recovery-repair" ? draftPayload.phase : "decision";
  const [index, setIndex] = useState(initialIndex);
  const [answers, setAnswers] = useState<FactoryAnswer[]>(hydratedAnswers);
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

  const resolveTimeout = useCallback(() => {
    if (phaseRef.current !== "recovery-choice" && phaseRef.current !== "recovery-repair") return;
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
    if ((phase !== "recovery-choice" && phase !== "recovery-repair") || !inProgress) return;
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
    if (!option.isCorrect) {
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
      return;
    }
    phaseRef.current = "recovery-repair";
    setPhase("recovery-repair");
    setNotification(t.recoveryRepair);
    saveDraft(answersRef.current, metricsRef.current, index, "recovery-repair", progress, option.id, activeEffect, t.recoveryRepair);
    actionLocked.current = false;
  }, [activeEffect, commitResolvedAnswer, completed, current, existingSubmission, forceSubmit, index, locale, resolveTimeout, saveDraft, t.recoveryRepair, t.secondWrong]);

  const handleZone = useCallback((zone: FactoryZone) => {
    if (completed || existingSubmission || forceSubmit) return;
    setInspectedZone(zone);
    if (phaseRef.current !== "recovery-repair" || !inProgressRef.current) {
      setNotification(current.hints[zone][locale]);
      return;
    }
    if ((deadlinePerf.current ?? 0) <= performance.now()) { resolveTimeout(); return; }
    const zones = [...inProgressRef.current.clickedRepairZones, zone];
    const progress = { ...inProgressRef.current, clickedRepairZones: zones };
    inProgressRef.current = progress;
    setInProgress(progress);
    if (zone !== current.repairZone) {
      setNotification(t.wrongZone);
      saveDraft(answersRef.current, metricsRef.current, index, "recovery-repair", progress, progress.recoveryOptionId, activeEffect, t.wrongZone);
      return;
    }
    const first = current.options.find((option) => option.id === progress.firstOptionId)!;
    const nextMetrics = applyMetrics(metricsRef.current, { production: 6, adaptation: 6, participation: 6 });
    commitResolvedAnswer({
      scenarioId: current.id,
      stageId: current.stage,
      roundId: index % 3 + 1,
      offeredOptionIds: current.options.map((option) => option.id),
      firstOptionId: progress.firstOptionId,
      firstCorrect: false,
      recoveryOptionId: progress.recoveryOptionId,
      recoveryCorrectOption: true,
      clickedRepairZones: zones,
      repairZone: current.repairZone,
      recoveryOutcome: "recovered",
      points: 4,
      effectType: "recover",
    }, nextMetrics, "recover", t.repaired);
    setInspectedZone(current.repairZone);
    setSelectedOptionId(progress.recoveryOptionId);
    setNotification(t.repaired);
    void first;
  }, [activeEffect, commitResolvedAnswer, completed, current, existingSubmission, forceSubmit, index, locale, resolveTimeout, saveDraft, t.repaired, t.wrongZone]);

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
    const delay = reduceMotion ? 80 : outcome?.points ? 900 : 1100;
    advanceTimer.current = window.setTimeout(advance, delay);
    return () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    };
  }, [advance, completed, current.id, existingSubmission, forceSubmit, phase, reduceMotion]);

  if (existingSubmission && !completed && !reviewMode) {
    return <section className="panel module-shell factory-transform-shell"><div className="module-title-chip">{t.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{t.locked}</h2><p>{t.lockedDetail}</p></div></section>;
  }

  if (completed || (reviewMode && existingSubmission)) {
    const resultAnswers = completed ? answers : answersFromPayload(existingSubmission?.payload as DraftPayload | undefined);
    const firstCorrect = resultAnswers.filter((answer) => answer.firstCorrect).length;
    const recovered = resultAnswers.filter((answer) => answer.recoveryOutcome === "recovered").length;
    const unrecovered = resultAnswers.filter((answer) => answer.recoveryOutcome === "second-wrong" || answer.recoveryOutcome === "timeout").length;
    const successful = resultAnswers.filter((answer) => answer.points > 0).length;
    const endedByTeacher = (finalSubmission?.payload.completionReason ?? existingSubmission?.payload.completionReason) === "teacher-ended";
    return <section className="panel module-shell factory-transform-shell">
      <div className="module-title-chip">{t.title}</div>
      <div className="module-complete-card factory-complete">
        <Sparkles size={42} />
        <h2>{endedByTeacher ? t.partial : t.completed}</h2>
        <p>{endedByTeacher ? t.partialDetail : t.completedDetail}</p>
        <strong className="factory-final-score">{t.totalScore}: {resultAnswers.reduce((total, answer) => total + answer.points, 0)} / 90</strong>
        <div className="factory-result-stats">
          <span><Check size={18} />{t.correctCount}<b>{successful}</b></span>
          <span><X size={18} />{t.incorrectCount}<b>{scenarios.length - successful}</b></span>
          <span>{t.firstCorrect}<b>{firstCorrect}</b></span>
          <span>{t.recovered}<b>{recovered}</b></span>
          <span>{t.unrecovered}<b>{unrecovered}</b></span>
        </div>
        <p className="factory-model-summary">{t.modelSummary}</p>
        <section className="factory-answer-review">
          <h3>{t.answerReview}</h3>
          {scenarios.map((scenario) => {
            const answer = resultAnswers.find((item) => item.scenarioId === scenario.id);
            const chosen = scenario.options.find((option) => option.id === answer?.firstOptionId);
            const correct = scenario.options.find((option) => option.isCorrect);
            const succeeded = Boolean(answer && answer.points > 0);
            return <details key={scenario.id} className={succeeded ? "correct" : "incorrect"}>
              <summary><span aria-hidden="true">{succeeded ? "✓" : "✕"}</span><span data-i18n-skip>{scenario.question[locale]}</span><small>{succeeded ? t.correctCount : t.incorrectCount}</small></summary>
              <div><p><b>{t.yourAnswer}:</b> <span data-i18n-skip>{chosen?.text[locale] ?? t.notAnswered}</span></p><p><b>{t.correctAnswer}:</b> <span data-i18n-skip>{correct?.text[locale]}</span></p><p data-i18n-skip>{correct?.explanation[locale] ?? scenario.learning[locale]}</p></div>
            </details>;
          })}
        </section>
        {submitting && <div className="notice">{t.saving}</div>}
        {submitFailed && finalSubmission && <><div className="notice error">{t.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>{t.retry}</Button></>}
        {reviewMode && onReviewComplete && <Button onClick={onReviewComplete}>{t.continueFeedback}</Button>}
      </div>
    </section>;
  }

  const progress = inProgress;
  const outcomeAnswer = answers.find((answer) => answer.scenarioId === current.id);
  const repairTarget = phase === "recovery-repair" ? current.repairZone : null;
  const outcomeSucceeded = Boolean(outcomeAnswer && outcomeAnswer.points > 0);
  const notificationTone = phase.startsWith("recovery")
    ? "urgent"
    : phase === "outcome"
      ? outcomeSucceeded ? "success" : "fault"
      : activeEffect && !["organized", "feedback", "cooperate", "recover"].includes(activeEffect) ? "fault" : "neutral";
  const notificationTitle = phase === "recovery-choice"
    ? t.recoveryChoice
    : phase === "recovery-repair"
      ? t.recoveryRepair
      : phase === "outcome"
        ? outcomeAnswer?.firstCorrect ? t.correct : outcomeAnswer?.recoveryOutcome === "recovered" ? t.repaired : outcomeAnswer?.recoveryOutcome === "timeout" ? t.timeout : t.secondWrong
        : t.factoryEvent;

  return <section className="panel module-shell factory-transform-shell">
    <div className="module-title-chip">{t.title}</div>
    <div className="factory-decision-progress" aria-label={`${t.decision} ${index + 1} / ${scenarios.length}`}>{scenarios.map((scenario, itemIndex) => <i key={scenario.id} className={itemIndex < index ? "done" : itemIndex === index ? "active" : ""} />)}</div>
    <p className="factory-instruction">{t.inspect}</p>
    <FactoryScene effect={activeEffect} repairTarget={repairTarget} inspectedZone={inspectedZone} onZone={handleZone} locale={locale} />
    <div className={`factory-notification ${notificationTone}`} aria-live="polite">
      <span>{notificationTone === "success" ? <Check size={18} /> : notificationTone === "urgent" || notificationTone === "fault" ? <AlertTriangle size={18} /> : <Radio size={18} />}</span>
      <div><strong>{notificationTitle}</strong><p data-i18n-skip>{notification || current.event[locale]}</p></div>
      {phase.startsWith("recovery") && <div className="factory-recovery-timer"><b>{(remainingMs / 1000).toFixed(1)}</b><small>{t.recoveryTime}</small><i style={{ width: `${Math.max(0, Math.min(100, remainingMs / recoveryWindowMs * 100))}%` }} /></div>}
    </div>
    {phase === "decision" && <p className="factory-inspect-hint">{t.inspectHint}</p>}
    <div className="factory-decision-panel">
      <div><span>{t.choose}</span><h2 data-i18n-skip>{current.question[locale]}</h2></div>
      <div className="factory-options">
        {current.options.map((option) => {
          const eliminated = progress?.firstOptionId === option.id;
          const selected = selectedOptionId === option.id;
          const reveal = phase === "outcome";
          const correct = option.isCorrect;
          return <button key={option.id} type="button" disabled={phase === "outcome" || phase === "recovery-repair" || eliminated} className={`${selected ? "selected" : ""} ${eliminated ? "eliminated" : ""} ${reveal && correct ? "correct" : ""} ${reveal && selected && !correct ? "wrong" : ""}`} onClick={() => chooseOption(option)}>
            <span>{reveal && correct ? <Check size={18} /> : reveal && selected && !correct ? <X size={18} /> : eliminated ? <X size={18} /> : <i />}</span>
            <b data-i18n-skip>{option.text[locale]}</b>
            {eliminated && phase !== "outcome" && <small>{t.eliminated}</small>}
          </button>;
        })}
      </div>
    </div>
  </section>;
}
