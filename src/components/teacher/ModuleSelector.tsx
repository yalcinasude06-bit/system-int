import { Boxes, Network, Orbit, PackageOpen } from "lucide-react";
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
    <div className="week-tabs projection-week-tabs" role="tablist" aria-label="Ders haftası">
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

export function ModuleSelector({ activeWeek, activeModule, onChange, disabled }: { activeWeek: number; activeModule: ModuleId; onChange: (module: ModuleId) => void; disabled?: boolean }) {
  if (activeWeek !== 1) {
    return (
      <div className="coming-soon-card" role="status">
        <span aria-hidden="true">🚧</span>
        <div>
          <strong>Hafta {activeWeek} hazırlık aşamasında</strong>
          <p>Bu haftanın modülleri ve interaktif içerikleri yakında eklenecektir.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="weekly-module-menu">
      <div className="week-module-heading">
        <div><span className="eyebrow">Hafta 1</span><h3>Uygulama modülleri</h3></div>
        <span className="badge">4 canlı etkinlik</span>
      </div>
      <div className="module-tabs" role="tablist" aria-label="Hafta 1 aktif modülü">
        {weekOneModules.map(({ id, title, subtitle, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeModule === id}
            disabled={disabled}
            className={`module-tab ${activeModule === id ? "active" : ""}`}
            onClick={() => onChange(id)}
          >
            <span className="module-tab-icon"><Icon size={19} /></span>
            <span><strong>{id}. {title}</strong><small>{subtitle}</small></span>
          </button>
        ))}
      </div>
    </div>
  );
}
