"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Calculator, Check, GitBranch, LockKeyhole, RotateCcw, Sparkles, Waves, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { BossPortrait } from "@/components/modules/Week4_BossApproach/BossPortrait";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import { buildModelAgencyRound, modelAgencyProjects, modelTypeLabels, modelTypes, type ModelType } from "./modelAgencyContent";

type AgencyAnswer = { projectId: string; selectedModelType: ModelType };
type DraftPayload = { gameId?: unknown; selectedProjectIds?: unknown; responses?: unknown; currentIndex?: unknown };
const currentGameId = "week-6-model-agency-v2";
const feedbackDuration = 1000;

const copy = {
  tr: { title: "HAFTA 6 · MODÜL 3", project: "Proje", score: "Puan", prompt: "Hangi model aracını kullanacaksın?", correct: "Harika seçim!", wrong: "Bu projeye başka bir araç daha uygun.", completed: "Ajans portföyü tamamlandı", partial: "Kısmi portföyün kaydedildi", detail: "Her doğru model seçimi 10 puandır. Sonuç öğretmen açıklayana kadar gizli kalır.", locked: "Bu proje turu tamamlandı", lockedDetail: "Yanıtların kilitlendi. Öğretmenin sonuçları açıklamasını bekle.", saving: "Portföy kaydediliyor…", saveError: "Portföy kaydedilemedi. İlerlemen korundu.", retry: "Tekrar kaydet" },
  en: { title: "WEEK 6 · MODULE 3", project: "Project", score: "Score", prompt: "Which modelling tool will you use?", correct: "Great choice!", wrong: "A different tool fits this project better.", completed: "Agency portfolio complete", partial: "Your partial portfolio was saved", detail: "Each correct model choice is worth 10 points. Your result stays hidden until the teacher reveals it.", locked: "This project round is complete", lockedDetail: "Your responses are locked. Wait for the teacher to reveal the results.", saving: "Saving portfolio…", saveError: "The portfolio could not be saved. Your progress is preserved.", retry: "Save again" },
} as const;

const icons = { physical: Box, analog: Waves, schematic: GitBranch, mathematical: Calculator } as const;

function restoredAnswers(draft: ModuleDraft | null | undefined, projectIds: string[], gameId: string) {
  const payload = draft?.payload as DraftPayload | undefined;
  if (payload?.gameId !== gameId || !Array.isArray(payload.selectedProjectIds) || payload.selectedProjectIds.join("|") !== projectIds.join("|") || !Array.isArray(payload.responses)) return [];
  const answers: AgencyAnswer[] = [];
  for (const item of payload.responses) {
    if (!item || typeof item !== "object") break;
    const answer = item as Partial<AgencyAnswer>;
    if (answer.projectId !== projectIds[answers.length] || !modelTypes.includes(answer.selectedModelType as ModelType)) break;
    answers.push({ projectId: answer.projectId, selectedModelType: answer.selectedModelType as ModelType });
  }
  return answers;
}

export function Week6ModelAgency({ onSubmit, onDraft, existingSubmission, existingDraft, forceSubmit, seedKey }: LearningModuleProps & { seedKey: string }) {
  const { locale } = useI18n();
  const text = copy[locale];
  const draftPayload = existingDraft?.payload as DraftPayload | undefined;
  const legacyIds = useMemo(() => draftPayload?.gameId === "week-6-model-agency-v1" && Array.isArray(draftPayload.selectedProjectIds) && draftPayload.selectedProjectIds.length === 5
    ? draftPayload.selectedProjectIds.filter((id): id is string => typeof id === "string")
    : [], [draftPayload]);
  const projects = useMemo(() => legacyIds.length === 5
    ? legacyIds.map((id) => modelAgencyProjects.find((project) => project.id === id)).filter((project): project is (typeof modelAgencyProjects)[number] => Boolean(project))
    : buildModelAgencyRound(seedKey), [legacyIds, seedKey]);
  const gameId = projects.length === 5 ? "week-6-model-agency-v1" : currentGameId;
  const pointsPerProject = projects.length === 5 ? 20 : 10;
  const projectIds = useMemo(() => projects.map((project) => project.id), [projects]);
  const hydrated = useMemo(() => restoredAnswers(existingDraft, projectIds, gameId), [existingDraft, gameId, projectIds]);
  const payload = draftPayload;
  const restoredIndex = payload?.gameId === gameId && typeof payload.currentIndex === "number" ? payload.currentIndex : hydrated.length;
  const [index, setIndex] = useState(Math.max(0, Math.min(projects.length - 1, restoredIndex)));
  const [answers, setAnswers] = useState<AgencyAnswer[]>(hydrated);
  const [selected, setSelected] = useState<ModelType | null>(null);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const answersRef = useRef(hydrated);
  const lockedRef = useRef(false);
  const submissionStarted = useRef(false);
  const timerRef = useRef<number | null>(null);
  const current = projects[index]!;
  const currentAnswer = answers.find((answer) => answer.projectId === current.id);
  const visibleSelection = selected ?? currentAnswer?.selectedModelType ?? null;
  const correctCount = answers.filter((answer) => projects.find((project) => project.id === answer.projectId)?.modelType === answer.selectedModelType).length;

  const clearTimer = useCallback(() => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); timerRef.current = null; }, []);
  useEffect(() => clearTimer, [clearTimer]);

  const submissionFor = useCallback((responses: AgencyAnswer[], completionReason: "draft" | "completed" | "teacher-ended", currentIndex: number): ModuleSubmission => ({
    stage: 1,
    score: responses.filter((answer) => projects.find((project) => project.id === answer.projectId)?.modelType === answer.selectedModelType).length * pointsPerProject,
    payload: { gameId, selectedProjectIds: projectIds, responses, currentIndex, answeredCount: responses.length, projectCount: projects.length, pointsPerProject, completionReason },
  }), [gameId, pointsPerProject, projectIds, projects]);

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true); setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) setSubmitFailed(true);
  }, [onSubmit]);

  const finalize = useCallback(async (responses: AgencyAnswer[], reason: "completed" | "teacher-ended") => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true; lockedRef.current = true; clearTimer();
    const submission = submissionFor(responses, reason, index);
    setAnswers(responses); setFinalSubmission(submission); setCompleted(true);
    await submitResult(submission);
  }, [clearTimer, existingSubmission, index, submissionFor, submitResult]);

  const advance = useCallback(() => {
    if (completed || existingSubmission || forceSubmit || submissionStarted.current) return;
    clearTimer();
    if (index === projects.length - 1) { void finalize(answersRef.current, "completed"); return; }
    const nextIndex = index + 1;
    setIndex(nextIndex); setSelected(null); lockedRef.current = false;
    void onDraft?.(submissionFor(answersRef.current, "draft", nextIndex));
  }, [clearTimer, completed, existingSubmission, finalize, forceSubmit, index, onDraft, projects.length, submissionFor]);

  useEffect(() => {
    if (!visibleSelection || completed || existingSubmission || forceSubmit) return;
    lockedRef.current = true; clearTimer(); timerRef.current = window.setTimeout(advance, feedbackDuration);
    return clearTimer;
  }, [advance, clearTimer, completed, existingSubmission, forceSubmit, visibleSelection]);

  useEffect(() => { if (forceSubmit && !completed && !existingSubmission) void finalize(answersRef.current, "teacher-ended"); }, [completed, existingSubmission, finalize, forceSubmit]);

  const choose = useCallback((modelType: ModelType) => {
    if (lockedRef.current || visibleSelection || completed || existingSubmission || forceSubmit) return;
    lockedRef.current = true;
    const answer = { projectId: current.id, selectedModelType: modelType };
    const nextAnswers = [...answersRef.current.filter((item) => item.projectId !== current.id), answer];
    answersRef.current = nextAnswers; setAnswers(nextAnswers); setSelected(modelType);
    void onDraft?.(submissionFor(nextAnswers, "draft", index));
  }, [completed, current.id, existingSubmission, forceSubmit, index, onDraft, submissionFor, visibleSelection]);

  if (existingSubmission && !completed) return <section className="panel module-shell model-agency-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  if (completed) return <section className="panel module-shell model-agency-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><Sparkles size={42} /><h2>{answers.length === projects.length ? text.completed : text.partial}</h2><p>{text.detail}</p>{submitting && <div className="notice">{text.saving}</div>}{submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>{text.retry}</Button></>}</div></section>;

  return <section className="panel module-shell model-agency-shell">
    <header className="model-agency-header"><div className="module-title-chip">{text.title}</div><div><span>{text.project} <b>{index + 1}/{projects.length}</b></span><span>{text.score} <b>{correctCount * pointsPerProject}</b></span></div></header>
    <div className="model-agency-progress" aria-label={`${text.project} ${index + 1} / ${projects.length}`}>{projects.map((project, projectIndex) => <i key={project.id} className={projectIndex < answers.length ? "done" : projectIndex === index ? "active" : ""} />)}</div>
    <article key={current.id} className="model-agency-brief">
      <div className="model-agency-portrait" style={{ "--portrait-hue": `${(current.id.charCodeAt(0) * 7 + Number(current.id.slice(1)) * 23) % 360}deg` } as React.CSSProperties}><BossPortrait variant={current.portrait} /><span aria-hidden="true">{current.badge}</span></div>
      <div><span className="model-agency-client">{current.role[locale].replace(/(^|\s)(\p{L})/gu, (value) => value.toLocaleUpperCase(locale === "tr" ? "tr-TR" : "en-US"))}</span><blockquote data-i18n-skip>“{current.request[locale]}”</blockquote></div>
    </article>
    <h2 className="model-agency-question">{text.prompt}</h2>
    <div className="model-agency-options">
      {modelTypes.map((modelType) => { const Icon = icons[modelType]; const correct = modelType === current.modelType; const chosen = modelType === visibleSelection; return <button key={modelType} type="button" disabled={Boolean(visibleSelection)} className={`${visibleSelection && correct ? "correct" : ""} ${visibleSelection && chosen && !correct ? "wrong" : ""}`} onClick={() => choose(modelType)}>{visibleSelection && correct ? <Check aria-hidden="true" /> : visibleSelection && chosen ? <X aria-hidden="true" /> : <Icon aria-hidden="true" />}<span>{modelTypeLabels[modelType][locale]}</span></button>; })}
    </div>
    <div className="model-agency-feedback" aria-live="polite">{visibleSelection && <div className={visibleSelection === current.modelType ? "correct" : "wrong"}>{visibleSelection === current.modelType ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}<strong>{visibleSelection === current.modelType ? text.correct : text.wrong}</strong>{visibleSelection !== current.modelType && <span>{modelTypeLabels[current.modelType][locale]}</span>}</div>}</div>
  </section>;
}
