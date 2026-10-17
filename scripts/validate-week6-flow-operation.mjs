import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  allFlowScenarios,
  buildFlowOperationRound,
  calculateFinalStock,
  durationPool,
  finalPool,
  flowScenarioPools,
  initialPool,
  productionPool,
  scoreFlowRecords,
  shippingPool,
  shuffledFlowChoices,
  simulateFlowSelection,
} from "../src/components/modules/Week6_FlowOperation/flowOperationContent.ts";

const component = await readFile(new URL("../src/components/modules/Week6_FlowOperation/index.tsx", import.meta.url), "utf8");
const demo = await readFile(new URL("../src/components/common/ModuleGameplayDemo.tsx", import.meta.url), "utf8");
const countdown = await readFile(new URL("../src/components/common/ModuleStartCountdown.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const student = await readFile(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const teacher = await readFile(new URL("../src/app/teacher/session/[pin]/page.tsx", import.meta.url), "utf8");
const selector = await readFile(new URL("../src/components/teacher/ModuleSelector.tsx", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/202610150030_week_six_flow_five_variables.sql", import.meta.url), "utf8");

assert.deepEqual(Object.values(flowScenarioPools).map((pool) => pool.length), [6, 6, 6, 6, 6], "Each variable type needs six scenarios");
assert.equal(allFlowScenarios.length, 30, "The fixed pool must contain 30 scenarios");
assert.deepEqual(allFlowScenarios.map(({ id }) => id), Array.from({ length: 30 }, (_, index) => `Q${String(index + 1).padStart(2, "0")}`));
assert.equal(new Set(allFlowScenarios.map(({ id }) => id)).size, 30, "Scenario IDs must be unique");

assert.deepEqual(productionPool.map(({ answer }) => answer), [14, 8, 4, 9, 4, 11]);
assert.deepEqual(shippingPool.map(({ answer }) => answer), [8, 6, 8, 6, 6, 8]);
assert.deepEqual(finalPool.map(({ answer }) => answer), [55, 48, 37, 82, 45, 72]);
assert.deepEqual(durationPool.map(({ answer }) => answer), [3, 3, 3, 2, 4, 3]);
assert.deepEqual(initialPool.map(({ answer }) => answer), [50, 48, 65, 60, 75, 50]);

for (const scenario of allFlowScenarios) {
  assert.equal(calculateFinalStock(scenario.initial, scenario.production, scenario.shipping, scenario.duration), scenario.final, `${scenario.id} must obey the stock equation`);
  assert.equal(scenario.answer, scenario[scenario.kind], `${scenario.id} answer must be its hidden semantic variable`);
  assert.equal(scenario.choices.length, 3, `${scenario.id} must have three choices`);
  assert.equal(new Set(scenario.choices).size, 3, `${scenario.id} choices must be unique`);
  assert.ok(scenario.choices.includes(scenario.answer), `${scenario.id} must expose its correct answer`);
  for (const choice of scenario.choices) {
    const simulated = simulateFlowSelection(scenario, choice);
    assert.equal(simulated.final, calculateFinalStock(simulated.initial, simulated.production, simulated.shipping, simulated.duration), `${scenario.id} must really simulate choice ${choice}`);
  }
  assert.equal(simulateFlowSelection(scenario, scenario.answer).final, scenario.final, `${scenario.id} correct choice must reach its final stock`);
  assert.equal(scoreFlowRecords([scenario], [{ scenarioId: scenario.id, action: { kind: scenario.kind, value: scenario.answer } }]), 20, `${scenario.id} correct choice must score 20`);
  const wrongChoice = scenario.choices.find((choice) => choice !== scenario.answer);
  assert.notEqual(wrongChoice, undefined, `${scenario.id} needs a wrong choice`);
  assert.equal(scoreFlowRecords([scenario], [{ scenarioId: scenario.id, action: { kind: scenario.kind, value: wrongChoice } }]), 0, `${scenario.id} wrong choice must score 0`);
}

const orders = new Set();
const correctPositions = new Set();
for (const seed of ["alpha", "mobile", "another-run", "student-42", "position-a", "position-b", "position-c", "position-d"]) {
  const round = buildFlowOperationRound(seed);
  assert.equal(round.length, 5);
  assert.equal(new Set(round.map(({ kind }) => kind)).size, 5, "Every round must contain exactly one question of every type");
  assert.equal(new Set(round.map(({ id }) => id)).size, 5, "Every round must contain five different scenarios");
  assert.deepEqual(buildFlowOperationRound(seed).map(({ id }) => id), round.map(({ id }) => id), "A seed must restore the same selected scenarios and order");
  orders.add(round.map(({ kind }) => kind).join(","));
  const scenario = round[0];
  const choices = shuffledFlowChoices(scenario, seed);
  assert.deepEqual(shuffledFlowChoices(scenario, seed), choices, "Choice order must restore after refresh");
  assert.deepEqual([...choices].sort((a, b) => a - b), [...scenario.choices].sort((a, b) => a - b));
  correctPositions.add(choices.indexOf(scenario.answer));
}
assert.ok(orders.size > 1, "Question order should vary by run");
assert.ok(correctPositions.size > 1, "Correct answers must not stay at one visual position");

const round = buildFlowOperationRound("score-check");
const perfect = round.map((scenario) => ({ scenarioId: scenario.id, action: { kind: scenario.kind, value: scenario.answer } }));
assert.equal(scoreFlowRecords(round, perfect), 100, "Five semantic answers must score 100");
assert.equal(scoreFlowRecords(round, perfect.slice(0, 3)), 60, "Teacher early finish must preserve completed tasks");
assert.equal(scoreFlowRecords(round, perfect.map((record, index) => index === 0 ? { ...record, scenarioId: "Q99" } : record)), 80, "An answer cannot score for another scenario");
assert.equal(scoreFlowRecords(round, perfect.map((record, index) => index === 0 ? { ...record, action: { ...record.action, kind: "final" } } : record)), round[0].kind === "final" ? 100 : 80, "Scoring must validate the semantic question kind");

assert.match(component, /function FactoryFlowGame\(/);
for (const oldGame of ["WarehouseGame", "TankGame", "MissingFlowGame", "TimelineGame", "GraphGame"]) assert.doesNotMatch(component, new RegExp(`function ${oldGame}\\(`), `Old ${oldGame} mechanic must be removed`);
for (const marker of ["flow-one-factory", "flow-one-conveyor", "flow-one-depot", "flow-one-truck", "flow-one-calendar"]) assert.match(component, new RegExp(marker), `The unified scene needs ${marker}`);
assert.match(component, /data-question-kind=\{scenario\.kind\}/);
assert.match(component, /data-value=\{value\}/);
assert.match(component, /simulateFlowSelection\(current, value\)/, "Wrong choices must run the real stock calculation");
assert.match(component, /const productionDisplay = productionValue === "\?" \? "\?" : `\+\$\{productionValue\}`/, "Production must visibly use the positive-flow sign");
assert.match(component, /const shippingDisplay = shippingValue === "\?" \? "\?" : `−\$\{shippingValue\}`/, "Shipping must visibly use the negative-flow sign");
assert.match(component, /\{result && <div className="flow-one-stock"/, "Live stock must only appear after the flow starts");
assert.doesNotMatch(component, /visibleStock \?\? "\?"/, "The warehouse must not leak or duplicate the hidden initial stock");
assert.match(component, /role="group" aria-label=\{questionPrompt\(scenario, text\)\}/, "Choices need a semantic accessible group label");
assert.match(component, /role="status" aria-live="polite" aria-atomic="true"/, "Feedback must be announced without interrupting the learner");
assert.match(component, /flow-one-choice-status/, "Correct and wrong choices need a non-color status marker");
assert.match(component, /choices\.map/);
assert.match(component, /disabled=\{Boolean\(result\)\}/, "A choice must lock immediately");
assert.doesNotMatch(component, />\s*(Kontrol Et|Akışı Başlat|Sonraki|İleri|Check|Next|Continue)\s*</, "Question flow must not expose a manual advance/check button");
assert.match(component, /gameId: "week-6-flow-operation-v3"/);
assert.match(component, /const hydratedRecords = useMemo\(\(\) => hydrateDraft\(existingDraft, round\)/, "A refresh must restore the validated draft");
assert.match(component, /useState\(Math\.min\(hydratedRecords\.length, 4\)\)/, "A restored draft must resume at the next task");
assert.match(component, /completionStatus: reason === "completed" \? "completed" : reason === "teacher-ended" \? "incomplete"/);
assert.match(component, /onDraft\?\.\(submissionFor/, "Every answered question must persist a draft");
assert.match(component, /finalize\("teacher-ended"\)/, "Teacher early finish must submit partial progress");
assert.match(demo, /function WeekSixFlowOperationDemo/);
assert.match(demo, /40 \+ \(14 − 8\) × 2 = 52/, "The introduction must demonstrate a real stock calculation");
assert.doesNotMatch(countdown, /Beş mini oyunda/);
assert.match(countdown, /beş değişkenden eksik olanı bul/);

const newCss = css.slice(css.indexOf("Week 6 · Module 1: one factory"), css.indexOf("Week 6 · Module 2"));
assert.match(newCss, /height: calc\(100dvh - 60px - env\(safe-area-inset-bottom\)\)/, "The game must account for the real mobile navbar and page inset");
assert.match(newCss, /overflow: visible/, "The module shell must not clip choices or feedback");
assert.match(newCss, /@media \(max-width: 600px\)/, "The scene needs a mobile layout");
assert.match(newCss, /@media \(max-width: 340px\), \(max-height: 590px\)/, "Small phones need an extra compact layout");
assert.match(newCss, /\.flow-one-options button[\s\S]*min-height: 58px/);
assert.match(newCss, /\.flow-one-conveyor\.*/);
assert.match(newCss, /@media \(prefers-reduced-motion: reduce\)/, "Reduced-motion users need a stable scene");
assert.match(newCss, /@media \(forced-colors: active\)/, "Question and answer state must survive forced-colors mode");
for (const value of [...newCss.matchAll(/font-size:\s*([0-9.]+)px/g)].map((match) => Number(match[1]))) assert.ok(value >= 10, `Visible type must remain readable (found ${value}px)`);
for (const [width, height] of [[320, 568], [360, 640], [375, 667], [390, 844]]) {
  const availableHeight = height - 60;
  const compactContentHeight = height <= 590 ? 184 + 50 + 38 + 8 : 205 + 54 + 42 + 10;
  assert.ok(width >= 320 && compactContentHeight < availableHeight, `${width}x${height} must have room for the scene, all choices, and feedback`);
}

assert.match(student, /session\.selected_week === 6 && session\.current_module === 1/);
assert.match(student, /session\.selected_week === 6 && session\.current_module === 3/, "Week 6 Module 3 must remain integrated without changing Module 1 gameplay");
assert.match(teacher, /session\.selected_week === 6 && currentModule <= 3/);
assert.match(selector, /title: "1\. Akış Operasyonu"/);
assert.match(selector, /5 soru · 30 stok-akış senaryosu/);
assert.doesNotMatch(selector, /5 mini oyun/);
assert.equal((selector.match(/const weekSixModules/g) ?? []).length, 1);

assert.match(migration, /week6_flow_operation_question_kind/);
assert.match(migration, /week6_flow_operation_question_score/);
assert.match(migration, /week-6-flow-operation-v3/);
assert.match(migration, /week-6-flow-operation-v2/, "Old drafts must retain the old secure scorer");
assert.match(migration, /record -> 'action'/, "Server score must use semantic actions");
assert.match(migration, /count\(distinct public\.week6_flow_operation_question_kind\(value\)\) from jsonb_array_elements_text\(selected\)\) <> 5/, "Server must require one scenario from every type");
assert.doesNotMatch(migration, /isCorrect|correctIndex/, "Server validation must not trust client correctness or position");
assert.doesNotMatch(migration, /create policy|grant select on table|alter table/, "The forward migration must not widen table access or RLS");
assert.match(migration, /week6_simulation_repair_score/, "Module 2 validation must remain wired");

console.log("Week 6 Flow Operation five-variable validation passed");
