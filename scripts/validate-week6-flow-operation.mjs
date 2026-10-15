import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  allFlowScenarios,
  buildFlowOperationRound,
  graphSimulation,
  missingCorrectFlow,
  scoreFlowRecords,
  tankCorrectOutflow,
  timelineDirection,
  timelinePool,
  timelineValues,
  warehouseCorrectRate,
  warehousePool,
  tankPool,
  missingPool,
  graphPool,
} from "../src/components/modules/Week6_FlowOperation/flowOperationContent.ts";

const component = await readFile(new URL("../src/components/modules/Week6_FlowOperation/index.tsx", import.meta.url), "utf8");
const demo = await readFile(new URL("../src/components/common/ModuleGameplayDemo.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const student = await readFile(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const teacher = await readFile(new URL("../src/app/teacher/session/[pin]/page.tsx", import.meta.url), "utf8");
const selector = await readFile(new URL("../src/components/teacher/ModuleSelector.tsx", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/202610150028_week_six_flow_operation.sql", import.meta.url), "utf8");

assert.deepEqual([warehousePool.length, tankPool.length, missingPool.length, timelinePool.length, graphPool.length], [6, 6, 6, 6, 6], "Each stage needs six scenarios");
assert.equal(allFlowScenarios.length, 30, "The total pool must contain 30 scenarios");
assert.equal(new Set(allFlowScenarios.map((scenario) => scenario.id)).size, 30, "Scenario IDs must be unique");

assert.deepEqual(warehousePool.map(warehouseCorrectRate), [14, 14, 20, 13, 17, 12], "Warehouse targets must be mathematically exact");
warehousePool.forEach((scenario) => assert.ok(scenario.productionChoices.includes(warehouseCorrectRate(scenario)), `${scenario.id} must show its correct rate`));
assert.deepEqual(tankPool.map(tankCorrectOutflow), [16, 16, 15, 20, 16, 18], "Tank valve solutions must be exact");
assert.deepEqual(missingPool.map(missingCorrectFlow), [10, 10, 9, 14, 10, 10], "Missing flows must be exact");
assert.deepEqual(timelinePool.map((scenario) => timelineValues(scenario).at(-1)), [53, 52, 35, 93, 42, 70], "Two-day simulation results must be exact");
assert.deepEqual(timelinePool.map(timelineDirection), ["up", "down", "flat", "up", "down", "flat"], "Trend directions must follow the simulation");
assert.deepEqual(graphPool.map((scenario) => graphSimulation(scenario).values), [
  [20, 24, 28, 32], [70, 65, 60, 55], [50, 50, 50, 50],
  [90, 98, 100, 100], [40, 44, 38, 45], [10, 4, 0, 0],
], "Graph curves must be generated from the stock formula and boundaries");
assert.equal(graphSimulation(graphPool[3]).overflow, 14, "Overflow must be reported separately from capped stock");

for (const seed of ["alpha", "alpha", "mobile", "another-run", "student-42"]) {
  const round = buildFlowOperationRound(seed);
  assert.deepEqual(round.map((scenario) => scenario.kind), ["warehouse", "tank", "missing", "timeline", "graph"], "Every round must keep the five-stage order");
  assert.equal(buildFlowOperationRound(seed).map((scenario) => scenario.id).join(","), round.map((scenario) => scenario.id).join(","), "Seeded rounds must be stable after refresh");
}

const round = buildFlowOperationRound("score-check");
const perfect = round.map((scenario) => ({
  scenarioId: scenario.id,
  action: scenario.kind === "warehouse" ? { kind: "warehouse", productionRate: warehouseCorrectRate(scenario) }
    : scenario.kind === "tank" ? { kind: "tank", outflowRate: tankCorrectOutflow(scenario) }
    : scenario.kind === "missing" ? { kind: "missing", flowValue: missingCorrectFlow(scenario) }
    : scenario.kind === "timeline" ? { kind: "timeline", direction: timelineDirection(scenario) }
    : { kind: "graph", graphId: `${scenario.id}-model` },
}));
assert.equal(scoreFlowRecords(round, perfect), 100, "Five correct operations must score 100");
assert.equal(scoreFlowRecords(round, perfect.slice(0, 3)), 60, "Early teacher finish must preserve completed tasks");
assert.equal(scoreFlowRecords(round, perfect.map((record, index) => index === 0 ? { ...record, scenarioId: "A0" } : record)), 80, "A record cannot score for a different scenario");

for (const game of ["WarehouseGame", "TankGame", "MissingFlowGame", "TimelineGame", "GraphGame"]) assert.match(component, new RegExp(`function ${game}\\(`), `${game} must have a dedicated mechanic`);
assert.match(component, /Akışı Başlat/);
assert.match(component, /Kontrol Et/);
assert.match(component, /onChoose\("up"\)[\s\S]*onChoose\("flat"\)[\s\S]*onChoose\("down"\)/, "Timeline must expose three directional controls");
assert.match(component, /<polyline points=\{graphPoints\(choice\.values\)\}/, "Graph choices must be tappable SVG curves");
assert.doesNotMatch(component, />\s*(Sonraki|İleri|Next|Continue)\s*</, "Stages must advance automatically");
assert.match(component, /gameId: "week-6-flow-operation-v2"/);
assert.match(component, /completionStatus: reason === "completed" \? "completed" : reason === "teacher-ended" \? "incomplete"/, "Teacher-ended plays must remain incomplete");
assert.match(component, /onDraft\?\.\(submissionFor/, "Progress must be drafted after interactions");
assert.match(demo, /function WeekSixFlowOperationDemo/);
assert.match(demo, /40 \+ \(14 − 8\) × 2 = 52/, "The countdown must demonstrate a real stock calculation");

assert.match(css, /\.number-stepper \{ width: 48px; height: 48px/);
assert.match(css, /@media \(max-width: 600px\)[\s\S]*max-height: calc\(100dvh - 52px/, "Mobile layout must fit the dynamic viewport");
assert.match(css, /@media \(max-width: 340px\), \(max-height: 590px\)/, "Small phones need a compact layout");
assert.match(css, /\.flow-graph-card\.selected polyline/, "Only the selected graph should animate");

assert.match(student, /session\.selected_week === 6 && session\.current_module === 1/);
assert.doesNotMatch(student, /session\.selected_week === 6 && session\.current_module === 3/, "Week 6 Module 3 must not be implemented");
assert.match(teacher, /session\.selected_week === 6 && currentModule <= 2/);
assert.match(selector, /title: "1\. Akış Operasyonu"/);
assert.equal((selector.match(/const weekSixModules/g) ?? []).length, 1);

assert.match(migration, /week6_flow_operation_score/);
assert.match(migration, /record -> 'action'/, "Server score must use meaningful actions");
assert.doesNotMatch(migration, /isCorrect|correctIndex/, "Server validation must not trust client correctness flags or answer indexes");
assert.match(migration, /selected_week = 6 and target_module_id <> 1/, "The database must enable only Week 6 Module 1");
assert.match(migration, /selected_week = 6 and target_session\.current_module = 1\) then 0/, "Week 6 Module 1 must never receive a speed bonus");
assert.doesNotMatch(migration, /create policy|grant select on table|alter table/, "The forward migration must not widen table access or RLS");

console.log("Week 6 Flow Operation validation passed");
