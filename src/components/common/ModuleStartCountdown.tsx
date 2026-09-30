"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleStop, LoaderCircle } from "lucide-react";
import { getRemainingCountdown, MODULE_COUNTDOWN_SECONDS } from "@/lib/moduleCountdown";
import type { ModuleId } from "@/types";

type ModuleBrief = {
  icon: string;
  title: string;
  steps: Array<{
    action: string;
    detail: string;
  }>;
  warning?: string;
};

const moduleBriefs: Record<ModuleId, ModuleBrief> = {
  1: {
    icon: "🧩",
    title: "Modül 1: Sistemi Kur",
    steps: [
      { action: "Kavram kartını seç", detail: "Yukarıdaki bir karta dokun veya kartı sürükle." },
      { action: "Hedef yuvaya yerleştir", detail: "Şemadaki kesikli doğru yuvaya dokun." },
      { action: "Kontrol Et", detail: "Tüm kartları yerleştirince butona bas." },
    ],
  },
  2: {
    icon: "🔄",
    title: "Modül 2: Zincirleme Geri Bildirim",
    steps: [
      { action: "Sağa kaydır 👉", detail: "Kart üstteki durumu artırıyorsa: doğru orantı (+)." },
      { action: "Sola kaydır 👈", detail: "Kart üstteki durumu azaltıyorsa: ters orantı (-)." },
    ],
  },
  3: {
    icon: "⬛",
    title: "Modül 3: Kara Kutu Analizi",
    steps: [
      { action: "Dönüşümü düşün", detail: "Girdiyi çıktıya çeviren süreci bul." },
      { action: "Bir seçeneğe dokun", detail: "Alttaki 3 seçenekten doğru olanı seç; kutu aydınlansın." },
    ],
  },
  4: {
    icon: "🖼️",
    title: "Modül 4: Sistem Türleri Eşleştirme",
    steps: [
      { action: "Sistem türünü seç", detail: "Önce soldaki sistem türüne dokun." },
      { action: "Görselle eşleştir", detail: "Ardından sağdaki uygun görsele dokun." },
      { action: "Kontrol Et", detail: "Tüm eşleştirmeler bitince butona bas." },
    ],
  },
  5: {
    icon: "🎈",
    title: "Modül 5: İlişki Türleri ve Balonlar",
    steps: [
      { action: "Balondaki cümleyi oku", detail: "Balon ekrandan çıkmadan ilişki türünü belirle." },
      { action: "Doğru iğneye dokun", detail: "Sağ veya soldaki 6 iğneden doğru olanla balonu patlat." },
    ],
    warning: "Yanlış iğne seçersen tüm iğneler 3 saniye kilitlenir!",
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
        <motion.span className="module-start-icon" aria-hidden="true" animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.06, 1] }} transition={{ duration: 2.2, repeat: Infinity }}>{current.icon}</motion.span>
        <h1 id="module-start-title">{current.title}</h1>
        <div className="module-start-gameplay">
          {current.steps.map((step, index) => <div className="module-start-step" key={step.action}>
            <span>{index + 1}</span>
            <div><strong>{step.action}</strong><small>{step.detail}</small></div>
          </div>)}
        </div>
        {current.warning && <div className="module-start-warning" role="note">⚠️ {current.warning}</div>}
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
