"use client";

import { MotionConfig, motion } from "framer-motion";
import { type ReactNode } from "react";
import { FlowSymbolShape } from "@/components/modules/Week3_FlowchartSymbols/FlowSymbolShape";
import type { FlowSymbol } from "@/components/modules/Week3_FlowchartSymbols/flowchartContent";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { ModuleId } from "@/types";

const loop = { duration: 3.2, repeat: Infinity, repeatDelay: .35, ease: "easeInOut" as const };

const weekThreeLoop = { duration: 8.4, repeat: Infinity, ease: "easeInOut" as const };

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
      <span>{text.first}</span><b>→</b>
      <motion.span className="week-three-missing-slot" animate={{ backgroundColor: ["#f8fafc", "#f8fafc", "#d1fae5", "#d1fae5", "#f8fafc", "#fff1f2", "#fff1f2", "#f8fafc"], borderColor: ["#94a3b8", "#94a3b8", "#34d399", "#34d399", "#94a3b8", "#f87171", "#f87171", "#94a3b8"], x: [0, 0, 0, 0, 0, -3, 3, 0] }} transition={{ ...weekThreeLoop, times: [0, .16, .27, .43, .56, .73, .8, 1] }}>
        <motion.i animate={{ opacity: [1, 1, 0, 0, 1, 0, 0, 1] }} transition={{ ...weekThreeLoop, times: [0, .19, .25, .45, .56, .72, .84, 1] }}>?</motion.i>
        <motion.small animate={{ opacity: [0, 0, 1, 1, 0, 0] }} transition={{ ...weekThreeLoop, times: [0, .2, .27, .43, .56, 1] }}>{text.correct}</motion.small>
        <motion.em animate={{ opacity: [0, 0, 0, 0, 0, 1, 1, 0] }} transition={{ ...weekThreeLoop, times: [0, .58, .66, .72, .8, .83, .9, 1] }}>×</motion.em>
      </motion.span>
      <b>→</b><span>{text.last}</span>
    </div>
    <div className="week-three-missing-options"><span>{text.correct}</span><span>{text.alternative}</span><span>{text.wrong}</span></div>
    <motion.span className="week-three-missing-flying-option correct" animate={{ left: ["7%", "7%", "39%", "39%", "7%"], top: ["73%", "73%", "29%", "29%", "73%"], opacity: [1, 1, 1, .15, 1] }} transition={{ ...weekThreeLoop, times: [0, .12, .26, .43, .56] }}>{text.correct}</motion.span>
    <motion.span className="week-three-missing-flying-option wrong" animate={{ left: ["68%", "68%", "39%", "39%", "68%"], top: ["73%", "73%", "29%", "29%", "73%"], opacity: [0, 0, 0, 1, .14] }} transition={{ ...weekThreeLoop, times: [0, .58, .68, .81, .94] }}>{text.wrong}</motion.span>
    <motion.span className="demo-hand week-three-demo-hand missing" animate={{ left: ["15%", "15%", "45%", "45%", "15%", "74%", "45%", "45%", "74%"], top: ["78%", "72%", "31%", "31%", "78%", "72%", "31%", "31%", "78%"] }} transition={{ ...weekThreeLoop, times: [0, .12, .26, .43, .56, .62, .72, .82, 1] }}>👆</motion.span>
  </div>;
}

function MiniFlowchartSymbol({ symbol }: { symbol: FlowSymbol }) {
  return <svg className={`flowchart-demo-symbol flow-symbol-${symbol}`} viewBox="0 0 152 58" aria-hidden="true" preserveAspectRatio="xMidYMid meet"><FlowSymbolShape symbol={symbol} /></svg>;
}

function WeekThreeFlowchartDemo() {
  const { locale } = useI18n();
  const text = weekThreeDemoCopy[locale].flow;
  return <div className="module-demo week-three-demo week-three-flow-demo" aria-hidden="true">
    <svg className="week-three-flow-map" viewBox="0 0 360 150" preserveAspectRatio="xMidYMid meet">
      <defs><marker id="week-three-flow-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" /></marker></defs>
      <path className="week-three-flow-line" d="M 180 27 V 37" markerEnd="url(#week-three-flow-arrow)" />
      <path className="week-three-flow-line" d="M 216 56 H 249" markerEnd="url(#week-three-flow-arrow)" />
      <path className="week-three-flow-line" d="M 170 76 V 98 H 118" markerEnd="url(#week-three-flow-arrow)" />
      <path className="week-three-flow-line return" d="M 18 111 H 7 V 57 H 144" markerEnd="url(#week-three-flow-arrow)" />
      <FlowSymbolShape symbol="startEnd" x={135} y={5} width={90} height={22} /><text x="180" y="19" className="week-three-flow-text">{text.start}</text>
      <polygon className="week-three-flow-slot" points="180,37 216,56 180,76 144,56" /><text x="180" y="60" className="week-three-flow-text">{text.check}</text>
      <FlowSymbolShape symbol="startEnd" x={249} y={45} width={88} height={22} /><text x="293" y="59" className="week-three-flow-text">{text.end}</text>
      <FlowSymbolShape symbol="process" x={18} y={99} width={100} height={24} /><text x="68" y="114" className="week-three-flow-text">{text.update}</text>
      <text x="228" y="48" className="week-three-flow-label">{text.yes}</text><text x="122" y="91" className="week-three-flow-label">{text.no}</text><text x="11" y="83" className="week-three-flow-label">{text.return}</text>
      <motion.g animate={{ opacity: [0, 0, 1, 1, 0, 0] }} transition={{ ...weekThreeLoop, times: [0, .17, .27, .43, .55, 1] }}><FlowSymbolShape symbol="decision" x={144} y={37} width={72} height={39} /></motion.g>
      <motion.g className="week-three-flow-wrong-symbol" animate={{ opacity: [0, 0, 0, 0, 0, 1, 1, 0] }} transition={{ ...weekThreeLoop, times: [0, .55, .64, .7, .75, .79, .88, 1] }}><FlowSymbolShape symbol="process" x={148} y={43} width={64} height={27} /></motion.g>
    </svg>
    <div className="week-three-flow-palette"><span><MiniFlowchartSymbol symbol="decision" /><small>{text.decision}</small></span><span><MiniFlowchartSymbol symbol="process" /><small>{text.process}</small></span></div>
    <motion.span className="week-three-flow-moving-symbol correct" animate={{ left: ["6%", "6%", "51%", "51%", "6%"], top: ["54%", "54%", "27%", "27%", "54%"], opacity: [1, 1, 1, .1, 1] }} transition={{ ...weekThreeLoop, times: [0, .12, .27, .43, .55] }}><MiniFlowchartSymbol symbol="decision" /></motion.span>
    <motion.span className="week-three-flow-moving-symbol wrong" animate={{ left: ["6%", "6%", "51%", "51%", "6%"], top: ["78%", "78%", "27%", "27%", "78%"], opacity: [0, 0, 0, 1, .1] }} transition={{ ...weekThreeLoop, times: [0, .58, .68, .81, .94] }}><MiniFlowchartSymbol symbol="process" /></motion.span>
    <motion.span className="demo-hand week-three-demo-hand flow" animate={{ left: ["13%", "13%", "55%", "55%", "13%", "13%", "55%", "55%", "13%"], top: ["58%", "53%", "29%", "29%", "58%", "78%", "29%", "29%", "78%"] }} transition={{ ...weekThreeLoop, times: [0, .12, .27, .43, .55, .62, .74, .84, 1] }}>👉</motion.span>
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
      : demos[moduleId];
  return <MotionConfig reducedMotion="user"><Demo /></MotionConfig>;
}
