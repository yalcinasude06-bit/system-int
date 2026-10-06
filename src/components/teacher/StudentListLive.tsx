import type { ModuleId, Student, Submission } from "@/types";

export function StudentListLive({ students, submissions, week, module, isStarted }: { students: Student[]; submissions: Submission[]; week: number; module: ModuleId; isStarted: boolean }) {
  if (!students.length) return <div className="empty">Henüz kimse katılmadı. QR kodunu veya PIN’i paylaşın.</div>;

  const completedIds = new Set(
    submissions
      .filter((item) => item.week_id === week && item.module_id === module && item.is_submitted && item.completion_status === "completed")
      .map((item) => item.student_id),
  );
  const incompleteIds = new Set(
    submissions
      .filter((item) => item.week_id === week && item.module_id === module && item.is_submitted && item.completion_status === "incomplete")
      .map((item) => item.student_id),
  );

  return <div className="student-cloud">
    {[...students].sort((a, b) => b.session_score - a.session_score).map((student) => {
      const completed = completedIds.has(student.id);
      const incomplete = incompleteIds.has(student.id);
      const status = completed ? "Tamamladı" : incomplete ? "Tamamlamadı" : isStarted ? "Çözüyor" : "Bekliyor";
      return <div className={`student-chip ${completed ? "completed" : incomplete ? "incomplete" : isStarted ? "solving" : "waiting"}`} key={student.id}>
        <b>{student.avatar}</b>
        <span className="student-identity" data-i18n-skip><strong>{student.nickname}</strong><small>No: {student.student_number}</small></span>
        <span className="student-live-status"><i />{completed ? "✅" : incomplete ? "⏱️" : isStarted ? "🟢" : "🟡"} {status}</span>
      </div>;
    })}
  </div>;
}
