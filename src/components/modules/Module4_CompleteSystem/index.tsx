"use client";

import { useState } from "react";
import { Siren } from "lucide-react";
import type { LearningModuleProps } from "@/types";
import { EnterpriseMacroCanvas } from "./EnterpriseMacroCanvas";
import { FlowCardSelector } from "./FlowCardSelector";
import { InterfaceSelector } from "./InterfaceSelector";
import { TokenSimulation } from "./TokenSimulation";

const requiredInterfaces = ["supplier-company", "sales-production", "company-customer"];
const requiredCards = ["customer-order", "product-design", "purchased-parts", "finished-product", "service-request"];
const alternativeRoutes = ["Yedek Üretim Hattı", "Dış Kaynak Üretim"];

export function Module4CompleteSystem({ onSubmit, faultInjected }: LearningModuleProps) {
  const [interfaces, setInterfaces] = useState<string[]>([]); const [flowCards, setFlowCards] = useState<string[]>([]); const [alternativeRoute, setAlternativeRoute] = useState("");
  const [running, setRunning] = useState(false); const [step, setStep] = useState(0); const [feedback, setFeedback] = useState("");
  function toggle(id: string) { setInterfaces((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); setFeedback(""); }
  function toggleCard(id: string) { setFlowCards((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); setFeedback(""); }
  async function run() {
    setRunning(true); setFeedback(""); setStep(0);
    const missingInterfaces = requiredInterfaces.filter((id) => !interfaces.includes(id));
    const missingCards = requiredCards.filter((id) => !flowCards.includes(id));
    let maxStep = 5; let message = "Akış tamamlandı: Sipariş satıştan tasarım ve üretime, ardından teslimat üzerinden müşteriye ulaştı.";
    if (missingCards.includes("customer-order")) { maxStep = 0; message = "Hata: Müşteri Siparişi bilgi kartı eksik; akış başlatılamadı!"; }
    else if (missingInterfaces.includes("sales-production")) { maxStep = 1; message = "Hata: Satış ile Üretim arasındaki arayüz eksik!"; }
    else if (missingCards.includes("product-design")) { maxStep = 2; message = "Hata: Ürün Tasarımı bilgi kartı eksik; sipariş tasarımda durdu!"; }
    else if (missingInterfaces.includes("supplier-company")) { maxStep = 2; message = "Hata: Tedarikçi ile Firma arasındaki arayüz eksik!"; }
    else if (missingCards.includes("purchased-parts")) { maxStep = 2; message = "Hata: Satın Alınan Parçalar kartı eksik; üretim başlayamadı!"; }
    else if (faultInjected && !alternativeRoute) { maxStep = 3; message = "Hata: Üretim Hattı Arızası! Yedek üretim veya dış kaynak rotası seç."; }
    else if (missingCards.includes("finished-product")) { maxStep = 3; message = "Hata: Bitmiş Ürün malzeme kartı eksik; teslimat başlayamadı!"; }
    else if (missingInterfaces.includes("company-customer")) { maxStep = 4; message = "Hata: Firma ile Müşteri arasındaki arayüz eksik!"; }
    else if (missingCards.includes("service-request")) { maxStep = 5; message = "Hata: Servis Talebi bilgi kartı eksik; satış sonrası çevrim tamamlanamadı!"; }
    else if (faultInjected && alternativeRoute) message = `Alternatif rota başarılı: ${alternativeRoute} kullanılarak arıza aşıldı ve sipariş teslim edildi.`;
    for (let index = 0; index <= maxStep; index += 1) { setStep(index); await new Promise((resolve) => setTimeout(resolve, 650)); }
    const base = ((requiredInterfaces.length - missingInterfaces.length) + (requiredCards.length - missingCards.length)) / (requiredInterfaces.length + requiredCards.length);
    const score = Math.max(0, Math.round(base * 100) - (faultInjected && !alternativeRoute ? 20 : 0));
    setFeedback(message); setRunning(false);
    await onSubmit({ score, payload: { interfaces, flowCards, alternativeRoute: alternativeRoute || null, faultInjected: Boolean(faultInjected), stoppedAt: maxStep, result: message } });
  }
  return <section className="panel module-shell">
    <div className="module-title-chip">Modül 4: Komple Sistemi Kur</div>
    {faultInjected && <div className="fault-banner"><Siren /> Hoca kriz enjekte etti: Üretim Hattı Arızası. Alternatif bir rota kur.</div>}
    <EnterpriseMacroCanvas tokenStep={step} running={running} faultInjected={faultInjected} alternativeRoute={alternativeRoute} />
    <div className="grid-2"><InterfaceSelector selected={interfaces} onToggle={toggle} /><FlowCardSelector selected={flowCards} onToggle={toggleCard} /></div>
    {faultInjected && <div className="card"><h3>Alternatif üretim rotası</h3><p className="muted">Arızalı üretim hattını aşmak için bir kurtarma rotası seç.</p><div className="interface-chips">{alternativeRoutes.map((route) => <button type="button" className={`interface-chip ${alternativeRoute === route ? "active" : ""}`} key={route} onClick={() => { setAlternativeRoute(route); setFeedback(""); }}>↗ {route}</button>)}</div></div>}
    <TokenSimulation running={running} feedback={feedback} onRun={() => void run()} onReset={() => { setStep(0); setFeedback(""); }} />
  </section>;
}
