import { Suspense } from "react";
import { Navbar } from "@/components/common/Navbar";
import { StudentJoinForm } from "./StudentJoinForm";

export default function StudentPage() {
  return <><Navbar /><main className="container page"><Suspense fallback={<div className="empty">Katılım formu yükleniyor…</div>}><StudentJoinForm /></Suspense></main></>;
}
