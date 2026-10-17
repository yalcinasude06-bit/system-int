import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { allRepairCases, buildRepairRound, repairCasePools, repairIsCorrect, scoreRepairProgress } from "../src/components/modules/Week6_SimulationRepair/repairContent.ts";

const component = await readFile(new URL("../src/components/modules/Week6_SimulationRepair/index.tsx", import.meta.url), "utf8");
const content = await readFile(new URL("../src/components/modules/Week6_SimulationRepair/repairContent.ts", import.meta.url), "utf8");
const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const demo = await readFile(new URL("../src/components/common/ModuleGameplayDemo.tsx", import.meta.url), "utf8");
const countdown = await readFile(new URL("../src/components/common/ModuleStartCountdown.tsx", import.meta.url), "utf8");
const legacyMigration = await readFile(new URL("../supabase/migrations/202610170031_week_six_simulation_repair_v3.sql", import.meta.url), "utf8");
const v4Migration = await readFile(new URL("../supabase/migrations/202610170034_week_six_collective_revision.sql", import.meta.url), "utf8");
const v5Migration = await readFile(new URL("../supabase/migrations/202610180035_week_six_simulation_repair_v5.sql", import.meta.url), "utf8");
const v6Migration = await readFile(new URL("../supabase/migrations/202610180036_week_six_simulation_repair_v6.sql", import.meta.url), "utf8");

const expectedIds = [...Array.from({ length: 12 }, (_, index) => `V${String(index + 1).padStart(2, "0")}`), "G13", "G14", "G15", "G19", "G20", "G21", "G22", "G23"];
assert.equal(allRepairCases.length, 20);
assert.deepEqual([...new Set(allRepairCases.map((scenario) => scenario.id))].sort(), expectedIds.sort());
assert.deepEqual(Object.fromEntries(Object.entries(repairCasePools).map(([category, pool]) => [category, pool.length])), { sign: 3, initial: 3, "time-unit": 6, delay: 4, capacity: 4 });
assert.equal(allRepairCases.filter((scenario) => scenario.diagnosis === "verification").length, 12);
assert.equal(allRepairCases.filter((scenario) => scenario.diagnosis === "validation").length, 8);
for (const removedId of ["G16", "G17", "G18", "G24"]) assert.equal(allRepairCases.some((scenario) => scenario.id === removedId), false);

for (const scenario of allRepairCases) {
  assert.equal(scenario.facts.length, 3, `${scenario.id} has exactly three fact cards`);
  assert.equal(new Set(scenario.tokens.map((token) => token.id)).size, scenario.tokens.length, `${scenario.id} token IDs unique`);
  assert.equal(scenario.tokens.filter((token) => token.id === scenario.correctTokenId).length, 1, `${scenario.id} one selectable target`);
  assert.ok(scenario.title.tr && scenario.title.en && scenario.context.tr && scenario.context.en, `${scenario.id} localized title and context`);
  assert.ok(scenario.facts.every((fact) => fact.label.tr && fact.label.en && fact.value.tr && fact.value.en), `${scenario.id} localized fact labels and values`);
  assert.ok(scenario.facts.every((fact) => !fact.label.tr.endsWith(":") && !fact.label.en.endsWith(":")), `${scenario.id} fact renderer owns the colon`);
  if (scenario.note) assert.ok(scenario.note.label.tr && scenario.note.label.en && scenario.note.value.tr && scenario.note.value.en, `${scenario.id} localized note label and value`);
  for (const token of scenario.tokens) {
    assert.ok(token.label.tr && token.label.en && token.fixed.tr && token.fixed.en, `${scenario.id}/${token.id} localized token`);
    assert.equal(repairIsCorrect(scenario, token.id), token.id === scenario.correctTokenId);
  }
}

for (const scenario of allRepairCases.filter((item) => item.diagnosis === "verification")) {
  assert.equal(scenario.evidenceKind, "equation");
  assert.ok(scenario.tokens.every((token) => /^cell-\d+$/.test(token.id)));
  assert.ok(scenario.tokens.every((token) => token.label.tr !== "="), `${scenario.id} output is not selectable`);
}
for (const scenario of allRepairCases.filter((item) => item.diagnosis === "validation")) assert.equal(scenario.tokens.length, 3, `${scenario.id} has three meaningful settings`);
for (let index = 0; index < 500; index += 1) {
  const seed = `seed-${index}`, round = buildRepairRound(seed);
  assert.equal(round.length, 5);
  assert.equal(new Set(round.map((scenario) => scenario.id)).size, 5);
  assert.equal(new Set(round.map((scenario) => scenario.category)).size, 5);
  assert.equal(round.filter((scenario) => scenario.diagnosis === "verification").length, 3);
  assert.equal(round.filter((scenario) => scenario.diagnosis === "validation").length, 2);
  assert.deepEqual(buildRepairRound(seed).map((scenario) => scenario.id), round.map((scenario) => scenario.id));
}

const round = buildRepairRound("score-v6");
const perfect = round.map((scenario) => ({ caseId: scenario.id, diagnosis: scenario.diagnosis, selectedTokenId: scenario.correctTokenId }));
assert.equal(scoreRepairProgress(round, perfect), 100);
assert.equal(scoreRepairProgress(round, perfect.slice(0, 3)), 60);
assert.equal(scoreRepairProgress(round, [{ caseId: round[0].id, diagnosis: round[0].diagnosis }]), 8);
assert.equal(scoreRepairProgress(round, perfect.slice(0, 1)), 20);
const wrongDiagnosis = round[0].diagnosis === "verification" ? "validation" : "verification";
const wrongToken = round[0].tokens.find((token) => token.id !== round[0].correctTokenId).id;
assert.equal(scoreRepairProgress(round, [{ caseId: round[0].id, diagnosis: wrongDiagnosis, selectedTokenId: round[0].correctTokenId }]), 12);
assert.equal(scoreRepairProgress(round, [{ caseId: round[0].id, diagnosis: round[0].diagnosis, selectedTokenId: wrongToken }]), 8);
assert.equal(scoreRepairProgress(round, [{ caseId: round[0].id, selectedTokenId: round[0].correctTokenId }]), 0);

const byId = (id) => allRepairCases.find((scenario) => scenario.id === id);
assert.equal(byId("V04").fixedOutput.tr, "40 + (8 − 4) × 0,5 = 42");
assert.equal(byId("V05").fixedOutput.tr, "20 + (2 − 10) × 0,25 = 18");
assert.equal(byId("V06").fixedOutput.tr, "70 + (6 − 16) × 0,2 = 68");
assert.deepEqual(byId("V06").facts[0], { label: { tr: "İlk stok", en: "Initial stock" }, value: { tr: "70", en: "70" } });
assert.deepEqual(byId("V06").note, { label: { tr: "Süre", en: "Duration" }, value: { tr: "günün beşte biri", en: "one fifth of a day" } });
assert.equal(byId("V09").facts[0].label.tr, "Şarj");
assert.equal(byId("V09").facts[0].value.tr, "+12 yüzde puan");
assert.equal(byId("V09").fixedOutput.tr, "%60 + 12 − 8 = %64");
assert.deepEqual(byId("G13").modelSeries, [8, 8, 8, 8, 8]);
assert.deepEqual(byId("G14").realSeries, [20, 20, 45, 62, 70]);
assert.deepEqual(byId("G23").realSeries, [30, 30, 25, 20, 18]);
assert.deepEqual(byId("G19").realSeries, [0, 12, 24, 36]);
assert.deepEqual(byId("G20").realSeries, [350, 450, 500, 500]);
assert.deepEqual(byId("G21").realSeries, [70, 88, 100, 100]);
assert.deepEqual(byId("G22").realSeries, [24, 32, 36, 36]);
for (const id of ["G20", "G21", "G22"]) assert.doesNotMatch(byId(id).context.tr, id === "G20" ? /500/ : id === "G21" ? /100/ : /36/);

assert.match(component, /gameId = "week-6-simulation-repair-v6"/);
assert.match(component, /legacyDraftSnapshot/);
assert.match(component, /payload\?\.gameId === "week-6-simulation-repair-v4"/);
assert.match(component, /payload\?\.gameId === "week-6-simulation-repair-v5"/);
assert.match(component, /completedCount === 5/);
assert.match(component, /indexRef\.current >= 4/);
assert.match(component, /aria-valuemax=\{5\}/);
assert.match(component, /\{index \+ 1\}\/5/);
assert.match(component, /diagnosisLocked\.current = true/);
assert.match(component, /repairLocked\.current = true/);
assert.match(component, /phaseRef\.current = "diagnosis-feedback"/);
assert.match(component, /\}, 800\)/);
assert.match(component, /\? 1600 : 1800/);
assert.match(component, /equationResult/);
assert.match(component, /function EquationLine/);
assert.match(component, /repair-p5-fact/);
assert.match(component, /Gerçek sistem/);
assert.match(component, /Model kuralları doğru uygulandı mı\?/);
assert.doesNotMatch(component, /BehaviorEvidence|repair-p5-chart|data-correct|correctTokenId=/);
assert.doesNotMatch(component, /RelationEvidence|scenario\.relation|repair-p5-relation-map/);
assert.doesNotMatch(component, /diagnosisPoints|repairPoints|\+\{diagnosis/);
assert.doesNotMatch(content, /RelationEvidence|RelationState|"relation"|\brelation\(/);
assert.doesNotMatch(content, /"timestep"\s*\||"unit"\s*\||"behavior"\s*\|/);

const v6Css = css.slice(css.indexOf("Week 6 · Module 2 v6"));
for (const color of ["#ede9f8", "#e7f1fd", "#e8f5ee", "#fff1e6"]) assert.match(v6Css, new RegExp(color));
assert.match(v6Css, /repeat\(5,minmax\(0,1fr\)\)/);
assert.match(v6Css, /@media \(hover:hover\) and \(pointer:fine\)/);
assert.match(v6Css, /max-height:calc\(100dvh - 60px - env\(safe-area-inset-bottom\)\)/);
assert.match(v6Css, /overflow-y:auto/);
assert.match(v6Css, /min-height:44px/);
assert.match(v6Css, /flex-wrap:nowrap/);
assert.match(v6Css, /operator-token[^}]*background:#fff[^}]*border-color:#d3d8e5[^}]*border-radius:8px/);
assert.match(v6Css, /@media \(max-width:360px\)/);
assert.doesNotMatch(v6Css, /repair-p5-equation[^\n]*flex-wrap:wrap/);
assert.doesNotMatch(v6Css, /repair-p5-relation-map/);

assert.match(countdown, /5 Vaka/);
assert.match(countdown, /Beş farklı vakada doğrulama veya geçerlilik/);
assert.match(demo, /Vaka 1\/5/);
assert.match(demo, /duration: 10/);
const repairDemo = demo.slice(demo.indexOf("function WeekSixSimulationRepairDemo"), demo.indexOf("function WeekSixModelAgencyDemo"));
assert.match(repairDemo, /Doğru teşhis · \+8/);
assert.match(repairDemo, /Hatalı kareye dokun/);
assert.match(repairDemo, /İlk stok 100/);
assert.match(repairDemo, /Üretim \+20/);
assert.match(repairDemo, /Sevkiyat −12/);
assert.match(repairDemo, /108 ✓/);
assert.doesNotMatch(repairDemo, /week-six-repair-demo-steps|week-six-repair-demo-test/);
assert.match(v6Css, /week-six-repair-demo-equation \.target/);
assert.match(v6Css, /prefers-reduced-motion:reduce/);

assert.match(legacyMigration, /week6_simulation_repair_score_v3/);
assert.match(v4Migration, /week6_simulation_repair_score_v4/);
assert.match(v5Migration, /week6_simulation_repair_score_v5/);
assert.match(v6Migration, /week6_simulation_repair_score_v6/);
assert.match(v6Migration, /jsonb_array_length\(selected\) <> 5/);
assert.match(v6Migration, /count\(distinct public\.week6_simulation_repair_v6_category\(value\)\)[\s\S]{0,80}<> 5/);
assert.match(v6Migration, /left\(value, 1\) = 'V'\) <> 3/);
assert.match(v6Migration, /greatest\(0, least\(raw_score, 100\)\)/);
assert.doesNotMatch(v6Migration, /raw_score \* 100\.0 \/ 120\.0/);
assert.match(v6Migration, /token_id is null and ordinal < jsonb_array_length\(progress\)/);
assert.match(v6Migration, /record ->> 'diagnosis' is null/);
for (const version of ["v2", "v3", "v4", "v5", "v6"]) assert.match(v6Migration, new RegExp(`week-6-simulation-repair-${version}`));
assert.match(v6Migration, /forged tokens/);
assert.match(v6Migration, /removed relation cases/);
assert.match(v6Migration, /v5 compatibility/);
assert.doesNotMatch(v6Migration, /create or replace function public\.finish_session_module/);

console.log("Week 6 Simulation Repairer v6 validation passed: 20 localized cases, five deterministic case types, direct 100-point scoring, boxed equation operators, legacy draft preservation, and trusted v2-v6 SQL routing.");
