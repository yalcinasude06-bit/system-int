"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowDownToLine, ArrowUpFromLine, Check, Gauge, LockKeyhole, RotateCcw, Sparkles, Wrench, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { BossPortrait } from "@/components/modules/Week4_BossApproach/BossPortrait";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import { buildWeekSixRound, type WeekSixTask, type WeekSixVariant } from "./weekSixContent";

type WeekSixAnswer = { taskId: string; selectedIndex: number; correctIndex: number; isCorrect: boolean };
type DraftPayload = { gameId?: unknown; selectedTaskIds?: unknown; answers?: unknown; currentIndex?: unknown };

const feedbackDuration = 950;
const pointsPerTask = 20;
type SceneLabels = { stock: string; inflow: string; outflow: string; target: string; issue: string; request: string };

const copy = {
  tr: {
    flow: { title: "Hafta 6 · Modül 1: Akış Operasyonu", instruction: "Sistemi incele ve doğru operasyonu seç.", badge: "STOK–AKIŞ OPERASYONU" },
    repair: { title: "Hafta 6 · Modül 2: Simülasyon Tamircisi", instruction: "Modeldeki sorunu teşhis et ve doğru onarımı seç.", badge: "DİJİTAL MODEL LABORATUVARI" },
    agency: { title: "Hafta 6 · Modül 3: Model Ajansı", instruction: "Müşteri talebini oku ve tek bir model aracı seç.", badge: "YENİ MÜŞTERİ BRİFİ" },
    task: "Görev", score: "Puan", stock: "Stok", inflow: "Giriş", outflow: "Çıkış", target: "Hedef", issue: "Model uyarısı", request: "Müşteri talebi",
    correct: "Doğru seçim — sistem güncellendi.", wrong: "Bu seçenek uygun değil. Doğru çözüm yeşille gösterildi.",
    completed: "Beş görev tamamlandı", completedDetail: "Yanıtların kaydedildi. Sonuçlar öğretmenin açıklamasına kadar gizli kalır.", partial: "Açık görev sonlandırıldı", locked: "Bu oynanış tamamlandı", lockedDetail: "Yanıtların daha önce kaydedildi.", saving: "Yanıtlar kaydediliyor…", saveError: "Kayıt tamamlanamadı; ilerlemen korundu.", retry: "Kaydı tekrar dene",
  },
  en: {
    flow: { title: "Week 6 · Module 1: Flow Operation", instruction: "Inspect the system and choose the correct operation.", badge: "STOCK–FLOW OPERATION" },
    repair: { title: "Week 6 · Module 2: Simulation Repair Shop", instruction: "Diagnose the model issue and choose the correct repair.", badge: "DIGITAL MODEL LAB" },
    agency: { title: "Week 6 · Module 3: Model Agency", instruction: "Read the client request and choose one modeling tool.", badge: "NEW CLIENT BRIEF" },
    task: "Task", score: "Score", stock: "Stock", inflow: "Inflow", outflow: "Outflow", target: "Target", issue: "Model alert", request: "Client request",
    correct: "Correct choice — the system was updated.", wrong: "That option does not fit. The correct solution is highlighted in green.",
    completed: "All five tasks are complete", completedDetail: "Your answers were saved. Results stay hidden until your teacher reveals them.", partial: "The open task was ended", locked: "This play is complete", lockedDetail: "Your answers were already recorded.", saving: "Saving answers…", saveError: "The save could not finish; your progress is preserved.", retry: "Try saving again",
  },
} as const;

function validAnswers(draft: ModuleDraft | null | undefined, selectedTaskIds: readonly string[]) {
  const payload = draft?.payload as DraftPayload | undefined;
  if (!Array.isArray(payload?.selectedTaskIds) || payload.selectedTaskIds.some((id, index) => id !== selectedTaskIds[index]) || payload.selectedTaskIds.length !== selectedTaskIds.length || !Array.isArray(payload.answers)) return [];
  const result: WeekSixAnswer[] = [];
  for (const [index, item] of payload.answers.slice(0, 5).entries()) {
    if (!item || typeof item !== "object") break;
    const answer = item as Partial<WeekSixAnswer>;
    if (answer.taskId !== selectedTaskIds[index] || !Number.isInteger(answer.selectedIndex) || !Number.isInteger(answer.correctIndex) || typeof answer.isCorrect !== "boolean") break;
    result.push(answer as WeekSixAnswer);
  }
  return result;
}

function FlowScene({ task, locale, labels }: { task: WeekSixTask; locale: "tr" | "en"; labels: SceneLabels }) {
  const metrics = task.metrics!;
  const fill = Math.max(8, Math.min(96, metrics.stock));
  return <div className="week-six-flow-scene">
    <div className="week-six-factory" aria-hidden="true"><span>🏭</span><i className="belt">📦　📦　📦</i><b>{task.visual}</b></div>
    <div className="week-six-tank" aria-hidden="true"><i style={{ height: `${fill}%` }} /><b>{metrics.stock}</b></div>
    <div className="week-six-metrics">
      <span><Gauge size={15} /><small>{labels.stock}</small><b>{metrics.stock}</b></span>
      <span><ArrowDownToLine size={15} /><small>{labels.inflow}</small><b>{metrics.inflow}</b></span>
      <span><ArrowUpFromLine size={15} /><small>{labels.outflow}</small><b>{metrics.outflow}</b></span>
      <span><Activity size={15} /><small>{labels.target}</small><b>{metrics.target}</b></span>
    </div>
    <div className="week-six-scene-copy"><strong data-i18n-skip>{task.title[locale]}</strong><p data-i18n-skip>{task.detail[locale]}</p></div>
  </div>;
}

function RepairScene({ task, locale, labels }: { task: WeekSixTask; locale: "tr" | "en"; labels: SceneLabels }) {
  return <div className="week-six-repair-scene">
    <div className="week-six-lab-screen"><span><i /> SIM-06</span><div className="week-six-signal" aria-hidden="true">⌁⌁╱╲⌁╱╲⌁</div><b>ERROR</b></div>
    <div className="week-six-repair-copy"><small><Wrench size={14} /> {labels.issue}</small><strong data-i18n-skip>{task.title[locale]}</strong><p data-i18n-skip>{task.detail[locale]}</p></div>
  </div>;
}

function AgencyScene({ task, locale, labels, portraitVariant }: { task: WeekSixTask; locale: "tr" | "en"; labels: SceneLabels; portraitVariant: number }) {
  return <div className="week-six-agency-scene">
    <div className="week-six-client"><BossPortrait variant={portraitVariant} /><span aria-hidden="true">{task.visual}</span></div>
    <div className="week-six-client-brief"><small>{labels.request}</small><strong data-i18n-skip>{task.title[locale]}</strong><blockquote data-i18n-skip>“{task.detail[locale]}”</blockquote></div>
  </div>;
}

function WeekSixModule({ variant, seedKey, onSubmit, onDraft, existingSubmission, existingDraft, forceSubmit }: LearningModuleProps & { variant: WeekSixVariant; seedKey: string }) {
  const { locale } = useI18n();
  const text = copy[locale];
  const variantText = text[variant];
  const tasks = useMemo(() => buildWeekSixRound(variant, seedKey), [seedKey, variant]);
  const selectedTaskIds = useMemo(() => tasks.map((task) => task.id), [tasks]);
  const hydratedAnswers = useMemo(() => validAnswers(existingDraft, selectedTaskIds), [existingDraft, selectedTaskIds]);
  const [index, setIndex] = useState(Math.min(hydratedAnswers.length, 4));
  const [answers, setAnswers] = useState<WeekSixAnswer[]>(hydratedAnswers);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const [completionReason, setCompletionReason] = useState<"completed" | "teacher-ended">("completed");
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const answersRef = useRef(hydratedAnswers);
  const lockedRef = useRef(false);
  const submissionStarted = useRef(false);
  const timerRef = useRef<number | null>(null);
  const current = tasks[index]!;

  const clearTimer = useCallback(() => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); timerRef.current = null; }, []);
  useEffect(() => () => clearTimer(), [clearTimer]);

  const submissionFor = useCallback((nextAnswers: WeekSixAnswer[], reason: "completed" | "teacher-ended" | "draft", nextIndex: number): ModuleSubmission => ({
    stage: 1,
    score: nextAnswers.filter((answer) => answer.isCorrect).length * pointsPerTask,
    payload: { gameId: `week-6-${variant}-v1`, selectedTaskIds, answers: nextAnswers, currentIndex: nextIndex, answeredCount: nextAnswers.length, questionCount: 5, correctCount: nextAnswers.filter((answer) => answer.isCorrect).length, pointsPerTask, completionReason: reason },
  }), [selectedTaskIds, variant]);

  const sendSubmission = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true); setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) setSubmitFailed(true);
  }, [onSubmit]);

  const finalize = useCallback((nextAnswers: WeekSixAnswer[], reason: "completed" | "teacher-ended") => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true; lockedRef.current = true; clearTimer();
    const submission = submissionFor(nextAnswers, reason, Math.min(nextAnswers.length, 4));
    setAnswers(nextAnswers); setCompletionReason(reason); setFinalSubmission(submission); setCompleted(true);
    void sendSubmission(submission);
  }, [clearTimer, existingSubmission, sendSubmission, submissionFor]);

  useEffect(() => {
    if (hydratedAnswers.length === 5 && !existingSubmission && !completed) finalize(hydratedAnswers, "completed");
  }, [completed, existingSubmission, finalize, hydratedAnswers]);

  useEffect(() => { if (forceSubmit && !completed && !existingSubmission) finalize(answersRef.current, "teacher-ended"); }, [completed, existingSubmission, finalize, forceSubmit]);

  const choose = (optionIndex: number) => {
    if (lockedRef.current || selectedIndex !== null || completed || forceSubmit || existingSubmission) return;
    lockedRef.current = true;
    const answer: WeekSixAnswer = { taskId: current.id, selectedIndex: optionIndex, correctIndex: current.correctIndex, isCorrect: optionIndex === current.correctIndex };
    const nextAnswers = [...answersRef.current, answer];
    answersRef.current = nextAnswers; setAnswers(nextAnswers); setSelectedIndex(optionIndex);
    const nextIndex = Math.min(index + 1, 4);
    void onDraft?.(submissionFor(nextAnswers, "draft", nextIndex));
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      if (index === 4) { finalize(nextAnswers, "completed"); return; }
      setIndex(nextIndex); setSelectedIndex(null); lockedRef.current = false;
    }, feedbackDuration);
  };

  if (existingSubmission && !completed) return <section className={`panel module-shell week-six-shell ${variant}`}><div className="module-title-chip">{variantText.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  if (completed) return <section className={`panel module-shell week-six-shell ${variant}`}><div className="module-title-chip">{variantText.title}</div><div className="module-complete-card"><Sparkles size={42} /><h2>{completionReason === "completed" ? text.completed : text.partial}</h2><p>{text.completedDetail}</p>{submitting && <div className="notice">{text.saving}</div>}{submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void sendSubmission(finalSubmission)}>{text.retry}</Button></>}</div></section>;

  const score = answers.filter((answer) => answer.isCorrect).length * pointsPerTask;
  return <section className={`panel module-shell week-six-shell ${variant}`}>
    <header className="week-six-hud"><div><span className="module-title-chip">{variantText.title}</span><small>{variantText.badge}</small></div><div><span>{text.task} <b>{index + 1}/5</b></span><span>{text.score} <b>{score}</b></span></div></header>
    <div className="week-six-progress" aria-label={`${text.task} ${index + 1}/5`}>{tasks.map((task, taskIndex) => <i key={task.id} className={taskIndex < answers.length ? "done" : taskIndex === index ? "active" : ""} />)}</div>
    <p className="week-six-instruction">{variantText.instruction}</p>
    <div key={current.id} className="week-six-stage">
      {variant === "flow" ? <FlowScene task={current} locale={locale} labels={text} /> : variant === "repair" ? <RepairScene task={current} locale={locale} labels={text} /> : <AgencyScene task={current} locale={locale} labels={text} portraitVariant={index + current.id.charCodeAt(3)} />}
      <h2 data-i18n-skip>{current.prompt[locale]}</h2>
      <div className="week-six-options">
        {current.options.map((option, optionIndex) => {
          const revealed = selectedIndex !== null;
          const correct = optionIndex === current.correctIndex;
          const selected = optionIndex === selectedIndex;
          return <button key={`${current.id}:${optionIndex}`} type="button" disabled={revealed} className={`${revealed && correct ? "correct" : ""} ${revealed && selected && !correct ? "wrong" : ""}`} onClick={() => choose(optionIndex)}>
            <span>{revealed && correct ? <Check size={18} /> : revealed && selected ? <X size={18} /> : String.fromCharCode(65 + optionIndex)}</span><b data-i18n-skip>{option[locale]}</b>
          </button>;
        })}
      </div>
      <div className="week-six-feedback" aria-live="polite">{selectedIndex !== null && <div className={selectedIndex === current.correctIndex ? "correct" : "wrong"}>{selectedIndex === current.correctIndex ? text.correct : text.wrong}</div>}</div>
    </div>
  </section>;
}

export function Week6FlowOperation(props: LearningModuleProps & { seedKey: string }) { return <WeekSixModule {...props} variant="flow" />; }
export function Week6SimulationRepair(props: LearningModuleProps & { seedKey: string }) { return <WeekSixModule {...props} variant="repair" />; }
export function Week6ModelAgency(props: LearningModuleProps & { seedKey: string }) { return <WeekSixModule {...props} variant="agency" />; }
