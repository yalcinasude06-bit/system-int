"use client";

import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/common/Button";

export function SimulationRunner({ running, result, explanations, onRun, onReset }: { running: boolean; result: string; explanations: string[]; onRun: () => void; onReset: () => void }) {
  return <div className="card"><div className="section-head"><div><h3>Başlangıç şoku</h3><p>Talep %20 arttı. Etki ağ boyunca doğru yayılacak mı?</p></div><span className="badge">+%20 Talep</span></div>
    {result && <div className={result.startsWith("Başarılı") ? "notice success" : "notice error"}>{result}</div>}
    {explanations.length > 0 && <div className="pedagogy-list"><strong>Neden?</strong>{explanations.map((item) => <p key={item}>{item}</p>)}</div>}
    <div className="button-row"><Button loading={running} onClick={onRun} icon={<Play size={17} />}>Sistemi çalıştır</Button><Button variant="secondary" onClick={onReset} icon={<RotateCcw size={17} />}>Ağı temizle</Button></div>
  </div>;
}
