"use client";

import Link from "next/link";
import { Atom, GraduationCap, LogOut, Presentation, Radio, Trophy, UserRound } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";

type StudentContext = {
  sessionTitle: string;
  week: number;
  studentName: string;
  studentNumber: string;
  score: number;
  onLeave: () => void;
};

type TeacherContext = {
  username: string;
  onLogout: () => void;
};

export function Navbar({ studentContext, teacherContext, compactStudentGame = false }: { studentContext?: StudentContext; teacherContext?: TeacherContext; compactStudentGame?: boolean }) {
  return (
    <header className={`navbar ${compactStudentGame && studentContext ? "student-game-navbar" : ""}`}>
      <div className="container nav-inner">
        <div className="nav-left"><Link href="/" className="brand" aria-label="Ana sayfa"><span className="brand-mark"><Atom size={22} /></span><span>Sistem Laboratuvarı</span></Link>{studentContext && <span className="student-live-badge"><Radio size={13} /> <span data-i18n-skip>{studentContext.sessionTitle}</span> · Hafta {studentContext.week}</span>}</div>
        {studentContext ? <nav className="student-nav-actions" aria-label="Öğrenci bilgileri"><span className="student-nav-badge"><UserRound size={15} /> <b data-i18n-skip>{studentContext.studentName}</b> <small data-i18n-skip>({studentContext.studentNumber})</small></span><span key={studentContext.score} className="student-score-badge score-updated"><Trophy size={15} /> <b>{studentContext.score}</b><span className="student-score-label">Puan</span></span><LanguageSwitcher /><button type="button" className="student-leave-button" aria-label="Ayrıl" onClick={studentContext.onLeave}><LogOut size={16} /><span className="student-leave-label">Ayrıl</span></button></nav> : teacherContext ? <nav className="student-nav-actions" aria-label="Öğretmen bilgileri"><span className="student-nav-badge"><UserRound size={15} /> <b data-i18n-skip>{teacherContext.username}</b></span><LanguageSwitcher /><button type="button" className="student-leave-button" onClick={teacherContext.onLogout}><LogOut size={16} /> Çıkış</button></nav> : <nav className="nav-actions" aria-label="Ana menü"><LanguageSwitcher /><Link href="/student" className="btn btn-secondary btn-small"><GraduationCap size={16} /> Öğrenci</Link><Link href="/teacher" className="btn btn-primary btn-small desktop-only"><Presentation size={16} /> Öğretmen</Link></nav>}
      </div>
    </header>
  );
}
