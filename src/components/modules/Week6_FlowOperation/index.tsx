"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, Factory, LockKeyhole, Package, RotateCcw, Sparkles, Truck, Warehouse, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import {
  buildFlowOperationRound,
  scoreFlowAction,
  scoreFlowRecords,
  shuffledFlowChoices,
  simulateFlowSelection,
  type FlowAction,
  type FlowQuestionKind,
  type FlowRecord,
  type FlowScenario,
  type FlowSimulation,
} from "./flowOperationContent";

type DraftPayload = { gameId?: unknown; selectedScenarioIds?: unknown; records?: unknown };
type ResultState = { record: FlowRecord; correct: boolean; simulation: FlowSimulation };

const stepMs = 260;
const resultHoldMs = 620;

const copy = {
  tr: {
    title: "Hafta 6 · 1. Akış Operasyonu", shortTitle: "AKIŞ OPERASYONU", task: "Görev", score: "Puan", initial: "Başlangıç", target: "Hedef stok", final: "Son stok", stock: "Anlık stok", warehouse: "Depo", duration: "Süre", production: "Üretim", shipping: "Sevkiyat", days: "gün", perDay: "/gün", unit: "birim",
    productionPrompt: (duration: number, target: number) => `${duration} gün sonunda ${target} ürün hedefi için üretim hızını bul.`, shippingPrompt: (duration: number, target: number) => `${duration} gün sonunda ${target} ürün hedefi için sevkiyat hızını bul.`, finalPrompt: "Akışlardan sonra depoda kaç ürün kalır?", durationPrompt: (target: number) => `${target} ürün hedef stokuna kaç günde ulaşılır?`, initialPrompt: (target: number) => `${target} ürün son stok için başlangıç stokunu bul.`,
    correct: "Doğru! Akış hedefle eşleşti.", wrong: "Seçim hedefle eşleşmedi.", estimate: "Seçimin", difference: "Fark",
    completed: "Beş akış görevi tamamlandı", partial: "Oynanış öğretmen tarafından sonlandırıldı", completedDetail: "Tamamlanan görevlerin kaydı alındı. Sonuçlar öğretmen açıklayana kadar gizli kalır.", saving: "Sonuç kaydediliyor…", saveError: "Sonuç kaydedilemedi; ilerlemen korundu.", retry: "Kaydı tekrar dene", locked: "Bu oynanış tamamlandı", lockedDetail: "Yanıtların daha önce kaydedildi.",
  },
  en: {
    title: "Week 6 · 1. Flow Operation", shortTitle: "FLOW OPERATION", task: "Task", score: "Score", initial: "Start", target: "Target stock", final: "Final stock", stock: "Live stock", warehouse: "Warehouse", duration: "Duration", production: "Production", shipping: "Shipping", days: "days", perDay: "/day", unit: "units",
    productionPrompt: (duration: number, target: number) => `Find the production rate needed to reach ${target} units after ${duration} days.`, shippingPrompt: (duration: number, target: number) => `Find the shipping rate needed to reach ${target} units after ${duration} days.`, finalPrompt: "How many units remain after the flows run?", durationPrompt: (target: number) => `How many days does it take to reach ${target} units?`, initialPrompt: (target: number) => `Find the initial stock needed to finish with ${target} units.`,
    correct: "Correct! The flow matches the target.", wrong: "The selection does not match the target.", estimate: "Your choice", difference: "Difference",
    completed: "Five flow tasks complete", partial: "The teacher ended this play", completedDetail: "Completed tasks were recorded. Results stay hidden until the teacher reveals them.", saving: "Saving result…", saveError: "The result could not be saved; your progress is preserved.", retry: "Try saving again", locked: "This play is complete", lockedDetail: "Your answers were already recorded.",
  },
} as const;

function safeAction(value: unknown): FlowAction | null {
  if (!value || typeof value !== "object") return null;
  const action = value as Record<string, unknown>;
  const kinds: FlowQuestionKind[] = ["production", "shipping", "final", "duration", "initial"];
  if (!kinds.includes(action.kind as FlowQuestionKind) || !Number.isInteger(action.value) || Number(action.value) < 0 || Number(action.value) > 1000) return null;
  return { kind: action.kind as FlowQuestionKind, value: Number(action.value) };
}

function hydrateDraft(draft: ModuleDraft | null | undefined, round: readonly FlowScenario[]) {
  const payload = draft?.payload as DraftPayload | undefined;
  const ids = round.map((scenario) => scenario.id);
  const matches = payload?.gameId === "week-6-flow-operation-v3"
    && Array.isArray(payload.selectedScenarioIds)
    && payload.selectedScenarioIds.length === 5
    && payload.selectedScenarioIds.every((id, index) => id === ids[index]);
  const records: FlowRecord[] = [];
  if (matches && Array.isArray(payload.records)) {
    for (const [index, value] of payload.records.slice(0, 5).entries()) {
      if (!value || typeof value !== "object") break;
      const record = value as Partial<FlowRecord>;
      const action = safeAction(record.action);
      if (record.scenarioId !== ids[index] || !action || action.kind !== round[index]?.kind) break;
      records.push({ scenarioId: record.scenarioId, action });
    }
  }
  return records;
}

function questionPrompt(scenario: FlowScenario, text: typeof copy.tr | typeof copy.en) {
  if (scenario.kind === "production") return text.productionPrompt(scenario.duration, scenario.final);
  if (scenario.kind === "shipping") return text.shippingPrompt(scenario.duration, scenario.final);
  if (scenario.kind === "final") return text.finalPrompt;
  if (scenario.kind === "duration") return text.durationPrompt(scenario.final);
  return text.initialPrompt(scenario.final);
}

function optionUnit(kind: FlowQuestionKind, text: typeof copy.tr | typeof copy.en) {
  if (kind === "production" || kind === "shipping") return ` ${text.unit}${text.perDay}`;
  if (kind === "duration") return ` ${text.days}`;
  return ` ${text.unit}`;
}

function QuestionIcon({ kind }: { kind: FlowQuestionKind }) {
  if (kind === "production") return <Factory />;
  if (kind === "shipping") return <Truck />;
  if (kind === "duration") return <CalendarDays />;
  if (kind === "initial") return <Warehouse />;
  return <Package />;
}

function FactoryFlowGame({ scenario, choices, result, animationStep, onChoose, text }: {
  scenario: FlowScenario;
  choices: number[];
  result: ResultState | null;
  animationStep: number;
  onChoose: (value: number) => void;
  text: typeof copy.tr | typeof copy.en;
}) {
  const simulation = result?.simulation;
  const selectedValue = result?.record.action.value;
  const visibleDuration = simulation?.duration ?? scenario.duration;
  const visibleStep = result ? Math.min(animationStep, visibleDuration) : 0;
  const visibleStock = simulation
    ? simulation.initial + (simulation.production - simulation.shipping) * visibleStep
    : scenario.kind === "initial" ? null : scenario.initial;
  const finished = Boolean(result && animationStep >= visibleDuration);
  const productionValue = scenario.kind === "production" && !result ? "?" : simulation?.production ?? scenario.production;
  const shippingValue = scenario.kind === "shipping" && !result ? "?" : simulation?.shipping ?? scenario.shipping;
  const durationValue = scenario.kind === "duration" && !result ? "?" : simulation?.duration ?? scenario.duration;
  const initialValue = scenario.kind === "initial" && !result ? "?" : simulation?.initial ?? scenario.initial;
  const finalValue = scenario.kind === "final" ? finished && simulation ? simulation.final : "?" : scenario.final;
  const wrongDifference = result ? scenario.kind === "final" ? Math.abs(result.record.action.value - result.simulation.final) : Math.abs(result.simulation.final - scenario.final) : 0;
  const productionDisplay = productionValue === "?" ? "?" : `+${productionValue}`;
  const shippingDisplay = shippingValue === "?" ? "?" : `−${shippingValue}`;

  return <section data-question-kind={scenario.kind} data-scenario-id={scenario.id} className={`flow-one-game ${result ? "running" : ""} ${finished ? result?.correct ? "correct" : "wrong" : ""}`}>
    <div className="flow-one-scene">
      <div className={`flow-one-calendar ${scenario.kind === "duration" && !result ? "unknown" : ""}`}><CalendarDays aria-hidden="true" /><small>{text.duration}</small><strong>{durationValue}<em>{durationValue === "?" ? "" : ` ${text.days}`}</em></strong></div>
      <div className={`flow-one-factory ${scenario.kind === "production" && !result ? "unknown" : ""}`}><Factory aria-hidden="true" /><i /><div><small>{text.production}</small><strong>{productionDisplay}<em>{productionValue === "?" ? "" : text.perDay}</em></strong></div></div>
      <div className="flow-one-inflow" aria-hidden="true"><span /><b>›</b></div>
      <div className="flow-one-conveyor"><i /><i /><i /><div><Package /><Package /><Package /></div></div>
      <div className="flow-one-depot">
        <div className="flow-one-depot-heading"><Warehouse aria-hidden="true" /><span>{text.warehouse}</span></div>
        {result && <div className="flow-one-stock" aria-live="off"><small>{text.stock}</small><b>{visibleStock}</b></div>}
        <div className="flow-one-stock-labels"><span className={scenario.kind === "initial" && !result ? "unknown" : ""}><small>{text.initial}</small><strong>{initialValue}</strong></span><span className={scenario.kind === "final" && !finished ? "unknown" : ""}><small>{scenario.kind === "final" ? text.final : text.target}</small><strong>{finalValue}</strong></span></div>
      </div>
      <div className="flow-one-outflow" aria-hidden="true"><span /><b>›</b></div>
      <div className={`flow-one-truck ${scenario.kind === "shipping" && !result ? "unknown" : ""}`}><Truck aria-hidden="true" /><div><small>{text.shipping}</small><strong>{shippingDisplay}<em>{shippingValue === "?" ? "" : text.perDay}</em></strong></div></div>
    </div>
    <div className="flow-one-options" role="group" aria-label={questionPrompt(scenario, text)}>
      {choices.map((value) => {
        const selected = selectedValue === value;
        return <button type="button" key={value} data-value={value} disabled={Boolean(result)} aria-pressed={selected} aria-label={`${value}${optionUnit(scenario.kind, text)}`} className={selected ? `selected ${finished ? result?.correct ? "correct" : "wrong" : ""}` : ""} onClick={() => onChoose(value)}><QuestionIcon kind={scenario.kind} /><strong>{value}<small>{optionUnit(scenario.kind, text)}</small></strong>{selected && finished && <span className="flow-one-choice-status" aria-hidden="true">{result?.correct ? <CheckCircle2 /> : <X />}</span>}</button>;
      })}
    </div>
    <div className="flow-operation-feedback" role="status" aria-live="polite" aria-atomic="true">{finished && result && <div className={result.correct ? "correct" : "wrong"}>{result.correct ? <CheckCircle2 aria-hidden="true" /> : <X aria-hidden="true" />}<span><strong>{result.correct ? text.correct : text.wrong}</strong><small>{result.correct ? `${text.final}: ${result.simulation.final}` : scenario.kind === "final" ? `${text.estimate}: ${result.record.action.value} · ${text.final}: ${result.simulation.final} · ${text.difference}: ${wrongDifference}` : `${text.final}: ${result.simulation.final} · ${text.target}: ${scenario.final} · ${text.difference}: ${wrongDifference}`}</small></span></div>}</div>
  </section>;
}

export function Week6FlowOperation({ seedKey, onSubmit, onDraft, existingSubmission, existingDraft, forceSubmit }: LearningModuleProps & { seedKey: string }) {
  const { locale } = useI18n();
  const text = copy[locale];
  const round = useMemo(() => buildFlowOperationRound(seedKey), [seedKey]);
  const scenarioIds = useMemo(() => round.map((scenario) => scenario.id), [round]);
  const hydratedRecords = useMemo(() => hydrateDraft(existingDraft, round), [existingDraft, round]);
  const [stageIndex, setStageIndex] = useState(Math.min(hydratedRecords.length, 4));
  const [records, setRecords] = useState<FlowRecord[]>(hydratedRecords);
  const [result, setResult] = useState<ResultState | null>(null);
  const [animationStep, setAnimationStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [completionReason, setCompletionReason] = useState<"completed" | "teacher-ended">("completed");
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const stageRef = useRef(stageIndex);
  const recordsRef = useRef(hydratedRecords);
  const submissionStarted = useRef(false);
  const completedRef = useRef(false);
  const timerRefs = useRef<number[]>([]);
  const current = round[stageIndex]!;
  const choices = useMemo(() => shuffledFlowChoices(current, seedKey), [current, seedKey]);

  const clearTimers = useCallback(() => { timerRefs.current.forEach((timer) => window.clearTimeout(timer)); timerRefs.current = []; }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  const submissionFor = useCallback((nextRecords: FlowRecord[], reason: "completed" | "teacher-ended" | "draft", nextStage = stageRef.current): ModuleSubmission => ({
    stage: Math.max(1, Math.min(5, nextStage + 1)),
    score: scoreFlowRecords(round, nextRecords),
    payload: { gameId: "week-6-flow-operation-v3", selectedScenarioIds: scenarioIds, stageIndex: nextStage, records: nextRecords, answeredCount: nextRecords.length, completionReason: reason, completionStatus: reason === "completed" ? "completed" : reason === "teacher-ended" ? "incomplete" : "draft" },
  }), [round, scenarioIds]);

  const saveDraft = useCallback((nextRecords = recordsRef.current, nextStage = stageRef.current) => { void onDraft?.(submissionFor(nextRecords, "draft", nextStage)); }, [onDraft, submissionFor]);
  const sendSubmission = useCallback(async (submission: ModuleSubmission) => { setSubmitting(true); setSubmitFailed(false); const accepted = await onSubmit(submission); setSubmitting(false); if (accepted === false) { submissionStarted.current = false; setSubmitFailed(true); } }, [onSubmit]);
  const finalize = useCallback((reason: "completed" | "teacher-ended") => { if (submissionStarted.current || existingSubmission) return; clearTimers(); submissionStarted.current = true; completedRef.current = true; setCompleted(true); setCompletionReason(reason); const submission = submissionFor(recordsRef.current, reason); setFinalSubmission(submission); void sendSubmission(submission); }, [clearTimers, existingSubmission, sendSubmission, submissionFor]);

  useEffect(() => { if (hydratedRecords.length === 5 && !existingSubmission && !completedRef.current) finalize("completed"); }, [existingSubmission, finalize, hydratedRecords.length]);
  useEffect(() => { if (forceSubmit && !completedRef.current && !existingSubmission) finalize("teacher-ended"); }, [existingSubmission, finalize, forceSubmit]);
  useEffect(() => { const flush = () => { if (!completedRef.current && !existingSubmission) saveDraft(); }; window.addEventListener("pagehide", flush); return () => window.removeEventListener("pagehide", flush); }, [existingSubmission, saveDraft]);

  const resolve = useCallback((value: number) => {
    if (result || completedRef.current || existingSubmission || forceSubmit) return;
    clearTimers();
    const action: FlowAction = { kind: current.kind, value };
    const record: FlowRecord = { scenarioId: current.id, action };
    const simulation = simulateFlowSelection(current, value);
    const nextRecords = [...recordsRef.current, record];
    recordsRef.current = nextRecords; setRecords(nextRecords); setResult({ record, simulation, correct: scoreFlowAction(current, action) === 20 }); setAnimationStep(0);
    const steps = Math.max(1, Math.min(4, simulation.duration));
    const nextStage = Math.min(stageRef.current + 1, 4);
    saveDraft(nextRecords, nextStage);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animationStepMs = reducedMotion ? 150 : stepMs;
    const animationResultHoldMs = reducedMotion ? 760 : resultHoldMs;
    for (let step = 1; step <= steps; step += 1) timerRefs.current.push(window.setTimeout(() => setAnimationStep(step), step * animationStepMs));
    timerRefs.current.push(window.setTimeout(() => {
      if (stageRef.current >= 4) { finalize("completed"); return; }
      const upcoming = stageRef.current + 1; stageRef.current = upcoming; setStageIndex(upcoming); setResult(null); setAnimationStep(0);
    }, steps * animationStepMs + animationResultHoldMs));
  }, [clearTimers, current, existingSubmission, finalize, forceSubmit, result, saveDraft]);

  if (existingSubmission && !completed) return <section className="panel module-shell flow-operation-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  if (completed) return <section className="panel module-shell flow-operation-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><Sparkles size={42} /><h2>{completionReason === "completed" ? text.completed : text.partial}</h2><p>{text.completedDetail}</p>{submitting && <div className="notice">{text.saving}</div>}{submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void sendSubmission(finalSubmission)}>{text.retry}</Button></>}</div></section>;

  return <section className="panel module-shell flow-operation-shell flow-one-shell">
    <header className="flow-operation-header flow-one-header"><div><span className="module-title-chip">{text.shortTitle} · {text.task} {stageIndex + 1}/5</span></div><div><span>{text.score} <b>{scoreFlowRecords(round, records)}</b></span></div></header>
    <div className="flow-operation-progress" role="progressbar" aria-valuemin={1} aria-valuemax={5} aria-valuenow={stageIndex + 1} aria-label={`${text.task} ${stageIndex + 1}/5`}>{round.map((scenario, index) => <i aria-hidden="true" key={scenario.id} className={index < records.length ? "done" : index === stageIndex ? "active" : ""} />)}</div>
    <h2 className="flow-operation-prompt">{questionPrompt(current, text)}</h2>
    <div key={current.id} className="flow-operation-stage"><FactoryFlowGame scenario={current} choices={choices} result={result} animationStep={animationStep} onChoose={resolve} text={text} /></div>
  </section>;
}
