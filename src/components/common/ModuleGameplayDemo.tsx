"use client";

import { MotionConfig, motion } from "framer-motion";
import type { ReactNode } from "react";
import { processHierarchyPool } from "@/components/modules/Week3_ProcessHierarchy/processHierarchyContent";
import { missingProcessPool } from "@/components/modules/Week3_MissingProcess/missingProcessContent";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { ModuleId } from "@/types";

const loop = { duration: 3.2, repeat: Infinity, repeatDelay: .35, ease: "easeInOut" as const };

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
  const production = processHierarchyPool.find((item) => item.id === "production")!;
  const duration = 10;
  return <div className="module-demo hierarchy-brief-demo" aria-hidden="true">
    <motion.div className="hierarchy-demo-scene success" animate={{ opacity: [1, 1, 0, 0, 1] }} transition={{ duration, repeat: Infinity, times: [0, .42, .49, .94, 1] }}>
      <div className="hierarchy-demo-deck"><span data-i18n-skip>{production.core[locale]}</span><span data-i18n-skip>{production.subprocess[locale]}</span><motion.span data-i18n-skip animate={{ x: [0, 0, 126, 126, 0], y: [0, 0, -5, -5, 0], opacity: [1, 1, 1, 0, 1] }} transition={{ duration, repeat: Infinity, times: [0, .14, .31, .42, 1] }}>{production.activity[locale]}</motion.span></div>
      <motion.div className="hierarchy-demo-pyramid simple" animate={{ filter: ["none", "none", "drop-shadow(0 0 9px rgba(16,185,129,.7))", "drop-shadow(0 0 9px rgba(16,185,129,.7))", "none"] }} transition={{ duration, repeat: Infinity, times: [0, .28, .35, .42, 1] }}><i>{locale === "tr" ? "Ana süreç" : "Core"}</i><i>{locale === "tr" ? "Alt süreç" : "Sub"}</i><i>{locale === "tr" ? "Aktivite" : "Activity"}</i></motion.div>
      <span className="hierarchy-demo-caption">{locale === "tr" ? "Kart doğru katmana gider ✓" : "Card goes to the right layer ✓"}</span>
    </motion.div>
    <motion.div className="hierarchy-demo-scene error" animate={{ opacity: [0, 0, 1, 1, 0] }} transition={{ duration, repeat: Infinity, times: [0, .44, .5, .87, .93] }}>
      <div className="hierarchy-demo-deck"><motion.span data-i18n-skip animate={{ x: [0, 120, 116, 124, 0], y: [0, 72, 72, 72, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>{production.core[locale]}</motion.span><span data-i18n-skip>{production.subprocess[locale]}</span></div>
      <motion.div className="hierarchy-demo-pyramid simple wrong" animate={{ x: [0, -4, 4, -3, 0] }} transition={{ duration: .5, repeat: Infinity }}><i>{locale === "tr" ? "Ana süreç" : "Core"}</i><i>{locale === "tr" ? "Alt süreç" : "Sub"}</i><i>{locale === "tr" ? "Aktivite" : "Activity"}</i></motion.div>
      <span className="hierarchy-demo-caption wrong">{locale === "tr" ? "Yanlış katman kırmızı yanar" : "Wrong layer flashes red"}</span>
    </motion.div>
  </div>;
}

function WeekThreeMissingStepDemo() {
  const { locale } = useI18n();
  const order = missingProcessPool.find((item) => item.id === "online-order")!;
  const missingAnswer = order.steps[1]!;
  return <div className="module-demo missing-step-brief-demo" aria-hidden="true">
    <div className="missing-demo-chain">
      <span data-i18n-skip>{order.steps[0]![locale]}</span><b>→</b>
      <motion.span className="missing-demo-slot" animate={{ color: ["#6366f1", "#6366f1", "#065f46", "#065f46", "#6366f1"], backgroundColor: ["#f8fafc", "#f8fafc", "#d1fae5", "#d1fae5", "#f8fafc"], borderColor: ["#94a3b8", "#94a3b8", "#34d399", "#34d399", "#94a3b8"], scale: [1, 1, 1.07, 1.07, 1] }} transition={{ ...loop, times: [0, .42, .57, .82, 1] }}>
        <motion.i animate={{ opacity: [1, 1, 0, 0, 1] }} transition={{ ...loop, times: [0, .44, .53, .83, 1] }}>?</motion.i>
        <motion.small data-i18n-skip animate={{ opacity: [0, 0, 1, 1, 0] }} transition={{ ...loop, times: [0, .48, .6, .83, 1] }}>{missingAnswer[locale]}</motion.small>
      </motion.span>
      <b>→</b><span data-i18n-skip>{order.steps[3]![locale]}</span>
    </div>
    <div className="missing-demo-options">
      <motion.span data-i18n-skip animate={{ color: ["#475569", "#475569", "#065f46", "#065f46", "#475569"], backgroundColor: ["#fff", "#fff", "#d1fae5", "#d1fae5", "#fff"], borderColor: ["#cbd5e1", "#cbd5e1", "#34d399", "#34d399", "#cbd5e1"], scale: [1, 1, 1.06, 1.06, 1] }} transition={{ ...loop, times: [0, .36, .52, .82, 1] }}>{missingAnswer[locale]} ✓</motion.span>
      <span data-i18n-skip>{order.distractors[0][locale]}</span>
      <span data-i18n-skip>{order.distractors[1][locale]}</span>
    </div>
    <motion.span className="demo-hand missing-demo-hand" animate={{ y: [7, 7, -2, -2, 7], scale: [1, 1, .82, 1, 1] }} transition={{ ...loop, times: [0, .32, .44, .6, 1] }}>👆</motion.span>
  </div>;
}

function WeekThreeFlowchartDemo() {
  const { locale } = useI18n();
  const duration = 10;
  const tr = locale === "tr";
  return <div className="module-demo flowchart-brief-demo" aria-hidden="true">
    <motion.div className="flowchart-demo-scene success" animate={{ opacity: [1, 1, 0, 0, 1] }} transition={{ duration, repeat: Infinity, times: [0, .42, .48, .94, 1] }}>
      <div className="flowchart-demo-vertical">
        <span className="flowchart-demo-terminal">{tr ? "Başla" : "Start"}</span><b>↓</b>
        <motion.span className="flowchart-demo-slot" animate={{ borderColor: ["#94a3b8", "#94a3b8", "#34d399", "#34d399", "#94a3b8"], backgroundColor: ["#f8fafc", "#f8fafc", "#d1fae5", "#d1fae5", "#f8fafc"] }} transition={{ duration, repeat: Infinity, times: [0, .2, .31, .42, 1] }}><small>{tr ? "İstek kontrol edilir" : "Request is checked"}</small><motion.i animate={{ opacity: [1, 1, 0, 0, 1] }} transition={{ duration, repeat: Infinity, times: [0, .22, .3, .43, 1] }}>?</motion.i><motion.b className="flowchart-demo-diamond in-slot" animate={{ opacity: [0, 0, 1, 1, 0], scale: [.5, .5, 1, 1, .5] }} transition={{ duration, repeat: Infinity, times: [0, .23, .31, .41, 1] }}><i /></motion.b></motion.span><b>↓</b>
        <span className="flowchart-demo-terminal">{tr ? "Bitir" : "End"}</span>
      </div>
      <div className="flowchart-demo-mini-palette"><motion.span className="flowchart-demo-diamond" animate={{ x: [0, 0, -105, -105, 0], y: [0, 0, 36, 36, 0], opacity: [1, 1, 1, 0, 1] }} transition={{ duration, repeat: Infinity, times: [0, .12, .28, .37, 1] }}><i /></motion.span><span className="flowchart-demo-process-chip">{tr ? "İşlem" : "Process"}</span><span className="flowchart-demo-data-chip">{tr ? "Veri" : "Data"}</span></div>
      <motion.strong className="flowchart-demo-caption" animate={{ opacity: [0, 0, 1, 1, 0] }} transition={{ duration, repeat: Infinity, times: [0, .3, .36, .43, 1] }}>{tr ? "Doğru yerleşim ✓" : "Correct placement ✓"}</motion.strong>
    </motion.div>
    <motion.div className="flowchart-demo-scene error" animate={{ opacity: [0, 0, 1, 1, 0] }} transition={{ duration, repeat: Infinity, times: [0, .44, .49, .86, .92] }}>
      <div className="flowchart-demo-vertical">
        <span className="flowchart-demo-terminal">{tr ? "Başla" : "Start"}</span><b>↓</b><motion.span className="flowchart-demo-slot wrong" animate={{ x: [0, -4, 4, -3, 0], borderColor: ["#f87171", "#ef4444", "#f87171"] }} transition={{ duration: .52, repeat: Infinity }}><small>{tr ? "İstek kontrol edilir" : "Request is checked"}</small><b className="flowchart-demo-process">{tr ? "İşlem" : "Process"}</b></motion.span><b>↓</b><span className="flowchart-demo-terminal">{tr ? "Bitir" : "End"}</span>
      </div>
      <div className="flowchart-demo-mini-palette faded"><span className="flowchart-demo-diamond"><i /></span><span className="flowchart-demo-process-chip">{tr ? "İşlem" : "Process"}</span><span className="flowchart-demo-data-chip">{tr ? "Veri" : "Data"}</span></div>
      <strong className="flowchart-demo-caption wrong">{tr ? "Yanlış sembol kırmızı yanar" : "Wrong symbol flashes red"}</strong>
    </motion.div>
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
