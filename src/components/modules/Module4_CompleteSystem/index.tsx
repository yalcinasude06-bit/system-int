"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Check, ImageIcon, LockKeyhole, MousePointer2, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import type { LearningModuleProps, ModuleSubmission } from "@/types";

type SystemType = {
  id: string;
  name: string;
  visual: string;
  icon: string;
  description: string;
  color: string;
};

type MatchAnswer = {
  systemId: string;
  visualId: string;
  firstAttemptCorrect: boolean;
};

type ConnectionLine = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
};

const systemTypes: SystemType[] = [
  { id: "natural", name: "Doğal Sistem", visual: "Akarsu ve doğal vadi", icon: "🏞️", description: "Sistem insan müdahalesi olmadan doğal yollarla oluşmuştur.", color: "#38bdf8" },
  { id: "human-made", name: "İnsan Yapımı Sistem", visual: "Büyük bir baraj", icon: "🌊", description: "İnsan tarafından tasarlanmış ve inşa edilmiştir.", color: "#818cf8" },
  { id: "static", name: "Statik Sistem", visual: "Üzerinde araç olmayan boş köprü", icon: "🌉", description: "Yapı faaliyetsizdir ve durumunu korur.", color: "#94a3b8" },
  { id: "dynamic", name: "Dinamik Sistem", visual: "Çalışan bir fabrika üretim hattı", icon: "🏭", description: "Makineler ve akış sürekli hareket ve değişim içindedir.", color: "#f59e0b" },
  { id: "closed", name: "Kapalı Sistem", visual: "Mühürlü deney kapsülü / cam fanus", icon: "🔬", description: "Dış ortamla madde ve enerji alışverişi yoktur.", color: "#a78bfa" },
  { id: "open", name: "Açık Sistem", visual: "Güneş ve su alan canlı bitki", icon: "🌱", description: "Çevresiyle sürekli madde ve enerji alışverişi yapar.", color: "#34d399" },
  { id: "deterministic", name: "Deterministik Sistem", visual: "Birbirine bağlı metal dişli çarklar", icon: "⚙️", description: "Bir parçanın hareketi diğerini kesin biçimde belirler.", color: "#64748b" },
  { id: "stochastic", name: "Stokastik Sistem", visual: "Havaya atılmış iki zar", icon: "🎲", description: "Sonuç önceden kesin bilinemez, olasılığa bağlıdır.", color: "#f472b6" },
  { id: "physical", name: "Fiziksel Sistem", visual: "Gerçek metal bir çaydanlık", icon: "🫖", description: "Maddi varlığı olan ve fiziksel olarak görülebilen sistemdir.", color: "#fb923c" },
  { id: "conceptual", name: "Kavramsal Sistem", visual: "Mimarî teknik çizim / blueprint planı", icon: "📐", description: "Fiziksel nesne değil, düşünce ve planın sembollerle gösterimidir.", color: "#60a5fa" },
];

const visualOrder = ["stochastic", "open", "human-made", "conceptual", "dynamic", "natural", "physical", "closed", "deterministic", "static"];
const visualCards = visualOrder.map((id) => systemTypes.find((item) => item.id === id)!);
const pointsPerMatch = 100 / systemTypes.length;

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function Module4CompleteSystem({ onSubmit, existingSubmission }: LearningModuleProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [mistakeTypes, setMistakeTypes] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<MatchAnswer[]>([]);
  const [wrongVisual, setWrongVisual] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [lastMatch, setLastMatch] = useState<SystemType | null>(null);
  const [lines, setLines] = useState<ConnectionLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const interactionLocked = useRef(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const typeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const visualRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const updateLines = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const boardRect = board.getBoundingClientRect();
    const nextLines = Object.keys(matches).flatMap((id) => {
      const typeNode = typeRefs.current[id];
      const visualNode = visualRefs.current[id];
      const system = systemTypes.find((item) => item.id === id);
      if (!typeNode || !visualNode || !system) return [];
      const typeRect = typeNode.getBoundingClientRect();
      const visualRect = visualNode.getBoundingClientRect();
      return [{
        id,
        x1: typeRect.right - boardRect.left,
        y1: typeRect.top + typeRect.height / 2 - boardRect.top,
        x2: visualRect.left - boardRect.left,
        y2: visualRect.top + visualRect.height / 2 - boardRect.top,
        color: system.color,
      }];
    });
    setLines(nextLines);
  }, [matches]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(updateLines);
    const observer = new ResizeObserver(updateLines);
    if (boardRef.current) observer.observe(boardRef.current);
    window.addEventListener("resize", updateLines);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", updateLines);
    };
  }, [updateLines]);

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true);
    setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) setSubmitFailed(true);
  }, [onSubmit]);

  function selectType(id: string) {
    if (busy || completed || matches[id]) return;
    setSelectedType(id);
    setFeedback(null);
  }

  const selectVisual = useCallback(async (visualId: string) => {
    if (interactionLocked.current || busy || completed || matches[visualId]) return;
    if (!selectedType) {
      setWrongVisual(visualId);
      setFeedback({ correct: false, text: "Önce soldan bir sistem türü seç, ardından onu temsil eden görsele dokun." });
      window.setTimeout(() => setWrongVisual(null), 560);
      return;
    }

    interactionLocked.current = true;
    if (visualId !== selectedType) {
      setBusy(true);
      setMistakeTypes((current) => new Set(current).add(selectedType));
      setWrongVisual(visualId);
      setFeedback({ correct: false, text: "Bu görsel seçtiğin sistem türünü temsil etmiyor. Doğru eşleşme gösterilmedi; yeniden deneyebilirsin." });
      await delay(650);
      setWrongVisual(null);
      setBusy(false);
      interactionLocked.current = false;
      return;
    }

    const system = systemTypes.find((item) => item.id === selectedType)!;
    const answer: MatchAnswer = { systemId: selectedType, visualId, firstAttemptCorrect: !mistakeTypes.has(selectedType) };
    const nextAnswers = [...answers, answer];
    const nextMatches = { ...matches, [selectedType]: visualId };
    setAnswers(nextAnswers);
    setMatches(nextMatches);
    setLastMatch(system);
    setFeedback({ correct: true, text: `${system.name} ile “${system.visual}” doğru eşleşti.` });
    setSelectedType(null);

    if (Object.keys(nextMatches).length === systemTypes.length) {
      const firstTryCount = nextAnswers.filter((item) => item.firstAttemptCorrect).length;
      const submission: ModuleSubmission = {
        score: Math.round(firstTryCount * pointsPerMatch),
        payload: {
          mode: "system-type-visual-matching",
          answers: nextAnswers,
          firstTryCorrectCount: firstTryCount,
          matchCount: systemTypes.length,
          pointsPerMatch,
        },
      };
      setBusy(true);
      await delay(620);
      setFinalSubmission(submission);
      setCompleted(true);
      setBusy(false);
      await submitResult(submission);
      return;
    }

    interactionLocked.current = false;
  }, [answers, busy, completed, matches, mistakeTypes, selectedType, submitResult]);

  if (existingSubmission) {
    return <section className="panel module-shell matching-module-shell">
      <div className="module-title-chip">Modül 4: Sistem Türleri</div>
      <div className="module-complete-card"><LockKeyhole size={42} /><h2>Bu modül tamamlandı</h2><p>Yanıtın kilitlendi. Öğretmen sonuçları açıklayana kadar bekleyin.</p></div>
    </section>;
  }

  return <section className="panel module-shell matching-module-shell">
    <div className="module-topline matching-topline">
      <div><div className="module-title-chip">Modül 4: Sistem Türleri ve Görsel Eşleştirme</div><p>Önce sistem türünü, sonra onu temsil eden görsel kartı seç.</p></div>
      <strong>{Object.keys(matches).length} / {systemTypes.length} Eşleşme</strong>
    </div>

    <div className="matching-instruction"><MousePointer2 size={19} /><span><b>1.</b> Soldan türü seç</span><span><b>2.</b> Sağdan görsele dokun</span></div>

    <div className="matching-board" ref={boardRef}>
      <svg className="matching-lines" aria-hidden="true">
        {lines.map((line) => <g key={line.id}><path d={`M ${line.x1} ${line.y1} C ${line.x1 + 28} ${line.y1}, ${line.x2 - 28} ${line.y2}, ${line.x2} ${line.y2}`} stroke={line.color} /><circle cx={line.x1} cy={line.y1} r="4" fill={line.color} /><circle cx={line.x2} cy={line.y2} r="4" fill={line.color} /></g>)}
      </svg>

      <div className="system-type-list">
        <h2>Sistem Türleri</h2>
        {systemTypes.map((system, index) => {
          const matched = Boolean(matches[system.id]);
          return <button
            type="button"
            key={system.id}
            ref={(node) => { typeRefs.current[system.id] = node; }}
            className={`${selectedType === system.id ? "selected" : ""} ${matched ? "matched" : ""}`}
            disabled={busy || matched}
            onClick={() => selectType(system.id)}
          ><span>{index + 1}</span><strong>{system.name}</strong>{matched && <Check size={18} />}</button>;
        })}
      </div>

      <div className="matching-track" aria-hidden="true"><span>BAĞLA</span></div>

      <div className="system-visual-list">
        <h2>Temsili Görseller</h2>
        {visualCards.map((system) => {
          const matched = Boolean(matches[system.id]);
          return <button
            type="button"
            key={system.id}
            ref={(node) => { visualRefs.current[system.id] = node; }}
            className={`${wrongVisual === system.id ? "wrong" : ""} ${matched ? "matched" : ""}`}
            disabled={busy || matched}
            onClick={() => void selectVisual(system.id)}
            aria-label={system.visual}
          ><span className="visual-illustration" aria-hidden="true">{system.icon}</span><span><ImageIcon size={14} /><strong>{system.visual}</strong></span>{matched && <i><Check size={17} /></i>}</button>;
        })}
      </div>
    </div>

    <div className="matching-feedback-space" aria-live="assertive">
      {feedback && <div className={`matching-feedback ${feedback.correct ? "correct" : "wrong"}`}>{feedback.correct ? <Check size={20} /> : <X size={20} />}<span>{feedback.text}</span></div>}
      {lastMatch && feedback?.correct && <div className="match-explanation"><Sparkles size={19} /><p><strong>Neden?</strong> {lastMatch.description}</p></div>}
    </div>

    <p className="score-privacy-note">Her eşleşme 10 puan değerindedir. Puanlar sonuçlar açıklanana kadar gizli tutulur.</p>

    {completed && <div className="modal-backdrop matching-result-backdrop" role="presentation">
      <div className="modal matching-result-modal" role="dialog" aria-modal="true" aria-labelledby="matching-result-title">
        <span className="matching-result-icon"><Check size={42} /></span>
        <span className="eyebrow">10 / 10 Eşleşme</span>
        <h2 id="matching-result-title">Tüm sistem türlerini eşleştirdin!</h2>
        <p>Yanıtların kilitlendi. Puanın, öğretmen sonuçları açtığında görünecek.</p>
        {submitting && <div className="notice">Yanıt kaydediliyor…</div>}
        {submitFailed && finalSubmission && <><div className="notice error">Yanıt kaydedilemedi. Eşleşmelerin korundu.</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>Kaydı tekrar dene</Button></>}
      </div>
    </div>}
  </section>;
}
