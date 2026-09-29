"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Presentation, Radio, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { Button } from "@/components/common/Button";
import { createSession } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function TeacherPage() {
  const router = useRouter();
  const [title, setTitle] = useState("Sistem Analizi Dersi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("system-lab:teacher-session");
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { sessionId?: string; pin?: string };
      if (saved.sessionId && saved.pin) router.replace(`/teacher/session/${saved.pin}`);
      else localStorage.removeItem("system-lab:teacher-session");
    } catch {
      localStorage.removeItem("system-lab:teacher-session");
    }
  }, [router]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const session = await createSession(title);
      localStorage.setItem("system-lab:teacher-session", JSON.stringify({ sessionId: session.id, pin: session.pin_code }));
      router.push(`/teacher/session/${session.pin_code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Oturum oluşturulamadı.");
    } finally { setLoading(false); }
  }

  return <><Navbar /><main className="container page">
    <div className="form-card panel">
      <div className="module-header"><span className="module-number"><Presentation /></span><div><div className="eyebrow">Öğretmen konsolu</div><h1 style={{ margin: "5px 0" }}>Canlı oturum oluştur</h1></div></div>
      <p className="muted">Öğrenciler altı haneli PIN veya QR kod ile saniyeler içinde katılır.</p>
      <form className="form-grid" onSubmit={handleCreate}>
        <div className="field"><label htmlFor="title">Ders başlığı</label><input id="title" className="input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></div>
        {!isSupabaseConfigured && <div className="notice">Canlı oturum için Supabase ortam değişkenleri henüz eklenmedi. Dağıtım kurulumu tamamlandığında bu ekran otomatik etkinleşir.</div>}
        {error && <div className="notice error">{error}</div>}
        <Button type="submit" loading={loading} disabled={!isSupabaseConfigured} icon={<Radio size={18} />}>Oturumu başlat</Button>
      </form>
      <div className="trust-row"><span><ShieldCheck size={15} /> Realtime senkronizasyon</span><span><Radio size={15} /> Canlı sınıf verisi</span></div>
    </div>
  </main></>;
}
