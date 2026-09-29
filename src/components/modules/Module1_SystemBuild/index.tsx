"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/common/Button";
import type { LearningModuleProps } from "@/types";
import { ConceptualStage } from "./ConceptualStage";
import { UniversityStage } from "./UniversityStage";

export function Module1SystemBuild({ onSubmit }: LearningModuleProps) {
  const [stage, setStage] = useState(1);
  const [stageOneScore, setStageOneScore] = useState<number | null>(null);
  return <section className="panel module-shell">
    <div className="module-header"><span className="module-number">01</span><div><div className="eyebrow">Modül 1</div><h2 style={{ margin: 0 }}>Sistemi Kur</h2><p className="muted">Parçaları isimleriyle değil, işlevleriyle tanı.</p></div></div>
    <div className="progress"><span style={{ width: stage === 1 ? "50%" : "100%" }} /></div>
    <div className="workspace">{stage === 1 ? <ConceptualStage onComplete={({ score, placements, mistakes }) => { setStageOneScore(score); void onSubmit({ stage: 1, score, payload: { placements, mistakes } }); }} /> : <UniversityStage onComplete={({ score, classifications, mistakes }) => void onSubmit({ stage: 2, score: Math.round(((stageOneScore || 0) + score) / 2), payload: { classifications, mistakes } })} />}</div>
    {stage === 1 && stageOneScore !== null && <Button onClick={() => setStage(2)} icon={<ArrowRight size={17} />}>Gerçek dünya örneğine geç</Button>}
  </section>;
}
