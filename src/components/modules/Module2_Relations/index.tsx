"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";

type SwipeDirection = "negative" | "positive";

type ChainStep = {
  id: string;
  triggerIcon: string;
  trigger: string;
  icon: string;
  variable: string;
  detail?: string;
  expected: SwipeDirection;
  nextState: string;
  explanation: string;
  color: string;
  accent: string;
};

type Answer = {
  stepId: string;
  trigger: string;
  variable: string;
  selected: SwipeDirection;
  expected: SwipeDirection;
  isCorrect: boolean;
};

const chain: ChainStep[] = [
  {
    id: "sales",
    triggerIcon: "📈",
    trigger: "Talep %20 arttı",
    icon: "📈",
    variable: "Satış Miktarı",
    expected: "positive",
    nextState: "Satış Miktarı arttı",
    explanation: "Talep arttığında satılan ürün miktarı da artar (+ Pozitif Feedback Etkisi).",
    color: "#dbeafe",
    accent: "#3b82f6",
  },
  {
    id: "inventory",
    triggerIcon: "📈",
    trigger: "Satış Miktarı arttı",
    icon: "📦",
    variable: "Depo Stok Miktarı",
    expected: "negative",
    nextState: "Depo Stok Miktarı azaldı",
    explanation: "Satışlar arttıkça depodaki stok seviyesi azalır (− Negatif Feedback Etkisi).",
    color: "#fef3c7",
    accent: "#f59e0b",
  },
  {
    id: "stock-risk",
    triggerIcon: "📉",
    trigger: "Depo Stok Miktarı azaldı",
    icon: "⚠️",
    variable: "Stok Tükenme Riski",
    expected: "negative",
    nextState: "Stok Tükenme Riski arttı",
    explanation: "Stok miktarı azaldıkça ürünün tükenme riski ters orantılı olarak artar (− Negatif Feedback Etkisi).",
    color: "#ede9fe",
    accent: "#8b5cf6",
  },
  {
    id: "satisfaction",
    triggerIcon: "📈",
    trigger: "Stok Tükenme Riski arttı",
    icon: "🙂",
    variable: "Müşteri Memnuniyeti",
    expected: "negative",
    nextState: "Müşteri Memnuniyeti azaldı",
    explanation: "Stok tükenme riski ve gecikmeler arttıkça müşteri memnuniyeti düşer (− Negatif Feedback Etkisi).",
    color: "#e0f2fe",
    accent: "#38bdf8",
  },
  {
    id: "complaints",
    triggerIcon: "📉",
    trigger: "Müşteri Memnuniyeti azaldı",
    icon: "📣",
    variable: "Müşteri Şikâyet Sayısı",
    expected: "negative",
    nextState: "Müşteri Şikâyet Sayısı arttı",
    explanation: "Müşteri memnuniyeti azaldıkça şikâyet sayısı ters orantılı olarak yükselir (− Negatif Feedback Etkisi).",
    color: "#fce7f3",
    accent: "#f472b6",
  },
  {
    id: "loyalty",
    triggerIcon: "📈",
    trigger: "Müşteri Şikâyet Sayısı arttı",
    icon: "🤝",
    variable: "Marka Sadakati",
    expected: "negative",
    nextState: "Marka Sadakati azaldı",
    explanation: "Şikâyetler arttıkça müşterilerin markaya olan sadakati azalır (− Negatif Feedback Etkisi).",
    color: "#fef3c7",
    accent: "#f59e0b",
  },
  {
    id: "churn",
    triggerIcon: "📉",
    trigger: "Marka Sadakati azaldı",
    icon: "🚪",
    variable: "Müşteri Kayıp Oranı (Churn)",
    expected: "negative",
    nextState: "Müşteri Kayıp Oranı (Churn) arttı",
    explanation: "Marka sadakati düştükçe müşterilerin rakibe geçiş oranı artar (− Negatif Feedback Etkisi).",
    color: "#e2e8f0",
    accent: "#64748b",
  },
  {
    id: "revenue",
    triggerIcon: "📈",
    trigger: "Müşteri Kayıp Oranı (Churn) arttı",
    icon: "💰",
    variable: "Toplam Şirket Geliri",
    expected: "negative",
    nextState: "Toplam Şirket Geliri azaldı",
    explanation: "Müşteri kaybı arttıkça şirketin toplam geliri azalır (− Negatif Feedback Etkisi).",
    color: "#f1f5f9",
    accent: "#94a3b8",
  },
  {
    id: "improvement-budget",
    triggerIcon: "📉",
    trigger: "Toplam Şirket Geliri azaldı",
    icon: "🛠️",
    variable: "Geliştirme & İyileştirme Bütçesi",
    expected: "positive",
    nextState: "Geliştirme & İyileştirme Bütçesi azaldı",
    explanation: "Şirket geliri azaldıkça Ar-Ge ve kalite iyileştirme bütçesi de doğru orantılı olarak daralır (+ Pozitif Feedback Etkisi).",
    color: "#ede9fe",
    accent: "#8b5cf6",
  },
  {
    id: "system-errors",
    triggerIcon: "📉",
    trigger: "Geliştirme & İyileştirme Bütçesi azaldı",
    icon: "🚨",
    variable: "Sistemik Hata Oranı",
    expected: "negative",
    nextState: "Sistemik Hata Oranı arttı",
    explanation: "İyileştirme bütçesi azaldıkça süreçlerdeki sistemik hata oranı ters orantılı olarak artar (− Negatif Feedback Etkisi).",
    color: "#f1f5f9",
    accent: "#64748b",
  },
];

const pointsPerCard = 100 / chain.length;

function answersFromDraft(draft: ModuleDraft | null | undefined): Answer[] {
  const value = (draft?.payload as { answers?: unknown } | undefined)?.answers;
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const restored: Answer[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") break;
    const candidate = item as Partial<Answer>;
    const step = chain[restored.length];
    if (!step || candidate.stepId !== step.id || seen.has(step.id) || (candidate.selected !== "negative" && candidate.selected !== "positive")) break;
    seen.add(step.id);
    restored.push({
      stepId: step.id,
      trigger: step.trigger,
      variable: step.variable,
      selected: candidate.selected,
      expected: step.expected,
      isCorrect: candidate.selected === step.expected,
    });
  }
  return restored;
}

function submissionForAnswers(finalAnswers: Answer[], completionReason: "completed" | "teacher-ended" | "draft"): ModuleSubmission {
  const correctCount = finalAnswers.filter((item) => item.isCorrect).length;
  return {
    score: Math.round(correctCount * pointsPerCard),
    payload: {
      mode: "swipe-chain",
      answers: finalAnswers,
      correctCount,
      answeredCount: finalAnswers.length,
      cardCount: chain.length,
      pointsPerCard,
      finalState: finalAnswers.length === chain.length ? chain[chain.length - 1].nextState : null,
      completionReason,
      loopClosure: completionReason === "completed" ? {
        from: "Sistemik Hata Oranı",
        to: "Müşteri Memnuniyeti",
        effect: "negative",
        explanation: "Sistemik hata oranı arttığında müşteri deneyimi kötüleşir ve müşteri memnuniyeti azalır (− Negatif Feedback Etkisi).",
      } : null,
    },
  };
}

export function Module2Relations({ onSubmit, onDraft, existingSubmission, existingDraft, forceSubmit }: LearningModuleProps) {
  const initialAnswers = useMemo(() => answersFromDraft(existingDraft), [existingDraft]);
  const initialStepIndex = Math.min(initialAnswers.length, chain.length - 1);
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const [answers, setAnswers] = useState<Answer[]>(initialAnswers);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "shake" | "exit">("idle");
  const [direction, setDirection] = useState<SwipeDirection | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const interactionLocked = useRef(false);
  const submissionStarted = useRef(false);
  const answersRef = useRef<Answer[]>(initialAnswers);
  const transitionTimer = useRef<number | null>(null);
  const transitionWatchdog = useRef<number | null>(null);
  const transitionToken = useRef(0);
  const pendingTransition = useRef<{ answers: Answer[]; stepIndex: number; token: number } | null>(null);
  const dragActive = useRef(false);
  const reduceMotion = Boolean(useReducedMotion());
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-13, 0, 13]);
  const negativeGlow = useTransform(x, [-150, -35, 0], [1, .18, 0]);
  const positiveGlow = useTransform(x, [0, 35, 150], [0, .18, 1]);
  const current = chain[Math.min(stepIndex, chain.length - 1)];
  const nextCard = chain[stepIndex + 1];
  const deepCard = chain[stepIndex + 2];

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

  const clearTransitionTimers = useCallback(() => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    if (transitionWatchdog.current !== null) window.clearTimeout(transitionWatchdog.current);
    transitionTimer.current = null;
    transitionWatchdog.current = null;
  }, []);

  const resetCardVisual = useCallback(() => {
    dragActive.current = false;
    x.stop();
    x.set(0);
    if (!pendingTransition.current) {
      interactionLocked.current = false;
      setBusy(false);
      setPhase("idle");
      setDirection(null);
    }
  }, [x]);

  const finalize = useCallback(async (finalAnswers: Answer[], completionReason: "completed" | "teacher-ended") => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true;
    clearTransitionTimers();
    pendingTransition.current = null;
    const submission = submissionForAnswers(finalAnswers, completionReason);
    setAnswers(finalAnswers);
    setFinalSubmission(submission);
    setCompleted(true);
    setBusy(false);
    setPhase("idle");
    setDirection(null);
    x.set(0);
    await submitResult(submission);
  }, [clearTransitionTimers, existingSubmission, submitResult, x]);

  const completeTransition = useCallback((token: number) => {
    const pending = pendingTransition.current;
    if (!pending || pending.token !== token || submissionStarted.current) return;
    clearTransitionTimers();
    pendingTransition.current = null;
    if (pending.stepIndex === chain.length - 1) {
      void finalize(pending.answers, "completed");
      return;
    }
    setAnswers(pending.answers);
    answersRef.current = pending.answers;
    x.stop();
    x.set(0);
    setStepIndex(pending.stepIndex + 1);
    setPhase("idle");
    setDirection(null);
    setBusy(false);
    interactionLocked.current = false;
    window.setTimeout(() => setFeedback(null), reduceMotion ? 0 : 900);
  }, [clearTransitionTimers, finalize, reduceMotion, x]);

  const choose = useCallback((selected: SwipeDirection) => {
    if (interactionLocked.current || busy || completed || existingSubmission || forceSubmit) return;
    interactionLocked.current = true;
    const isCorrect = selected === current.expected;
    const answer: Answer = {
      stepId: current.id,
      trigger: current.trigger,
      variable: current.variable,
      selected,
      expected: current.expected,
      isCorrect,
    };
    const nextAnswers = [...answersRef.current, answer];
    answersRef.current = nextAnswers;
    void onDraft?.(submissionForAnswers(nextAnswers, "draft"));

    setBusy(true);
    setDirection(selected);
    setFeedback({
      correct: isCorrect,
      text: isCorrect ? `Doğru! ${current.explanation}` : `Yanlış! ${current.explanation}`,
    });

    const token = ++transitionToken.current;
    pendingTransition.current = { answers: nextAnswers, stepIndex, token };
    const shakeDuration = !isCorrect && !reduceMotion ? 720 : 0;
    const exitDuration = reduceMotion ? 20 : 300;
    if (!isCorrect && !reduceMotion) setPhase("shake");
    transitionTimer.current = window.setTimeout(() => {
      if (pendingTransition.current?.token !== token) return;
      setPhase("exit");
      transitionTimer.current = window.setTimeout(() => completeTransition(token), exitDuration);
    }, shakeDuration);
    // Mobile browsers may suppress animation callbacks/timers around cancelled
    // gestures. The watchdog always releases the card and interaction lock.
    transitionWatchdog.current = window.setTimeout(() => completeTransition(token), shakeDuration + exitDuration + 700);
  }, [busy, completed, completeTransition, current, existingSubmission, forceSubmit, onDraft, reduceMotion, stepIndex]);

  useEffect(() => {
    if (forceSubmit && !completed && !existingSubmission) void finalize(answersRef.current, "teacher-ended");
  }, [completed, existingSubmission, finalize, forceSubmit]);

  useEffect(() => {
    if (initialAnswers.length === chain.length && !existingSubmission && !forceSubmit) void finalize(initialAnswers, "completed");
  }, [existingSubmission, finalize, forceSubmit, initialAnswers]);

  useEffect(() => {
    const recoverInterruptedGesture = () => {
      if (pendingTransition.current) completeTransition(pendingTransition.current.token);
      else resetCardVisual();
    };
    const onVisibilityChange = () => {
      if (document.hidden) recoverInterruptedGesture();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("orientationchange", recoverInterruptedGesture);
    window.addEventListener("pagehide", recoverInterruptedGesture);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("orientationchange", recoverInterruptedGesture);
      window.removeEventListener("pagehide", recoverInterruptedGesture);
      clearTransitionTimers();
      x.stop();
      x.set(0);
      interactionLocked.current = false;
    };
  }, [clearTransitionTimers, completeTransition, resetCardVisual, x]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      void choose(event.key === "ArrowLeft" ? "negative" : "positive");
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [choose]);

  if (existingSubmission) {
    return <section className="panel module-shell swipe-module-shell"><div className="module-title-chip">Modül 2: Sistem Dinamiği Geri Bildirim Döngüsü</div><div className="swipe-complete-card"><LockKeyhole size={42} /><h2>Bu modül tamamlandı</h2><p>Yanıtın kilitlendi. Öğretmen sonuçları açıklayana kadar bekleyin.</p></div></section>;
  }

  if (completed) {
    return <section className="panel module-shell swipe-module-shell">
      <div className="module-title-chip">Modül 2: Sistem Dinamiği Geri Bildirim Döngüsü</div>
      <div className="swipe-complete-card feedback-loop-success">
        <Sparkles size={42} />
        {answers.length === chain.length && <div className="feedback-loop-visual" role="img" aria-label="Sistemik Hata Oranı, negatif feedback etkisiyle Müşteri Memnuniyetine geri bağlanır">
          <strong>Sistemik Hata Oranı</strong>
          <span className="feedback-loop-arrow"><RotateCcw size={34} /></span>
          <strong>Müşteri Memnuniyeti</strong>
          <small>Negatif (−) Feedback Etkisi</small>
        </div>}
        <h2>{answers.length === chain.length ? "🎉 Sistemik geri bildirim döngüsünü tamamladınız!" : "Kısmi yanıtınız kaydediliyor"}</h2>
        <p>{answers.length === chain.length ? "Sistemik hata oranı arttığında müşteri deneyimi kötüleşir ve müşteri memnuniyeti azalır (− Negatif Feedback Etkisi)." : `${answers.length} karttaki yanıtınız ve kazandığınız puan korunuyor.`}</p>
        <p className="submission-privacy-note">Yanıtların kilitleniyor. Öğretmen sonuçları açıklayana kadar puanın gizli kalacak.</p>
        {submitting && <div className="notice">Yanıt kaydediliyor…</div>}
        {submitFailed && finalSubmission && <><div className="notice error">Yanıt kaydedilemedi. Seçimlerin korundu.</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>Kaydı tekrar dene</Button></>}
      </div>
    </section>;
  }

  const cardAnimation = phase === "shake"
    ? { x: [0, -18, 17, -13, 11, -7, 0], y: 0, scale: 1, rotate: [0, -2, 2, -1.5, 1, 0], opacity: 1 }
    : phase === "exit"
      ? { x: direction === "positive" ? 520 : -520, y: 0, scale: .98, rotate: direction === "positive" ? 18 : -18, opacity: 0 }
      : { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 };

  return <section className="panel module-shell swipe-module-shell">
    <div className="swipe-topline">
      <div className="module-title-chip">Modül 2: Sistem Dinamiği Geri Bildirim Döngüsü</div>
      <strong>{stepIndex + 1} / {chain.length} Kart</strong>
    </div>

    <div className="chain-progress" aria-label={`Kart ${stepIndex + 1} / ${chain.length}`}>
      {chain.map((step, index) => <span key={step.id} className={index < stepIndex ? "done" : index === stepIndex ? "active" : ""} />)}
    </div>

    <div className="event-ribbon"><span>{current.triggerIcon}</span><div><small>MEVCUT DURUM</small><strong>{current.trigger}</strong></div></div>

    <div className="swipe-stage">
      <button type="button" className="swipe-zone negative" disabled={busy} onClick={() => void choose("negative")} aria-label="Negatif eksi Feedback Etkisini seç">
        <span><ArrowLeft size={35} /></span><strong>Negatif (−) Feedback Etkisi</strong><small>Sola kaydır veya tıkla</small>
      </button>

      <div className="swipe-deck">
        {deepCard && <div className="swipe-card stack-card deep-card" style={{ background: deepCard.color, borderColor: deepCard.accent }} aria-hidden="true"><span>{deepCard.icon}</span></div>}
        {nextCard && <motion.article
          key={`next-${nextCard.id}`}
          className="swipe-card stack-card next-card"
          style={{ background: nextCard.color, borderColor: nextCard.accent }}
          initial={false}
          animate={phase === "exit"
            ? { y: 0, scale: 1, opacity: 1, rotate: 0 }
            : { y: 8, scale: .95, opacity: .8, rotate: 0 }}
          transition={phase === "exit" ? { duration: .28, ease: "easeOut" } : { type: "spring", stiffness: 260, damping: 24 }}
          aria-hidden="true"
        ><span className="stack-card-preview-icon">{nextCard.icon}</span><h2>{nextCard.variable}</h2></motion.article>}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.article
            key={current.id}
            className={`swipe-card active-card ${feedback?.correct === false ? "wrong" : ""}`}
            style={{ x, rotate, background: current.color, borderColor: current.accent }}
            drag={busy || reduceMotion ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={.86}
            dragSnapToOrigin
            dragMomentum={false}
            onDragStart={() => { dragActive.current = true; }}
            initial={false}
            animate={cardAnimation}
            transition={phase === "shake" ? { duration: .65 } : phase === "exit" ? { duration: .28, ease: "easeOut" } : { type: "spring", stiffness: 260, damping: 24 }}
            onDragEnd={(_, info) => {
              dragActive.current = false;
              if (info.offset.x > 90) void choose("positive");
              else if (info.offset.x < -90) void choose("negative");
              else resetCardVisual();
            }}
            onPointerCancel={resetCardVisual}
            onLostPointerCapture={() => { if (dragActive.current && !busy) resetCardVisual(); }}
            onTouchCancel={resetCardVisual}
          >
            <motion.div className="card-choice-glow negative" style={{ opacity: negativeGlow }}><X size={44} /></motion.div>
            <motion.div className="card-choice-glow positive" style={{ opacity: positiveGlow }}><Check size={44} /></motion.div>
            <span className="swipe-card-icon">{current.icon}</span>
            <h1>{current.variable}</h1>
            {current.detail && <p>{current.detail}</p>}
            <span className="drag-hint">Kartı sürükle</span>
          </motion.article>
        </AnimatePresence>
      </div>

      <button type="button" className="swipe-zone positive" disabled={busy} onClick={() => void choose("positive")} aria-label="Pozitif artı Feedback Etkisini seç">
        <span><ArrowRight size={35} /></span><strong>Pozitif (+) Feedback Etkisi</strong><small>Sağa kaydır veya tıkla</small>
      </button>
    </div>

    <div className="swipe-feedback-space" aria-live="polite">
      {feedback && <div className={`swipe-feedback ${feedback.correct ? "correct" : "wrong"}`}>{feedback.correct ? <Check size={21} /> : <X size={21} />}<span>{feedback.text}</span></div>}
    </div>

  </section>;
}
