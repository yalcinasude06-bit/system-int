"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, Boxes, Clock3, Cog, Factory, Gauge, HeartPulse, LockKeyhole, PackageCheck, RotateCcw, ShieldCheck, Sparkles, Timer, Truck, Wrench } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleSubmission } from "@/types";
import {
  CONTROL_ROOM_CONFIG,
  applyIntervention,
  buildControlRoomScenario,
  cardWindowIndex,
  cardsForState,
  causalFeedback,
  getIntervention,
  getInterventionAvailability,
  hasCollapsed,
  isSafeState,
  restoreControlRoomState,
  scoreControlRoom,
  stepSimulation,
  type ControlRoomState,
  type InterventionDefinition,
  type InterventionId,
} from "./controlRoomEngine";

type DraftPayload = { state?: unknown };
type CompletionReason = "completed" | "teacher-ended" | "system-collapse";

const copy = {
  tr: {
    title: "Hafta 5 · Modül 3: Denge Ustası",
    subtitle: "Sistem Kontrol Odası",
    modelNote: "Eğitim amaçlı temsili sistem modeli",
    production: "Üretim performansı",
    failure: "Arıza riski",
    delay: "Teslimat gecikmesi",
    health: "Makine sağlığı",
    good: "Güvenli",
    watch: "İzle",
    critical: "Kritik",
    higherBetter: "yüksek olması daha iyi",
    lowerBetter: "düşük olması daha iyi",
    time: "Kalan süre",
    safeTime: "Güvenli dengede",
    progress: "Tur ilerlemesi",
    calm: "Sistem sakin; göstergeleri okuyup sonraki hamleyi planla.",
    interventions: "Aktif müdahaleler",
    cardsChanged: "2 yeni müdahale geldi",
    cooldown: "Bekleme",
    ready: "Uygula",
    majorReason: "Büyük müdahale sürüyor",
    conditionReason: "Makine uyarısı veya yüksek arıza riski gerekir",
    phase: "Aşama",
    phaseLow: "Düşük baskı",
    phaseWave: "Talep / arıza dalgası",
    phaseCritical: "Kritik denge",
    criticalWarning: "Kritik eşik sürüyor — sistemi birkaç saniye içinde dengele!",
    paused: "Sekme arka plandayken simülasyon duraklatıldı",
    complete: "Kontrol odası turu tamamlandı",
    partial: "Tur öğretmen tarafından sonlandırıldı",
    collapsed: "Sistem kritik sınırı uzun süre aştı",
    completeDetail: "Puanın müdahale sayısından değil, bütün sistemi dengede tutma performansından hesaplandı.",
    safeResult: "Güvenli denge süresi",
    orderResult: "Tamamlanan sipariş",
    healthResult: "Son makine sağlığı",
    insight: "Kararlarından nedensel öğrenme",
    noInsight: "Bu turda belirgin bir kısa yol yan etkisi oluşmadı; dengeli kaynak kullanımını sürdürdün.",
    saving: "Sonuç kaydediliyor…",
    saveError: "Sonuç kaydedilemedi. İlerlemen korunuyor.",
    retry: "Kaydı tekrar dene",
    locked: "Bu oynanış tamamlandı",
    lockedDetail: "Sonucun bir kez kaydedildi. Öğretmenin sonuçları açıklamasını bekle.",
    safeNow: "Sistem dengede",
    unstableNow: "Sistem baskı altında",
    actionApplied: "Müdahale uygulandı",
    seconds: "sn",
  },
  en: {
    title: "Week 5 · Module 3: Balance Master",
    subtitle: "System Control Room",
    modelNote: "Representative model for educational use",
    production: "Production performance",
    failure: "Failure risk",
    delay: "Delivery delay",
    health: "Machine health",
    good: "Safe",
    watch: "Watch",
    critical: "Critical",
    higherBetter: "higher is better",
    lowerBetter: "lower is better",
    time: "Time left",
    safeTime: "Time safely balanced",
    progress: "Round progress",
    calm: "The system is calm; read the indicators and plan your next move.",
    interventions: "Active interventions",
    cardsChanged: "2 new interventions arrived",
    cooldown: "Cooldown",
    ready: "Apply",
    majorReason: "A major intervention is active",
    conditionReason: "Requires a machine warning or elevated failure risk",
    phase: "Phase",
    phaseLow: "Low pressure",
    phaseWave: "Demand / failure wave",
    phaseCritical: "Critical balance",
    criticalWarning: "Critical threshold continues — rebalance the system within seconds!",
    paused: "The simulation pauses while this tab is in the background",
    complete: "Control-room round complete",
    partial: "The teacher ended the round",
    collapsed: "The system remained beyond a critical limit",
    completeDetail: "Your score was calculated from whole-system balance, not the number of interventions.",
    safeResult: "Safe balance time",
    orderResult: "Orders completed",
    healthResult: "Final machine health",
    insight: "Causal learning from your decisions",
    noInsight: "No major shortcut side effect emerged this round; you maintained balanced resource use.",
    saving: "Saving result…",
    saveError: "The result could not be saved. Your progress is preserved.",
    retry: "Try saving again",
    locked: "This play is complete",
    lockedDetail: "Your result was recorded once. Wait for your teacher to reveal the results.",
    safeNow: "System balanced",
    unstableNow: "System under pressure",
    actionApplied: "Intervention applied",
    seconds: "sec",
  },
} as const;

function metricTone(value: number, direction: "high" | "low") {
  const good = direction === "high" ? value >= 55 : value < 45;
  const critical = direction === "high" ? value <= 30 : value >= 70;
  return critical ? "critical" : good ? "good" : "watch";
}

function MetricCard({ label, value, direction, icon, labels }: { label: string; value: number; direction: "high" | "low"; icon: React.ReactNode; labels: { good: string; watch: string; critical: string; higherBetter: string; lowerBetter: string } }) {
  const rounded = Math.round(value);
  const tone = metricTone(rounded, direction);
  return <div className={`balance-metric ${tone}`}>
    <span className="balance-metric-icon">{icon}</span>
    <span>{label} <b className="balance-direction" aria-label={direction === "high" ? labels.higherBetter : labels.lowerBetter}>{direction === "high" ? "↑" : "↓"}</b></span>
    <strong>{rounded}%</strong>
    <small>{labels[tone]}</small>
    <i role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={rounded}><b style={{ width: `${rounded}%` }} /></i>
  </div>;
}

function interventionReason(text: typeof copy.tr | typeof copy.en, reason: ReturnType<typeof getInterventionAvailability>["reason"], remainingMs: number) {
  if (reason === "cooldown") return `${text.cooldown}: ${Math.max(1, Math.ceil(remainingMs / 1_000))} ${text.seconds}`;
  if (reason === "major-active") return `${text.majorReason}: ${Math.max(1, Math.ceil(remainingMs / 1_000))} ${text.seconds}`;
  if (reason === "condition") return text.conditionReason;
  return text.ready;
}

function ControlFactory({ state }: { state: ControlRoomState }) {
  const pendingMaintenance = state.pendingEffects.some((effect) => effect.sourceId === "planned-maintenance" || effect.sourceId === "emergency-maintenance");
  const packages = Math.max(1, Math.min(6, Math.ceil(state.backlog / 7)));
  return <div className={`balance-factory ${state.production >= 70 ? "fast" : ""} ${state.failureRisk >= 70 ? "danger" : ""} ${pendingMaintenance ? "maintenance" : ""}`} aria-hidden="true">
    <div className="balance-factory-building"><Factory /><b>SYS LAB</b><span>CONTROL</span></div>
    <div className="balance-machine"><Cog className="gear-one" /><Cog className="gear-two" /><i /><b>{Math.round(state.health)}%</b></div>
    <div className="balance-conveyor"><i /><i /><i />{Array.from({ length: packages }, (_, index) => <span key={index} style={{ "--package-index": index } as React.CSSProperties}>📦</span>)}</div>
    <div className="balance-orders"><Boxes /><b>{Math.ceil(state.backlog)}</b></div>
    <div className="balance-shipping"><Truck /><PackageCheck /></div>
    {pendingMaintenance && <div className="balance-maintenance"><Wrench /></div>}
    {state.failureRisk >= 70 && <div className="balance-factory-alert"><AlertTriangle /></div>}
  </div>;
}

function InterventionCard({ intervention, state, scenario, onApply, labels, locale }: { intervention: InterventionDefinition; state: ControlRoomState; scenario: ReturnType<typeof buildControlRoomScenario>; onApply: (id: InterventionId) => void; labels: typeof copy.tr | typeof copy.en; locale: "tr" | "en" }) {
  const availability = getInterventionAvailability(state, scenario, intervention);
  return <button type="button" className={`balance-action-card ${intervention.kind}`} disabled={!availability.available} onClick={() => onApply(intervention.id)} aria-describedby={`balance-action-${intervention.id}`} title={intervention.conditions[locale]}>
    <span className="balance-action-icon" aria-hidden="true">{intervention.icon}</span>
    <strong data-i18n-skip>{intervention.name[locale]}</strong>
    <p id={`balance-action-${intervention.id}`} data-i18n-skip>{intervention.description[locale]}</p>
    <small>{interventionReason(labels, availability.reason, availability.remainingMs)}</small>
  </button>;
}

export function Week5BalanceMaster({ onSubmit, onDraft, existingSubmission, existingDraft, forceSubmit, seedKey }: LearningModuleProps & { seedKey: string }) {
  const { locale } = useI18n();
  const text = copy[locale];
  const scenario = useMemo(() => buildControlRoomScenario(seedKey), [seedKey]);
  const initialState = useMemo(() => restoreControlRoomState((existingDraft?.payload as DraftPayload | undefined)?.state, scenario), [existingDraft, scenario]);
  const [state, setState] = useState(initialState);
  const [completed, setCompleted] = useState(false);
  const [completionReason, setCompletionReason] = useState<CompletionReason>("completed");
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ message: string; untilMs: number } | null>(null);

  const stateRef = useRef(initialState);
  const completedRef = useRef(false);
  const submissionStarted = useRef(false);
  const lastFrame = useRef<number | null>(null);
  const accumulator = useRef(0);
  const frameId = useRef<number | null>(null);
  const checkpointWindow = useRef(cardWindowIndex(initialState.elapsedMs));
  const checkpointEvents = useRef(initialState.triggeredEventIds.length);
  const checkpointLogId = useRef(initialState.effectLog.at(-1)?.id ?? "");

  const submissionFor = useCallback((nextState: ControlRoomState, reason: CompletionReason | "draft"): ModuleSubmission => {
    const score = scoreControlRoom(nextState);
    const feedback = causalFeedback(nextState);
    return {
      stage: Math.min(3, Math.floor(nextState.elapsedMs / 30_000) + 1),
      score: score.total,
      payload: {
        mode: "system-control-room",
        gameId: "week-5-balance-master-v2",
        simulationVersion: 2,
        seedKey,
        state: nextState,
        eventSchedule: scenario.events.map((event) => ({ id: event.id, type: event.type, atMs: event.atMs, durationMs: event.durationMs, intensity: event.intensity })),
        cardWindows: scenario.cardWindows,
        interventionUses: nextState.interventionUses,
        scoreBreakdown: score,
        safeBalanceMs: Math.round(nextState.safeMs),
        ordersReceived: Number(nextState.ordersReceived.toFixed(2)),
        ordersCompleted: Number(nextState.ordersCompleted.toFixed(2)),
        finalMetrics: { production: nextState.production, failureRisk: nextState.failureRisk, delay: nextState.delay, health: nextState.health },
        causalFeedback: feedback,
        completionReason: reason,
        completionStatus: reason === "teacher-ended" ? "incomplete" : reason === "draft" ? "draft" : "completed",
      },
    };
  }, [scenario, seedKey]);

  const saveDraft = useCallback((nextState = stateRef.current) => {
    void onDraft?.(submissionFor(nextState, "draft"));
  }, [onDraft, submissionFor]);

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true);
    setSubmitFailed(false);
    try {
      const accepted = await onSubmit(submission);
      if (accepted === false) {
        submissionStarted.current = false;
        setSubmitFailed(true);
      }
    } catch {
      submissionStarted.current = false;
      setSubmitFailed(true);
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit]);

  const finalize = useCallback((reason: CompletionReason, nextState = stateRef.current) => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true;
    completedRef.current = true;
    if (frameId.current !== null) cancelAnimationFrame(frameId.current);
    stateRef.current = nextState;
    setState(nextState);
    setCompletionReason(reason);
    setCompleted(true);
    const submission = submissionFor(nextState, reason);
    setFinalSubmission(submission);
    void submitResult(submission);
  }, [existingSubmission, submissionFor, submitResult]);

  const applyAction = useCallback((id: InterventionId) => {
    if (completedRef.current || forceSubmit) return;
    const result = applyIntervention(stateRef.current, scenario, id);
    if (!result.accepted) {
      setActionNotice({ message: interventionReason(text, result.availability.reason, result.availability.remainingMs), untilMs: stateRef.current.elapsedMs + 3_500 });
      return;
    }
    stateRef.current = result.state;
    setState(result.state);
    setActionNotice({ message: `${text.actionApplied}: ${getIntervention(id).name[locale]}`, untilMs: result.state.elapsedMs + 4_500 });
    saveDraft(result.state);
  }, [forceSubmit, locale, saveDraft, scenario, text]);

  useEffect(() => {
    if (completed || existingSubmission || forceSubmit) return;
    const runFrame = (now: number) => {
      if (document.hidden || completedRef.current) {
        lastFrame.current = now;
        frameId.current = requestAnimationFrame(runFrame);
        return;
      }
      const previous = lastFrame.current ?? now;
      lastFrame.current = now;
      accumulator.current += Math.min(250, Math.max(0, now - previous));
      let next = stateRef.current;
      let stepped = false;
      while (accumulator.current >= CONTROL_ROOM_CONFIG.fixedStepMs) {
        next = stepSimulation(next, scenario, CONTROL_ROOM_CONFIG.fixedStepMs);
        accumulator.current -= CONTROL_ROOM_CONFIG.fixedStepMs;
        stepped = true;
      }
      if (stepped) {
        stateRef.current = next;
        setState(next);
        const nextWindow = cardWindowIndex(next.elapsedMs);
        const latestLogId = next.effectLog.at(-1)?.id ?? "";
        const meaningfulCheckpoint = nextWindow !== checkpointWindow.current || next.triggeredEventIds.length !== checkpointEvents.current || latestLogId !== checkpointLogId.current;
        if (meaningfulCheckpoint) {
          checkpointWindow.current = nextWindow;
          checkpointEvents.current = next.triggeredEventIds.length;
          checkpointLogId.current = latestLogId;
          saveDraft(next);
        }
        if (hasCollapsed(next)) {
          finalize("system-collapse", next);
          return;
        }
        if (next.elapsedMs >= CONTROL_ROOM_CONFIG.durationMs) {
          finalize("completed", next);
          return;
        }
      }
      frameId.current = requestAnimationFrame(runFrame);
    };
    lastFrame.current = performance.now();
    frameId.current = requestAnimationFrame(runFrame);
    return () => {
      if (frameId.current !== null) cancelAnimationFrame(frameId.current);
    };
  }, [completed, existingSubmission, finalize, forceSubmit, saveDraft, scenario]);

  useEffect(() => {
    const preserveProgress = () => {
      const hidden = document.hidden;
      setIsHidden(hidden);
      lastFrame.current = performance.now();
      accumulator.current = 0;
      saveDraft(stateRef.current);
    };
    const preserveOnExit = () => saveDraft(stateRef.current);
    document.addEventListener("visibilitychange", preserveProgress);
    window.addEventListener("pagehide", preserveOnExit);
    return () => {
      document.removeEventListener("visibilitychange", preserveProgress);
      window.removeEventListener("pagehide", preserveOnExit);
    };
  }, [saveDraft]);

  useEffect(() => {
    if (forceSubmit && !completedRef.current && !existingSubmission) finalize("teacher-ended", stateRef.current);
  }, [existingSubmission, finalize, forceSubmit]);

  if (existingSubmission && !completed) {
    return <section className="panel module-shell balance-master-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  }

  const feedback = causalFeedback(state);
  if (completed) {
    const heading = completionReason === "teacher-ended" ? text.partial : completionReason === "system-collapse" ? text.collapsed : text.complete;
    return <section className="panel module-shell balance-master-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card balance-complete"><Sparkles size={44} /><h2>{heading}</h2><p>{text.completeDetail}</p><div className="balance-result-grid"><div><ShieldCheck /><span>{text.safeResult}</span><strong>{Math.round(state.safeMs / 1_000)} {text.seconds}</strong></div><div><PackageCheck /><span>{text.orderResult}</span><strong>{Math.floor(state.ordersCompleted)}</strong></div><div><HeartPulse /><span>{text.healthResult}</span><strong>{Math.round(state.health)}%</strong></div></div><div className="balance-insights"><strong>{text.insight}</strong>{feedback.length ? feedback.map((item, index) => <p key={`${item.interventionId}-${index}`}><span>{getIntervention(item.interventionId).icon}</span><span data-i18n-skip>{item.explanation[locale]}</span></p>) : <p>{text.noInsight}</p>}</div>{submitting && <div className="notice">{text.saving}</div>}{submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => { if (submissionStarted.current) return; submissionStarted.current = true; void submitResult(finalSubmission); }}>{text.retry}</Button></>}</div></section>;
  }

  const cards = cardsForState(state, scenario).map(getIntervention);
  const currentWindow = cardWindowIndex(state.elapsedMs);
  const justChanged = state.elapsedMs > CONTROL_ROOM_CONFIG.cardWindowMs && state.elapsedMs % CONTROL_ROOM_CONFIG.cardWindowMs < 1_200;
  const safe = isSafeState(state);
  const remainingSeconds = Math.max(0, Math.ceil((CONTROL_ROOM_CONFIG.durationMs - state.elapsedMs) / 1_000));
  const progress = state.elapsedMs / CONTROL_ROOM_CONFIG.durationMs * 100;
  const criticalProgress = Math.min(100, state.criticalMs / CONTROL_ROOM_CONFIG.criticalGraceMs * 100);
  const metricLabels = { good: text.good, watch: text.watch, critical: text.critical, higherBetter: text.higherBetter, lowerBetter: text.lowerBetter };
  const latestLog = state.effectLog.at(-1);
  const transientMessage = actionNotice && state.elapsedMs <= actionNotice.untilMs
    ? actionNotice.message
    : latestLog && state.elapsedMs - latestLog.atMs <= 5_000
      ? latestLog.message[locale]
      : text.calm;
  const phaseLabel = state.elapsedMs < 30_000 ? text.phaseLow : state.elapsedMs < 60_000 ? text.phaseWave : text.phaseCritical;

  return <section className="panel module-shell balance-master-shell">
    <div className="balance-header"><div><div className="module-title-chip">{text.title}</div><h1>{text.subtitle}</h1><small>{text.modelNote}</small></div><span className={`balance-status ${safe ? "safe" : "pressure"}`}><i />{safe ? text.safeNow : text.unstableNow}</span></div>
    <div className="balance-metrics">
      <MetricCard label={text.production} value={state.production} direction="high" icon={<Gauge />} labels={metricLabels} />
      <MetricCard label={text.health} value={state.health} direction="high" icon={<HeartPulse />} labels={metricLabels} />
      <MetricCard label={text.failure} value={state.failureRisk} direction="low" icon={<AlertTriangle />} labels={metricLabels} />
      <MetricCard label={text.delay} value={state.delay} direction="low" icon={<Clock3 />} labels={metricLabels} />
    </div>
    <div className="balance-control-grid">
      <div className="balance-scene-column">
        <ControlFactory state={state} />
      </div>
      <aside className="balance-live-panel">
        <div className="balance-round-status"><div><Timer /><span>{text.time}</span><strong>{remainingSeconds} {text.seconds}</strong></div><div><ShieldCheck /><span>{text.safeTime}</span><strong>{Math.round(state.safeMs / 1_000)} {text.seconds}</strong></div><div><Activity /><span>{text.phase}</span><strong>{phaseLabel}</strong></div><i><b style={{ width: `${progress}%` }} /></i></div>
        {state.criticalMs > 0 && <div className="balance-critical" style={{ "--critical-progress": `${criticalProgress}%` } as React.CSSProperties}><AlertTriangle /><span>{text.criticalWarning}</span><i><b /></i></div>}
      </aside>
    </div>
    <div className="balance-transient-notice" aria-live="polite"><Activity /> <span data-i18n-skip>{transientMessage}</span></div>
    <div className="balance-actions-heading"><div><strong>{text.interventions}</strong><span>{currentWindow + 1}/{scenario.cardWindows.length}</span></div>{justChanged && <b><Sparkles />{text.cardsChanged}</b>}</div>
    <div className="balance-action-grid">{cards.map((intervention) => <InterventionCard key={intervention.id} intervention={intervention} state={state} scenario={scenario} onApply={applyAction} labels={text} locale={locale} />)}</div>
    {isHidden && <div className="balance-paused"><Clock3 />{text.paused}</div>}
  </section>;
}
