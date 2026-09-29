import type { Submission } from "@/types";

export function TeacherHeatmap({ submissions }: { submissions: Submission[] }) {
  const counts = new Map<string, number>();
  submissions.forEach((submission) => {
    const edges = Array.isArray(submission.payload?.edges) ? submission.payload.edges : [];
    edges.forEach((edge) => {
      if (edge && typeof edge === "object" && "from" in edge && "to" in edge) {
        const key = `${String(edge.from)} → ${String(edge.to)}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
  });
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!rows.length) return <div className="empty">İlişki ağı gönderimleri bekleniyor.</div>;
  const max = Math.max(...rows.map(([, count]) => count));
  return <div className="relation-list">{rows.map(([edge, count]) => <div className="relation-row" key={edge}><strong>{edge}</strong><span>{count} öğrenci</span><i style={{ width: 72, height: 8, borderRadius: 99, background: `linear-gradient(90deg,var(--teal) ${(count/max)*100}%,rgba(255,255,255,.07) 0)` }} /></div>)}</div>;
}
