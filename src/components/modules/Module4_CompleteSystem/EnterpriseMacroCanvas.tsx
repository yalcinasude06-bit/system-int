"use client";

import { motion } from "framer-motion";

const systems = ["Satış", "Tasarım", "Üretim", "Teslimat", "Servis"];

export function EnterpriseMacroCanvas({ tokenStep, running, faultInjected }: { tokenStep: number; running: boolean; faultInjected?: boolean }) {
  return <div className="enterprise-canvas">
    <div className="flow-track">
      {systems.map((system, index) => <div className="system-block" key={system} style={faultInjected && system === "Üretim" ? { borderColor: "var(--danger)", color: "#fecdd3", background: "rgba(251,113,133,.12)" } : undefined}><span>{["🛒", "✏️", "🏭", "🚚", "🛠️"][index]}</span>{system}{faultInjected && system === "Üretim" && <small>DEVRE DIŞI</small>}</div>)}
      {(running || tokenStep > 0) && <motion.div className="system-token" initial={false} animate={{ left: `${7 + Math.min(tokenStep, 4) * 21.5}%` }} transition={{ duration: .65, type: "spring", stiffness: 90 }}>📦</motion.div>}
    </div>
    <div style={{ padding: "0 24px 24px" }}><div className="card-tray"><span className="drag-card">Sipariş</span><span className="drag-card">Ürün Tasarımı</span><span className="drag-card">Satın Alınan Parçalar</span><span className="drag-card">Bitmiş Ürün</span><span className="drag-card">Servis Talebi</span></div></div>
  </div>;
}
