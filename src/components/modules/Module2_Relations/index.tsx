"use client";

import { useState } from "react";
import type { LearningModuleProps } from "@/types";
import { NodeGraphCanvas, graphNodes, type GraphEdge } from "./NodeGraphCanvas";
import { RelationModal } from "./RelationModal";
import { SimulationRunner } from "./SimulationRunner";

const required: Array<[string, string, "+" | "-"]> = [["demand", "orders", "+"], ["orders", "sales", "+"], ["sales", "revenue", "+"]];

export function Module2Relations({ onSubmit }: LearningModuleProps) {
  const [edges, setEdges] = useState<GraphEdge[]>([]); const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<[string, string] | null>(null); const [running, setRunning] = useState(false); const [result, setResult] = useState("");
  const [warningNodeIds, setWarningNodeIds] = useState<string[]>([]); const [explanations, setExplanations] = useState<string[]>([]);
  const labels = new Map(graphNodes.map((node) => [node.id, node.label]));

  function selectNode(id: string) {
    setResult(""); setWarningNodeIds([]); setExplanations([]);
    if (!selected) { setSelected(id); return; }
    if (selected === id) { setSelected(null); return; }
    setPending([selected, id]); setSelected(null);
  }

  function addEdge(type: string, polarity: "+" | "-") {
    if (!pending) return;
    setEdges((current) => [...current.filter((edge) => !(edge.from === pending[0] && edge.to === pending[1])), { id: crypto.randomUUID(), from: pending[0], to: pending[1], type, polarity }]);
    setPending(null);
  }

  async function run() {
    setRunning(true); setResult(""); setWarningNodeIds([]); setExplanations([]);
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const correct = required.filter(([from, to, polarity]) => edges.some((edge) => edge.from === from && edge.to === to && edge.polarity === polarity)).length;
    const reversedEdges = edges.filter((edge) => required.some(([from, to]) => edge.from === from && edge.to === to) && edge.polarity === "-");
    const reversed = reversedEdges.length;
    const warnings = [...new Set(reversedEdges.map((edge) => edge.to))];
    const why = reversedEdges.map((edge) => {
      const from = labels.get(edge.from); const to = labels.get(edge.to);
      return `${from} arttığında ${to} da bu senaryoda artmalıdır. “−” kutbu etkiyi ters çevirdiği için şok zinciri burada bozulur.`;
    });
    const score = Math.max(0, Math.round((correct / required.length) * 100) - reversed * 10);
    const message = correct === required.length && reversed === 0 ? "Başarılı: Talep → Sipariş → Satış → Gelir etkisi tutarlı biçimde yayıldı." : `Sistem sapma üretti: zorunlu zincirin ${correct}/${required.length} bağlantısı doğru. Etki yönlerini gözden geçir.`;
    setResult(message); setWarningNodeIds(warnings); setExplanations(why); setRunning(false);
    await onSubmit({ score, payload: { edges, shock: { node: "demand", change: 20 }, result: message } });
  }

  return <section className="panel module-shell">
    <div className="module-header"><span className="module-number">02</span><div><div className="eyebrow">Modül 2</div><h2 style={{ margin: 0 }}>İlişki Ağını Kur ve Çalıştır</h2><p className="muted">Kaynak düğüme, ardından hedef düğüme tıklayarak ok oluştur.</p></div></div>
    <div className="dashboard-grid"><NodeGraphCanvas edges={edges} selected={selected} onNodeClick={selectNode} simulating={running} warningNodeIds={warningNodeIds} /><div className="card"><h3>Kurulan ilişkiler</h3><p className="muted">Her bağlantının türü ve etkisi.</p><div className="relation-list">{edges.length ? edges.map((edge) => <div className="relation-row" key={edge.id}><span>{labels.get(edge.from)} → {labels.get(edge.to)}</span><b className={`edge-sign ${edge.polarity === "+" ? "positive" : "negative"}`}>{edge.polarity}</b><small>{edge.type}</small></div>) : <div className="empty">İki düğüm seçerek başla.</div>}</div></div></div>
    <SimulationRunner running={running} result={result} explanations={explanations} onRun={() => void run()} onReset={() => { setEdges([]); setResult(""); setWarningNodeIds([]); setExplanations([]); }} />
    {pending && <RelationModal from={labels.get(pending[0]) || pending[0]} to={labels.get(pending[1]) || pending[1]} onSave={addEdge} onClose={() => setPending(null)} />}
  </section>;
}
