import { Siren, Wrench } from "lucide-react";
import { Button } from "@/components/common/Button";

export function FaultInjectionPanel({ active, onToggle, loading }: { active: boolean; onToggle: () => void; loading?: boolean }) {
  return <div className="card">
    <div className="module-header"><span className="module-number" style={{ color: active ? "var(--danger)" : undefined }}><Siren /></span><div><h3>Kriz enjeksiyonu</h3><p className="muted">Üretim hattını devre dışı bırakarak sınıfın sistemi yeniden tasarlamasını sağlayın.</p></div></div>
    {active && <div className="fault-banner" style={{ margin: "18px 0" }}><Wrench size={18} /> Üretim hattı devre dışı. Öğrenciler alternatif akış arıyor.</div>}
    <Button variant={active ? "secondary" : "danger"} size="small" loading={loading} onClick={onToggle} icon={<Siren size={16} />}>{active ? "Krizi sonlandır" : "Arıza tetikle"}</Button>
  </div>;
}
