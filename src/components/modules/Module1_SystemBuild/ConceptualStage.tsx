"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, LockKeyhole, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/common/Button";
import type { Submission } from "@/types";

const anatomy = {
  purpose: { hint: "Sistemin varlık nedeni", answer: "Amaç" },
  components: { hint: "Sistemi oluşturan parçalar", answer: "Bileşenler" },
  relations: { hint: "Parçaların etkileşimi", answer: "İlişkiler" },
  boundary: { hint: "Sınır", answer: "Sınır" },
  environment: { hint: "Çevre", answer: "Çevre" },
  interface: { hint: "Sınırdaki geçiş noktası", answer: "Arayüz" },
  input: { hint: "Sisteme giren akış", answer: "Girdi" },
  output: { hint: "Sistemden çıkan akış", answer: "Çıktı" },
  constraint: { hint: "Hareket alanını daraltan kural", answer: "Kısıt" },
} as const;

type ZoneId = keyof typeof anatomy;
const cards = Object.values(anatomy).map((item) => item.answer);

function savedPlacements(submission?: Submission | null) {
  const value = submission?.payload?.placements;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([zone, card]) => zone in anatomy && typeof card === "string" && cards.includes(card as (typeof cards)[number]))) as Record<string, string>;
}

function AnatomySlot({ id, placements, selected, locked, dragOver, onPlace, onSelect, onDragOver }: {
  id: ZoneId;
  placements: Record<string, string>;
  selected: string | null;
  locked: boolean;
  dragOver: string | null;
  onPlace: (zoneId: ZoneId, card: string, sourceZone?: ZoneId) => void;
  onSelect: (card: string) => void;
  onDragOver: (zoneId: ZoneId | null) => void;
}) {
  const zone = anatomy[id];
  const value = placements[id];
  const correct = locked && value === zone.answer;
  const wrong = locked && value !== zone.answer;

  return <div
    className={`anatomy-slot anatomy-${id} ${value ? "filled" : ""} ${correct ? "correct" : ""} ${wrong ? "wrong" : ""} ${dragOver === id ? "drag-over" : ""} ${locked ? "locked" : ""}`}
    onDragEnter={(event) => { if (!locked) { event.preventDefault(); onDragOver(id); } }}
    onDragOver={(event) => { if (!locked) event.preventDefault(); }}
    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) onDragOver(null); }}
    onDrop={(event) => {
      event.preventDefault();
      onDragOver(null);
      if (!locked) onPlace(id, event.dataTransfer.getData("text/plain"), event.dataTransfer.getData("application/x-system-zone") as ZoneId || undefined);
    }}
    onClick={() => { if (!locked && selected) onPlace(id, selected); }}
    role="group"
    aria-label={`${zone.hint}: ${value || "boş"}`}
  >
    <small>{zone.hint}</small>
    {value && <button
      type="button"
      draggable={!locked}
      className={`placed-anatomy-card ${selected === value ? "selected" : ""}`}
      onClick={(event) => { event.stopPropagation(); if (!locked) onSelect(value); }}
      onDragStart={(event) => { event.dataTransfer.setData("text/plain", value); event.dataTransfer.setData("application/x-system-zone", id); }}
    >{value}</button>}
    {correct && <CheckCircle2 className="slot-check" size={18} aria-label="Doğru" />}
    {wrong && <XCircle className="slot-check wrong-check" size={18} aria-label="Yanlış" />}
  </div>;
}

export function ConceptualStage({ onComplete, initialSubmission }: {
  onComplete: (result: { score: number; placements: Record<string, string>; mistakes: string[] }) => Promise<boolean>;
  initialSubmission?: Submission | null;
}) {
  const initial = savedPlacements(initialSubmission);
  const [placements, setPlacements] = useState<Record<string, string>>(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(Boolean(initialSubmission?.is_submitted));
  const [score, setScore] = useState(initialSubmission?.score ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const available = useMemo(() => cards.filter((card) => !Object.values(placements).includes(card)), [placements]);

  function place(zoneId: ZoneId, card: string, suppliedSource?: ZoneId) {
    if (locked || !cards.some((candidate) => candidate === card)) return;
    setPlacements((current) => {
      const next = { ...current };
      const foundSource = (Object.keys(next) as ZoneId[]).find((key) => next[key] === card);
      const source = suppliedSource && next[suppliedSource] === card ? suppliedSource : foundSource;
      const displaced = next[zoneId];
      if (source && source !== zoneId) {
        delete next[source];
        if (displaced) next[source] = displaced;
      }
      next[zoneId] = card;
      return next;
    });
    setSelected(null);
  }

  function returnToPool(card: string) {
    if (locked) return;
    setPlacements((current) => Object.fromEntries(Object.entries(current).filter(([, value]) => value !== card)));
    setSelected(null);
  }

  async function submit() {
    if (locked || Object.keys(placements).length !== cards.length) return;
    const entries = Object.entries(anatomy) as Array<[ZoneId, (typeof anatomy)[ZoneId]]>;
    const mistakes = entries.filter(([id, item]) => placements[id] !== item.answer).map(([, item]) => item.answer);
    const resultScore = Math.round(((entries.length - mistakes.length) / entries.length) * 100);
    setSubmitting(true);
    const saved = await onComplete({ score: resultScore, placements, mistakes });
    setSubmitting(false);
    if (saved) { setScore(resultScore); setLocked(true); setSelected(null); }
  }

  const allCorrect = locked && score === 100;
  const slotProps = { placements, selected, locked, dragOver, onPlace: place, onSelect: setSelected, onDragOver: (zone: ZoneId | null) => setDragOver(zone) };

  return <div className="module-shell">
    <div className="module-stage-title"><div><h3>Görsel sistem anatomisi</h3><p className="muted">Kartları yuvalar ve havuz arasında taşıyabilir, dolu iki yuva arasında yer değiştirebilirsin.</p></div>{locked && <span className="locked-badge"><LockKeyhole size={14} /> Gönderildi · {score} puan</span>}</div>
    <div
      className={`card-tray anatomy-card-tray ${dragOver === "pool" ? "drag-over" : ""}`}
      aria-label="Bekleyen kavram kartları"
      onDragEnter={(event) => { if (!locked) { event.preventDefault(); setDragOver("pool"); } }}
      onDragOver={(event) => { if (!locked) event.preventDefault(); }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOver(null); }}
      onDrop={(event) => { event.preventDefault(); setDragOver(null); returnToPool(event.dataTransfer.getData("text/plain")); }}
      onClick={() => { if (selected) returnToPool(selected); }}
    >
      {available.map((card) => <button draggable={!locked} key={card} type="button" className={`drag-card ${selected === card ? "selected" : ""}`} onDragStart={(event) => event.dataTransfer.setData("text/plain", card)} onClick={(event) => { event.stopPropagation(); if (!locked) setSelected(card); }}>{card}</button>)}
      {!available.length && !locked && <span className="muted">Tüm kartlar şemada · geri almak için kartı buraya sürükle.</span>}
      {locked && <span className="muted">Yanıt gönderildi; kart yerleşimleri kilitlendi.</span>}
    </div>

    <div className="system-anatomy" aria-label="Sistem anatomisi şeması">
      <div className="environment-label"><AnatomySlot id="environment" {...slotProps} /></div>
      <AnatomySlot id="purpose" {...slotProps} />
      <div className="anatomy-flow">
        <div className="flow-wing input-wing"><span>Çevreden sisteme</span><AnatomySlot id="input" {...slotProps} /><i aria-hidden="true">→</i></div>
        <div className="system-boundary-wrap">
          <AnatomySlot id="boundary" {...slotProps} />
          <div className="system-interior"><AnatomySlot id="components" {...slotProps} /><span className="relation-arrow" aria-hidden="true">⇄</span><AnatomySlot id="relations" {...slotProps} /></div>
          <AnatomySlot id="interface" {...slotProps} />
        </div>
        <div className="flow-wing output-wing"><i aria-hidden="true">→</i><AnatomySlot id="output" {...slotProps} /><span>Sistemden çevreye</span></div>
      </div>
      <AnatomySlot id="constraint" {...slotProps} />
    </div>

    {locked && <div className={allCorrect ? "notice success" : "notice error"}>{allCorrect ? "Tebrikler! Sistem anatomisinin tamamını doğru kurdun." : `Yanıtın kilitlendi. ${score} puan aldın; yeşil yuvalar doğru, kırmızı yuvalar yanlış yerleşimleri gösterir.`}</div>}
    <div className="button-row"><Button loading={submitting} onClick={() => void submit()} disabled={locked || Object.keys(placements).length !== cards.length}>{locked ? "Yanıt gönderildi" : "Kontrol Et / Gönder"}</Button><Button variant="secondary" icon={<RotateCcw size={16} />} disabled={locked || submitting} onClick={() => { setPlacements({}); setSelected(null); }}>Sıfırla</Button></div>
  </div>;
}
