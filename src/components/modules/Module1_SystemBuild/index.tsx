"use client";

import type { LearningModuleProps } from "@/types";
import { ConceptualStage } from "./ConceptualStage";

export function Module1SystemBuild({ onSubmit, existingSubmission, forceSubmit }: LearningModuleProps) {
  return <section className="panel module-shell">
    <div className="module-title-chip">Modül 1: Sistemi Kur</div>
    <div className="workspace anatomy-workspace"><ConceptualStage key={existingSubmission?.id || "new-attempt"} initialSubmission={existingSubmission} forceSubmit={forceSubmit} onComplete={async ({ score, placements, mistakes, answeredCount, itemCount, completionReason }) => (await onSubmit({ stage: 1, score, payload: { placements, mistakes, answeredCount, itemCount, completionReason } })) !== false} /></div>
  </section>;
}
