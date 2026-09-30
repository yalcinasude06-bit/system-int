"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Radio, Sparkles } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { HomeAccessPanel } from "@/components/home/HomeAccessPanel";

const modules = [
  ["01", "Sistemi Kur", "Sistemin dokuz temel parçasını doğru yere yerleştir."],
  ["02", "İlişki Ağını Çalıştır", "Nedensel bağlantıları kur, şokun sistemde nasıl yayıldığını gör."],
  ["03", "Sınırı Çiz", "Dinamik sistem sınırını çokgenle çiz ve çevreyi sınıflandır."],
  ["04", "Komple Sistemi Kur", "Alt sistemleri bağla, akışı çalıştır ve krize yanıt ver."],
  ["05", "İlişki Türlerini Yakala", "Altı ilişki türünü ayırt et, doğru iğneyi seç ve balonları patlat."],
];

export default function HomePage() {
  return (
    <><Navbar /><main>
      <section className="container home-welcome">
        <motion.div className="home-welcome-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65 }}>
          <div className="home-live-chip">✨ Canlı • Etkileşimli • Ölçülebilir</div>
          <h1>Sistem düşüncesini <span className="gradient-text">harekete geçir.</span></h1>
          <p className="lead">Sınıfı tek bir canlı laboratuvara dönüştür. Öğrenciler sistemi kurar, ilişkileri test eder, sınırları çizer ve kriz altında yeniden tasarlar.</p>
          <HomeAccessPanel />
        </motion.div>
        <motion.div className="home-live-visual" role="img" aria-label="Girdi, süreç ve çıktı arasında çalışan canlı sistem düşüncesi animasyonu" initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .18, duration: .8 }}>
          <motion.div className="home-float-badge feedback" animate={{ y: [0, -10, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}>🔄 Feedback Loop</motion.div>
          <motion.div className="home-float-badge anatomy" animate={{ y: [0, 9, 0] }} transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}>🧩 Sistem Anatomisi</motion.div>
          <motion.div className="home-float-badge black-box" animate={{ y: [0, -7, 0] }} transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}>⬛ Kara Kutu Analizi</motion.div>
          <div className="home-system-core">
            <span className="home-core-orbit" />
            <div className="home-flow-node input"><small>GİRDİ</small><strong>Veri</strong></div>
            <ArrowRight className="home-flow-arrow" size={24} />
            <motion.div className="home-flow-node process" animate={{ scale: [1, 1.045, 1] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}><small>SÜREÇ</small><strong>⚙️</strong></motion.div>
            <ArrowRight className="home-flow-arrow" size={24} />
            <div className="home-flow-node output"><small>ÇIKTI</small><strong>Etki</strong></div>
          </div>
          <p>Her parça birbirini etkiler; öğrenciler sistemi canlı olarak görür, test eder ve yeniden kurar.</p>
        </motion.div>
      </section>

      <section className="container page" id="modules">
        <div className="section-head"><div><div className="eyebrow">Öğrenme akışı</div><h2 className="page-title">Bakma. Sistemi çalıştır.</h2></div><Sparkles color="var(--amber)" size={36} /></div>
        <div className="grid-2">
          {modules.map(([number, title, description], index) => (
            <motion.article className="card" key={number} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .08 }}>
              <div className="module-header"><span className="module-number">{number}</span><div><h3>{title}</h3><p className="muted">{description}</p></div></div>
            </motion.article>
          ))}
        </div>
      </section>
      <section className="container page">
        <div className="panel" style={{ textAlign: "center", padding: "55px 24px" }}>
          <Radio size={38} color="var(--teal)" /><h2 style={{ fontSize: "clamp(28px,4vw,48px)", margin: "18px 0 10px" }}>Sınıf hazır. Sistem hazır mı?</h2>
          <p className="lead" style={{ margin: "0 auto" }}>Bir oturum oluştur, QR kodunu yansıt ve öğrenmenin sınıfta yayılışını canlı izle.</p>
          <div className="hero-actions" style={{ justifyContent: "center" }}><Link className="btn btn-primary" href="/teacher">Hemen başlat <ArrowRight size={18} /></Link></div>
        </div>
      </section>
    </main></>
  );
}
