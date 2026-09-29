import type { Student } from "@/types";

export function StudentListLive({ students }: { students: Student[] }) {
  if (!students.length) return <div className="empty">Henüz kimse katılmadı. QR kodunu veya PIN’i paylaşın.</div>;
  return <div className="student-cloud">
    {[...students].sort((a, b) => b.score - a.score).map((student) => <div className="student-chip" key={student.id}><b>{student.avatar}</b><span className="student-identity"><strong>{student.nickname}</strong><small>No: {student.student_number}</small></span><span>{student.score} puan</span></div>)}
  </div>;
}
