"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, LockKeyhole, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleSubmission } from "@/types";
import { buildMissingProcessRounds, missingProcessLabels } from "./missingProcessContent";

type MissingStepAnswer = {
  questionId: string;
  selectedOptionId: string;
  correctOptionId: "correct";
  isCorrect: boolean;
};

const questionCount = 10;
const pointsPerQuestion = 100 / questionCount;

const copy = {
  tr: {
    title: "Hafta 3 · Modül 2: Kara Kutuda Eksik Adım",
    correct: "Doğru! Eksik adım:",
    wrong: "Yanlış! Doğru adım:",
    locked: "Bu modül tamamlandı",
    lockedDetail: "Yanıtın kilitlendi. Öğretmen sonuçları açıklayana kadar bekleyin.",
    completed: "10 süreç zincirini tamamladın",
    partial: "Kısmi yanıtın kaydediliyor",
    completedDetail: "Doğru yanıtladığın her soru puanına eklendi. Öğretmen sonuçları açıklayana kadar puanın gizli kalacak.",
    saving: "Yanıt kaydediliyor…",
    saveError: "Yanıt kaydedilemedi. İlerlemen korundu.",
    retry: "Kaydı tekrar dene",
    missingSlot: "Eksik adım",
    missingHint: "Doğru adımı seç",
  },
  en: {
    title: "Week 3 · Module 2: Missing Step in the Black Box",
    correct: "Correct! The missing step is:",
    wrong: "Incorrect! The correct step is:",
    locked: "This module is complete",
    lockedDetail: "Your answer is locked. Wait until the teacher reveals the results.",
    completed: "You completed 10 process chains",
    partial: "Saving your partial answer",
    completedDetail: "Each correct answer was added to your score. Your score stays hidden until the teacher reveals the results.",
    saving: "Saving your answer…",
    saveError: "The answer could not be saved. Your progress is preserved.",
    retry: "Try saving again",
    missingSlot: "Missing step",
    missingHint: "Choose the correct step",
  },
};

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function Week3MissingProcess({
  onSubmit,
  existingSubmission,
  forceSubmit,
  sessionId,
}: LearningModuleProps & { sessionId: string }) {
  const { locale } = useI18n();
  const text = copy[locale];
  const questions = useMemo(() => buildMissingProcessRounds(sessionId), [sessionId]);
  const [systemIndex, setSystemIndex] = useState(0);
  const [answers, setAnswers] = useState<MissingStepAnswer[]>([]);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [wrongReveal, setWrongReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const interactionLocked = useRef(false);
  const submissionStarted = useRef(false);
  const answersRef = useRef<MissingStepAnswer[]>([]);
  const current = questions[Math.min(systemIndex, questions.length - 1)];

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true);
    setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) setSubmitFailed(true);
  }, [onSubmit]);

  const finalize = useCallback(async (finalAnswers: MissingStepAnswer[], reason: "completed" | "teacher-ended") => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true;
    const correctCount = finalAnswers.filter((answer) => answer.isCorrect).length;
    const submission: ModuleSubmission = {
      score: Math.round(correctCount * pointsPerQuestion),
      payload: {
        mode: "missing-process-step-chain",
        selectedQuestionIds: questions.map((question) => question.id),
        answers: finalAnswers,
        correctCount,
        answeredCount: finalAnswers.length,
        questionCount: questions.length,
        pointsPerQuestion,
        completionReason: reason,
      },
    };
    setAnswers(finalAnswers);
    setFinalSubmission(submission);
    setCompleted(true);
    setBusy(false);
    await submitResult(submission);
  }, [existingSubmission, questions, submitResult]);

  useEffect(() => {
    if (forceSubmit && !completed && !existingSubmission) void finalize(answersRef.current, "teacher-ended");
  }, [completed, existingSubmission, finalize, forceSubmit]);

  const choose = useCallback(async (optionId: string) => {
    if (interactionLocked.current || busy || completed || existingSubmission || forceSubmit) return;
    interactionLocked.current = true;
    const option = current.options.find((item) => item.id === optionId);
    if (!option) {
      interactionLocked.current = false;
      return;
    }
    const answer: MissingStepAnswer = {
      questionId: current.id,
      selectedOptionId: option.id,
      correctOptionId: "correct",
      isCorrect: option.isCorrect,
    };
    const nextAnswers = [...answersRef.current, answer];
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    setSelectedOptionId(option.id);
    setBusy(true);
    setRevealed(true);
    setWrongReveal(!option.isCorrect);
    setFeedback({
      correct: option.isCorrect,
      text: `${option.isCorrect ? text.correct : text.wrong} ${current.correct[locale]}`,
    });
    await delay(1500);

    if (submissionStarted.current) return;
    if (systemIndex === questions.length - 1) {
      await finalize(nextAnswers, "completed");
      return;
    }

    setSystemIndex((index) => index + 1);
    setRevealed(false);
    setWrongReveal(false);
    setSelectedOptionId(null);
    setFeedback(null);
    setBusy(false);
    interactionLocked.current = false;
  }, [busy, completed, current, existingSubmission, finalize, forceSubmit, locale, questions.length, systemIndex, text.correct, text.wrong]);

  if (existingSubmission && !completed) {
    return <section className="panel module-shell process-module-shell missing-process-shell">
      <div className="module-title-chip">{text.title}</div>
      <div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div>
    </section>;
  }

  if (completed) {
    return <section className="panel module-shell process-module-shell missing-process-shell">
      <div className="module-title-chip">{text.title}</div>
      <div className="module-complete-card">
        <Sparkles size={42} />
        <h2>{answers.length === questions.length ? text.completed : text.partial}</h2>
        <p>{text.completedDetail}</p>
        {submitting && <div className="notice">{text.saving}</div>}
        {submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>{text.retry}</Button></>}
      </div>
    </section>;
  }

  return <section className="panel module-shell process-module-shell missing-process-shell">
    <div className="module-topline">
      <div className="module-title-chip">{text.title}</div>
      <strong>{systemIndex + 1} / {questions.length}</strong>
    </div>

    <div className="ten-step-progress" aria-label={`${systemIndex + 1} / ${questions.length}`}>
      {questions.map((question, index) => <span key={question.id} className={index < systemIndex ? "done" : index === systemIndex ? "active" : ""} />)}
    </div>

    <header className="missing-process-heading">
      <div><span>{systemIndex + 1}</span><h2 data-i18n-skip>{current.title[locale]}</h2></div>
      <p><strong data-i18n-skip>{missingProcessLabels.input[locale]}</strong><span data-i18n-skip>{current.input[locale]}</span></p>
    </header>

    <div className="missing-process-chain" aria-live="polite">
      {current.steps.map((step, index) => <div className={`missing-process-link ${index === current.steps.length - 1 ? "last" : ""}`} key={`${current.id}:${index}`}>
        {step ? <article className="missing-process-step"><small>{index + 1}</small><strong data-i18n-skip>{step[locale]}</strong></article> : <article className={`missing-process-slot ${revealed ? "revealed" : ""} ${wrongReveal ? "wrong-reveal" : ""}`}>
          <small data-i18n-skip>{revealed ? missingProcessLabels.missingStep[locale] : text.missingSlot}</small>
          {revealed ? <><Check size={22} aria-hidden="true" /><strong data-i18n-skip>{current.correct[locale]}</strong></> : <><b aria-hidden="true">?</b><strong>{text.missingHint}</strong></>}
        </article>}
        {index < current.steps.length - 1 && <ArrowRight className="missing-process-arrow" aria-hidden="true" />}
      </div>)}
    </div>

    <div className="missing-process-options-title" data-i18n-skip>{missingProcessLabels.options[locale]}</div>
    <div className="process-options missing-process-options" aria-label={missingProcessLabels.options[locale]}>
      {current.options.map((option) => <button
        type="button"
        key={`${current.id}:${option.id}`}
        disabled={busy}
        className={`${revealed && option.isCorrect ? "correct" : ""} ${revealed && selectedOptionId === option.id && !option.isCorrect ? "wrong" : ""}`}
        onClick={() => void choose(option.id)}
      >
        {revealed && option.isCorrect && <Check size={18} />}
        {revealed && selectedOptionId === option.id && !option.isCorrect && <X size={18} />}
        <span data-i18n-skip>{option.text[locale]}</span>
      </button>)}
    </div>

    <div className="process-feedback-space" aria-live="assertive">
      {feedback && <div className={`process-feedback ${feedback.correct ? "correct" : "wrong"}`}>{feedback.correct ? <Check size={20} /> : <X size={20} />}<span data-i18n-skip>{feedback.text}</span></div>}
    </div>
  </section>;
}
