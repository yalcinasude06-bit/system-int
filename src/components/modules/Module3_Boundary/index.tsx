"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { isPointInPolygon, polygonArea } from "@/lib/polygonUtils";
import type { LearningModuleProps, Point } from "@/types";
import { BoundaryPolygonCanvas, mapElements } from "./BoundaryPolygonCanvas";
import { EnvironmentClassifier } from "./EnvironmentClassifier";
import { ScenarioController } from "./ScenarioController";

export function Module3Boundary({ onSubmit }: LearningModuleProps) {
  const [stage, setStage] = useState(1); const [points, setPoints] = useState<Point[]>([]); const [closed, setClosed] = useState(false); const [feedback, setFeedback] = useState("");
  const [partnershipChoice, setPartnershipChoice] = useState<boolean | null>(null);
  const insideIds = useMemo(() => new Set(closed ? mapElements.filter((item) => isPointInPolygon(item.position, points)).map((item) => item.id) : []), [closed, points]);
  function reset() { setPoints([]); setClosed(false); setFeedback(""); }
  async function evaluate() {
    if (points.length < 3) return;
    setClosed(true);
    const computed = new Set(mapElements.filter((item) => isPointInPolygon(item.position, points)).map((item) => item.id));
    const required = new Set(["employees", "production", "robots", ...(stage >= 2 ? ["sales-marketing"] : []), ...(stage === 3 && partnershipChoice ? ["suppliers"] : [])]);
    const correctInside = [...required].filter((id) => computed.has(id)).length;
    const unexpectedInside = [...computed].filter((id) => !required.has(id)).length;
    const score = Math.max(0, Math.round((correctInside / required.size) * 100) - unexpectedInside * 10);
    const dynamicLesson = stage === 3 ? partnershipChoice ? " Stratejik ortaklıkla tedarikçi artık seçtiğin sistem sınırının parçası oldu; sınır bağlama göre değişti." : " Tedarikçiyi yakın iş çevresinde bıraktın; bu da gerekçelendirilebilir ve sınırın yönetim kararına bağlı olduğunu gösterir." : "";
    const text = (score >= 85 ? "Sınır, senaryodaki yönetim alanını güçlü biçimde temsil ediyor." : "Sınırın içine aldığın kontrol dışı öğeleri ve dışarıda bıraktığın çekirdek bileşenleri yeniden düşün.") + dynamicLesson;
    setFeedback(text);
    await onSubmit({ stage, score, payload: { polygon: points, inside: [...computed], area: polygonArea(points), scenario: stage } });
  }
  return <section className="panel module-shell">
    <div className="module-header"><span className="module-number">03</span><div><div className="eyebrow">Modül 3</div><h2 style={{ margin: 0 }}>Sistem Sınırını Çiz</h2><p className="muted">Haritada köşelere tıklayarak çokgen oluştur; kararların sistemi nasıl değiştirdiğini gözlemle.</p></div></div>
    <div className="churchman-rules"><strong>Churchman 2-Kuralı</strong><span>1. Öğe sistemin amacına ulaşması için gerekli mi?</span><span>2. Sistem bu öğeyi doğrudan yönetebiliyor mu?</span></div>
    <div className="boundary-layout"><div><BoundaryPolygonCanvas points={points} onChange={(next) => { if (!closed) setPoints(next); }} insideIds={insideIds} /><div className="button-row"><Button size="small" onClick={() => void evaluate()} disabled={points.length < 3 || closed || (stage === 3 && partnershipChoice === null)} icon={<Check size={16} />}>Sınırı kapat</Button><Button size="small" variant="secondary" onClick={() => { setPoints((current) => current.slice(0, -1)); setClosed(false); }} disabled={!points.length} icon={<Undo2 size={16} />}>Geri al</Button><Button size="small" variant="secondary" onClick={reset} icon={<RotateCcw size={16} />}>Temizle</Button></div></div><aside className="stack"><ScenarioController stage={stage} partnershipChoice={partnershipChoice} onPartnershipChoice={(choice) => { setPartnershipChoice(choice); reset(); }} onChange={(next) => { setStage(next); setPartnershipChoice(null); reset(); }} />{closed && <div className="card"><h3>Anlık gruplama</h3><p className="muted">Ray-Casting sonucuna göre güncellendi.</p><EnvironmentClassifier elements={mapElements} insideIds={insideIds} /></div>}</aside></div>
    <div className="legend"><span><i style={{ background: "var(--emerald)" }} /> Sistem içi</span><span><i style={{ background: "var(--indigo-soft)" }} /> Yakın iş çevresi</span><span><i style={{ background: "var(--violet)" }} /> Uzak genel çevre</span></div>
    {feedback && <div className={feedback.startsWith("Sınır,") ? "notice success" : "notice"}>{feedback}</div>}
  </section>;
}
