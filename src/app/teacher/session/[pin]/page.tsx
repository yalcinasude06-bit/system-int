"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Award, BarChart3, CheckCircle2, Copy, Expand, LogOut, Power, Radio, Trophy, Users } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { Button } from "@/components/common/Button";
import { ModuleStartCountdown } from "@/components/common/ModuleStartCountdown";
import { QRModal } from "@/components/common/QRModal";
import { ModuleSelector, WeekSelector } from "@/components/teacher/ModuleSelector";
import { Leaderboard } from "@/components/teacher/Leaderboard";
import { getRemainingCountdown } from "@/lib/moduleCountdown";
import { cancelSessionModuleStart, finishSessionModule, getSessionByPin, startSessionModule, updateSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useTeacherAuth } from "@/lib/useTeacherAuth";
import type { ModuleId, Session, Student, StudentProfile, Submission } from "@/types";

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
  const [resultsViewOpen, setResultsViewOpen] = useState(false);
  const [briefingModule, setBriefingModule] = useState<ModuleId | null>(null);
  const [joinUrl, setJoinUrl] = useState(`/student?pin=${pin}`);
  const refreshTimerRef = useRef<number | null>(null);

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
      setBriefingModule(found.is_module_started && getRemainingCountdown(found.module_started_at) > 0 ? found.current_module : null);
      const [{ data: people, error: peopleError }, { data: overall, error: overallError }, { data: answers, error: answersError }] = await Promise.all([
        supabase.from("students").select("*").eq("session_id", found.id).order("session_score", { ascending: false }),
        supabase.from("student_profiles").select("*").order("total_score", { ascending: false }),
        supabase.from("submissions").select("*").eq("session_id", found.id).eq("is_submitted", true),
      ]);
      if (peopleError) throw peopleError;
      if (overallError) throw overallError;
      if (answersError) throw answersError;
      setStudents((people || []) as Student[]);
      setProfiles((overall || []) as StudentProfile[]);
      setSubmissions((answers || []) as Submission[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Oturum yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [authStatus, pin, router]);

  const scheduleLoad = useCallback(() => {
    if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      void load();
    }, 300);
  }, [load]);

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
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` }, (event) => {
        const nextSession = event.new as Session;
        setSession(nextSession);
        setBriefingModule(nextSession.is_module_started && getRemainingCountdown(nextSession.module_started_at) > 0 ? nextSession.current_module : null);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "students", filter: `session_id=eq.${sessionId}` }, (event) => {
        const changedId = (event.eventType === "DELETE" ? event.old.id : event.new.id) as string | undefined;
        if (!changedId) { scheduleLoad(); return; }
        if (event.eventType === "DELETE") {
          setStudents((current) => current.filter((student) => student.id !== changedId));
          return;
        }
        const changedStudent = event.new as Student;
        setStudents((current) => [...current.filter((student) => student.id !== changedStudent.id), changedStudent]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `session_id=eq.${sessionId}` }, (event) => {
        const changedId = (event.eventType === "DELETE" ? event.old.id : event.new.id) as string | undefined;
        if (!changedId) { scheduleLoad(); return; }
        if (event.eventType === "DELETE") {
          setSubmissions((current) => current.filter((submission) => submission.id !== changedId));
          return;
        }
        const changedSubmission = event.new as Submission;
        setSubmissions((current) => [...current.filter((submission) => submission.id !== changedSubmission.id), changedSubmission]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "student_profiles" }, (event) => {
        const changedNumber = (event.eventType === "DELETE" ? event.old.student_number : event.new.student_number) as string | undefined;
        if (!changedNumber) { scheduleLoad(); return; }
        if (event.eventType === "DELETE") {
          setProfiles((current) => current.filter((profile) => profile.student_number !== changedNumber));
          return;
        }
        const changedProfile = event.new as StudentProfile;
        setProfiles((current) => [...current.filter((profile) => profile.student_number !== changedProfile.student_number), changedProfile]);
      })
      .subscribe((channelStatus) => {
        if (channelStatus === "SUBSCRIBED") scheduleLoad();
        if (channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT") {
          setError("Canlı bağlantı kesildi. Liste otomatik olarak yeniden eşitleniyor.");
          scheduleLoad();
        }
      });
    return () => {
      if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
      void client.removeChannel(channel);
    };
  }, [scheduleLoad, sessionId]);

  async function patch(values: Parameters<typeof updateSession>[1]) {
    if (!session) return false;
    setBusy(true);
    setError("");
    try {
      await updateSession(session.id, values);
      setSession((current) => current ? { ...current, ...values } : current);
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
    setResultsViewOpen(false);
    void patch({ selected_week: selectedWeek, current_module: 1, module_stage: 1, is_module_started: false, module_started_at: null, fault_injected: false });
  }

  async function startModule(currentModule: ModuleId) {
    if (!session || session.selected_week !== 1) return;
    setBusy(true);
    setError("");
    setResultsViewOpen(false);
    try {
      const startedSession = await startSessionModule(session.id, currentModule);
      setSession(startedSession);
      setBriefingModule(currentModule);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Modül başlatılamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelModuleStart() {
    if (!session || !briefingModule) return;
    setBusy(true);
    setError("");
    try {
      const canceledSession = await cancelSessionModuleStart(session.id);
      setSession(canceledSession);
      setBriefingModule(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Başlatma iptal edilemedi.");
      setBriefingModule(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function finishModule(currentModule: ModuleId) {
    if (!session || session.current_module !== currentModule || !session.is_module_started) return;
    setBusy(true);
    setError("");
    try {
      await updateSession(session.id, { module_stage: 4 });
      setSession((current) => current ? { ...current, module_stage: 4 } : current);

      const deadline = Date.now() + 6500;
      while (Date.now() < deadline) {
        const { count } = await supabase!
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("session_id", session.id)
          .eq("week_id", session.selected_week)
          .eq("module_id", currentModule)
          .eq("is_submitted", true);
        if ((count ?? 0) >= students.length) break;
        await new Promise((resolve) => window.setTimeout(resolve, 450));
      }

      const finishedSession = await finishSessionModule(session.id);
      setSession(finishedSession);
      await load();
      setResultsViewOpen(true);
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
      if (session.is_module_started) {
        await updateSession(session.id, { module_stage: 4 });
        setSession((current) => current ? { ...current, module_stage: 4 } : current);
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
        await finishSessionModule(session.id);
      }
      await updateSession(session.id, { is_active: false, is_module_started: false, module_started_at: null, module_stage: 3 });
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

  const currentSubmissions = submissions.filter((submission) => submission.is_submitted && submission.week_id === session.selected_week && submission.module_id === session.current_module);
  const submittedCount = new Set(currentSubmissions
    .map((submission) => submission.student_id)).size;
  const completedCount = new Set(currentSubmissions
    .filter((submission) => submission.completion_status === "completed" && submission.payload?.completionReason !== "teacher-ended")
    .map((submission) => submission.student_id)).size;
  const resultRows = currentSubmissions.map((submission) => {
    const participant = students.find((student) => student.id === submission.student_id);
    return {
      id: submission.id,
      name: participant?.nickname || submission.student_number,
      number: submission.student_number,
      baseScore: submission.score,
      bonus: submission.speed_bonus ?? 0,
      total: submission.score + (submission.speed_bonus ?? 0),
      completed: submission.completion_status === "completed" && submission.payload?.completionReason !== "teacher-ended",
    };
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "tr"));
  const resultAverage = resultRows.length ? Math.round(resultRows.reduce((total, row) => total + row.total, 0) / resultRows.length) : 0;
  const highestResult = resultRows[0]?.total ?? 0;
  const resultsRevealed = !session.is_module_started && session.module_stage >= 3;

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
      {resultsViewOpen && resultsRevealed ? <section className="panel teacher-results-view">
        <div className="teacher-results-head">
          <div>
            <span className="eyebrow">Hafta {session.selected_week} · Modül {session.current_module}</span>
            <h1>Modül sonuçları</h1>
            <p>Sonuçlar öğrencilere açıldı. Taban puan ve doğrulukla ağırlıklandırılmış hız bonusu birlikte gösteriliyor.</p>
          </div>
          <span className="teacher-results-status"><CheckCircle2 size={20} /> Yayında</span>
        </div>

        <div className="teacher-result-metrics">
          <div><Users size={22} /><span>Tamamlayan</span><strong>{completedCount} / {students.length}</strong></div>
          <div><BarChart3 size={22} /><span>Ortalama puan</span><strong>{resultAverage}</strong></div>
          <div><Award size={22} /><span>En yüksek puan</span><strong>{highestResult}</strong></div>
        </div>

        <div className="teacher-result-list" aria-label="Modül sonuç sıralaması">
          <div className="teacher-result-list-head"><span>Sıra ve öğrenci</span><span>Puan dökümü</span></div>
          {resultRows.length ? <ol>{resultRows.map((row, index) => <li key={row.id}>
            <span className="teacher-result-rank">{index + 1}</span>
            <span className="teacher-result-student"><strong>{row.name}</strong><small>{row.number}</small><em className={row.completed ? "completed" : "incomplete"}>{row.completed ? "Tamamladı" : "Tamamlamadı"}</em></span>
            <span className="teacher-result-score"><small>{row.baseScore} + {row.bonus} hız</small><strong>{row.total}</strong></span>
          </li>)}</ol> : <div className="empty">Bu modül için gönderim bulunmuyor.</div>}
        </div>

        <Button variant="secondary" icon={<ArrowLeft size={18} />} onClick={() => setResultsViewOpen(false)}>Ders akışına dön</Button>
      </section> : <div className="teacher-dashboard-grid">
        <section className="panel teacher-module-manager">
          <div className="teacher-panel-heading"><span className="eyebrow">Ders Akışı</span><h1>Hafta ve Modül Yönetimi</h1></div>
          <WeekSelector activeWeek={session.selected_week} disabled={busy || session.is_module_started} onChange={chooseWeek} />
          <ModuleSelector
            activeWeek={session.selected_week}
            activeModule={session.current_module}
            moduleStage={session.module_stage}
            isModuleStarted={session.is_module_started}
            submittedCount={submittedCount}
            totalStudents={students.length}
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
      </div>}
    </div>
    <QRModal open={qrOpen} onClose={() => setQrOpen(false)} url={joinUrl} pin={pin} />
    {briefingModule && session.is_module_started && session.module_started_at && <ModuleStartCountdown key={`${briefingModule}:${session.module_started_at}`} moduleId={briefingModule} startedAt={session.module_started_at} canceling={busy} onCancel={() => void cancelModuleStart()} onComplete={() => setBriefingModule(null)} />}
  </main>;
}
