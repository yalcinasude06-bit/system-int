"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Check, LockKeyhole, MousePointer2, RotateCcw, Sparkles, Unlink, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import type { LearningModuleProps, ModuleSubmission } from "@/types";
import { SystemTypeIllustration } from "./SystemTypeIllustration";

type SystemType = {
  id: string;
  name: string;
  visual: string;
  description: string;
  color: string;
};

type ConnectionLine = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  status: "pending" | "correct" | "wrong";
};

const systemTypes: SystemType[] = [
  { id: "natural", name: "Doğal Sistem", visual: "Akarsu ve doğal vadi", description: "Sistem insan müdahalesi olmadan doğal yollarla oluşmuştur.", color: "#38bdf8" },
  { id: "human-made", name: "İnsan Yapımı Sistem", visual: "Büyük beton baraj", description: "İnsan tarafından tasarlanmış ve inşa edilmiştir.", color: "#818cf8" },
  { id: "static", name: "Statik Sistem", visual: "Üzerinde araç olmayan boş köprü", description: "Yapı faaliyetsizdir ve durumunu korur.", color: "#94a3b8" },
  { id: "dynamic", name: "Dinamik Sistem", visual: "Çalışan fabrika robotları ve montaj hattı", description: "Makineler ve akış sürekli hareket ve değişim içindedir.", color: "#f59e0b" },
  { id: "closed", name: "Kapalı Sistem", visual: "Mühürlü cam deney kapsülü", description: "Dış ortamla madde ve enerji alışverişi yoktur.", color: "#a78bfa" },
  { id: "open", name: "Açık Sistem", visual: "Güneş ve su alan canlı bitki", description: "Çevresiyle sürekli madde ve enerji alışverişi yapar.", color: "#34d399" },
  { id: "deterministic", name: "Deterministik Sistem", visual: "Kenetlenmiş metal dişli mekanizması", description: "Bir parçanın hareketi diğerini kesin biçimde belirler.", color: "#64748b" },
  { id: "stochastic", name: "Stokastik Sistem", visual: "Havaya atılmış iki oyun zarı", description: "Sonuç önceden kesin bilinemez, olasılığa bağlıdır.", color: "#f472b6" },
  { id: "physical", name: "Fiziksel Sistem", visual: "Gerçek metal çaydanlık", description: "Maddi varlığı olan ve fiziksel olarak görülebilen sistemdir.", color: "#fb923c" },
  { id: "conceptual", name: "Kavramsal Sistem", visual: "Mimari blueprint planı", description: "Fiziksel nesne değil, düşünce ve planın sembollerle gösterimidir.", color: "#60a5fa" },
];

const visualOrder = ["stochastic", "open", "human-made", "conceptual", "dynamic", "natural", "physical", "closed", "deterministic", "static"];
const visualCards = visualOrder.map((id) => systemTypes.find((item) => item.id === id)!);
const pointsPerMatch = 100 / systemTypes.length;

export function Module4CompleteSystem({ onSubmit, existingSubmission }: LearningModuleProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [lines, setLines] = useState<ConnectionLine[]>([]);
  const [evaluated, setEvaluated] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const typeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const visualRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const updateLines = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const boardRect = board.getBoundingClientRect();
    const nextLines = Object.entries(matches).flatMap(([typeId, visualId]) => {
      const typeNode = typeRefs.current[typeId];
      const visualNode = visualRefs.current[visualId];
      const system = systemTypes.find((item) => item.id === typeId);
      if (!typeNode || !visualNode || !system) return [];
      const typeRect = typeNode.getBoundingClientRect();
      const visualRect = visualNode.getBoundingClientRect();
      return [{
        id: typeId,
        x1: typeRect.right - boardRect.left,
        y1: typeRect.top + typeRect.height / 2 - boardRect.top,
        x2: visualRect.left - boardRect.left,
        y2: visualRect.top + visualRect.height / 2 - boardRect.top,
        color: system.color,
        status: evaluated ? typeId === visualId ? "correct" as const : "wrong" as const : "pending" as const,
      }];
    });
    setLines(nextLines);
  }, [evaluated, matches]);

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
    if (evaluated) return;
    setSelectedType((current) => current === id ? null : id);
    setFeedback("");
  }

  function assignVisual(visualId: string) {
    if (evaluated) return;
    if (!selectedType) {
      setFeedback("Önce soldan bir sistem türü seçmelisin.");
      return;
    }
    setMatches((current) => {
      const next = { ...current };
      for (const [typeId, assignedVisual] of Object.entries(next)) {
        if (assignedVisual === visualId && typeId !== selectedType) delete next[typeId];
      }
      next[selectedType] = visualId;
      return next;
    });
    setSelectedType(null);
    setFeedback("Bağlantı kuruldu. Kontrol etmeden önce istediğin eşleşmeyi değiştirebilirsin.");
  }

  async function evaluate() {
    if (evaluated || Object.keys(matches).length !== systemTypes.length) return;
    const totalCorrect = systemTypes.filter((system) => matches[system.id] === system.id).length;
    const submission: ModuleSubmission = {
      score: Math.round(totalCorrect * pointsPerMatch),
      payload: {
        mode: "system-type-visual-batch-matching",
        matches,
        correctCount: totalCorrect,
        matchCount: systemTypes.length,
        pointsPerMatch,
      },
    };
    setCorrectCount(totalCorrect);
    setFinalSubmission(submission);
    setEvaluated(true);
    await submitResult(submission);
  }

  if (existingSubmission && !evaluated) {
    return <section className="panel module-shell matching-module-shell">
      <div className="module-title-chip">Modül 4: Sistem Türleri</div>
      <div className="module-complete-card"><LockKeyhole size={42} /><h2>Bu modül tamamlandı</h2><p>Yanıtın kilitlendi. Öğretmen sonuçları açıklayana kadar bekleyin.</p></div>
    </section>;
  }

  const wrongSystems = evaluated ? systemTypes.filter((system) => matches[system.id] !== system.id) : [];

  return <section className="panel module-shell matching-module-shell">
    <div className="module-topline matching-topline">
      <div><div className="module-title-chip">Modül 4: Sistem Türleri ve Görsel Eşleştirme</div><p>Önce soldaki türü, sonra sağdaki yazısız illüstrasyonu seç. Kontrol etmeden önce bağlantıları değiştirebilirsin.</p></div>
      <strong>{Object.keys(matches).length} / {systemTypes.length} Eşleşme</strong>
    </div>

    <div className="matching-instruction"><MousePointer2 size={19} /><span><b>1.</b> Türü seç</span><span><b>2.</b> Görsele dokun</span><span><b>3.</b> Toplu kontrol et</span></div>

    <div className="matching-board visual-only-board" ref={boardRef}>
      <svg className="matching-lines" aria-hidden="true">
        {lines.map((line) => {
          const stroke = line.status === "correct" ? "#10b981" : line.status === "wrong" ? "#f43f5e" : line.color;
          const middleX = (line.x1 + line.x2) / 2;
          const middleY = (line.y1 + line.y2) / 2;
          return <g key={line.id} className={`match-line-${line.status}`}>
            <path d={`M ${line.x1} ${line.y1} C ${line.x1 + 28} ${line.y1}, ${line.x2 - 28} ${line.y2}, ${line.x2} ${line.y2}`} stroke={stroke} />
            <circle cx={line.x1} cy={line.y1} r="4" fill={stroke} /><circle cx={line.x2} cy={line.y2} r="4" fill={stroke} />
            {line.status !== "pending" && <g transform={`translate(${middleX} ${middleY})`}><circle r="11" fill={stroke} /><text textAnchor="middle" dominantBaseline="central">{line.status === "correct" ? "✓" : "×"}</text></g>}
          </g>;
        })}
      </svg>

      <div className="system-type-list">
        <h2>Sistem Türleri</h2>
        {systemTypes.map((system, index) => {
          const assigned = matches[system.id];
          const status = evaluated ? assigned === system.id ? "correct" : "wrong" : "";
          return <div className={`system-type-entry ${status}`} key={system.id}>
            <button
              type="button"
              ref={(node) => { typeRefs.current[system.id] = node; }}
              className={`${selectedType === system.id ? "selected" : ""} ${assigned ? "assigned" : ""} ${status}`}
              disabled={evaluated}
              onClick={() => selectType(system.id)}
            ><span>{index + 1}</span><strong>{system.name}</strong>{assigned && !evaluated && <i aria-hidden="true"><Unlink size={15} /></i>}{status === "correct" && <Check size={18} />}{status === "wrong" && <X size={18} />}</button>
            {status === "wrong" && <div className="type-result-explanation"><strong>Doğru görsel:</strong> {system.visual}. {system.description}</div>}
          </div>;
        })}
      </div>

      <div className="matching-track" aria-hidden="true"><span>BAĞLA</span></div>

      <div className="system-visual-list visual-only-list">
        <h2>Görseller</h2>
        {visualCards.map((system) => {
          const assignedType = Object.entries(matches).find(([, visualId]) => visualId === system.id)?.[0];
          const status = evaluated && assignedType ? assignedType === system.id ? "correct" : "wrong" : "";
          return <button
            type="button"
            key={system.id}
            ref={(node) => { visualRefs.current[system.id] = node; }}
            className={`${assignedType ? "assigned" : ""} ${status}`}
            disabled={evaluated}
            onClick={() => assignVisual(system.id)}
            aria-label={system.visual}
          ><SystemTypeIllustration type={system.id} />{assignedType && !evaluated && <i aria-hidden="true">●</i>}{status === "correct" && <i><Check size={17} /></i>}{status === "wrong" && <i><X size={17} /></i>}</button>;
        })}
      </div>
    </div>

    {feedback && !evaluated && <div className="matching-feedback neutral" aria-live="polite">{feedback}</div>}
    <div className="button-row matching-actions"><Button disabled={evaluated || Object.keys(matches).length !== systemTypes.length} loading={submitting} icon={<Check size={18} />} onClick={() => void evaluate()}>Eşleştirmeleri Kontrol Et</Button></div>
    {!evaluated && Object.keys(matches).length !== systemTypes.length && <p className="score-privacy-note">Kontrol için 10 bağlantıyı da tamamla. Her doğru eşleşme 10 puandır.</p>}

    {evaluated && <div className="modal-backdrop matching-result-backdrop" role="presentation">
      <div className="modal matching-result-modal" role="dialog" aria-modal="true" aria-labelledby="matching-result-title">
        <span className="matching-result-icon"><Sparkles size={39} /></span>
        <span className="eyebrow">10 / 10 Eşleşme Kontrol Edildi</span>
        <h2 id="matching-result-title">Eşleştirmelerin kaydedildi</h2>
        <p>{correctCount} doğru eşleşme yaptın. Puanın, öğretmen sonuçları açtığında görünecek.</p>
        {wrongSystems.length > 0 && <div className="matching-modal-explanations">{wrongSystems.map((system) => <div key={system.id}><strong>{system.name}</strong><span>Doğru görsel: {system.visual}</span><p>{system.description}</p></div>)}</div>}
        {submitting && <div className="notice">Yanıt kaydediliyor…</div>}
        {submitFailed && finalSubmission && <><div className="notice error">Yanıt kaydedilemedi. Eşleşmelerin korundu.</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>Kaydı tekrar dene</Button></>}
      </div>
    </div>}
  </section>;
}
