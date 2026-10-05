import type { Submission } from "@/types";

const concepts = ["Amaç", "Bileşenler", "İlişkiler", "Sınır", "Çevre", "Arayüz", "Girdi", "Çıktı", "Kısıt"];

export function TeacherStats({ submissions }: { submissions: Submission[] }) {
  const scores = submissions.map((item) => item.score + (item.speed_bonus ?? 0));
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const confusion = new Map<string, number>();
  submissions.forEach((submission) => {
    const mistakes = Array.isArray(submission.payload?.mistakes) ? submission.payload.mistakes : [];
    mistakes.forEach((item) => confusion.set(String(item), (confusion.get(String(item)) || 0) + 1));
  });
  const mostConfused = [...confusion.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Veri bekleniyor";

  return <div className="stack">
    <div className="grid-3">
      <div className="metric"><span>Tamamlayan</span><strong>{submissions.length}</strong></div>
      <div className="metric"><span>Ortalama puan</span><strong>{average}</strong></div>
      <div className="metric"><span>Karışan kavram</span><strong style={{ fontSize: 18 }}>{mostConfused}</strong></div>
    </div>
    <div className="card-tray">{concepts.map((concept) => <span className="drag-card" key={concept} style={{ opacity: confusion.has(concept) ? 1 : .48 }}>{concept} {confusion.has(concept) ? `· ${confusion.get(concept)}` : ""}</span>)}</div>
  </div>;
}
