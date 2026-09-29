"use client";

import { useState } from "react";
import { Button } from "@/components/common/Button";

const roles = ["Girdi", "Bileşen", "Çıktı", "Çevre", "Arayüz", "Kısıt"];
const items: Array<[string, string, string]> = [
  ["student", "Öğrenci", "Girdi"], ["academic", "Akademisyen", "Bileşen"], ["courses", "Dersler", "Bileşen"],
  ["graduate", "Mezun", "Çıktı"], ["yok", "YÖK Mevzuatı", "Kısıt"], ["obs", "OBS/ÖBS", "Arayüz"],
  ["internet", "Kampüs İnterneti", "Bileşen"], ["budget", "Bütçe", "Kısıt"], ["market", "İş Piyasası", "Çevre"],
];

export function UniversityStage({ onComplete }: { onComplete: (result: { score: number; classifications: Record<string, string>; mistakes: string[] }) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  function check() {
    const mistakes = items.filter(([id, , answer]) => answers[id] !== answer).map(([, label]) => label);
    const score = Math.round(((items.length - mistakes.length) / items.length) * 100);
    setChecked(true); onComplete({ score, classifications: answers, mistakes });
  }
  return <div className="module-shell"><div><h3>Üniversite sistemi</h3><p className="muted">Her öğenin sistem içindeki baskın rolünü seç.</p></div>
    <div className="stack">{items.map(([id, label, correct]) => <div className="relation-row" key={id} style={checked && answers[id] !== correct ? { border: "1px solid rgba(251,113,133,.45)" } : undefined}><strong>{label}</strong><select className="select" style={{ minHeight: 40, width: 150 }} value={answers[id] || ""} onChange={(e) => { setAnswers((current) => ({ ...current, [id]: e.target.value })); setChecked(false); }}><option value="">Rol seç</option>{roles.map((role) => <option key={role}>{role}</option>)}</select><span>{checked ? (answers[id] === correct ? "✓" : `→ ${correct}`) : ""}</span></div>)}</div>
    {checked && <div className={items.every(([id, , answer]) => answers[id] === answer) ? "notice success" : "notice"}>{items.every(([id, , answer]) => answers[id] === answer) ? "Üniversite sistemini doğru modelledin." : "Rol; öğenin adı değil, sistem içindeki işleviyle belirlenir."}</div>}
    <Button onClick={check} disabled={Object.keys(answers).length !== items.length}>Yanıtı gönder</Button>
  </div>;
}
