"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { Clock3, Medal, Radio, Sparkles, Trophy } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { Button } from "@/components/common/Button";
import { Module1SystemBuild } from "@/components/modules/Module1_SystemBuild";
import { Module2Relations } from "@/components/modules/Module2_Relations";
import { Module3Boundary } from "@/components/modules/Module3_Boundary";
import { Module4CompleteSystem } from "@/components/modules/Module4_CompleteSystem";
import { getSessionByPin, saveSubmission } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import type { ModuleId, ModuleSubmission, Session, Student, StudentProfile, Submission } from "@/types";

const medals = ["🥇", "🥈", "🥉"];

export default function StudentPlayPage() {
  const { pin } = useParams<{ pin: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [classmates, setClassmates] = useState<Student[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState<string | null>(null);
  const [readyModuleKey, setReadyModuleKey] = useState("");

  const load = useCallback(async () => {
    if (!supabase) { setError("Supabase yapılandırılmamış."); setLoading(false); return; }
    try {
      const found = await getSessionByPin(pin);
      if (!found) throw new Error("Oturum bulunamadı veya sona erdi.");
      setSession(found);
      const studentId = localStorage.getItem(`system-lab:${pin}:student`);
      if (!studentId) { router.replace(`/student?pin=${pin}`); return; }
      const { data, error: studentError } = await supabase.from("students").select("*").eq("id", studentId).eq("session_id", found.id).maybeSingle();
      if (studentError || !data) {
        localStorage.removeItem(`system-lab:${pin}:student`);
        router.replace(`/student?pin=${pin}`);
        return;
      }
      const loadedStudent = data as Student;
      const [{ data: answers, error: answersError }, { data: loadedProfile, error: profileError }, { data: roster, error: rosterError }] = await Promise.all([
        supabase.from("submissions").select("*").eq("session_id", found.id).eq("student_id", loadedStudent.id),
        supabase.from("student_profiles").select("*").eq("student_number", loadedStudent.student_number).maybeSingle(),
        supabase.from("students").select("*").eq("session_id", found.id).order("session_score", { ascending: false }),
      ]);
      if (answersError) throw answersError;
      if (profileError) throw profileError;
      if (rosterError) throw rosterError;
      setStudent(loadedStudent);
      setSubmissions((answers || []) as Submission[]);
      setProfile(loadedProfile as StudentProfile | null);
      setClassmates((roster || []) as Student[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Oturum yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [pin, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const activeSubmission = useMemo(
    () => submissions.find((item) => item.week_id === session?.selected_week && item.module_id === session?.current_module) || null,
    [session?.current_module, session?.selected_week, submissions],
  );
  const currentWeek = session?.selected_week;
  const currentModule = session?.current_module;
  const isModuleStarted = session?.is_module_started;
  const activeSubmissionId = activeSubmission?.id;

  const sessionId = session?.id;
  const studentId = student?.id;
  const studentNumber = student?.student_number;
  useEffect(() => {
    const client = supabase;
    if (!client || !sessionId || !studentId || !studentNumber) return;
    const channel = client.channel(`student:${studentId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` }, (event) => setSession(event.new as Session))
      .on("postgres_changes", { event: "*", schema: "public", table: "students", filter: `session_id=eq.${sessionId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `session_id=eq.${sessionId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "student_profiles", filter: `student_number=eq.${studentNumber}` }, (event) => setProfile(event.new as StudentProfile))
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [load, sessionId, studentId, studentNumber]);

  useEffect(() => {
    if (!currentWeek || !currentModule) return;
    const moduleKey = `${currentWeek}:${currentModule}`;
    if (!isModuleStarted || activeSubmissionId) {
      const timer = window.setTimeout(() => {
        setCountdown(null);
        if (!isModuleStarted) setReadyModuleKey("");
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (readyModuleKey === moduleKey) return;

    const timers = [
      window.setTimeout(() => setCountdown("3"), 0),
      window.setTimeout(() => setCountdown("2"), 900),
      window.setTimeout(() => setCountdown("1"), 1800),
      window.setTimeout(() => setCountdown("Başla!"), 2700),
      window.setTimeout(() => { setCountdown(null); setReadyModuleKey(moduleKey); }, 3400),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [activeSubmissionId, currentModule, currentWeek, isModuleStarted, readyModuleKey]);

  async function submit(moduleId: ModuleId, submission: ModuleSubmission) {
    if (!session || !student || !session.is_module_started) return false;
    setSaving(true);
    setError("");
    try {
      const saved = await saveSubmission({ sessionId: session.id, studentId: student.id, studentNumber: student.student_number, weekId: session.selected_week, moduleId, stage: submission.stage || 1, payload: submission.payload, score: submission.score });
      setSubmissions((current) => [...current.filter((item) => item.id !== saved.submission.id), saved.submission]);
      setMessage(saved.wasNew ? `Gönderim kilitlendi · ${submission.score} puan` : "Bu modül için yanıt hakkını daha önce kullandın.");
      if (saved.wasNew) {
        setStudent((current) => current ? { ...current, session_score: current.session_score + submission.score, score: current.session_score + submission.score } : current);
        setClassmates((current) => current.map((item) => item.id === student.id ? { ...item, session_score: item.session_score + submission.score, score: item.session_score + submission.score } : item));
        setProfile((current) => current ? { ...current, total_score: current.total_score + submission.score } : current);
        confetti({ particleCount: 110, spread: 78, origin: { y: .72 }, colors: ["#10b981", "#6366f1", "#f59e0b", "#f472b6"] });
      }
      window.setTimeout(() => setMessage(""), 3500);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gönderim kaydedilemedi.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <><Navbar /><main className="container page"><div className="empty">Canlı sınıfa bağlanılıyor…</div></main></>;
  if (!session || !student) return <><Navbar /><main className="container page"><div className="notice error">{error || "Katılımcı kaydı bulunamadı."}</div></main></>;

  const ranking = [...classmates].sort((a, b) => b.session_score - a.session_score || a.joined_at.localeCompare(b.joined_at));
  const ownRank = ranking.findIndex((item) => item.id === student.id) + 1;
  const scoreEarned = activeSubmission?.score ?? 0;
  const showResults = Boolean(activeSubmission) || (!session.is_module_started && session.module_stage >= 3);

  const studentNav = <Navbar studentContext={{ sessionTitle: session.title, week: session.selected_week, studentName: student.nickname, studentNumber: student.student_number, score: profile?.total_score ?? student.score, onLeave: () => { localStorage.removeItem(`system-lab:${pin}:student`); router.push("/"); } }} />;

  if (!session.is_active) return <>{studentNav}<main className="container page"><div className="student-result-card panel"><Trophy size={58} color="var(--amber)" /><span className="eyebrow">Oturum tamamlandı</span><h1>Harika iş çıkardın!</h1><p className="lead">Genel toplam puanın <strong className="score-pop">{profile?.total_score ?? student.score}</strong></p><Button onClick={() => router.push("/")}>Ana sayfaya dön</Button></div></main></>;

  if (session.selected_week !== 1) return <>{studentNav}<main className="container page"><div className="student-waiting-card panel"><span className="waiting-illustration">🚧</span><span className="eyebrow">Hafta {session.selected_week}</span><h1>Yeni içerikler hazırlanıyor</h1><p>Bu haftanın modülleri ve interaktif içerikleri yakında eklenecektir.</p><div className="waiting-pulse"><i /> Öğretmenin yönlendirmesini bekleyin</div></div></main></>;

  if (showResults) return <>{studentNav}<main className="container page student-result-page">
    <section className="student-result-card panel">
      <div className="result-spark"><Sparkles size={30} /></div>
      <span className="result-trophy">🏆</span>
      <span className="eyebrow">Modül {session.current_module} tamamlandı</span>
      <h1>Tebrikler! <strong>+{scoreEarned} Puan</strong> Aldın!</h1>
      <p>Yanıtın kilitlendi. Canlı sıralama puan değiştikçe otomatik güncellenir.</p>
      {message && <div className="notice success">{message}{saving ? " · kaydediliyor" : ""}</div>}
      {error && <div className="notice error">{error}</div>}
      <div className="student-mini-leaderboard">
        <div className="mini-leaderboard-title"><Medal size={19} /><strong>Canlı liderlik</strong></div>
        <ol>{ranking.slice(0, 3).map((item, index) => <li key={item.id} className={item.id === student.id ? "is-me" : ""}><span>{medals[index]}</span><b>{item.nickname}</b><strong>{item.session_score} puan</strong></li>)}</ol>
        <div className="own-rank"><span>Senin sıran</span><strong>{ownRank > 0 ? `${ownRank}.` : "—"}</strong><small>{student.session_score} puan</small></div>
      </div>
      <div className="next-module-wait"><Radio size={18} /><span>Öğretmen bir sonraki modülü başlatana kadar beklemede kalın…</span></div>
    </section>
  </main></>;

  if (!session.is_module_started) return <>{studentNav}<main className="container page"><section className="student-waiting-card panel"><span className="waiting-illustration">⏳</span><span className="eyebrow">Hafta {session.selected_week} · Modül {session.current_module}</span><h1>Öğretmen modülü başlatmak üzere…</h1><p>Lütfen bekleyin! Etkinlik başladığında ekranınız otomatik olarak açılacak.</p><div className="waiting-pulse"><i /> Canlı bağlantı açık</div></section></main></>;

  if (countdown !== null || readyModuleKey !== `${session.selected_week}:${session.current_module}`) return <>{studentNav}<main className="countdown-screen"><div className="countdown-orbit"><span>{countdown || "3"}</span></div><div><Clock3 size={21} /><strong>Hazır ol!</strong></div></main></>;

  const modules = {
    1: <Module1SystemBuild existingSubmission={activeSubmission} onSubmit={(submission) => submit(1, submission)} />,
    2: <Module2Relations onSubmit={(submission) => submit(2, submission)} />,
    3: <Module3Boundary onSubmit={(submission) => submit(3, submission)} />,
    4: <Module4CompleteSystem faultInjected={session.fault_injected} onSubmit={(submission) => submit(4, submission)} />,
  };

  return <>{studentNav}<main className="container student-module-page stack">
    {message && <div className="notice success">{message}{saving ? " · kaydediliyor" : ""}</div>}
    {error && <div className="notice error">{error}</div>}
    {modules[session.current_module]}
  </main></>;
}
