"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { AlarmClock, Check, Crosshair, Eye, LockKeyhole, RotateCcw, Sparkles, Target, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleSubmission } from "@/types";
import {
  HUNTER_LEVEL_DURATION_MS,
  HUNTER_TASK_TRANSITION_MS,
  HUNTER_TASK_WINDOW_MS,
  arcadeScoreFor,
  buildProblemHunterRound,
  normalizedHunterScore,
  taskForLevelTime,
  type HunterAction,
  type HunterOutcome,
  type ScheduledTarget,
  type TargetCategory,
} from "./problemHunterContent";

type HunterDraftPayload = {
  actions?: unknown;
  levelIndex?: unknown;
  levelElapsedMs?: unknown;
  selectedTargetIds?: unknown;
  taskTransitionIndex?: unknown;
  taskTransitionRemainingMs?: unknown;
};

type Feedback = { outcome: HunterOutcome; target: ScheduledTarget };

const copy = {
  tr: {
    title: "Hafta 5 · Modül 2: Sorun Avcısı",
    mission: "ŞU ANKİ GÖREVİN — ÖNCE BURAYI OKU",
    catchEvent: "OLAYI YAKALA!",
    catchPattern: "ÖRÜNTÜYÜ YAKALA!",
    catchStructure: "YAPIYI YAKALA!",
    taskChanged: "GÖREV DEĞİŞTİ!",
    eventDefinition: "Belirli bir anda gerçekleşen tekil sonucu bul.",
    patternDefinition: "Zaman içinde tekrar eden eğilim veya davranışı bul.",
    structureDefinition: "Sonuçları üretebilen kural, ilişki veya süreci bul.",
    level: "Seviye",
    time: "Kalan süre",
    seconds: "sn",
    slow: "Tek hedef · okunabilir tempo",
    medium: "İki hedef · orta tempo",
    shifting: "Değişen görev · hızlı tempo",
    waiting: "Yeni hedef bekleniyor…",
    correct: "Doğru",
    wrong: "Bu örnek",
    missed: "Kaçtı",
    event: "Olay",
    pattern: "Davranış örüntüsü",
    structure: "Sistem yapısı",
    completed: "Sorun avı tamamlandı",
    partial: "Oyun öğretmen tarafından sonlandırıldı",
    completedDetail: "Olay, örüntü ve sistem yapısını ayıran seçimlerin kaydedildi.",
    categorySummary: "Kategori özeti",
    categoryCorrect: "doğru",
    categoryWrong: "yanlış",
    categoryMissed: "kaçan",
    saving: "Sonuç kaydediliyor…",
    saveError: "Sonuç kaydedilemedi. İlerlemen korunuyor.",
    retry: "Kaydı tekrar dene",
    locked: "Bu oynanış tamamlandı",
    lockedDetail: "Sonucun bir kez kaydedildi. Öğretmenin sonraki yönlendirmesini bekle.",
    paused: "Sekme arka plandayken oyun duraklatıldı",
  },
  en: {
    title: "Week 5 · Module 2: Problem Hunter",
    mission: "YOUR CURRENT MISSION — READ THIS FIRST",
    catchEvent: "CATCH THE EVENT!",
    catchPattern: "CATCH THE PATTERN!",
    catchStructure: "CATCH THE STRUCTURE!",
    taskChanged: "MISSION CHANGED!",
    eventDefinition: "Find a single outcome that happened at a specific time.",
    patternDefinition: "Find a trend or behavior that repeats over time.",
    structureDefinition: "Find a rule, relationship, or process that can produce outcomes.",
    level: "Level",
    time: "Time left",
    seconds: "sec",
    slow: "One target · readable pace",
    medium: "Two targets · medium pace",
    shifting: "Shifting mission · fast pace",
    waiting: "Waiting for a new target…",
    correct: "Correct",
    wrong: "This example is",
    missed: "Missed",
    event: "Event",
    pattern: "Behavior pattern",
    structure: "System structure",
    completed: "Problem hunt complete",
    partial: "The teacher ended the game",
    completedDetail: "Your choices distinguishing events, patterns, and system structures were saved.",
    categorySummary: "Category summary",
    categoryCorrect: "correct",
    categoryWrong: "wrong",
    categoryMissed: "missed",
    saving: "Saving result…",
    saveError: "The result could not be saved. Your progress is preserved.",
    retry: "Try saving again",
    locked: "This play is complete",
    lockedDetail: "Your result was recorded once. Wait for your teacher's next instruction.",
    paused: "The game pauses while this tab is in the background",
  },
} as const;

const categories: TargetCategory[] = ["event", "pattern", "structure"];

function hydrateActions(payload: HunterDraftPayload | undefined, schedule: ScheduledTarget[]): HunterAction[] {
  if (!Array.isArray(payload?.actions)) return [];
  const targets = new Map(schedule.map((target) => [target.id, target]));
  const seen = new Set<string>();
  return payload.actions.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const value = candidate as Partial<HunterAction>;
    const target = typeof value.targetId === "string" ? targets.get(value.targetId) : null;
    if (!target || seen.has(target.id)) return [];
    if (value.outcome !== "correct" && value.outcome !== "wrong" && value.outcome !== "miss" && value.outcome !== "ignored") return [];
    seen.add(target.id);
    const outcome = value.outcome;
    const points = outcome === "correct" ? 10 : outcome === "wrong" ? -5 : outcome === "miss" ? -2 : 0;
    return [{
      targetId: target.id,
      level: target.level,
      task: target.task,
      category: target.category,
      outcome,
      points,
      atMs: typeof value.atMs === "number" ? Math.max(0, value.atMs) : target.spawnAtMs + target.durationMs,
    }];
  });
}

function categoryStats(actions: readonly HunterAction[], category: TargetCategory) {
  const relevant = actions.filter((action) => action.category === category && action.outcome !== "ignored");
  return {
    correct: relevant.filter((action) => action.outcome === "correct").length,
    wrong: relevant.filter((action) => action.outcome === "wrong").length,
    missed: relevant.filter((action) => action.outcome === "miss").length,
  };
}

export function Week5ProblemHunter({
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
  const schedule = useMemo(() => buildProblemHunterRound(seedKey), [seedKey]);
  const draftPayload = existingDraft?.payload as HunterDraftPayload | undefined;
  const initialActions = useMemo(() => hydrateActions(draftPayload, schedule), [draftPayload, schedule]);
  const initialLevel = typeof draftPayload?.levelIndex === "number" ? Math.max(0, Math.min(2, Math.floor(draftPayload.levelIndex))) : 0;
  const initialElapsed = typeof draftPayload?.levelElapsedMs === "number" ? Math.max(0, Math.min(HUNTER_LEVEL_DURATION_MS - 1, draftPayload.levelElapsedMs)) : 0;
  const restoredTransitionIndex = typeof draftPayload?.taskTransitionIndex === "number" ? Math.max(-1, Math.min(3, Math.floor(draftPayload.taskTransitionIndex))) : null;
  const initialTransitionRemaining = typeof draftPayload?.taskTransitionRemainingMs === "number" ? Math.max(0, Math.min(HUNTER_TASK_TRANSITION_MS, draftPayload.taskTransitionRemainingMs)) : 0;

  const [actions, setActions] = useState<HunterAction[]>(initialActions);
  const [levelIndex, setLevelIndex] = useState(initialLevel);
  const [elapsedMs, setElapsedMs] = useState(initialElapsed);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [completed, setCompleted] = useState(false);
  const [completionReason, setCompletionReason] = useState<"completed" | "teacher-ended">("completed");
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [transitionRemainingMs, setTransitionRemainingMs] = useState(initialTransitionRemaining);

  const actionsRef = useRef(initialActions);
  const resolvedIds = useRef(new Set(initialActions.map((action) => action.targetId)));
  const levelRef = useRef(initialLevel);
  const elapsedRef = useRef(initialElapsed);
  const completedRef = useRef(false);
  const submissionStarted = useRef(false);
  const lastTick = useRef<number | null>(null);
  const transitionRemainingRef = useRef(initialTransitionRemaining);
  const announcedTaskIndex = useRef(restoredTransitionIndex ?? (initialLevel === 2 && initialElapsed === 0 ? -1 : Math.floor(initialElapsed / HUNTER_TASK_WINDOW_MS)));
  const draftCheckpoint = useRef(Math.floor(initialElapsed / 5_000));

  const submissionFor = useCallback((nextActions: HunterAction[], reason: "completed" | "teacher-ended" | "draft", nextLevel = levelRef.current, nextElapsed = elapsedRef.current): ModuleSubmission => ({
    stage: Math.min(3, nextLevel + 1),
    score: normalizedHunterScore(nextActions),
    payload: {
      mode: "problem-hunter-arcade",
      gameId: "week-5-problem-hunter-v1",
      seedKey,
      selectedTargetIds: schedule.map((target) => target.id),
      offeredTargets: schedule.map((target) => ({ id: target.id, level: target.level, task: target.task, category: target.category, hole: target.hole, spawnAtMs: target.spawnAtMs, durationMs: target.durationMs })),
      actions: nextActions,
      levelIndex: nextLevel,
      levelElapsedMs: Math.round(nextElapsed),
      taskTransitionIndex: announcedTaskIndex.current,
      taskTransitionRemainingMs: Math.round(transitionRemainingRef.current),
      arcadeScore: arcadeScoreFor(nextActions),
      normalizedScore: normalizedHunterScore(nextActions),
      correctCount: nextActions.filter((action) => action.outcome === "correct").length,
      wrongCount: nextActions.filter((action) => action.outcome === "wrong").length,
      missedCount: nextActions.filter((action) => action.outcome === "miss").length,
      answeredCount: nextActions.filter((action) => action.outcome !== "ignored").length,
      targetCount: schedule.length,
      categoryStats: Object.fromEntries(categories.map((category) => [category, categoryStats(nextActions, category)])),
      completionReason: reason,
      completionStatus: reason === "completed" ? "completed" : reason === "teacher-ended" ? "incomplete" : "draft",
    },
  }), [schedule, seedKey]);

  const saveDraft = useCallback((nextActions: HunterAction[], nextLevel = levelRef.current, nextElapsed = elapsedRef.current) => {
    void onDraft?.(submissionFor(nextActions, "draft", nextLevel, nextElapsed));
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

  const finalize = useCallback((reason: "completed" | "teacher-ended", nextActions = actionsRef.current) => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true;
    completedRef.current = true;
    setCompletionReason(reason);
    setCompleted(true);
    const submission = submissionFor(nextActions, reason);
    setFinalSubmission(submission);
    void submitResult(submission);
  }, [existingSubmission, submissionFor, submitResult]);

  const recordActions = useCallback((newActions: HunterAction[], nextElapsed = elapsedRef.current) => {
    if (!newActions.length) return;
    newActions.forEach((action) => resolvedIds.current.add(action.targetId));
    const nextActions = [...actionsRef.current, ...newActions];
    actionsRef.current = nextActions;
    setActions(nextActions);
    saveDraft(nextActions, levelRef.current, nextElapsed);
  }, [saveDraft]);

  const advanceLevel = useCallback(() => {
    if (completedRef.current) return;
    if (levelRef.current >= 2) {
      finalize("completed");
      return;
    }
    const nextLevel = levelRef.current + 1;
    levelRef.current = nextLevel;
    elapsedRef.current = 0;
    setLevelIndex(nextLevel);
    setElapsedMs(0);
    setFeedback(null);
    transitionRemainingRef.current = 0;
    setTransitionRemainingMs(0);
    announcedTaskIndex.current = nextLevel === 2 ? -1 : 0;
    draftCheckpoint.current = 0;
    saveDraft(actionsRef.current, nextLevel, 0);
    lastTick.current = performance.now();
  }, [finalize, saveDraft]);

  const hitTarget = useCallback((target: ScheduledTarget) => {
    if (completedRef.current || resolvedIds.current.has(target.id) || forceSubmit || transitionRemainingRef.current > 0) return;
    const now = elapsedRef.current;
    if (now < target.spawnAtMs || now >= target.spawnAtMs + target.durationMs) return;
    const task = taskForLevelTime(levelRef.current, now);
    const outcome: HunterOutcome = target.category === task ? "correct" : "wrong";
    const action: HunterAction = { targetId: target.id, level: levelRef.current, task, category: target.category, outcome, points: outcome === "correct" ? 10 : -5, atMs: now };
    resolvedIds.current.add(target.id);
    setFeedback({ outcome, target });
    recordActions([action], now);
  }, [forceSubmit, recordActions]);

  useEffect(() => {
    if (completed || existingSubmission || forceSubmit) return;
    const tick = () => {
      if (document.hidden || completedRef.current) {
        lastTick.current = performance.now();
        return;
      }
      const now = performance.now();
      const previous = lastTick.current ?? now;
      lastTick.current = now;
      const activeLevel = levelRef.current;
      const tickDelta = Math.min(250, now - previous);
      if (activeLevel === 2) {
        const taskIndex = Math.min(3, Math.floor(elapsedRef.current / HUNTER_TASK_WINDOW_MS));
        if (announcedTaskIndex.current < taskIndex) {
          announcedTaskIndex.current = taskIndex;
          transitionRemainingRef.current = HUNTER_TASK_TRANSITION_MS;
          setTransitionRemainingMs(HUNTER_TASK_TRANSITION_MS);
          setFeedback(null);
          saveDraft(actionsRef.current, activeLevel, elapsedRef.current);
        }
        if (transitionRemainingRef.current > 0) {
          const remaining = Math.max(0, transitionRemainingRef.current - tickDelta);
          transitionRemainingRef.current = remaining;
          setTransitionRemainingMs(remaining);
          return;
        }
      }
      const nextElapsed = Math.min(HUNTER_LEVEL_DURATION_MS, elapsedRef.current + tickDelta);
      elapsedRef.current = nextElapsed;
      setElapsedMs(nextElapsed);
      const nextCheckpoint = Math.floor(nextElapsed / 5_000);
      if (nextCheckpoint > draftCheckpoint.current) {
        draftCheckpoint.current = nextCheckpoint;
        saveDraft(actionsRef.current, activeLevel, nextElapsed);
      }
      const expired = schedule
        .filter((target) => target.level === activeLevel && !resolvedIds.current.has(target.id) && nextElapsed >= target.spawnAtMs + target.durationMs)
        .map((target): HunterAction => ({
          targetId: target.id,
          level: activeLevel,
          task: target.task,
          category: target.category,
          outcome: target.category === target.task ? "miss" : "ignored",
          points: target.category === target.task ? -2 : 0,
          atMs: target.spawnAtMs + target.durationMs,
        }));
      if (expired.length) {
        recordActions(expired, nextElapsed);
        const missed = expired.find((action) => action.outcome === "miss");
        if (missed) {
          const target = schedule.find((candidate) => candidate.id === missed.targetId);
          if (target) setFeedback({ outcome: "miss", target });
        }
      }
      if (nextElapsed >= HUNTER_LEVEL_DURATION_MS && levelRef.current === activeLevel) advanceLevel();
    };
    lastTick.current = performance.now();
    const timer = window.setInterval(tick, reduceMotion ? 120 : 60);
    return () => window.clearInterval(timer);
  }, [advanceLevel, completed, existingSubmission, forceSubmit, recordActions, reduceMotion, saveDraft, schedule]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const hidden = document.hidden;
      setIsHidden(hidden);
      lastTick.current = performance.now();
      saveDraft(actionsRef.current);
    };
    const onPageHide = () => saveDraft(actionsRef.current);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [saveDraft]);

  useEffect(() => {
    if (forceSubmit && !completedRef.current && !existingSubmission) finalize("teacher-ended");
  }, [existingSubmission, finalize, forceSubmit]);

  if (existingSubmission && !completed) {
    return <section className="panel module-shell problem-hunter-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  }

  const statRows = categories.map((category) => ({ category, ...categoryStats(actions, category) }));
  if (completed) {
    return <section className="panel module-shell problem-hunter-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card hunter-complete"><Sparkles size={44} /><h2>{completionReason === "completed" ? text.completed : text.partial}</h2><p>{text.completedDetail}</p><div className="hunter-summary" aria-label={text.categorySummary}>{statRows.map((row) => <div key={row.category}><strong>{text[row.category]}</strong><small>{row.category === "event" ? text.eventDefinition : row.category === "pattern" ? text.patternDefinition : text.structureDefinition}</small><span className="correct">{row.correct} {text.categoryCorrect}</span><span>{row.wrong} {text.categoryWrong}</span><span>{row.missed} {text.categoryMissed}</span></div>)}</div>{submitting && <div className="notice">{text.saving}</div>}{submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => { if (submissionStarted.current) return; submissionStarted.current = true; void submitResult(finalSubmission); }}>{text.retry}</Button></>}</div></section>;
  }

  const currentTask = taskForLevelTime(levelIndex, elapsedMs);
  const changingTask = levelIndex === 2 && transitionRemainingMs > 0;
  const resolvedTargetIds = new Set(actions.map((action) => action.targetId));
  const activeTargets = changingTask ? [] : schedule.filter((target) => target.level === levelIndex && !resolvedTargetIds.has(target.id) && elapsedMs >= target.spawnAtMs && elapsedMs < target.spawnAtMs + target.durationMs);
  const targetByHole = new Map(activeTargets.map((target) => [target.hole, target]));
  const secondsLeft = Math.max(0, Math.ceil((HUNTER_LEVEL_DURATION_MS - elapsedMs) / 1000));
  const missionLabel = currentTask === "event" ? text.catchEvent : currentTask === "pattern" ? text.catchPattern : text.catchStructure;
  const missionDefinition = currentTask === "event" ? text.eventDefinition : currentTask === "pattern" ? text.patternDefinition : text.structureDefinition;
  const levelDescription = [text.slow, text.medium, text.shifting][levelIndex];

  return <section className="panel module-shell problem-hunter-shell">
    <div className="hunter-topline"><div className="module-title-chip">{text.title}</div><span>{text.level} {levelIndex + 1}/3 · {levelDescription}</span></div>
    <div className={`hunter-mission ${currentTask} ${changingTask ? "changing" : ""}`}>
      <div className="hunter-mission-kicker"><Crosshair size={20} /><span>{changingTask ? text.taskChanged : text.mission}</span></div>
      <strong>{missionLabel}</strong>
      <p>{missionDefinition}</p>
    </div>
    <div className="hunter-timer" aria-label={`${text.time}: ${secondsLeft} ${text.seconds}`}>
      <div><AlarmClock size={18} /><span>{text.time}</span><strong>{secondsLeft} {text.seconds}</strong></div>
    </div>
    <div className={`hunter-board level-${levelIndex + 1}`} aria-label={missionLabel}>
      {Array.from({ length: 6 }, (_, hole) => {
        const target = targetByHole.get(hole);
        return <div className={`hunter-hole ${target ? "occupied" : ""}`} key={hole}>
          <span className="hunter-hole-shadow" />
          {target && <button type="button" className={`hunter-target ${target.category}`} onClick={() => hitTarget(target)} aria-label={`${target.text[locale]}. ${text[target.category]}`}>
            <span aria-hidden="true">{target.icon}</span>
            <b data-i18n-skip>{target.text[locale]}</b>
          </button>}
        </div>;
      })}
      {!activeTargets.length && !changingTask && <div className="hunter-waiting"><Eye size={18} />{text.waiting}</div>}
      {isHidden && <div className="hunter-paused">{text.paused}</div>}
    </div>
    <div className={`hunter-feedback ${feedback?.outcome ?? "idle"}`} aria-live="polite">
      {!feedback ? <><Target size={18} /><span>{missionDefinition}</span></> : feedback.outcome === "correct" ? <><Check size={19} /><span><strong>{text.correct}:</strong> <i data-i18n-skip>{feedback.target.text[locale]}</i> — {text[feedback.target.category]}</span></> : feedback.outcome === "wrong" ? <><X size={19} /><span><strong>✕ {text.wrong}</strong> {text[feedback.target.category].toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US")}</span></> : <><X size={19} /><span><strong>{text.missed}:</strong> <i data-i18n-skip>{feedback.target.text[locale]}</i> — {text[feedback.target.category]}</span></>}
    </div>
  </section>;
}
