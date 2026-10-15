import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildWeekSixRound, flowOperationPool, modelAgencyPool, simulationRepairPool, validatedWeekSixScore } from "../src/components/modules/Week6_Modules/weekSixContent.ts";

const component = readFileSync(new URL("../src/components/modules/Week6_Modules/index.tsx", import.meta.url), "utf8");
const studentPage = readFileSync(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const selector = readFileSync(new URL("../src/components/teacher/ModuleSelector.tsx", import.meta.url), "utf8");
const countdown = readFileSync(new URL("../src/components/common/ModuleStartCountdown.tsx", import.meta.url), "utf8");
const demo = readFileSync(new URL("../src/components/common/ModuleGameplayDemo.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/202610150027_week_six_modules.sql", import.meta.url), "utf8");

assert.equal(flowOperationPool.length, 30, "Flow Operation must have 30 tasks");
assert.equal(simulationRepairPool.length, 24, "Simulation Repair Shop must have 24 cases");
assert.equal(modelAgencyPool.length, 24, "Model Agency must have 24 briefs");
for (const [name, pool] of [["flow", flowOperationPool], ["repair", simulationRepairPool], ["agency", modelAgencyPool]]) {
  assert.equal(new Set(pool.map((task) => task.id)).size, pool.length, `${name} task IDs must be unique`);
  for (const task of pool) {
    for (const value of [task.title, task.prompt, task.detail, ...task.options]) {
      assert.ok(value.tr.trim() && value.en.trim(), `${task.id} must be bilingual`);
    }
    assert.ok(task.correctIndex >= 0 && task.correctIndex <= 3, `${task.id} must have a valid answer key`);
  }
}
assert.deepEqual([...new Set(flowOperationPool.map((task) => task.category))].sort(), ["graph","missing-flow","overflow","prediction","target"]);
assert.deepEqual([...new Set(simulationRepairPool.map((task) => task.category))].sort(), ["behavior","capacity","conversion","delay","initial","relation","sign","timestep"]);
for (const tool of ["physical", "analog", "schematic", "mathematical"]) assert.equal(modelAgencyPool.filter((task) => task.category === tool).length, 6, `${tool} must have six briefs`);

for (const variant of ["flow", "repair", "agency"]) {
  for (let run = 0; run < 80; run += 1) {
    const seed = `session:student:6:${variant}:${run}`;
    const round = buildWeekSixRound(variant, seed);
    assert.equal(round.length, 5);
    assert.equal(new Set(round.map((task) => task.id)).size, 5);
    assert.deepEqual(round.map((task) => task.id), buildWeekSixRound(variant, seed).map((task) => task.id), "Rounds must survive refresh deterministically");
    if (variant === "flow") assert.equal(new Set(round.map((task) => task.category)).size, 5, "Every flow round must cover all five task types");
    if (variant === "repair") assert.equal(new Set(round.map((task) => task.category)).size, 5, "Every repair round must cover five distinct issue types");
    if (variant === "agency") assert.equal(new Set(round.map((task) => task.category)).size, 4, "Every agency round must cover all four model tools");
    const selected = round.map((task) => task.id);
    const perfect = round.map((task) => ({ taskId: task.id, selectedIndex: task.correctIndex }));
    assert.equal(validatedWeekSixScore(selected, perfect), 100);
    assert.equal(validatedWeekSixScore(selected, perfect.slice(0, 3)), 60);
  }
}

assert.match(component, /window\.setTimeout\(\(\) => \{/);
assert.match(component, /feedbackDuration = 950/);
assert.doesNotMatch(component, />\s*(Sonraki|Next|Devam Et|Continue)\s*</, "No next-stage button may exist");
assert.match(styles, /\.week-six-options \{[^}]*grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
assert.match(studentPage, /Week6FlowOperation/);
assert.match(studentPage, /Week6SimulationRepair/);
assert.match(studentPage, /Week6ModelAgency/);
assert.match(selector, /title: "Akış Operasyonu"[\s\S]*title: "Simülasyon Tamircisi"[\s\S]*title: "Model Ajansı"/);
assert.match(countdown, /Module 1: Flow Operation/);
assert.match(demo, /function WeekSixFlowOperationDemo/);
assert.match(styles, /max-height: calc\(100dvh - 58px - env\(safe-area-inset-bottom\)\)/, "Week 6 must fit the phone viewport");
assert.match(styles, /@media \(max-width: 360px\), \(max-height: 650px\)/, "Small-phone layout must be explicit");
assert.match(migration, /target_session\.selected_week in \(3, 4, 5, 6\)/);
assert.match(migration, /public\.week6_module_score/);
assert.match(migration, /count\(distinct value\)/);
assert.match(migration, /grant execute on function public\.week6_module_score\(int, jsonb\) to service_role/);
assert.doesNotMatch(migration, /grant (select|insert|update|delete).* to (anon|authenticated)/i, "Week 6 must not widen table access");

console.log("Week 6 module validation passed");
