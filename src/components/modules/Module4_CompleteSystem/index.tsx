"use client";

import { useState } from "react";
import { Siren } from "lucide-react";
import type { LearningModuleProps } from "@/types";
import { EnterpriseMacroCanvas } from "./EnterpriseMacroCanvas";
import { InterfaceSelector } from "./InterfaceSelector";
import { TokenSimulation } from "./TokenSimulation";

const required = ["supplier-company", "sales-production", "company-customer"];

export function Module4CompleteSystem({ onSubmit, faultInjected }: LearningModuleProps) {
  const [interfaces, setInterfaces] = useState<string[]>([]); const [running, setRunning] = useState(false); const [step, setStep] = useState(0); const [feedback, setFeedback] = useState("");
  function toggle(id: string) { setInterfaces((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); setFeedback(""); }
  async function run() {
    setRunning(true); setFeedback(""); setStep(0);
    const missing = required.filter((id) => !interfaces.includes(id));
    const maxStep = faultInjected ? 2 : missing.includes("sales-production") ? 1 : missing.includes("company-customer") ? 3 : missing.includes("supplier-company") ? 2 : 4;
    for (let index = 0; index <= maxStep; index += 1) { setStep(index); await new Promise((resolve) => setTimeout(resolve, 650)); }
    let message: string;
    if (faultInjected) message = "Akış durdu: Üretim hattı devre dışı. Alternatif tedarik veya üretim rotası gerekli.";
    else if (missing.length) message = `Akış durdu: ${missing.length} kritik arayüz eksik. Bağlantıları tamamla.`;
    else message = "Akış tamamlandı: Sipariş tasarımdan üretime ve teslimata kesintisiz ulaştı.";
    const score = faultInjected ? (interfaces.length === required.length ? 70 : 45) : Math.round(((required.length - missing.length) / required.length) * 100);
    setFeedback(message); setRunning(false);
    await onSubmit({ score, payload: { interfaces, faultInjected: Boolean(faultInjected), stoppedAt: maxStep, result: message } });
  }
  return <section className="panel module-shell">
    <div className="module-header"><span className="module-number">04</span><div><div className="eyebrow">Modül 4</div><h2 style={{ margin: 0 }}>Komple Sistemi Kur ve Simüle Et</h2><p className="muted">Alt sistemleri arayüzlerle bağla; sipariş token’ını uçtan uca geçir.</p></div></div>
    {faultInjected && <div className="fault-banner"><Siren /> Hoca kriz enjekte etti: Üretim hattı devre dışı.</div>}
    <EnterpriseMacroCanvas tokenStep={step} running={running} faultInjected={faultInjected} />
    <div className="grid-2"><InterfaceSelector selected={interfaces} onToggle={toggle} /><TokenSimulation running={running} feedback={feedback} onRun={() => void run()} onReset={() => { setStep(0); setFeedback(""); }} /></div>
  </section>;
}
