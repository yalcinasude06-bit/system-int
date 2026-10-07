"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Award, BarChart3, CheckCircle2, Copy, Expand, LogOut, Power, Radio, Trophy, Users } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { Button } from "@/components/common/Button";
import { ModuleStartCountdown } from "@/components/common/ModuleStartCountdown";
import { QRModal } from "@/components/common/QRModal";
import { ModuleSelector, WeekSelector } from "@/components/teacher/ModuleSelector";
import { Leaderboard } from "@/components/teacher/Leaderboard";
import { getRemainingCountdown } from "@/lib/moduleCountdown";
import { getTeacherSession, patchTeacherSession, runTeacherModuleAction } from "@/lib/teacherApi";
import { useTeacherAuth } from "@/lib/useTeacherAuth";
import type { ModuleId, Session, Student, StudentProfile, Submission } from "@/types";

export default function TeacherSessionPage() {
  const { pin } = useParams<{ pin: string }>();
  const router = useRouter();
  const { status: authStatus, username, logout } = useTeacherAuth();
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

  useEffect(() => {
    const timer = window.setTimeout(() => setJoinUrl(`${window.location.origin}/student?pin=${pin}`), 0);
    return () => window.clearTimeout(timer);
  }, [pin]);

  const load = useCallback(async () => {
    if (authStatus !== "authenticated") return;
    try {
      const data = await getTeacherSession(pin);
      setSession(data.session);
      setStudents(data.students);
      setProfiles(data.profiles);
      setSubmissions(data.submissions);
      setBriefingModule(data.session.is_module_started && getRemainingCountdown(data.session.module_started_at) > 0 ? data.session.current_module : null);
      setError("");
    } catch (caught) {
      const requestError = caught instanceof Error ? caught : new Error("Oturum yüklenemedi.");
      if ((requestError as Error & { status?: number }).status === 404) {
        router.replace("/teacher");
        return;
      }
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [authStatus, pin, router]);

  useEffect(() => {
    if (authStatus === "unauthenticated") { router.replace("/teacher"); return; }
    if (authStatus !== "authenticated") return;
    void load();
  }, [authStatus, load, router]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    const interval = window.setInterval(() => void load(), 2500);
    return () => window.clearInterval(interval);
  }, [authStatus, load]);

  async function patch(values: Record<string, unknown>) {
    if (!session) return false;
    setBusy(true); setError("");
    try {
      setSession(await patchTeacherSession(session.id, values));
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Güncelleme başarısız.");
      return false;
    } finally { setBusy(false); }
  }

  function chooseWeek(selectedWeek: number) {
    if (selectedWeek === session?.selected_week) return;
    setResultsViewOpen(false);
    void patch({ selected_week: selectedWeek, current_module: 1, module_stage: 1, is_module_started: false, module_started_at: null, fault_injected: false });
  }

  async function startModule(currentModule: ModuleId) {
    if (!session || (session.selected_week !== 1 && !(session.selected_week === 3 && currentModule <= 3))) return;
    setBusy(true); setError(""); setResultsViewOpen(false);
    try {
      setSession(await runTeacherModuleAction(session.id, "start", currentModule));
      setBriefingModule(currentModule);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Modül başlatılamadı."); }
    finally { setBusy(false); }
  }

  async function cancelModuleStart() {
    if (!session || !briefingModule) return;
    setBusy(true); setError("");
    try {
      setSession(await runTeacherModuleAction(session.id, "cancel"));
      setBriefingModule(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Başlatma iptal edilemedi.");
      setBriefingModule(null);
      await load();
    } finally { setBusy(false); }
  }

  async function finishModule(currentModule: ModuleId) {
    if (!session || session.current_module !== currentModule || !session.is_module_started) return;
    setBusy(true); setError("");
    try {
      setSession(await patchTeacherSession(session.id, { module_stage: 4 }));
      await new Promise((resolve) => window.setTimeout(resolve, 6500));
      setSession(await runTeacherModuleAction(session.id, "finish"));
      await load();
      setResultsViewOpen(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Modül sonlandırılamadı."); }
    finally { setBusy(false); }
  }

  function leaveTeacherPanel() {
    logout();
    router.push("/teacher");
  }

  async function closeSession() {
    if (!session) return;
    setBusy(true); setError("");
    try {
      if (session.is_module_started) {
        setSession(await patchTeacherSession(session.id, { module_stage: 4 }));
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
        await runTeacherModuleAction(session.id, "finish");
      }
      await patchTeacherSession(session.id, { is_active: false, is_module_started: false, module_started_at: null, module_stage: 3 });
      router.push("/teacher");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Oturum kapatılamadı."); }
    finally { setBusy(false); }
  }

  if (authStatus === "checking" || loading) return <><Navbar /><main className="container page"><div className="empty">Canlı oturum yükleniyor…</div></main></>;
  if (authStatus === "unauthenticated") return <><Navbar /><main className="container page"><div className="empty">Öğretmen girişine yönlendiriliyorsunuz…</div></main></>;
  if (!session) return <><Navbar teacherContext={{ username, onLogout: leaveTeacherPanel }} /><main className="container page"><div className="notice error">{error || "Bu oturuma erişim izniniz yok."}</div></main></>;

  const currentSubmissions = submissions.filter((submission) => submission.is_submitted && submission.week_id === session.selected_week && submission.module_id === session.current_module);
  const submittedCount = new Set(currentSubmissions.map((submission) => submission.student_id)).size;
  const completedCount = new Set(currentSubmissions.filter((submission) => submission.completion_status === "completed" && submission.payload?.completionReason !== "teacher-ended").map((submission) => submission.student_id)).size;
  const resultRows = currentSubmissions.map((submission) => {
    const participant = students.find((student) => student.id === submission.student_id);
    return { id: submission.id, name: participant?.nickname || submission.student_number, number: submission.student_number, baseScore: submission.score, bonus: submission.speed_bonus ?? 0, total: submission.score + (submission.speed_bonus ?? 0), completed: submission.completion_status === "completed" && submission.payload?.completionReason !== "teacher-ended" };
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "tr"));
  const resultAverage = resultRows.length ? Math.round(resultRows.reduce((total, row) => total + row.total, 0) / resultRows.length) : 0;
  const highestResult = resultRows[0]?.total ?? 0;
  const resultsRevealed = !session.is_module_started && session.module_stage >= 3;

  return <main className="projection-page">
    <header className="projection-topbar teacher-topbar">
      <div className="projection-brand"><span><Radio size={23} /></span><div><strong data-i18n-skip>{session.title}</strong><small>Öğretmen Paneli · <b data-i18n-skip>{username}</b></small></div></div>
      <div className="projection-session-facts"><span className="projection-student-count"><Users size={19} /><b>{students.length}</b><small>bağlı öğrenci</small></span><LanguageSwitcher /><Button size="small" variant="secondary" icon={<Power size={16} />} disabled={busy} onClick={() => void closeSession()}>Oturumu Kapat</Button><Button size="small" variant="secondary" icon={<LogOut size={16} />} onClick={leaveTeacherPanel}>Çıkış</Button></div>
    </header>

    <div className="projection-content teacher-dashboard-content">
      {error && <div className="notice error">{error}</div>}
      {resultsViewOpen && resultsRevealed ? <section className="panel teacher-results-view">
        <div className="teacher-results-head"><div><span className="eyebrow">Hafta {session.selected_week} · Modül {session.current_module}</span><h1>Modül sonuçları</h1><p>Sonuçlar öğrencilere açıldı. Taban puan ve doğrulukla ağırlıklandırılmış hız bonusu birlikte gösteriliyor.</p></div><span className="teacher-results-status"><CheckCircle2 size={20} /> Yayında</span></div>
        <div className="teacher-result-metrics"><div><Users size={22} /><span>Tamamlayan</span><strong>{completedCount} / {students.length}</strong></div><div><BarChart3 size={22} /><span>Ortalama puan</span><strong>{resultAverage}</strong></div><div><Award size={22} /><span>En yüksek puan</span><strong>{highestResult}</strong></div></div>
        <div className="teacher-result-list" aria-label="Modül sonuç sıralaması"><div className="teacher-result-list-head"><span>Sıra ve öğrenci</span><span>Puan dökümü</span></div>{resultRows.length ? <ol>{resultRows.map((row, index) => <li key={row.id}><span className="teacher-result-rank">{index + 1}</span><span className="teacher-result-student"><strong data-i18n-skip>{row.name}</strong><small data-i18n-skip>{row.number}</small><em className={row.completed ? "completed" : "incomplete"}>{row.completed ? "Tamamladı" : "Tamamlamadı"}</em></span><span className="teacher-result-score"><small>{row.baseScore} + {row.bonus} hız</small><strong>{row.total}</strong></span></li>)}</ol> : <div className="empty">Bu modül için gönderim bulunmuyor.</div>}</div>
        <Button variant="secondary" icon={<ArrowLeft size={18} />} onClick={() => setResultsViewOpen(false)}>Ders akışına dön</Button>
      </section> : <div className="teacher-dashboard-grid">
        <section className="panel teacher-module-manager"><div className="teacher-panel-heading"><span className="eyebrow">Ders Akışı</span><h1>Hafta ve Modül Yönetimi</h1></div><WeekSelector activeWeek={session.selected_week} disabled={busy || session.is_module_started} onChange={chooseWeek} /><ModuleSelector activeWeek={session.selected_week} activeModule={session.current_module} moduleStage={session.module_stage} isModuleStarted={session.is_module_started} submittedCount={submittedCount} totalStudents={students.length} disabled={busy} onStart={(module) => void startModule(module)} onFinish={(module) => void finishModule(module)} /></section>
        <aside className="teacher-dashboard-side"><section className="card teacher-join-card"><div className="teacher-card-title"><h2>Derse Katıl</h2><Button size="small" variant="secondary" icon={<Expand size={16} />} onClick={() => setQrOpen(true)}>QR’ı Büyüt</Button></div><button type="button" className="teacher-qr" onClick={() => setQrOpen(true)} aria-label="QR kodu büyüt"><QRCodeSVG value={joinUrl} size={230} level="H" marginSize={2} /></button><button type="button" className="teacher-pin" onClick={() => navigator.clipboard.writeText(pin)} title="PIN kodunu kopyala"><span>PIN</span><strong>{pin}</strong><Copy size={20} /></button></section><section className="card teacher-leaderboard-card"><div className="teacher-card-title"><h2>Canlı Liderlik</h2><Trophy size={28} color="var(--amber)" /></div><Leaderboard students={students} profiles={profiles} /></section></aside>
      </div>}
    </div>
    <QRModal open={qrOpen} onClose={() => setQrOpen(false)} url={joinUrl} pin={pin} />
    {briefingModule && session.is_module_started && session.module_started_at && <ModuleStartCountdown key={`${session.selected_week}:${briefingModule}:${session.module_started_at}`} weekId={session.selected_week} moduleId={briefingModule} startedAt={session.module_started_at} canceling={busy} onCancel={() => void cancelModuleStart()} onComplete={() => setBriefingModule(null)} />}
  </main>;
}
