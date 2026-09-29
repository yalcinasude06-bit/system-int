import type { ModuleId } from "@/types";

const modules: Array<{ id: ModuleId; title: string; subtitle: string }> = [
  { id: 1, title: "Sistemi Kur", subtitle: "Anatomi" },
  { id: 2, title: "İlişki Ağı", subtitle: "Nedensellik" },
  { id: 3, title: "Sınırı Çiz", subtitle: "Çevre" },
  { id: 4, title: "Komple Sistem", subtitle: "Simülasyon" },
];

export function ModuleSelector({ active, onChange, disabled }: { active: ModuleId; onChange: (id: ModuleId) => void; disabled?: boolean }) {
  return <div className="module-tabs" role="tablist" aria-label="Aktif modül">
    {modules.map((module) => <button key={module.id} type="button" role="tab" aria-selected={active === module.id} disabled={disabled} className={`module-tab ${active === module.id ? "active" : ""}`} onClick={() => onChange(module.id)}>
      <strong>{module.id}. {module.title}</strong><span>{module.subtitle}</span>
    </button>)}
  </div>;
}
