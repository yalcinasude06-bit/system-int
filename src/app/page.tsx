"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, GraduationCap, Presentation, Radio, Sparkles, Workflow } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";

const modules = [
  ["01", "Sistemi Kur", "Sistemin dokuz temel parçasını doğru yere yerleştir."],
  ["02", "Geri Bildirim Zinciri", "Nedensel ilişkileri çöz, değişimin sistem boyunca nasıl yayıldığını gör."],
  ["03", "Kara Kutu Analizi", "Girdi, süreç ve çıktı bağlarını kurarak görünmeyen işleyişi keşfet."],
  ["04", "Sistem Türlerini Eşleştir", "Sistemleri özellikleri ve görselleriyle doğru türlere eşleştir."],
  ["05", "İlişki Türlerini Yakala", "Altı ilişki türünü ayırt et, doğru iğneyi seç ve balonları patlat."],
];

export default function HomePage() {
  return (
    <><Navbar /><main>
      <section className="container hero">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65 }}>
          <div className="eyebrow">Canlı • Etkileşimli • Ölçülebilir</div>
          <h1><span className="gradient-text">Sistem düşüncesini</span><br />harekete geçir.</h1>
          <p className="lead">Sınıfı canlı bir sistem laboratuvarına dönüştür. Öğrenciler sistemi kurar, geri bildirim zincirlerini çözer, kara kutuyu analiz eder, sistem türlerini eşleştirir ve ilişki türlerini oyunla keşfeder.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/teacher"><Presentation size={19} /> Öğretmen paneli <ArrowRight size={18} /></Link>
            <Link className="btn btn-secondary" href="/student"><GraduationCap size={19} /> Öğrenci girişi</Link>
          </div>
          <div className="trust-row">
            <span><CheckCircle2 size={15} color="var(--teal)" /> Gerçek zamanlı sınıf</span>
            <span><CheckCircle2 size={15} color="var(--teal)" /> Kurulumsuz katılım</span>
            <span><CheckCircle2 size={15} color="var(--teal)" /> Uygulamalı öğrenme akışı</span>
          </div>
        </motion.div>
        <motion.div className="hero-visual" role="img" aria-label="Birbirini etkileyen parçalardan oluşan canlı sistem animasyonu" initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .18, duration: .8 }}>
          <div className="orbit one"><i className="orbit-dot" /></div>
          <div className="orbit two"><i className="orbit-dot" /></div>
          <div className="visual-core glass">
            <motion.span className="visual-core-mark" aria-hidden="true" animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}><Workflow size={45} /></motion.span>
            <span className="eyebrow">Canlı sistem laboratuvarı</span>
            <p>Birbirine bağlı parçalar, tek bir öğrenme deneyimi.</p>
          </div>
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
