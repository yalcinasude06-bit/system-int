import { Boxes, CheckCircle2, Network, Play, ScanSearch, Shapes, Square } from "lucide-react";
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
  { id: 2, title: "İlişki Ağını Çalıştır", subtitle: "10 kartlık nedensellik zinciri", description: "Değişimlerin sistem boyunca hangi yönde ilerlediğini kaydırarak belirle.", Icon: Network },
  { id: 3, title: "Kara Kutuyu Aç", subtitle: "Süreç analizi", description: "Girdi ve çıktıyı bağlayan dönüşüm sürecini on farklı sistemde keşfet.", Icon: ScanSearch },
  { id: 4, title: "Sistem Türlerini Eşleştir", subtitle: "Görsel sınıflandırma", description: "On sistem türünü onları temsil eden görsellerle eşleştir.", Icon: Shapes },
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
  disabled?: boolean;
  onStart: (module: ModuleId) => void;
  onFinish: (module: ModuleId) => void;
};

export function ModuleSelector({ activeWeek, activeModule, moduleStage, isModuleStarted, disabled, onStart, onFinish }: ModuleSelectorProps) {
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
            </div>
          </article>
        );
      })}
    </div>
  );
}
