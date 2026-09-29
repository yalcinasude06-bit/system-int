"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { LogOut, Radio, Trophy } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { Button } from "@/components/common/Button";
import { Module1SystemBuild } from "@/components/modules/Module1_SystemBuild";
import { Module2Relations } from "@/components/modules/Module2_Relations";
import { Module3Boundary } from "@/components/modules/Module3_Boundary";
import { Module4CompleteSystem } from "@/components/modules/Module4_CompleteSystem";
import { getSessionByPin, saveSubmission } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import type { ModuleId, ModuleSubmission, Session, Student } from "@/types";

export default function StudentPlayPage() {
  const { pin } = useParams<{ pin: string }>(); const router = useRouter();
  const [session, setSession] = useState<Session | null>(null); const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!supabase) { setError("Supabase yapılandırılmamış."); setLoading(false); return; }
    try {
      const found = await getSessionByPin(pin); if (!found) throw new Error("Oturum bulunamadı veya sona erdi."); setSession(found);
      const studentId = localStorage.getItem(`system-lab:${pin}:student`); if (!studentId) { router.replace(`/student?pin=${pin}`); return; }
      const { data, error: studentError } = await supabase.from("students").select("*").eq("id", studentId).eq("session_id", found.id).maybeSingle();
      if (studentError || !data) { localStorage.removeItem(`system-lab:${pin}:student`); router.replace(`/student?pin=${pin}`); return; }
      setStudent(data as Student);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Oturum yüklenemedi."); }
    finally { setLoading(false); }
  }, [pin, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const sessionId = session?.id;
  const studentId = student?.id;
  useEffect(() => {
    const client = supabase;
    if (!client || !sessionId || !studentId) return;
    const channel = client.channel(`student:${studentId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` }, (event) => setSession(event.new as Session))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "students", filter: `id=eq.${studentId}` }, (event) => setStudent(event.new as Student))
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [sessionId, studentId]);

  async function submit(moduleId: ModuleId, submission: ModuleSubmission) {
    if (!session || !student) return; setSaving(true); setError("");
    try {
      await saveSubmission({ sessionId: session.id, studentId: student.id, moduleId, stage: submission.stage || 1, payload: submission.payload, score: submission.score });
      setMessage(`Gönderim kaydedildi · ${submission.score} puan`);
      if (submission.score >= 80) confetti({ particleCount: 90, spread: 70, origin: { y: .7 }, colors: ["#2dd4bf", "#60a5fa", "#fbbf24"] });
      setTimeout(() => setMessage(""), 3500);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Gönderim kaydedilemedi."); }
    finally { setSaving(false); }
  }

  if (loading) return <><Navbar /><main className="container page"><div className="empty">Canlı sınıfa bağlanılıyor…</div></main></>;
  if (!session || !student) return <><Navbar /><main className="container page"><div className="notice error">{error || "Katılımcı kaydı bulunamadı."}</div></main></>;
  if (!session.is_active) return <><Navbar /><main className="container page"><div className="form-card panel" style={{ textAlign: "center" }}><Trophy size={54} color="var(--amber)" /><h1>Ders tamamlandı</h1><p className="lead">Toplam puanın: <strong className="score-pop">{student.score}</strong></p><Button onClick={() => router.push("/")}>Ana sayfaya dön</Button></div></main></>;

  const modules = {
    1: <Module1SystemBuild onSubmit={(submission) => submit(1, submission)} />,
    2: <Module2Relations onSubmit={(submission) => submit(2, submission)} />,
    3: <Module3Boundary onSubmit={(submission) => submit(3, submission)} />,
    4: <Module4CompleteSystem faultInjected={session.fault_injected} onSubmit={(submission) => submit(4, submission)} />,
  };

  return <><Navbar /><main className="container page stack">
    <section className="panel"><div className="section-head"><div><span className="badge live"><Radio size={13} /> {session.title}</span><h1 style={{ margin: "12px 0 4px" }}>Merhaba, {student.avatar} {student.nickname}</h1><p className="muted">Öğretmenin seçtiği modül ekranına otomatik geçilir.</p></div><div style={{ textAlign: "right" }}><span className="muted">Toplam puan</span><div className="pin" style={{ color: "var(--amber)" }}>{student.score}</div><Button size="small" variant="secondary" icon={<LogOut size={15} />} onClick={() => { localStorage.removeItem(`system-lab:${pin}:student`); router.push("/"); }}>Ayrıl</Button></div></div></section>
    {message && <div className="notice success">{message}{saving ? " · kaydediliyor" : ""}</div>}{error && <div className="notice error">{error}</div>}
    {modules[session.current_module]}
  </main></>;
}
