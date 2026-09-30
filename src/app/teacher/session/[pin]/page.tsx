"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Expand, LogOut, Power, Radio, Trophy, Users } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { Button } from "@/components/common/Button";
import { ModuleStartCountdown } from "@/components/common/ModuleStartCountdown";
import { QRModal } from "@/components/common/QRModal";
import { ModuleSelector, WeekSelector } from "@/components/teacher/ModuleSelector";
import { Leaderboard } from "@/components/teacher/Leaderboard";
import { getSessionByPin, updateSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useTeacherAuth } from "@/lib/useTeacherAuth";
import type { ModuleId, Session, Student, StudentProfile } from "@/types";

export default function TeacherSessionPage() {
  const { pin } = useParams<{ pin: string }>();
  const router = useRouter();
  const { status: authStatus, logout } = useTeacherAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [briefingModule, setBriefingModule] = useState<ModuleId | null>(null);
  const [joinUrl, setJoinUrl] = useState(`/student?pin=${pin}`);

  useEffect(() => {
    const timer = window.setTimeout(() => setJoinUrl(`${window.location.origin}/student?pin=${pin}`), 0);
    return () => window.clearTimeout(timer);
  }, [pin]);

  const load = useCallback(async () => {
    if (authStatus !== "authenticated") return;
    if (!supabase) { setError("Supabase yapılandırılmamış."); setLoading(false); return; }
    try {
      const found = await getSessionByPin(pin);
      if (!found) {
        sessionStorage.removeItem("system-lab:teacher-session");
        router.replace("/teacher");
        return;
      }
      sessionStorage.setItem("system-lab:teacher-session", JSON.stringify({ sessionId: found.id, pin: found.pin_code }));
      setSession(found);
      const [{ data: people, error: peopleError }, { data: overall, error: overallError }] = await Promise.all([
        supabase.from("students").select("*").eq("session_id", found.id).order("session_score", { ascending: false }),
        supabase.from("student_profiles").select("*").order("total_score", { ascending: false }),
      ]);
      if (peopleError) throw peopleError;
      if (overallError) throw overallError;
      setStudents((people || []) as Student[]);
      setProfiles((overall || []) as StudentProfile[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Oturum yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [authStatus, pin, router]);

  useEffect(() => {
    if (authStatus === "unauthenticated") { router.replace("/teacher"); return; }
    if (authStatus !== "authenticated") return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [authStatus, load, router]);

  const sessionId = session?.id;
  useEffect(() => {
    const client = supabase;
    if (!client || !sessionId) return;
    const channel = client.channel(`teacher:${sessionId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` }, (event) => setSession(event.new as Session))
      .on("postgres_changes", { event: "*", schema: "public", table: "students", filter: `session_id=eq.${sessionId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "student_profiles" }, () => void load())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [load, sessionId]);

  async function patch(values: Parameters<typeof updateSession>[1]) {
    if (!session) return false;
    setBusy(true);
    setError("");
    try {
      await updateSession(session.id, values);
      setSession({ ...session, ...values });
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Güncelleme başarısız.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function chooseWeek(selectedWeek: number) {
    if (selectedWeek === session?.selected_week) return;
    void patch({ selected_week: selectedWeek, current_module: 1, module_stage: 1, is_module_started: false, fault_injected: false });
  }

  async function startModule(currentModule: ModuleId) {
    if (session?.selected_week !== 1) return;
    const started = await patch({ current_module: currentModule, module_stage: 2, is_module_started: true, fault_injected: false });
    if (started) setBriefingModule(currentModule);
  }

  async function finishModule(currentModule: ModuleId) {
    if (!session || session.current_module !== currentModule || !session.is_module_started) return;
    setBusy(true);
    setError("");
    try {
      if (currentModule === 3 || currentModule === 5) {
        await updateSession(session.id, { module_stage: 4 });
        setSession((current) => current ? { ...current, module_stage: 4 } : current);
        await new Promise((resolve) => window.setTimeout(resolve, 2500));
      }
      await updateSession(session.id, { is_module_started: false, module_stage: 3 });
      setSession((current) => current ? { ...current, is_module_started: false, module_stage: 3 } : current);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Modül sonlandırılamadı.");
    } finally {
      setBusy(false);
    }
  }

  function leaveTeacherPanel() {
    logout();
    sessionStorage.removeItem("system-lab:teacher-session");
    router.push("/teacher");
  }

  async function closeSession() {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      if (session.is_module_started && (session.current_module === 3 || session.current_module === 5)) {
        await updateSession(session.id, { module_stage: 4 });
        setSession((current) => current ? { ...current, module_stage: 4 } : current);
        await new Promise((resolve) => window.setTimeout(resolve, 2500));
      }
      await updateSession(session.id, { is_active: false, is_module_started: false, module_stage: 3 });
      sessionStorage.removeItem("system-lab:teacher-session");
      router.push("/teacher");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Oturum kapatılamadı.");
    } finally {
      setBusy(false);
    }
  }

  if (authStatus === "checking" || loading) return <><Navbar /><main className="container page"><div className="empty">Canlı oturum yükleniyor…</div></main></>;
  if (authStatus === "unauthenticated") return <><Navbar /><main className="container page"><div className="empty">Öğretmen girişine yönlendiriliyorsunuz…</div></main></>;
  if (!session) return <><Navbar /><main className="container page"><div className="notice error">{error || "Oturum bulunamadı."}</div></main></>;

  return <main className="projection-page">
    <header className="projection-topbar teacher-topbar">
      <div className="projection-brand"><span><Radio size={23} /></span><div><strong>{session.title}</strong><small>Öğretmen Paneli</small></div></div>
      <div className="projection-session-facts">
        <span className="projection-student-count"><Users size={19} /><b>{students.length}</b><small>bağlı öğrenci</small></span>
        <Button size="small" variant="secondary" icon={<Power size={16} />} onClick={() => void closeSession()}>Oturumu Kapat</Button>
        <Button size="small" variant="secondary" icon={<LogOut size={16} />} onClick={leaveTeacherPanel}>Çıkış</Button>
      </div>
    </header>

    <div className="projection-content teacher-dashboard-content">
      {error && <div className="notice error">{error}</div>}
      <div className="teacher-dashboard-grid">
        <section className="panel teacher-module-manager">
          <div className="teacher-panel-heading"><span className="eyebrow">Ders Akışı</span><h1>Hafta ve Modül Yönetimi</h1></div>
          <WeekSelector activeWeek={session.selected_week} disabled={busy || session.is_module_started} onChange={chooseWeek} />
          <ModuleSelector
            activeWeek={session.selected_week}
            activeModule={session.current_module}
            moduleStage={session.module_stage}
            isModuleStarted={session.is_module_started}
            disabled={busy}
            onStart={(module) => void startModule(module)}
            onFinish={(module) => void finishModule(module)}
          />
        </section>

        <aside className="teacher-dashboard-side">
          <section className="card teacher-join-card">
            <div className="teacher-card-title"><h2>Derse Katıl</h2><Button size="small" variant="secondary" icon={<Expand size={16} />} onClick={() => setQrOpen(true)}>QR’ı Büyüt</Button></div>
            <button type="button" className="teacher-qr" onClick={() => setQrOpen(true)} aria-label="QR kodu büyüt"><QRCodeSVG value={joinUrl} size={230} level="H" marginSize={2} /></button>
            <button type="button" className="teacher-pin" onClick={() => navigator.clipboard.writeText(pin)} title="PIN kodunu kopyala"><span>PIN</span><strong>{pin}</strong><Copy size={20} /></button>
          </section>

          <section className="card teacher-leaderboard-card">
            <div className="teacher-card-title"><h2>Canlı Liderlik</h2><Trophy size={28} color="var(--amber)" /></div>
            <Leaderboard students={students} profiles={profiles} />
          </section>
        </aside>
      </div>
    </div>
    <QRModal open={qrOpen} onClose={() => setQrOpen(false)} url={joinUrl} pin={pin} />
    {briefingModule && <ModuleStartCountdown key={briefingModule} moduleId={briefingModule} onComplete={() => setBriefingModule(null)} />}
  </main>;
}
