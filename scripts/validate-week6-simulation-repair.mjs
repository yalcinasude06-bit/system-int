import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { allRepairCases, buildRepairRound, repairCasePools, repairIsCorrect, scoreRepairProgress } from "../src/components/modules/Week6_SimulationRepair/repairContent.ts";

const component = await readFile(new URL("../src/components/modules/Week6_SimulationRepair/index.tsx", import.meta.url), "utf8");
const content = await readFile(new URL("../src/components/modules/Week6_SimulationRepair/repairContent.ts", import.meta.url), "utf8");
const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const demo = await readFile(new URL("../src/components/common/ModuleGameplayDemo.tsx", import.meta.url), "utf8");
const countdown = await readFile(new URL("../src/components/common/ModuleStartCountdown.tsx", import.meta.url), "utf8");
const legacyMigration = await readFile(new URL("../supabase/migrations/202610170031_week_six_simulation_repair_v3.sql", import.meta.url), "utf8");
const hardening = await readFile(new URL("../supabase/migrations/202610170032_week_six_simulation_repair_v3_require_diagnosis.sql", import.meta.url), "utf8");
const revision = await readFile(new URL("../supabase/migrations/202610170034_week_six_collective_revision.sql", import.meta.url), "utf8");

assert.equal(allRepairCases.length, 24);
assert.deepEqual(Object.values(repairCasePools).map((pool) => pool.length), Array(8).fill(3));
assert.equal(allRepairCases.filter((scenario) => scenario.diagnosis === "verification").length, 12);
assert.equal(allRepairCases.filter((scenario) => scenario.diagnosis === "validation").length, 12);
for (const scenario of allRepairCases) {
  assert.equal(new Set(scenario.tokens.map((token) => token.id)).size, scenario.tokens.length, `${scenario.id} token IDs unique`);
  assert.equal(scenario.tokens.filter((token) => token.id === scenario.correctTokenId).length, 1, `${scenario.id} one selectable target`);
  for (const token of scenario.tokens) assert.equal(repairIsCorrect(scenario, token.id), token.id === scenario.correctTokenId);
  assert.ok(scenario.title.en && scenario.context.en && scenario.facts.every((fact) => fact.en && !/^Evidence /.test(fact.en)), `${scenario.id} complete English copy`);
  assert.ok(["comparison", "timeline", "relation", "capacity", "behavior"].includes(scenario.evidenceKind), `${scenario.id} has an explicit evidence kind`);
}
for (const scenario of allRepairCases.filter((item) => item.id.startsWith("V"))) {
  assert.ok(scenario.tokens.length >= 5);
  assert.ok(scenario.tokens.every((token) => /^cell-\d+$/.test(token.id)));
  assert.ok(scenario.tokens.some((token) => token.label.tr === "="), `${scenario.id} output stays in the tappable equation`);
}
for (const scenario of allRepairCases.filter((item) => item.id.startsWith("G"))) {
  assert.doesNotMatch(scenario.tokens.map((token) => `${token.label.tr} ${token.label.en}`).join(" "), /bağlantı yok|no link|gecikmesi:\s*0|delay:\s*0|kapasitesi:\s*(650|124)/i, `${scenario.id} repair choices stay neutral before selection`);
}
assert.deepEqual(allRepairCases.slice(12).map((scenario) => scenario.evidenceKind), ["timeline", "timeline", "timeline", "relation", "relation", "relation", "capacity", "capacity", "capacity", "behavior", "behavior", "behavior"]);
for (let index = 0; index < 500; index += 1) {
  const seed = `seed-${index}`, round = buildRepairRound(seed);
  assert.equal(round.length, 5);
  assert.equal(new Set(round.map((scenario) => scenario.category)).size, 5);
  assert.ok([2, 3].includes(round.filter((scenario) => scenario.diagnosis === "verification").length));
  assert.deepEqual(buildRepairRound(seed).map((scenario) => scenario.id), round.map((scenario) => scenario.id));
}
const round = buildRepairRound("score");
const perfect = round.map((scenario) => ({ caseId: scenario.id, diagnosis: scenario.diagnosis, selectedTokenId: scenario.correctTokenId }));
assert.equal(scoreRepairProgress(round, perfect), 100);
assert.equal(scoreRepairProgress(round, perfect.slice(0, 2)), 40);
assert.equal(scoreRepairProgress(round, [{ caseId: round[0].id, diagnosis: round[0].diagnosis }]), 8);
const wrongDiagnosis = round[0].diagnosis === "verification" ? "validation" : "verification";
const wrongToken = round[0].tokens.find((token) => token.id !== round[0].correctTokenId).id;
assert.equal(scoreRepairProgress(round, [{ caseId: round[0].id, diagnosis: round[0].diagnosis, selectedTokenId: round[0].correctTokenId }]), 20);
assert.equal(scoreRepairProgress(round, [{ caseId: round[0].id, diagnosis: round[0].diagnosis, selectedTokenId: wrongToken }]), 8);
assert.equal(scoreRepairProgress(round, [{ caseId: round[0].id, diagnosis: wrongDiagnosis, selectedTokenId: round[0].correctTokenId }]), 12);
assert.equal(scoreRepairProgress(round, [{ caseId: round[0].id, diagnosis: wrongDiagnosis, selectedTokenId: wrongToken }]), 0);
assert.match(allRepairCases.find((scenario) => scenario.id === "V04").context.tr, /yarım günlük/);
assert.equal(allRepairCases.find((scenario) => scenario.id === "V04").brokenOutput.tr, "40 + (8 − 4) × 1 = 44");
assert.equal(allRepairCases.find((scenario) => scenario.id === "V04").fixedOutput.tr, "40 + (8 − 4) × 0,5 = 42");
assert.equal(allRepairCases.find((scenario) => scenario.id === "V08").fixedOutput.tr, "24 + 8 − 6 = 26");
assert.equal(allRepairCases.find((scenario) => scenario.id === "V09").fixedOutput.tr, "%60 + 12 − 8 = %64");
assert.doesNotMatch(allRepairCases.find((scenario) => scenario.id === "G20").context.tr, /500/);
assert.doesNotMatch(allRepairCases.find((scenario) => scenario.id === "G21").context.tr, /100/);

assert.match(component, /gameId = "week-6-simulation-repair-v4"/);
assert.match(component, /diagnosisLocked\.current = true/);
assert.match(component, /repairLocked\.current = true/);
assert.match(component, /selectedTokenId: tokenId/);
assert.match(component, /save\(next\)/);
assert.doesNotMatch(component, /Modeli Test Et|Test Model|onTest|repair\.kind/);
assert.doesNotMatch(component, /data-correct|correctTokenId=/);
assert.match(component, /prefers-reduced-motion/);
assert.match(component, /phaseRef\.current = "diagnosis-feedback"/);
assert.match(component, /setTimeout\(\(\) => \{ if \(done\.current\) return; phaseRef\.current = "repair"; setPhase\("repair"\); \}, 800\)/);
assert.match(component, /\? 1600 : 1800/);
assert.match(component, /role="status"/);
assert.match(component, /aria-live="assertive"/);
for (const marker of ["repair-p5-equation", "repair-p5-token-cards", "repair-p5-timeline", "repair-p5-relation-map", "repair-p5-capacity", "repair-p5-chart"]) assert.match(component, new RegExp(marker));
assert.match(component, /viewBox="0 0 330 150"/);
assert.doesNotMatch(component, /className=\{[^}]*correctTokenId/, "No correctness class may be emitted before result");
const block = css.slice(css.indexOf("Week 6 collective mobile revision overrides"));
assert.match(block, /max-height:calc\(100dvh - 60px - env\(safe-area-inset-bottom\)\)/);
assert.match(block, /overflow-y:auto/);
assert.match(block, /min-height:44px/);
assert.match(block, /@media \(hover:hover\) and \(pointer:fine\)/);
assert.match(block, /-webkit-tap-highlight-color:transparent/);
assert.match(block, /@media \(prefers-reduced-motion:reduce\)/);
assert.match(countdown, /tek dokunuşla onarımı başlat/);
assert.doesNotMatch(demo, /V01 ·|Beklenen: 100/);
assert.match(demo, /Simülasyon: 68/);
assert.match(demo, /duration: 10/);
assert.match(demo, /week-six-repair-demo-feedback/);
assert.match(legacyMigration, /week6_simulation_repair_score_v3/);
assert.match(hardening, /record->>'diagnosis' is null/);
assert.match(revision, /week6_simulation_repair_score_v4/);
assert.match(revision, /week-6-simulation-repair-v2/);
assert.match(revision, /week-6-simulation-repair-v3/);
assert.match(revision, /week-6-simulation-repair-v4/);
assert.match(revision, /token_id = any\(public\.week6_simulation_repair_v4_token_ids/);
assert.doesNotMatch(revision, /isCorrect/);
assert.doesNotMatch(content, /\$Davranış|\$Sonraki/);

console.log("Week 6 Simulation Repairer v4 validation passed: 24 localized cases, five pedagogical evidence views, 800ms diagnosis feedback, neutral one-tap repairs, 8+12 scoring, responsive UI, and trusted v2/v3/v4 SQL scoring.");
