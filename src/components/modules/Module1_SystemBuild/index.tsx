"use client";

import type { LearningModuleProps } from "@/types";
import { ConceptualStage } from "./ConceptualStage";

export function Module1SystemBuild({ onSubmit, existingSubmission }: LearningModuleProps) {
  return <section className="panel module-shell">
    <div className="module-header"><span className="module-number">01</span><div><div className="eyebrow">Modül 1 · Tek yanıt hakkı</div><h2 style={{ margin: 0 }}>Sistemi Kur</h2><p className="muted">Kartları özgürce düzenle; Kontrol Et / Gönder sonrasında yanıtın ve puanın kilitlenir.</p></div></div>
    <div className="workspace"><ConceptualStage key={existingSubmission?.id || "new-attempt"} initialSubmission={existingSubmission} onComplete={async ({ score, placements, mistakes }) => (await onSubmit({ stage: 1, score, payload: { placements, mistakes } })) !== false} /></div>
  </section>;
}
