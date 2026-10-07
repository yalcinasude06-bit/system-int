"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn, Presentation, Radio, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { Button } from "@/components/common/Button";
import { createTeacherSession, listTeacherSessions, patchTeacherSession, runTeacherModuleAction, type TeacherSessionSummary } from "@/lib/teacherApi";
import { useTeacherAuth } from "@/lib/useTeacherAuth";
import { useI18n } from "@/lib/i18n/I18nContext";

export default function TeacherPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const { status, username: signedInUsername, login, logout } = useTeacherAuth();
  const [title, setTitle] = useState("Sistem Analizi Dersi");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [sessions, setSessions] = useState<TeacherSessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState("");

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      setSessions(await listTeacherSessions());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Oturumlar yüklenemedi.");
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    const timer = window.setTimeout(() => void loadSessions(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSessions, status]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(username.trim(), password);
      setPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Giriş yapılamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await createTeacherSession(title);
      router.push(`/teacher/session/${session.pin_code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Oturum oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function finishSession(session: TeacherSessionSummary) {
    setLoading(true);
    setError("");
    try {
      if (session.is_module_started) await runTeacherModuleAction(session.id, "finish");
      await patchTeacherSession(session.id, { is_active: false, is_module_started: false, module_started_at: null, module_stage: 3 });
      await loadSessions();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Oturum bitirilemedi.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "checking") return <><Navbar /><main className="container page"><div className="empty">Öğretmen oturumu doğrulanıyor…</div></main></>;

  if (status === "unauthenticated") return <><Navbar /><main className="container page">
    <div className="form-card panel auth-card">
      <div className="module-header"><span className="module-number"><KeyRound /></span><div><div className="eyebrow">Yetkili erişim</div><h1 style={{ margin: "5px 0" }}>Öğretmen girişi</h1></div></div>
      <p className="muted">Canlı ders oturumlarını yalnızca öğretmen hesabıyla yönetin.</p>
      <form className="form-grid" onSubmit={handleLogin} autoComplete="off">
        <div className="field"><label htmlFor="teacher-username">Kullanıcı adı</label><input id="teacher-username" className="input" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} /></div>
        <div className="field"><label htmlFor="teacher-password">Şifre</label><input id="teacher-password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
        {error && <div className="notice error">{error}</div>}
        <Button type="submit" loading={loading} icon={<LogIn size={18} />}>Giriş yap</Button>
      </form>
    </div>
  </main></>;

  return <><Navbar teacherContext={{ username: signedInUsername, onLogout: logout }} /><main className="container page teacher-home-page">
    <div className="form-card panel">
      <div className="section-head"><div className="module-header"><span className="module-number"><Presentation /></span><div><div className="eyebrow">Öğretmen konsolu</div><h1 style={{ margin: "5px 0" }}>Canlı oturum oluştur</h1></div></div></div>
      <p className="muted">Öğrenciler altı haneli PIN veya QR kod ile saniyeler içinde katılır.</p>
      <form className="form-grid" onSubmit={handleCreate}>
        <div className="field"><label htmlFor="title">Ders başlığı</label><input id="title" className="input" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} /></div>
        {error && <div className="notice error">{error}</div>}
        <Button type="submit" loading={loading} icon={<Radio size={18} />}>Oturumu başlat</Button>
      </form>
      <div className="trust-row"><span><ShieldCheck size={15} /> Hesaba özel oturumlar</span><span><Radio size={15} /> Canlı sınıf verisi</span></div>
    </div>

    <section className="panel teacher-session-list">
      <div className="section-head"><div><div className="eyebrow">Oturumlarım</div><h2>Devam et veya oturumu bitir</h2></div><Button size="small" variant="secondary" loading={loadingSessions} onClick={() => void loadSessions()}>Yenile</Button></div>
      {loadingSessions ? <div className="empty">Oturumlar yükleniyor…</div> : sessions.length ? <div className="teacher-session-list-items">{sessions.map((session) => <article key={session.id} className="teacher-session-list-item">
        <div><strong data-i18n-skip>{session.title}</strong><span>PIN: <b data-i18n-skip>{session.pin_code}</b> · <span data-i18n-skip>{session.is_active ? (locale === "tr" ? "Açık" : "Open") : (locale === "tr" ? "Bitirildi" : "Finished")}</span> · {new Date(session.created_at).toLocaleString(locale === "tr" ? "tr-TR" : "en-GB")}</span></div>
        <div className="teacher-session-list-actions"><Button size="small" variant="secondary" onClick={() => router.push(`/teacher/session/${session.pin_code}`)}>Devam et</Button>{session.is_active && <Button size="small" variant="danger" disabled={loading} onClick={() => void finishSession(session)}>Oturumu bitir</Button>}</div>
      </article>)}</div> : <div className="empty">Henüz size ait bir ders oturumu yok.</div>}
    </section>
  </main></>;
}
