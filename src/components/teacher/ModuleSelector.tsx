import type { ModuleId } from "@/types";

const weeks = Array.from({ length: 14 }, (_, index) => index + 1);
const modules: Array<{ id: ModuleId; title: string; subtitle: string }> = [
  { id: 1, title: "Sistemi Kur", subtitle: "Anatomi" },
  { id: 2, title: "İlişki Ağı", subtitle: "Nedensellik" },
  { id: 3, title: "Sınırı Çiz", subtitle: "Çevre" },
  { id: 4, title: "Komple Sistem", subtitle: "Simülasyon" },
];

export function ModuleSelector({ activeWeek, activeModule, onChange, disabled }: { activeWeek: number; activeModule: ModuleId; onChange: (week: number, module: ModuleId) => void; disabled?: boolean }) {
  return <div className="weekly-module-menu">
    <div className="week-tabs" role="tablist" aria-label="Ders haftası">
      {weeks.map((week) => <button key={week} type="button" role="tab" aria-selected={activeWeek === week} disabled={disabled} className={`week-tab ${activeWeek === week ? "active" : ""}`} onClick={() => onChange(week, 1)}>Hafta {week}</button>)}
    </div>
    <div className="week-module-heading"><div><span className="eyebrow">Hafta {activeWeek}</span><h3>Uygulama modülleri</h3></div><span className="badge">Hafta {activeWeek} · Modül {activeModule}</span></div>
    <div className="module-tabs" role="tablist" aria-label={`Hafta ${activeWeek} aktif modülü`}>
      {modules.map((module) => <button key={module.id} type="button" role="tab" aria-selected={activeModule === module.id} disabled={disabled} className={`module-tab ${activeModule === module.id ? "active" : ""}`} onClick={() => onChange(activeWeek, module.id)}>
        <strong>{module.id}. {module.title}</strong><span>{module.subtitle}</span>
      </button>)}
    </div>
  </div>;
}
