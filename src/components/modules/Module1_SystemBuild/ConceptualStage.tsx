"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/common/Button";

const anatomy = {
  purpose: { hint: "Sistemin varlık nedeni", answer: "Amaç" },
  components: { hint: "Sistemi oluşturan parçalar", answer: "Bileşenler" },
  relations: { hint: "Parçaların etkileşimi", answer: "İlişkiler" },
  boundary: { hint: "İçerisi ile dışarısını ayırır", answer: "Sınır" },
  environment: { hint: "Sistemin dışındaki etkiler", answer: "Çevre" },
  interface: { hint: "Sınırdaki geçiş noktası", answer: "Arayüz" },
  input: { hint: "Sisteme giren akış", answer: "Girdi" },
  output: { hint: "Sistemden çıkan akış", answer: "Çıktı" },
  constraint: { hint: "Hareket alanını daraltan kural", answer: "Kısıt" },
} as const;

type ZoneId = keyof typeof anatomy;
const cards = Object.values(anatomy).map((item) => item.answer);

function AnatomySlot({ id, placements, selected, checked, onPlace, className = "" }: {
  id: ZoneId;
  placements: Record<string, string>;
  selected: string | null;
  checked: boolean;
  onPlace: (zoneId: ZoneId, card: string) => void;
  className?: string;
}) {
  const zone = anatomy[id];
  const value = placements[id];
  const correct = value === zone.answer;
  const wrong = checked && value !== zone.answer;

  return <button
    type="button"
    className={`anatomy-slot anatomy-${id} ${value ? "filled" : ""} ${correct ? "correct" : ""} ${wrong ? "wrong" : ""} ${className}`}
    onDragOver={(event) => event.preventDefault()}
    onDrop={(event) => onPlace(id, event.dataTransfer.getData("text/plain"))}
    onClick={() => selected && onPlace(id, selected)}
    aria-label={`${zone.hint}: ${value || "boş"}`}
  >
    <small>{zone.hint}</small>
    <strong>{value || "Kartı buraya bırak"}</strong>
    {correct && <CheckCircle2 className="slot-check" size={18} aria-label="Doğru yerleşim" />}
  </button>;
}

export function ConceptualStage({ onComplete }: { onComplete: (result: { score: number; placements: Record<string, string>; mistakes: string[] }) => void }) {
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const available = useMemo(() => cards.filter((card) => !Object.values(placements).includes(card)), [placements]);

  function place(zoneId: ZoneId, card: string) {
    if (!cards.some((candidate) => candidate === card)) return;
    setPlacements((current) => {
      const next = { ...current };
      Object.keys(next).forEach((key) => { if (next[key] === card) delete next[key]; });
      next[zoneId] = card;
      return next;
    });
    setSelected(null);
    setChecked(false);
  }

  function check() {
    const entries = Object.entries(anatomy) as Array<[ZoneId, (typeof anatomy)[ZoneId]]>;
    const mistakes = entries.filter(([id, item]) => placements[id] !== item.answer).map(([, item]) => item.answer);
    const score = Math.round(((entries.length - mistakes.length) / entries.length) * 100);
    setChecked(true);
    onComplete({ score, placements, mistakes });
  }

  const allCorrect = Object.entries(anatomy).every(([id, item]) => placements[id] === item.answer);

  return <div className="module-shell">
    <div><h3>Görsel sistem anatomisi</h3><p className="muted">Üst bardaki kavramları sistemin gerçek anatomisindeki işlevsel konumlarına taşı.</p></div>
    <div className="card-tray anatomy-card-tray" aria-label="Kavram kartları">
      {available.map((card) => <button draggable key={card} type="button" className={`drag-card ${selected === card ? "selected" : ""}`} onDragStart={(event) => event.dataTransfer.setData("text/plain", card)} onClick={() => setSelected(card)}>{card}</button>)}
      {!available.length && <span className="muted">Tüm kartlar şemaya yerleştirildi.</span>}
    </div>

    <div className="system-anatomy" aria-label="Sistem anatomisi şeması">
      <div className="environment-label"><AnatomySlot id="environment" placements={placements} selected={selected} checked={checked} onPlace={place} /></div>
      <AnatomySlot id="purpose" placements={placements} selected={selected} checked={checked} onPlace={place} />
      <div className="anatomy-flow">
        <div className="flow-wing input-wing"><span>Çevreden sisteme</span><AnatomySlot id="input" placements={placements} selected={selected} checked={checked} onPlace={place} /><i aria-hidden="true">→</i></div>
        <div className="system-boundary-wrap">
          <AnatomySlot id="boundary" placements={placements} selected={selected} checked={checked} onPlace={place} />
          <div className="system-interior">
            <AnatomySlot id="components" placements={placements} selected={selected} checked={checked} onPlace={place} />
            <span className="relation-arrow" aria-hidden="true">⇄</span>
            <AnatomySlot id="relations" placements={placements} selected={selected} checked={checked} onPlace={place} />
          </div>
          <AnatomySlot id="interface" placements={placements} selected={selected} checked={checked} onPlace={place} />
        </div>
        <div className="flow-wing output-wing"><i aria-hidden="true">→</i><AnatomySlot id="output" placements={placements} selected={selected} checked={checked} onPlace={place} /><span>Sistemden çevreye</span></div>
      </div>
      <AnatomySlot id="constraint" placements={placements} selected={selected} checked={checked} onPlace={place} />
    </div>

    {checked && <div className={allCorrect ? "notice success" : "notice error"}>{allCorrect ? "Harika! Amaçtan kısıta kadar sistem anatomisinin tamamı doğru." : "Kırmızı görünen konumları işlevlerine göre yeniden değerlendir."}</div>}
    <div className="button-row"><Button onClick={check} disabled={Object.keys(placements).length !== cards.length}>Kontrol et</Button><Button variant="secondary" icon={<RotateCcw size={16} />} onClick={() => { setPlacements({}); setChecked(false); setSelected(null); }}>Sıfırla</Button></div>
  </div>;
}
