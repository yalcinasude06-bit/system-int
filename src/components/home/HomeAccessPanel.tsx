"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, KeyRound, Rocket } from "lucide-react";
import { Button } from "@/components/common/Button";
import { getSessionByPin, joinSession } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useTeacherAuth } from "@/lib/useTeacherAuth";

type AccessRole = "student" | "teacher";

export function HomeAccessPanel() {
  const router = useRouter();
  const { status, login } = useTeacherAuth();
  const [role, setRole] = useState<AccessRole>("student");
  const [pin, setPin] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStudentNumber(localStorage.getItem("system-lab:student-number") || "");
      setFullName(localStorage.getItem("system-lab:student-name") || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function selectRole(nextRole: AccessRole) {
    setRole(nextRole);
    setError("");
  }

  async function joinClass(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (pin.length !== 6 || studentNumber.trim().length < 2 || fullName.trim().length < 2) {
      setError("PIN kodu, okul numarası ve ad soyad zorunludur.");
      return;
    }
    setLoading(true);
    try {
      const session = await getSessionByPin(pin);
      if (!session) throw new Error("Aktif oturum bulunamadı. PIN’i kontrol edin.");
      const student = await joinSession(session.id, studentNumber, fullName, "🎓");
      localStorage.setItem(`system-lab:${pin}:student`, student.id);
      localStorage.setItem(`system-lab:${pin}:nickname`, student.nickname);
      localStorage.setItem(`system-lab:${pin}:student-number`, student.student_number);
      localStorage.setItem("system-lab:student-number", student.student_number);
      localStorage.setItem("system-lab:student-name", student.nickname);
      router.push(`/student/play/${pin}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Derse katılınamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function openTeacherPanel(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (status !== "authenticated") await login("admin", password);
      router.push("/teacher");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Yönetim paneline giriş yapılamadı.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="home-access-card">
    <div className="home-role-tabs" role="tablist" aria-label="Giriş rolü">
      <button type="button" role="tab" aria-selected={role === "student"} className={role === "student" ? "active" : ""} onClick={() => selectRole("student")}><GraduationCap size={17} /> Öğrenci Girişi</button>
      <button type="button" role="tab" aria-selected={role === "teacher"} className={role === "teacher" ? "active" : ""} onClick={() => selectRole("teacher")}><KeyRound size={17} /> Öğretmen Paneli</button>
    </div>

    {role === "student" ? <form className="home-access-form" onSubmit={joinClass}>
      <div className="field"><label htmlFor="home-pin">PIN Kodu</label><input id="home-pin" className="input home-pin-input" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} /></div>
      <div className="field"><label htmlFor="home-student-number">Okul Numarası</label><input id="home-student-number" className="input" inputMode="numeric" autoComplete="username" placeholder="Örn. 202612345" value={studentNumber} onChange={(event) => setStudentNumber(event.target.value.replace(/\s/g, ""))} /></div>
      <div className="field home-full-field"><label htmlFor="home-full-name">Ad Soyad</label><input id="home-full-name" className="input" autoComplete="name" placeholder="Örn. Sude Yalçın" maxLength={50} value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
      {!isSupabaseConfigured && <div className="notice home-full-field">Canlı katılım bağlantısı henüz yapılandırılmadı.</div>}
      {error && <div className="notice error home-full-field" role="alert">{error}</div>}
      <Button className="home-access-submit home-full-field" type="submit" loading={loading} disabled={!isSupabaseConfigured} icon={<Rocket size={18} />}>Derse Katıl</Button>
    </form> : <form className="home-access-form teacher" onSubmit={openTeacherPanel}>
      <div className="field home-full-field"><label htmlFor="home-teacher-password">Şifre</label><input id="home-teacher-password" className="input" type="password" autoComplete="current-password" placeholder="sistem2026" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
      {error && <div className="notice error home-full-field" role="alert">{error}</div>}
      <Button className="home-access-submit home-full-field" type="submit" loading={loading || status === "checking"} icon={<KeyRound size={18} />}>Yönetim Paneline Giriş</Button>
    </form>}
  </div>;
}
