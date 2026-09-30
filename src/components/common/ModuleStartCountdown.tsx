"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Rocket } from "lucide-react";
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
        <span className="module-start-eyebrow">Nasıl oynanır? · 10 saniye</span>
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
