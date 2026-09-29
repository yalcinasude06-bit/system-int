import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/common/Button";

export function TokenSimulation({ running, feedback, onRun, onReset }: { running: boolean; feedback: string; onRun: () => void; onReset: () => void }) {
  return <div className="card"><div className="section-head"><div><h3>Canlı token simülasyonu</h3><p>Siparişi başlat ve token’ın uçtan uca akışını doğrula.</p></div><span className="badge">Müşteri → Firma → Müşteri</span></div>
    {feedback && <div className={feedback.startsWith("Akış tamamlandı") ? "notice success" : "notice error"}>{feedback}</div>}
    <div className="button-row"><Button loading={running} onClick={onRun} icon={<Play size={17} />}>Siparişi başlat</Button><Button variant="secondary" onClick={onReset} icon={<RotateCcw size={17} />}>Sıfırla</Button></div>
  </div>;
}
