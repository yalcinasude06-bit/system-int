"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BarChart3, Copy, Power, QrCode, Radio, Users } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { Button } from "@/components/common/Button";
import { QRModal } from "@/components/common/QRModal";
import { ModuleSelector } from "@/components/teacher/ModuleSelector";
import { StudentListLive } from "@/components/teacher/StudentListLive";
import { FaultInjectionPanel } from "@/components/teacher/FaultInjectionPanel";
import { TeacherStats } from "@/components/modules/Module1_SystemBuild/TeacherStats";
import { TeacherHeatmap } from "@/components/modules/Module2_Relations/TeacherHeatmap";
import { getSessionByPin, updateSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import type { ModuleId, Session, Student, Submission } from "@/types";

export default function TeacherSessionPage() {
  const { pin } = useParams<{ pin: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qrOpen, setQrOpen] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) { setError("Supabase yapılandırılmamış."); setLoading(false); return; }
    try {
      const found = await getSessionByPin(pin);
      if (!found) throw new Error("Aktif oturum bulunamadı.");
      setSession(found);
      const [{ data: people }, { data: answers }] = await Promise.all([
        supabase.from("students").select("*").eq("session_id", found.id).order("score", { ascending: false }),
        supabase.from("submissions").select("*").eq("session_id", found.id),
      ]);
      setStudents((people || []) as Student[]); setSubmissions((answers || []) as Submission[]);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Oturum yüklenemedi."); }
    finally { setLoading(false); }
  }, [pin]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const sessionId = session?.id;
  useEffect(() => {
    const client = supabase;
    if (!client || !sessionId) return;
    const channel = client.channel(`teacher:${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` }, (event) => setSession(event.new as Session))
      .on("postgres_changes", { event: "*", schema: "public", table: "students", filter: `session_id=eq.${sessionId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `session_id=eq.${sessionId}` }, () => void load())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [load, sessionId]);

  const activeSubmissions = useMemo(() => submissions.filter((item) => item.module_id === session?.current_module), [session?.current_module, submissions]);

  async function patch(values: Parameters<typeof updateSession>[1]) {
    if (!session) return; setBusy(true); setError("");
    try { await updateSession(session.id, values); setSession({ ...session, ...values }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Güncelleme başarısız."); }
    finally { setBusy(false); }
  }

  if (loading) return <><Navbar /><main className="container page"><div className="empty">Canlı oturum yükleniyor…</div></main></>;
  if (!session) return <><Navbar /><main className="container page"><div className="notice error">{error || "Oturum bulunamadı."}</div></main></>;

  return <><Navbar /><main className="container page stack">
    <section className="panel">
      <div className="section-head">
        <div><span className="badge live">Canlı oturum</span><h1 style={{ margin: "12px 0 4px" }}>{session.title}</h1><p className="muted">Aktif modülü değiştirerek tüm öğrenci ekranlarını anında senkronize edin.</p></div>
        <div style={{ textAlign: "right" }}><span className="muted">Katılım PIN’i</span><div className="pin">{pin}</div><div className="button-row" style={{ justifyContent: "flex-end", marginTop: 8 }}><Button size="small" variant="secondary" icon={<Copy size={15} />} onClick={() => navigator.clipboard.writeText(pin)}>Kopyala</Button><Button size="small" variant="secondary" icon={<QrCode size={15} />} onClick={() => setQrOpen(true)}>QR</Button></div></div>
      </div>
      <ModuleSelector active={session.current_module} disabled={busy} onChange={(current_module: ModuleId) => void patch({ current_module, module_stage: 1, fault_injected: false })} />
      {error && <div className="notice error" style={{ marginTop: 15 }}>{error}</div>}
    </section>

    <div className="grid-3">
      <div className="metric"><span><Users size={14} /> Katılımcı</span><strong>{students.length}</strong></div>
      <div className="metric"><span><BarChart3 size={14} /> Gönderim</span><strong>{activeSubmissions.length}</strong></div>
      <div className="metric"><span><Radio size={14} /> Aktif modül</span><strong>{session.current_module}/4</strong></div>
    </div>

    <div className="dashboard-grid">
      <section className="panel">
        <div className="section-head"><div><h2>Canlı sınıf görünümü</h2><p>Katılan öğrenciler ve güncel puanları.</p></div></div>
        <StudentListLive students={students} />
      </section>
      <aside className="stack">
        {session.current_module === 4 && <FaultInjectionPanel active={session.fault_injected} loading={busy} onToggle={() => void patch({ fault_injected: !session.fault_injected })} />}
        <div className="card"><h3>Oturum kontrolü</h3><p className="muted">Dersi bitirdiğinizde öğrenci ekranlarını güvenle kapatın.</p><Button variant="danger" size="small" icon={<Power size={16} />} onClick={async () => { await patch({ is_active: false }); router.push("/teacher"); }}>Oturumu bitir</Button></div>
      </aside>
    </div>

    <section className="panel"><div className="section-head"><div><h2>Modül içgörüsü</h2><p>Gönderimler geldikçe canlı güncellenir.</p></div></div>{session.current_module === 1 ? <TeacherStats submissions={activeSubmissions} /> : session.current_module === 2 ? <TeacherHeatmap submissions={activeSubmissions} /> : <div className="grid-3"><div className="metric"><span>Tamamlayan</span><strong>{activeSubmissions.length}</strong></div><div className="metric"><span>Ortalama puan</span><strong>%{activeSubmissions.length ? Math.round(activeSubmissions.reduce((sum, item) => sum + item.score, 0) / activeSubmissions.length) : 0}</strong></div><div className="metric"><span>Durum</span><strong style={{ fontSize: 17 }}>{activeSubmissions.length ? "Veri akıyor" : "Bekleniyor"}</strong></div></div>}</section>
    <QRModal open={qrOpen} onClose={() => setQrOpen(false)} url={typeof window === "undefined" ? `/student?pin=${pin}` : `${window.location.origin}/student?pin=${pin}`} pin={pin} />
  </main></>;
}
