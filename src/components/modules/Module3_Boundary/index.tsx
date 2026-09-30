"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowRight, Check, LockKeyhole, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import type { LearningModuleProps, ModuleSubmission } from "@/types";

type BlackBoxSystem = {
  id: string;
  input: string;
  output: string;
  options: string[];
  correct: string;
  icon: string;
};

type ProcessAnswer = {
  systemId: string;
  selected: string;
  attempts: number;
  firstAttemptCorrect: boolean;
};

const systems: BlackBoxSystem[] = [
  { id: "production", input: "Ham madde", output: "Ürün", options: ["Kalite kontrol", "Üretim", "Paketleme"], correct: "Üretim", icon: "🏭" },
  { id: "data", input: "Veri", output: "Bilgi", options: ["Veri işleme", "Veri saklama", "Veri toplama"], correct: "Veri işleme", icon: "💾" },
  { id: "education", input: "Öğrenciler", output: "Mezun birey", options: ["Rehberlik", "Sınav değerlendirme", "Eğitim"], correct: "Eğitim", icon: "🎓" },
  { id: "health", input: "Hasta", output: "Sağlığına kavuşmuş hasta", options: ["Hasta kaydı", "Tedavi", "Ön muayene"], correct: "Tedavi", icon: "🩺" },
  { id: "canning", input: "Sebze + su + enerji", output: "Kutulanmış konserve", options: ["Etiketleme", "Sebzeleri ayıklama", "Pişirme ve konserveleme"], correct: "Pişirme ve konserveleme", icon: "🥫" },
  { id: "automobile", input: "Metal levha + parçalar", output: "Otomobil", options: ["Kesme–delme–montaj", "Boyama", "Parça kontrolü"], correct: "Kesme–delme–montaj", icon: "🚗" },
  { id: "flour", input: "Buğday", output: "Un", options: ["Paketleme", "Öğütme", "Eleme"], correct: "Öğütme", icon: "🌾" },
  { id: "order", input: "Sipariş bilgileri", output: "Hazırlanmış sipariş", options: ["Sevkiyat planlama", "Sipariş kaydı", "Sipariş hazırlama"], correct: "Sipariş hazırlama", icon: "📦" },
  { id: "tire", input: "Ham kauçuk + kimyasallar", output: "Lastik", options: ["Lastik üretim süreci", "Son kalite kontrol", "Karışım hazırlama"], correct: "Lastik üretim süreci", icon: "🛞" },
  { id: "analysis", input: "Müşteri verileri", output: "Karar bilgisi / analiz sonucu", options: ["Rapor biçimlendirme", "Analiz etme", "Veri toplama"], correct: "Analiz etme", icon: "📊" },
];

const pointsPerSystem = 100 / systems.length;

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function Module3Boundary({ onSubmit, existingSubmission }: LearningModuleProps) {
  const [systemIndex, setSystemIndex] = useState(0);
  const [answers, setAnswers] = useState<ProcessAnswer[]>([]);
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const interactionLocked = useRef(false);
  const current = systems[Math.min(systemIndex, systems.length - 1)];

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true);
    setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) setSubmitFailed(true);
  }, [onSubmit]);

  const choose = useCallback(async (selected: string) => {
    if (interactionLocked.current || busy || completed || existingSubmission) return;
    interactionLocked.current = true;
    const nextAttemptCount = (attempts[current.id] || 0) + 1;
    setAttempts((value) => ({ ...value, [current.id]: nextAttemptCount }));

    if (selected !== current.correct) {
      setBusy(true);
      setShaking(true);
      setFeedback({ correct: false, text: "Bu işlem girdiyi verilen çıktıya dönüştürmüyor. Sürecin tamamını yeniden düşün ve tekrar dene." });
      await delay(620);
      setShaking(false);
      setBusy(false);
      interactionLocked.current = false;
      return;
    }

    const answer: ProcessAnswer = {
      systemId: current.id,
      selected,
      attempts: nextAttemptCount,
      firstAttemptCorrect: nextAttemptCount === 1,
    };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);
    setBusy(true);
    setRevealed(true);
    setFeedback({ correct: true, text: "Doğru süreç! Kara kutunun içindeki dönüşümü görünür hâle getirdin." });
    await delay(1050);

    if (systemIndex === systems.length - 1) {
      const firstTryCount = nextAnswers.filter((item) => item.firstAttemptCorrect).length;
      const submission: ModuleSubmission = {
        score: Math.round(firstTryCount * pointsPerSystem),
        payload: {
          mode: "black-box-process-analysis",
          answers: nextAnswers,
          firstTryCorrectCount: firstTryCount,
          systemCount: systems.length,
          pointsPerSystem,
        },
      };
      setFinalSubmission(submission);
      setCompleted(true);
      setBusy(false);
      await submitResult(submission);
      return;
    }

    setSystemIndex((index) => index + 1);
    setRevealed(false);
    setFeedback(null);
    setBusy(false);
    interactionLocked.current = false;
  }, [answers, attempts, busy, completed, current, existingSubmission, submitResult, systemIndex]);

  if (existingSubmission) {
    return <section className="panel module-shell process-module-shell">
      <div className="module-title-chip">Modül 3: Kara Kutu ve Süreç Analizi</div>
      <div className="module-complete-card"><LockKeyhole size={42} /><h2>Bu modül tamamlandı</h2><p>Yanıtın kilitlendi. Öğretmen sonuçları açıklayana kadar bekleyin.</p></div>
    </section>;
  }

  if (completed) {
    return <section className="panel module-shell process-module-shell">
      <div className="module-title-chip">Modül 3: Kara Kutu ve Süreç Analizi</div>
      <div className="module-complete-card">
        <Sparkles size={42} />
        <h2>10 kara kutuyu da çözdün</h2>
        <p>Yanıtların kilitlendi. Puanın, öğretmen sonuçları açtığında görünecek.</p>
        {submitting && <div className="notice">Yanıt kaydediliyor…</div>}
        {submitFailed && finalSubmission && <><div className="notice error">Yanıt kaydedilemedi. İlerlemen korundu.</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>Kaydı tekrar dene</Button></>}
      </div>
    </section>;
  }

  return <section className="panel module-shell process-module-shell">
    <div className="module-topline">
      <div><div className="module-title-chip">Modül 3: Kara Kutu ve Süreç Analizi</div><p>Girdi ile çıktıyı birbirine bağlayan doğru dönüşüm sürecini bul.</p></div>
      <strong>{systemIndex + 1} / {systems.length}</strong>
    </div>

    <div className="ten-step-progress" aria-label={`Sistem ${systemIndex + 1} / ${systems.length}`}>
      {systems.map((system, index) => <span key={system.id} className={index < systemIndex ? "done" : index === systemIndex ? "active" : ""} />)}
    </div>

    <div className="process-flow" aria-live="polite">
      <article className="process-endpoint input"><small>GİRDİ</small><span>{current.icon}</span><strong>{current.input}</strong></article>
      <ArrowRight className="process-arrow" aria-hidden="true" />
      <article className={`black-box ${revealed ? "revealed" : ""} ${shaking ? "shake" : ""}`}>
        <small>{revealed ? "SÜREÇ" : "KARA KUTU"}</small>
        <span aria-hidden="true">{revealed ? "✦" : "?"}</span>
        <strong>{revealed ? current.correct : "Dönüşümü keşfet"}</strong>
      </article>
      <ArrowRight className="process-arrow" aria-hidden="true" />
      <article className="process-endpoint output"><small>ÇIKTI</small><span>🎯</span><strong>{current.output}</strong></article>
    </div>

    <div className="process-options" aria-label="Süreç seçenekleri">
      {current.options.map((option) => <button type="button" key={option} disabled={busy} className={revealed && option === current.correct ? "correct" : ""} onClick={() => void choose(option)}>{revealed && option === current.correct && <Check size={18} />}{option}</button>)}
    </div>

    <div className="process-feedback-space" aria-live="assertive">
      {feedback && <div className={`process-feedback ${feedback.correct ? "correct" : "wrong"}`}>{feedback.correct ? <Check size={20} /> : <X size={20} />}<span>{feedback.text}</span></div>}
    </div>
    <p className="score-privacy-note">Her sistem 10 puan değerindedir. Puanlar sonuçlar açıklanana kadar gizli tutulur.</p>
  </section>;
}
