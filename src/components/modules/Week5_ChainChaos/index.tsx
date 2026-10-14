"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Factory, Gauge, LockKeyhole, PackageCheck, Recycle, RotateCcw, Send, TimerReset, Truck, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleSubmission } from "@/types";
import {
  CHAIN_MAX_RAW_SCORE,
  CHAIN_SECTION_DURATION_MS,
  CHAIN_SENSOR_PROGRESS,
  CHAIN_TOTAL_PRODUCTS,
  activeWorkload,
  buildChainChaosScenario,
  chaosFor,
  isCorrectRoute,
  normalizedChainScore,
  rawScoreFor,
  transitDurationFor,
  type ChainDecision,
  type ChainRoute,
} from "./chainChaosContent";

type ChainDraftPayload = {
  decisions?: unknown;
  sectionIndex?: unknown;
  sectionElapsedMs?: unknown;
  gate?: unknown;
};

const copy = {
  tr: {
    title: "Hafta 5 · Modül 1: Zincirleme Kaos",
    instruction: "Ürün sensörden geçince kapıyı doğru hedefe çevir. Kararın, ürün ayrım noktasına ulaştığında kilitlenir.",
    section: "Bölüm",
    slow: "Dengeli akış",
    medium: "Sıklaşan akış",
    intense: "Yoğun akış ve iadeler",
    score: "Modül puanı",
    raw: "Ham puan",
    chaos: "Kaos",
    load: "Ek iş yükü",
    time: "Kalan süre",
    sensor: "SENSÖR",
    splitter: "AYRIM",
    shipping: "Sevkiyat",
    recycling: "Geri dönüşüm",
    shippingHint: "Sağlam ürünler",
    recyclingHint: "Hatalı ürünler",
    gate: "Yönlendirme kapısı",
    gateHint: "← / → ok tuşları da çalışır",
    unknown: "Sensöre yaklaşıyor",
    good: "Sağlam",
    defective: "Hatalı",
    correctShipping: "Başarılı sevkiyat",
    correctRecycle: "Doğru geri dönüşüm",
    wrongShipping: "Hatalı ürün sevk edildi",
    wrongRecycle: "Sağlam ürün geri dönüşüme gitti",
    complaint: "Müşteri şikâyeti",
    return: "İade banda dönüyor",
    workload: "Ek iş yükü oluştu",
    waste: "Kaynak israfı",
    capacity: "Kapasite geçici olarak düştü",
    critical: "Kritik kaos! Bölüm erken kapatılıyor.",
    completed: "Üç bölüm tamamlandı",
    completedDetail: "Kararların ve sistemde oluşturduğu zincirleme etkiler kaydedildi.",
    partial: "Oynanış öğretmen tarafından sonlandırıldı",
    saving: "Sonuç kaydediliyor…",
    saveError: "Sonuç kaydedilemedi. Kararların korunuyor.",
    retry: "Kaydı tekrar dene",
    locked: "Bu oynanış tamamlandı",
    lockedDetail: "Puanın bir kez kaydedildi. Öğretmenin sonraki yönlendirmesini bekle.",
    paused: "Sekme arka plandayken oyun duraklatıldı",
  },
  en: {
    title: "Week 5 · Module 1: Chain-Reaction Chaos",
    instruction: "Turn the gate after the product reaches the sensor. Your choice locks when it reaches the splitter.",
    section: "Stage",
    slow: "Balanced flow",
    medium: "Faster flow",
    intense: "Dense flow and returns",
    score: "Module score",
    raw: "Raw score",
    chaos: "Chaos",
    load: "Extra workload",
    time: "Time left",
    sensor: "SENSOR",
    splitter: "SPLITTER",
    shipping: "Shipping",
    recycling: "Recycling",
    shippingHint: "Good products",
    recyclingHint: "Defective products",
    gate: "Routing gate",
    gateHint: "← / → arrow keys also work",
    unknown: "Approaching sensor",
    good: "Good",
    defective: "Defective",
    correctShipping: "Successful shipment",
    correctRecycle: "Correct recycling",
    wrongShipping: "Defective product was shipped",
    wrongRecycle: "Good product was recycled",
    complaint: "Customer complaint",
    return: "Return enters the belt",
    workload: "Extra workload created",
    waste: "Resource waste",
    capacity: "Capacity temporarily decreased",
    critical: "Critical chaos! This stage is closing early.",
    completed: "All three stages are complete",
    completedDetail: "Your choices and their chain effects were saved.",
    partial: "The teacher ended this play",
    saving: "Saving result…",
    saveError: "The result could not be saved. Your choices are preserved.",
    retry: "Try saving again",
    locked: "This play is complete",
    lockedDetail: "Your score was recorded once. Wait for your teacher's next instruction.",
    paused: "The game pauses while this tab is in the background",
  },
} as const;

const sectionLabels = (locale: "tr" | "en") => locale === "tr"
  ? [copy.tr.slow, copy.tr.medium, copy.tr.intense]
  : [copy.en.slow, copy.en.medium, copy.en.intense];

function hydrateDecisions(payload: ChainDraftPayload | undefined, productIds: Set<string>): ChainDecision[] {
  if (!Array.isArray(payload?.decisions)) return [];
  const seen = new Set<string>();
  return payload.decisions.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const value = candidate as Partial<ChainDecision>;
    if (typeof value.productId !== "string" || !productIds.has(value.productId) || seen.has(value.productId)) return [];
    if ((value.kind !== "good" && value.kind !== "defective") || (value.route !== "shipping" && value.route !== "recycling")) return [];
    if (typeof value.section !== "number" || typeof value.decidedAtMs !== "number") return [];
    seen.add(value.productId);
    const correct = isCorrectRoute(value.kind, value.route);
    return [{
      productId: value.productId,
      section: Math.max(0, Math.min(2, Math.floor(value.section))),
      kind: value.kind,
      route: value.route,
      correct,
      points: correct ? 10 : -5,
      decidedAtMs: Math.max(0, value.decidedAtMs),
    }];
  });
}

export function Week5ChainChaos({
  onSubmit,
  onDraft,
  existingSubmission,
  existingDraft,
  forceSubmit,
  seedKey,
}: LearningModuleProps & { seedKey: string }) {
  const { locale } = useI18n();
  const text = copy[locale];
  const reduceMotion = Boolean(useReducedMotion());
  const products = useMemo(() => buildChainChaosScenario(seedKey), [seedKey]);
  const productIds = useMemo(() => new Set(products.map((product) => product.id)), [products]);
  const draftPayload = existingDraft?.payload as ChainDraftPayload | undefined;
  const initialDecisions = useMemo(() => hydrateDecisions(draftPayload, productIds), [draftPayload, productIds]);
  const initialSection = typeof draftPayload?.sectionIndex === "number" ? Math.max(0, Math.min(2, Math.floor(draftPayload.sectionIndex))) : 0;
  const initialElapsed = typeof draftPayload?.sectionElapsedMs === "number" ? Math.max(0, Math.min(CHAIN_SECTION_DURATION_MS - 1, draftPayload.sectionElapsedMs)) : 0;
  const initialGate: ChainRoute = draftPayload?.gate === "recycling" ? "recycling" : "shipping";

  const [decisions, setDecisions] = useState<ChainDecision[]>(initialDecisions);
  const [sectionIndex, setSectionIndex] = useState(initialSection);
  const [elapsedMs, setElapsedMs] = useState(initialElapsed);
  const [gate, setGate] = useState<ChainRoute>(initialGate);
  const [completed, setCompleted] = useState(false);
  const [completionReason, setCompletionReason] = useState<"completed" | "teacher-ended">("completed");
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const [criticalNotice, setCriticalNotice] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const decisionsRef = useRef(initialDecisions);
  const sectionRef = useRef(initialSection);
  const elapsedRef = useRef(initialElapsed);
  const gateRef = useRef<ChainRoute>(initialGate);
  const completedRef = useRef(false);
  const transitionLocked = useRef(false);
  const transitionTimer = useRef<number | null>(null);
  const submissionStarted = useRef(false);
  const lastTick = useRef<number | null>(null);

  const submissionFor = useCallback((nextDecisions: ChainDecision[], reason: "completed" | "teacher-ended" | "draft", nextSection = sectionRef.current, nextElapsed = elapsedRef.current): ModuleSubmission => ({
    stage: Math.min(3, nextSection + 1),
    score: normalizedChainScore(nextDecisions),
    payload: {
      mode: "chain-reaction-chaos",
      gameId: "week-5-chain-chaos-v1",
      selectedProductIds: products.map((product) => product.id),
      decisions: nextDecisions,
      sectionIndex: nextSection,
      sectionElapsedMs: Math.round(nextElapsed),
      gate: gateRef.current,
      rawScore: rawScoreFor(nextDecisions),
      maxRawScore: CHAIN_MAX_RAW_SCORE,
      chaos: chaosFor(nextDecisions.filter((decision) => decision.section === nextSection)),
      chaosBySection: [0, 1, 2].map((section) => chaosFor(nextDecisions.filter((decision) => decision.section === section))),
      correctCount: nextDecisions.filter((decision) => decision.correct).length,
      defectiveShipmentCount: nextDecisions.filter((decision) => !decision.correct && decision.kind === "defective").length,
      wastedGoodProductCount: nextDecisions.filter((decision) => !decision.correct && decision.kind === "good").length,
      answeredCount: nextDecisions.length,
      productCount: CHAIN_TOTAL_PRODUCTS,
      completionReason: reason,
      completionStatus: reason === "completed" ? "completed" : reason === "teacher-ended" ? "incomplete" : "draft",
    },
  }), [products]);

  const saveDraft = useCallback((nextDecisions: ChainDecision[], nextSection = sectionRef.current, nextElapsed = elapsedRef.current) => {
    void onDraft?.(submissionFor(nextDecisions, "draft", nextSection, nextElapsed));
  }, [onDraft, submissionFor]);

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true);
    setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) {
      submissionStarted.current = false;
      setSubmitFailed(true);
    }
  }, [onSubmit]);

  const finalize = useCallback((reason: "completed" | "teacher-ended", nextDecisions = decisionsRef.current) => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true;
    completedRef.current = true;
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    setCompleted(true);
    setCompletionReason(reason);
    const submission = submissionFor(nextDecisions, reason);
    setFinalSubmission(submission);
    void submitResult(submission);
  }, [existingSubmission, submissionFor, submitResult]);

  const advanceSection = useCallback((wasCritical = false) => {
    if (transitionLocked.current || completedRef.current) return;
    transitionLocked.current = true;
    const delay = reduceMotion ? 120 : 900;
    const openNextSection = () => {
      const nextSection = sectionRef.current + 1;
      sectionRef.current = nextSection;
      elapsedRef.current = 0;
      gateRef.current = "shipping";
      setSectionIndex(nextSection);
      setElapsedMs(0);
      setGate("shipping");
      saveDraft(decisionsRef.current, nextSection, 0);
      transitionLocked.current = false;
      setCriticalNotice(false);
      lastTick.current = performance.now();
    };
    if (wasCritical) {
      setCriticalNotice(true);
      transitionTimer.current = window.setTimeout(() => {
        transitionTimer.current = null;
        if (completedRef.current) return;
        if (sectionRef.current >= 2) finalize("completed");
        else openNextSection();
      }, delay);
      return;
    }
    if (sectionRef.current >= 2) {
      finalize("completed");
      return;
    }
    openNextSection();
  }, [finalize, reduceMotion, saveDraft]);

  useEffect(() => () => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
  }, []);

  const resolveProduct = useCallback((productId: string, decisionTime: number) => {
    if (decisionsRef.current.some((decision) => decision.productId === productId)) return;
    const product = products.find((candidate) => candidate.id === productId);
    if (!product || product.section !== sectionRef.current) return;
    const route = gateRef.current;
    const correct = isCorrectRoute(product.kind, route);
    const decision: ChainDecision = {
      productId: product.id,
      section: product.section,
      kind: product.kind,
      route,
      correct,
      points: correct ? 10 : -5,
      decidedAtMs: decisionTime,
    };
    const nextDecisions = [...decisionsRef.current, decision];
    decisionsRef.current = nextDecisions;
    setDecisions(nextDecisions);
    saveDraft(nextDecisions, sectionRef.current, decisionTime);
    if (chaosFor(nextDecisions.filter((item) => item.section === product.section)) >= 100) advanceSection(true);
  }, [advanceSection, products, saveDraft]);

  useEffect(() => {
    if (completed || existingSubmission || forceSubmit) return;
    const tick = () => {
      if (document.hidden || transitionLocked.current || completedRef.current) {
        lastTick.current = performance.now();
        return;
      }
      const now = performance.now();
      const previous = lastTick.current ?? now;
      lastTick.current = now;
      const nextElapsed = Math.min(CHAIN_SECTION_DURATION_MS, elapsedRef.current + Math.min(250, now - previous));
      const activeSection = sectionRef.current;
      elapsedRef.current = nextElapsed;
      setElapsedMs(nextElapsed);
      for (const product of products) {
        if (product.section !== activeSection || decisionsRef.current.some((decision) => decision.productId === product.id)) continue;
        const transitMs = transitDurationFor(product, decisionsRef.current);
        if (nextElapsed >= product.spawnAtMs + transitMs) resolveProduct(product.id, nextElapsed);
        if (transitionLocked.current || sectionRef.current !== activeSection) break;
      }
      if (!transitionLocked.current && sectionRef.current === activeSection && nextElapsed >= CHAIN_SECTION_DURATION_MS) advanceSection(false);
    };
    lastTick.current = performance.now();
    const timer = window.setInterval(tick, reduceMotion ? 120 : 50);
    return () => window.clearInterval(timer);
  }, [advanceSection, completed, existingSubmission, forceSubmit, products, reduceMotion, resolveProduct]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const hidden = document.hidden;
      setIsHidden(hidden);
      lastTick.current = performance.now();
      if (!hidden) saveDraft(decisionsRef.current);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [saveDraft]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (completedRef.current || existingSubmission || forceSubmit) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        gateRef.current = "shipping";
        setGate("shipping");
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        gateRef.current = "recycling";
        setGate("recycling");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [existingSubmission, forceSubmit]);

  useEffect(() => {
    if (forceSubmit && !completedRef.current && !existingSubmission) finalize("teacher-ended");
  }, [existingSubmission, finalize, forceSubmit]);

  if (existingSubmission && !completed) {
    return <section className="panel module-shell chain-chaos-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  }

  if (completed) {
    return <section className="panel module-shell chain-chaos-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><Factory size={46} /><h2>{completionReason === "completed" ? text.completed : text.partial}</h2><p>{text.completedDetail}</p><strong className="chain-final-score">{normalizedChainScore(decisions)} / 100</strong>{submitting && <div className="notice">{text.saving}</div>}{submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => { if (submissionStarted.current) return; submissionStarted.current = true; void submitResult(finalSubmission); }}>{text.retry}</Button></>}</div></section>;
  }

  const currentProducts = products.filter((product) => product.section === sectionIndex && !decisions.some((decision) => decision.productId === product.id) && elapsedMs >= product.spawnAtMs);
  const workload = activeWorkload(decisions, sectionIndex, elapsedMs);
  const chaos = chaosFor(decisions.filter((decision) => decision.section === sectionIndex));
  const rawScore = rawScoreFor(decisions);
  const recentDecisions = decisions.filter((decision) => decision.section === sectionIndex && elapsedMs - decision.decidedAtMs < 11_000).slice(-4).reverse();
  const secondsLeft = Math.max(0, Math.ceil((CHAIN_SECTION_DURATION_MS - elapsedMs) / 1000));

  return <section className="panel module-shell chain-chaos-shell">
    <div className="chain-chaos-hud">
      <div><div className="module-title-chip">{text.title}</div><p>{text.instruction}</p></div>
      <div className="chain-section-chip"><span>{text.section} {sectionIndex + 1}/3</span><strong>{sectionLabels(locale)[sectionIndex]}</strong></div>
    </div>
    <div className="chain-metrics">
      <div><PackageCheck size={18} /><span>{text.score}</span><strong>{normalizedChainScore(decisions)} / 100</strong><small>{text.raw}: {rawScore}/{CHAIN_MAX_RAW_SCORE}</small></div>
      <div><AlertTriangle size={18} /><span>{text.chaos}</span><strong>{chaos}%</strong><i><b style={{ width: `${chaos}%` }} /></i></div>
      <div><Gauge size={18} /><span>{text.load}</span><strong>{workload.toFixed(1)}</strong><i><b style={{ width: `${Math.min(100, workload / 3 * 100)}%` }} /></i></div>
      <div><TimerReset size={18} /><span>{text.time}</span><strong>{secondsLeft} sn</strong><i><b style={{ width: `${secondsLeft / 30 * 100}%` }} /></i></div>
    </div>
    <div className={`chain-factory ${gate} ${workload > 1 ? "congested" : ""}`}>
      <div className="chain-main-belt" aria-label={text.instruction}><i /><i /><i /></div>
      <div className="chain-sensor"><span>{text.sensor}</span><b>◉</b></div>
      <div className="chain-splitter"><span>{text.splitter}</span><b className={gate}>↗</b></div>
      <div className="chain-destination shipping"><Truck size={29} /><strong>{text.shipping}</strong><small>{text.shippingHint}</small></div>
      <div className="chain-destination recycling"><Recycle size={29} /><strong>{text.recycling}</strong><small>{text.recyclingHint}</small></div>
      <div className="chain-shipping-branch" /><div className="chain-recycling-branch" />
      <div className="chain-return-belt"><span>↩</span><small>{text.return}</small>{recentDecisions.filter((decision) => !decision.correct && decision.kind === "defective" && elapsedMs - decision.decidedAtMs >= 2_800).map((decision, index) => <i key={decision.productId} style={{ left: `${12 + index * 19}%` }}>📦</i>)}</div>
      {currentProducts.map((product) => {
        const transit = transitDurationFor(product, decisions);
        const progress = Math.max(0, Math.min(1, (elapsedMs - product.spawnAtMs) / transit));
        const revealed = progress >= CHAIN_SENSOR_PROGRESS;
        return <div key={product.id} className={`chain-product ${revealed ? product.kind : "unknown"}`} style={{ left: `${4 + progress * 62}%` }} aria-label={revealed ? product.label[locale] : text.unknown} data-i18n-skip>
          <span>📦</span><b>{revealed ? product.kind === "good" ? "✓" : "×" : "?"}</b><small>{revealed ? product.label[locale] : text.unknown}</small>
        </div>;
      })}
      {recentDecisions.slice(0, 2).map((decision, index) => <div key={`${decision.productId}-route`} className={`chain-routed-product ${decision.route} ${decision.correct ? "correct" : "wrong"}`} style={{ "--route-index": index } as React.CSSProperties}><span>📦</span>{decision.correct ? <Check size={14} /> : <X size={14} />}</div>)}
      {criticalNotice && <div className="chain-critical"><AlertTriangle size={22} />{text.critical}</div>}
      {isHidden && <div className="chain-paused">{text.paused}</div>}
    </div>
    <div className="chain-control-panel">
      <div><span>{text.gate}</span><small>{text.gateHint}</small></div>
      <button type="button" className={gate === "shipping" ? "active" : ""} aria-pressed={gate === "shipping"} onClick={() => { gateRef.current = "shipping"; setGate("shipping"); }}><ArrowLeft size={24} /><Truck size={25} /><strong>{text.shipping}</strong></button>
      <button type="button" className={gate === "recycling" ? "active" : ""} aria-pressed={gate === "recycling"} onClick={() => { gateRef.current = "recycling"; setGate("recycling"); }}><strong>{text.recycling}</strong><Recycle size={25} /><ArrowRight size={24} /></button>
    </div>
    <div className="chain-effects" aria-live="polite">
      {recentDecisions.length === 0 ? <div className="chain-effect-empty"><Send size={18} />{text.unknown}</div> : recentDecisions.map((decision) => {
        const age = elapsedMs - decision.decidedAtMs;
        if (decision.correct) return <div key={decision.productId} className="chain-effect-card correct"><Check size={19} /><strong>{decision.route === "shipping" ? text.correctShipping : text.correctRecycle}</strong><span>+10</span></div>;
        if (decision.kind === "good") return <div key={decision.productId} className="chain-effect-card waste"><Recycle size={19} /><strong>{text.wrongRecycle}</strong><ol><li className="active">{text.waste}</li><li className={age >= 1_000 ? "active" : ""}>{text.capacity}</li></ol><span>−5</span></div>;
        return <div key={decision.productId} className="chain-effect-card return"><Truck size={19} /><strong>{text.wrongShipping}</strong><ol><li className="active">{text.wrongShipping}</li><li className={age >= 1_300 ? "active" : ""}>{text.complaint}</li><li className={age >= 2_800 ? "active" : ""}>{text.return}</li><li className={age >= 4_000 ? "active" : ""}>{text.workload}</li></ol><span>−5</span></div>;
      })}
    </div>
  </section>;
}
