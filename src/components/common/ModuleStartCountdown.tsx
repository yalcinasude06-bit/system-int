"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Rocket } from "lucide-react";
import type { ModuleId } from "@/types";

type ModuleBrief = {
  icon: string;
  title: string;
  description: [string, string];
};

const moduleBriefs: Record<ModuleId, ModuleBrief> = {
  1: {
    icon: "🧩",
    title: "Modül 1: Sistemi Kur",
    description: [
      "Sistemin 9 temel parçasını şema üzerindeki doğru yuvalara yerleştir.",
      "Parçaları ezberle değil, sistem içindeki görev ve işlevleriyle eşleştir!",
    ],
  },
  2: {
    icon: "🔄",
    title: "Modül 2: Zincirleme Geri Bildirim",
    description: [
      "Tetiklenen olayların zincirleme etkisini takip et.",
      "Değişkeni artıran etki için Sağa (+), azaltan etki için Sola (-) kaydır!",
    ],
  },
  3: {
    icon: "⬛",
    title: "Modül 3: Kara Kutu Analizi",
    description: [
      "Girdi ile çıktı arasındaki dönüşümü gerçekleştiren doğru süreci bul.",
      "Doğru tercihi yaptığında kara kutu şeffaflaşıp içini gösterecek!",
    ],
  },
  4: {
    icon: "🖼️",
    title: "Modül 4: Sistem Türleri ve Görseller",
    description: [
      "Soldaki 10 sistem türünü sağdaki en uygun temsili görsellerle eşleştir.",
      "Görselde özellikle vurgulanan temel sistem özelliğine odaklan!",
    ],
  },
  5: {
    icon: "🎈",
    title: "Modül 5: İlişki Türleri ve Balonlar",
    description: [
      "Alttan yükselen balondaki cümlenin hangi ilişki türüne ait olduğunu belirle.",
      "Doğru iğneye basarak balonu tepeye ulaşmadan patlat!",
    ],
  },
};

export function ModuleStartCountdown({ moduleId, onComplete }: { moduleId: ModuleId; onComplete: () => void }) {
  const [timeLeft, setTimeLeft] = useState(10);
  const [visible, setVisible] = useState(true);
  const current = moduleBriefs[moduleId];
  const isLaunching = timeLeft === 0;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLaunching) return;
    const timer = window.setTimeout(() => setVisible(false), 650);
    return () => window.clearTimeout(timer);
  }, [isLaunching]);

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
        <span className="module-start-eyebrow">10 saniyelik hazırlık</span>
        <motion.span className="module-start-icon" aria-hidden="true" animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.06, 1] }} transition={{ duration: 2.2, repeat: Infinity }}>{current.icon}</motion.span>
        <h1 id="module-start-title">{current.title}</h1>
        <div className="module-start-description">
          {current.description.map((line) => <p key={line}>{line}</p>)}
        </div>
        <div
          className={`module-start-counter ${isLaunching ? "launching" : ""}`}
          style={{ "--countdown-progress": `${timeLeft * 36}deg` } as CSSProperties}
          aria-live="assertive"
          aria-label={isLaunching ? "Başla" : `${timeLeft} saniye kaldı`}
        >
          <span key={timeLeft}>{isLaunching ? <Rocket size={31} /> : timeLeft}</span>
        </div>
        <strong className="module-start-status">{isLaunching ? "Başla!" : "Hazır olun, başlıyor…"}</strong>
      </motion.section>
    </motion.div>}
  </AnimatePresence>;
}
