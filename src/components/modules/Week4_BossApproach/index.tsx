"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, LockKeyhole, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import { approachLabels, buildBossApproachRound, type ApproachId } from "./approachContent";

type BossAnswer = {
  questionId: string;
  selectedOptionId: ApproachId;
  correctOptionId: ApproachId;
  isCorrect: boolean;
};

type DraftPayload = {
  answers?: unknown;
  currentIndex?: unknown;
  reviewingQuestionId?: unknown;
};

const pointsPerQuestion = 10;
const characters = ["🧑🏽‍💼", "👩🏻‍💼", "🧑🏼‍💻", "👨🏾‍🔧", "👩🏿‍🔬", "🧑🏻‍🏫", "👩🏼‍🚀", "🧑🏽‍⚖️"];

const copy = {
  tr: {
    title: "Hafta 4 · Modül 1: Patronun Yaklaşımını Bul",
    instruction: "Patronun sözünü oku ve kullandığı yaklaşımı seç.",
    quote: "Patron şöyle diyor",
    source: "Kaynak sayfa",
    correct: "Doğru yaklaşımı buldun.",
    wrong: "Bu yaklaşım değil. Doğru yaklaşım aşağıda gösterildi.",
    next: "Sonraki patron",
    finish: "Sonuçları kaydet",
    progress: "patron",
    completed: "10 patronun yaklaşımını değerlendirdin",
    partial: "Kısmi yanıtın kaydedildi",
    completedDetail: "Her doğru yaklaşım 10 puandır. Öğretmen sonuçları açıklayana kadar puanın gizli kalır.",
    locked: "Bu modül tamamlandı",
    lockedDetail: "Yanıtların kilitlendi. Öğretmen sonuçları açıklayana kadar bekleyin.",
    saving: "Yanıt kaydediliyor…",
    saveError: "Yanıt kaydedilemedi. İlerlemen korundu.",
    retry: "Kaydı tekrar dene",
  },
  en: {
    title: "Week 4 · Module 1: Find the Boss’s Approach",
    instruction: "Read the boss’s statement and choose the approach being used.",
    quote: "The boss says",
    source: "Source page",
    correct: "You found the correct approach.",
    wrong: "This is not the approach. The correct approach is shown below.",
    next: "Next boss",
    finish: "Save results",
    progress: "boss",
    completed: "You evaluated 10 bosses’ approaches",
    partial: "Your partial answer was saved",
    completedDetail: "Each correct approach is worth 10 points. Your score stays hidden until the teacher reveals the results.",
    locked: "This module is complete",
    lockedDetail: "Your answers are locked. Wait until the teacher reveals the results.",
    saving: "Saving your answer…",
    saveError: "The answer could not be saved. Your progress is preserved.",
    retry: "Try saving again",
  },
};

function answersFromDraft(draft: ModuleDraft | null | undefined): BossAnswer[] {
  const payload = draft?.payload as DraftPayload | undefined;
  if (!Array.isArray(payload?.answers)) return [];
  return payload.answers.filter((item): item is BossAnswer => {
    if (!item || typeof item !== "object") return false;
    const answer = item as Partial<BossAnswer>;
    return typeof answer.questionId === "string" && typeof answer.selectedOptionId === "string" && typeof answer.correctOptionId === "string" && typeof answer.isCorrect === "boolean";
  });
}

export function Week4BossApproach({
  onSubmit,
  onDraft,
  existingSubmission,
  existingDraft,
  forceSubmit,
  seedKey,
}: LearningModuleProps & { seedKey: string }) {
  const { locale } = useI18n();
  const text = copy[locale];
  const questions = useMemo(() => buildBossApproachRound(seedKey), [seedKey]);
  const hydratedAnswers = useMemo(() => answersFromDraft(existingDraft), [existingDraft]);
  const draftPayload = existingDraft?.payload as DraftPayload | undefined;
  const initialIndex = typeof draftPayload?.currentIndex === "number" ? Math.max(0, Math.min(questions.length - 1, draftPayload.currentIndex)) : Math.min(hydratedAnswers.length, questions.length - 1);
  const [index, setIndex] = useState(initialIndex);
  const [answers, setAnswers] = useState<BossAnswer[]>(hydratedAnswers);
  const [selectedOptionId, setSelectedOptionId] = useState<ApproachId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const submissionStarted = useRef(false);
  const answersRef = useRef(hydratedAnswers);
  const current = questions[index]!;
  const existingAnswer = answers.find((answer) => answer.questionId === current.id);
  const selected = selectedOptionId ?? existingAnswer?.selectedOptionId ?? null;
  const isRevealed = Boolean(selected);

  const submissionFor = useCallback((nextAnswers: BossAnswer[], completionReason: "completed" | "teacher-ended" | "draft", nextIndex = index): ModuleSubmission => {
    const correctCount = nextAnswers.filter((answer) => answer.isCorrect).length;
    return {
      stage: 1,
      score: correctCount * pointsPerQuestion,
      payload: {
        mode: "boss-approach-identification",
        selectedQuestionIds: questions.map((question) => question.id),
        answers: nextAnswers,
        currentIndex: nextIndex,
        reviewingQuestionId: isRevealed ? current.id : null,
        correctCount,
        answeredCount: nextAnswers.length,
        questionCount: questions.length,
        pointsPerQuestion,
        completionReason,
      },
    };
  }, [current.id, index, isRevealed, questions]);

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true);
    setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) setSubmitFailed(true);
  }, [onSubmit]);

  const finalize = useCallback(async (nextAnswers: BossAnswer[], completionReason: "completed" | "teacher-ended") => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true;
    const submission = submissionFor(nextAnswers, completionReason, index);
    setAnswers(nextAnswers);
    setFinalSubmission(submission);
    setCompleted(true);
    await submitResult(submission);
  }, [existingSubmission, index, submissionFor, submitResult]);

  useEffect(() => {
    if (forceSubmit && !completed && !existingSubmission) void finalize(answersRef.current, "teacher-ended");
  }, [completed, existingSubmission, finalize, forceSubmit]);

  const choose = useCallback((optionId: ApproachId) => {
    if (selected || completed || existingSubmission || forceSubmit) return;
    const answer: BossAnswer = {
      questionId: current.id,
      selectedOptionId: optionId,
      correctOptionId: current.approachId,
      isCorrect: optionId === current.approachId,
    };
    const nextAnswers = [...answersRef.current.filter((item) => item.questionId !== current.id), answer];
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    setSelectedOptionId(optionId);
    void onDraft?.(submissionFor(nextAnswers, "draft", index));
  }, [completed, current.approachId, current.id, existingSubmission, forceSubmit, index, onDraft, selected, submissionFor]);

  const next = useCallback(() => {
    if (!selected || completed || existingSubmission || forceSubmit) return;
    if (index === questions.length - 1) {
      void finalize(answersRef.current, "completed");
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setSelectedOptionId(null);
    void onDraft?.(submissionFor(answersRef.current, "draft", nextIndex));
  }, [completed, existingSubmission, finalize, forceSubmit, index, onDraft, questions.length, selected, submissionFor]);

  if (existingSubmission && !completed) {
    return <section className="panel module-shell boss-approach-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  }

  if (completed) {
    return <section className="panel module-shell boss-approach-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><Sparkles size={42} /><h2>{answers.length === questions.length ? text.completed : text.partial}</h2><p>{text.completedDetail}</p>{submitting && <div className="notice">{text.saving}</div>}{submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>{text.retry}</Button></>}</div></section>;
  }

  const correctOption = current.approachId;
  const character = characters[index % characters.length]!;
  return <section className="panel module-shell boss-approach-shell">
    <div className="module-topline"><div className="module-title-chip">{text.title}</div><strong>{index + 1} / {questions.length}</strong></div>
    <div className="boss-approach-progress" aria-label={`${index + 1} / ${questions.length}`}>{questions.map((question, questionIndex) => <span key={question.id} className={questionIndex < answers.length ? "done" : questionIndex === index ? "active" : ""} />)}</div>
    <p className="boss-approach-instruction">{text.instruction}</p>
    <article className="boss-quote-card">
      <div className="boss-character" aria-hidden="true">{character}</div>
      <div><small>{text.quote}</small><blockquote data-i18n-skip>“{current.speech[locale]}”</blockquote><span>{text.source}: {current.sourcePage}</span></div>
    </article>
    <div className="boss-approach-options" aria-label={text.instruction}>
      {current.options.map((optionId) => {
        const isCorrect = optionId === correctOption;
        const isSelected = selected === optionId;
        return <button key={optionId} type="button" disabled={isRevealed} className={`${isRevealed && isCorrect ? "correct" : ""} ${isRevealed && isSelected && !isCorrect ? "wrong" : ""}`} onClick={() => choose(optionId)}>
          {isRevealed && isCorrect ? <Check size={19} /> : isRevealed && isSelected ? <X size={19} /> : <span className="boss-option-marker" />}
          <span data-i18n-skip>{approachLabels[optionId][locale]}</span>
        </button>;
      })}
    </div>
    <div className="boss-feedback" aria-live="polite">
      {isRevealed && <div className={selected === correctOption ? "correct" : "wrong"}><strong>{selected === correctOption ? text.correct : text.wrong}</strong><span data-i18n-skip>{current.explanation[locale]}</span></div>}
    </div>
    {isRevealed && <Button className="boss-next-button" icon={<ArrowRight size={18} />} onClick={next}>{index === questions.length - 1 ? text.finish : text.next}</Button>}
  </section>;
}
