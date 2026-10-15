import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  allRepairCases,
  buildRepairRound,
  localizedOutput,
  repairCasePools,
  repairIsCorrect,
  scoreRepairProgress,
} from "../src/components/modules/Week6_SimulationRepair/repairContent.ts";

const component = await readFile(new URL("../src/components/modules/Week6_SimulationRepair/index.tsx", import.meta.url), "utf8");
const studentPage = await readFile(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const teacherPage = await readFile(new URL("../src/app/teacher/session/[pin]/page.tsx", import.meta.url), "utf8");
const selector = await readFile(new URL("../src/components/teacher/ModuleSelector.tsx", import.meta.url), "utf8");
const countdown = await readFile(new URL("../src/components/common/ModuleStartCountdown.tsx", import.meta.url), "utf8");
const demo = await readFile(new URL("../src/components/common/ModuleGameplayDemo.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/202610150029_week_six_simulation_repair.sql", import.meta.url), "utf8");

const expectedIds = [
  "V01", "V02", "V03", "V04", "V05", "V06", "V07", "V08", "V09", "V10", "V11", "V12",
  "G13", "G14", "G15", "G16", "G17", "G18", "G19", "G20", "G21", "G22", "G23", "G24",
];
assert.deepEqual(allRepairCases.map((item) => item.id), expectedIds, "The complete 24-case pool must be present in order");
assert.equal(new Set(allRepairCases.map((item) => item.id)).size, 24, "Case IDs must be unique");
assert.equal(Object.keys(repairCasePools).length, 8, "All eight repair mechanics must exist");
for (const [category, pool] of Object.entries(repairCasePools)) {
  assert.equal(pool.length, 3, `${category} must contain exactly three cases`);
  assert.ok(pool.every((item) => item.category === category), `${category} pool must not mix mechanics`);
}
assert.equal(allRepairCases.filter((item) => item.diagnosis === "verification").length, 12);
assert.equal(allRepairCases.filter((item) => item.diagnosis === "validation").length, 12);
assert.ok(allRepairCases.filter((item) => item.diagnosis === "validation").every((item) => item.reference.tr.startsWith("Kod testi geçti")), "Every validation case must visibly state that its code test passed");
assert.ok(allRepairCases.every((item) => localizedOutput(item.brokenOutput, "tr") && localizedOutput(item.brokenOutput, "en")), "Outputs must be complete in both languages");

function correctRepair(scenario) {
  switch (scenario.category) {
    case "sign": return { kind: "sign", signs: [...scenario.correctSigns] };
    case "timestep": return { kind: "timestep", value: scenario.correctValue };
    case "initial": return { kind: "initial", value: scenario.correctValue };
    case "unit": return { kind: "unit", operation: scenario.correctOperation };
    case "delay": return { kind: "delay", value: scenario.correctDelay, unit: scenario.delayUnit };
    case "relation": return { kind: "relation", from: scenario.correctFrom, to: scenario.correctTo, polarity: scenario.polarity };
    case "capacity": return { kind: "capacity", value: scenario.correctCapacity };
    case "behavior": return { kind: "behavior", structure: scenario.correctStructure };
  }
}

function wrongRepair(scenario) {
  switch (scenario.category) {
    case "sign": return { kind: "sign", signs: ["-", "+"] };
    case "timestep": return { kind: "timestep", value: -99 };
    case "initial": return { kind: "initial", value: -99 };
    case "unit": return { kind: "unit", operation: scenario.correctOperation === "times24" ? "divide1000" : "times24" };
    case "delay": return { kind: "delay", value: -99, unit: scenario.delayUnit };
    case "relation": return { kind: "relation", from: scenario.correctTo, to: scenario.correctFrom, polarity: scenario.polarity };
    case "capacity": return { kind: "capacity", value: -99 };
    case "behavior": return { kind: "behavior", structure: scenario.correctStructure === "seasonal" ? "balancing" : "seasonal" };
  }
}

for (const scenario of allRepairCases) {
  assert.equal(repairIsCorrect(scenario, correctRepair(scenario)), true, `${scenario.id} correct semantic repair must pass`);
  assert.equal(repairIsCorrect(scenario, wrongRepair(scenario)), false, `${scenario.id} incorrect semantic repair must fail`);
}

for (let index = 0; index < 400; index += 1) {
  const seed = `session:student:6:2:${index}`;
  const round = buildRepairRound(seed);
  assert.deepEqual(round.map((item) => item.id), buildRepairRound(seed).map((item) => item.id), "Selection must be deterministic per seed");
  assert.equal(round.length, 5);
  assert.equal(new Set(round.map((item) => item.category)).size, 5, "Every round must use five distinct mechanics");
  assert.equal(new Set(round.map((item) => item.id)).size, 5, "Every round must use five distinct cases");
  const verificationCount = round.filter((item) => item.diagnosis === "verification").length;
  assert.ok(verificationCount === 2 || verificationCount === 3, "Every round must be balanced 2–3 / 3–2");
}

const scoreRound = buildRepairRound("score-test");
const perfect = scoreRound.map((scenario) => ({ caseId: scenario.id, diagnosis: scenario.diagnosis, repair: correctRepair(scenario) }));
assert.equal(scoreRepairProgress(scoreRound, perfect), 100, "Five fully correct cases must score 100");
assert.equal(scoreRepairProgress(scoreRound, [{ ...perfect[0], diagnosis: perfect[0].diagnosis === "verification" ? "validation" : "verification" }]), 12, "A wrong diagnosis must not block 12 repair points");
assert.equal(scoreRepairProgress(scoreRound, [{ ...perfect[0], repair: wrongRepair(scoreRound[0]) }]), 8, "A wrong repair must preserve 8 diagnosis points");
assert.equal(scoreRepairProgress(scoreRound, []), 0, "An untouched draft must score zero");

assert.match(component, /type Phase = "diagnosis" \| "repair" \| "result"/, "The module must keep the required three-phase flow");
for (const panel of ["SignRepairPanel", "NumericRepairPanel", "UnitRepairPanel", "DelayRepairPanel", "RelationRepairPanel", "BehaviorRepairPanel"]) assert.match(component, new RegExp(`function ${panel}`));
assert.match(component, /window\.setTimeout\([\s\S]*560/, "Diagnosis feedback must advance automatically");
assert.match(component, /window\.setTimeout\([\s\S]*1250/, "Visual test must auto-advance in 1–1.5 seconds");
assert.doesNotMatch(component, />\s*(İleri|Sonraki|Next|Continue)\s*</, "The game must not add a manual next button");
assert.match(component, /gameId: "week-6-simulation-repair-v2"/);
assert.match(component, /completionReason: reason/);
assert.match(component, /onDraft\?\.\(submissionFor/, "Every interaction path must support draft persistence");

assert.match(selector, /id: 2, title: "2\. Simülasyon Tamircisi"/);
assert.doesNotMatch(selector, /weekSixModules[\s\S]*id: 3/, "Week 6 Module 3 must not be built by this task");
assert.match(studentPage, /Week6SimulationRepair/);
assert.match(studentPage, /session\.selected_week === 6 && session\.current_module === 2/);
assert.match(studentPage, /session\.selected_week === 6 && session\.current_module <= 2/);
assert.match(teacherPage, /session\.selected_week === 6 && currentModule <= 2/);
assert.match(countdown, /weekSixModuleTwoBrief/);
assert.match(demo, /function WeekSixSimulationRepairDemo/);
assert.match(demo, /100 \+ 20 − 12 = 108/, "How-to demo must use a real V01 case");

const repairCss = css.slice(css.indexOf("Week 6 · Module 2: Simulation Repairer"), css.indexOf("Week 6 · Module 2 countdown example"));
assert.match(repairCss, /min-height: 44px/g, "Touch controls must remain at least 44px");
assert.match(css, /\.simulation-repair-shell \{ max-height: calc\(100dvh - 52px - env\(safe-area-inset-bottom\)\)/, "Mobile game must account for navbar and safe area");
assert.doesNotMatch(repairCss, /font-size:\s*(?:[1-9](?:\.\d+)?)px/, "Module 2 must not shrink readable text below 10px");

assert.match(migration, /week6_simulation_repair_part_score/);
assert.match(migration, /week6_simulation_repair_score/);
assert.match(migration, /target_week_id = 6 and target_module_id = 2/);
assert.match(migration, /record ->> 'caseId' is distinct from case_id/, "Server scoring must bind progress to selected ordinal case IDs");
assert.match(migration, /count\(distinct public\.week6_simulation_repair_category\(value\)\)/, "Server scoring must enforce five distinct mechanics");
assert.match(migration, /not between 2 and 3/, "Server scoring must enforce diagnosis balance");
assert.doesNotMatch(migration.slice(migration.indexOf("week6_simulation_repair_score"), migration.indexOf("create or replace function public.validated_module_score")), /claimed_score|isCorrect|score'/, "Module score must never trust client score or correctness flags");
assert.match(migration, /selected_week = 6 and target_session\.current_module in \(1, 2\)\) then 0/, "Week 6 Module 2 must not receive a speed bonus");
assert.doesNotMatch(migration, /create policy|alter table[\s\S]*enable row level security|grant select|service_role.*NEXT_PUBLIC/i, "The migration must not broaden table or browser privileges");

console.log("Week 6 Simulation Repairer validation passed: 24 cases, balanced seeded rounds, 8 repair mechanics, 100-point scoring, partial scoring, integration, responsive rules, and trusted SQL recomputation.");
