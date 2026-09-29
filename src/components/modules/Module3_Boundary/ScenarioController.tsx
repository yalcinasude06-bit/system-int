import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/common/Button";

const scenarios = [
  { title: "Üretim sistemi", text: "Yalnızca fabrika içindeki üretim sisteminin sınırını çiz." },
  { title: "Tüm işletme sistemi", text: "Bakış açını genişlet: işletmenin yönetebildiği yapıyı yeniden sınırla." },
  { title: "Stratejik ortaklık", text: "Tedarikçiyle 5 yıllık özel ortaklık kuruldu. Tedarikçiyi sistem sınırına dahil et." },
];

export function ScenarioController({ stage, onChange }: { stage: number; onChange: (stage: number) => void }) {
  const scenario = scenarios[stage - 1];
  return <div className="card"><div className="eyebrow">Senaryo {stage}/3</div><h3 style={{ marginTop: 8 }}>{scenario.title}</h3><p className="muted">{scenario.text}</p><div className="button-row"><Button size="small" variant="secondary" disabled={stage === 1} icon={<ArrowLeft size={15} />} onClick={() => onChange(stage - 1)}>Önceki</Button><Button size="small" variant="secondary" disabled={stage === 3} icon={<ArrowRight size={15} />} onClick={() => onChange(stage + 1)}>Sonraki</Button></div></div>;
}
