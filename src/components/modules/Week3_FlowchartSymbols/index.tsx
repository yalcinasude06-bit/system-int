"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { Check, GripVertical, LockKeyhole, MousePointerClick, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/common/Button";
import type { Locale } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { LearningModuleProps, ModuleSubmission } from "@/types";
import { FlowSymbolShape } from "./FlowSymbolShape";
import { createResponsiveDiagramLayout, fitDiagramScale, type ResponsiveDiagramLayout } from "./responsiveLayout";
import {
  buildFlowchartSymbolRounds,
  flowSymbolLabels,
  flowSymbolOrder,
  type FlowchartDiagram,
  type FlowSymbol,
} from "./flowchartContent";
import { arrowPolygon, buildFlowEdgeRoutes } from "./flowchartRouting";

type Placement = Record<string, FlowSymbol | null>;
type PlacementResult = {
  slotId: string;
  selectedSymbol: FlowSymbol | null;
  expectedSymbol: FlowSymbol;
  correct: boolean;
};
type LevelResult = {
  level: number;
  difficulty: "easy" | "medium" | "hard";
  diagramId: string;
  placements: PlacementResult[];
  correctCount: number;
};
type TouchDrag = { symbol: FlowSymbol; x: number; y: number; overSlotId: string | null };

const POINTS_PER_BLANK = 10;

const copy = {
  tr: {
    title: "Hafta 3 · Modül 3: Akış Diyagramı Sembolleri",
    levels: ["Kolay", "Orta", "Zor"],
    paletteTitle: "Sembol paleti",
    paletteHint: "Sembolü sürükleyin veya seçip boş yuvaya dokunun. İsterseniz önce yuvaya, sonra sembole de dokunabilirsiniz. Yerleştirilmiş bir sembole dokunarak geri alabilirsiniz.",
    selected: "seçildi; şimdi bir boş yuvaya dokunun",
    selectedShort: "Seçili",
    emptySlot: "Eksik sembol",
    emptySlotHint: "Sembol yerleştirmek için tıklayın",
    slotSelected: "Yuva seçildi; şimdi paletten bir sembole dokunun.",
    remove: "Yerleştirilen sembolü geri al",
    check: "Kontrol Et",
    fillSlots: "Kontrol etmek için tüm boş yuvaları doldurun",
    allFilled: "Tüm boşlar dolu. Hazır olduğunuzda Kontrol Et'e basın.",
    success: "Harika! Tüm semboller doğru. Sıradaki seviyeye geçiliyor…",
    wrong: "Yanlış semboller kırmızı yandı; doğruları kısa süre gösteriliyor…",
    complete: "Üç seviye tamamlandı",
    partial: "Öğretmen modülü bitirdi",
    completeDetail: "Akış diyagramındaki doğru semboller puanınıza eklendi. Öğretmen sonuçları açıklayana kadar puanınız gizli kalacak.",
    partialDetail: "Kontrol edilmiş seviyelerdeki doğru semboller kaydedildi. Kontrol edilmemiş yerleştirmeler puanlanmadı.",
    locked: "Bu modül tamamlandı",
    lockedDetail: "Yanıtınız kilitlendi. Öğretmen sonuçları açıklayana kadar bekleyin.",
    saving: "Yanıt kaydediliyor…",
    saveError: "Yanıt kaydedilemedi. İlerlemeniz korundu.",
    retry: "Kaydı tekrar dene",
    round: "Seviye",
    placed: "yerleştirildi",
  },
  en: {
    title: "Week 3 · Module 3: Flowchart Symbols",
    levels: ["Easy", "Medium", "Hard"],
    paletteTitle: "Symbol palette",
    paletteHint: "Drag a symbol, or select it and tap an empty slot. You can also tap a slot first, then choose a symbol. Tap a placed symbol to return it.",
    selected: "selected; now tap an empty slot",
    selectedShort: "Selected",
    emptySlot: "Missing symbol",
    emptySlotHint: "Click to place a symbol",
    slotSelected: "Slot selected; now choose a symbol from the palette.",
    remove: "Return placed symbol",
    check: "Check",
    fillSlots: "Fill every empty slot before checking",
    allFilled: "All slots are filled. Press Check when you are ready.",
    success: "Great! Every symbol is correct. Moving to the next level…",
    wrong: "Incorrect symbols flashed red; the correct symbols are shown briefly…",
    complete: "All three levels are complete",
    partial: "The teacher ended the module",
    completeDetail: "Correct flowchart symbols were added to your score. Your score remains hidden until the teacher reveals results.",
    partialDetail: "Correct symbols from checked levels were saved. Unchecked placements were not scored.",
    locked: "This module is complete",
    lockedDetail: "Your answer is locked. Wait until the teacher reveals results.",
    saving: "Saving your answer…",
    saveError: "The answer could not be saved. Your progress is preserved.",
    retry: "Try saving again",
    round: "Level",
    placed: "placed",
  },
};

function blankPlacements(diagram: FlowchartDiagram): Placement {
  return Object.fromEntries(diagram.nodes.filter((node) => node.blank).map((node) => [node.id, null]));
}

function SymbolGlyph({ symbol }: { symbol: FlowSymbol }) {
  return <svg className={`flow-symbol-glyph flow-symbol-${symbol}`} viewBox="0 0 152 58" aria-hidden="true" preserveAspectRatio="xMidYMid meet"><FlowSymbolShape symbol={symbol} /></svg>;
}

function FlowEdges({ diagram, locale, layout, layer }: { diagram: FlowchartDiagram; locale: Locale; layout: ResponsiveDiagramLayout; layer: "paths" | "overlays" }) {
  const routes = buildFlowEdgeRoutes(diagram, layout);
  return <g aria-hidden="true" className={`flowchart-edges flowchart-edges-${layer}`}>
    {routes.map((route) => <g className={route.edge.loop ? "flowchart-edge loop" : "flowchart-edge"} key={route.key}>
      {layer === "paths" ? <path d={route.path} /> : <>
        <polygon className="flowchart-arrowhead" points={arrowPolygon(route.end, route.endDirection)} />
        {route.edge.label && route.label && <text className="flowchart-edge-label" x={route.label.x} y={route.label.y} textAnchor={route.label.anchor ?? "middle"}>{route.edge.label[locale]}</text>}
      </>}
    </g>)}
  </g>;
}

function FlowNodeShape({ symbol, x, y, width, height, placeholder }: { symbol: FlowSymbol | null; x: number; y: number; width: number; height: number; placeholder: boolean }) {
  if (placeholder) return <rect x={x} y={y} width={width} height={height} rx="12" className="flowchart-svg-placeholder" />;
  return <FlowSymbolShape symbol={symbol!} x={x} y={y} width={width} height={height} />;
}

export function Week3FlowchartSymbols({
  onSubmit,
  onDraft,
  existingSubmission,
  forceSubmit,
  sessionId,
}: LearningModuleProps & { sessionId: string }) {
  const { locale } = useI18n();
  const text = copy[locale];
  const rounds = useMemo(() => buildFlowchartSymbolRounds(sessionId), [sessionId]);
  const [levelIndex, setLevelIndex] = useState(0);
  const [placements, setPlacements] = useState<Placement>(() => blankPlacements(rounds[0]));
  const [selectedSymbol, setSelectedSymbol] = useState<FlowSymbol | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"active" | "success" | "error" | "complete">("active");
  const [result, setResult] = useState<LevelResult | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [touchDrag, setTouchDrag] = useState<TouchDrag | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ModuleSubmission | null>(null);
  const [compactDiagram, setCompactDiagram] = useState(false);
  const [diagramScale, setDiagramScale] = useState(1);
  const diagramViewportRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<LevelResult[]>([]);
  const transitionTimer = useRef<number | null>(null);
  const submissionStarted = useRef(false);
  const touchStart = useRef<{ symbol: FlowSymbol; x: number; y: number; dragging: boolean } | null>(null);
  const suppressPaletteClick = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 620px)");
    const update = () => setCompactDiagram(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const current = rounds[Math.min(levelIndex, rounds.length - 1)];
  const layout = useMemo(() => createResponsiveDiagramLayout(current, locale, compactDiagram), [compactDiagram, current, locale]);
  const blankNodes = current.nodes.filter((node) => node.blank);
  const allFilled = blankNodes.every((node) => placements[node.id]);

  useEffect(() => {
    const viewport = diagramViewportRef.current;
    if (!viewport) return;
    let animationFrame = 0;
    const updateScale = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const nextScale = fitDiagramScale(
          Math.max(1, viewport.clientWidth - 4),
          Math.max(1, viewport.clientHeight - 4),
          layout.width,
          layout.height,
          layout.compact ? .92 : .84,
        );
        setDiagramScale((currentScale) => Math.abs(currentScale - nextScale) < .002 ? currentScale : nextScale);
      });
    };
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    window.addEventListener("orientationchange", updateScale);
    updateScale();
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", updateScale);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [layout.compact, layout.height, layout.width, locale]);

  const submitResult = useCallback(async (submission: ModuleSubmission) => {
    setSubmitting(true);
    setSubmitFailed(false);
    const accepted = await onSubmit(submission);
    setSubmitting(false);
    if (accepted === false) setSubmitFailed(true);
  }, [onSubmit]);

  const submissionForProgress = useCallback((checkedLevels: LevelResult[], completionReason: "completed" | "teacher-ended" | "draft", activePlacements?: Placement): ModuleSubmission => {
    const correctCount = checkedLevels.reduce((total, level) => total + level.correctCount, 0);
    return {
      stage: 1,
      score: correctCount * POINTS_PER_BLANK,
      payload: {
        mode: "flowchart-symbol-placement",
        selectedDiagramIds: rounds.map((round) => round.id),
        levels: checkedLevels,
        correctCount,
        evaluatedBlankCount: checkedLevels.reduce((total, level) => total + level.placements.length, 0),
        totalBlankCount: 10,
        pointsPerBlank: POINTS_PER_BLANK,
        activeLevel: activePlacements ? { level: levelIndex + 1, diagramId: current.id, placements: activePlacements, evaluated: false } : undefined,
        completionReason,
      },
    };
  }, [current.id, levelIndex, rounds]);

  const finalize = useCallback(async (checkedLevels: LevelResult[], completionReason: "completed" | "teacher-ended", activePlacements?: Placement) => {
    if (submissionStarted.current || existingSubmission) return;
    submissionStarted.current = true;
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    const submission = submissionForProgress(checkedLevels, completionReason, completionReason === "teacher-ended" ? activePlacements ?? placements : undefined);
    setFinalSubmission(submission);
    setPhase("complete");
    await submitResult(submission);
  }, [existingSubmission, placements, submissionForProgress, submitResult]);

  const advance = useCallback((nextResults: LevelResult[]) => {
    if (levelIndex === rounds.length - 1) {
      void finalize(nextResults, "completed");
      return;
    }
    const next = rounds[levelIndex + 1];
    setLevelIndex((index) => index + 1);
    setPlacements(blankPlacements(next));
    setSelectedSymbol(null);
    setSelectedSlotId(null);
    setResult(null);
    setAnnouncement("");
    setPhase("active");
  }, [finalize, levelIndex, rounds]);

  const checkAnswers = useCallback(() => {
    if (!allFilled || phase !== "active" || forceSubmit || existingSubmission) return;
    const nextResult: LevelResult = {
      level: levelIndex + 1,
      difficulty: current.difficulty,
      diagramId: current.id,
      placements: blankNodes.map((node) => ({
        slotId: node.id,
        selectedSymbol: placements[node.id],
        expectedSymbol: node.symbol,
        correct: placements[node.id] === node.symbol,
      })),
      correctCount: 0,
    };
    nextResult.correctCount = nextResult.placements.filter((placement) => placement.correct).length;
    const allCorrect = nextResult.correctCount === blankNodes.length;
    const nextResults = [...resultsRef.current, nextResult];
    resultsRef.current = nextResults;
    void onDraft?.(submissionForProgress(nextResults, "draft", placements));
    setResult(nextResult);
    setSelectedSymbol(null);
    setPhase(allCorrect ? "success" : "error");
    setAnnouncement(allCorrect ? text.success : text.wrong);
    if (allCorrect) confetti({ particleCount: 42, spread: 64, startVelocity: 21, origin: { x: .62, y: .58 }, colors: ["#10b981", "#fbbf24", "#ffffff"] });
    transitionTimer.current = window.setTimeout(() => advance(nextResults), allCorrect ? 1250 : 2500);
  }, [advance, allFilled, blankNodes, current.difficulty, current.id, existingSubmission, forceSubmit, levelIndex, onDraft, phase, placements, submissionForProgress, text.success, text.wrong]);

  const placeSymbol = useCallback((slotId: string, symbol: FlowSymbol) => {
    if (phase !== "active" || forceSubmit || existingSubmission) return;
    setPlacements((currentPlacements) => {
      const next = { ...currentPlacements, [slotId]: symbol };
      void onDraft?.(submissionForProgress(resultsRef.current, "draft", next));
      return next;
    });
    setSelectedSymbol(null);
    setSelectedSlotId(null);
    setAnnouncement("");
  }, [existingSubmission, forceSubmit, onDraft, phase, submissionForProgress]);

  const activateSlot = useCallback((slotId: string) => {
    if (phase !== "active" || forceSubmit || existingSubmission) return;
    if (selectedSymbol) {
      placeSymbol(slotId, selectedSymbol);
      return;
    }
    if (placements[slotId]) {
      setPlacements((currentPlacements) => {
        const next = { ...currentPlacements, [slotId]: null };
        void onDraft?.(submissionForProgress(resultsRef.current, "draft", next));
        return next;
      });
      setSelectedSlotId(null);
      setAnnouncement(text.remove);
      return;
    }
    setSelectedSlotId((currentSlot) => currentSlot === slotId ? null : slotId);
    setAnnouncement(selectedSlotId === slotId ? text.paletteHint : text.slotSelected);
  }, [existingSubmission, forceSubmit, onDraft, phase, placements, placeSymbol, selectedSlotId, selectedSymbol, submissionForProgress, text.paletteHint, text.remove, text.slotSelected]);

  useEffect(() => {
    if (!forceSubmit || phase === "complete" || existingSubmission) return;
    void finalize(resultsRef.current, "teacher-ended", placements);
  }, [existingSubmission, finalize, forceSubmit, phase, placements]);

  useEffect(() => () => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
  }, []);

  function chooseSymbol(symbol: FlowSymbol) {
    if (suppressPaletteClick.current) {
      suppressPaletteClick.current = false;
      return;
    }
    if (phase !== "active") return;
    if (selectedSlotId) {
      placeSymbol(selectedSlotId, symbol);
      return;
    }
    setSelectedSymbol((currentSymbol) => currentSymbol === symbol ? null : symbol);
    setAnnouncement(selectedSymbol === symbol ? text.paletteHint : `${flowSymbolLabels[symbol][locale]} ${text.selected}`);
  }

  function handleSlotKey(event: KeyboardEvent<SVGGElement>, slotId: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activateSlot(slotId);
  }

  function beginTouchDrag(event: PointerEvent<HTMLButtonElement>, symbol: FlowSymbol) {
    if (event.pointerType === "mouse" || phase !== "active") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    touchStart.current = { symbol, x: event.clientX, y: event.clientY, dragging: false };
  }

  function moveTouchDrag(event: PointerEvent<HTMLButtonElement>) {
    const start = touchStart.current;
    if (!start) return;
    if (!start.dragging && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8) return;
    start.dragging = true;
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const slot = target?.closest("[data-flow-slot]");
    setTouchDrag({ symbol: start.symbol, x: event.clientX, y: event.clientY, overSlotId: slot?.getAttribute("data-flow-slot") ?? null });
  }

  function endTouchDrag(event: PointerEvent<HTMLButtonElement>) {
    const start = touchStart.current;
    if (!start) return;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const slotId = target?.closest("[data-flow-slot]")?.getAttribute("data-flow-slot");
    if (start.dragging) {
      suppressPaletteClick.current = true;
      if (slotId) placeSymbol(slotId, start.symbol);
    }
    touchStart.current = null;
    setTouchDrag(null);
  }

  function startNativeDrag(event: DragEvent<HTMLButtonElement>, symbol: FlowSymbol) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/flowchart-symbol", symbol);
    setSelectedSymbol(symbol);
  }

  function dropOnSlot(event: DragEvent<SVGGElement>, slotId: string) {
    event.preventDefault();
    const symbol = event.dataTransfer.getData("text/flowchart-symbol") as FlowSymbol;
    if (flowSymbolOrder.includes(symbol)) placeSymbol(slotId, symbol);
  }

  if (existingSubmission && phase !== "complete") {
    return <section className="panel module-shell flowchart-module-shell"><div className="module-title-chip">{text.title}</div><div className="module-complete-card"><LockKeyhole size={42} /><h2>{text.locked}</h2><p>{text.lockedDetail}</p></div></section>;
  }

  if (phase === "complete") {
    const endedByTeacher = finalSubmission?.payload?.completionReason === "teacher-ended";
    return <section className="panel module-shell flowchart-module-shell">
      <div className="module-title-chip">{text.title}</div>
      <div className="module-complete-card"><Sparkles size={42} /><h2>{endedByTeacher ? text.partial : text.complete}</h2><p>{endedByTeacher ? text.partialDetail : text.completeDetail}</p>{submitting && <div className="notice">{text.saving}</div>}{submitFailed && finalSubmission && <><div className="notice error">{text.saveError}</div><Button loading={submitting} icon={<RotateCcw size={17} />} onClick={() => void submitResult(finalSubmission)}>{text.retry}</Button></>}</div>
    </section>;
  }

  const resultBySlot = new Map(result?.placements.map((placement) => [placement.slotId, placement]));
  const stageStyle = { width: layout.width * diagramScale, height: layout.height * diagramScale };
  const svgStyle = {
    width: layout.width,
    height: layout.height,
    transform: `scale(${diagramScale})`,
    "--flowchart-node-font": `${layout.fontSize}px`,
  } as CSSProperties;

  return <section className="panel module-shell flowchart-module-shell">
    <div className="module-topline flowchart-topline">
      <div className="module-title-chip">{text.title}</div>
      <strong>{text.round} {levelIndex + 1}/3 · {text.levels[levelIndex]}</strong>
    </div>
    <div className="flowchart-level-progress" aria-label={`${text.round} ${levelIndex + 1}/3`}>
      {rounds.map((round, index) => <span className={index < levelIndex ? "done" : index === levelIndex ? "active" : ""} key={round.id}>{text.levels[index]}</span>)}
    </div>

    <AnimatePresence mode="wait">
      <motion.div key={current.id} className={`flowchart-game ${phase}`} initial={{ opacity: 0, y: 14 }} animate={phase === "error" ? { opacity: 1, x: [0, -7, 7, -5, 4, 0] } : { opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: phase === "error" ? .48 : .3 }}>
        <div className="flowchart-diagram-card">
          <header className="flowchart-diagram-heading"><div><span>{text.levels[levelIndex]}</span><h2 data-i18n-skip>{current.title[locale]}</h2></div><p>{blankNodes.length} {locale === "tr" ? "boş sembol" : "empty symbols"}</p></header>
          <div ref={diagramViewportRef} className="flowchart-vertical-viewport" data-diagram-id={current.id} data-diagram-scale={diagramScale.toFixed(4)} data-compact={layout.compact}>
            <div className="flowchart-fit-stage" style={stageStyle}>
            <svg className="flowchart-vertical-svg" width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} style={svgStyle} role="img" aria-label={current.title[locale]} preserveAspectRatio="xMinYMin meet">
              <FlowEdges diagram={current} locale={locale} layout={layout} layer="paths" />
              {current.nodes.map((node) => {
                const placement = node.blank ? placements[node.id] : null;
                const slotResult = resultBySlot.get(node.id);
                const showExpected = phase === "error" && slotResult && !slotResult.correct;
                const displaySymbol = node.blank ? (showExpected ? node.symbol : placement) : node.symbol;
                const box = layout.nodes[node.id];
                const placeholder = Boolean(node.blank && !displaySymbol);
                const interactive = node.blank && phase === "active";
                const labelInset = displaySymbol === "decision" ? .2 : displaySymbol === "data" ? .14 : .08;
                const labelBottomInset = displaySymbol === "document" ? .18 : .08;
                return <g
                  key={node.id}
                  role={node.blank ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  data-flow-slot={node.blank ? node.id : undefined}
                  className={`flowchart-svg-node ${displaySymbol ? `flow-symbol-${displaySymbol}` : "flow-slot-placeholder"} ${interactive ? "interactive" : ""} ${selectedSymbol && node.blank ? "can-drop" : ""} ${selectedSlotId === node.id ? "selected-slot" : ""} ${touchDrag?.overSlotId === node.id ? "drag-over" : ""} ${phase === "success" && slotResult?.correct ? "correct" : ""} ${phase === "error" && slotResult && !slotResult.correct ? "wrong reveal-correct" : ""}`}
                  aria-label={node.blank ? `${node.text[locale]}: ${displaySymbol ? `${flowSymbolLabels[displaySymbol][locale]}, ${text.placed}` : text.emptySlotHint}` : node.text[locale]}
                  onClick={() => node.blank && activateSlot(node.id)}
                  onKeyDown={(event) => node.blank && handleSlotKey(event, node.id)}
                  onDragOver={(event) => node.blank && event.preventDefault()}
                  onDrop={(event) => node.blank && dropOnSlot(event, node.id)}
                >
                  <FlowNodeShape symbol={displaySymbol} x={box.x} y={box.y} width={box.width} height={box.height} placeholder={placeholder} />
                  <foreignObject x={box.x + box.width * labelInset} y={box.y + box.height * .08} width={box.width * (1 - labelInset * 2)} height={box.height * (1 - .08 - labelBottomInset)} pointerEvents="none"><div className="flowchart-svg-node-label" data-flow-node-label={node.id} data-i18n-skip>{node.text[locale]}</div></foreignObject>
                  {phase === "success" && slotResult?.correct && <text x={box.x + box.width - 11} y={box.y + 15} className="flowchart-svg-verdict correct">✓</text>}
                  {phase === "error" && slotResult && !slotResult.correct && <text x={box.x + box.width - 11} y={box.y + 15} className="flowchart-svg-verdict wrong">×</text>}
                </g>;
              })}
              <FlowEdges diagram={current} locale={locale} layout={layout} layer="overlays" />
            </svg>
            </div>
          </div>
        </div>
        <aside className="flowchart-palette" aria-label={text.paletteTitle}>
          <div className="flowchart-palette-head"><div><h2>{text.paletteTitle}</h2><p>{text.paletteHint}</p></div><MousePointerClick size={18} aria-hidden="true" /></div>
          <div className="flowchart-symbol-list">
            {flowSymbolOrder.map((symbol) => <button
              type="button"
              key={symbol}
              className={`flowchart-symbol-chip ${selectedSymbol === symbol ? "selected" : ""}`}
              draggable={phase === "active"}
              aria-pressed={selectedSymbol === symbol}
              aria-label={`${flowSymbolLabels[symbol][locale]}${selectedSymbol === symbol ? `, ${text.selectedShort}` : ""}`}
              title={flowSymbolLabels[symbol][locale]}
              onClick={() => chooseSymbol(symbol)}
              onDragStart={(event) => startNativeDrag(event, symbol)}
              onPointerDown={(event) => beginTouchDrag(event, symbol)}
              onPointerMove={moveTouchDrag}
              onPointerUp={endTouchDrag}
              onPointerCancel={() => { touchStart.current = null; setTouchDrag(null); }}
            ><GripVertical size={13} aria-hidden="true" /><SymbolGlyph symbol={symbol} /><span data-i18n-skip>{flowSymbolLabels[symbol][locale]}</span><MousePointerClick size={12} className="flowchart-pointer" aria-hidden="true" /></button>)}
          </div>
        </aside>
      </motion.div>
    </AnimatePresence>

    <div className={`flowchart-status ${phase}`} aria-live="assertive">{announcement || (allFilled ? text.allFilled : text.fillSlots)}</div>
    <div className="flowchart-actions"><Button disabled={!allFilled || phase !== "active"} icon={<Check size={18} />} onClick={checkAnswers}>{text.check}</Button></div>
    {touchDrag && <div className="flowchart-touch-symbol" style={{ transform: `translate3d(${touchDrag.x}px, ${touchDrag.y}px, 0)` }}><SymbolGlyph symbol={touchDrag.symbol} /><span>{flowSymbolLabels[touchDrag.symbol][locale]}</span></div>}
  </section>;
}
