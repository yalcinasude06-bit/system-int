"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, Factory, LockKeyhole, Minus, Package, Play, Plus, RotateCcw, Sparkles, Truck, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import {
  buildFlowOperationRound,
  graphChoices,
  graphSimulation,
  missingCorrectFlow,
  scoreFlowAction,
  scoreFlowRecords,
  stockAfter,
  tankCorrectOutflow,
  timelineDirection,
  timelineValues,
  warehouseCorrectRate,
  type FlowAction,
  type FlowRecord,
  type FlowScenario,
  type GraphChoice,
  type GraphScenario,
  type MissingScenario,
  type TankScenario,
  type TimelineScenario,
  type TrendDirection,
  type WarehouseScenario,
} from "./flowOperationContent";

type DraftPayload = { gameId?: unknown; selectedScenarioIds?: unknown; records?: unknown; controlState?: unknown };
type ResultState = { record: FlowRecord; correct: boolean };
type ControlState = { scenarioId: string; tankOutflow?: number; missingValue?: number };

const stepMs = 320;
const resultHoldMs = 620;

const copy = {
  tr: {
    title: "Hafta 6 · 1. Akış Operasyonu", task: "Görev", score: "Puan", initial: "Başlangıç", target: "Hedef", days: "gün", minutes: "dk", perDay: "/gün", perMinute: "/dk",
    warehouseTitle: "Hedef Depo", warehousePrompt: "Hedef stoka ulaşmak için üretim hızını seç.", production: "Üretim", shipping: "Sevkiyat",
    tankTitle: "Taşan Tank", tankPrompt: "Vanayı ayarla ve akışı başlat.", inflow: "Giriş", valveOutflow: "Vana çıkışı", startFlow: "Akışı Başlat", overflow: "Taşma",
    missingTitle: "Kayıp Akış", missingPrompt: "Eksik akışı sayısal olarak tamamla.", missingInflow: "Eksik giriş", missingOutflow: "Eksik çıkış", knownInflow: "Bilinen giriş", knownOutflow: "Bilinen çıkış", check: "Kontrol Et", final: "Bitiş",
    timelineTitle: "Zamanı İleri Sar", timelinePrompt: "İki gün sonunda stok nasıl değişir?", day: "Gün", increases: "Artar", steady: "Sabit", decreases: "Azalır",
    graphTitle: "Grafiği Yakala", graphPrompt: "Akışın oluşturduğu stok-zaman eğrisine dokun.", stock: "Stok", time: "Zaman", graph: "Grafik", capacity: "Kapasite",
    correct: "Doğru! Sistem beklenen sonuca ulaştı.", wrong: "Bu işlem hedefi tutturmadı.", correctRate: "Doğru üretim", correctValve: "Doğru vana", correctFlow: "Doğru akış", correctTrend: "Doğru yön", correctGraph: "Doğru grafik yeşille gösterildi.",
    completed: "Beş operasyon tamamlandı", partial: "Oynanış öğretmen tarafından sonlandırıldı", completedDetail: "Tamamlanan görevlerin kaydı alındı. Sonuçlar öğretmen açıklayana kadar gizli kalır.", saving: "Sonuç kaydediliyor…", saveError: "Sonuç kaydedilemedi; ilerlemen korundu.", retry: "Kaydı tekrar dene", locked: "Bu oynanış tamamlandı", lockedDetail: "Yanıtların daha önce kaydedildi.",
  },
  en: {
    title: "Week 6 · 1. Flow Operation", task: "Task", score: "Score", initial: "Start", target: "Target", days: "days", minutes: "min", perDay: "/day", perMinute: "/min",
    warehouseTitle: "Target Depot", warehousePrompt: "Choose the production rate that reaches the target stock.", production: "Production", shipping: "Shipping",
    tankTitle: "Overflowing Tank", tankPrompt: "Set the valve and start the flow.", inflow: "Inflow", valveOutflow: "Valve outflow", startFlow: "Start Flow", overflow: "Overflow",
    missingTitle: "Missing Flow", missingPrompt: "Complete the missing flow with a number.", missingInflow: "Missing inflow", missingOutflow: "Missing outflow", knownInflow: "Known inflow", knownOutflow: "Known outflow", check: "Check", final: "Final",
    timelineTitle: "Fast Forward", timelinePrompt: "How will stock change after two days?", day: "Day", increases: "Increases", steady: "Steady", decreases: "Decreases",
    graphTitle: "Catch the Graph", graphPrompt: "Tap the stock-time curve produced by the flow.", stock: "Stock", time: "Time", graph: "Graph", capacity: "Capacity",
    correct: "Correct! The system reached the expected result.", wrong: "This operation missed the target.", correctRate: "Correct production", correctValve: "Correct valve", correctFlow: "Correct flow", correctTrend: "Correct direction", correctGraph: "The correct graph is highlighted in green.",
    completed: "All five operations are complete", partial: "The teacher ended this play", completedDetail: "Completed tasks were recorded. Results stay hidden until the teacher reveals them.", saving: "Saving result…", saveError: "The result could not be saved; your progress is preserved.", retry: "Try saving again", locked: "This play is complete", lockedDetail: "Your answers were already recorded.",
  },
} as const;

function safeAction(value: unknown): FlowAction | null {
  if (!value || typeof value !== "object") return null;
  const action = value as Partial<FlowAction> & Record<string, unknown>;
  if (action.kind === "warehouse" && Number.isInteger(action.productionRate)) return { kind: "warehouse", productionRate: Number(action.productionRate) };
  if (action.kind === "tank" && Number.isInteger(action.outflowRate) && Number(action.outflowRate) >= 0 && Number(action.outflowRate) <= 25) return { kind: "tank", outflowRate: Number(action.outflowRate) };
  if (action.kind === "missing" && Number.isInteger(action.flowValue) && Number(action.flowValue) >= 0 && Number(action.flowValue) <= 25) return { kind: "missing", flowValue: Number(action.flowValue) };
  if (action.kind === "timeline" && (action.direction === "up" || action.direction === "flat" || action.direction === "down")) return { kind: "timeline", direction: action.direction };
  if (action.kind === "graph" && typeof action.graphId === "string") return { kind: "graph", graphId: action.graphId };
  return null;
}

function hydrateDraft(draft: ModuleDraft | null | undefined, round: readonly FlowScenario[]) {
  const payload = draft?.payload as DraftPayload | undefined;
  const ids = round.map((scenario) => scenario.id);
  const matches = payload?.gameId === "week-6-flow-operation-v2" && Array.isArray(payload.selectedScenarioIds) && payload.selectedScenarioIds.length === 5 && payload.selectedScenarioIds.every((id, index) => id === ids[index]);
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
  const rawControl = matches && payload?.controlState && typeof payload.controlState === "object" ? payload.controlState as Partial<ControlState> : null;
  const scenario = round[Math.min(records.length, 4)]!;
  const control: ControlState = {
    scenarioId: scenario.id,
    tankOutflow: rawControl?.scenarioId === scenario.id && Number.isInteger(rawControl.tankOutflow) ? Math.max(0, Math.min(25, Number(rawControl.tankOutflow))) : 12,
    missingValue: rawControl?.scenarioId === scenario.id && Number.isInteger(rawControl.missingValue) ? Math.max(0, Math.min(25, Number(rawControl.missingValue))) : 10,
  };
  return { records, control };
}

function tankState(scenario: TankScenario, outflow: number, steps: number) {
  let stock = scenario.initial;
  let overflow = 0;
  for (let step = 0; step < Math.min(steps, scenario.duration); step += 1) {
    const raw = stock + scenario.inflow - outflow;
    overflow += Math.max(0, raw - scenario.capacity);
    stock = Math.min(scenario.capacity, Math.max(0, raw));
  }
  return { stock, overflow };
}

function WarehouseGame({ scenario, action, animationStep, disabled, onChoose, text, locale }: { scenario: WarehouseScenario; action: FlowAction | null; animationStep: number; disabled: boolean; onChoose: (action: FlowAction) => void; text: typeof copy.tr | typeof copy.en; locale: "tr" | "en" }) {
  const selected = action?.kind === "warehouse" ? action.productionRate : null;
  const visibleStock = selected === null ? scenario.initial : stockAfter(scenario.initial, selected, scenario.outflow, Math.min(animationStep, scenario.duration));
  return <section className={`flow-operation-game warehouse-game ${selected !== null ? "running" : ""}`}>
    <div className="flow-warehouse-scene">
      <div className="flow-factory-building"><Factory /><i /><span /><span /><span /></div>
      <div className="flow-conveyor"><i /><i /><i /><div className="flow-packages"><Package /><Package /><Package /></div></div>
      <div className="flow-depot"><b>{visibleStock}</b><small data-i18n-skip>{scenario.unit[locale]}</small><div>{Array.from({ length: 6 }, (_, item) => <i key={item} />)}</div></div>
      <div className="flow-truck"><Truck /><span>{text.shipping} {scenario.outflow}{text.perDay}</span></div>
    </div>
    <div className="flow-operation-facts"><span>{text.initial} <b>{scenario.initial}</b></span><span>{text.target} <b>{scenario.target}</b></span><span>{scenario.duration} {text.days}</span></div>
    <div className="warehouse-rate-controls" aria-label={text.warehousePrompt}>
      {scenario.productionChoices.map((rate) => <button type="button" key={rate} disabled={disabled} className={selected === rate ? "selected" : ""} onClick={() => onChoose({ kind: "warehouse", productionRate: rate })}><Factory size={18} /><span>{text.production}</span><strong>{rate}{text.perDay}</strong></button>)}
    </div>
  </section>;
}

function TankGame({ scenario, outflow, action, animationStep, disabled, onAdjust, onStart, text }: { scenario: TankScenario; outflow: number; action: FlowAction | null; animationStep: number; disabled: boolean; onAdjust: (delta: number) => void; onStart: () => void; text: typeof copy.tr | typeof copy.en }) {
  const selected = action?.kind === "tank" ? action.outflowRate : outflow;
  const state = tankState(scenario, selected, action ? animationStep : 0);
  return <section className={`flow-operation-game tank-game ${action ? "running" : ""}`}>
    <div className="flow-tank-scene">
      <div className="tank-inlet"><span>{text.inflow}<b>{scenario.inflow}{text.perMinute}</b></span><i /></div>
      <div className="tank-vessel"><div className="tank-liquid" style={{ height: `${state.stock}%` }}><i /><i /></div><strong>{state.stock}</strong><small>/100</small><div className={`tank-light ${action && state.stock === scenario.target ? "good" : action ? "bad" : ""}`} /></div>
      <div className={`tank-overflow ${state.overflow > 0 ? "spilling" : ""}`}><i /><span>{text.overflow}<b>{state.overflow}</b></span></div>
      <div className="tank-outlet"><i /><span>{text.valveOutflow}<b>{selected}{text.perMinute}</b></span></div>
    </div>
    <div className="flow-operation-facts"><span>{text.initial} <b>{scenario.initial}</b></span><span>{text.target} <b>{scenario.target}</b></span><span>{scenario.duration} {text.minutes}</span></div>
    <div className="tank-control-row">
      <button type="button" className="number-stepper" aria-label="−" disabled={disabled || outflow <= 0} onClick={() => onAdjust(-1)}><Minus /></button>
      <div className="tank-valve" style={{ "--valve-turn": `${outflow * 10}deg` } as React.CSSProperties}><span /><b>{outflow}</b></div>
      <button type="button" className="number-stepper" aria-label="+" disabled={disabled || outflow >= 25} onClick={() => onAdjust(1)}><Plus /></button>
      <Button disabled={disabled} icon={<Play size={17} fill="currentColor" />} onClick={onStart}>{text.startFlow}</Button>
    </div>
  </section>;
}

function MissingFlowGame({ scenario, value, action, animationStep, disabled, onAdjust, onCheck, text }: { scenario: MissingScenario; value: number; action: FlowAction | null; animationStep: number; disabled: boolean; onAdjust: (delta: number) => void; onCheck: () => void; text: typeof copy.tr | typeof copy.en }) {
  const shownValue = action?.kind === "missing" ? action.flowValue : value;
  const inflow = scenario.hiddenFlow === "inflow" ? shownValue : scenario.knownFlow;
  const outflow = scenario.hiddenFlow === "outflow" ? shownValue : scenario.knownFlow;
  const calculated = stockAfter(scenario.initial, inflow, outflow, scenario.duration);
  return <section className={`flow-operation-game missing-game ${action ? "checked" : ""}`}>
    <div className="missing-flow-scene">
      <div className={`missing-arrow inflow ${scenario.hiddenFlow === "inflow" ? "unknown" : ""}`}><span>{scenario.hiddenFlow === "inflow" ? text.missingInflow : text.knownInflow}</span><b>{scenario.hiddenFlow === "inflow" && !action ? "?" : inflow}</b><i /></div>
      <div className="missing-stock"><Package /><strong>{scenario.initial}</strong><span>× {scenario.duration} {text.days}</span></div>
      <div className={`missing-arrow outflow ${scenario.hiddenFlow === "outflow" ? "unknown" : ""}`}><i /><span>{scenario.hiddenFlow === "outflow" ? text.missingOutflow : text.knownOutflow}</span><b>{scenario.hiddenFlow === "outflow" && !action ? "?" : outflow}</b></div>
      <div className={`missing-result ${action && animationStep > 0 ? "visible" : ""}`}><span>{text.final}</span><strong>{calculated}</strong><small>{text.target}: {scenario.final}</small></div>
    </div>
    <div className="flow-operation-facts"><span>{text.initial} <b>{scenario.initial}</b></span><span>{text.final} <b>{scenario.final}</b></span><span>{scenario.duration} {text.days}</span></div>
    <div className="missing-control-row"><button type="button" className="number-stepper" disabled={disabled || value <= 0} onClick={() => onAdjust(-1)}><Minus /></button><strong>{value}</strong><button type="button" className="number-stepper" disabled={disabled || value >= 25} onClick={() => onAdjust(1)}><Plus /></button><Button disabled={disabled} icon={<Check size={18} />} onClick={onCheck}>{text.check}</Button></div>
  </section>;
}

function TimelineGame({ scenario, action, animationStep, disabled, onChoose, text }: { scenario: TimelineScenario; action: FlowAction | null; animationStep: number; disabled: boolean; onChoose: (direction: TrendDirection) => void; text: typeof copy.tr | typeof copy.en }) {
  const values = timelineValues(scenario);
  const visibleStep = action ? Math.min(animationStep, 2) : 0;
  return <section className="flow-operation-game timeline-game">
    <div className="flow-timeline-scene">
      <div className="timeline-start"><small>{text.initial}</small><strong>{values[0]}</strong></div>
      {scenario.days.map((day, index) => <div key={index} className={`timeline-day ${visibleStep > index ? "played" : visibleStep === index + 1 ? "active" : ""}`}><small>{text.day} {index + 1}</small><span><b>+{day.inflow}</b><b>−{day.outflow}</b></span><strong>{action && visibleStep > index ? values[index + 1] : "?"}</strong></div>)}
      <svg viewBox="0 0 320 35" aria-hidden="true"><path d="M18 18 H302" /><path d="m290 8 12 10-12 10" /></svg>
    </div>
    <div className="trend-controls"><button type="button" disabled={disabled} className={action?.kind === "timeline" && action.direction === "up" ? "selected" : ""} onClick={() => onChoose("up")}><b>↑</b><span>{text.increases}</span></button><button type="button" disabled={disabled} className={action?.kind === "timeline" && action.direction === "flat" ? "selected" : ""} onClick={() => onChoose("flat")}><b>→</b><span>{text.steady}</span></button><button type="button" disabled={disabled} className={action?.kind === "timeline" && action.direction === "down" ? "selected" : ""} onClick={() => onChoose("down")}><b>↓</b><span>{text.decreases}</span></button></div>
  </section>;
}

function graphPoints(values: readonly number[]) {
  const min = Math.min(...values, 0); const max = Math.max(...values, 1); const range = Math.max(1, max - min);
  return values.map((value, index) => `${18 + index * (164 / (values.length - 1))},${80 - ((value - min) / range) * 58}`).join(" ");
}

function MiniGraph({ choice, selected, correct, revealed, index, onClick, text }: { choice: GraphChoice; selected: boolean; correct: boolean; revealed: boolean; index: number; onClick: () => void; text: typeof copy.tr | typeof copy.en }) {
  return <button type="button" className={`flow-graph-card ${selected ? "selected" : ""} ${revealed && correct ? "correct" : ""} ${revealed && selected && !correct ? "wrong" : ""}`} disabled={revealed} onClick={onClick} aria-label={`${text.graph} ${index + 1}`}>
    <svg viewBox="0 0 200 100" role="img" aria-hidden="true"><path className="axis" d="M16 8 V82 H190" /><path className="grid" d="M16 31 H190 M16 56 H190" /><polyline points={graphPoints(choice.values)} /><g>{choice.values.map((value, point) => { const [x, y] = graphPoints(choice.values).split(" ")[point]!.split(","); return <circle key={`${value}:${point}`} cx={x} cy={y} r="3" />; })}</g></svg>
    <span>{revealed && correct ? <CheckCircle2 size={18} /> : String.fromCharCode(65 + index)}</span>
  </button>;
}

function GraphGame({ scenario, choices, action, onChoose, text }: { scenario: GraphScenario; choices: GraphChoice[]; action: FlowAction | null; onChoose: (graphId: string) => void; text: typeof copy.tr | typeof copy.en }) {
  const selected = action?.kind === "graph" ? action.graphId : null;
  const simulation = graphSimulation(scenario);
  return <section className="flow-operation-game graph-game">
    <div className="graph-condition"><span>{text.initial} <b>{scenario.initial}</b></span>{scenario.dailyFlows.map((flow, index) => <span key={index}>{text.day} {index + 1} <b>+{flow.inflow} −{flow.outflow}</b></span>)}{scenario.capacity && <span>{text.capacity} <b>{scenario.capacity}</b></span>}{simulation.overflow > 0 && <span>{text.overflow} <b>{simulation.overflow}</b></span>}</div>
    <div className="graph-choice-grid">{choices.map((choice, index) => <MiniGraph key={choice.id} choice={choice} index={index} selected={selected === choice.id} correct={choice.id === `${scenario.id}-model`} revealed={Boolean(selected)} onClick={() => onChoose(choice.id)} text={text} />)}</div>
  </section>;
}

export function Week6FlowOperation({ seedKey, onSubmit, onDraft, existingSubmission, existingDraft, forceSubmit }: LearningModuleProps & { seedKey: string }) {
  const { locale } = useI18n();
  const text = copy[locale];
  const round = useMemo(() => buildFlowOperationRound(seedKey), [seedKey]);
  const scenarioIds = useMemo(() => round.map((scenario) => scenario.id), [round]);
  const hydrated = useMemo(() => hydrateDraft(existingDraft, round), [existingDraft, round]);
  const [stageIndex, setStageIndex] = useState(Math.min(hydrated.records.length, 4));
  const [records, setRecords] = useState<FlowRecord[]>(hydrated.records);
  const [tankOutflow, setTankOutflow] = useState(hydrated.control.tankOutflow ?? 12);
  const [missingValue, setMissingValue] = useState(hydrated.control.missingValue ?? 10);
  const [result, setResult] = useState<ResultState | null>(null);
  const [animationStep, setAnimationStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [completionReason, setCompletionReason] = useState<"completed" | "teacher-ended">("completed");
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const stageRef = useRef(stageIndex);
  const recordsRef = useRef(hydrated.records);
  const tankRef = useRef(tankOutflow);
  const missingRef = useRef(missingValue);
  const submissionStarted = useRef(false);
  const completedRef = useRef(false);
  const timerRefs = useRef<number[]>([]);
  const current = round[stageIndex]!;
  const currentAction = result?.record.action ?? null;
  const graphOptions = useMemo(() => round[4].kind === "graph" ? graphChoices(round[4], seedKey) : [], [round, seedKey]);

  const clearTimers = useCallback(() => { timerRefs.current.forEach((timer) => window.clearTimeout(timer)); timerRefs.current = []; }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  const submissionFor = useCallback((nextRecords: FlowRecord[], reason: "completed" | "teacher-ended" | "draft", nextStage = stageRef.current): ModuleSubmission => ({
    stage: Math.max(1, Math.min(5, nextStage + 1)), score: scoreFlowRecords(round, nextRecords), payload: { gameId: "week-6-flow-operation-v2", selectedScenarioIds: scenarioIds, stageIndex: nextStage, records: nextRecords, controlState: { scenarioId: round[Math.min(nextStage, 4)]!.id, tankOutflow: tankRef.current, missingValue: missingRef.current }, answeredCount: nextRecords.length, completionReason: reason, completionStatus: reason === "completed" ? "completed" : reason === "teacher-ended" ? "incomplete" : "draft" },
  }), [round, scenarioIds]);

  const saveDraft = useCallback((nextRecords = recordsRef.current, nextStage = stageRef.current) => { void onDraft?.(submissionFor(nextRecords, "draft", nextStage)); }, [onDraft, submissionFor]);
  const sendSubmission = useCallback(async (submission: ModuleSubmission) => { setSubmitting(true); setSubmitFailed(false); const accepted = await onSubmit(submission); setSubmitting(false); if (accepted === false) { submissionStarted.current = false; setSubmitFailed(true); } }, [onSubmit]);
  const finalize = useCallback((reason: "completed" | "teacher-ended") => { if (submissionStarted.current || existingSubmission) return; clearTimers(); submissionStarted.current = true; completedRef.current = true; setCompleted(true); setCompletionReason(reason); const submission = submissionFor(recordsRef.current, reason); setFinalSubmission(submission); void sendSubmission(submission); }, [clearTimers, existingSubmission, sendSubmission, submissionFor]);

  useEffect(() => { if (hydrated.records.length === 5 && !existingSubmission && !completedRef.current) finalize("completed"); }, [existingSubmission, finalize, hydrated.records.length]);
  useEffect(() => { if (forceSubmit && !completedRef.current && !existingSubmission) finalize("teacher-ended"); }, [existingSubmission, finalize, forceSubmit]);
  useEffect(() => { const flush = () => { if (!completedRef.current && !existingSubmission && !result) saveDraft(); }; window.addEventListener("pagehide", flush); return () => window.removeEventListener("pagehide", flush); }, [existingSubmission, result, saveDraft]);

  const resetControlsFor = useCallback((nextStage: number) => {
    const next = round[nextStage]!; const nextTank = next.kind === "tank" ? 12 : tankRef.current; const nextMissing = next.kind === "missing" ? 10 : missingRef.current;
    tankRef.current = nextTank; missingRef.current = nextMissing; setTankOutflow(nextTank); setMissingValue(nextMissing);
  }, [round]);

  const resolve = useCallback((action: FlowAction) => {
    if (result || completedRef.current || existingSubmission || forceSubmit || action.kind !== current.kind) return;
    clearTimers();
    const record: FlowRecord = { scenarioId: current.id, action };
    const nextRecords = [...recordsRef.current, record];
    recordsRef.current = nextRecords; setRecords(nextRecords); setResult({ record, correct: scoreFlowAction(current, action) === 20 }); setAnimationStep(0);
    const steps = current.kind === "warehouse" || current.kind === "tank" ? current.duration : current.kind === "timeline" ? 2 : 1;
    const nextStage = Math.min(stageRef.current + 1, 4);
    saveDraft(nextRecords, nextStage);
    for (let step = 1; step <= steps; step += 1) timerRefs.current.push(window.setTimeout(() => setAnimationStep(step), step * stepMs));
    timerRefs.current.push(window.setTimeout(() => {
      if (stageRef.current >= 4) { finalize("completed"); return; }
      const upcoming = stageRef.current + 1; stageRef.current = upcoming; setStageIndex(upcoming); setResult(null); setAnimationStep(0); resetControlsFor(upcoming);
    }, steps * stepMs + resultHoldMs));
  }, [clearTimers, current, existingSubmission, finalize, forceSubmit, resetControlsFor, result, saveDraft]);

  const adjustTank = (delta: number) => { if (result) return; const value = Math.max(0, Math.min(25, tankRef.current + delta)); tankRef.current = value; setTankOutflow(value); saveDraft(); };
  const adjustMissing = (delta: number) => { if (result) return; const value = Math.max(0, Math.min(25, missingRef.current + delta)); missingRef.current = value; setMissingValue(value); saveDraft(); };

  if (existingSubmission && !completed) return <section className="panel module-shell flow-operation-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  if (completed) return <section className="panel module-shell flow-operation-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><Sparkles size={42} /><h2>{completionReason === "completed" ? text.completed : text.partial}</h2><p>{text.completedDetail}</p>{submitting && <div className="notice">{text.saving}</div>}{submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void sendSubmission(finalSubmission)}>{text.retry}</Button></>}</div></section>;

  const stageTitle = current.kind === "warehouse" ? text.warehouseTitle : current.kind === "tank" ? text.tankTitle : current.kind === "missing" ? text.missingTitle : current.kind === "timeline" ? text.timelineTitle : text.graphTitle;
  const stagePrompt = current.kind === "warehouse" ? text.warehousePrompt : current.kind === "tank" ? text.tankPrompt : current.kind === "missing" ? text.missingPrompt : current.kind === "timeline" ? text.timelinePrompt : text.graphPrompt;
  const correctDetail = current.kind === "warehouse" ? `${text.correctRate}: ${warehouseCorrectRate(current)}${text.perDay}` : current.kind === "tank" ? `${text.correctValve}: ${tankCorrectOutflow(current)}${text.perMinute}` : current.kind === "missing" ? `${text.correctFlow}: ${missingCorrectFlow(current)}` : current.kind === "timeline" ? `${text.correctTrend}: ${timelineDirection(current) === "up" ? `↑ ${text.increases}` : timelineDirection(current) === "down" ? `↓ ${text.decreases}` : `→ ${text.steady}`}` : text.correctGraph;

  return <section className="panel module-shell flow-operation-shell">
    <header className="flow-operation-header"><div><span className="module-title-chip">{text.title}</span><h1>{stageTitle}</h1></div><div><span>{text.task} <b>{stageIndex + 1}/5</b></span><span>{text.score} <b>{scoreFlowRecords(round, records)}</b></span></div></header>
    <div className="flow-operation-progress">{round.map((scenario, index) => <i key={scenario.id} className={index < records.length ? "done" : index === stageIndex ? "active" : ""} />)}</div>
    <p className="flow-operation-prompt">{stagePrompt}</p>
    <div key={current.id} className="flow-operation-stage">
      {current.kind === "warehouse" && <WarehouseGame scenario={current} action={currentAction} animationStep={animationStep} disabled={Boolean(result)} onChoose={resolve} text={text} locale={locale} />}
      {current.kind === "tank" && <TankGame scenario={current} outflow={tankOutflow} action={currentAction} animationStep={animationStep} disabled={Boolean(result)} onAdjust={adjustTank} onStart={() => resolve({ kind: "tank", outflowRate: tankRef.current })} text={text} />}
      {current.kind === "missing" && <MissingFlowGame scenario={current} value={missingValue} action={currentAction} animationStep={animationStep} disabled={Boolean(result)} onAdjust={adjustMissing} onCheck={() => resolve({ kind: "missing", flowValue: missingRef.current })} text={text} />}
      {current.kind === "timeline" && <TimelineGame scenario={current} action={currentAction} animationStep={animationStep} disabled={Boolean(result)} onChoose={(direction) => resolve({ kind: "timeline", direction })} text={text} />}
      {current.kind === "graph" && <GraphGame scenario={current} choices={graphOptions} action={currentAction} onChoose={(graphId) => resolve({ kind: "graph", graphId })} text={text} />}
    </div>
    <div className="flow-operation-feedback" aria-live="polite">{result && <div className={result.correct ? "correct" : "wrong"}>{result.correct ? <CheckCircle2 /> : <X />}<span><strong>{result.correct ? text.correct : text.wrong}</strong>{!result.correct && <small>{correctDetail}</small>}</span></div>}</div>
  </section>;
}
