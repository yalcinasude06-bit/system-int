"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  correct: string;
  isCorrect: boolean;
};

const systems: BlackBoxSystem[] = [
  { id: "production", input: "Ham madde", output: "Ürün", options: ["Kalite kontrol", "Üretim", "Paketleme"], correct: "Üretim", icon: "📦" },
  { id: "data", input: "Veri", output: "Bilgi", options: ["Veri işleme", "Veri saklama", "Veri toplama"], correct: "Veri işleme", icon: "💾" },
  { id: "education", input: "Öğrenciler", output: "Mezun birey", options: ["Rehberlik", "Sınav değerlendirme", "Eğitim"], correct: "Eğitim", icon: "🎓" },
  { id: "health", input: "Hasta", output: "Sağlığına kavuşmuş hasta", options: ["Hasta kaydı", "Tedavi", "Ön muayene"], correct: "Tedavi", icon: "🩺" },
  { id: "canning", input: "Sebze + su + enerji", output: "Kutulanmış konserve", options: ["Etiketleme", "Sebzeleri ayıklama", "Pişirme ve konserveleme"], correct: "Pişirme ve konserveleme", icon: "🥬" },
  { id: "automobile", input: "Metal levha + parçalar", output: "Otomobil", options: ["Kesme–delme–montaj", "Boyama", "Parça kontrolü"], correct: "Kesme–delme–montaj", icon: "🔩" },
  { id: "flour", input: "Buğday", output: "Un", options: ["Paketleme", "Öğütme", "Eleme"], correct: "Öğütme", icon: "🌾" },
  { id: "order", input: "Sipariş bilgileri", output: "Hazırlanmış sipariş", options: ["Sevkiyat planlama", "Sipariş kaydı", "Sipariş hazırlama"], correct: "Sipariş hazırlama", icon: "🧾" },
  { id: "tire", input: "Ham kauçuk + kimyasallar", output: "Lastik", options: ["Lastik üretim süreci", "Son kalite kontrol", "Karışım hazırlama"], correct: "Lastik üretim süreci", icon: "⚗️" },
  { id: "analysis", input: "Müşteri verileri", output: "Karar bilgisi / analiz sonucu", options: ["Rapor biçimlendirme", "Analiz etme", "Veri toplama"], correct: "Analiz etme", icon: "📊" },
];

const pointsPerSystem = 100 / systems.length;

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function BlackBoxCube({ revealed, wrong, process }: { revealed: boolean; wrong: boolean; process: string }) {
  return <div className={`black-box-cube ${revealed ? "revealed" : ""} ${wrong ? "wrong" : ""}`}>
    <svg viewBox="0 0 180 150" role="img" aria-label={revealed ? `Kara kutunun içindeki süreç: ${process}` : "Üç boyutlu kara kutu"}>
      <defs>
        <linearGradient id="cube-front" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#334155" /><stop offset="1" stopColor="#0f172a" /></linearGradient>
        <linearGradient id="cube-top" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#64748b" /><stop offset="1" stopColor="#1e293b" /></linearGradient>
        <linearGradient id="cube-side" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#1e293b" /><stop offset="1" stopColor="#020617" /></linearGradient>
        <filter id="cube-shadow"><feDropShadow dx="0" dy="11" stdDeviation="8" floodColor="#0f172a" floodOpacity=".35" /></filter>
      </defs>
      <g filter="url(#cube-shadow)">
        <path className="cube-top" d="M25 42 L78 14 L155 42 L101 71 Z" fill="url(#cube-top)" />
        <path className="cube-side" d="M101 71 L155 42 L155 112 L101 141 Z" fill="url(#cube-side)" />
        <path className="cube-front" d="M25 42 L101 71 L101 141 L25 111 Z" fill="url(#cube-front)" />
      </g>
    </svg>
    <span>{revealed ? process : "?"}</span>
  </div>;
}

function submissionForAnswers(finalAnswers: ProcessAnswer[], reason: "completed" | "teacher-ended" | "draft"): ModuleSubmission {
  const correctCount = finalAnswers.filter((item) => item.isCorrect).length;
  return {
    score: Math.round(correctCount * pointsPerSystem),
    payload: {
      mode: "black-box-process-analysis",
      answers: finalAnswers,
      correctCount,
      answeredCount: finalAnswers.length,
      systemCount: systems.length,
      pointsPerSystem,
      completionReason: reason,
    },
  };
}

export function Module3Boundary({ onSubmit, onDraft, existingSubmission, forceSubmit }: LearningModuleProps) {
  const [systemIndex, setSystemIndex] = useState(0);
  const [answers, setAnswers] = useState<ProcessAnswer[]>([]);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [wrongReveal, setWrongReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const interactionLocked = useRef(false);
  const submissionStarted = useRef(false);
  const answersRef = useRef<ProcessAnswer[]>([]);
  const current = systems[Math.min(systemIndex, systems.length - 1)];

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true);
    setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) setSubmitFailed(true);
  }, [onSubmit]);

  const finalize = useCallback(async (finalAnswers: ProcessAnswer[], reason: "completed" | "teacher-ended") => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true;
    const submission = submissionForAnswers(finalAnswers, reason);
    setAnswers(finalAnswers);
    setFinalSubmission(submission);
    setCompleted(true);
    setBusy(false);
    await submitResult(submission);
  }, [existingSubmission, submitResult]);

  useEffect(() => {
    if (forceSubmit && !completed && !existingSubmission) void finalize(answersRef.current, "teacher-ended");
  }, [completed, existingSubmission, finalize, forceSubmit]);

  const choose = useCallback(async (selected: string) => {
    if (interactionLocked.current || busy || completed || existingSubmission || forceSubmit) return;
    interactionLocked.current = true;
    const isCorrect = selected === current.correct;
    const answer: ProcessAnswer = { systemId: current.id, selected, correct: current.correct, isCorrect };
    const nextAnswers = [...answersRef.current, answer];
    answersRef.current = nextAnswers;
    void onDraft?.(submissionForAnswers(nextAnswers, "draft"));
    setAnswers(nextAnswers);
    setBusy(true);
    setRevealed(true);
    setWrongReveal(!isCorrect);
    setFeedback({
      correct: isCorrect,
      text: isCorrect ? `Doğru! Süreç: ${current.correct}` : `Yanlış! Doğru Süreç: ${current.correct}`,
    });
    await delay(1500);

    if (submissionStarted.current) return;
    if (systemIndex === systems.length - 1) {
      await finalize(nextAnswers, "completed");
      return;
    }

    setSystemIndex((index) => index + 1);
    setRevealed(false);
    setWrongReveal(false);
    setFeedback(null);
    setBusy(false);
    interactionLocked.current = false;
  }, [busy, completed, current, existingSubmission, finalize, forceSubmit, onDraft, systemIndex]);

  if (existingSubmission && !completed) {
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
        <h2>{answers.length === systems.length ? "10 kara kutuyu tamamladın" : "Kısmi yanıtın kaydediliyor"}</h2>
        <p>Doğru yanıtladığın her soru puanına eklendi. Öğretmen sonuçları açıklayana kadar puanın gizli kalacak.</p>
        {submitting && <div className="notice">Yanıt kaydediliyor…</div>}
        {submitFailed && finalSubmission && <><div className="notice error">Yanıt kaydedilemedi. İlerlemen korundu.</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>Kaydı tekrar dene</Button></>}
      </div>
    </section>;
  }

  return <section className="panel module-shell process-module-shell">
    <div className="module-topline">
      <div className="module-title-chip">Modül 3: Kara Kutu ve Süreç Analizi</div>
      <strong>{systemIndex + 1} / {systems.length}</strong>
    </div>

    <div className="ten-step-progress" aria-label={`Sistem ${systemIndex + 1} / ${systems.length}`}>
      {systems.map((system, index) => <span key={system.id} className={index < systemIndex ? "done" : index === systemIndex ? "active" : ""} />)}
    </div>

    <div className="process-flow compact" aria-live="polite">
      <article className="process-endpoint input"><small>GİRDİ</small><span>{current.icon}</span><strong>{current.input}</strong></article>
      <ArrowRight className="process-arrow" aria-hidden="true" />
      <article className={`black-box-3d ${revealed ? "illuminated" : ""} ${wrongReveal ? "wrong-reveal" : ""}`}>
        <small>{revealed ? "SÜREÇ" : "KARA KUTU"}</small>
        <BlackBoxCube revealed={revealed} wrong={wrongReveal} process={current.correct} />
      </article>
      <ArrowRight className="process-arrow" aria-hidden="true" />
      <article className="process-endpoint output"><small>ÇIKTI</small><span>🎁</span><strong>{current.output}</strong></article>
    </div>

    <div className="process-options" aria-label="Süreç seçenekleri">
      {current.options.map((option) => <button type="button" key={option} disabled={busy} className={revealed && option === current.correct ? "correct" : ""} onClick={() => void choose(option)}>{revealed && option === current.correct && <Check size={18} />}{option}</button>)}
    </div>

    <div className="process-feedback-space" aria-live="assertive">
      {feedback && <div className={`process-feedback ${feedback.correct ? "correct" : "wrong"}`}>{feedback.correct ? <Check size={20} /> : <X size={20} />}<span>{feedback.text}</span></div>}
    </div>
  </section>;
}
