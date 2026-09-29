"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/common/Button";

const zones = [
  ["purpose", "Neden var?", "Amaç"], ["components", "İçindeki aktörler", "Bileşenler"], ["relations", "Birlikte çalışma biçimi", "İlişkiler"],
  ["boundary", "İçerisi / dışarısı", "Sınır"], ["environment", "Dış etkiler", "Çevre"], ["interface", "Geçiş kapısı", "Arayüz"],
  ["input", "Sisteme giren", "Girdi"], ["output", "Sistemden çıkan", "Çıktı"], ["constraint", "Hareket alanını daraltan", "Kısıt"],
] as const;
const cards = zones.map(([, , answer]) => answer);

export function ConceptualStage({ onComplete }: { onComplete: (result: { score: number; placements: Record<string, string>; mistakes: string[] }) => void }) {
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const available = useMemo(() => cards.filter((card) => !Object.values(placements).includes(card)), [placements]);

  function place(zoneId: string, card: string) {
    setPlacements((current) => {
      const next = { ...current };
      Object.keys(next).forEach((key) => { if (next[key] === card) delete next[key]; });
      next[zoneId] = card;
      return next;
    });
    setSelected(null); setChecked(false);
  }

  function check() {
    const mistakes = zones.filter(([id, , answer]) => placements[id] !== answer).map(([, , answer]) => answer);
    const score = Math.round(((zones.length - mistakes.length) / zones.length) * 100);
    setChecked(true); onComplete({ score, placements, mistakes });
  }

  return <div className="module-shell">
    <div><h3>Kavramsal sistem şeması</h3><p className="muted">Kartı sürükleyip bölgeye bırak veya karta, ardından hedef bölgeye tıkla.</p></div>
    <div className="card-tray" aria-label="Kavram kartları">{available.map((card) => <button draggable key={card} type="button" className={`drag-card ${selected === card ? "selected" : ""}`} onDragStart={(e) => e.dataTransfer.setData("text/plain", card)} onClick={() => setSelected(card)}>{card}</button>)}</div>
    <div className="concept-grid">{zones.map(([id, label, answer]) => {
      const value = placements[id]; const correct = checked && value === answer; const wrong = checked && value !== answer;
      return <button type="button" key={id} className={`drop-zone ${value ? "filled" : ""} ${wrong ? "wrong" : ""}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => place(id, e.dataTransfer.getData("text/plain"))} onClick={() => selected && place(id, selected)}>
        <span className="muted" style={{ fontSize: 11 }}>{label}</span><strong>{value || "Kart bırak"}</strong>{correct && <CheckCircle2 size={16} color="var(--success)" />}
      </button>;
    })}</div>
    {checked && <div className={Object.values(placements).length === zones.length && zones.every(([id, , answer]) => placements[id] === answer) ? "notice success" : "notice"}>{zones.every(([id, , answer]) => placements[id] === answer) ? "Harika! Sistem anatomisinin tamamı doğru." : "Bazı kavramlar yeniden düşünülmeli. Kırmızı alanları düzeltip tekrar kontrol et."}</div>}
    <div className="button-row"><Button onClick={check} disabled={Object.keys(placements).length !== zones.length}>Kontrol et</Button><Button variant="secondary" icon={<RotateCcw size={16} />} onClick={() => { setPlacements({}); setChecked(false); }}>Sıfırla</Button></div>
  </div>;
}
