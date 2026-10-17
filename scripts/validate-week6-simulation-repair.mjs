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

const expectedIds = [...Array.from({ length: 12 }, (_, index) => `V${String(index + 1).padStart(2, "0")}`), ...Array.from({ length: 12 }, (_, index) => `G${index + 13}`)];
assert.equal(allRepairCases.length, 24);
assert.deepEqual([...new Set(allRepairCases.map((scenario) => scenario.id))].sort(), expectedIds.sort());
assert.deepEqual(Object.fromEntries(Object.entries(repairCasePools).map(([category, pool]) => [category, pool.length])), { sign: 3, initial: 3, "time-unit": 6, delay: 4, relation: 4, capacity: 4 });
assert.equal(allRepairCases.filter((scenario) => scenario.diagnosis === "verification").length, 12);
assert.equal(allRepairCases.filter((scenario) => scenario.diagnosis === "validation").length, 12);

for (const scenario of allRepairCases) {
  assert.equal(scenario.facts.length, 3, `${scenario.id} has exactly three fact cards`);
  assert.equal(new Set(scenario.tokens.map((token) => token.id)).size, scenario.tokens.length, `${scenario.id} token IDs unique`);
  assert.equal(scenario.tokens.filter((token) => token.id === scenario.correctTokenId).length, 1, `${scenario.id} one selectable target`);
  assert.ok(scenario.title.tr && scenario.title.en && scenario.context.tr && scenario.context.en, `${scenario.id} localized title and context`);
  assert.ok(scenario.facts.every((fact) => fact.tr && fact.en), `${scenario.id} localized facts`);
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
  assert.equal(round.length, 6);
  assert.equal(new Set(round.map((scenario) => scenario.id)).size, 6);
  assert.equal(new Set(round.map((scenario) => scenario.category)).size, 6);
  assert.equal(round.filter((scenario) => scenario.diagnosis === "verification").length, 3);
  assert.equal(round.filter((scenario) => scenario.diagnosis === "validation").length, 3);
  assert.deepEqual(buildRepairRound(seed).map((scenario) => scenario.id), round.map((scenario) => scenario.id));
}

const round = buildRepairRound("score-v5");
const perfect = round.map((scenario) => ({ caseId: scenario.id, diagnosis: scenario.diagnosis, selectedTokenId: scenario.correctTokenId }));
assert.equal(scoreRepairProgress(round, perfect), 100);
assert.equal(scoreRepairProgress(round, perfect.slice(0, 3)), 50);
assert.equal(scoreRepairProgress(round, [{ caseId: round[0].id, diagnosis: round[0].diagnosis }]), 7);
assert.equal(scoreRepairProgress(round, perfect.slice(0, 1)), 17);
const wrongDiagnosis = round[0].diagnosis === "verification" ? "validation" : "verification";
const wrongToken = round[0].tokens.find((token) => token.id !== round[0].correctTokenId).id;
assert.equal(scoreRepairProgress(round, [{ caseId: round[0].id, diagnosis: wrongDiagnosis, selectedTokenId: round[0].correctTokenId }]), 10);
assert.equal(scoreRepairProgress(round, [{ caseId: round[0].id, diagnosis: round[0].diagnosis, selectedTokenId: wrongToken }]), 7);
assert.equal(scoreRepairProgress(round, [{ caseId: round[0].id, selectedTokenId: round[0].correctTokenId }]), 0);

const byId = (id) => allRepairCases.find((scenario) => scenario.id === id);
assert.equal(byId("V04").fixedOutput.tr, "40 + (8 − 4) × 0,5 = 42");
assert.equal(byId("V09").facts[0].tr, "Şarj +12 yüzde puan");
assert.equal(byId("V09").fixedOutput.tr, "%60 + 12 − 8 = %64");
assert.deepEqual(byId("G13").modelSeries, [8, 8, 8, 8, 8]);
assert.deepEqual(byId("G14").realSeries, [20, 20, 45, 62, 70]);
assert.deepEqual(byId("G23").realSeries, [30, 30, 25, 20, 18]);
assert.equal(byId("G17").facts[2].tr, "Reklam sabit");
assert.doesNotMatch(`${byId("G17").context.tr} ${byId("G17").facts.map((fact) => fact.tr).join(" ")}`, /Ürün kalitesi/);
assert.equal(byId("G17").brokenOutput.tr, "Fiyat ↑ · Talep ↑ · 60→86");
assert.deepEqual(byId("G19").realSeries, [0, 12, 24, 36]);
assert.deepEqual(byId("G20").realSeries, [350, 450, 500, 500]);
assert.deepEqual(byId("G21").realSeries, [70, 88, 100, 100]);
assert.deepEqual(byId("G22").realSeries, [24, 32, 36, 36]);
for (const id of ["G20", "G21", "G22"]) assert.doesNotMatch(byId(id).context.tr, id === "G20" ? /500/ : id === "G21" ? /100/ : /36/);

assert.match(component, /gameId = "week-6-simulation-repair-v5"/);
assert.match(component, /legacyDraftSnapshot/);
assert.match(component, /payload\?\.gameId === "week-6-simulation-repair-v4"/);
assert.match(component, /completedCount === 6/);
assert.match(component, /indexRef\.current >= 5/);
assert.match(component, /aria-valuemax=\{6\}/);
assert.match(component, /\{index \+ 1\}\/6/);
assert.match(component, /diagnosisLocked\.current = true/);
assert.match(component, /repairLocked\.current = true/);
assert.match(component, /phaseRef\.current = "diagnosis-feedback"/);
assert.match(component, /\}, 800\)/);
assert.match(component, /\? 1600 : 1800/);
assert.match(component, /equationResult/);
assert.doesNotMatch(component, /BehaviorEvidence|repair-p5-chart|data-correct|correctTokenId=/);
assert.doesNotMatch(component, /diagnosisPoints|repairPoints|\+\{diagnosis/);
assert.doesNotMatch(content, /"timestep"\s*\||"unit"\s*\||"behavior"\s*\|/);

const v5Css = css.slice(css.indexOf("Week 6 · Module 2 v5"));
for (const color of ["#ede9f8", "#e7f1fd", "#e8f5ee", "#fff1e6"]) assert.match(v5Css, new RegExp(color));
assert.match(v5Css, /repeat\(6,minmax\(0,1fr\)\)/);
assert.match(v5Css, /@media \(hover:hover\) and \(pointer:fine\)/);
assert.match(v5Css, /max-height:calc\(100dvh - 60px - env\(safe-area-inset-bottom\)\)/);
assert.match(v5Css, /overflow-y:auto/);
assert.match(v5Css, /min-height:44px/);

assert.match(countdown, /6 Vaka/);
assert.match(countdown, /Altı farklı vaka türünde/);
assert.match(demo, /Vaka 1\/6/);
assert.match(demo, /duration: 10/);
assert.match(demo, /Doğru teşhis/);
assert.doesNotMatch(demo.slice(demo.indexOf("function WeekSixSimulationRepairDemo"), demo.indexOf("function WeekSixModelAgencyDemo")), /\+8/);

assert.match(legacyMigration, /week6_simulation_repair_score_v3/);
assert.match(v4Migration, /week6_simulation_repair_score_v4/);
assert.match(v5Migration, /week6_simulation_repair_score_v5/);
assert.match(v5Migration, /jsonb_array_length\(selected\) <> 6/);
assert.match(v5Migration, /count\(distinct public\.week6_simulation_repair_v5_category\(value\)\)[\s\S]{0,80}<> 6/);
assert.match(v5Migration, /round\(raw_score \* 100\.0 \/ 120\.0\)::int/);
assert.match(v5Migration, /token_id is null and ordinal < jsonb_array_length\(progress\)/);
assert.match(v5Migration, /record ->> 'diagnosis' is null/);
assert.match(v5Migration, /week-6-simulation-repair-v2/);
assert.match(v5Migration, /week-6-simulation-repair-v3/);
assert.match(v5Migration, /week-6-simulation-repair-v4/);
assert.match(v5Migration, /week-6-simulation-repair-v5/);
assert.match(v5Migration, /forged tokens/);
assert.match(v5Migration, /v4 compatibility/);
assert.doesNotMatch(v5Migration, /create or replace function public\.finish_session_module/);

console.log("Week 6 Simulation Repairer v5 validation passed: 24 localized cases, six deterministic case types, normalized 100-point scoring, compact pastel evidence views, legacy draft preservation, and trusted v2-v5 SQL routing.");
