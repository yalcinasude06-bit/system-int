"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock3, LockKeyhole, RotateCcw, Sparkles, Target, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import type { LearningModuleProps, ModuleSubmission } from "@/types";

type RelationType = "spatial" | "temporal" | "causal" | "logical" | "mathematical" | "energy";

type RelationCategory = {
  id: RelationType;
  label: string;
  icon: string;
  side: "left" | "right";
  color: string;
  explanation: string;
};

type BalloonQuestion = {
  id: string;
  type: RelationType;
  text: string;
};

type BalloonAnswer = {
  questionId: string;
  expected: RelationType;
  attempts: RelationType[];
  isCorrect: boolean;
  timedOut: boolean;
};

const categories: RelationCategory[] = [
  { id: "spatial", label: "Mekânsal", icon: "📍", side: "left", color: "#38bdf8", explanation: "Doğru! Nesnelerin birbirine göre konumu, yerleşimi ve mesafesi mekânsal ilişkidir." },
  { id: "temporal", label: "Zamansal", icon: "⏳", side: "left", color: "#a78bfa", explanation: "Doğru! Olayların gerçekleşme sırası, öncesi-sonrası ve zaman aralıkları zamansal ilişkidir." },
  { id: "causal", label: "Neden-Sonuç", icon: "🎯", side: "left", color: "#fb7185", explanation: "Doğru! Bir değişkenin diğerini doğrudan tetiklemesi veya etkilemesi neden-sonuç ilişkisidir." },
  { id: "logical", label: "Mantıksal", icon: "🔀", side: "right", color: "#34d399", explanation: "Doğru! Şarta bağlı ‘eğer… ise’ kuralları ve karar yapıları mantıksal ilişkidir." },
  { id: "mathematical", label: "Matematiksel", icon: "📐", side: "right", color: "#f59e0b", explanation: "Doğru! Değişkenler arasındaki eşitlik, eşitsizlik ve formüller matematiksel ilişkidir." },
  { id: "energy", label: "Enerjinin Korunumu", icon: "⚡", side: "right", color: "#6366f1", explanation: "Doğru! Enerji formlarının birbirine dönüşümü enerjinin korunumu ilişkisidir." },
];

const questionBank: Record<RelationType, string[]> = {
  spatial: [
    "İki tezgâh arasındaki mesafe 4 metredir.", "Depo, üretim alanının yanında bulunur.", "Sevkiyat bölümü fabrikanın çıkışına yakındır.",
    "Raflar birbirine paralel yerleştirilmiştir.", "Makine A, Makine B’nin solundadır.", "Kalite kontrol birimi montaj hattının karşısındadır.",
  ],
  temporal: [
    "Paketleme, kalite kontrolden sonra yapılır.", "Sipariş üretimden önce alınır.", "Bakım her 30 günde bir yapılır.",
    "Vardiya saat 08.00’de başlar.", "Montaj tamamlandıktan sonra test yapılır.", "Teslimat, üretim bittikten iki gün sonra gerçekleşir.",
  ],
  causal: [
    "Fiyat arttığında talep azalır.", "Talep artınca üretim miktarı yükselir.", "Makine arızası üretimin durmasına neden olur.",
    "Reklam arttıkça satışlar yükselir.", "Hammadde gecikmesi teslimatı geciktirir.", "Kalite hataları müşteri şikâyetlerini artırır.",
  ],
  logical: [
    "Stok 20’nin altındaysa sipariş ver.", "Şifre doğruysa sisteme giriş yap.", "Ürün hatalıysa yeniden işleme gönder.",
    "Sıcaklık 30°C’yi aşarsa fanı çalıştır.", "Ödeme onaylandıysa siparişi hazırla.", "Sensör hareket algılarsa ışığı yak.",
  ],
  mathematical: [
    "Gelir = Fiyat × Satış miktarı.", "Stok miktarı ≤ minimum stok.", "Üretim miktarı > talep.",
    "Toplam maliyet = Sabit maliyet + Değişken maliyet.", "A üretimi = B üretimi.", "Hata oranı %5’ten küçüktür.",
  ],
  energy: [
    "Barajdaki su enerjisi elektrik enerjisine dönüşür.", "Pil enerjisi lambada ışık ve ısıya dönüşür.", "Yakıt enerjisi motorda hareket enerjisine dönüşür.",
    "Güneş enerjisi panelde elektrik enerjisine dönüşür.", "Elektrik enerjisi motorda mekanik harekete dönüşür.", "Potansiyel enerji hareket enerjisine dönüşür.",
  ],
};

const balancedOrder: RelationType[] = ["spatial", "temporal", "causal", "logical", "mathematical", "energy", "causal", "spatial", "logical", "temporal"];

function buildRounds(): BalloonQuestion[] {
  const seen: Partial<Record<RelationType, number>> = {};
  return balancedOrder.map((type, index) => {
    const categoryIndex = categories.findIndex((category) => category.id === type);
    const occurrence = seen[type] || 0;
    seen[type] = occurrence + 1;
    const questionIndex = (categoryIndex + occurrence * 3) % questionBank[type].length;
    return { id: `${index + 1}-${type}-${questionIndex}`, type, text: questionBank[type][questionIndex] };
  });
}

const rounds = buildRounds();
const secondsPerBalloon = 15;
const pointsPerQuestion = 100 / rounds.length;

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function Module5RelationBalloons({ onSubmit, existingSubmission, forceSubmit }: LearningModuleProps) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [remaining, setRemaining] = useState(secondsPerBalloon);
  const [phase, setPhase] = useState<"active" | "feedback" | "complete">("active");
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [shot, setShot] = useState<{ side: "left" | "right"; correct: boolean; nonce: number } | null>(null);
  const [shakeNonce, setShakeNonce] = useState(0);
  const [inputLocked, setInputLocked] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const resolved = useRef(false);
  const answersRef = useRef<BalloonAnswer[]>([]);
  const attemptsRef = useRef<RelationType[]>([]);
  const submissionStarted = useRef(false);
  const timeoutHandler = useRef<() => void>(() => undefined);
  const cooldownRun = useRef(0);
  const current = rounds[Math.min(roundIndex, rounds.length - 1)];

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true);
    setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) setSubmitFailed(true);
  }, [onSubmit]);

  const finalize = useCallback(async (finalAnswers: BalloonAnswer[], reason: "completed" | "teacher-ended") => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true;
    cooldownRun.current += 1;
    setCooldown(0);
    const correctCount = finalAnswers.filter((answer) => answer.isCorrect).length;
    const submission: ModuleSubmission = {
      score: Math.round(correctCount * pointsPerQuestion),
      payload: {
        mode: "relation-balloon-pop",
        answers: finalAnswers,
        correctCount,
        answeredCount: finalAnswers.length,
        questionCount: rounds.length,
        pointsPerQuestion,
        completionReason: reason,
      },
    };
    setFinalSubmission(submission);
    setPhase("complete");
    await submitResult(submission);
  }, [existingSubmission, submitResult]);

  const moveNext = useCallback(async (nextAnswers: BalloonAnswer[]) => {
    await delay(1500);
    if (submissionStarted.current) return;
    if (roundIndex === rounds.length - 1) {
      await finalize(nextAnswers, "completed");
      return;
    }
    resolved.current = false;
    attemptsRef.current = [];
    setFeedback(null);
    setShot(null);
    setRemaining(secondsPerBalloon);
    setRoundIndex((index) => index + 1);
    setPhase("active");
    setInputLocked(false);
    setCooldown(0);
  }, [finalize, roundIndex]);

  const expireBalloon = useCallback(() => {
    if (resolved.current || phase !== "active" || existingSubmission) return;
    cooldownRun.current += 1;
    resolved.current = true;
    const answer: BalloonAnswer = { questionId: current.id, expected: current.type, attempts: attemptsRef.current, isCorrect: false, timedOut: true };
    const nextAnswers = [...answersRef.current, answer];
    answersRef.current = nextAnswers;
    setRemaining(0);
    setFeedback({ correct: false, text: "Süre doldu! Balon kaçtı; yeni soru birazdan geliyor." });
    setPhase("feedback");
    void moveNext(nextAnswers);
  }, [current, existingSubmission, moveNext, phase]);

  useEffect(() => { timeoutHandler.current = expireBalloon; }, [expireBalloon]);

  useEffect(() => {
    if (phase !== "active" || existingSubmission || forceSubmit) return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setRemaining(Math.max(0, secondsPerBalloon - elapsed));
    }, 100);
    const timeout = window.setTimeout(() => timeoutHandler.current(), secondsPerBalloon * 1000);
    return () => { window.clearInterval(interval); window.clearTimeout(timeout); };
  }, [existingSubmission, forceSubmit, phase, roundIndex]);

  useEffect(() => {
    if (!forceSubmit || phase === "complete" || existingSubmission) return;
    const pendingAnswer = attemptsRef.current.length > 0 && !resolved.current
      ? [{ questionId: current.id, expected: current.type, attempts: attemptsRef.current, isCorrect: false, timedOut: false } satisfies BalloonAnswer]
      : [];
    void finalize([...answersRef.current, ...pendingAnswer], "teacher-ended");
  }, [current.id, current.type, existingSubmission, finalize, forceSubmit, phase]);

  const shoot = useCallback(async (type: RelationType) => {
    if (phase !== "active" || inputLocked || resolved.current || existingSubmission || forceSubmit) return;
    const category = categories.find((item) => item.id === type)!;
    const isCorrect = type === current.type;
    const nextAttempts = [...attemptsRef.current, type];
    attemptsRef.current = nextAttempts;
    setShot({ side: category.side, correct: isCorrect, nonce: Date.now() });
    setInputLocked(true);

    if (!isCorrect) {
      const currentCooldown = ++cooldownRun.current;
      setShakeNonce((value) => value + 1);
      setFeedback({ correct: false, text: "Bu iğne uygun değil. Balon yükselmeye devam ediyor; başka bir ilişki türü seç." });
      window.setTimeout(() => {
        if (cooldownRun.current === currentCooldown) setShot(null);
      }, 560);
      for (let seconds = 3; seconds > 0; seconds -= 1) {
        setCooldown(seconds);
        await delay(1000);
        if (cooldownRun.current !== currentCooldown) return;
      }
      setCooldown(0);
      setInputLocked(false);
      setFeedback((value) => value?.correct === false ? null : value);
      return;
    }

    cooldownRun.current += 1;
    resolved.current = true;
    const answer: BalloonAnswer = { questionId: current.id, expected: current.type, attempts: nextAttempts, isCorrect: true, timedOut: false };
    const nextAnswers = [...answersRef.current, answer];
    answersRef.current = nextAnswers;
    setPhase("feedback");
    setFeedback({ correct: true, text: category.explanation });
    window.setTimeout(() => confetti({ particleCount: 34, spread: 62, startVelocity: 22, origin: { x: .5, y: .48 }, colors: [category.color, "#ffffff", "#fbbf24"] }), 320);
    await moveNext(nextAnswers);
  }, [current, existingSubmission, forceSubmit, inputLocked, moveNext, phase]);

  if (existingSubmission && phase !== "complete") {
    return <section className="panel module-shell balloon-module-shell"><div className="module-title-chip">Modül 5: İlişki Türleri</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>Bu modül tamamlandı</h2><p>Yanıtın kilitlendi. Öğretmen sonuçları açıklayana kadar bekleyin.</p></div></section>;
  }

  if (phase === "complete") {
    const endedByTeacher = finalSubmission?.payload?.completionReason === "teacher-ended";
    return <section className="panel module-shell balloon-module-shell">
      <div className="module-title-chip">Modül 5: İlişki Türleri</div>
      <div className="module-complete-card"><Sparkles size={42} /><h2>{endedByTeacher ? "Kısmi balon turun kaydediliyor" : "Balon turu tamamlandı"}</h2><p>{endedByTeacher ? "O ana kadar verdiğin yanıtlar ve kazandığın puan korunuyor." : "Doğru patlattığın balonların puanı kaydedildi."} Öğretmen sonuçları açıklayana kadar puanın gizli kalacak.</p>{submitting && <div className="notice">Yanıt kaydediliyor…</div>}{submitFailed && finalSubmission && <><div className="notice error">Yanıt kaydedilemedi. İlerlemen korundu.</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>Kaydı tekrar dene</Button></>}</div>
    </section>;
  }

  const leftPins = categories.filter((category) => category.side === "left");
  const rightPins = categories.filter((category) => category.side === "right");
  const pinGrid = leftPins.flatMap((category, index) => [category, rightPins[index]]).filter((category): category is RelationCategory => Boolean(category));
  const progress = Math.max(0, Math.min(100, (remaining / secondsPerBalloon) * 100));

  return <section className="panel module-shell balloon-module-shell">
    <div className="module-topline"><div className="module-title-chip">Modül 5: İlişki Türleri &amp; Balon Patlatma</div><strong>{roundIndex + 1} / {rounds.length} Balon</strong></div>
    <div className="ten-step-progress">{rounds.map((question, index) => <span key={question.id} className={index < roundIndex ? "done" : index === roundIndex ? "active" : ""} />)}</div>

    <div className="balloon-game-layout">
      <div className="balloon-arena">
        <div className="balloon-timer"><Clock3 size={15} /><div><i style={{ width: `${progress}%` }} /></div><strong>{Math.ceil(remaining)} sn</strong></div>
        <motion.div key={current.id} className="balloon-rise" initial={{ y: 230 }} animate={{ y: -430 }} transition={{ duration: secondsPerBalloon, ease: "linear" }}>
          <motion.article key={`${current.id}-${shakeNonce}`} className={`question-balloon ${phase === "feedback" && feedback?.correct ? "popped" : ""}`} animate={shakeNonce ? { x: [0, -11, 10, -7, 5, 0] } : { x: 0 }} transition={{ duration: .45 }}>
            <span className="balloon-glint" /><p>{current.text}</p><span className="balloon-knot" /><span className="balloon-string" />
          </motion.article>
        </motion.div>
        <AnimatePresence>{shot && <motion.div key={shot.nonce} className={`flying-pin ${shot.correct ? "correct" : "wrong"}`} initial={{ x: shot.side === "left" ? -260 : 260, y: 105, rotate: shot.side === "left" ? -28 : 208, opacity: 0 }} animate={{ x: shot.correct ? [shot.side === "left" ? -260 : 260, 0] : [shot.side === "left" ? -260 : 260, 0, shot.side === "left" ? -95 : 95], y: shot.correct ? [105, 0] : [105, 0, 35], opacity: [0, 1, 1] }} exit={{ opacity: 0 }} transition={{ duration: .55, ease: "easeOut" }}>➤</motion.div>}</AnimatePresence>
        <div className="arena-target"><Target size={18} /> İğneyi seç</div>
      </div>

      <div className="relation-pin-grid" aria-label="İlişki türü iğneleri">{pinGrid.map((category) => <button type="button" key={category.id} disabled={inputLocked || phase !== "active"} style={{ "--pin-color": category.color } as React.CSSProperties} onClick={() => void shoot(category.id)}><span className="relation-pin-icon">{category.icon}</span><strong className={category.id === "mathematical" ? "compact-label" : ""}>{category.id === "energy" ? <>Enerjinin<br />Korunumu</> : category.label}</strong>{cooldown > 0 && <em className="pin-cooldown"><LockKeyhole size={14} />{cooldown}</em>}</button>)}</div>
    </div>

    <div className="balloon-feedback-space" aria-live="assertive">{feedback && <div className={`balloon-feedback ${feedback.correct ? "correct" : "wrong"}`}>{feedback.correct ? <Check size={20} /> : <X size={20} />}<span>{feedback.text}</span></div>}</div>
  </section>;
}
