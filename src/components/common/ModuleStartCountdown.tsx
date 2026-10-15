"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleStop, LoaderCircle } from "lucide-react";
import { ModuleGameplayDemo } from "@/components/common/ModuleGameplayDemo";
import { useI18n } from "@/lib/i18n/I18nContext";
import { getRemainingCountdown, MODULE_COUNTDOWN_SECONDS } from "@/lib/moduleCountdown";
import type { ModuleId } from "@/types";

type ModuleBrief = {
  icon: string;
  title: string;
  description?: string;
};

const moduleBriefs: Record<ModuleId, ModuleBrief> = {
  1: {
    icon: "🧩",
    title: "Modül 1: Sistemi Kur",
  },
  2: {
    icon: "🔄",
    title: "Modül 2: Zincirleme Geri Bildirim",
  },
  3: {
    icon: "⬛",
    title: "Modül 3: Kara Kutu Analizi",
  },
  4: {
    icon: "🖼️",
    title: "Modül 4: Sistem Türleri Eşleştirme",
  },
  5: {
    icon: "🎈",
    title: "Modül 5: İlişki Türleri ve Balonlar",
  },
};

const weekThreeModuleOneBrief: Record<"tr" | "en", ModuleBrief> = {
  tr: {
    icon: "🔺",
    title: "Modül 1: Süreç Hiyerarşisi",
    description: "Kartı doğru piramit katmanına bırak.",
  },
  en: {
    icon: "🔺",
    title: "Module 1: Process Hierarchy",
    description: "Drag the card to its correct pyramid layer.",
  },
};

const weekThreeModuleTwoBrief: Record<"tr" | "en", ModuleBrief> = {
  tr: {
    icon: "⬛",
    title: "Modül 2: Kara Kutuda Eksik Adım",
    description: "Eksik adımı seç; süreç zincirini tamamla.",
  },
  en: {
    icon: "⬛",
    title: "Module 2: Missing Step in the Black Box",
    description: "Choose the missing step to complete the process chain.",
  },
};

const weekThreeModuleThreeBrief: Record<"tr" | "en", ModuleBrief> = {
  tr: {
    icon: "◇",
    title: "Modül 3: Akış Diyagramı Sembolleri",
    description: "Sembolü boş şekle bırak; karar dalını takip et.",
  },
  en: {
    icon: "◇",
    title: "Module 3: Flowchart Symbols",
    description: "Drag the symbol into the blank shape; follow the decision branch.",
  },
};

const weekFourModuleOneBrief: Record<"tr" | "en", ModuleBrief> = {
  tr: {
    icon: "🏭",
    title: "Modül 1: Fabrikayı Dönüştür",
    description: "Fabrikayı incele, karar ver; gerekirse 5 saniyede kurtar!",
  },
  en: {
    icon: "🏭",
    title: "Module 1: Transform the Factory",
    description: "Inspect the factory, decide, and rescue it in 5 seconds if needed!",
  },
};

const weekFourModuleTwoBrief: Record<"tr" | "en", ModuleBrief> = {
  tr: {
    icon: "💬",
    title: "Modül 2: Patronun Yaklaşımını Bul",
    description: "Patronun söylediğini oku, yaklaşımını seç!",
  },
  en: {
    icon: "💬",
    title: "Module 2: Find the Boss’s Approach",
    description: "Read the boss's statement and choose the approach!",
  },
};

const weekFourModuleThreeBrief: Record<"tr" | "en", ModuleBrief> = {
  tr: {
    icon: "↔️",
    title: "Modül 3: Sistem Nedir, Ne Değildir?",
    description: "Kartları doğru alana sürükle.",
  },
  en: {
    icon: "↔️",
    title: "Module 3: What Is and Is Not a System?",
    description: "Drag the cards to the correct area.",
  },
};

const weekFiveModuleOneBrief: Record<"tr" | "en", ModuleBrief> = {
  tr: {
    icon: "🕰️",
    title: "Modül 1: Gecikmenin İzinde",
    description: "Haziran sorununu başlatan geçmiş kararı bul; gecikmiş etkilerin ay ay nasıl düzeldiğini izle.",
  },
  en: {
    icon: "🕰️",
    title: "Module 1: Tracing the Delay",
    description: "Find the past decision behind June's problem and watch its delayed effects improve month by month.",
  },
};

const weekFiveModuleTwoBrief: Record<"tr" | "en", ModuleBrief> = {
  tr: {
    icon: "🎯",
    title: "Modül 2: Sorun Avcısı",
    description: "Görevi oku; olay, örüntü veya sistem yapısı olan doğru hedefe dokun.",
  },
  en: {
    icon: "🎯",
    title: "Module 2: Problem Hunter",
    description: "Read the mission and tap the correct event, pattern, or system-structure target.",
  },
};

const weekFiveModuleThreeBrief: Record<"tr" | "en", ModuleBrief> = {
  tr: {
    icon: "⚖️",
    title: "Modül 3: Denge Ustası",
    description: "Göstergeleri izle; sınırlı bütçe ve ekiple sistemi 60 saniye dengede tut.",
  },
  en: {
    icon: "⚖️",
    title: "Module 3: Balance Master",
    description: "Watch the indicators and keep the system balanced for 60 seconds with limited budget and staff.",
  },
};

const weekSixModuleOneBrief: Record<"tr" | "en", ModuleBrief> = {
  tr: { icon: "🏭", title: "1. Akış Operasyonu", description: "Beş mini oyunda stok, giriş, çıkış, zaman ve grafik ilişkisini çalıştır." },
  en: { icon: "🏭", title: "1. Flow Operation", description: "Run stock, inflow, outflow, time, and graph relationships through five mini games." },
};

const weekSixModuleTwoBrief: Record<"tr" | "en", ModuleBrief> = {
  tr: { icon: "🛠️", title: "2. Simülasyon Tamircisi", description: "Önce arızayı teşhis et, sonra model parçasını onarıp görsel testi çalıştır." },
  en: { icon: "🛠️", title: "2. Simulation Repairer", description: "Diagnose the fault, repair the model part, then run the visual test." },
};

type ModuleStartCountdownProps = {
  weekId?: number;
  moduleId: ModuleId;
  startedAt: string;
  onComplete: () => void;
  onCancel?: () => void;
  canceling?: boolean;
};

export function ModuleStartCountdown({ weekId = 1, moduleId, startedAt, onComplete, onCancel, canceling = false }: ModuleStartCountdownProps) {
  const { locale } = useI18n();
  const [timeLeft, setTimeLeft] = useState(() => getRemainingCountdown(startedAt));
  const [visible, setVisible] = useState(() => getRemainingCountdown(startedAt) > 0);
  const current = weekId === 3 && moduleId === 1
    ? weekThreeModuleOneBrief[locale]
    : weekId === 3 && moduleId === 2
      ? weekThreeModuleTwoBrief[locale]
      : weekId === 3 && moduleId === 3
        ? weekThreeModuleThreeBrief[locale]
      : weekId === 4 && moduleId === 1
        ? weekFourModuleOneBrief[locale]
      : weekId === 4 && moduleId === 2
        ? weekFourModuleTwoBrief[locale]
      : weekId === 4 && moduleId === 3
        ? weekFourModuleThreeBrief[locale]
      : weekId === 5 && moduleId === 1
        ? weekFiveModuleOneBrief[locale]
      : weekId === 5 && moduleId === 2
        ? weekFiveModuleTwoBrief[locale]
      : weekId === 5 && moduleId === 3
        ? weekFiveModuleThreeBrief[locale]
      : weekId === 6 && moduleId === 1
        ? weekSixModuleOneBrief[locale]
      : weekId === 6 && moduleId === 2
        ? weekSixModuleTwoBrief[locale]
      : moduleBriefs[moduleId];

  useEffect(() => {
    function syncWithSessionStart() {
      const remaining = getRemainingCountdown(startedAt);
      setTimeLeft(remaining);
      if (remaining === 0) setVisible(false);
    }

    syncWithSessionStart();
    const timer = window.setInterval(syncWithSessionStart, 200);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  return <AnimatePresence onExitComplete={onComplete}>
    {visible && <motion.div
      className="module-start-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="module-start-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: .38 }}
    >
      <motion.section
        className="module-start-card"
        initial={{ opacity: 0, scale: .9, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: .94, y: -12 }}
        transition={{ type: "spring", stiffness: 230, damping: 24 }}
      >
        <span className="module-start-eyebrow">Nasıl oynanır? · {MODULE_COUNTDOWN_SECONDS} saniye</span>
        <div className="module-start-heading">
          <motion.span className="module-start-icon" aria-hidden="true" animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.06, 1] }} transition={{ duration: 2.2, repeat: Infinity }}>{current.icon}</motion.span>
          <h1 id="module-start-title">{current.title}</h1>
        </div>
        {current.description && <p className="module-start-description">{current.description}</p>}
        <ModuleGameplayDemo weekId={weekId} moduleId={moduleId} />
        <div
          className="module-start-counter"
          style={{ "--countdown-progress": `${timeLeft * (360 / MODULE_COUNTDOWN_SECONDS)}deg` } as CSSProperties}
          aria-live="assertive"
          aria-label={`${timeLeft} saniye kaldı`}
        >
          <span key={timeLeft}>{timeLeft}</span>
        </div>
        <strong className="module-start-status">Hazır olun, başlıyor…</strong>
        {onCancel && <button type="button" className="module-start-cancel" disabled={canceling} onClick={onCancel}>
          {canceling ? <LoaderCircle size={18} className="animate-spin" /> : <CircleStop size={18} />}
          Başlatmayı İptal Et
        </button>}
      </motion.section>
    </motion.div>}
  </AnimatePresence>;
}
