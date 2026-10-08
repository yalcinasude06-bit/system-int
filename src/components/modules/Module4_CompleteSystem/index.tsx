"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, LockKeyhole, RotateCcw, Sparkles, Unlink, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import type { LearningModuleProps, ModuleSubmission } from "@/types";
import { SystemTypeIllustration } from "./SystemTypeIllustration";

type SystemType = {
  id: string;
  name: string;
  visual: string;
  visualLabel: string;
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

type MatchPointerDrag = { typeId: string; pointerId: number; x: number; y: number; startX: number; startY: number; moved: boolean };

const systemTypes: SystemType[] = [
  { id: "natural", name: "Doğal Sistem", visual: "Akarsu ve doğal vadi", visualLabel: "Akarsu", description: "Sistem insan müdahalesi olmadan doğal yollarla oluşmuştur.", color: "#38bdf8" },
  { id: "human-made", name: "İnsan Yapımı Sistem", visual: "Büyük beton baraj", visualLabel: "Baraj", description: "İnsan tarafından tasarlanmış ve inşa edilmiştir.", color: "#818cf8" },
  { id: "static", name: "Statik Sistem", visual: "Üzerinde araç olmayan boş köprü", visualLabel: "Boş Köprü", description: "Yapı faaliyetsizdir ve durumunu korur.", color: "#94a3b8" },
  { id: "dynamic", name: "Dinamik Sistem", visual: "Çalışan fabrika robotları ve montaj hattı", visualLabel: "Fabrika", description: "Makineler ve akış sürekli hareket ve değişim içindedir.", color: "#f59e0b" },
  { id: "closed", name: "Kapalı Sistem", visual: "Mühürlü cam deney kapsülü", visualLabel: "Cam Kapsül", description: "Dış ortamla madde ve enerji alışverişi yoktur.", color: "#a78bfa" },
  { id: "open", name: "Açık Sistem", visual: "Güneş ve su alan canlı bitki", visualLabel: "Canlı Bitki", description: "Çevresiyle sürekli madde ve enerji alışverişi yapar.", color: "#34d399" },
  { id: "deterministic", name: "Deterministik Sistem", visual: "Kenetlenmiş metal dişli mekanizması", visualLabel: "Dişli Mekanizması", description: "Bir parçanın hareketi diğerini kesin biçimde belirler.", color: "#64748b" },
  { id: "stochastic", name: "Stokastik Sistem", visual: "Havaya atılmış iki oyun zarı", visualLabel: "Oyun Zarları", description: "Sonuç önceden kesin bilinemez, olasılığa bağlıdır.", color: "#f472b6" },
  { id: "physical", name: "Fiziksel Sistem", visual: "Gerçek metal çaydanlık", visualLabel: "Çaydanlık", description: "Maddi varlığı olan ve fiziksel olarak görülebilen sistemdir.", color: "#fb923c" },
  { id: "conceptual", name: "Kavramsal Sistem", visual: "Mimari blueprint planı", visualLabel: "Sistem Planı", description: "Fiziksel nesne değil, düşünce ve planın sembollerle gösterimidir.", color: "#60a5fa" },
];

const visualOrder = ["stochastic", "open", "human-made", "conceptual", "dynamic", "natural", "physical", "closed", "deterministic", "static"];
const systemRounds = [systemTypes.slice(0, 5), systemTypes.slice(5)];
const systemRoundIds = systemRounds.map((round) => round.map((system) => system.id));
const pointsPerMatch = 100 / systemTypes.length;

function submissionForMatches(finalMatches: Record<string, string>, completionReason: "completed" | "teacher-ended" | "draft"): ModuleSubmission {
  const totalCorrect = systemTypes.filter((system) => finalMatches[system.id] === system.id).length;
  return {
    score: Math.round(totalCorrect * pointsPerMatch),
    payload: {
      mode: "system-type-visual-batch-matching",
      matches: finalMatches,
      correctCount: totalCorrect,
      answeredCount: Object.keys(finalMatches).length,
      matchCount: systemTypes.length,
      pointsPerMatch,
      completionReason,
    },
  };
}

export function Module4CompleteSystem({ onSubmit, onDraft, existingSubmission, forceSubmit }: LearningModuleProps) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<ConnectionLine[]>([]);
  const [evaluated, setEvaluated] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const [pointerDrag, setPointerDrag] = useState<MatchPointerDrag | null>(null);
  const [dragOverVisual, setDragOverVisual] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const typeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const visualRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const pointerDragRef = useRef<MatchPointerDrag | null>(null);
  const suppressClickRef = useRef(false);
  const matchesRef = useRef<Record<string, string>>({});
  const submissionStarted = useRef(false);
  const currentSystems = systemRounds[roundIndex];
  const currentSystemIds = systemRoundIds[roundIndex];
  const currentVisualCards = visualOrder
    .filter((id) => currentSystemIds.includes(id))
    .map((id) => systemTypes.find((item) => item.id === id)!);

  const updateLines = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const boardRect = board.getBoundingClientRect();
    const nextLines = Object.entries(matches).filter(([typeId]) => currentSystemIds.includes(typeId)).flatMap(([typeId, visualId]) => {
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
  }, [currentSystemIds, evaluated, matches]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(updateLines);
    const observer = new ResizeObserver(updateLines);
    if (boardRef.current) observer.observe(boardRef.current);
    window.addEventListener("resize", updateLines);
    window.addEventListener("scroll", updateLines, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", updateLines);
      window.removeEventListener("scroll", updateLines);
    };
  }, [updateLines]);

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true);
    setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) setSubmitFailed(true);
  }, [onSubmit]);

  const finalize = useCallback(async (finalMatches: Record<string, string>, completionReason: "completed" | "teacher-ended") => {
    if (submissionStarted.current || existingSubmission) return;
    if (completionReason === "completed" && Object.keys(finalMatches).length !== systemTypes.length) return;
    submissionStarted.current = true;
    const submission = submissionForMatches(finalMatches, completionReason);
    const totalCorrect = Number(submission.payload.correctCount);
    setMatches(finalMatches);
    setCorrectCount(totalCorrect);
    setFinalSubmission(submission);
    setEvaluated(true);
    await submitResult(submission);
  }, [existingSubmission, submitResult]);

  useEffect(() => {
    if (forceSubmit && !evaluated && !existingSubmission) void finalize(matchesRef.current, "teacher-ended");
  }, [evaluated, existingSubmission, finalize, forceSubmit]);

  function selectType(id: string) {
    if (evaluated) return;
    setSelectedType((current) => current === id ? null : id);
  }

  function assignMatch(typeId: string, visualId: string) {
    if (evaluated) return;
    const next = { ...matches };
    for (const [matchedTypeId, assignedVisual] of Object.entries(next)) {
      if (assignedVisual === visualId && matchedTypeId !== typeId) delete next[matchedTypeId];
    }
    next[typeId] = visualId;
    matchesRef.current = next;
    setMatches(next);
    void onDraft?.(submissionForMatches(next, "draft"));
    setSelectedType(null);
    if (roundIndex === 0 && currentSystemIds.every((id) => Boolean(next[id]))) {
      setLines([]);
      setRoundIndex(1);
    }
  }

  function assignVisual(visualId: string) {
    if (!selectedType) return;
    assignMatch(selectedType, visualId);
  }

  function visualTargetAt(x: number, y: number) {
    const target = document.elementFromPoint(x, y) as HTMLElement | null;
    return target?.closest<HTMLElement>("[data-match-visual]")?.dataset.matchVisual || null;
  }

  function resetPointerDrag() {
    pointerDragRef.current = null;
    setPointerDrag(null);
    setDragOverVisual(null);
  }

  function getTypePointerHandlers(typeId: string) {
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (evaluated || event.button !== 0) return;
        const next = { typeId, pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
        pointerDragRef.current = next;
        setPointerDrag(next);
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => {
        const current = pointerDragRef.current;
        if (!current || current.pointerId !== event.pointerId) return;
        event.preventDefault();
        const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 6;
        const next = { ...current, x: event.clientX, y: event.clientY, moved };
        pointerDragRef.current = next;
        setPointerDrag(next);
        setDragOverVisual(moved ? visualTargetAt(event.clientX, event.clientY) : null);
      },
      onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
        const current = pointerDragRef.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const visualId = current.moved ? visualTargetAt(event.clientX, event.clientY) : null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        resetPointerDrag();
        if (!current.moved) return;
        suppressClickRef.current = true;
        window.setTimeout(() => { suppressClickRef.current = false; }, 0);
        if (visualId && currentSystemIds.includes(visualId)) assignMatch(current.typeId, visualId);
      },
      onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (pointerDragRef.current?.pointerId === event.pointerId) resetPointerDrag();
      },
    };
  }

  function consumeSuppressedClick() {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
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
      <div className="module-title-chip">Modül 4: Sistem Türleri ve Görsel Eşleştirme</div>
      <strong>{Object.keys(matches).length} / {systemTypes.length} · Tur {roundIndex + 1} / 2</strong>
    </div>

    <p className="touch-drag-hint"><span aria-hidden="true">☝️</span> Sistem türünü görsele sürükleyin. İsterseniz türü ve ardından görseli seçebilirsiniz.</p>

    <div className="matching-board visual-only-board" ref={boardRef} key={roundIndex}>
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
        {currentSystems.map((system, index) => {
          const assigned = matches[system.id];
          const status = evaluated ? assigned === system.id ? "correct" : "wrong" : "";
          return <div className={`system-type-entry ${status}`} key={system.id}>
            <button
              type="button"
              ref={(node) => { typeRefs.current[system.id] = node; }}
              className={`${selectedType === system.id ? "selected" : ""} ${assigned ? "assigned" : ""} ${status}`}
              disabled={evaluated}
              {...getTypePointerHandlers(system.id)}
              onClick={() => { if (!consumeSuppressedClick()) selectType(system.id); }}
              data-pointer-source={pointerDrag?.typeId === system.id ? "true" : undefined}
            ><span>{index + 1}</span><strong>{system.name}</strong>{assigned && !evaluated && <i aria-hidden="true"><Unlink size={15} /></i>}{status === "correct" && <Check size={18} />}{status === "wrong" && <X size={18} />}</button>
            {status === "wrong" && <div className="type-result-explanation"><strong>Doğru görsel:</strong> {system.visual}. {system.description}</div>}
          </div>;
        })}
      </div>

      <div className="matching-track" aria-hidden="true"><span>BAĞLA</span></div>

      <div className="system-visual-list visual-only-list">
        <h2>Görseller</h2>
        {currentVisualCards.map((system) => {
          const assignedType = Object.entries(matches).find(([, visualId]) => visualId === system.id)?.[0];
          const status = evaluated && assignedType ? assignedType === system.id ? "correct" : "wrong" : "";
          return <button
            type="button"
            key={system.id}
            ref={(node) => { visualRefs.current[system.id] = node; }}
            className={`${assignedType ? "assigned" : ""} ${status} ${dragOverVisual === system.id ? "drag-over" : ""}`}
            disabled={evaluated}
            onClick={() => assignVisual(system.id)}
            aria-label={system.visual}
            data-match-visual={system.id}
          ><SystemTypeIllustration type={system.id} /><span className="system-visual-name">{system.visualLabel}</span>{assignedType && !evaluated && <i aria-hidden="true">●</i>}{status === "correct" && <i><Check size={17} /></i>}{status === "wrong" && <i><X size={17} /></i>}</button>;
        })}
      </div>
    </div>

    {pointerDrag?.moved && <div className="pointer-drag-ghost matching-pointer-ghost" style={{ left: pointerDrag.x, top: pointerDrag.y }} aria-hidden="true">{systemTypes.find((system) => system.id === pointerDrag.typeId)?.name}</div>}

    {roundIndex === 1 && <div className="button-row matching-actions"><Button disabled={evaluated || Object.keys(matches).length !== systemTypes.length} loading={submitting} icon={<Check size={18} />} onClick={() => void finalize(matchesRef.current, "completed")}>Eşleştirmeleri Kontrol Et</Button></div>}

    {evaluated && <div className="modal-backdrop matching-result-backdrop" role="presentation">
      <div className="modal matching-result-modal" role="dialog" aria-modal="true" aria-labelledby="matching-result-title">
        <span className="matching-result-icon"><Sparkles size={39} /></span>
        <span className="eyebrow">{Object.keys(matches).length} / 10 Eşleşme Kaydedildi</span>
        <h2 id="matching-result-title">{Object.keys(matches).length === systemTypes.length ? "Eşleştirmelerin kaydedildi" : "Kısmi eşleştirmelerin kaydediliyor"}</h2>
        <p>{correctCount} doğru eşleşme yaptın. Puanın, öğretmen sonuçları açtığında görünecek.</p>
        {wrongSystems.length > 0 && <div className="matching-modal-explanations">{wrongSystems.map((system) => <div key={system.id}><strong>{system.name}</strong><span>Doğru görsel: {system.visual}</span><p>{system.description}</p></div>)}</div>}
        {submitting && <div className="notice">Yanıt kaydediliyor…</div>}
        {submitFailed && finalSubmission && <><div className="notice error">Yanıt kaydedilemedi. Eşleşmelerin korundu.</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>Kaydı tekrar dene</Button></>}
      </div>
    </div>}
  </section>;
}
