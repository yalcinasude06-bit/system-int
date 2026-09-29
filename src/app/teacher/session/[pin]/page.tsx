"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { BarChart3, Copy, Expand, LogOut, Play, Power, Radio, Square, Trophy, Users } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { Button } from "@/components/common/Button";
import { QRModal } from "@/components/common/QRModal";
import { ModuleSelector, WeekSelector, weekOneModules } from "@/components/teacher/ModuleSelector";
import { Leaderboard } from "@/components/teacher/Leaderboard";
import { StudentListLive } from "@/components/teacher/StudentListLive";
import { FaultInjectionPanel } from "@/components/teacher/FaultInjectionPanel";
import { TeacherStats } from "@/components/modules/Module1_SystemBuild/TeacherStats";
import { TeacherHeatmap } from "@/components/modules/Module2_Relations/TeacherHeatmap";
import { getSessionByPin, updateSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useTeacherAuth } from "@/lib/useTeacherAuth";
import type { ModuleId, Session, Student, StudentProfile, Submission } from "@/types";

const medals = ["🥇", "🥈", "🥉"];

export default function TeacherSessionPage() {
  const { pin } = useParams<{ pin: string }>();
  const router = useRouter();
  const { status: authStatus, logout } = useTeacherAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
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
      if (!found) throw new Error("Aktif oturum bulunamadı.");
      sessionStorage.setItem("system-lab:teacher-session", JSON.stringify({ sessionId: found.id, pin: found.pin_code }));
      setSession(found);
      const [{ data: people, error: peopleError }, { data: answers, error: answersError }, { data: overall, error: overallError }] = await Promise.all([
        supabase.from("students").select("*").eq("session_id", found.id).order("session_score", { ascending: false }),
        supabase.from("submissions").select("*").eq("session_id", found.id),
        supabase.from("student_profiles").select("*").order("total_score", { ascending: false }),
      ]);
      if (peopleError) throw peopleError;
      if (answersError) throw answersError;
      if (overallError) throw overallError;
      setStudents((people || []) as Student[]);
      setSubmissions((answers || []) as Submission[]);
      setProfiles((overall || []) as StudentProfile[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Oturum yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [authStatus, pin]);

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
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `session_id=eq.${sessionId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "student_profiles" }, () => void load())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [load, sessionId]);

  const activeSubmissions = useMemo(
    () => submissions.filter((item) => item.module_id === session?.current_module && item.week_id === session?.selected_week),
    [session?.current_module, session?.selected_week, submissions],
  );
  const activeModule = weekOneModules.find((item) => item.id === session?.current_module) || weekOneModules[0];
  const podium = useMemo(() => [...students].sort((a, b) => b.session_score - a.session_score || a.joined_at.localeCompare(b.joined_at)).slice(0, 3), [students]);

  async function patch(values: Parameters<typeof updateSession>[1]) {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      await updateSession(session.id, values);
      setSession({ ...session, ...values });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Güncelleme başarısız.");
    } finally {
      setBusy(false);
    }
  }

  function chooseWeek(selectedWeek: number) {
    void patch({ selected_week: selectedWeek, current_module: 1, module_stage: 1, is_module_started: false, fault_injected: false });
  }

  function chooseModule(currentModule: ModuleId) {
    void patch({ current_module: currentModule, module_stage: 1, is_module_started: false, fault_injected: false });
  }

  function leaveTeacherPanel() {
    logout();
    sessionStorage.removeItem("system-lab:teacher-session");
    router.push("/teacher");
  }

  async function closeSession() {
    await patch({ is_active: false, is_module_started: false, module_stage: 3 });
    sessionStorage.removeItem("system-lab:teacher-session");
    router.push("/teacher");
  }

  if (authStatus === "checking" || loading) return <><Navbar /><main className="container page"><div className="empty">Canlı oturum yükleniyor…</div></main></>;
  if (authStatus === "unauthenticated") return <><Navbar /><main className="container page"><div className="empty">Öğretmen girişine yönlendiriliyorsunuz…</div></main></>;
  if (!session) return <><Navbar /><main className="container page"><div className="notice error">{error || "Oturum bulunamadı."}</div></main></>;

  const moduleWaiting = !session.is_module_started && session.module_stage <= 1;
  const moduleRunning = session.is_module_started;
  const moduleFinished = !session.is_module_started && session.module_stage >= 3;
  const ActiveIcon = activeModule.Icon;

  return <main className="projection-page">
    <header className="projection-topbar">
      <div className="projection-brand"><span><Radio size={19} /></span><div><strong>{session.title}</strong><small>Öğretmen tahta görünümü</small></div></div>
      <div className="projection-week-picker"><WeekSelector activeWeek={session.selected_week} disabled={busy || moduleRunning} onChange={chooseWeek} /></div>
      <div className="projection-session-facts">
        <button type="button" className="projection-pin" onClick={() => navigator.clipboard.writeText(pin)} title="PIN kodunu kopyala"><small>PIN</small><strong>{pin}</strong><Copy size={14} /></button>
        <span className="projection-student-count"><Users size={17} /><b>{students.length}</b><small>bağlı öğrenci</small></span>
        <Button size="small" variant="secondary" icon={<LogOut size={15} />} onClick={leaveTeacherPanel}>Çıkış</Button>
      </div>
    </header>

    <div className="projection-content">
      {error && <div className="notice error">{error}</div>}

      <div className="projection-main-grid">
        <section className="panel projection-control-card">
          <ModuleSelector activeWeek={session.selected_week} activeModule={session.current_module} disabled={busy || moduleRunning} onChange={chooseModule} />
          {session.selected_week === 1 && <>
            <div className="module-preview">
              <span className="module-preview-icon"><ActiveIcon size={34} /></span>
              <div><span className="eyebrow">Seçili modül · {activeModule.subtitle}</span><h1>{activeModule.title}</h1><p>{activeModule.description}</p></div>
              <span className={`module-state ${moduleRunning ? "running" : moduleFinished ? "finished" : "waiting"}`}>{moduleRunning ? "Canlı" : moduleFinished ? "Sonuçlar" : "Hazır"}</span>
            </div>

            {moduleWaiting && <Button className="module-action start" loading={busy} icon={<Play size={25} fill="currentColor" />} onClick={() => void patch({ is_module_started: true, module_stage: 2 })}>Modülü Başlat</Button>}
            {moduleRunning && <Button className="module-action finish" loading={busy} variant="danger" icon={<Square size={23} fill="currentColor" />} onClick={() => void patch({ is_module_started: false, module_stage: 3 })}>Modülü Bitir &amp; Sonuçları Göster</Button>}
            {moduleFinished && <Button className="module-action results" disabled icon={<Trophy size={24} />}>Sonuçlar Öğrencilere Gösteriliyor</Button>}

            <div className="module-live-metrics">
              <span><Users size={17} /><strong>{students.length}</strong> katılımcı</span>
              <span><BarChart3 size={17} /><strong>{activeSubmissions.length}</strong> tamamlayan</span>
              <span><Radio size={17} /><strong>{moduleRunning ? "Canlı" : moduleFinished ? "Bitti" : "Bekliyor"}</strong></span>
            </div>
            {session.current_module === 4 && moduleRunning && <FaultInjectionPanel active={session.fault_injected} loading={busy} onToggle={() => void patch({ fault_injected: !session.fault_injected })} />}
          </>}
        </section>

        <aside className="projection-side stack">
          <section className="card projection-qr-card">
            <div className="section-head"><div><span className="eyebrow">Hızlı katılım</span><h2>Telefonunu okut</h2></div><Button size="small" variant="secondary" icon={<Expand size={15} />} onClick={() => setQrOpen(true)}>Büyüt</Button></div>
            <button type="button" className="inline-qr" onClick={() => setQrOpen(true)} aria-label="QR kodu büyüt"><QRCodeSVG value={joinUrl} size={176} level="H" marginSize={2} /></button>
            <div className="qr-pin-line"><span>veya PIN</span><strong>{pin}</strong></div>
          </section>
          <section className="card projection-leaderboard-card">
            <div className="section-head"><div><span className="eyebrow">Canlı rekabet</span><h2>Liderlik</h2></div><Trophy color="var(--amber)" /></div>
            <Leaderboard students={students} profiles={profiles} />
          </section>
        </aside>
      </div>

      <div className="projection-lower-grid">
        <section className="panel live-flow-panel">
          <div className="section-head"><div><span className="eyebrow">Canlı sınıf</span><h2>Öğrenci akışı</h2></div><span className="live-legend"><i className="solving" /> Çözüyor <i className="waiting" /> Bekliyor <i className="completed" /> Tamamladı</span></div>
          <StudentListLive students={students} submissions={submissions} week={session.selected_week} module={session.current_module} isStarted={moduleRunning} />
        </section>

        <section className="panel podium-panel">
          <div className="section-head"><div><span className="eyebrow">Bu oturum</span><h2>Podyum</h2></div></div>
          {podium.length ? <div className="podium">{podium.map((student, index) => <div className={`podium-place place-${index + 1}`} key={student.id}><span>{medals[index]}</span><b>{student.nickname}</b><strong>{student.session_score}</strong><small>puan</small></div>)}</div> : <div className="empty">İlk puanla birlikte podyum canlanacak.</div>}
        </section>
      </div>

      {session.selected_week === 1 && <section className="panel projection-insight-panel">
        <div className="section-head"><div><span className="eyebrow">Canlı içgörü</span><h2>Modül sonuçları</h2></div></div>
        {session.current_module === 1 ? <TeacherStats submissions={activeSubmissions} /> : session.current_module === 2 ? <TeacherHeatmap submissions={activeSubmissions} /> : <div className="grid-3"><div className="metric"><span>Tamamlayan</span><strong>{activeSubmissions.length}</strong></div><div className="metric"><span>Ortalama puan</span><strong>%{activeSubmissions.length ? Math.round(activeSubmissions.reduce((sum, item) => sum + item.score, 0) / activeSubmissions.length) : 0}</strong></div><div className="metric"><span>Durum</span><strong style={{ fontSize: 17 }}>{moduleRunning ? "Veri akıyor" : moduleFinished ? "Sonuçlar hazır" : "Başlatılmayı bekliyor"}</strong></div></div>}
      </section>}

      <footer className="projection-footer"><span>Oturum açık · Öğrenciler PIN ile katılabilir</span><Button variant="danger" size="small" icon={<Power size={16} />} onClick={() => void closeSession()}>Oturumu tamamen kapat</Button></footer>
    </div>
    <QRModal open={qrOpen} onClose={() => setQrOpen(false)} url={joinUrl} pin={pin} />
  </main>;
}
