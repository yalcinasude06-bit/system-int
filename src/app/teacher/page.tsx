"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, KeyRound, LogIn, LogOut, Presentation, Radio, ShieldCheck, Trash2 } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { Button } from "@/components/common/Button";
import { createSession } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase";
import { teacherAuthStorageKey, useTeacherAuth } from "@/lib/useTeacherAuth";

export default function TeacherPage() {
  const router = useRouter();
  const { status, login, logout } = useTeacherAuth();
  const [title, setTitle] = useState("Sistem Analizi Dersi");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    const raw = sessionStorage.getItem("system-lab:teacher-session");
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { sessionId?: string; pin?: string };
      if (saved.sessionId && saved.pin) router.replace(`/teacher/session/${saved.pin}`);
      else sessionStorage.removeItem("system-lab:teacher-session");
    } catch {
      sessionStorage.removeItem("system-lab:teacher-session");
    }
  }, [router, status]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try { await login(username.trim(), password); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Giriş yapılamadı."); }
    finally { setLoading(false); }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const session = await createSession(title);
      sessionStorage.setItem("system-lab:teacher-session", JSON.stringify({ sessionId: session.id, pin: session.pin_code }));
      router.push(`/teacher/session/${session.pin_code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Oturum oluşturulamadı.");
    } finally { setLoading(false); }
  }

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    if (resetConfirmation !== "SIFIRLA") return;

    setResetting(true);
    setResetError("");
    setResetMessage("");
    try {
      const token = sessionStorage.getItem(teacherAuthStorageKey);
      if (!token) throw new Error("Öğretmen oturumu bulunamadı. Lütfen yeniden giriş yapın.");

      const response = await fetch("/api/teacher/reset", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmation: resetConfirmation }),
      });
      const data = await response.json() as {
        error?: string;
        deleted?: Record<string, number>;
      };

      if (response.status === 401) {
        logout();
        throw new Error(data.error || "Öğretmen oturumunun süresi doldu.");
      }
      if (!response.ok) throw new Error(data.error || "Veriler sıfırlanamadı.");

      const deletedTotal = Object.values(data.deleted || {}).reduce((sum, count) => sum + count, 0);
      sessionStorage.removeItem("system-lab:teacher-session");
      setResetOpen(false);
      setResetConfirmation("");
      setResetMessage(`Sıfırlama tamamlandı. ${deletedTotal} kayıt temizlendi; tüm listeler artık boş.`);
    } catch (caught) {
      setResetError(caught instanceof Error ? caught.message : "Veriler sıfırlanamadı.");
    } finally {
      setResetting(false);
    }
  }

  if (status === "checking") return <><Navbar /><main className="container page"><div className="empty">Öğretmen oturumu doğrulanıyor…</div></main></>;

  if (status === "unauthenticated") return <><Navbar /><main className="container page">
    <div className="form-card panel auth-card">
      <div className="module-header"><span className="module-number"><KeyRound /></span><div><div className="eyebrow">Yetkili erişimi</div><h1 style={{ margin: "5px 0" }}>Öğretmen girişi</h1></div></div>
      <p className="muted">Canlı ders oturumlarını yalnızca öğretmen hesabıyla yönetin.</p>
      <form className="form-grid" onSubmit={handleLogin} autoComplete="off">
        <div className="field"><label htmlFor="teacher-username">Kullanıcı adı</label><input id="teacher-username" className="input" autoComplete="off" required value={username} onChange={(event) => setUsername(event.target.value)} /></div>
        <div className="field"><label htmlFor="teacher-password">Şifre</label><input id="teacher-password" className="input" type="password" autoComplete="off" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
        {error && <div className="notice error">{error}</div>}
        <Button type="submit" loading={loading} icon={<LogIn size={18} />}>Giriş yap</Button>
      </form>
    </div>
  </main></>;

  return <><Navbar /><main className="container page">
    <div className="form-card panel">
      <div className="section-head"><div className="module-header"><span className="module-number"><Presentation /></span><div><div className="eyebrow">Öğretmen konsolu</div><h1 style={{ margin: "5px 0" }}>Canlı oturum oluştur</h1></div></div><div className="teacher-page-actions"><Button type="button" size="small" variant="danger" icon={<Trash2 size={15} />} onClick={() => { setResetOpen(true); setResetError(""); }}>Genel sıralamayı ve verileri sıfırla</Button><Button type="button" size="small" variant="secondary" icon={<LogOut size={15} />} onClick={logout}>Çıkış</Button></div></div>
      <p className="muted">Öğrenciler altı haneli PIN veya QR kod ile saniyeler içinde katılır.</p>
      <form className="form-grid" onSubmit={handleCreate}>
        <div className="field"><label htmlFor="title">Ders başlığı</label><input id="title" className="input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></div>
        {!isSupabaseConfigured && <div className="notice">Canlı oturum için Supabase ortam değişkenleri henüz eklenmedi. Dağıtım kurulumu tamamlandığında bu ekran otomatik etkinleşir.</div>}
        {resetMessage && <div className="notice success">{resetMessage}</div>}
        {error && <div className="notice error">{error}</div>}
        <Button type="submit" loading={loading} disabled={!isSupabaseConfigured} icon={<Radio size={18} />}>Oturumu başlat</Button>
      </form>
      <div className="trust-row"><span><ShieldCheck size={15} /> Realtime senkronizasyon</span><span><Radio size={15} /> Canlı sınıf verisi</span></div>
    </div>
    {resetOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !resetting) setResetOpen(false); }}>
      <div className="modal reset-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title">
        <div className="reset-modal-icon"><AlertTriangle size={28} /></div>
        <div>
          <div className="eyebrow">Geri alınamaz işlem</div>
          <h2 id="reset-title">Genel sıralamayı ve verileri sıfırla</h2>
          <p>Tüm öğrenci profillerini, geçmiş oturumları ve genel sıralama tablosunu sıfırlamak istediğinize emin misiniz?</p>
        </div>
        <form className="form-grid" onSubmit={handleReset}>
          <div className="field">
            <label htmlFor="reset-confirmation">Onaylamak için <strong>SIFIRLA</strong> yazın</label>
            <input id="reset-confirmation" className="input" autoComplete="off" autoFocus value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} />
          </div>
          {resetError && <div className="notice error">{resetError}</div>}
          <div className="reset-modal-actions">
            <Button type="button" variant="secondary" disabled={resetting} onClick={() => { setResetOpen(false); setResetConfirmation(""); setResetError(""); }}>Vazgeç</Button>
            <Button type="submit" variant="danger" loading={resetting} disabled={resetConfirmation !== "SIFIRLA"} icon={<Trash2 size={17} />}>Her şeyi sıfırla</Button>
          </div>
        </form>
      </div>
    </div>}
  </main></>;
}
