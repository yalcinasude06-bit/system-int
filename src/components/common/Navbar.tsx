import Link from "next/link";
import { Atom, GraduationCap, Presentation } from "lucide-react";

export function Navbar() {
  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link href="/" className="brand" aria-label="Ana sayfa">
          <span className="brand-mark"><Atom size={22} /></span>
          <span>Sistem Laboratuvarı</span>
        </Link>
        <nav className="nav-actions" aria-label="Ana menü">
          <Link href="/student" className="btn btn-secondary btn-small"><GraduationCap size={16} /> Öğrenci</Link>
          <Link href="/teacher" className="btn btn-primary btn-small desktop-only"><Presentation size={16} /> Öğretmen</Link>
        </nav>
      </div>
    </header>
  );
}
