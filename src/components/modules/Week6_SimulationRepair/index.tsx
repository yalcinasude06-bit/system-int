"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, CheckCircle2, LockKeyhole, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import { buildRepairRound, repairIsCorrect, scoreRepairProgress, type Diagnosis, type RepairProgress, type RepairScenario } from "./repairContent";

type Phase = "diagnosis" | "repair" | "result";
type DraftPayload = { gameId?: unknown; selectedCaseIds?: unknown; progress?: unknown };
const gameId = "week-6-simulation-repair-v4";

const copy = {
  tr: { title: "HAFTA 6 · MODÜL 2", case: "Vaka", score: "Puan", prompt: "Sorun nerede?", verification: "Doğrulama", validation: "Geçerlilik", verificationHint: "Tanımlanan model doğru uygulanmış mı?", validationHint: "Model gerçek sistemi yeterince temsil ediyor mu?", repairPrompt: "Hatalı model parçasına bir kez dokun.", observation: "Gerçek gözlem", simulation: "Bozuk model", fixed: "Düzeltilmiş model", correct: "Doğru", wrong: "Yanlış", diagnosisScore: "Teşhis", repairScore: "Onarım", auto: "Sonraki vaka hazırlanıyor…", completed: "Beş vaka tamamlandı", partial: "Öğretmen turu sonlandırdı", detail: "Tamamlanan alt aşamalar güvenle kaydedildi.", saving: "Kaydediliyor…", saveError: "Kayıt başarısız; ilerleme korundu.", retry: "Tekrar dene", locked: "Bu tur tamamlandı", lockedDetail: "Yanıtların daha önce kaydedildi." },
  en: { title: "WEEK 6 · MODULE 2", case: "Case", score: "Score", prompt: "Where is the problem?", verification: "Verification", validation: "Validation", verificationHint: "Was the defined model implemented correctly?", validationHint: "Does the model represent the real system well enough?", repairPrompt: "Tap the faulty model part once.", observation: "Observed", simulation: "Broken model", fixed: "Fixed model", correct: "Correct", wrong: "Incorrect", diagnosisScore: "Diagnosis", repairScore: "Repair", auto: "Preparing next case…", completed: "Five cases complete", partial: "Teacher ended the round", detail: "Completed sub-stages were saved securely.", saving: "Saving…", saveError: "Save failed; progress is preserved.", retry: "Try again", locked: "This round is complete", lockedDetail: "Your answers were already saved." },
} as const;

function hydrate(draft: ModuleDraft | null | undefined, round: readonly RepairScenario[]) {
  const payload = draft?.payload as DraftPayload | undefined;
  const ids = round.map((scenario) => scenario.id);
  const matches = payload?.gameId === gameId && Array.isArray(payload.selectedCaseIds) && payload.selectedCaseIds.length === 5 && payload.selectedCaseIds.every((id, index) => id === ids[index]);
  const restored: RepairProgress[] = [];
  if (matches && Array.isArray(payload?.progress)) {
    for (const [index, value] of payload.progress.slice(0, 5).entries()) {
      if (!value || typeof value !== "object") break;
      const item = value as Record<string, unknown>;
      const diagnosis = item.diagnosis === "verification" || item.diagnosis === "validation" ? item.diagnosis : undefined;
      const selectedTokenId = typeof item.selectedTokenId === "string" ? item.selectedTokenId : undefined;
      if (item.caseId !== ids[index] || !diagnosis || (selectedTokenId && !round[index]?.tokens.some((token) => token.id === selectedTokenId))) break;
      restored.push({ caseId: String(item.caseId), diagnosis, selectedTokenId });
      if (!selectedTokenId) break;
    }
  }
  return restored;
}

function chartGeometry(real: number[], model: number[], fixed: number[]) {
  const values = [...real, ...model, ...fixed];
  const rawMin = Math.min(...values), rawMax = Math.max(...values);
  const padding = Math.max(1, (rawMax - rawMin) * .08);
  const min = Math.floor(rawMin - padding), max = Math.ceil(rawMax + padding), range = Math.max(1, max - min);
  const points = (series: number[]) => series.map((value, index) => `${40 + index * 270 / Math.max(1, series.length - 1)},${122 - (value - min) * 104 / range}`).join(" ");
  return { min, max, mid: Math.round((min + max) / 2), points };
}

function axisTicks(axis: string) {
  const match = axis.match(/^(.*?)(\d+)\D+(\d+)$/u);
  if (!match) return [axis, "", ""];
  const start = Number(match[2]), end = Number(match[3]), label = match[1]!.trim();
  return [`${label} ${start}`, `${label} ${Math.round((start + end) / 2)}`, `${label} ${end}`];
}

function Evidence({ scenario, phase, selected, locale, text, onRepair }: { scenario: RepairScenario; phase: Phase; selected?: string; locale: "tr" | "en"; text: typeof copy.tr | typeof copy.en; onRepair: (tokenId: string) => void }) {
  const revealed = phase === "result";
  const correct = selected ? repairIsCorrect(scenario, selected) : false;
  const realSeries = scenario.realSeries, modelSeries = scenario.modelSeries, fixedSeries = scenario.fixedSeries;
  if (!realSeries || !modelSeries || !fixedSeries) {
    return <div className="repair-v4-evidence repair-v4-equation-evidence">
      <div className="repair-v4-facts">{scenario.facts.map((fact, index) => <span key={index}>{fact[locale]}</span>)}</div>
      <div className="repair-v4-equation" aria-label={revealed ? scenario.fixedOutput[locale] : scenario.brokenOutput[locale]}>
        {scenario.tokens.map((token) => {
          const chosen = selected === token.id, target = token.id === scenario.correctTokenId;
          const className = revealed && target ? "target" : revealed && chosen && !correct ? "chosen-wrong" : "";
          return <button type="button" key={token.id} className={className} disabled={phase !== "repair"} aria-label={token.label[locale]} onClick={() => onRepair(token.id)}><span>{revealed ? token.fixed[locale] : token.label[locale]}</span>{revealed && target && <CheckCircle2 aria-hidden="true" />}{revealed && chosen && !correct && <X aria-hidden="true" />}</button>;
        })}
      </div>
    </div>;
  }
  const geometry = chartGeometry(realSeries, modelSeries, fixedSeries);
  const fixedPoints = geometry.points(fixedSeries).split(" ");
  const ticks = axisTicks(scenario.axis?.[locale] ?? "");
  return <div className="repair-v4-evidence repair-v4-chart-evidence">
    <div className="repair-v4-facts">{scenario.facts.map((fact, index) => <span key={index}>{fact[locale]}</span>)}</div>
    <div className="repair-v4-chart">
      <div className="repair-v4-legend"><span className="real">{text.observation}</span><span className="broken">{text.simulation}</span>{revealed && <span className="corrected">{text.fixed}</span>}</div>
      <svg viewBox="0 0 330 154" role="img" aria-label={`${text.observation} / ${text.simulation}`}>
        <g className="grid"><path d="M40 18H310M40 70H310M40 122H310" /><path d="M40 14V122H314" /></g>
        <g className="y-ticks"><text x="35" y="22">{geometry.max}</text><text x="35" y="74">{geometry.mid}</text><text x="35" y="126">{geometry.min}</text></g>
        <polyline className="real" points={geometry.points(realSeries)} />
        <polyline className={`broken ${revealed ? "faded" : ""}`} points={geometry.points(modelSeries)} />
        {revealed && <><polyline className="fixed" points={fixedPoints.join(" ")} />{fixedSeries.map((value, index) => { const [cx, cy] = fixedPoints[index]!.split(","); return <circle key={`${value}-${index}`} cx={cx} cy={cy} r="3.2" />; })}</>}
        <g className="x-ticks"><text x="40" y="145">{ticks[0]}</text><text x="175" y="145">{ticks[1]}</text><text x="310" y="145">{ticks[2]}</text></g>
      </svg>
    </div>
  </div>;
}

export function Week6SimulationRepair({ seedKey, onSubmit, onDraft, existingSubmission, existingDraft, forceSubmit }: LearningModuleProps & { seedKey: string }) {
  const { locale } = useI18n();
  const text = copy[locale];
  const round = useMemo(() => buildRepairRound(seedKey), [seedKey]);
  const ids = useMemo(() => round.map((scenario) => scenario.id), [round]);
  const initial = useMemo(() => hydrate(existingDraft, round), [existingDraft, round]);
  const completedCount = initial.filter((item) => item.selectedTokenId).length;
  const [index, setIndex] = useState(Math.min(completedCount, 4));
  const [progress, setProgress] = useState(initial);
  const [phase, setPhase] = useState<Phase>(initial[completedCount]?.diagnosis ? "repair" : "diagnosis");
  const [selected, setSelected] = useState<string>();
  const [completed, setCompleted] = useState(false);
  const [reason, setReason] = useState<"completed" | "teacher-ended">("completed");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const progressRef = useRef(initial), indexRef = useRef(index), phaseRef = useRef(phase), locked = useRef(false), submitted = useRef(false), done = useRef(false), timers = useRef<number[]>([]);
  const current = round[index]!;
  const record = progress[index];
  const clear = useCallback(() => { timers.current.forEach(window.clearTimeout); timers.current = []; }, []);
  useEffect(() => clear, [clear]);

  const submissionFor = useCallback((nextProgress: RepairProgress[], completionReason: "completed" | "teacher-ended" | "draft"): ModuleSubmission => ({ stage: Math.min(5, indexRef.current + 1), score: scoreRepairProgress(round, nextProgress), payload: { gameId, selectedCaseIds: ids, progress: nextProgress, answeredCount: nextProgress.filter((item) => item.selectedTokenId).length, completionReason, completionStatus: completionReason === "completed" ? "completed" : completionReason === "teacher-ended" ? "incomplete" : "draft" } }), [ids, round]);
  const save = useCallback((nextProgress = progressRef.current) => { void onDraft?.(submissionFor(nextProgress, "draft")); }, [onDraft, submissionFor]);
  const send = useCallback(async (submission: ModuleSubmission) => { setSubmitting(true); setFailed(false); if (await onSubmit(submission) === false) { submitted.current = false; setFailed(true); } setSubmitting(false); }, [onSubmit]);
  const finish = useCallback((completionReason: "completed" | "teacher-ended") => { if (submitted.current || existingSubmission) return; clear(); submitted.current = true; done.current = true; setCompleted(true); setReason(completionReason); const submission = submissionFor(progressRef.current, completionReason); setFinalSubmission(submission); void send(submission); }, [clear, existingSubmission, send, submissionFor]);
  useEffect(() => { if (completedCount === 5 && !existingSubmission) finish("completed"); }, [completedCount, existingSubmission, finish]);
  useEffect(() => { if (forceSubmit && !done.current && !existingSubmission) finish("teacher-ended"); }, [existingSubmission, finish, forceSubmit]);
  useEffect(() => { const flush = () => { if (!done.current && !existingSubmission) save(); }; addEventListener("pagehide", flush); return () => removeEventListener("pagehide", flush); }, [existingSubmission, save]);

  const diagnose = (diagnosis: Diagnosis) => {
    if (phaseRef.current !== "diagnosis" || record?.diagnosis) return;
    const next = [...progressRef.current];
    next[indexRef.current] = { caseId: current.id, diagnosis };
    progressRef.current = next; setProgress(next); phaseRef.current = "repair"; setPhase("repair"); save(next);
  };
  const repair = (tokenId: string) => {
    if (phaseRef.current !== "repair" || locked.current || progressRef.current[indexRef.current]?.selectedTokenId || !current.tokens.some((token) => token.id === tokenId)) return;
    locked.current = true;
    const next = [...progressRef.current];
    next[indexRef.current] = { ...progressRef.current[indexRef.current]!, selectedTokenId: tokenId };
    progressRef.current = next; setProgress(next); setSelected(tokenId); phaseRef.current = "result"; setPhase("result"); save(next);
    const delay = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1050 : 1350;
    timers.current.push(window.setTimeout(() => { if (indexRef.current >= 4) { finish("completed"); return; } indexRef.current += 1; setIndex(indexRef.current); phaseRef.current = "diagnosis"; setPhase("diagnosis"); setSelected(undefined); locked.current = false; save(next); }, delay));
  };

  if (existingSubmission && !completed) return <section className="panel module-shell simulation-repair-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  if (completed) return <section className="panel module-shell simulation-repair-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><Sparkles size={42} /><h2>{reason === "completed" ? text.completed : text.partial}</h2><p>{text.detail}</p>{submitting && <div className="notice">{text.saving}</div>}{failed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void send(finalSubmission)}>{text.retry}</Button></>}</div></section>;

  const repairCorrect = selected ? repairIsCorrect(current, selected) : false;
  const diagnosisPoints = record?.diagnosis === current.diagnosis ? 8 : 0;
  const repairPoints = repairCorrect ? 12 : 0;
  const chosenToken = current.tokens.find((token) => token.id === selected);
  const correctToken = current.tokens.find((token) => token.id === current.correctTokenId);

  return <section className="panel module-shell simulation-repair-shell repair-v4-shell">
    <header className="simulation-repair-header"><span className="module-title-chip">{text.title}</span><div><span>{text.case} <b>{index + 1}/5</b></span><span>{text.score} <b>{scoreRepairProgress(round, progress)}</b></span></div></header>
    <div className="simulation-repair-progress" role="progressbar" aria-valuemin={1} aria-valuemax={5} aria-valuenow={index + 1}>{round.map((scenario, scenarioIndex) => <i aria-hidden="true" key={scenario.id} className={progress[scenarioIndex]?.selectedTokenId ? "done" : scenarioIndex === index ? "active" : ""} />)}</div>
    <div className="repair-v4-heading"><h2>{current.title[locale]}</h2><p>{current.context[locale]}</p></div>
    <Evidence scenario={current} phase={phase} selected={selected} locale={locale} text={text} onRepair={repair} />
    <div className="repair-v4-active">
      {phase === "diagnosis" ? <><strong>{text.prompt}</strong><div className="repair-v4-diagnosis"><button type="button" onClick={() => diagnose("verification")}><Activity /><span><b>{text.verification}</b><small>{text.verificationHint}</small></span></button><button type="button" onClick={() => diagnose("validation")}><ShieldCheck /><span><b>{text.validation}</b><small>{text.validationHint}</small></span></button></div></>
        : phase === "repair" ? <><strong>{text.repairPrompt}</strong>{current.realSeries && <div className="repair-v4-cards">{current.tokens.map((token) => <button type="button" key={token.id} onClick={() => repair(token.id)}>{token.label[locale]}</button>)}</div>}</>
        : <div className={`repair-v4-result ${repairCorrect ? "correct" : "wrong"}`} role="status" aria-live="polite">{repairCorrect ? <CheckCircle2 /> : <X />}<span><b>{repairCorrect ? text.correct : text.wrong}</b><strong>{text.diagnosisScore} +{diagnosisPoints} · {text.repairScore} +{repairPoints}</strong><small>{chosenToken?.label[locale]} → {correctToken?.fixed[locale]} · {text.auto}</small></span></div>}
    </div>
  </section>;
}
