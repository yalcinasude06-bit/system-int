"use client";

import Link from "next/link";
import { Atom, GraduationCap, LogOut, Presentation, Radio, Trophy, UserRound } from "lucide-react";

type StudentContext = {
  sessionTitle: string;
  week: number;
  studentName: string;
  studentNumber: string;
  score: number;
  onLeave: () => void;
};

export function Navbar({ studentContext }: { studentContext?: StudentContext }) {
  return (
    <header className="navbar">
      <div className="container nav-inner">
        <div className="nav-left"><Link href="/" className="brand" aria-label="Ana sayfa"><span className="brand-mark"><Atom size={22} /></span><span>Sistem Laboratuvarı</span></Link>{studentContext && <span className="student-live-badge"><Radio size={13} /> {studentContext.sessionTitle} · Hafta {studentContext.week}</span>}</div>
        {studentContext ? <nav className="student-nav-actions" aria-label="Öğrenci bilgileri"><span className="student-nav-badge"><UserRound size={15} /> <b>{studentContext.studentName}</b> <small>({studentContext.studentNumber})</small></span><span className="student-score-badge"><Trophy size={15} /> {studentContext.score} Puan</span><button type="button" className="student-leave-button" onClick={studentContext.onLeave}><LogOut size={16} /> Ayrıl</button></nav> : <nav className="nav-actions" aria-label="Ana menü"><Link href="/student" className="btn btn-secondary btn-small"><GraduationCap size={16} /> Öğrenci</Link><Link href="/teacher" className="btn btn-primary btn-small desktop-only"><Presentation size={16} /> Öğretmen</Link></nav>}
      </div>
    </header>
  );
}
