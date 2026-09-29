"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, GraduationCap, Presentation, Radio, Sparkles } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";

const modules = [
  ["01", "Sistemi Kur", "Sistemin dokuz temel parçasını doğru yere yerleştir."],
  ["02", "İlişki Ağını Çalıştır", "Nedensel bağlantıları kur, şokun sistemde nasıl yayıldığını gör."],
  ["03", "Sınırı Çiz", "Dinamik sistem sınırını çokgenle çiz ve çevreyi sınıflandır."],
  ["04", "Komple Sistemi Kur", "Alt sistemleri bağla, akışı çalıştır ve krize yanıt ver."],
];

export default function HomePage() {
  return (
    <><Navbar /><main>
      <section className="container hero">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65 }}>
          <div className="eyebrow">Canlı • Etkileşimli • Ölçülebilir</div>
          <h1><span className="gradient-text">Sistem düşüncesini</span><br />harekete geçir.</h1>
          <p className="lead">Sınıfı tek bir canlı laboratuvara dönüştür. Öğrenciler sistemi kurar, ilişkileri test eder, sınırları çizer ve kriz altında yeniden tasarlar.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/teacher"><Presentation size={19} /> Oturum başlat <ArrowRight size={18} /></Link>
            <Link className="btn btn-secondary" href="/student"><GraduationCap size={19} /> Derse katıl</Link>
          </div>
          <div className="trust-row">
            <span><CheckCircle2 size={15} color="var(--teal)" /> Gerçek zamanlı sınıf</span>
            <span><CheckCircle2 size={15} color="var(--teal)" /> Kurulumsuz katılım</span>
            <span><CheckCircle2 size={15} color="var(--teal)" /> Dört uygulamalı modül</span>
          </div>
        </motion.div>
        <motion.div className="hero-visual" initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .18, duration: .8 }}>
          <div className="orbit one"><i className="orbit-dot" /></div>
          <div className="orbit two"><i className="orbit-dot" /></div>
          <div className="visual-core glass"><strong>4</strong><span className="eyebrow">Canlı modül</span><p>Birbirine bağlı parçalar, tek bir öğrenme deneyimi.</p></div>
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
