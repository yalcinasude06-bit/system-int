import { BarChart3, Boxes, CheckCircle2, Factory, Layers3, ListChecks, Network, Play, RotateCcw, ScanSearch, Shapes, Square, Target, UsersRound, Workflow } from "lucide-react";
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
  { id: 5, title: "İlişki Balonlarını Patlat", subtitle: "İlişki türleri", description: "Süzülen ifadeleri altı ilişki türünden doğru iğneyle eşleştir.", Icon: Target },
];

const weekThreeModules: typeof weekOneModules = [
  { id: 1, title: "Süreç Hiyerarşisi", subtitle: "5 piramitlik süreç oyunu", description: "Temel süreç, alt süreç ve faaliyet örneklerini doğru piramit katmanlarına yerleştir.", Icon: Layers3 },
  { id: 2, title: "Kara Kutuda Eksik Adım", subtitle: "10 süreç zinciri", description: "Süreç zincirindeki eksik adımı üç seçenek arasından bularak kara kutuyu aç.", Icon: Workflow },
  { id: 3, title: "Akış Diyagramı Sembolleri", subtitle: "Kolaydan zora sembol yerleştirme", description: "Akış diyagramındaki eksik şekilleri doğru sembollerle tamamla.", Icon: Workflow },
];

const weekFourModules: typeof weekOneModules = [
  { id: 1, title: "Fabrikayı Dönüştür", subtitle: "3 aşama · 5 sistem kararı", description: "Fabrikayı incele, üç sistem modeline göre karar ver ve gerektiğinde 5 saniyede kurtar.", Icon: Factory },
  { id: 2, title: "Patronun Yaklaşımını Bul", subtitle: "10 farklı yönetici sözü", description: "Yöneticinin kullandığı sistem yaklaşımını dört seçenek arasından belirle.", Icon: UsersRound },
  { id: 3, title: "Sistem Nedir, Ne Değildir?", subtitle: "6 kartlık sınıflandırma", description: "Sistem düşüncesine uygun ifadeleri Sistemdir veya Uygun değil alanına yerleştir.", Icon: ListChecks },
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
  currentRunNumber: number;
  submittedCount: number;
  totalStudents: number;
  disabled?: boolean;
  onStart: (module: ModuleId) => void;
  onFinish: (module: ModuleId) => void;
  onViewResults: () => void;
};

export function ModuleSelector({ activeWeek, activeModule, moduleStage, isModuleStarted, currentRunNumber, submittedCount, totalStudents, disabled, onStart, onFinish, onViewResults }: ModuleSelectorProps) {
  if (activeWeek !== 1 && activeWeek !== 3 && activeWeek !== 4) {
    return (
      <div className="coming-soon-card" role="status">
        <span aria-hidden="true">🚧</span>
        <div><strong>Hafta {activeWeek} hazırlık aşamasında</strong><p>Bu haftanın modülleri ve interaktif içerikleri yakında eklenecektir.</p></div>
      </div>
    );
  }

  const modules = activeWeek === 1 ? weekOneModules : activeWeek === 3 ? weekThreeModules : weekFourModules;

  return (
    <div className="dashboard-module-list" role="list" aria-label={`Hafta ${activeWeek} modülleri`}>
      {modules.map(({ id, title, Icon }) => {
        const isActive = activeModule === id;
        const isLive = isActive && isModuleStarted;
        const isFinished = isActive && !isModuleStarted && moduleStage >= 3;
        const everyoneCompleted = isLive && totalStudents > 0 && submittedCount >= totalStudents;
        return (
          <article className={`dashboard-module-row ${isActive ? "active" : ""} ${isLive ? "live" : ""}`} key={id} role="listitem">
            <span className="dashboard-module-number">{String(id).padStart(2, "0")}</span>
            <span className="dashboard-module-icon"><Icon size={25} /></span>
            <h2>{title}</h2>
            {isLive && <span className={`module-progress-badge ${everyoneCompleted ? "complete" : ""}`} aria-live="polite">
              {everyoneCompleted ? <><CheckCircle2 size={17} /> Tur {currentRunNumber}: Herkes Tamamladı!</> : <><UsersRound size={17} /> Tur {currentRunNumber}: {submittedCount} / {totalStudents}</>}
            </span>}
            <div className="dashboard-module-actions">
              {isLive ? <span className="on-air-badge"><i /> Canlı Yayında</span> : isFinished ? <><span className="results-open-badge"><CheckCircle2 size={18} /> Tur {currentRunNumber} Sonuçları</span><button type="button" className="row-action" disabled={disabled} onClick={onViewResults}><BarChart3 size={18} /> Sonuçları Gör</button><button type="button" className="row-action start" disabled={disabled || isModuleStarted} onClick={() => onStart(id)}><RotateCcw size={18} /> Tekrar Başlat</button></> : <button type="button" className="row-action start" disabled={disabled || isModuleStarted} onClick={() => onStart(id)}><Play size={19} fill="currentColor" /> Başlat</button>}
              {isLive && <button type="button" className="row-action finish" disabled={disabled} onClick={() => onFinish(id)}><Square size={18} fill="currentColor" /> Bitir &amp; Sonuçları Açıkla</button>}
            </div>
          </article>
        );
      })}
    </div>
  );
}
