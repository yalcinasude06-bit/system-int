"use client";

import { useState } from "react";
import { Medal, Trophy } from "lucide-react";
import type { Student, StudentProfile } from "@/types";

export function Leaderboard({ students, profiles }: { students: Student[]; profiles: StudentProfile[] }) {
  const [view, setView] = useState<"session" | "overall">("session");
  const rows = view === "session"
    ? [...students].sort((a, b) => b.session_score - a.session_score).map((student) => ({ id: student.id, name: student.nickname, number: student.student_number, score: student.session_score, avatar: student.avatar }))
    : [...profiles].sort((a, b) => b.total_score - a.total_score).map((profile) => ({ id: profile.student_number, name: profile.full_name, number: profile.student_number, score: profile.total_score, avatar: "👤" }));

  return <div className="leaderboard">
    <div className="leaderboard-tabs" role="tablist" aria-label="Liderlik tablosu">
      <button type="button" role="tab" aria-selected={view === "session"} className={view === "session" ? "active" : ""} onClick={() => setView("session")}><Medal size={16} /> Oturum Sıralaması</button>
      <button type="button" role="tab" aria-selected={view === "overall"} className={view === "overall" ? "active" : ""} onClick={() => setView("overall")}><Trophy size={16} /> Genel Sıralama</button>
    </div>
    {rows.length ? <ol className="leaderboard-list">{rows.map((row, index) => <li key={row.id} className={index < 3 ? `rank-${index + 1}` : ""}><span className="rank">{index + 1}</span><b className="leader-avatar">{row.avatar}</b><span className="leader-name" data-i18n-skip><strong>{row.name}</strong><small>{row.number}</small></span><strong className="leader-score">{row.score} puan</strong></li>)}</ol> : <div className="empty">Bu sıralama için henüz puan bulunmuyor.</div>}
  </div>;
}
