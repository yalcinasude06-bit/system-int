"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, CheckCircle2, LockKeyhole, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleDraft, ModuleSubmission } from "@/types";
import { buildRepairRound, repairIsCorrect, scoreRepairProgress, type Diagnosis, type RepairProgress, type RepairScenario } from "./repairContent";

type Phase = "diagnosis" | "diagnosis-feedback" | "repair" | "result";
type DraftPayload = { gameId?: unknown; selectedCaseIds?: unknown; progress?: unknown };
const gameId = "week-6-simulation-repair-v5";

const copy = {
  tr: {
    title: "HAFTA 6 · MODÜL 2", case: "Vaka", score: "Puan", prompt: "Sorun nerede?", verification: "Doğrulama", validation: "Geçerlilik",
    verificationHint: "Tanımlanan model doğru uygulanmış mı?", validationHint: "Model gerçek sistemi yeterince temsil ediyor mu?", repairPrompt: "Hatalı model parçasına bir kez dokun.",
    observation: "Gerçek", simulation: "Bozuk model", fixed: "Düzeltilmiş model", definedData: "Tanımlı veri ve kural", modelOutput: "Model çıktısı", start: "Başlangıç", effect: "Etki başlar",
    correctDiagnosis: "Doğru teşhis", wrongDiagnosis: "Yanlış teşhis", yourChoice: "Seçimin", correctAnswer: "Doğrusu", correctPart: "Doğru parça", correct: "Doğru onarım", wrong: "Yanlış onarım",
    auto: "Sonraki vaka hazırlanıyor…", completed: "Altı vaka tamamlandı", partial: "Öğretmen turu sonlandırdı", detail: "Tamamlanan alt aşamalar güvenle kaydedildi.",
    saving: "Kaydediliyor…", saveError: "Kayıt başarısız; ilerleme korundu.", retry: "Tekrar dene", locked: "Bu tur tamamlandı", lockedDetail: "Yanıtların daha önce kaydedildi.",
  },
  en: {
    title: "WEEK 6 · MODULE 2", case: "Case", score: "Score", prompt: "Where is the problem?", verification: "Verification", validation: "Validation",
    verificationHint: "Was the defined model implemented correctly?", validationHint: "Does the model represent the real system well enough?", repairPrompt: "Tap the faulty model part once.",
    observation: "Observed", simulation: "Broken model", fixed: "Fixed model", definedData: "Defined data and rule", modelOutput: "Model output", start: "Start", effect: "Effect begins",
    correctDiagnosis: "Correct diagnosis", wrongDiagnosis: "Incorrect diagnosis", yourChoice: "Your choice", correctAnswer: "Correct answer", correctPart: "Correct part", correct: "Correct repair", wrong: "Incorrect repair",
    auto: "Preparing next case…", completed: "Six cases complete", partial: "Teacher ended the round", detail: "Completed sub-stages were saved securely.",
    saving: "Saving…", saveError: "Save failed; progress is preserved.", retry: "Try again", locked: "This round is complete", lockedDetail: "Your answers were already saved.",
  },
} as const;

type RepairCopy = typeof copy.tr | typeof copy.en;

function hydrate(draft: ModuleDraft | null | undefined, round: readonly RepairScenario[]) {
  const payload = draft?.payload as DraftPayload | undefined;
  const ids = round.map((scenario) => scenario.id);
  const matches = payload?.gameId === gameId && Array.isArray(payload.selectedCaseIds) && payload.selectedCaseIds.length === 6 && payload.selectedCaseIds.every((id, index) => id === ids[index]);
  const restored: RepairProgress[] = [];
  if (matches && Array.isArray(payload?.progress)) {
    for (const [index, value] of payload.progress.slice(0, 6).entries()) {
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

function axisLabels(axis: string, length: number) {
  const match = axis.match(/^(.*?)(\d+)\D+(\d+)$/u);
  if (!match) return Array.from({ length }, (_, index) => `${index + 1}`);
  const start = Number(match[2]), end = Number(match[3]), prefix = match[1]!.trim();
  return Array.from({ length }, (_, index) => `${prefix} ${Math.round(start + (end - start) * index / Math.max(1, length - 1))}`);
}

function Facts({ scenario, locale }: { scenario: RepairScenario; locale: "tr" | "en" }) {
  return <div className="repair-p5-facts">{scenario.facts.map((fact, index) => <span key={index}>{fact[locale]}</span>)}</div>;
}

function equationResult(output: string) {
  return output.split("=").slice(1).join("=").trim();
}

function EquationEvidence({ scenario, locale, revealed = false }: { scenario: RepairScenario; locale: "tr" | "en"; revealed?: boolean }) {
  const output = revealed ? scenario.fixedOutput[locale] : scenario.brokenOutput[locale];
  return <div className="repair-p5-equation repair-p5-equation-static" aria-label={output}>
    {scenario.tokens.map((token) => <span key={token.id}>{revealed ? token.fixed[locale] : token.label[locale]}</span>)}
    <b aria-hidden="true">=</b><strong>{equationResult(output)}</strong>
  </div>;
}

function TimelineEvidence({ scenario, locale, text, revealed }: { scenario: RepairScenario; locale: "tr" | "en"; text: RepairCopy; revealed: boolean }) {
  const real = scenario.realSeries!, model = scenario.modelSeries!, fixed = scenario.fixedSeries!;
  const labels = axisLabels(scenario.axis?.[locale] ?? "", real.length);
  const rows = [{ label: text.observation, values: real, className: "real" }, { label: text.simulation, values: model, className: "broken" }, ...(revealed ? [{ label: text.fixed, values: fixed, className: "corrected" }] : [])];
  return <div className="repair-p5-timeline" style={{ "--timeline-columns": real.length } as React.CSSProperties}>
    <strong className="repair-p5-evidence-title">{scenario.evidenceTitle?.[locale]}</strong>
    <div className="repair-p5-timeline-labels"><i />{labels.map((label) => <span key={label}>{label}</span>)}</div>
    {rows.map((row) => <div className={`repair-p5-timeline-row ${row.className}`} key={row.label}><b>{row.label}</b>{row.values.map((value, index) => <span key={`${row.label}-${index}`}>{value}</span>)}</div>)}
  </div>;
}

function RelationEvidence({ scenario, locale, text, revealed }: { scenario: RepairScenario; locale: "tr" | "en"; text: RepairCopy; revealed: boolean }) {
  return <div className="repair-p5-relation-map">
    <div className="real"><small>{text.observation}</small><strong>{scenario.realOutput?.[locale]}</strong></div>
    <div className={revealed ? "corrected" : "broken"}><small>{revealed ? text.fixed : text.simulation}</small><strong>{revealed ? scenario.fixedOutput[locale] : scenario.brokenOutput[locale]}</strong></div>
  </div>;
}

function CapacityEvidence({ scenario, locale, text, revealed }: { scenario: RepairScenario; locale: "tr" | "en"; text: RepairCopy; revealed: boolean }) {
  const real = scenario.realSeries!, model = scenario.modelSeries!, fixed = scenario.fixedSeries!;
  const shownModel = revealed ? fixed : model;
  const labels = axisLabels(scenario.axis?.[locale] ?? "", real.length);
  return <div className="repair-p5-capacity repair-p5-series-table" style={{ "--timeline-columns": real.length } as React.CSSProperties}>
    <strong className="repair-p5-evidence-title">{scenario.evidenceTitle?.[locale]}</strong>
    <div className="repair-p5-timeline-labels"><i />{labels.map((label) => <span key={label}>{label}</span>)}</div>
    <div className="repair-p5-timeline-row real"><b>{text.observation}</b>{real.map((value, index) => <span key={`real-${index}`}>{value}</span>)}</div>
    <div className={`repair-p5-timeline-row ${revealed ? "corrected" : "broken"}`}><b>{revealed ? text.fixed : text.simulation}</b>{shownModel.map((value, index) => <span key={`model-${index}`}>{value}</span>)}</div>
  </div>;
}

function DiagnosticVisual({ scenario, locale, text }: { scenario: RepairScenario; locale: "tr" | "en"; text: RepairCopy }) {
  if (scenario.evidenceKind === "equation") return <EquationEvidence scenario={scenario} locale={locale} />;
  if (scenario.evidenceKind === "timeline") return <TimelineEvidence scenario={scenario} locale={locale} text={text} revealed={false} />;
  if (scenario.evidenceKind === "relation") return <RelationEvidence scenario={scenario} locale={locale} text={text} revealed={false} />;
  if (scenario.evidenceKind === "capacity") return <CapacityEvidence scenario={scenario} locale={locale} text={text} revealed={false} />;
  return null;
}

function RepairEvidence({ scenario, phase, selected, locale, text, onRepair }: { scenario: RepairScenario; phase: "repair" | "result"; selected?: string; locale: "tr" | "en"; text: RepairCopy; onRepair: (tokenId: string) => void }) {
  const revealed = phase === "result", correct = selected ? repairIsCorrect(scenario, selected) : false;
  if (scenario.diagnosis === "verification") {
    return <div className="repair-p5-equation" aria-label={revealed ? scenario.fixedOutput[locale] : scenario.brokenOutput[locale]}>{scenario.tokens.map((token) => {
      const chosen = selected === token.id, target = token.id === scenario.correctTokenId;
      const className = revealed && target ? "correct-token" : revealed && chosen && !correct ? "wrong-token" : "";
      return <button type="button" key={token.id} className={className} disabled={revealed} aria-pressed={chosen} aria-label={token.label[locale]} onClick={() => onRepair(token.id)}><span>{revealed ? token.fixed[locale] : token.label[locale]}</span>{revealed && target && <CheckCircle2 aria-hidden="true" />}{revealed && chosen && !correct && <X aria-hidden="true" />}</button>;
    })}<b aria-hidden="true">=</b><strong>{equationResult(revealed ? scenario.fixedOutput[locale] : scenario.brokenOutput[locale])}</strong></div>;
  }
  return <div className="repair-p5-model-repair">
    {scenario.evidenceKind === "timeline" && <TimelineEvidence scenario={scenario} locale={locale} text={text} revealed={revealed} />}
    {scenario.evidenceKind === "relation" && <RelationEvidence scenario={scenario} locale={locale} text={text} revealed={revealed} />}
    {scenario.evidenceKind === "capacity" && <CapacityEvidence scenario={scenario} locale={locale} text={text} revealed={revealed} />}
    <div className="repair-p5-token-cards">{scenario.tokens.map((token) => {
      const chosen = selected === token.id, target = token.id === scenario.correctTokenId;
      const className = revealed && target ? "correct-token" : revealed && chosen && !correct ? "wrong-token" : "";
      return <button type="button" key={token.id} className={className} disabled={revealed} aria-pressed={chosen} onClick={() => onRepair(token.id)}>{revealed ? token.fixed[locale] : token.label[locale]}{revealed && target && <CheckCircle2 aria-hidden="true" />}{revealed && chosen && !correct && <X aria-hidden="true" />}</button>;
    })}</div>
  </div>;
}

function Evidence({ scenario, phase, selected, locale, text, onRepair }: { scenario: RepairScenario; phase: Phase; selected?: string; locale: "tr" | "en"; text: RepairCopy; onRepair: (tokenId: string) => void }) {
  const diagnosing = phase === "diagnosis" || phase === "diagnosis-feedback";
  return <div className={`repair-p5-evidence ${diagnosing ? "diagnosing" : "repairing"}`}><Facts scenario={scenario} locale={locale} />{scenario.note && <div className="repair-p5-note">{scenario.note[locale]}</div>}{diagnosing ? <DiagnosticVisual scenario={scenario} locale={locale} text={text} /> : <RepairEvidence scenario={scenario} phase={phase} selected={selected} locale={locale} text={text} onRepair={onRepair} />}</div>;
}

export function Week6SimulationRepair({ seedKey, onSubmit, onDraft, existingSubmission, existingDraft, forceSubmit }: LearningModuleProps & { seedKey: string }) {
  const { locale } = useI18n();
  const text = copy[locale];
  const round = useMemo(() => buildRepairRound(seedKey), [seedKey]);
  const ids = useMemo(() => round.map((scenario) => scenario.id), [round]);
  const initial = useMemo(() => hydrate(existingDraft, round), [existingDraft, round]);
  const legacyDraftSnapshot = useMemo(() => {
    const payload = existingDraft?.payload as DraftPayload | undefined;
    return payload?.gameId === "week-6-simulation-repair-v4" ? payload : undefined;
  }, [existingDraft]);
  const completedCount = initial.filter((item) => item.selectedTokenId).length;
  const [index, setIndex] = useState(Math.min(completedCount, 5));
  const [progress, setProgress] = useState(initial);
  const initialPhase: Phase = initial[completedCount]?.diagnosis ? "repair" : "diagnosis";
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [selected, setSelected] = useState<string>();
  const [completed, setCompleted] = useState(false);
  const [reason, setReason] = useState<"completed" | "teacher-ended">("completed");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const progressRef = useRef(initial), indexRef = useRef(index), phaseRef = useRef<Phase>(initialPhase), diagnosisLocked = useRef(Boolean(initial[completedCount]?.diagnosis)), repairLocked = useRef(false), submitted = useRef(false), done = useRef(false), timers = useRef<number[]>([]);
  const current = round[index]!, record = progress[index];
  const clear = useCallback(() => { timers.current.forEach(window.clearTimeout); timers.current = []; }, []);
  useEffect(() => clear, [clear]);

  const submissionFor = useCallback((nextProgress: RepairProgress[], completionReason: "completed" | "teacher-ended" | "draft"): ModuleSubmission => ({ stage: Math.min(6, indexRef.current + 1), score: scoreRepairProgress(round, nextProgress), payload: { gameId, selectedCaseIds: ids, progress: nextProgress, answeredCount: nextProgress.filter((item) => item.selectedTokenId).length, completionReason, completionStatus: completionReason === "completed" ? "completed" : completionReason === "teacher-ended" ? "incomplete" : "draft", ...(legacyDraftSnapshot ? { legacyDraftSnapshot } : {}) } }), [ids, legacyDraftSnapshot, round]);
  const save = useCallback((nextProgress = progressRef.current) => { void onDraft?.(submissionFor(nextProgress, "draft")); }, [onDraft, submissionFor]);
  const send = useCallback(async (submission: ModuleSubmission) => { setSubmitting(true); setFailed(false); if (await onSubmit(submission) === false) { submitted.current = false; setFailed(true); } setSubmitting(false); }, [onSubmit]);
  const finish = useCallback((completionReason: "completed" | "teacher-ended") => { if (submitted.current || existingSubmission) return; clear(); submitted.current = true; done.current = true; setCompleted(true); setReason(completionReason); const submission = submissionFor(progressRef.current, completionReason); setFinalSubmission(submission); void send(submission); }, [clear, existingSubmission, send, submissionFor]);
  useEffect(() => { if (completedCount === 6 && !existingSubmission) finish("completed"); }, [completedCount, existingSubmission, finish]);
  useEffect(() => { if (forceSubmit && !done.current && !existingSubmission) finish("teacher-ended"); }, [existingSubmission, finish, forceSubmit]);
  useEffect(() => { const flush = () => { if (!done.current && !existingSubmission) save(); }; addEventListener("pagehide", flush); return () => removeEventListener("pagehide", flush); }, [existingSubmission, save]);

  const diagnose = (diagnosis: Diagnosis) => {
    if (phaseRef.current !== "diagnosis" || diagnosisLocked.current || record?.diagnosis) return;
    diagnosisLocked.current = true;
    const next = [...progressRef.current];
    next[indexRef.current] = { caseId: current.id, diagnosis };
    progressRef.current = next; setProgress(next); phaseRef.current = "diagnosis-feedback"; setPhase("diagnosis-feedback"); save(next);
    timers.current.push(window.setTimeout(() => { if (done.current) return; phaseRef.current = "repair"; setPhase("repair"); }, 800));
  };
  const repair = (tokenId: string) => {
    if (phaseRef.current !== "repair" || repairLocked.current || progressRef.current[indexRef.current]?.selectedTokenId || !current.tokens.some((token) => token.id === tokenId)) return;
    repairLocked.current = true;
    const next = [...progressRef.current];
    next[indexRef.current] = { ...progressRef.current[indexRef.current]!, selectedTokenId: tokenId };
    progressRef.current = next; setProgress(next); setSelected(tokenId); phaseRef.current = "result"; setPhase("result"); save(next);
    const delay = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1600 : 1800;
    timers.current.push(window.setTimeout(() => { if (indexRef.current >= 5) { finish("completed"); return; } indexRef.current += 1; setIndex(indexRef.current); phaseRef.current = "diagnosis"; setPhase("diagnosis"); setSelected(undefined); diagnosisLocked.current = false; repairLocked.current = false; save(next); }, delay));
  };

  if (existingSubmission && !completed) return <section className="panel module-shell simulation-repair-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  if (completed) return <section className="panel module-shell simulation-repair-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><Sparkles size={42} /><h2>{reason === "completed" ? text.completed : text.partial}</h2><p>{text.detail}</p>{submitting && <div className="notice">{text.saving}</div>}{failed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void send(finalSubmission)}>{text.retry}</Button></>}</div></section>;

  const repairCorrect = selected ? repairIsCorrect(current, selected) : false;
  const diagnosisCorrect = record?.diagnosis === current.diagnosis;
  const correctToken = current.tokens.find((token) => token.id === current.correctTokenId);
  const correctDiagnosis = current.diagnosis === "verification" ? text.verification : text.validation;
  const selectedDiagnosis = record?.diagnosis === "verification" ? text.verification : text.validation;

  return <section className="panel module-shell simulation-repair-shell repair-p5-shell">
    <header className="simulation-repair-header"><span className="module-title-chip">{text.title}</span><div><span>{text.case} <b>{index + 1}/6</b></span><span>{text.score} <b>{scoreRepairProgress(round, progress)}</b></span></div></header>
    <div className="simulation-repair-progress" role="progressbar" aria-valuemin={1} aria-valuemax={6} aria-valuenow={index + 1}>{round.map((scenario, scenarioIndex) => <i aria-hidden="true" key={scenario.id} className={progress[scenarioIndex]?.selectedTokenId ? "done" : scenarioIndex === index ? "active" : ""} />)}</div>
    <div className="repair-p5-heading"><h2>{current.title[locale]}</h2><p>{current.context[locale]}</p></div>
    <Evidence scenario={current} phase={phase} selected={selected} locale={locale} text={text} onRepair={repair} />
    <div className="repair-p5-active">
      {phase === "diagnosis" && <><strong>{text.prompt}</strong><div className="repair-p5-diagnosis"><button type="button" onClick={() => diagnose("verification")}><Activity aria-hidden="true" /><span><b>{text.verification}</b><small>{text.verificationHint}</small></span></button><button type="button" onClick={() => diagnose("validation")}><ShieldCheck aria-hidden="true" /><span><b>{text.validation}</b><small>{text.validationHint}</small></span></button></div></>}
      {phase === "diagnosis-feedback" && <div className={`repair-p5-diagnosis-feedback ${diagnosisCorrect ? "correct" : "wrong"}`} role="status" aria-live="assertive" aria-atomic="true">{diagnosisCorrect ? <CheckCircle2 aria-hidden="true" /> : <X aria-hidden="true" />}<span><b>{diagnosisCorrect ? text.correctDiagnosis : text.wrongDiagnosis}</b><small>{text.yourChoice}: {selectedDiagnosis}{!diagnosisCorrect && <> · {text.correctAnswer}: {correctDiagnosis}</>}</small></span></div>}
      {phase === "repair" && <strong>{text.repairPrompt}</strong>}
      {phase === "result" && <div className={`repair-p5-result ${repairCorrect ? "correct" : "wrong"}`} role="status" aria-live="polite" aria-atomic="true">{repairCorrect ? <CheckCircle2 aria-hidden="true" /> : <X aria-hidden="true" />}<span><b>{repairCorrect ? text.correct : text.wrong}</b><small>{text.correctPart}: {correctToken?.label[locale]} → {correctToken?.fixed[locale]} · {text.auto}</small></span></div>}
    </div>
  </section>;
}
