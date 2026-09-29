"use client";

import type { LearningModuleProps } from "@/types";
import { ConceptualStage } from "./ConceptualStage";

export function Module1SystemBuild({ onSubmit, existingSubmission }: LearningModuleProps) {
  return <section className="panel module-shell">
    <div className="module-title-chip">Modül 1: Sistemi Kur</div>
    <div className="workspace anatomy-workspace"><ConceptualStage key={existingSubmission?.id || "new-attempt"} initialSubmission={existingSubmission} onComplete={async ({ score, placements, mistakes }) => (await onSubmit({ stage: 1, score, payload: { placements, mistakes } })) !== false} /></div>
  </section>;
}
