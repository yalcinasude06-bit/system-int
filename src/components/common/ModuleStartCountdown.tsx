"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleStop, LoaderCircle } from "lucide-react";
import { ModuleGameplayDemo } from "@/components/common/ModuleGameplayDemo";
import { getRemainingCountdown, MODULE_COUNTDOWN_SECONDS } from "@/lib/moduleCountdown";
import type { ModuleId } from "@/types";

type ModuleBrief = {
  icon: string;
  title: string;
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

type ModuleStartCountdownProps = {
  moduleId: ModuleId;
  startedAt: string;
  onComplete: () => void;
  onCancel?: () => void;
  canceling?: boolean;
};

export function ModuleStartCountdown({ moduleId, startedAt, onComplete, onCancel, canceling = false }: ModuleStartCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(() => getRemainingCountdown(startedAt));
  const [visible, setVisible] = useState(() => getRemainingCountdown(startedAt) > 0);
  const current = moduleBriefs[moduleId];

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
        <ModuleGameplayDemo moduleId={moduleId} />
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
