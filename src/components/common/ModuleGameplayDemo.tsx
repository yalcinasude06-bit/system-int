"use client";

import { MotionConfig, motion } from "framer-motion";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { BossPortrait } from "@/components/modules/Week4_BossApproach/BossPortrait";
import { FlowSymbolShape } from "@/components/modules/Week3_FlowchartSymbols/FlowSymbolShape";
import type { FlowSymbol } from "@/components/modules/Week3_FlowchartSymbols/flowchartContent";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { ModuleId } from "@/types";

const loop = { duration: 3.2, repeat: Infinity, repeatDelay: .35, ease: "easeInOut" as const };

const weekThreeLoop = { duration: 8.4, repeat: Infinity, ease: "easeInOut" as const };

const weekThreeFlowLoop = { duration: 5.6, repeat: Infinity, ease: "easeInOut" as const };

type RelativeRect = { left: number; top: number; width: number; height: number };

type FlowDemoLayout = {
  decision: RelativeRect;
  process: RelativeRect;
  target: RelativeRect;
};

type SystemDemoLayout = {
  correct: RelativeRect;
  wrong: RelativeRect;
  system: RelativeRect;
  trash: RelativeRect;
};

function getRelativeRect(container: DOMRect, element: Element): RelativeRect {
  const rect = element.getBoundingClientRect();
  return { left: rect.left - container.left, top: rect.top - container.top, width: rect.width, height: rect.height };
}

function useFlowDemoLayout() {
  const demoRef = useRef<HTMLDivElement>(null);
  const decisionPaletteRef = useRef<HTMLSpanElement>(null);
  const processPaletteRef = useRef<HTMLSpanElement>(null);
  const decisionSlotRef = useRef<SVGPolygonElement>(null);
  const [layout, setLayout] = useState<FlowDemoLayout | null>(null);

  useEffect(() => {
    const measure = () => {
      const demo = demoRef.current;
      const decision = decisionPaletteRef.current;
      const process = processPaletteRef.current;
      const target = decisionSlotRef.current;
      if (!demo || !decision || !process || !target) return;

      const demoRect = demo.getBoundingClientRect();
      if (!demoRect.width || !demoRect.height) return;
      setLayout({
        decision: getRelativeRect(demoRect, decision),
        process: getRelativeRect(demoRect, process),
        target: getRelativeRect(demoRect, target),
      });
    };

    measure();
    const elements = [demoRef.current, decisionPaletteRef.current, processPaletteRef.current, decisionSlotRef.current].filter(Boolean) as Element[];
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    elements.forEach((element) => observer?.observe(element));
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return { demoRef, decisionPaletteRef, processPaletteRef, decisionSlotRef, layout };
}

function useSystemDemoLayout() {
  const demoRef = useRef<HTMLDivElement>(null);
  const correctCardRef = useRef<HTMLSpanElement>(null);
  const wrongCardRef = useRef<HTMLSpanElement>(null);
  const systemTargetRef = useRef<HTMLDivElement>(null);
  const trashTargetRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<SystemDemoLayout | null>(null);

  useEffect(() => {
    const measure = () => {
      const demo = demoRef.current;
      const correct = correctCardRef.current;
      const wrong = wrongCardRef.current;
      const system = systemTargetRef.current;
      const trash = trashTargetRef.current;
      if (!demo || !correct || !wrong || !system || !trash) return;
      const demoRect = demo.getBoundingClientRect();
      if (!demoRect.width || !demoRect.height) return;
      setLayout({
        correct: getRelativeRect(demoRect, correct),
        wrong: getRelativeRect(demoRect, wrong),
        system: getRelativeRect(demoRect, system),
        trash: getRelativeRect(demoRect, trash),
      });
    };

    measure();
    const elements = [demoRef.current, correctCardRef.current, wrongCardRef.current, systemTargetRef.current, trashTargetRef.current].filter(Boolean) as Element[];
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    elements.forEach((element) => observer?.observe(element));
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return { demoRef, correctCardRef, wrongCardRef, systemTargetRef, trashTargetRef, layout };
}

const weekThreeDemoCopy = {
  tr: {
    hierarchy: { pool: "Kart havuzu", activity: "İş emri", core: "Temel süreç", subprocess: "Alt süreç", task: "Faaliyet", correct: "✓", wrong: "×" },
    missing: { first: "Sipariş", last: "Paketle", correct: "Raftan topla", wrong: "Rapor hazırla", alternative: "Tedarikçi ara" },
    flow: { start: "Başla", check: "Kontrol?", yes: "Evet", no: "Hayır", update: "Güncelle", end: "Bitir", return: "dön", decision: "Karar", process: "İşlem" },
  },
  en: {
    hierarchy: { pool: "Card pool", activity: "Work order", core: "Core process", subprocess: "Sub-process", task: "Activity", correct: "✓", wrong: "×" },
    missing: { first: "Order", last: "Pack", correct: "Pick item", wrong: "Write report", alternative: "Find supplier" },
    flow: { start: "Start", check: "Check?", yes: "Yes", no: "No", update: "Update", end: "End", return: "return", decision: "Decision", process: "Process" },
  },
} as const;

const weekFourDemoCopy = {
  tr: {
    factoryPrompt: "Fabrikayı incele, karar ver; gerekirse 5 saniyede kurtar!",
    machine: "Makine",
    sensor: "Sensör",
    workers: "Çalışanlar",
    machineInfo: "iş tekrarı",
    sensorInfo: "akışta yığılma",
    workersInfo: "görevler belirsiz",
    wrongDecision: "Hızı artır",
    rightDecision: "Görevleri düzenle",
    jammed: "Hat sıkıştı!",
    rescue: "Kurtarma 5.0",
    repaired: "Akış düzeldi ✓",
    factoryFlow: "İncele → Karar ver → Kurtar",
    bossQuote: "Yeni yöntemi deneyip sonuçlarını ölçelim.",
    experimental: "Deneysel Yaklaşım",
    otherApproach: "Mekanik Yaklaşım",
    analytical: "Analitik Yaklaşım",
    reductionist: "İndirgemeci Yaklaşım",
    systemIs: "Sistemdir",
    systemIsNot: "Uygun değil",
    correctCard: "Parçalar ilişkilidir",
    wrongCard: "Çevre önemsizdir",
    drag: "Kartları doğru alana sürükle.",
  },
  en: {
    factoryPrompt: "Inspect the factory, decide, and rescue it in 5 seconds if needed!",
    machine: "Machine",
    sensor: "Sensor",
    workers: "Workers",
    machineInfo: "duplicate work",
    sensorInfo: "flow buildup",
    workersInfo: "unclear roles",
    wrongDecision: "Increase speed",
    rightDecision: "Organize roles",
    jammed: "Line jammed!",
    rescue: "Rescue 5.0",
    repaired: "Flow restored ✓",
    factoryFlow: "Inspect → Decide → Rescue",
    bossQuote: "Let’s test the new method and measure the results.",
    experimental: "Experimental Approach",
    otherApproach: "Mechanical Approach",
    analytical: "Analytical Approach",
    reductionist: "Reductionist Approach",
    systemIs: "System",
    systemIsNot: "Not suitable",
    correctCard: "Parts are connected",
    wrongCard: "The environment is irrelevant",
    drag: "Drag the cards to the correct area.",
  },
} as const;

function ModuleOneDemo() {
  return <div className="module-demo module-demo-one" aria-hidden="true">
    <motion.div
      className="module-demo-card"
      animate={{ x: ["0%", "0%", "220%", "220%", "0%"], scale: [1, 1.04, .94, .94, 1], opacity: [1, 1, 1, .35, 1] }}
      transition={{ ...loop, times: [0, .18, .55, .78, 1] }}
    >Girdi</motion.div>
    <motion.div
      className="module-demo-slot"
      animate={{ borderColor: ["#94a3b8", "#94a3b8", "#10b981", "#10b981", "#94a3b8"], backgroundColor: ["#f8fafc", "#f8fafc", "#d1fae5", "#d1fae5", "#f8fafc"] }}
      transition={{ ...loop, times: [0, .4, .58, .8, 1] }}
    >
      <motion.span animate={{ opacity: [0, 0, 1, 1, 0], scale: [.5, .5, 1.2, 1, .5] }} transition={{ ...loop, times: [0, .48, .62, .8, 1] }}>✓</motion.span>
    </motion.div>
    <div className="module-demo-arrow">→</div>
    <motion.span className="demo-hand demo-hand-one" animate={{ x: [0, 0, 220, 220, 0], y: [0, -5, -5, -5, 0], scale: [1, .9, 1, 1, 1] }} transition={{ ...loop, times: [0, .18, .55, .78, 1] }}>👆</motion.span>
  </div>;
}

function ModuleTwoDemo() {
  return <div className="module-demo module-demo-two" aria-hidden="true">
    <motion.div className="relation-demo-scene" animate={{ opacity: [1, 1, 0, 0, 1] }} transition={{ duration: 6, repeat: Infinity, times: [0, .43, .5, .93, 1] }}>
      <span className="relation-demo-trigger">Fiyat ↑</span>
      <div className="relation-demo-deck negative"><motion.div className="relation-demo-front" animate={{ x: [0, -96, -96, 0], rotate: [0, -8, -8, 0], opacity: [1, 1, 0, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, .48, .78, 1] }}><span>Talep ↓</span></motion.div></div>
      <motion.span className="demo-hand relation-demo-hand" animate={{ x: [0, -96, -96, 0], rotate: [0, -18, -18, 0] }} transition={{ duration: 3, repeat: Infinity, times: [0, .48, .78, 1] }}>👆</motion.span>
      <b className="relation-demo-sign negative">Negatif −</b>
    </motion.div>
    <motion.div className="relation-demo-scene" animate={{ opacity: [0, 0, 1, 1, 0] }} transition={{ duration: 6, repeat: Infinity, times: [0, .43, .5, .93, 1] }}>
      <span className="relation-demo-trigger">Reklam ↑</span>
      <div className="relation-demo-deck positive"><motion.div className="relation-demo-front" animate={{ x: [0, 96, 96, 0], rotate: [0, 8, 8, 0], opacity: [1, 1, 0, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, .48, .78, 1] }}><span>Satış ↑</span></motion.div></div>
      <motion.span className="demo-hand relation-demo-hand" animate={{ x: [0, 96, 96, 0], rotate: [0, 18, 18, 0] }} transition={{ duration: 3, repeat: Infinity, times: [0, .48, .78, 1] }}>👆</motion.span>
      <b className="relation-demo-sign positive">Pozitif +</b>
    </motion.div>
  </div>;
}

function ModuleThreeDemo() {
  return <div className="module-demo module-demo-three" aria-hidden="true">
    <span className="black-box-input">🌾 Buğday</span>
    <motion.div className="black-box-core" animate={{ backgroundColor: ["#0f172a", "#0f172a", "#fbbf24", "#fbbf24", "#0f172a"] }} transition={{ ...loop, times: [0, .4, .58, .8, 1] }}>
      <motion.b animate={{ opacity: [1, 1, 0, 0, 1] }} transition={{ ...loop, times: [0, .4, .48, .82, 1] }}>?</motion.b>
      <motion.small animate={{ opacity: [0, 0, 1, 1, 0], scale: [.8, .8, 1, 1, .8] }} transition={{ ...loop, times: [0, .44, .58, .82, 1] }}>Öğütme</motion.small>
    </motion.div>
    <span className="black-box-output">Un 🥣</span>
    <div className="black-box-options">
      <span>Isıtma</span>
      <motion.span animate={{ color: ["#64748b", "#64748b", "#065f46", "#065f46", "#64748b"], backgroundColor: ["#fff", "#fff", "#d1fae5", "#d1fae5", "#fff"], scale: [1, 1, 1.08, 1.08, 1] }} transition={{ ...loop, times: [0, .4, .56, .82, 1] }}>Öğütme ✓</motion.span>
      <span>Soğutma</span>
    </div>
    <motion.span className="demo-hand demo-hand-three" animate={{ y: [9, 9, -2, -2, 9], scale: [1, 1, .84, 1, 1] }} transition={{ ...loop, times: [0, .35, .48, .64, 1] }}>👆</motion.span>
  </div>;
}

function ModuleFourDemo() {
  return <div className="module-demo module-demo-four" aria-hidden="true">
    <motion.div className="match-demo-type" animate={{ borderColor: ["#cbd5e1", "#10b981", "#10b981", "#cbd5e1"], backgroundColor: ["#fff", "#d1fae5", "#d1fae5", "#fff"], scale: [1, 1.05, 1.05, 1] }} transition={{ ...loop, times: [0, .25, .75, 1] }}>Doğal Sistem</motion.div>
    <svg className="match-demo-line" viewBox="0 0 100 24" preserveAspectRatio="none"><motion.path d="M 3 12 C 30 12, 65 12, 97 12" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: [0, 0, 1, 1, 0] }} transition={{ ...loop, times: [0, .22, .55, .82, 1] }} /></svg>
    <motion.div className="match-demo-visual" animate={{ boxShadow: ["0 0 0 0 rgba(16,185,129,0)", "0 0 0 0 rgba(16,185,129,0)", "0 0 0 7px rgba(16,185,129,.16)", "0 0 0 0 rgba(16,185,129,0)"] }} transition={{ ...loop, times: [0, .48, .66, 1] }}><span>🏞️</span><small>Doğa</small></motion.div>
    <motion.span className="demo-hand demo-hand-four" animate={{ x: [0, 0, 237, 237, 0], y: [0, -5, 0, 0, 0], scale: [1, .82, 1, .82, 1] }} transition={{ ...loop, times: [0, .2, .5, .66, 1] }}>👆</motion.span>
  </div>;
}

function ModuleFiveDemo() {
  return <div className="module-demo module-demo-five" aria-hidden="true">
    <motion.div className="balloon-demo" animate={{ y: [34, -18, -18, 10], scale: [1, 1, 1.06, 0], opacity: [1, 1, 1, 0] }} transition={{ duration: 3.4, repeat: Infinity, times: [0, .55, .72, .82], repeatDelay: .35 }}>
      <span>Paketleme, kalite kontrolden sonra yapılır.</span><i />
    </motion.div>
    <div className="needle-demo-list">
      <div className="needle-demo-item"><span>📌</span><b>Nedensel</b></div>
      <motion.div className="needle-demo-item selected" animate={{ x: [0, 0, 66, 66], y: [0, 0, -43, -43], rotate: [0, 0, -24, -24] }} transition={{ duration: 3.4, repeat: Infinity, times: [0, .54, .73, 1], repeatDelay: .35 }}><span>📌</span><b>Zamansal</b></motion.div>
      <div className="needle-demo-item"><span>📌</span><b>Mekânsal</b></div>
    </div>
    <motion.span className="demo-hand demo-hand-five" animate={{ x: [0, 0, 0, 66], y: [0, 0, -5, -48], scale: [1, 1, .8, 1] }} transition={{ duration: 3.4, repeat: Infinity, times: [0, .48, .58, .76], repeatDelay: .35 }}>👆</motion.span>
    <motion.div className="balloon-pop" animate={{ opacity: [0, 0, 1, 0], scale: [.3, .3, 1.4, 1.8] }} transition={{ duration: 3.4, repeat: Infinity, times: [0, .72, .79, .94], repeatDelay: .35 }}>✦</motion.div>
  </div>;
}

function WeekThreeHierarchyDemo() {
  const { locale } = useI18n();
  const text = weekThreeDemoCopy[locale].hierarchy;
  return <div className="module-demo week-three-demo week-three-hierarchy-demo" aria-hidden="true">
    <span className="week-three-demo-kicker" data-i18n-skip>{text.pool}</span>
    <div className="week-three-hierarchy-source"><span>{text.core}</span><span>{text.subprocess}</span></div>
    <div className="week-three-hierarchy-pyramid">
      <div className="week-three-hierarchy-layer core"><small>{text.core}</small></div>
      <motion.div className="week-three-hierarchy-layer subprocess" animate={{ backgroundColor: ["#fff", "#fff", "#fff", "#fff1f2", "#fff1f2", "#fff"], borderColor: ["#cbd5e1", "#cbd5e1", "#cbd5e1", "#f87171", "#f87171", "#cbd5e1"], x: [0, 0, 0, -3, 3, 0] }} transition={{ ...weekThreeLoop, times: [0, .2, .38, .72, .8, 1] }}><small>{text.subprocess}</small></motion.div>
      <motion.div className="week-three-hierarchy-layer activity" animate={{ backgroundColor: ["#fff", "#fff", "#d1fae5", "#d1fae5", "#fff", "#fff"], borderColor: ["#cbd5e1", "#cbd5e1", "#34d399", "#34d399", "#cbd5e1", "#cbd5e1"] }} transition={{ ...weekThreeLoop, times: [0, .2, .29, .44, .55, 1] }}><small>{text.task}</small></motion.div>
    </div>
    <motion.span className="week-three-hierarchy-flying-card" data-i18n-skip animate={{ left: ["7%", "7%", "59%", "59%", "7%", "7%", "59%", "59%", "7%"], top: ["67%", "67%", "62%", "62%", "67%", "67%", "42%", "42%", "67%"], opacity: [1, 1, 1, .22, 1, 1, 1, .22, 1] }} transition={{ ...weekThreeLoop, times: [0, .13, .27, .43, .54, .63, .74, .84, 1] }}>{text.activity}</motion.span>
    <motion.span className="demo-hand week-three-demo-hand hierarchy" animate={{ left: ["13%", "13%", "62%", "62%", "13%", "13%", "62%", "62%", "13%"], top: ["70%", "66%", "60%", "60%", "70%", "66%", "40%", "40%", "70%"] }} transition={{ ...weekThreeLoop, times: [0, .13, .27, .43, .54, .63, .74, .84, 1] }}>👉</motion.span>
    <motion.span className="week-three-demo-verdict correct" animate={{ opacity: [0, 0, 1, 1, 0, 0], scale: [.6, .6, 1.1, 1, .6, .6] }} transition={{ ...weekThreeLoop, times: [0, .25, .31, .43, .54, 1] }}>{text.correct}</motion.span>
    <motion.span className="week-three-demo-verdict wrong" animate={{ opacity: [0, 0, 0, 0, 0, 1, 1, 0], scale: [.6, .6, .6, .6, .6, 1.1, 1, .6] }} transition={{ ...weekThreeLoop, times: [0, .5, .58, .64, .72, .76, .85, 1] }}>{text.wrong}</motion.span>
  </div>;
}

function WeekThreeMissingStepDemo() {
  const { locale } = useI18n();
  const text = weekThreeDemoCopy[locale].missing;
  return <div className="module-demo week-three-demo week-three-missing-demo" aria-hidden="true">
    <div className="week-three-missing-chain">
      <span className="week-three-missing-endpoint">{text.first}</span><b>→</b>
      <motion.div className="week-three-missing-box" animate={{ backgroundColor: ["#0f172a", "#0f172a", "#eef2ff", "#eef2ff", "#0f172a"], borderColor: ["#475569", "#475569", "#a5b4fc", "#a5b4fc", "#475569"], color: ["#f8fafc", "#f8fafc", "#312e81", "#312e81", "#f8fafc"] }} transition={{ ...weekThreeLoop, times: [0, .34, .48, .72, 1] }}>
        <motion.b animate={{ opacity: [1, 1, 0, 0, 1] }} transition={{ ...weekThreeLoop, times: [0, .36, .46, .74, 1] }}>?</motion.b>
        <motion.small animate={{ opacity: [0, 0, 1, 1, 0], scale: [.8, .8, 1, 1, .8] }} transition={{ ...weekThreeLoop, times: [0, .39, .49, .72, 1] }}>{text.correct}</motion.small>
      </motion.div>
      <b>→</b><span className="week-three-missing-endpoint">{text.last}</span>
    </div>
    <div className="week-three-missing-options"><span>{text.alternative}</span><motion.span animate={{ color: ["#334155", "#334155", "#047857", "#047857", "#334155"], backgroundColor: ["#fff", "#fff", "#d1fae5", "#d1fae5", "#fff"], borderColor: ["#cbd5e1", "#cbd5e1", "#34d399", "#34d399", "#cbd5e1"], scale: [1, 1, 1.06, 1.06, 1] }} transition={{ ...weekThreeLoop, times: [0, .36, .49, .72, 1] }}>{text.correct} ✓</motion.span><span>{text.wrong}</span></div>
    <motion.span className="demo-hand week-three-demo-hand week-three-missing-hand" animate={{ y: [10, 10, 1, 1, 10], scale: [1, 1, .82, 1, 1] }} transition={{ ...weekThreeLoop, times: [0, .33, .49, .72, 1] }}>👆</motion.span>
  </div>;
}

function MiniFlowchartSymbol({ symbol }: { symbol: FlowSymbol }) {
  return <svg className={`flowchart-demo-symbol flow-symbol-${symbol}`} viewBox="0 0 152 58" aria-hidden="true" preserveAspectRatio="xMidYMid meet"><FlowSymbolShape symbol={symbol} /></svg>;
}

function WeekThreeFlowchartDemo() {
  const { locale } = useI18n();
  const text = weekThreeDemoCopy[locale].flow;
  const { demoRef, decisionPaletteRef, processPaletteRef, decisionSlotRef, layout } = useFlowDemoLayout();
  const targetDelta = (source: RelativeRect) => layout ? {
    x: layout.target.left + layout.target.width / 2 - (source.left + source.width / 2),
    y: layout.target.top + layout.target.height / 2 - (source.top + source.height / 2),
  } : { x: 0, y: 0 };
  const movingStyle = (source: RelativeRect) => ({ left: source.left, top: source.top, width: source.width, height: source.height });
  const handStyle = (source: RelativeRect) => ({ left: source.left + source.width / 2 - 8, top: source.top + source.height / 2 + 4 });
  const decisionDelta = layout ? targetDelta(layout.decision) : null;
  const processDelta = layout ? targetDelta(layout.process) : null;

  return <div ref={demoRef} className="module-demo week-three-demo week-three-flow-demo" aria-hidden="true">
    <svg className="week-three-flow-map" viewBox="0 0 360 150" preserveAspectRatio="xMidYMid meet">
      <defs><marker id="week-three-flow-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" /></marker></defs>
      <path className="week-three-flow-line" d="M 180 27 V 37" markerEnd="url(#week-three-flow-arrow)" />
      <path className="week-three-flow-line" d="M 216 56 H 249" markerEnd="url(#week-three-flow-arrow)" />
      <path className="week-three-flow-line" d="M 170 76 V 98 H 118" markerEnd="url(#week-three-flow-arrow)" />
      <path className="week-three-flow-line return" d="M 18 111 H 7 V 57 H 144" markerEnd="url(#week-three-flow-arrow)" />
      <FlowSymbolShape symbol="startEnd" x={135} y={5} width={90} height={22} /><text x="180" y="19" className="week-three-flow-text">{text.start}</text>
      <motion.polygon ref={decisionSlotRef} className="week-three-flow-slot" points="180,37 216,56 180,76 144,56" animate={{ fill: ["#f8fafc", "#f8fafc", "#d1fae5", "#d1fae5", "#f8fafc", "#f8fafc", "#fff1f2", "#fff1f2", "#f8fafc"], stroke: ["#94a3b8", "#94a3b8", "#34d399", "#34d399", "#94a3b8", "#94a3b8", "#f87171", "#f87171", "#94a3b8"] }} transition={{ ...weekThreeFlowLoop, times: [0, .18, .22, .36, .45, .66, .75, .84, 1] }} /><text x="180" y="60" className="week-three-flow-text">{text.check}</text>
      <FlowSymbolShape symbol="startEnd" x={249} y={45} width={88} height={22} /><text x="293" y="59" className="week-three-flow-text">{text.end}</text>
      <FlowSymbolShape symbol="process" x={18} y={99} width={100} height={24} /><text x="68" y="114" className="week-three-flow-text">{text.update}</text>
      <text x="228" y="48" className="week-three-flow-label">{text.yes}</text><text x="122" y="91" className="week-three-flow-label">{text.no}</text><text x="11" y="83" className="week-three-flow-label">{text.return}</text>
      <motion.g animate={{ opacity: [0, 0, 0, 1, 1, 0, 0] }} transition={{ ...weekThreeFlowLoop, times: [0, .14, .20, .22, .36, .44, 1] }}><FlowSymbolShape symbol="decision" x={144} y={37} width={72} height={39} /></motion.g>
      <motion.g className="week-three-flow-wrong-symbol" animate={{ opacity: [0, 0, 0, 0, 1, 1, 0] }} transition={{ ...weekThreeFlowLoop, times: [0, .58, .68, .73, .75, .84, 1] }}><FlowSymbolShape symbol="process" x={148} y={43} width={64} height={27} /></motion.g>
    </svg>
    <div className="week-three-flow-palette"><span><span ref={decisionPaletteRef} className="week-three-flow-palette-symbol"><MiniFlowchartSymbol symbol="decision" /></span><small>{text.decision}</small></span><span><span ref={processPaletteRef} className="week-three-flow-palette-symbol"><MiniFlowchartSymbol symbol="process" /></span><small>{text.process}</small></span></div>
    {layout && decisionDelta && <><motion.span className="week-three-flow-moving-symbol correct" style={movingStyle(layout.decision)} animate={{ x: [0, 0, decisionDelta.x, decisionDelta.x, 0, 0], y: [0, 0, decisionDelta.y, decisionDelta.y, 0, 0], opacity: [1, 1, 1, 1, 0, 0] }} transition={{ ...weekThreeFlowLoop, times: [0, .06, .21, .36, .44, 1] }}><MiniFlowchartSymbol symbol="decision" /></motion.span><motion.span className="demo-hand week-three-demo-hand week-three-flow-hand correct" style={handStyle(layout.decision)} animate={{ x: [0, 0, decisionDelta.x, decisionDelta.x, 0, 0], y: [0, 0, decisionDelta.y, decisionDelta.y, 0, 0], opacity: [1, 1, 1, 1, 0, 0], scale: [1, 1, .86, 1, 1, 1] }} transition={{ ...weekThreeFlowLoop, times: [0, .06, .21, .36, .44, 1] }}>👉</motion.span></>}
    {layout && processDelta && <><motion.span className="week-three-flow-moving-symbol wrong" style={movingStyle(layout.process)} animate={{ x: [0, 0, 0, processDelta.x, processDelta.x, 0, 0], y: [0, 0, 0, processDelta.y, processDelta.y, 0, 0], opacity: [0, 0, 1, 1, 1, 0, 0] }} transition={{ ...weekThreeFlowLoop, times: [0, .58, .64, .75, .84, .9, 1] }}><MiniFlowchartSymbol symbol="process" /></motion.span><motion.span className="demo-hand week-three-demo-hand week-three-flow-hand wrong" style={handStyle(layout.process)} animate={{ x: [0, 0, 0, processDelta.x, processDelta.x, 0, 0], y: [0, 0, 0, processDelta.y, processDelta.y, 0, 0], opacity: [0, 0, 1, 1, 1, 0, 0], scale: [1, 1, 1, .86, 1, 1, 1] }} transition={{ ...weekThreeFlowLoop, times: [0, .58, .64, .75, .84, .9, 1] }}>👉</motion.span></>}
  </div>;
}

function WeekFourFactoryDemo() {
  const { locale } = useI18n();
  const text = weekFourDemoCopy[locale];
  const transition = { duration: 10, repeat: Infinity, ease: "easeInOut" as const, times: [0, .08, .16, .2, .32, .4, .52, .6, .72, .82, 1] };
  return <div className="module-demo week-four-demo week-four-factory-demo" aria-hidden="true">
    <p className="week-four-factory-prompt" data-i18n-skip>{text.factoryPrompt}</p>
    <motion.div className="week-four-factory-marker machine" animate={{ borderColor: ["#9fb7aa", "#d4a62a", "#9fb7aa", "#9fb7aa", "#9fb7aa", "#e05a62", "#e05a62", "#d4a62a", "#d4a62a", "#36a269", "#9fb7aa"], boxShadow: ["none", "0 0 0 3px rgba(212,166,42,.24)", "none", "none", "none", "0 0 0 3px rgba(224,90,98,.22)", "none", "0 0 0 4px rgba(212,166,42,.28)", "0 0 0 4px rgba(212,166,42,.28)", "0 0 0 3px rgba(54,162,105,.24)", "none"] }} transition={transition}>
      <motion.span animate={{ rotate: [0, 35, 70, 90, 160, 310, 310, 310, 345, 420, 450] }} transition={transition}>⚙</motion.span><b>{text.machine}</b>
    </motion.div>
    <motion.div className="week-four-factory-marker sensor" animate={{ borderColor: ["#9fb7aa", "#9fb7aa", "#d4a62a", "#9fb7aa", "#9fb7aa", "#9fb7aa", "#9fb7aa", "#9fb7aa", "#9fb7aa", "#9fb7aa", "#9fb7aa"], boxShadow: ["none", "none", "0 0 0 3px rgba(212,166,42,.24)", "none", "none", "none", "none", "none", "none", "none", "none"] }} transition={transition}><span>◉</span><b>{text.sensor}</b></motion.div>
    <motion.div className="week-four-factory-marker workers" animate={{ borderColor: ["#9fb7aa", "#9fb7aa", "#9fb7aa", "#d4a62a", "#9fb7aa", "#9fb7aa", "#9fb7aa", "#9fb7aa", "#9fb7aa", "#9fb7aa", "#9fb7aa"], boxShadow: ["none", "none", "none", "0 0 0 3px rgba(212,166,42,.24)", "none", "none", "none", "none", "none", "none", "none"] }} transition={transition}><span>♟♟</span><b>{text.workers}</b></motion.div>
    <div className="week-four-factory-belt"><motion.i animate={{ x: [0, 10, 24, 40, 58, 58, 58, 62, 88, 98, 108] }} transition={transition}>▣</motion.i><motion.i animate={{ x: [20, 30, 45, 60, 76, 76, 76, 80, 104, 114, 124] }} transition={transition}>▣</motion.i></div>
    <motion.span className="week-four-factory-info" data-i18n-skip animate={{ opacity: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], scale: [.8, 1, .8, .8, .8, .8, .8, .8, .8, .8, .8] }} transition={transition}>{text.machine}: {text.machineInfo}</motion.span>
    <motion.span className="week-four-factory-info" data-i18n-skip animate={{ opacity: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0], scale: [.8, .8, 1, .8, .8, .8, .8, .8, .8, .8, .8] }} transition={transition}>{text.sensor}: {text.sensorInfo}</motion.span>
    <motion.span className="week-four-factory-info" data-i18n-skip animate={{ opacity: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], scale: [.8, .8, .8, 1, .8, .8, .8, .8, .8, .8, .8] }} transition={transition}>{text.workers}: {text.workersInfo}</motion.span>
    <div className="week-four-factory-options"><motion.span animate={{ backgroundColor: ["#fff", "#fff", "#fff", "#fff", "#fff", "#fee2e2", "#fee2e2", "#fff", "#fff", "#fff", "#fff"], borderColor: ["#cbd5e1", "#cbd5e1", "#cbd5e1", "#cbd5e1", "#cbd5e1", "#e05a62", "#e05a62", "#cbd5e1", "#cbd5e1", "#cbd5e1", "#cbd5e1"] }} transition={transition}>{text.wrongDecision}</motion.span><motion.span animate={{ backgroundColor: ["#fff", "#fff", "#fff", "#fff", "#fff", "#fff", "#fff", "#fef3c7", "#fef3c7", "#d1fae5", "#fff"], borderColor: ["#cbd5e1", "#cbd5e1", "#cbd5e1", "#cbd5e1", "#cbd5e1", "#cbd5e1", "#cbd5e1", "#d4a62a", "#d4a62a", "#36a269", "#cbd5e1"] }} transition={transition}>{text.rightDecision}</motion.span></div>
    <motion.span className="week-four-factory-state" data-i18n-skip animate={{ opacity: [0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0], color: ["#be314b", "#be314b", "#be314b", "#be314b", "#be314b", "#be314b", "#be314b", "#be314b", "#17643e", "#17643e", "#17643e"] }} transition={transition}>{text.jammed}<motion.b animate={{ opacity: [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0] }} transition={transition}> · {text.rescue}</motion.b><motion.em animate={{ opacity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0] }} transition={transition}> {text.repaired}</motion.em></motion.span>
    <motion.span className="week-four-factory-flow" data-i18n-skip animate={{ opacity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0] }} transition={transition}>{text.factoryFlow}</motion.span>
    <motion.span className="week-four-demo-hand week-four-factory-hand" animate={{ left: ["19%", "19%", "50%", "79%", "29%", "29%", "29%", "71%", "71%", "19%", "19%"], top: ["42%", "42%", "42%", "42%", "82%", "82%", "82%", "82%", "82%", "42%", "42%"], scale: [1, .82, .82, .82, 1, .82, 1, .82, 1, .82, 1] }} transition={transition}>👆</motion.span>
  </div>;
}

function WeekFourBossApproachDemo() {
  const { locale } = useI18n();
  const text = weekFourDemoCopy[locale];
  const transition = { duration: 4.3, repeat: Infinity, ease: "easeInOut" as const, times: [0, .24, .42, .67, 1] };
  return <div className="module-demo week-four-demo week-four-boss-demo" aria-hidden="true">
    <div className="week-four-boss-avatar"><BossPortrait variant={2} /></div>
    <blockquote data-i18n-skip>“{text.bossQuote}”</blockquote>
    <div className="week-four-boss-options"><span>{text.otherApproach}</span><span>{text.analytical}</span><span>{text.reductionist}</span><motion.span animate={{ color: ["#334155", "#334155", "#047857", "#047857", "#334155"], backgroundColor: ["#fff", "#fff", "#d1fae5", "#d1fae5", "#fff"], borderColor: ["#cbd5e1", "#cbd5e1", "#34d399", "#34d399", "#cbd5e1"], scale: [1, 1, 1.04, 1.04, 1] }} transition={transition}>✓ {text.experimental}</motion.span></div>
    <motion.span className="week-four-demo-hand week-four-boss-hand" animate={{ x: [0, 0, 0, 0, 0], y: [7, 7, -3, -3, 7], scale: [1, 1, .83, 1, 1] }} transition={transition}>👆</motion.span>
  </div>;
}

function WeekFourSystemProcessDemo() {
  const { locale } = useI18n();
  const text = weekFourDemoCopy[locale];
  const { demoRef, correctCardRef, wrongCardRef, systemTargetRef, trashTargetRef, layout } = useSystemDemoLayout();
  const transition = { duration: 5.8, repeat: Infinity, ease: "easeInOut" as const, times: [0, .08, .25, .34, .43, .5, .57, .72, .79, .88, 1] };
  const delta = (source: RelativeRect, target: RelativeRect) => ({
    x: target.left + target.width / 2 - (source.left + source.width / 2),
    y: target.top + target.height / 2 - (source.top + source.height / 2),
  });
  const correctDelta = layout ? delta(layout.correct, layout.system) : { x: 0, y: 0 };
  const wrongDelta = layout ? delta(layout.wrong, layout.trash) : { x: 0, y: 0 };
  const cardStyle = (rect: RelativeRect) => ({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
  const handStyle = (rect: RelativeRect) => ({ left: rect.left + rect.width * .67, top: rect.top + rect.height * .52 });

  return <div ref={demoRef} className="module-demo week-four-demo week-four-system-demo" aria-hidden="true">
    <p className="week-four-system-prompt" data-i18n-skip>{text.drag}</p>
    <div className="week-four-system-targets">
      <motion.div ref={systemTargetRef} className="week-four-system-target accept" animate={{ borderColor: ["#75bd93", "#75bd93", "#23824f", "#75bd93", "#75bd93", "#75bd93", "#75bd93", "#75bd93", "#75bd93", "#75bd93", "#75bd93"], scale: [1, 1, 1.025, 1, 1, 1, 1, 1, 1, 1, 1] }} transition={transition}><b>✓</b><span>{text.systemIs}</span></motion.div>
      <div className="week-four-system-target reject"><div className="week-four-demo-trash"><motion.i className="week-four-demo-trash-lid" animate={{ rotate: [0, 0, 0, 0, 0, -32, -32, -32, 0, 0, 0] }} transition={transition} /><div ref={trashTargetRef} className="week-four-demo-trash-mouth" /><div className="week-four-demo-trash-body">×</div></div><span>{text.systemIsNot}</span></div>
    </div>
    <div className="week-four-system-source"><span ref={correctCardRef} /><span ref={wrongCardRef} /></div>
    {layout && <>
      <motion.span className="week-four-system-moving-card correct" style={cardStyle(layout.correct)} data-i18n-skip animate={{ x: [0, 0, correctDelta.x, correctDelta.x, correctDelta.x, 0, 0, 0, 0, 0, 0], y: [0, 0, correctDelta.y, correctDelta.y, correctDelta.y, 0, 0, 0, 0, 0, 0], opacity: [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1], scale: [1, 1.03, .94, .94, .94, 1, 1, 1, 1, 1, 1] }} transition={transition}>{text.correctCard}</motion.span>
      <motion.span className="week-four-demo-hand correct" style={handStyle(layout.correct)} animate={{ x: [0, 0, correctDelta.x, correctDelta.x, correctDelta.x, 0, 0, 0, 0, 0, 0], y: [0, 0, correctDelta.y, correctDelta.y, correctDelta.y, 0, 0, 0, 0, 0, 0], opacity: [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1], scale: [1, .84, 1, 1, 1, 1, 1, 1, 1, 1, 1] }} transition={transition}>👆</motion.span>
      <motion.span className="week-four-system-moving-card wrong" style={cardStyle(layout.wrong)} data-i18n-skip animate={{ x: [0, 0, 0, 0, 0, 0, 0, wrongDelta.x, wrongDelta.x, wrongDelta.x, 0], y: [0, 0, 0, 0, 0, 0, 0, wrongDelta.y, wrongDelta.y, wrongDelta.y, 0], opacity: [0, 0, 0, 0, 1, 1, 1, 1, .18, 0, 0], scale: [1, 1, 1, 1, 1, 1.03, 1, .62, .24, .2, 1] }} transition={transition}>{text.wrongCard}</motion.span>
      <motion.span className="week-four-demo-hand wrong" style={handStyle(layout.wrong)} animate={{ x: [0, 0, 0, 0, 0, 0, 0, wrongDelta.x, wrongDelta.x, wrongDelta.x, 0], y: [0, 0, 0, 0, 0, 0, 0, wrongDelta.y, wrongDelta.y, wrongDelta.y, 0], opacity: [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0], scale: [1, 1, 1, 1, 1, .84, 1, 1, 1, 1, 1] }} transition={transition}>👆</motion.span>
    </>}
  </div>;
}

function WeekFiveDelayTrailDemo() {
  const { locale } = useI18n();
  const demoCopy = {
    tr: {
      prompt: "Başlatan kararı bul",
      months: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran"],
      before: ["Yeni ekipman kuruldu", "Eğitim kısaltıldı", "Hatalar sıklaştı", "Hatalı ürün arttı", "İadeler çoğaldı", "Şikâyetler arttı"],
      after: ["Yeni ekipman kuruldu", "Eğitim tamamlandı", "Hatalar azaldı", "Kalite iyileşti", "İadeler azaldı", "Şikâyetler azaldı"],
    },
    en: {
      prompt: "Find the starting decision",
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      before: ["New equipment installed", "Training shortened", "Errors increased", "Defects increased", "Returns increased", "Complaints increased"],
      after: ["New equipment installed", "Training completed", "Errors decreased", "Quality improved", "Returns decreased", "Complaints decreased"],
    },
  } as const;
  const text = demoCopy[locale];
  const times = [0, .13, .24, .35, .46, .57, .78, 1];
  const transition = { duration: 6.4, repeat: Infinity, ease: "easeInOut" as const, times };
  return <div className="module-demo week-five-delay-demo" aria-hidden="true">
    <b className="week-five-delay-demo-prompt">{text.prompt}</b>
    <div className="week-five-delay-demo-grid">
      {text.months.map((month, index) => {
        const threshold = index === 0 ? 9 : index + 1;
        const changed = times.map((_, point) => index > 0 && point >= threshold && point < 7 ? 1 : 0);
        return <motion.span key={month} animate={{ backgroundColor: changed.map((value) => value ? "#dcfce7" : "#ffffff"), borderColor: changed.map((value) => value ? "#36a269" : "#c7d2fe") }} transition={transition}>
          <small>{month}</small>
          <motion.i animate={{ opacity: changed.map((value) => value ? 0 : 1) }} transition={transition}>{text.before[index]}</motion.i>
          {index > 0 && <motion.i className="after" animate={{ opacity: changed }} transition={transition}>{text.after[index]}</motion.i>}
        </motion.span>;
      })}
    </div>
    <motion.span className="week-five-delay-demo-hand" animate={{ y: [8, 8, -3, 5, 5, 5, 5, 8], opacity: [1, 1, 1, 0, 0, 0, 0, 1], scale: [1, .82, 1, 1, 1, 1, 1, 1] }} transition={transition}>👆</motion.span>
  </div>;
}

function WeekFiveProblemHunterDemo() {
  const { locale } = useI18n();
  const copy = {
    tr: {
    mission: "YAPIYI YAKALA",
    definition: "Kuralı, planlama eksikliğini veya bağlantı sorununu yakala.",
    target: "Düzenli bakım planı yok.",
    },
    en: {
    mission: "CATCH THE STRUCTURE",
    definition: "Catch the rule, planning gap, or connection problem.",
    target: "There is no regular maintenance plan.",
    },
  } as const;
  const text = copy[locale];
  const transition = { duration: 4.4, repeat: Infinity, ease: "easeInOut" as const, times: [0, .2, .38, .55, .72, 1] };
  return <div className="module-demo week-five-hunter-demo" aria-hidden="true">
    <div className="week-five-hunter-demo-mission"><small>{text.mission}</small><b>{text.definition}</b></div>
    <div className="week-five-hunter-demo-grid">
      {Array.from({ length: 6 }, (_, hole) => <span className="week-five-hunter-demo-hole" key={hole}>
        {hole === 3 && <motion.i data-i18n-skip animate={{ y: [18, 18, 0, 0, 18, 18], opacity: [0, 0, 1, 1, 0, 0], scale: [.9, .9, 1, 1.04, .9, .9], backgroundColor: ["#fff", "#fff", "#fff", "#dcfce7", "#fff", "#fff"] }} transition={transition}>⚙️ <b>{text.target}</b></motion.i>}
      </span>)}
    </div>
    <motion.span className="week-five-hunter-demo-hand" animate={{ x: [0, 0, 0, 0, 0, 0], y: [9, 9, -2, -2, 9, 9], opacity: [0, 0, 1, 1, 0, 0], scale: [1, 1, .82, 1, 1, 1] }} transition={transition}>👆</motion.span>
  </div>;
}

function WeekFiveBalanceMasterDemo() {
  const { locale } = useI18n();
  const copy = {
    tr: { production: "Üretim", risk: "Arıza riski", accelerate: "Üretimi Hızlandır", maintenance: "Planlı Bakım", balance: "İş Yükünü Dengele", quality: "Kalite Kontrolü", delayed: "5 sn sonra: arıza riski arttı" },
    en: { production: "Production", risk: "Failure risk", accelerate: "Accelerate Production", maintenance: "Planned Maintenance", balance: "Balance Workload", quality: "Quality Control", delayed: "5 sec later: failure risk increased" },
  } as const;
  const text = copy[locale];
  const transition = { duration: 7.2, repeat: Infinity, ease: "easeInOut" as const, times: [0, .12, .28, .48, .68, .86, 1] };
  return <div className="module-demo week-five-balance-demo" aria-hidden="true">
    <div className="week-five-balance-demo-metrics"><span><b>{text.production}</b><motion.i animate={{ width: ["52%", "52%", "82%", "82%", "67%", "52%", "52%"], backgroundColor: ["#36a269", "#36a269", "#36a269", "#36a269", "#d4a62a", "#36a269", "#36a269"] }} transition={transition} /></span><span><b>{text.risk}</b><motion.i animate={{ width: ["18%", "18%", "22%", "22%", "73%", "32%", "18%"], backgroundColor: ["#36a269", "#36a269", "#36a269", "#36a269", "#d94b60", "#d4a62a", "#36a269"] }} transition={transition} /></span></div>
    <div className="week-five-balance-demo-factory"><motion.span animate={{ x: [0, 0, 45, 95, 140, 180, 0] }} transition={transition}>📦</motion.span><motion.b animate={{ rotate: [0, 0, 90, 180, 270, 360, 0], color: ["#315c4d", "#315c4d", "#315c4d", "#315c4d", "#972a3e", "#315c4d", "#315c4d"] }} transition={transition}>⚙</motion.b></div>
    <div className="week-five-balance-demo-actions"><motion.span animate={{ backgroundColor: ["#fff", "#dff2e6", "#dff2e6", "#fff", "#fff", "#fff", "#fff"], scale: [1, .97, 1.03, 1, 1, 1, 1] }} transition={transition}>⚡ {text.accelerate}</motion.span><span>🔧 {text.maintenance}</span><span>⚖️ {text.balance}</span><span>🔎 {text.quality}</span></div>
    <motion.div className="week-five-balance-demo-notice" animate={{ opacity: [0, 0, 0, 0, 1, 1, 0] }} transition={transition}>↪ {text.delayed}</motion.div>
    <motion.span className="week-five-balance-demo-hand" animate={{ y: [7, -2, -2, 7, 7, 7, 7], scale: [1, .82, 1, 1, 1, 1, 1], opacity: [1, 1, 1, 0, 0, 0, 1] }} transition={transition}>👆</motion.span>
  </div>;
}

function WeekSixFlowOperationDemo() {
  const { locale } = useI18n();
  const demoCopy = {
    tr: { title: "Hedef Depo", production: "Üretim", shipping: "Sevkiyat", target: "Hedef", day: "2 gün", unit: "/gün" },
    en: { title: "Target Depot", production: "Production", shipping: "Shipping", target: "Target", day: "2 days", unit: "/day" },
  } as const;
  const text = demoCopy[locale];
  const transition = { duration: 5.2, repeat: Infinity, ease: "easeInOut" as const, times: [0, .18, .3, .48, .66, .82, 1] };
  return <div className="module-demo week-six-flow-demo" aria-hidden="true">
    <div className="week-six-flow-demo-heading"><b>{text.title}</b><span>{text.shipping} 8{text.unit} · {text.day}</span></div>
    <div className="week-six-flow-demo-factory"><i /><i /><i /><b>40</b></div>
    <div className="week-six-flow-demo-belt"><motion.i animate={{ x: [-20, -20, 68, 132, 175, 175, -20] }} transition={transition} /><motion.i animate={{ x: [-48, -48, 34, 98, 150, 150, -48] }} transition={transition} /></div>
    <div className="week-six-flow-demo-depot"><small>{text.target} 52</small><motion.b animate={{ opacity: [1, 1, 1, 0, 0, 0, 1] }} transition={transition}>40</motion.b><motion.b className="result" animate={{ opacity: [0, 0, 0, 1, 1, 1, 0], scale: [.8, .8, .8, 1.08, 1, 1, .8] }} transition={transition}>52 ✓</motion.b></div>
    <div className="week-six-flow-demo-rates"><span>10{text.unit}</span><motion.span animate={{ color: ["#315c4d", "#315c4d", "#17643e", "#17643e", "#17643e", "#315c4d", "#315c4d"], backgroundColor: ["#fff", "#fff", "#dff2e6", "#dff2e6", "#dff2e6", "#fff", "#fff"], borderColor: ["#b9d8c4", "#b9d8c4", "#36a269", "#36a269", "#36a269", "#b9d8c4", "#b9d8c4"], scale: [1, 1, 1.06, 1.06, 1, 1, 1] }} transition={transition}>14{text.unit}</motion.span><span>18{text.unit}</span></div>
    <motion.span className="week-six-flow-demo-hand" animate={{ y: [8, 8, -2, -2, 5, 8, 8], scale: [1, 1, .82, 1, 1, 1, 1], opacity: [1, 1, 1, 1, 0, 0, 1] }} transition={transition}>👆</motion.span>
    <motion.div className="week-six-flow-demo-formula" animate={{ opacity: [0, 0, 0, .15, 1, 1, 0], y: [4, 4, 4, 4, 0, 0, 4] }} transition={transition}>40 + (14 − 8) × 2 = 52</motion.div>
    <span className="week-six-flow-demo-label">{text.production}</span>
  </div>;
}

function WeekSixSimulationRepairDemo() {
  const { locale } = useI18n();
  const demoCopy = {
    tr: { case: "Stok işaretleri", reference: "Simülasyon: 68", verification: "Doğrulama", validation: "Geçerlilik", diagnose: "1 · Teşhis", repair: "2 · Hatalı parçaya dokun", test: "3 · Otomatik sonuç", output: "Düzeltilmiş" },
    en: { case: "Stock signs", reference: "Simulation: 68", verification: "Verification", validation: "Validation", diagnose: "1 · Diagnose", repair: "2 · Tap faulty part", test: "3 · Automatic result", output: "Fixed" },
  } as const;
  const text = demoCopy[locale];
  const transition = { duration: 6.4, repeat: Infinity, ease: "easeInOut" as const, times: [0, .14, .28, .42, .6, .76, .9, 1] };
  return <div className="module-demo week-six-repair-demo" aria-hidden="true">
    <div className="week-six-repair-demo-head"><b>{text.case}</b><span>{text.reference}</span></div>
    <div className="week-six-repair-demo-steps"><motion.span animate={{ color: ["#315c4d", "#315c4d", "#17643e", "#17643e", "#60756c", "#60756c", "#60756c", "#315c4d"] }} transition={transition}>{text.diagnose}</motion.span><motion.span animate={{ color: ["#60756c", "#60756c", "#60756c", "#315c4d", "#17643e", "#17643e", "#60756c", "#60756c"] }} transition={transition}>{text.repair}</motion.span><motion.span animate={{ color: ["#60756c", "#60756c", "#60756c", "#60756c", "#60756c", "#315c4d", "#17643e", "#60756c"] }} transition={transition}>{text.test}</motion.span></div>
    <div className="week-six-repair-demo-diagnosis"><motion.span animate={{ color: ["#315c4d", "#315c4d", "#17643e", "#17643e", "#17643e", "#315c4d", "#315c4d", "#315c4d"], borderColor: ["#bfd5c9", "#bfd5c9", "#46a979", "#46a979", "#46a979", "#bfd5c9", "#bfd5c9", "#bfd5c9"], backgroundColor: ["#fff", "#fff", "#e6f7ec", "#e6f7ec", "#e6f7ec", "#fff", "#fff", "#fff"] }} transition={transition}>{text.verification}</motion.span><span>{text.validation}</span></div>
    <div className="week-six-repair-demo-equation"><b>100</b><motion.i animate={{ color: ["#315c4d", "#315c4d", "#315c4d", "#315c4d", "#17643e", "#17643e", "#17643e", "#315c4d"], rotateX: [0, 0, 0, 0, 180, 180, 180, 0] }} transition={transition}>−</motion.i><b>20</b><i>−</i><b>12</b><em>=</em><motion.strong><motion.span animate={{ opacity: [1, 1, 1, 1, 0, 0, 0, 1] }} transition={transition}>68</motion.span><motion.span animate={{ opacity: [0, 0, 0, 0, 1, 1, 1, 0] }} transition={transition}>108 ✓</motion.span></motion.strong></div>
    <motion.div className="week-six-repair-demo-test" animate={{ opacity: [0, 0, 0, 0, 0, .2, 1, 0], scale: [.94, .94, .94, .94, .94, .94, 1, .94] }} transition={transition}>{text.output}: 108</motion.div>
    <motion.span className="week-six-repair-demo-hand" animate={{ x: [0, 0, -76, -76, 18, 90, 90, 0], y: [0, 0, -45, -45, 12, 12, 12, 0], scale: [1, 1, .82, 1, .82, .82, 1, 1], opacity: [1, 1, 1, 1, 1, 1, 0, 0] }} transition={transition}>👆</motion.span>
  </div>;
}

function WeekSixModelAgencyDemo() {
  const { locale } = useI18n();
  const l = (tr: string, en: string) => locale === "tr" ? tr : en;
  const text = { role: l("Şehir Plancısı", "Urban Planner"), request: l("Yeni meydanın ölçekli maketini hazırlayın.", "Prepare a scale model of the new square."), question: l("Model aracın hangisi?", "Which modelling tool?"), physical: l("Fiziksel", "Physical"), analog: l("Analog", "Analog"), schematic: l("Şematik", "Schematic"), mathematical: l("Matematiksel", "Mathematical") };
  const transition = { duration: 4.8, repeat: Infinity, ease: "easeInOut" as const, times: [0, .2, .38, .56, .76, 1] };
  return <div className="module-demo week-six-agency-demo" aria-hidden="true">
    <div className="week-six-agency-demo-client"><BossPortrait variant={4} /><span>🏙️</span></div>
    <div className="week-six-agency-demo-brief"><b>{text.role}</b><p>“{text.request}”</p><strong>{text.question}</strong></div>
    <div className="week-six-agency-demo-options"><motion.span animate={{ borderColor: ["#d8e3dc", "#d8e3dc", "#36a269", "#36a269", "#36a269", "#d8e3dc"], backgroundColor: ["#fff", "#fff", "#e6f7ec", "#e6f7ec", "#e6f7ec", "#fff"], scale: [1, 1, .97, 1.03, 1, 1] }} transition={transition}>📦 {text.physical}</motion.span><span>〰️ {text.analog}</span><span>🔗 {text.schematic}</span><span>∑ {text.mathematical}</span></div>
    <motion.span className="week-six-agency-demo-hand" animate={{ x: [66, 66, 0, 0, 0, 66], y: [28, 28, 0, 0, 0, 28], scale: [1, 1, .82, 1, 1, 1], opacity: [1, 1, 1, 1, 0, 0] }} transition={transition}>👆</motion.span>
  </div>;
}

const demos: Record<ModuleId, () => ReactNode> = {
  1: ModuleOneDemo,
  2: ModuleTwoDemo,
  3: ModuleThreeDemo,
  4: ModuleFourDemo,
  5: ModuleFiveDemo,
};

export function ModuleGameplayDemo({ moduleId, weekId = 1 }: { moduleId: ModuleId; weekId?: number }) {
  const Demo = weekId === 3 && moduleId === 1
    ? WeekThreeHierarchyDemo
    : weekId === 3 && moduleId === 2
      ? WeekThreeMissingStepDemo
      : weekId === 3 && moduleId === 3
        ? WeekThreeFlowchartDemo
      : weekId === 4 && moduleId === 1
        ? WeekFourFactoryDemo
      : weekId === 4 && moduleId === 2
        ? WeekFourBossApproachDemo
      : weekId === 4 && moduleId === 3
        ? WeekFourSystemProcessDemo
      : weekId === 5 && moduleId === 1
        ? WeekFiveDelayTrailDemo
      : weekId === 5 && moduleId === 2
        ? WeekFiveProblemHunterDemo
      : weekId === 5 && moduleId === 3
        ? WeekFiveBalanceMasterDemo
      : weekId === 6 && moduleId === 1
        ? WeekSixFlowOperationDemo
      : weekId === 6 && moduleId === 2
        ? WeekSixSimulationRepairDemo
      : weekId === 6 && moduleId === 3
        ? WeekSixModelAgencyDemo
      : demos[moduleId];
  return <MotionConfig reducedMotion="user"><Demo /></MotionConfig>;
}
