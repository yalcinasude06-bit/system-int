"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { AlarmClock, Check, Crosshair, Eye, HelpCircle, LockKeyhole, Play, RotateCcw, Target, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleSubmission } from "@/types";
import {
  HUNTER_LEVEL_DURATION_MS,
  HUNTER_CORRECT_POINTS,
  HUNTER_TASK_TRANSITION_MS,
  HUNTER_TASK_WINDOW_MS,
  arcadeScoreFor,
  buildProblemHunterRound,
  isHunterLevelComplete,
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
type TutorialState = "checking" | "open" | "closed";
type TutorialChoice = TargetCategory | null;

const copy = {
  tr: {
    title: "Hafta 5 · Modül 2: Sorun Avcısı",
    mission: "ŞU ANDA NEYİ YAKALAMALISIN?",
    catchEvent: "OLAYI YAKALA!",
    catchPattern: "ÖRÜNTÜYÜ YAKALA!",
    catchStructure: "YAPIYI YAKALA!",
    taskChanged: "GÖREV DEĞİŞTİ!",
    eventDefinition: "Tek bir anda olan olayı anlatan cümleyi bul.",
    patternDefinition: "Zaman içinde tekrarlanan veya değişen durumu bul.",
    structureDefinition: "Kuralı, planlama açığını veya birimler arası ilişkiyi bul.",
    eventExample: "Örnek: Bugün makine durdu.",
    patternExample: "Örnek: Arızalar her ay artıyor.",
    structureExample: "“Bakım planı yok.” → Bu, arızaların tekrarlanmasına yol açabilecek bir sistem eksikliğidir.",
    level: "Seviye",
    time: "Kalan süre",
    seconds: "sn",
    slow: "En fazla iki hedef · okunabilir tempo",
    medium: "En fazla iki hedef · orta tempo",
    shifting: "Dönüşümlü görev · en fazla üç hedef",
    waiting: "Yeni hedef bekleniyor…",
    correct: "Doğru",
    wrong: "Bu örnek",
    missed: "Kaçtı",
    event: "Olay",
    pattern: "Davranış örüntüsü",
    structure: "Sistem yapısı",
    saving: "Sonuç kaydediliyor…",
    saveError: "Sonuç kaydedilemedi. İlerlemen korunuyor.",
    retry: "Kaydı tekrar dene",
    locked: "Bu oynanış tamamlandı",
    lockedDetail: "Sonucun bir kez kaydedildi. Öğretmenin sonraki yönlendirmesini bekle.",
    paused: "Sekme arka plandayken oyun duraklatıldı",
    howTo: "Nasıl Oynanır?",
    tutorialTitle: "Önce kısa bir deneme",
    tutorialIntro: "Aynı duruma üç farklı derinlikten bak. Bu deneme puansız ve süresizdir.",
    tutorialRule: "Üstteki göreve uyan cümlelere dokun. Diğerlerine dokunma.",
    tutorialMission: "YAPIYI YAKALA!",
    tutorialPrompt: "Sorunun arkasındaki kuralı, planlama eksikliğini veya birimler arasındaki bağlantı sorununu anlatan cümleye dokun.",
    tutorialEvent: "OLAYLAR · Ne oldu?",
    tutorialPattern: "DAVRANIŞ ÖRÜNTÜLERİ · Zaman içinde ne tekrar ediyor?",
    tutorialStructure: "SİSTEM YAPISI · Hangi ilişkiler bunu üretiyor?",
    tutorialEventText: "Bugün üç sipariş gecikti.",
    tutorialPatternText: "Gecikmeler üç aydır artıyor.",
    tutorialStructureText: "Siparişler kapasiteye göre planlanmıyor.",
    tutorialWrongHint: "Bu cümle sonuç veya tekrar eden davranışı anlatıyor. Kuralı, süreci ya da ilişkiyi anlatanı seç.",
    tutorialCorrect: "Doğru! Bu cümle, gecikmelere katkıda bulunabilecek planlama ilişkisini anlatıyor.",
    startGame: "Oyuna Başla",
    returnGame: "Oyuna Dön",
    skipTutorial: "Denemeyi Geç",
    preparing: "Deneme hazırlanıyor…",
    redirecting: "Yanıt kaydedildi. Geri bildirim ekranı açılıyor…",
  },
  en: {
    title: "Week 5 · Module 2: Problem Hunter",
    mission: "WHAT SHOULD YOU CATCH RIGHT NOW?",
    catchEvent: "CATCH THE EVENT!",
    catchPattern: "CATCH THE PATTERN!",
    catchStructure: "CATCH THE STRUCTURE!",
    taskChanged: "MISSION CHANGED!",
    eventDefinition: "Find the sentence describing one event.",
    patternDefinition: "Find what repeats or changes over time.",
    structureDefinition: "Find the rule, planning gap, or connection between units.",
    eventExample: "Example: The machine stopped today.",
    patternExample: "Example: Failures increase every month.",
    structureExample: "“There is no maintenance plan.” → This is a system gap that could contribute to repeated failures.",
    level: "Level",
    time: "Time left",
    seconds: "sec",
    slow: "Up to two targets · readable pace",
    medium: "Up to two targets · medium pace",
    shifting: "Rotating mission · up to three targets",
    waiting: "Waiting for a new target…",
    correct: "Correct",
    wrong: "This example is",
    missed: "Missed",
    event: "Event",
    pattern: "Behavior pattern",
    structure: "System structure",
    saving: "Saving result…",
    saveError: "The result could not be saved. Your progress is preserved.",
    retry: "Try saving again",
    locked: "This play is complete",
    lockedDetail: "Your result was recorded once. Wait for your teacher's next instruction.",
    paused: "The game pauses while this tab is in the background",
    howTo: "How to Play",
    tutorialTitle: "Try a short practice first",
    tutorialIntro: "Look at the same situation at three different depths. This practice is untimed and unscored.",
    tutorialRule: "Tap sentences that match the mission above. Do not tap the others.",
    tutorialMission: "CATCH THE STRUCTURE!",
    tutorialPrompt: "Tap the sentence describing the rule behind the problem, a planning gap, or a connection problem between units.",
    tutorialEvent: "EVENTS · What happened?",
    tutorialPattern: "BEHAVIOR PATTERNS · What repeats over time?",
    tutorialStructure: "SYSTEM STRUCTURE · Which relationships produce it?",
    tutorialEventText: "Three orders were delayed today.",
    tutorialPatternText: "Delays have increased for three months.",
    tutorialStructureText: "Orders are not planned according to capacity.",
    tutorialWrongHint: "This sentence describes an outcome or repeated behavior. Choose the rule, process, or relationship.",
    tutorialCorrect: "Correct! This sentence describes a planning relationship that could contribute to delays.",
    startGame: "Start Game",
    returnGame: "Return to Game",
    skipTutorial: "Skip Practice",
    preparing: "Preparing practice…",
    redirecting: "Answer saved. Opening the feedback screen…",
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
  const correctOpportunityCount = useMemo(() => schedule.filter((target) => target.category === target.task).length, [schedule]);
  const draftPayload = existingDraft?.payload as HunterDraftPayload | undefined;
  const initialActions = useMemo(() => hydrateActions(draftPayload, schedule), [draftPayload, schedule]);
  const initialLevel = typeof draftPayload?.levelIndex === "number" ? Math.max(0, Math.min(2, Math.floor(draftPayload.levelIndex))) : 0;
  const initialElapsed = typeof draftPayload?.levelElapsedMs === "number" ? Math.max(0, Math.min(HUNTER_LEVEL_DURATION_MS - 1, draftPayload.levelElapsedMs)) : 0;
  const restoredTransitionIndex = typeof draftPayload?.taskTransitionIndex === "number" ? Math.max(-1, Math.min(2, Math.floor(draftPayload.taskTransitionIndex))) : null;
  const initialTransitionRemaining = typeof draftPayload?.taskTransitionRemainingMs === "number" ? Math.max(0, Math.min(HUNTER_TASK_TRANSITION_MS, draftPayload.taskTransitionRemainingMs)) : 0;
  const tutorialStorageKey = useMemo(() => `system-int:week5-problem-hunter-tutorial:${seedKey.replace(/:\d+$/, "")}`, [seedKey]);

  const [actions, setActions] = useState<HunterAction[]>(initialActions);
  const [levelIndex, setLevelIndex] = useState(initialLevel);
  const [elapsedMs, setElapsedMs] = useState(initialElapsed);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [transitionRemainingMs, setTransitionRemainingMs] = useState(initialTransitionRemaining);
  const [tutorialState, setTutorialState] = useState<TutorialState>(existingDraft || existingSubmission ? "closed" : "checking");
  const [tutorialChoice, setTutorialChoice] = useState<TutorialChoice>(null);
  const [tutorialSolved, setTutorialSolved] = useState(false);
  const [tutorialReplay, setTutorialReplay] = useState(false);

  const actionsRef = useRef(initialActions);
  const resolvedIds = useRef(new Set(initialActions.map((action) => action.targetId)));
  const levelRef = useRef(initialLevel);
  const elapsedRef = useRef(initialElapsed);
  const completedRef = useRef(false);
  const submissionStarted = useRef(false);
  const lastTick = useRef<number | null>(null);
  const transitionRemainingRef = useRef(initialTransitionRemaining);
  const announcedTaskIndex = useRef(restoredTransitionIndex ?? (initialLevel === 2 && initialElapsed === 0 ? -1 : Math.min(2, Math.floor(initialElapsed / HUNTER_TASK_WINDOW_MS))));
  const draftCheckpoint = useRef(Math.floor(initialElapsed / 5_000));

  const submissionFor = useCallback((nextActions: HunterAction[], reason: "completed" | "teacher-ended" | "draft", nextLevel = levelRef.current, nextElapsed = elapsedRef.current): ModuleSubmission => ({
    stage: Math.min(3, nextLevel + 1),
    score: normalizedHunterScore(nextActions, correctOpportunityCount),
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
      normalizedScore: normalizedHunterScore(nextActions, correctOpportunityCount),
      correctCount: nextActions.filter((action) => action.outcome === "correct").length,
      wrongCount: nextActions.filter((action) => action.outcome === "wrong").length,
      missedCount: nextActions.filter((action) => action.outcome === "miss").length,
      answeredCount: nextActions.filter((action) => action.outcome !== "ignored").length,
      targetCount: schedule.length,
      correctOpportunityCount,
      maxArcadeScore: correctOpportunityCount * HUNTER_CORRECT_POINTS,
      categoryStats: Object.fromEntries(categories.map((category) => [category, categoryStats(nextActions, category)])),
      completionReason: reason,
      completionStatus: reason === "completed" ? "completed" : reason === "teacher-ended" ? "incomplete" : "draft",
    },
  }), [correctOpportunityCount, schedule, seedKey]);

  const saveDraft = useCallback((nextActions: HunterAction[], nextLevel = levelRef.current, nextElapsed = elapsedRef.current) => {
    void onDraft?.(submissionFor(nextActions, "draft", nextLevel, nextElapsed));
  }, [onDraft, submissionFor]);

  useEffect(() => {
    if (existingDraft || existingSubmission) return;
    const timer = window.setTimeout(() => {
      try {
        setTutorialState(window.localStorage.getItem(tutorialStorageKey) === "seen" ? "closed" : "open");
      } catch {
        setTutorialState("open");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [existingDraft, existingSubmission, tutorialStorageKey]);

  const rememberTutorial = useCallback(() => {
    try {
      window.localStorage.setItem(tutorialStorageKey, "seen");
    } catch {
      // Storage can be unavailable in private browsing; the game remains usable.
    }
  }, [tutorialStorageKey]);

  const closeTutorial = useCallback(() => {
    rememberTutorial();
    setTutorialState("closed");
    setTutorialChoice(null);
    setTutorialSolved(false);
    setTutorialReplay(false);
    lastTick.current = performance.now();
  }, [rememberTutorial]);

  const openTutorial = useCallback(() => {
    saveDraft(actionsRef.current);
    setTutorialChoice(null);
    setTutorialSolved(false);
    setTutorialReplay(true);
    setTutorialState("open");
    lastTick.current = performance.now();
  }, [saveDraft]);

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
    transitionRemainingRef.current = HUNTER_TASK_TRANSITION_MS;
    setTransitionRemainingMs(HUNTER_TASK_TRANSITION_MS);
    announcedTaskIndex.current = 0;
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
      if (document.hidden || completedRef.current || tutorialState !== "closed") {
        lastTick.current = performance.now();
        return;
      }
      const now = performance.now();
      const previous = lastTick.current ?? now;
      lastTick.current = now;
      const activeLevel = levelRef.current;
      const tickDelta = Math.min(250, now - previous);
      if (activeLevel === 2) {
        const taskIndex = Math.min(2, Math.floor(elapsedRef.current / HUNTER_TASK_WINDOW_MS));
        if (announcedTaskIndex.current < taskIndex) {
          announcedTaskIndex.current = taskIndex;
          transitionRemainingRef.current = HUNTER_TASK_TRANSITION_MS;
          setTransitionRemainingMs(HUNTER_TASK_TRANSITION_MS);
          setFeedback(null);
          saveDraft(actionsRef.current, activeLevel, elapsedRef.current);
        }
      }
      if (transitionRemainingRef.current > 0) {
        const remaining = Math.max(0, transitionRemainingRef.current - tickDelta);
        transitionRemainingRef.current = remaining;
        setTransitionRemainingMs(remaining);
        return;
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
      const levelFinished = isHunterLevelComplete(schedule, resolvedIds.current, activeLevel);
      if ((levelFinished || nextElapsed >= HUNTER_LEVEL_DURATION_MS) && levelRef.current === activeLevel) advanceLevel();
    };
    lastTick.current = performance.now();
    const timer = window.setInterval(tick, reduceMotion ? 120 : 60);
    return () => window.clearInterval(timer);
  }, [advanceLevel, completed, existingSubmission, forceSubmit, recordActions, reduceMotion, saveDraft, schedule, tutorialState]);

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

  if (completed) {
    return <section className="panel module-shell problem-hunter-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card hunter-submit-state">{submitting ? <div className="notice">{text.saving}</div> : submitFailed && finalSubmission ? <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => { if (submissionStarted.current) return; submissionStarted.current = true; void submitResult(finalSubmission); }}>{text.retry}</Button></> : <div className="notice success">{text.redirecting}</div>}</div></section>;
  }

  if (tutorialState === "checking") {
    return <section className="panel module-shell problem-hunter-shell"><div className="module-title-chip">{text.title}</div><div className="hunter-tutorial-loading">{text.preparing}</div></section>;
  }

  if (tutorialState === "open") {
    const tutorialOptions: Array<{ category: TargetCategory; label: string; value: string; icon: string }> = [
      { category: "event", label: text.tutorialEvent, value: text.tutorialEventText, icon: "🚚" },
      { category: "pattern", label: text.tutorialPattern, value: text.tutorialPatternText, icon: "📈" },
      { category: "structure", label: text.tutorialStructure, value: text.tutorialStructureText, icon: "⚙️" },
    ];
    return <section className="panel module-shell problem-hunter-shell hunter-tutorial">
      <div className="hunter-topline"><div className="module-title-chip">{text.title}</div><span>{text.tutorialTitle}</span></div>
      <div className="hunter-tutorial-intro"><strong>{text.tutorialTitle}</strong><p>{text.tutorialIntro}</p><b>{text.tutorialRule}</b></div>
      <div className="hunter-mission structure hunter-practice-mission">
        <div className="hunter-mission-kicker"><Crosshair size={20} /><span>{text.mission}</span></div>
        <strong>{text.tutorialMission}</strong>
        <p>{text.tutorialPrompt}</p>
      </div>
      <div className="hunter-practice-options" role="group" aria-label={text.tutorialPrompt}>
        {tutorialOptions.map((option) => {
          const selected = tutorialChoice === option.category;
          const correct = selected && option.category === "structure";
          const wrong = selected && option.category !== "structure";
          return <button
            type="button"
            key={option.category}
            className={`hunter-practice-option ${correct ? "correct" : wrong ? "wrong" : ""}`}
            aria-pressed={selected}
            disabled={tutorialSolved && option.category !== "structure"}
            onClick={() => {
              setTutorialChoice(option.category);
              setTutorialSolved(option.category === "structure");
            }}
          >
            <span aria-hidden="true">{option.icon}</span>
            <small>{option.label}</small>
            <b data-i18n-skip>{option.value}</b>
            {correct && <Check aria-hidden="true" size={20} />}
            {wrong && <X aria-hidden="true" size={20} />}
          </button>;
        })}
      </div>
      <div className={`hunter-practice-feedback ${tutorialSolved ? "correct" : tutorialChoice ? "wrong" : "idle"}`} aria-live="polite">
        {tutorialSolved ? <><Check size={19} /><span>{text.tutorialCorrect}</span></> : tutorialChoice ? <><HelpCircle size={19} /><span>{text.tutorialWrongHint}</span></> : <><Target size={18} /><span>{text.tutorialPrompt}</span></>}
      </div>
      <div className="hunter-tutorial-actions">
        {tutorialSolved && <Button icon={<Play size={17} />} onClick={closeTutorial}>{tutorialReplay ? text.returnGame : text.startGame}</Button>}
        <button type="button" className="hunter-tutorial-skip" onClick={closeTutorial}>{tutorialReplay ? text.returnGame : text.skipTutorial}</button>
      </div>
    </section>;
  }

  const currentTask = taskForLevelTime(levelIndex, elapsedMs);
  const changingTask = transitionRemainingMs > 0;
  const resolvedTargetIds = new Set(actions.map((action) => action.targetId));
  const activeTargets = changingTask ? [] : schedule.filter((target) => target.level === levelIndex && !resolvedTargetIds.has(target.id) && elapsedMs >= target.spawnAtMs && elapsedMs < target.spawnAtMs + target.durationMs);
  const targetByHole = new Map(activeTargets.map((target) => [target.hole, target]));
  const secondsLeft = Math.max(0, Math.ceil((HUNTER_LEVEL_DURATION_MS - elapsedMs) / 1000));
  const missionLabel = currentTask === "event" ? text.catchEvent : currentTask === "pattern" ? text.catchPattern : text.catchStructure;
  const missionDefinition = currentTask === "event" ? text.eventDefinition : currentTask === "pattern" ? text.patternDefinition : text.structureDefinition;
  const levelDescription = [text.slow, text.medium, text.shifting][levelIndex];

  return <section className="panel module-shell problem-hunter-shell">
    <div className="hunter-topline"><div className="module-title-chip">{text.title}</div><div className="hunter-topline-actions"><span>{text.level} {levelIndex + 1}/3 <i>· {levelDescription}</i></span><button type="button" onClick={openTutorial}><HelpCircle size={16} />{text.howTo}</button></div></div>
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
          {target && <button type="button" className="hunter-target" onClick={() => hitTarget(target)} aria-label={target.text[locale]}>
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
