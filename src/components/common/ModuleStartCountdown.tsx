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
    description: "Yandaki üç örneği piramidin doğru katmanına bırak; üçü de doğruysa piramit tamamlanır, yanlışsa kırmızı yanar ve sıradaki piramide geçilir. 5 piramit tamamlanacak.",
  },
  en: {
    icon: "🔺",
    title: "Module 1: Process Hierarchy",
    description: "Place the three examples on the correct pyramid layers. If all three are correct, the pyramid is complete; otherwise, the incorrect slots turn red and the next pyramid begins. Complete 5 pyramids.",
  },
};

const weekThreeModuleTwoBrief: Record<"tr" | "en", ModuleBrief> = {
  tr: {
    icon: "⬛",
    title: "Modül 2: Kara Kutuda Eksik Adım",
    description: "Süreç zincirindeki eksik adımı bul; üç seçenekten doğru olanı seç. Kesikli boş yuva doğru adımı kısa süre gösterir; yanlış seçim kırmızıyla vurgulanır.",
  },
  en: {
    icon: "⬛",
    title: "Module 2: Missing Step in the Black Box",
    description: "Find the missing step in the process chain and choose the correct option from three choices. The dashed slot briefly shows the correct step, while an incorrect choice is highlighted in red.",
  },
};

const weekThreeModuleThreeBrief: Record<"tr" | "en", ModuleBrief> = {
  tr: {
    icon: "◇",
    title: "Modül 3: Akış Diyagramı Sembolleri",
    description: "Akış diyagramındaki boş adımlara doğru sembolü sürükle. Süre yok; hazır olunca Kontrol Et'e bas. Tümü doğruysa sıradaki seviyeye, yanlış varsa kırmızı yanıp sıradaki seviyeye geçilir. Kolay → Orta → Zor, 3 seviye.",
  },
  en: {
    icon: "◇",
    title: "Module 3: Flowchart Symbols",
    description: "Drag the correct symbol into each blank flowchart step. There is no time limit; press Check when ready. All correct moves to the next level; incorrect choices flash red before the next level. Easy → Medium → Hard, 3 levels.",
  },
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
