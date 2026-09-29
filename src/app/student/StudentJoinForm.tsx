"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, LogIn } from "lucide-react";
import { Button } from "@/components/common/Button";
import { getSessionByPin, joinSession } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase";

const avatars = ["🎓", "🧠", "🧩", "🚀", "🔭", "⚙️", "🌱", "🛰️"];

export function StudentJoinForm() {
  const params = useSearchParams(); const router = useRouter();
  const [pin, setPin] = useState((params.get("pin") || "").replace(/\D/g, "").slice(0, 6));
  const [studentNumber, setStudentNumber] = useState("");
  const [fullName, setFullName] = useState(""); const [avatar, setAvatar] = useState(avatars[0]);
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStudentNumber(localStorage.getItem("system-lab:student-number") || "");
      setFullName(localStorage.getItem("system-lab:student-name") || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (pin.length !== 6 || studentNumber.trim().length < 2 || fullName.trim().length < 2) { setError("PIN kodu, okul numarası ve ad soyad zorunludur."); return; }
    setLoading(true);
    try {
      const session = await getSessionByPin(pin);
      if (!session) throw new Error("Aktif oturum bulunamadı. PIN’i kontrol edin.");
      const student = await joinSession(session.id, studentNumber, fullName, avatar);
      localStorage.setItem(`system-lab:${pin}:student`, student.id);
      localStorage.setItem(`system-lab:${pin}:nickname`, student.nickname);
      localStorage.setItem(`system-lab:${pin}:student-number`, student.student_number);
      localStorage.setItem("system-lab:student-number", student.student_number);
      localStorage.setItem("system-lab:student-name", student.nickname);
      router.push(`/student/play/${pin}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Derse katılınamadı."); }
    finally { setLoading(false); }
  }

  return <div className="form-card panel">
    <div className="module-header"><span className="module-number"><GraduationCap /></span><div><div className="eyebrow">Öğrenci girişi</div><h1 style={{ margin: "5px 0" }}>Laboratuvara katıl</h1></div></div>
    <form className="form-grid" onSubmit={handleJoin} style={{ marginTop: 24 }}>
      <div className="field"><label htmlFor="pin">Oturum PIN’i</label><input id="pin" className="input pin" inputMode="numeric" placeholder="000000" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} /></div>
      <div className="field"><label htmlFor="student-number">Okul Numarası</label><input id="student-number" className="input" inputMode="numeric" autoComplete="username" placeholder="Örn. 202612345" maxLength={30} required value={studentNumber} onChange={(e) => setStudentNumber(e.target.value.replace(/\s/g, ""))} /></div>
      <div className="field"><label htmlFor="full-name">Ad Soyad</label><input id="full-name" className="input" autoComplete="name" placeholder="Örn. Sude Yalçın" maxLength={50} required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
      <div className="field"><label>Avatarını seç</label><div className="card-tray">{avatars.map((item) => <button type="button" className={`drag-card ${avatar === item ? "selected" : ""}`} onClick={() => setAvatar(item)} key={item} aria-label={`${item} avatarı`}>{item}</button>)}</div></div>
      {!isSupabaseConfigured && <div className="notice">Canlı katılım dağıtım kurulumu tamamlandığında etkinleşecek.</div>}
      {error && <div className="notice error">{error}</div>}
      <Button type="submit" loading={loading} disabled={!isSupabaseConfigured} icon={<LogIn size={18} />}>Derse katıl</Button>
    </form>
  </div>;
}
