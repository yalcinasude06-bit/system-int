"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import type { LearningModuleProps, ModuleSubmission } from "@/types";

type SwipeDirection = "negative" | "positive";

type ChainStep = {
  id: string;
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
    trigger: "Talep %20 arttı",
    icon: "🛒",
    variable: "Satış Miktarı",
    expected: "positive",
    nextState: "Satış Miktarı arttı",
    explanation: "Talep artışı satış miktarını artırır (+ Pozitif feedback).",
    color: "#dbeafe",
    accent: "#3b82f6",
  },
  {
    id: "revenue",
    trigger: "Satış Miktarı arttı",
    icon: "💰",
    variable: "Şirket Geliri",
    expected: "positive",
    nextState: "Şirket Geliri arttı",
    explanation: "Satış miktarı arttığında şirket geliri de artar (+ Pozitif feedback).",
    color: "#fef3c7",
    accent: "#f59e0b",
  },
  {
    id: "marketing",
    trigger: "Şirket Geliri arttı",
    icon: "📢",
    variable: "Pazarlama Bütçesi",
    expected: "positive",
    nextState: "Pazarlama Bütçesi arttı",
    explanation: "Gelir artışı pazarlama için ayrılabilecek bütçeyi artırır (+ Pozitif feedback).",
    color: "#ede9fe",
    accent: "#8b5cf6",
  },
  {
    id: "awareness",
    trigger: "Pazarlama Bütçesi arttı",
    icon: "📣",
    variable: "Marka Bilinirliği",
    expected: "positive",
    nextState: "Marka Bilinirliği arttı",
    explanation: "Daha yüksek pazarlama bütçesi markanın daha çok kişiye ulaşmasını sağlar (+ Pozitif ilişki).",
    color: "#e0f2fe",
    accent: "#38bdf8",
  },
  {
    id: "customers",
    trigger: "Marka Bilinirliği arttı",
    icon: "👥",
    variable: "Yeni Müşteri Sayısı",
    expected: "positive",
    nextState: "Yeni Müşteri Sayısı arttı",
    explanation: "Markanın daha fazla tanınması yeni müşteri sayısını artırır (+ Pozitif ilişki).",
    color: "#fce7f3",
    accent: "#f472b6",
  },
  {
    id: "orders",
    trigger: "Yeni Müşteri Sayısı arttı",
    icon: "📦",
    variable: "Sipariş Yoğunluğu",
    expected: "positive",
    nextState: "Sipariş Yoğunluğu arttı",
    explanation: "Yeni müşteri sayısı arttıkça alınan siparişlerin yoğunluğu da artar (+ Pozitif ilişki).",
    color: "#fef3c7",
    accent: "#f59e0b",
  },
  {
    id: "delivery",
    trigger: "Sipariş Yoğunluğu arttı",
    icon: "🚚",
    variable: "Teslimat Süresi",
    expected: "positive",
    nextState: "Teslimat Süresi arttı",
    explanation: "Aynı kapasitede daha fazla sipariş, teslimat süresini uzatır (+ Pozitif ilişki).",
    color: "#e2e8f0",
    accent: "#64748b",
  },
  {
    id: "satisfaction",
    trigger: "Teslimat Süresi arttı",
    icon: "🙂",
    variable: "Müşteri Memnuniyeti",
    expected: "negative",
    nextState: "Müşteri Memnuniyeti azaldı",
    explanation: "Teslimatın uzaması müşteri memnuniyetini düşürür (− Negatif ilişki).",
    color: "#f1f5f9",
    accent: "#94a3b8",
  },
  {
    id: "repeat-purchase",
    trigger: "Müşteri Memnuniyeti azaldı",
    icon: "🔁",
    variable: "Tekrar Satın Alma",
    expected: "positive",
    nextState: "Tekrar Satın Alma azaldı",
    explanation: "Memnuniyet ile tekrar satın alma aynı yönde değişir; memnuniyet azalınca tekrar satın alma da azalır (+ Pozitif ilişki).",
    color: "#ede9fe",
    accent: "#8b5cf6",
  },
  {
    id: "price",
    trigger: "Tekrar Satın Alma azaldı",
    icon: "🏷️",
    variable: "Kampanya İndirimi",
    detail: "Talebi yeniden canlandırma kararı",
    expected: "negative",
    nextState: "Kampanya İndirimi arttı",
    explanation: "Talep azaldığında şirket talebi canlandırmak için indirimleri artırır (− Negatif ilişki).",
    color: "#f1f5f9",
    accent: "#64748b",
  },
];

const pointsPerCard = 100 / chain.length;

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function Module2Relations({ onSubmit, existingSubmission }: LearningModuleProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "shake" | "exit">("idle");
  const [direction, setDirection] = useState<SwipeDirection | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const interactionLocked = useRef(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-13, 0, 13]);
  const negativeGlow = useTransform(x, [-150, -35, 0], [1, .18, 0]);
  const positiveGlow = useTransform(x, [0, 35, 150], [0, .18, 1]);
  const current = chain[Math.min(stepIndex, chain.length - 1)];

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true);
    setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) setSubmitFailed(true);
  }, [onSubmit]);

  const choose = useCallback(async (selected: SwipeDirection) => {
    if (interactionLocked.current || busy || completed || existingSubmission) return;
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
    const nextAnswers = [...answers, answer];

    setBusy(true);
    setDirection(selected);
    setFeedback({
      correct: isCorrect,
      text: isCorrect ? `Doğru! ${current.nextState}. Zincir doğru yönde ilerliyor.` : `Yanlış! ${current.explanation}`,
    });

    if (!isCorrect) {
      setPhase("shake");
      await delay(720);
    }
    setPhase("exit");
    await delay(520);

    if (stepIndex === chain.length - 1) {
      const finalScore = Math.round(nextAnswers.filter((item) => item.isCorrect).length * pointsPerCard);
      const submission: ModuleSubmission = {
        score: finalScore,
        payload: {
          mode: "swipe-chain",
          answers: nextAnswers,
          correctCount: nextAnswers.filter((item) => item.isCorrect).length,
          cardCount: chain.length,
          pointsPerCard,
          finalState: current.nextState,
        },
      };
      setAnswers(nextAnswers);
      setFinalSubmission(submission);
      setCompleted(true);
      setPhase("idle");
      setDirection(null);
      x.set(0);
      await submitResult(submission);
      setBusy(false);
      return;
    }

    setAnswers(nextAnswers);
    x.set(0);
    setStepIndex((index) => index + 1);
    setPhase("idle");
    setDirection(null);
    setBusy(false);
    interactionLocked.current = false;
    window.setTimeout(() => setFeedback(null), 900);
  }, [answers, busy, completed, current, existingSubmission, stepIndex, submitResult, x]);

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
    return <section className="panel module-shell swipe-module-shell"><div className="module-title-chip">Modül 2: Zincirleme Geri Bildirim</div><div className="swipe-complete-card"><LockKeyhole size={42} /><h2>Bu modül tamamlandı</h2><p>Yanıtın kilitlendi. Öğretmen sonuçları açıklayana kadar bekleyin.</p></div></section>;
  }

  if (completed) {
    return <section className="panel module-shell swipe-module-shell">
      <div className="module-title-chip">Modül 2: Zincirleme Geri Bildirim</div>
      <div className="swipe-complete-card">
        <Sparkles size={42} />
        <h2>Tüm kartlar tamamlandı</h2>
        <p>Yanıtların kilitleniyor. Öğretmen sonuçları açıklayana kadar puanın gizli kalacak.</p>
        {submitting && <div className="notice">Yanıt kaydediliyor…</div>}
        {submitFailed && finalSubmission && <><div className="notice error">Yanıt kaydedilemedi. Seçimlerin korundu.</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>Kaydı tekrar dene</Button></>}
      </div>
    </section>;
  }

  const cardAnimation = phase === "shake"
    ? { x: [0, -18, 17, -13, 11, -7, 0], rotate: [0, -2, 2, -1.5, 1, 0], opacity: 1 }
    : phase === "exit"
      ? { x: direction === "positive" ? 720 : -720, rotate: direction === "positive" ? 18 : -18, opacity: 0 }
      : { x: 0, rotate: 0, opacity: 1 };

  return <section className="panel module-shell swipe-module-shell">
    <div className="swipe-topline">
      <div className="module-title-chip">Modül 2: Zincirleme Geri Bildirim</div>
      <strong>{stepIndex + 1} / {chain.length} Kart</strong>
    </div>

    <div className="chain-progress" aria-label={`Kart ${stepIndex + 1} / ${chain.length}`}>
      {chain.map((step, index) => <span key={step.id} className={index < stepIndex ? "done" : index === stepIndex ? "active" : ""} />)}
    </div>

    <div className="event-ribbon"><span>📊</span><div><small>MEVCUT DURUM</small><strong>{current.trigger}</strong></div></div>

    <div className="swipe-stage">
      <button type="button" className="swipe-zone negative" disabled={busy} onClick={() => void choose("negative")} aria-label="Negatif feedback seç">
        <span><ArrowLeft size={35} /></span><strong>Negatif feedback</strong><small>Sola kaydır veya tıkla</small>
      </button>

      <div className="swipe-deck">
        {chain.slice(stepIndex + 1, stepIndex + 3).reverse().map((step, reverseIndex) => <div className={`swipe-card stack-card stack-${reverseIndex + 1}`} style={{ background: step.color }} key={step.id}><span>{step.icon}</span></div>)}
        <motion.article
          key={current.id}
          className={`swipe-card active-card ${feedback?.correct === false ? "wrong" : ""}`}
          style={{ x, rotate, background: current.color, borderColor: current.accent }}
          drag={busy ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={.86}
          dragSnapToOrigin
          animate={cardAnimation}
          transition={phase === "shake" ? { duration: .65 } : { type: "spring", stiffness: 220, damping: 24 }}
          onDragEnd={(_, info) => {
            if (info.offset.x > 90) void choose("positive");
            else if (info.offset.x < -90) void choose("negative");
          }}
        >
          <motion.div className="card-choice-glow negative" style={{ opacity: negativeGlow }}><X size={44} /></motion.div>
          <motion.div className="card-choice-glow positive" style={{ opacity: positiveGlow }}><Check size={44} /></motion.div>
          <span className="swipe-card-icon">{current.icon}</span>
          <h1>{current.variable}</h1>
          {current.detail && <p>{current.detail}</p>}
          <span className="drag-hint">Kartı sürükle</span>
        </motion.article>
      </div>

      <button type="button" className="swipe-zone positive" disabled={busy} onClick={() => void choose("positive")} aria-label="Pozitif feedback seç">
        <span><ArrowRight size={35} /></span><strong>Pozitif feedback</strong><small>Sağa kaydır veya tıkla</small>
      </button>
    </div>

    <div className="swipe-feedback-space" aria-live="polite">
      {feedback && <div className={`swipe-feedback ${feedback.correct ? "correct" : "wrong"}`}>{feedback.correct ? <Check size={21} /> : <X size={21} />}<span>{feedback.text}</span></div>}
    </div>

  </section>;
}
