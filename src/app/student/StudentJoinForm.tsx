"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, LogIn } from "lucide-react";
import { Button } from "@/components/common/Button";
import { getSessionByPin, joinSession } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase";

const avatars = ["🎓", "🧠", "🧩", "🚀", "🔭", "⚙️", "🌱", "🛰️"];

export function StudentJoinForm() {
  const params = useSearchParams(); const router = useRouter();
  const [pin, setPin] = useState((params.get("pin") || "").replace(/\D/g, "").slice(0, 6));
  const [nickname, setNickname] = useState(""); const [avatar, setAvatar] = useState(avatars[0]);
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (pin.length !== 6 || nickname.trim().length < 2) { setError("6 haneli PIN ve en az 2 karakterlik rumuz girin."); return; }
    setLoading(true);
    try {
      const session = await getSessionByPin(pin);
      if (!session) throw new Error("Aktif oturum bulunamadı. PIN’i kontrol edin.");
      const student = await joinSession(session.id, nickname, avatar);
      localStorage.setItem(`system-lab:${pin}:student`, student.id);
      localStorage.setItem(`system-lab:${pin}:nickname`, student.nickname);
      router.push(`/student/play/${pin}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Derse katılınamadı."); }
    finally { setLoading(false); }
  }

  return <div className="form-card panel">
    <div className="module-header"><span className="module-number"><GraduationCap /></span><div><div className="eyebrow">Öğrenci girişi</div><h1 style={{ margin: "5px 0" }}>Laboratuvara katıl</h1></div></div>
    <form className="form-grid" onSubmit={handleJoin} style={{ marginTop: 24 }}>
      <div className="field"><label htmlFor="pin">Oturum PIN’i</label><input id="pin" className="input pin" inputMode="numeric" placeholder="000000" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} /></div>
      <div className="field"><label htmlFor="nickname">Rumuz</label><input id="nickname" className="input" placeholder="Örn. MeraklıMühendis" maxLength={50} value={nickname} onChange={(e) => setNickname(e.target.value)} /></div>
      <div className="field"><label>Avatarını seç</label><div className="card-tray">{avatars.map((item) => <button type="button" className={`drag-card ${avatar === item ? "selected" : ""}`} onClick={() => setAvatar(item)} key={item} aria-label={`${item} avatarı`}>{item}</button>)}</div></div>
      {!isSupabaseConfigured && <div className="notice">Canlı katılım dağıtım kurulumu tamamlandığında etkinleşecek.</div>}
      {error && <div className="notice error">{error}</div>}
      <Button type="submit" loading={loading} disabled={!isSupabaseConfigured} icon={<LogIn size={18} />}>Derse katıl</Button>
    </form>
  </div>;
}
