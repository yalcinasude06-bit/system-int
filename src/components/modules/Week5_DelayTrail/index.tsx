"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock3, History, Lightbulb, LockKeyhole, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleSubmission } from "@/types";
import {
  DELAY_TRAIL_MAX_SCORE,
  DELAY_TRAIL_MONTHS,
  DELAY_TRAIL_REVEAL_STEP_MS,
  DELAY_TRAIL_SECOND_CHANCE_MS,
  DELAY_TRAIL_STAGES,
  buildDelayTrailRound,
  validatedDelayTrailScore,
  type DelayTrailRecord,
  type DelayTrailResolution,
} from "./delayTrailContent";

type DelayTrailDraftPayload = {
  gameId?: unknown;
  selectedCaseIds?: unknown;
  stageIndex?: unknown;
  records?: unknown;
  currentSelections?: unknown;
  correctionDeadlineAt?: unknown;
};

const copy = {
  tr: {
    title: "Hafta 5 · Modül 1: Gecikmenin İzinde",
    eyebrow: "GECİKMENİN İZİNDE",
    stage: "Aşama",
    score: "Puan",
    june: "Haziran",
    issue: "Gecikmiş sonuç",
    instruction: "Bu sorun zincirini başlatan geçmiş kararı bul ve kartına dokun.",
    order: "Aylar soldan sağa; mobilde üst satırdan alt satıra ilerler.",
    firstWrong: "Bu olay zincirin başlangıç kararı değil. Doğru kararı bulmak için 6 saniyen var.",
    secondChance: "Düzeltme süresi",
    transforming: "Başlangıç kararından sonraki gecikmiş etkiler ay ay dönüşüyor…",
    solved: "Başlangıç kararını değiştirdin → gecikmiş etkiler düzeldi.",
    teaching: "Doğru çözümün gösterimi",
    teachingDetail: "Bu dönüşüm öğretici olarak gösteriliyor; öğrenci başarısı sayılmadı.",
    feedback: "Geri besleme bağı",
    explanation: "Neden böyle oldu?",
    next: "Sonraki aşama",
    finish: "Modülü tamamla",
    completed: "Beş aşama tamamlandı",
    completedDetail: "Seçimlerin güvenle kaydedildi. Sonuçlar öğretmenin açıklamasına kadar gizli tutulacak.",
    partial: "Oynanış öğretmen tarafından sonlandırıldı",
    partialDetail: "Yalnızca tamamlanan aşamalar kaydedildi; açık kalan aşamaya puan verilmedi.",
    saving: "Sonuç kaydediliyor…",
    saveError: "Sonuç kaydedilemedi. İlerlemen korunuyor.",
    retry: "Kaydı tekrar dene",
    locked: "Bu oynanış tamamlandı",
    lockedDetail: "Yanıt hakkın daha önce kaydedildi. Öğretmenin sonraki yönlendirmesini bekle.",
    old: "Önce",
    improved: "İyileşmiş",
  },
  en: {
    title: "Week 5 · Module 1: Tracing the Delay",
    eyebrow: "TRACING THE DELAY",
    stage: "Stage",
    score: "Score",
    june: "June",
    issue: "Delayed outcome",
    instruction: "Find the past decision that started this problem chain and tap its card.",
    order: "Months run left to right; on mobile, continue from the top row to the bottom row.",
    firstWrong: "This event is not the starting decision. You have 6 seconds to find the correct decision.",
    secondChance: "Correction time",
    transforming: "The delayed effects after the starting decision are changing month by month…",
    solved: "You changed the starting decision → the delayed effects improved.",
    teaching: "Correct-solution demonstration",
    teachingDetail: "This transformation is shown for teaching and was not counted as student success.",
    feedback: "Feedback link",
    explanation: "Why did this happen?",
    next: "Next stage",
    finish: "Complete module",
    completed: "All five stages are complete",
    completedDetail: "Your choices were saved securely. Results will remain hidden until your teacher reveals them.",
    partial: "The teacher ended this play",
    partialDetail: "Only completed stages were saved; the open stage received no points.",
    saving: "Saving result…",
    saveError: "The result could not be saved. Your progress is preserved.",
    retry: "Try saving again",
    locked: "This play is complete",
    lockedDetail: "Your response was already recorded. Wait for your teacher's next instruction.",
    old: "Before",
    improved: "Improved",
  },
} as const;

function safeSelections(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 2).flatMap((item) => Number.isInteger(item) && Number(item) >= 0 && Number(item) <= 5 ? [Number(item)] : []);
}

function hydrateRecords(value: unknown, selectedCaseIds: readonly string[], initiators: readonly number[]) {
  if (!Array.isArray(value)) return [];
  const result: DelayTrailRecord[] = [];
  for (const [stage, candidate] of value.slice(0, 5).entries()) {
    if (!candidate || typeof candidate !== "object") break;
    const record = candidate as Partial<DelayTrailRecord>;
    if (record.caseId !== selectedCaseIds[stage]) break;
    if (record.resolution !== "first" && record.resolution !== "second" && record.resolution !== "teaching") break;
    const selections = safeSelections(record.selections);
    const revealedThrough = typeof record.revealedThrough === "number" ? Math.max(-1, Math.min(5, Math.floor(record.revealedThrough))) : -1;
    const initiator = initiators[stage];
    const validResolution = record.resolution === "first"
      ? selections.length === 1 && selections[0] === initiator
      : record.resolution === "second"
        ? selections.length === 2 && selections[0] !== initiator && selections[1] === initiator
        : selections.length >= 1 && selections.every((selection) => selection !== initiator);
    if (!validResolution || initiator === undefined || revealedThrough < initiator) break;
    result.push({ caseId: record.caseId, resolution: record.resolution, selections, revealedThrough });
  }
  return result;
}

export function Week5DelayTrail({
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
  const round = useMemo(() => buildDelayTrailRound(seedKey), [seedKey]);
  const selectedCaseIds = useMemo(() => round.map((item) => item.id), [round]);
  const draftPayload = existingDraft?.payload as DelayTrailDraftPayload | undefined;
  const draftMatchesRound = Array.isArray(draftPayload?.selectedCaseIds)
    && draftPayload.selectedCaseIds.length === selectedCaseIds.length
    && draftPayload.selectedCaseIds.every((id, index) => id === selectedCaseIds[index]);
  const initialRecords = useMemo(
    () => hydrateRecords(draftMatchesRound ? draftPayload?.records : undefined, selectedCaseIds, round.map((item) => item.initiatorIndex)),
    [draftMatchesRound, draftPayload?.records, round, selectedCaseIds],
  );
  const requestedStage = draftMatchesRound && typeof draftPayload?.stageIndex === "number" ? Math.floor(draftPayload.stageIndex) : 0;
  const initialStage = Math.max(0, Math.min(4, requestedStage, initialRecords.length));
  const initialSelections = draftMatchesRound ? safeSelections(draftPayload?.currentSelections) : [];
  const initialDeadline = draftMatchesRound && typeof draftPayload?.correctionDeadlineAt === "number" ? draftPayload.correctionDeadlineAt : null;

  const [stageIndex, setStageIndex] = useState(initialStage);
  const [records, setRecords] = useState<DelayTrailRecord[]>(initialRecords);
  const [currentSelections, setCurrentSelections] = useState<number[]>(initialRecords[initialStage] ? [] : initialSelections);
  const [correctionDeadlineAt, setCorrectionDeadlineAt] = useState<number | null>(initialRecords[initialStage] ? null : initialDeadline);
  const [clockNow, setClockNow] = useState(0);
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const [completionReason, setCompletionReason] = useState<"completed" | "teacher-ended">("completed");
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);

  const stageRef = useRef(initialStage);
  const recordsRef = useRef(initialRecords);
  const selectionsRef = useRef(initialRecords[initialStage] ? [] : initialSelections);
  const deadlineRef = useRef<number | null>(initialRecords[initialStage] ? null : initialDeadline);
  const completedRef = useRef(false);
  const submissionStarted = useRef(false);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const score = validatedDelayTrailScore(selectedCaseIds, records);
  const currentCase = round[stageIndex]!;
  const currentRecord = records[stageIndex];
  const phase = currentRecord
    ? currentRecord.revealedThrough >= 5 ? "summary" : "transforming"
    : currentSelections.length > 0 ? "second-chance" : "inspect";

  const submissionFor = useCallback((
    nextRecords: DelayTrailRecord[],
    reason: "completed" | "teacher-ended" | "draft",
    nextStage = stageRef.current,
    nextSelections = selectionsRef.current,
    nextDeadline = deadlineRef.current,
  ): ModuleSubmission => {
    const completedRecords = nextRecords.filter((record) => record.revealedThrough >= 5);
    return {
      stage: Math.max(1, Math.min(5, nextStage + 1)),
      score: validatedDelayTrailScore(selectedCaseIds, nextRecords),
      payload: {
        mode: "delay-trail",
        gameId: "week-5-delay-trail-v1",
        selectedCaseIds,
        stageIndex: nextStage,
        records: nextRecords,
        currentSelections: nextSelections,
        correctionDeadlineAt: nextDeadline,
        answeredCount: completedRecords.length,
        completionReason: reason,
        completionStatus: reason === "completed" ? "completed" : reason === "teacher-ended" ? "incomplete" : "draft",
      },
    };
  }, [selectedCaseIds]);

  const saveDraft = useCallback((
    nextRecords = recordsRef.current,
    nextStage = stageRef.current,
    nextSelections = selectionsRef.current,
    nextDeadline = deadlineRef.current,
  ) => {
    void onDraft?.(submissionFor(nextRecords, "draft", nextStage, nextSelections, nextDeadline));
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

  const finalize = useCallback((reason: "completed" | "teacher-ended") => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true;
    completedRef.current = true;
    setCompleted(true);
    setCompletionReason(reason);
    const submission = submissionFor(recordsRef.current, reason);
    setFinalSubmission(submission);
    void submitResult(submission);
  }, [existingSubmission, submissionFor, submitResult]);

  const resolveStage = useCallback((resolution: DelayTrailResolution, selections: number[]) => {
    if (recordsRef.current[stageRef.current]) return;
    const scenario = round[stageRef.current]!;
    const record: DelayTrailRecord = {
      caseId: scenario.id,
      selections,
      resolution,
      revealedThrough: scenario.initiatorIndex,
    };
    const nextRecords = [...recordsRef.current];
    nextRecords[stageRef.current] = record;
    recordsRef.current = nextRecords;
    selectionsRef.current = [];
    deadlineRef.current = null;
    setRecords(nextRecords);
    setCurrentSelections([]);
    setCorrectionDeadlineAt(null);
    saveDraft(nextRecords, stageRef.current, [], null);
  }, [round, saveDraft]);

  const selectMonth = useCallback((monthIndex: number) => {
    if (completedRef.current || existingSubmission || forceSubmit || recordsRef.current[stageRef.current]) return;
    const scenario = round[stageRef.current]!;
    const nextSelections = [...selectionsRef.current, monthIndex].slice(0, 2);
    if (monthIndex === scenario.initiatorIndex) {
      resolveStage(nextSelections.length === 1 ? "first" : "second", nextSelections);
      return;
    }
    setWrongFlash(monthIndex);
    window.setTimeout(() => setWrongFlash((current) => current === monthIndex ? null : current), 700);
    if (nextSelections.length >= 2) {
      resolveStage("teaching", nextSelections);
      return;
    }
    const deadline = Date.now() + DELAY_TRAIL_SECOND_CHANCE_MS;
    selectionsRef.current = nextSelections;
    deadlineRef.current = deadline;
    setCurrentSelections(nextSelections);
    setCorrectionDeadlineAt(deadline);
    setClockNow(Date.now());
    saveDraft(recordsRef.current, stageRef.current, nextSelections, deadline);
  }, [existingSubmission, forceSubmit, resolveStage, round, saveDraft]);

  useEffect(() => {
    if (!currentRecord || currentRecord.revealedThrough >= 5 || completed || existingSubmission) return;
    const timer = window.setTimeout(() => {
      const nextRecords = [...recordsRef.current];
      const active = nextRecords[stageRef.current];
      if (!active) return;
      nextRecords[stageRef.current] = { ...active, revealedThrough: Math.min(5, active.revealedThrough + 1) };
      recordsRef.current = nextRecords;
      setRecords(nextRecords);
      saveDraft(nextRecords);
    }, reduceMotion ? 45 : DELAY_TRAIL_REVEAL_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [completed, currentRecord, existingSubmission, reduceMotion, saveDraft]);

  useEffect(() => {
    if (!correctionDeadlineAt || currentRecord || completed || existingSubmission) return;
    const tick = () => {
      const now = Date.now();
      setClockNow(now);
      if (now >= correctionDeadlineAt) resolveStage("teaching", selectionsRef.current);
    };
    tick();
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [completed, correctionDeadlineAt, currentRecord, existingSubmission, resolveStage]);

  useEffect(() => {
    const flushDraft = () => {
      if (!completedRef.current && !existingSubmission) saveDraft();
    };
    document.addEventListener("visibilitychange", flushDraft);
    window.addEventListener("pagehide", flushDraft);
    return () => {
      document.removeEventListener("visibilitychange", flushDraft);
      window.removeEventListener("pagehide", flushDraft);
    };
  }, [existingSubmission, saveDraft]);

  useEffect(() => {
    if (forceSubmit && !completedRef.current && !existingSubmission) finalize("teacher-ended");
  }, [existingSubmission, finalize, forceSubmit]);

  const advanceStage = () => {
    if (!currentRecord || currentRecord.revealedThrough < 5) return;
    if (stageIndex >= 4) {
      finalize("completed");
      return;
    }
    const nextStage = stageIndex + 1;
    stageRef.current = nextStage;
    selectionsRef.current = [];
    deadlineRef.current = null;
    setStageIndex(nextStage);
    setCurrentSelections([]);
    setCorrectionDeadlineAt(null);
    setWrongFlash(null);
    saveDraft(recordsRef.current, nextStage, [], null);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLButtonElement>, monthIndex: number) => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    cardRefs.current[(monthIndex + delta + 6) % 6]?.focus();
  };

  if (existingSubmission && !completed) {
    return <section className="panel module-shell delay-trail-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  }

  if (completed) {
    return <section className="panel module-shell delay-trail-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><History size={46} /><h2>{completionReason === "completed" ? text.completed : text.partial}</h2><p>{completionReason === "completed" ? text.completedDetail : text.partialDetail}</p>{submitting && <div className="notice">{text.saving}</div>}{submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => { if (submissionStarted.current) return; submissionStarted.current = true; void submitResult(finalSubmission); }}>{text.retry}</Button></>}</div></section>;
  }

  const remainingMs = clockNow === 0 ? DELAY_TRAIL_SECOND_CHANCE_MS : Math.max(0, (correctionDeadlineAt ?? clockNow) - clockNow);
  const isTeaching = currentRecord?.resolution === "teaching";
  const juneChanged = Boolean(currentRecord && currentRecord.revealedThrough >= 5);

  return <section className="panel module-shell delay-trail-shell">
    <header className="delay-trail-header">
      <div><div className="module-title-chip">{text.title}</div><h2>{text.eyebrow}</h2><p>{currentCase.title[locale]} <span>· {currentCase.context[locale]}</span></p></div>
      <div className="delay-trail-progress" aria-label={`${text.stage} ${stageIndex + 1}/5, ${text.score} ${score}/${DELAY_TRAIL_MAX_SCORE}`}>
        <span>{text.stage} <b>{stageIndex + 1}/5</b><small>{DELAY_TRAIL_STAGES[stageIndex]![locale]}</small></span><span>{text.score} <b>{score}/{DELAY_TRAIL_MAX_SCORE}</b></span>
      </div>
    </header>

    <div className={`delay-trail-issue ${juneChanged ? "resolved" : ""}`} aria-live="polite">
      {juneChanged ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}
      <span><small>{text.issue}</small><strong>{text.june} — {currentCase.months[5]![juneChanged ? "after" : "before"][locale]}</strong></span>
    </div>

    {currentCase.feedbackLoop && <div className="delay-trail-loop" aria-label={`${text.feedback}: ${currentCase.feedbackLoop[locale]}`}><span>↶</span><b>{text.feedback}</b><p>{currentCase.feedbackLoop[locale]}</p></div>}

    <div className="delay-trail-grid" role="group" aria-label={text.instruction}>
      {currentCase.months.map((month, monthIndex) => {
        const changed = Boolean(currentRecord && monthIndex >= currentCase.initiatorIndex && monthIndex <= currentRecord.revealedThrough);
        const selectedWrong = currentSelections.includes(monthIndex) || (isTeaching && currentRecord.selections.includes(monthIndex) && monthIndex !== currentCase.initiatorIndex);
        const correctShown = changed && monthIndex === currentCase.initiatorIndex;
        const monthText = month[changed ? "after" : "before"][locale];
        return <div className="delay-trail-month-wrap" key={`${currentCase.id}-${monthIndex}`}>
          <button
            ref={(node) => { cardRefs.current[monthIndex] = node; }}
            type="button"
            className={`delay-trail-month ${changed ? "changed" : ""} ${correctShown ? "initiator" : ""} ${selectedWrong ? "wrong" : ""} ${wrongFlash === monthIndex ? "shake" : ""}`}
            disabled={phase === "transforming" || phase === "summary"}
            aria-label={`${DELAY_TRAIL_MONTHS[locale][monthIndex]}: ${monthText}`}
            onClick={() => selectMonth(monthIndex)}
            onKeyDown={(event) => handleCardKeyDown(event, monthIndex)}
          >
            <span>{DELAY_TRAIL_MONTHS[locale][monthIndex]}</span>
            <small>{changed ? text.improved : text.old}</small>
            <strong>{monthText}</strong>
            {changed && <CheckCircle2 size={17} aria-hidden="true" />}
          </button>
          {monthIndex < 5 && <ArrowRight className="delay-trail-arrow" aria-hidden="true" />}
        </div>;
      })}
    </div>

    <p className="delay-trail-order"><ArrowRight size={15} />{text.order}</p>

    <div className={`delay-trail-guidance ${phase} ${isTeaching ? "teaching" : ""}`} aria-live="polite">
      {phase === "inspect" && <><Lightbulb size={20} /><strong>{text.instruction}</strong></>}
      {phase === "second-chance" && <><RefreshCw size={20} /><div><strong>{text.firstWrong}</strong><span>{text.secondChance}: {(remainingMs / 1000).toFixed(1)} sn</span></div></>}
      {phase === "transforming" && <><Sparkles size={20} /><div><strong>{isTeaching ? text.teaching : text.transforming}</strong>{isTeaching && <span>{text.teachingDetail}</span>}</div></>}
      {phase === "summary" && <><CheckCircle2 size={20} /><div><strong>{isTeaching ? text.teaching : text.solved}</strong>{isTeaching && <span>{text.teachingDetail}</span>}</div></>}
    </div>

    {phase === "summary" && <div className="delay-trail-summary">
      <div><b>{text.explanation}</b><p>{currentCase.explanation[locale]}</p>{currentCase.feedbackLoop && <p><strong>{text.feedback}:</strong> {currentCase.feedbackLoop[locale]}</p>}</div>
      <Button icon={stageIndex >= 4 ? <CheckCircle2 size={18} /> : <ArrowRight size={18} />} onClick={advanceStage}>{stageIndex >= 4 ? text.finish : text.next}</Button>
    </div>}
  </section>;
}
