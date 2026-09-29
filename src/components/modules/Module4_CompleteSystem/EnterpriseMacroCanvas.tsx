"use client";

import { motion } from "framer-motion";

const systems = [
  { id: "suppliers", label: "Tedarikçiler", icon: "🚛", region: "external" },
  { id: "design", label: "Tasarım", icon: "✏️", region: "firm" },
  { id: "purchasing", label: "Satın Alma", icon: "🧾", region: "firm" },
  { id: "production", label: "Üretim", icon: "🏭", region: "firm" },
  { id: "sales", label: "Satış", icon: "🛍️", region: "firm" },
  { id: "delivery", label: "Teslim", icon: "📦", region: "firm" },
  { id: "service", label: "Servis", icon: "🛠️", region: "firm" },
  { id: "customers", label: "Müşteriler", icon: "👥", region: "external" },
] as const;

const route = [
  { label: "Müşteri", left: 93.5 },
  { label: "Satış", left: 56.2 },
  { label: "Tasarım", left: 18.8 },
  { label: "Üretim", left: 43.8 },
  { label: "Teslim", left: 68.8 },
  { label: "Müşteri", left: 93.5 },
];

export function EnterpriseMacroCanvas({ tokenStep, running, faultInjected, alternativeRoute }: { tokenStep: number; running: boolean; faultInjected?: boolean; alternativeRoute?: string }) {
  const safeStep = Math.min(tokenStep, route.length - 1);
  return <div className="enterprise-canvas">
    <div className="macro-region-labels"><span>Tedarikçiler Bölgesi</span><strong>FİRMA İÇİ DEĞER ZİNCİRİ</strong><span>Müşteriler Bölgesi</span></div>
    <div className="macro-flow-track">
      {systems.map((system) => <div className={`system-block ${system.region} ${faultInjected && system.id === "production" ? "faulted" : ""}`} key={system.id}><span>{system.icon}</span><strong>{system.label}</strong>{faultInjected && system.id === "production" && <small>ARIZA</small>}{faultInjected && system.id === "production" && alternativeRoute && <small className="bypass">↗ {alternativeRoute}</small>}</div>)}
      {(running || tokenStep > 0) && <motion.div className="system-token" initial={false} animate={{ left: `${route[safeStep].left}%` }} transition={{ duration: .62, type: "spring", stiffness: 90 }}>●</motion.div>}
    </div>
    <div className="order-route" aria-label="Canlı sipariş rotası">{route.map((item, index) => <span key={`${item.label}-${index}`} className={index <= tokenStep ? "active" : ""}>{item.label}{index < route.length - 1 && <i>→</i>}</span>)}</div>
  </div>;
}
