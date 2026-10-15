"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Check, CheckCircle2, Clock3, FlaskConical, Link2, LockKeyhole, Minus, Play, Plus, RotateCcw, ShieldCheck, Sparkles, Wrench, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import {
  buildRepairRound,
  localizedOutput,
  repairIsCorrect,
  scoreRepairProgress,
  type BehaviorRepair,
  type BehaviorScenario,
  type CapacityScenario,
  type DelayScenario,
  type Diagnosis,
  type InitialScenario,
  type RelationScenario,
  type RepairAction,
  type RepairProgress,
  type RepairScenario,
  type SignRepair,
  type SignScenario,
  type TimestepScenario,
  type UnitRepair,
  type UnitScenario,
} from "./repairContent";

type Phase = "diagnosis" | "repair" | "result";
type ControlState = {
  caseId: string;
  signs?: ["+" | "-", "+" | "-"];
  value?: number;
  operation?: UnitRepair["operation"];
  delayAdded?: boolean;
  selectedNodes?: string[];
  structure?: BehaviorRepair["structure"];
};
type DraftPayload = { gameId?: unknown; selectedCaseIds?: unknown; progress?: unknown; controlState?: unknown };

const copy = {
  tr: {
    title: "Hafta 6 · 2. Simülasyon Tamircisi", case: "Vaka", score: "Puan", diagnose: "TEŞHİS", repair: "ONARIM", test: "GÖRSEL TEST", verification: "Doğrulama", validation: "Geçerlilik",
    diagnosisPrompt: "Arıza kodda mı, model varsayımında mı?", verificationHint: "Kod, tanımlı modeli yanlış uyguluyor", validationHint: "Kod doğru; model gerçeği eksik temsil ediyor", diagnosisCorrect: "Teşhis doğru · +8", diagnosisWrong: "Teşhis farklı; onarımı yine yapabilirsin", codePassed: "Kod testi geçti", reference: "Beklenen model", simulation: "Simülasyon", observation: "Gerçek gözlem", output: "Çıktı",
    repairPrompt: "Bozuk model parçasını doğrudan onar.", testModel: "Modeli Test Et", correctRepair: "Onarım başarılı · +12", wrongRepair: "Test hâlâ uyuşmuyor", autoNext: "Sıradaki vaka hazırlanıyor…", addDelay: "Gecikme ekle", chooseDuration: "Süreyi seç", touchNodes: "Önce kaynak, sonra hedef düğüme dokun", capacity: "Üst sınır", emptySlot: "Boş yapı yuvası", placeStructure: "Eksik yapıyı yuvaya yerleştir", dt: "Zaman adımı", initial: "Başlangıç", conversion: "Dönüşüm", selected: "Seçildi",
    days: "gün", weeks: "hafta", positive: "pozitif", negative: "negatif", structures: { seasonal: "Mevsimsel giriş", balancing: "Dengeleyici geri bildirim", delayed: "Gecikmeli düzeltme" }, operations: { times24: "5 × 24", divide1000: "1500 ÷ 1000", percentOf200: "%10 × 200" },
    completed: "Beş simülasyon onarıldı", partial: "Oynanış öğretmen tarafından sonlandırıldı", completedDetail: "Değerlendirilen teşhis ve onarımlar kaydedildi. Sonuçlar öğretmen açıklayana kadar gizlidir.", saving: "Sonuç kaydediliyor…", saveError: "Sonuç kaydedilemedi; ilerlemen korundu.", retry: "Kaydı tekrar dene", locked: "Bu oynanış tamamlandı", lockedDetail: "Yanıtların daha önce kaydedildi.",
  },
  en: {
    title: "Week 6 · 2. Simulation Repairer", case: "Case", score: "Score", diagnose: "DIAGNOSE", repair: "REPAIR", test: "VISUAL TEST", verification: "Verification", validation: "Validation",
    diagnosisPrompt: "Is the fault in the code or the model assumption?", verificationHint: "Code implements the defined model incorrectly", validationHint: "Code is correct; the model misses reality", diagnosisCorrect: "Correct diagnosis · +8", diagnosisWrong: "Different diagnosis; you can still repair it", codePassed: "Code test passed", reference: "Expected model", simulation: "Simulation", observation: "Real observation", output: "Output",
    repairPrompt: "Repair the broken model part directly.", testModel: "Test Model", correctRepair: "Repair successful · +12", wrongRepair: "The test still does not match", autoNext: "Preparing the next case…", addDelay: "Add delay", chooseDuration: "Choose duration", touchNodes: "Tap the source, then the target node", capacity: "Upper limit", emptySlot: "Empty structure slot", placeStructure: "Place the missing structure in the slot", dt: "Time step", initial: "Initial", conversion: "Conversion", selected: "Selected",
    days: "days", weeks: "weeks", positive: "positive", negative: "negative", structures: { seasonal: "Seasonal inflow", balancing: "Balancing feedback", delayed: "Delayed correction" }, operations: { times24: "5 × 24", divide1000: "1500 ÷ 1000", percentOf200: "10% × 200" },
    completed: "Five simulations repaired", partial: "The teacher ended this play", completedDetail: "Evaluated diagnoses and repairs were saved. Results stay hidden until the teacher reveals them.", saving: "Saving result…", saveError: "The result could not be saved; your progress is preserved.", retry: "Try saving again", locked: "This play is complete", lockedDetail: "Your answers were already recorded.",
  },
} as const;

function safeRepair(value: unknown): RepairAction | undefined {
  if (!value || typeof value !== "object") return undefined;
  const action = value as Record<string, unknown>;
  if (action.kind === "sign" && Array.isArray(action.signs) && action.signs.length === 2 && action.signs.every((sign) => sign === "+" || sign === "-")) return { kind: "sign", signs: [action.signs[0], action.signs[1]] } as SignRepair;
  if ((action.kind === "timestep" || action.kind === "initial" || action.kind === "capacity") && typeof action.value === "number" && Number.isFinite(action.value)) return { kind: action.kind, value: action.value } as RepairAction;
  if (action.kind === "unit" && (action.operation === "times24" || action.operation === "divide1000" || action.operation === "percentOf200")) return { kind: "unit", operation: action.operation };
  if (action.kind === "delay" && typeof action.value === "number" && (action.unit === "days" || action.unit === "weeks")) return { kind: "delay", value: action.value, unit: action.unit };
  if (action.kind === "relation" && typeof action.from === "string" && typeof action.to === "string" && (action.polarity === "positive" || action.polarity === "negative")) return { kind: "relation", from: action.from, to: action.to, polarity: action.polarity };
  if (action.kind === "behavior" && (action.structure === "seasonal" || action.structure === "balancing" || action.structure === "delayed")) return { kind: "behavior", structure: action.structure };
  return undefined;
}

function defaultControl(scenario: RepairScenario): ControlState {
  if (scenario.category === "sign") return { caseId: scenario.id, signs: [...scenario.brokenSigns] };
  if (scenario.category === "timestep") return { caseId: scenario.id, value: scenario.brokenValue };
  if (scenario.category === "initial") return { caseId: scenario.id, value: scenario.brokenValue };
  if (scenario.category === "capacity") return { caseId: scenario.id, value: scenario.brokenCapacity };
  if (scenario.category === "delay") return { caseId: scenario.id, delayAdded: false };
  if (scenario.category === "relation") return { caseId: scenario.id, selectedNodes: [] };
  return { caseId: scenario.id };
}

function hydrateDraft(draft: ModuleDraft | null | undefined, round: readonly RepairScenario[]) {
  const payload = draft?.payload as DraftPayload | undefined;
  const ids = round.map((scenario) => scenario.id);
  const matches = payload?.gameId === "week-6-simulation-repair-v2" && Array.isArray(payload.selectedCaseIds) && payload.selectedCaseIds.length === 5 && payload.selectedCaseIds.every((id, index) => id === ids[index]);
  const progress: RepairProgress[] = [];
  if (matches && Array.isArray(payload.progress)) {
    for (const [index, value] of payload.progress.slice(0, 5).entries()) {
      if (!value || typeof value !== "object") break;
      const raw = value as Record<string, unknown>;
      if (raw.caseId !== ids[index]) break;
      const diagnosis = raw.diagnosis === "verification" || raw.diagnosis === "validation" ? raw.diagnosis : undefined;
      const repair = safeRepair(raw.repair);
      if (!diagnosis && !repair) break;
      progress.push({ caseId: String(raw.caseId), diagnosis, repair });
      if (!repair) break;
    }
  }
  const completed = progress.filter((record) => record.repair).length;
  const caseIndex = Math.min(completed, 4);
  const scenario = round[caseIndex]!;
  const rawControl = matches && payload?.controlState && typeof payload.controlState === "object" ? payload.controlState as ControlState : null;
  const fallback = defaultControl(scenario);
  const control = rawControl?.caseId === scenario.id ? { ...fallback, ...rawControl, caseId: scenario.id } : fallback;
  return { progress, caseIndex, control };
}

function graphPoints(values: readonly number[]) {
  const min = Math.min(...values, 0); const max = Math.max(...values, 1); const range = Math.max(1, max - min);
  return values.map((value, index) => `${10 + index * (160 / Math.max(1, values.length - 1))},${72 - ((value - min) / range) * 54}`).join(" ");
}

function EvidencePanel({ scenario, repaired, repairCorrect, locale, text }: { scenario: RepairScenario; repaired: boolean; repairCorrect: boolean; locale: "tr" | "en"; text: typeof copy.tr | typeof copy.en }) {
  const finalGraph = repaired && repairCorrect ? scenario.fixedSeries : scenario.modelSeries;
  const brokenOutput = localizedOutput(scenario.brokenOutput, locale);
  const fixedOutput = localizedOutput(scenario.fixedOutput, locale);
  const output = repaired && repairCorrect ? fixedOutput : brokenOutput;
  return <div className={`repair-evidence ${repaired ? repairCorrect ? "fixed" : "failed" : "fault"}`}>
    <div className="repair-monitor-head"><span><FlaskConical size={16} /> {scenario.id} · {scenario.title[locale]}</span><i>{scenario.diagnosis === "validation" ? <><ShieldCheck size={14} /> {text.codePassed}</> : <><Activity size={14} /> {text.reference}</>}</i></div>
    <p>{scenario.context[locale]}</p>
    {scenario.diagnosis === "verification" ? <div className="repair-reference-grid"><span><small>{text.reference}</small><b>{scenario.reference[locale]}</b></span><span><small>{text.simulation}</small><strong>{text.output}: {output}</strong></span></div> : <div className="repair-graph-compare">
      <span><small>{text.observation}</small><svg viewBox="0 0 180 82" aria-hidden="true"><path d="M8 8 V74 H174" />{scenario.realSeries && <polyline points={graphPoints(scenario.realSeries)} />}</svg></span>
      <span><small>{text.simulation}</small><svg viewBox="0 0 180 82" aria-hidden="true"><path d="M8 8 V74 H174" />{finalGraph && <polyline points={graphPoints(finalGraph)} />}</svg></span>
    </div>}
    <div className="repair-evidence-note">{repaired && repairCorrect ? <CheckCircle2 size={16} /> : <Wrench size={16} />}<span>{repaired && repairCorrect ? `${brokenOutput} → ${fixedOutput}` : scenario.evidence[locale]}</span></div>
  </div>;
}

function DiagnosisPanel({ selected, disabled, onChoose, text }: { selected?: Diagnosis; disabled: boolean; onChoose: (value: Diagnosis) => void; text: typeof copy.tr | typeof copy.en }) {
  return <div className="repair-diagnosis-panel"><strong>{text.diagnosisPrompt}</strong><div className="repair-diagnosis-grid">
    <button type="button" disabled={disabled} className={selected === "verification" ? "selected" : ""} onClick={() => onChoose("verification")}><Activity /><span><b>{text.verification}</b><small>{text.verificationHint}</small></span></button>
    <button type="button" disabled={disabled} className={selected === "validation" ? "selected" : ""} onClick={() => onChoose("validation")}><ShieldCheck /><span><b>{text.validation}</b><small>{text.validationHint}</small></span></button>
  </div></div>;
}

function SignRepairPanel({ scenario, control, setControl, onTest, text }: RepairPanelProps<SignScenario>) {
  const signs = control.signs ?? scenario.brokenSigns;
  const toggle = (index: 0 | 1) => { const next: SignRepair["signs"] = [...signs]; next[index] = next[index] === "+" ? "-" : "+"; setControl({ ...control, signs: next }); };
  return <RepairFrame instruction={text.repairPrompt} onTest={onTest} text={text}><div className="sign-repair-equation"><b>{scenario.terms[0]}</b><button type="button" onClick={() => toggle(0)}>{signs[0]}</button><b>{scenario.terms[1]}</b><button type="button" onClick={() => toggle(1)}>{signs[1]}</button><b>{scenario.terms[2]}</b><i>=</i><strong>{scenario.terms[0] + (signs[0] === "+" ? scenario.terms[1] : -scenario.terms[1]) + (signs[1] === "+" ? scenario.terms[2] : -scenario.terms[2])}</strong></div></RepairFrame>;
}

type RepairPanelProps<T extends RepairScenario> = { scenario: T; control: ControlState; setControl: (next: ControlState) => void; onTest: () => void; text: typeof copy.tr | typeof copy.en; locale: "tr" | "en" };
function RepairFrame({ instruction, children, onTest, disabled, text }: { instruction: string; children: ReactNode; onTest: () => void; disabled?: boolean; text: typeof copy.tr | typeof copy.en }) { return <div className="repair-action-panel"><strong>{instruction}</strong>{children}<Button disabled={disabled} icon={<Play size={17} fill="currentColor" />} onClick={onTest}>{text.testModel}</Button></div>; }

function NumericRepairPanel({ scenario, control, setControl, onTest, text }: RepairPanelProps<TimestepScenario | InitialScenario | CapacityScenario>) {
  const value = control.value ?? (scenario.category === "timestep" ? scenario.brokenValue : scenario.category === "initial" ? scenario.brokenValue : scenario.brokenCapacity);
  const choices = scenario.category === "timestep" ? scenario.choices : scenario.category === "initial" ? scenario.choices : scenario.capacityChoices;
  const label = scenario.category === "timestep" ? text.dt : scenario.category === "initial" ? text.initial : text.capacity;
  const step = scenario.category === "timestep" ? scenario.correctValue <= .25 ? .05 : .25 : scenario.category === "capacity" && scenario.correctCapacity >= 100 ? 10 : 1;
  const suffix = scenario.category === "initial" ? scenario.suffix ?? "" : "";
  const adjust = (delta: number) => setControl({ ...control, value: Math.max(0, Math.round((value + delta) * 100) / 100) });
  return <RepairFrame instruction={text.repairPrompt} onTest={onTest} text={text}><div className={`numeric-repair ${scenario.category}`}><small>{label}</small><div><button type="button" aria-label="−" onClick={() => adjust(-step)}><Minus /></button><strong>{suffix}{String(value).replace(".", ",")}</strong><button type="button" aria-label="+" onClick={() => adjust(step)}><Plus /></button></div><section>{choices.map((choice) => <button type="button" key={choice} className={value === choice ? "selected" : ""} onClick={() => setControl({ ...control, value: choice })}>{suffix}{String(choice).replace(".", ",")}</button>)}</section></div></RepairFrame>;
}

function UnitRepairPanel({ scenario, control, setControl, onTest, text, locale }: RepairPanelProps<UnitScenario>) {
  return <RepairFrame instruction={text.repairPrompt} onTest={onTest} disabled={!control.operation} text={text}><div className="unit-repair"><span><small>{text.output}</small><b>{localizedOutput(scenario.brokenOutput, locale)}</b></span><i>→</i><div>{scenario.operationChoices.map((operation) => <button type="button" key={operation} className={control.operation === operation ? "selected" : ""} onClick={() => setControl({ ...control, operation })}>{text.operations[operation]}</button>)}</div></div></RepairFrame>;
}

function DelayRepairPanel({ scenario, control, setControl, onTest, text, locale }: RepairPanelProps<DelayScenario>) {
  const unit = scenario.delayUnit === "days" ? text.days : text.weeks;
  return <RepairFrame instruction={control.delayAdded ? text.chooseDuration : text.addDelay} onTest={onTest} disabled={!control.delayAdded || control.value === undefined} text={text}><div className="delay-repair"><span>{scenario.source[locale]}</span><div className="delay-link"><i /><button type="button" className={control.delayAdded ? "filled" : ""} onClick={() => setControl({ ...control, delayAdded: true })}>{control.delayAdded ? <Clock3 /> : <Plus />}</button></div><span>{scenario.target[locale]}</span>{control.delayAdded && <section>{scenario.delayChoices.map((choice) => <button type="button" key={choice} className={control.value === choice ? "selected" : ""} onClick={() => setControl({ ...control, value: choice })}>{choice} {unit}</button>)}</section>}</div></RepairFrame>;
}

function RelationRepairPanel({ scenario, control, setControl, onTest, text, locale }: RepairPanelProps<RelationScenario>) {
  const selected = control.selectedNodes ?? [];
  const choose = (id: string) => setControl({ ...control, selectedNodes: selected.length >= 2 ? [id] : selected.includes(id) ? selected : [...selected, id] });
  return <RepairFrame instruction={text.touchNodes} onTest={onTest} disabled={selected.length !== 2} text={text}><div className="relation-repair"><svg viewBox="0 0 320 90" aria-hidden="true">{selected.length === 2 && <><path d="M74 45 H246" /><path d="m232 34 14 11-14 11" /></>}</svg>{scenario.nodes.map((node, index) => <button type="button" key={node.id} className={`${selected.includes(node.id) ? "selected" : ""} node-${index}`} onClick={() => choose(node.id)}><span>{index + 1}</span>{node.label[locale]}</button>)}{selected.length === 2 && <i>{scenario.polarity === "positive" ? <ArrowUpRight /> : <ArrowDownRight />} {scenario.polarity === "positive" ? text.positive : text.negative}</i>}</div></RepairFrame>;
}

function BehaviorRepairPanel({ scenario, control, setControl, onTest, text }: RepairPanelProps<BehaviorScenario>) {
  return <RepairFrame instruction={text.placeStructure} onTest={onTest} disabled={!control.structure} text={text}><div className="behavior-repair"><div className={`behavior-slot ${control.structure ? "filled" : ""}`}>{control.structure ? <><Link2 />{text.structures[control.structure]}</> : <><Plus />{text.emptySlot}</>}</div><section>{scenario.structureChoices.map((structure) => <button type="button" key={structure} className={control.structure === structure ? "selected" : ""} onClick={() => setControl({ ...control, structure })}><svg viewBox="0 0 90 34" aria-hidden="true"><polyline points={structure === "seasonal" ? "2,18 16,5 31,28 47,7 63,27 88,10" : structure === "balancing" ? "2,30 20,12 39,7 58,17 88,17" : "2,30 19,5 37,29 56,9 73,23 88,16"} /></svg><span>{text.structures[structure]}</span></button>)}</section></div></RepairFrame>;
}

function actionFromControl(scenario: RepairScenario, control: ControlState): RepairAction | null {
  if (scenario.category === "sign") return { kind: "sign", signs: control.signs ?? scenario.brokenSigns };
  if (scenario.category === "timestep" && control.value !== undefined) return { kind: "timestep", value: control.value };
  if (scenario.category === "initial" && control.value !== undefined) return { kind: "initial", value: control.value };
  if (scenario.category === "capacity" && control.value !== undefined) return { kind: "capacity", value: control.value };
  if (scenario.category === "unit" && control.operation) return { kind: "unit", operation: control.operation };
  if (scenario.category === "delay" && control.delayAdded && control.value !== undefined) return { kind: "delay", value: control.value, unit: scenario.delayUnit };
  if (scenario.category === "relation" && control.selectedNodes?.length === 2) return { kind: "relation", from: control.selectedNodes[0]!, to: control.selectedNodes[1]!, polarity: scenario.polarity };
  if (scenario.category === "behavior" && control.structure) return { kind: "behavior", structure: control.structure };
  return null;
}

export function Week6SimulationRepair({ seedKey, onSubmit, onDraft, existingSubmission, existingDraft, forceSubmit }: LearningModuleProps & { seedKey: string }) {
  const { locale } = useI18n(); const text = copy[locale];
  const round = useMemo(() => buildRepairRound(seedKey), [seedKey]);
  const selectedCaseIds = useMemo(() => round.map((scenario) => scenario.id), [round]);
  const hydrated = useMemo(() => hydrateDraft(existingDraft, round), [existingDraft, round]);
  const [caseIndex, setCaseIndex] = useState(hydrated.caseIndex);
  const [progress, setProgress] = useState<RepairProgress[]>(hydrated.progress);
  const [phase, setPhase] = useState<Phase>(hydrated.progress[hydrated.caseIndex]?.diagnosis && !hydrated.progress[hydrated.caseIndex]?.repair ? "repair" : "diagnosis");
  const [control, setControlState] = useState<ControlState>(hydrated.control);
  const [diagnosisFeedback, setDiagnosisFeedback] = useState<"correct" | "wrong" | null>(null);
  const [resultCorrect, setResultCorrect] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completionReason, setCompletionReason] = useState<"completed" | "teacher-ended">("completed");
  const [submitting, setSubmitting] = useState(false); const [submitFailed, setSubmitFailed] = useState(false); const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const progressRef = useRef(hydrated.progress); const caseRef = useRef(hydrated.caseIndex); const phaseRef = useRef<Phase>(phase); const controlRef = useRef(hydrated.control); const submissionStarted = useRef(false); const completedRef = useRef(false); const timerRefs = useRef<number[]>([]);
  const current = round[caseIndex]!; const currentProgress = progress[caseIndex];
  const clearTimers = useCallback(() => { timerRefs.current.forEach((timer) => window.clearTimeout(timer)); timerRefs.current = []; }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  const submissionFor = useCallback((nextProgress: RepairProgress[], reason: "completed" | "teacher-ended" | "draft", nextCase = caseRef.current, nextPhase = phaseRef.current, nextControl = controlRef.current): ModuleSubmission => ({
    stage: Math.max(1, Math.min(5, nextCase + 1)), score: scoreRepairProgress(round, nextProgress), payload: { gameId: "week-6-simulation-repair-v2", selectedCaseIds, progress: nextProgress, caseIndex: nextCase, phase: nextPhase, controlState: nextControl, answeredCount: nextProgress.filter((record) => record.repair).length, completionReason: reason, completionStatus: reason === "completed" ? "completed" : reason === "teacher-ended" ? "incomplete" : "draft" },
  }), [round, selectedCaseIds]);
  const saveDraft = useCallback((nextProgress = progressRef.current, nextCase = caseRef.current, nextPhase = phaseRef.current, nextControl = controlRef.current) => { void onDraft?.(submissionFor(nextProgress, "draft", nextCase, nextPhase, nextControl)); }, [onDraft, submissionFor]);
  const sendSubmission = useCallback(async (submission: ModuleSubmission) => { setSubmitting(true); setSubmitFailed(false); const accepted = await onSubmit(submission); setSubmitting(false); if (accepted === false) { submissionStarted.current = false; setSubmitFailed(true); } }, [onSubmit]);
  const finalize = useCallback((reason: "completed" | "teacher-ended") => { if (submissionStarted.current || existingSubmission) return; clearTimers(); submissionStarted.current = true; completedRef.current = true; setCompleted(true); setCompletionReason(reason); const submission = submissionFor(progressRef.current, reason); setFinalSubmission(submission); void sendSubmission(submission); }, [clearTimers, existingSubmission, sendSubmission, submissionFor]);
  useEffect(() => { if (hydrated.progress.filter((record) => record.repair).length === 5 && !existingSubmission && !completedRef.current) finalize("completed"); }, [existingSubmission, finalize, hydrated.progress]);
  useEffect(() => { if (forceSubmit && !completedRef.current && !existingSubmission) finalize("teacher-ended"); }, [existingSubmission, finalize, forceSubmit]);
  useEffect(() => { const flush = () => { if (!completedRef.current && !existingSubmission && phaseRef.current !== "result") saveDraft(); }; window.addEventListener("pagehide", flush); return () => window.removeEventListener("pagehide", flush); }, [existingSubmission, saveDraft]);

  const updateControl = (next: ControlState) => { controlRef.current = next; setControlState(next); saveDraft(progressRef.current, caseRef.current, phaseRef.current, next); };
  const chooseDiagnosis = (diagnosis: Diagnosis) => {
    if (phaseRef.current !== "diagnosis" || currentProgress?.diagnosis) return;
    const record: RepairProgress = { caseId: current.id, diagnosis };
    const next = [...progressRef.current]; next[caseRef.current] = record; progressRef.current = next; setProgress(next); setDiagnosisFeedback(diagnosis === current.diagnosis ? "correct" : "wrong"); saveDraft(next, caseRef.current, "diagnosis");
    timerRefs.current.push(window.setTimeout(() => { phaseRef.current = "repair"; setPhase("repair"); setDiagnosisFeedback(null); saveDraft(next, caseRef.current, "repair"); }, 560));
  };
  const testRepair = () => {
    if (phaseRef.current !== "repair") return;
    const repair = actionFromControl(current, controlRef.current); if (!repair) return;
    const existing = progressRef.current[caseRef.current] ?? { caseId: current.id };
    const record: RepairProgress = { ...existing, caseId: current.id, repair };
    const next = [...progressRef.current]; next[caseRef.current] = record; progressRef.current = next; setProgress(next); const correct = repairIsCorrect(current, repair); setResultCorrect(correct); phaseRef.current = "result"; setPhase("result"); saveDraft(next, caseRef.current, "result");
    timerRefs.current.push(window.setTimeout(() => {
      if (caseRef.current >= 4) { finalize("completed"); return; }
      const upcoming = caseRef.current + 1; caseRef.current = upcoming; setCaseIndex(upcoming); phaseRef.current = "diagnosis"; setPhase("diagnosis"); const nextControl = defaultControl(round[upcoming]!); controlRef.current = nextControl; setControlState(nextControl); setResultCorrect(false); saveDraft(next, upcoming, "diagnosis", nextControl);
    }, 1250));
  };

  if (existingSubmission && !completed) return <section className="panel module-shell simulation-repair-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  if (completed) return <section className="panel module-shell simulation-repair-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><Sparkles size={42} /><h2>{completionReason === "completed" ? text.completed : text.partial}</h2><p>{text.completedDetail}</p>{submitting && <div className="notice">{text.saving}</div>}{submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void sendSubmission(finalSubmission)}>{text.retry}</Button></>}</div></section>;

  const repairPanel = current.category === "sign" ? <SignRepairPanel scenario={current} control={control} setControl={updateControl} onTest={testRepair} text={text} locale={locale} />
    : current.category === "timestep" || current.category === "initial" || current.category === "capacity" ? <NumericRepairPanel scenario={current} control={control} setControl={updateControl} onTest={testRepair} text={text} locale={locale} />
    : current.category === "unit" ? <UnitRepairPanel scenario={current} control={control} setControl={updateControl} onTest={testRepair} text={text} locale={locale} />
    : current.category === "delay" ? <DelayRepairPanel scenario={current} control={control} setControl={updateControl} onTest={testRepair} text={text} locale={locale} />
    : current.category === "relation" ? <RelationRepairPanel scenario={current} control={control} setControl={updateControl} onTest={testRepair} text={text} locale={locale} />
    : <BehaviorRepairPanel scenario={current} control={control} setControl={updateControl} onTest={testRepair} text={text} locale={locale} />;

  return <section className="panel module-shell simulation-repair-shell">
    <header className="simulation-repair-header"><div><span className="module-title-chip">{text.title}</span><h1>{current.title[locale]}</h1></div><div><span>{text.case} <b>{caseIndex + 1}/5</b></span><span>{text.score} <b>{scoreRepairProgress(round, progress)}</b></span></div></header>
    <div className="simulation-repair-progress">{round.map((scenario, index) => <i key={scenario.id} className={progress[index]?.repair ? "done" : index === caseIndex ? "active" : ""} />)}</div>
    <div className="simulation-repair-phase"><span className={phase === "diagnosis" ? "active" : currentProgress?.diagnosis ? "done" : ""}>{text.diagnose}</span><i /><span className={phase === "repair" ? "active" : phase === "result" ? "done" : ""}>{text.repair}</span><i /><span className={phase === "result" ? "active" : ""}>{text.test}</span></div>
    <EvidencePanel scenario={current} repaired={phase === "result"} repairCorrect={resultCorrect} locale={locale} text={text} />
    <div className="simulation-repair-active">
      {phase === "diagnosis" && <DiagnosisPanel selected={currentProgress?.diagnosis} disabled={Boolean(diagnosisFeedback)} onChoose={chooseDiagnosis} text={text} />}
      {phase === "repair" && repairPanel}
      {phase === "result" && <div className={`repair-result ${resultCorrect ? "correct" : "wrong"}`}>{resultCorrect ? <CheckCircle2 /> : <X />}<span><strong>{resultCorrect ? text.correctRepair : text.wrongRepair}</strong><small>{text.autoNext}</small></span></div>}
      {diagnosisFeedback && <div className={`repair-diagnosis-feedback ${diagnosisFeedback}`}>{diagnosisFeedback === "correct" ? <Check /> : <X />}{diagnosisFeedback === "correct" ? text.diagnosisCorrect : text.diagnosisWrong}</div>}
    </div>
  </section>;
}
