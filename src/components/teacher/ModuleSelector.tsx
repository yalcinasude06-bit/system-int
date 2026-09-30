import { Boxes, CheckCircle2, Network, Orbit, PackageOpen, Play, Square, Wrench } from "lucide-react";
import type { ComponentType } from "react";
import type { ModuleId } from "@/types";

const weeks = Array.from({ length: 14 }, (_, index) => index + 1);

export const weekOneModules: Array<{
  id: ModuleId;
  title: string;
  subtitle: string;
  description: string;
  Icon: ComponentType<{ size?: number }>;
}> = [
  { id: 1, title: "Sistemi Kur", subtitle: "Sistem anatomisi", description: "Bir sistemin dokuz temel parçasını doğru konumlara yerleştir.", Icon: Boxes },
  { id: 2, title: "İlişki Ağını Çalıştır", subtitle: "Nedensellik", description: "Bağlantıları kur ve değişimin ağ boyunca nasıl yayıldığını keşfet.", Icon: Network },
  { id: 3, title: "Sınırı Çiz", subtitle: "Sistem ve çevre", description: "Sistem sınırını belirle, doğrudan ve dolaylı çevreyi sınıflandır.", Icon: Orbit },
  { id: 4, title: "Komple Sistemi Kur", subtitle: "Uçtan uca simülasyon", description: "Alt sistemleri bağla, akışı çalıştır ve beklenmeyen duruma yanıt ver.", Icon: PackageOpen },
];

export function WeekSelector({ activeWeek, onChange, disabled }: { activeWeek: number; onChange: (week: number) => void; disabled?: boolean }) {
  return (
    <div className="week-tabs dashboard-week-tabs" role="tablist" aria-label="Ders haftası">
      {weeks.map((week) => (
        <button
          key={week}
          type="button"
          role="tab"
          aria-selected={activeWeek === week}
          disabled={disabled}
          className={`week-tab ${activeWeek === week ? "active" : ""}`}
          onClick={() => onChange(week)}
        >
          Hafta {week}
        </button>
      ))}
    </div>
  );
}

type ModuleSelectorProps = {
  activeWeek: number;
  activeModule: ModuleId;
  moduleStage: number;
  isModuleStarted: boolean;
  faultInjected: boolean;
  disabled?: boolean;
  onStart: (module: ModuleId) => void;
  onFinish: (module: ModuleId) => void;
  onToggleFault: () => void;
};

export function ModuleSelector({ activeWeek, activeModule, moduleStage, isModuleStarted, faultInjected, disabled, onStart, onFinish, onToggleFault }: ModuleSelectorProps) {
  if (activeWeek !== 1) {
    return (
      <div className="coming-soon-card" role="status">
        <span aria-hidden="true">🚧</span>
        <div><strong>Hafta {activeWeek} hazırlık aşamasında</strong><p>Bu haftanın modülleri ve interaktif içerikleri yakında eklenecektir.</p></div>
      </div>
    );
  }

  return (
    <div className="dashboard-module-list" role="list" aria-label="Hafta 1 modülleri">
      {weekOneModules.map(({ id, title, Icon }) => {
        const isActive = activeModule === id;
        const isLive = isActive && isModuleStarted;
        const isFinished = isActive && !isModuleStarted && moduleStage >= 3;
        return (
          <article className={`dashboard-module-row ${isActive ? "active" : ""} ${isLive ? "live" : ""}`} key={id} role="listitem">
            <span className="dashboard-module-number">{String(id).padStart(2, "0")}</span>
            <span className="dashboard-module-icon"><Icon size={25} /></span>
            <h2>{title}</h2>
            <div className="dashboard-module-actions">
              {isLive ? <span className="on-air-badge"><i /> Canlı Yayında</span> : isFinished ? <span className="results-open-badge"><CheckCircle2 size={18} /> Sonuçlar Açık</span> : <button type="button" className="row-action start" disabled={disabled || isModuleStarted} onClick={() => onStart(id)}><Play size={19} fill="currentColor" /> Başlat</button>}
              <button type="button" className="row-action finish" disabled={disabled || !isLive} onClick={() => onFinish(id)}><Square size={18} fill="currentColor" /> Bitir &amp; Sonuçları Açıkla</button>
              {id === 4 && isLive && <button type="button" className={`row-action fault ${faultInjected ? "active" : ""}`} disabled={disabled} onClick={onToggleFault}><Wrench size={17} /> {faultInjected ? "Arıza Aktif" : "Arıza Ekle"}</button>}
            </div>
          </article>
        );
      })}
    </div>
  );
}
