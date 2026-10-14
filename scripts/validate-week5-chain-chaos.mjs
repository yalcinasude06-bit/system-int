import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CHAIN_MAX_RAW_SCORE,
  CHAIN_SECTION_COUNTS,
  CHAIN_SECTION_DURATION_MS,
  CHAIN_TOTAL_PRODUCTS,
  activeWorkload,
  buildChainChaosScenario,
  chaosFor,
  normalizedChainScore,
  rawScoreFor,
} from "../src/components/modules/Week5_ChainChaos/chainChaosContent.ts";

const component = await readFile(new URL("../src/components/modules/Week5_ChainChaos/index.tsx", import.meta.url), "utf8");
const studentPage = await readFile(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const teacherPage = await readFile(new URL("../src/app/teacher/session/[pin]/page.tsx", import.meta.url), "utf8");
const selector = await readFile(new URL("../src/components/teacher/ModuleSelector.tsx", import.meta.url), "utf8");
const countdown = await readFile(new URL("../src/components/common/ModuleStartCountdown.tsx", import.meta.url), "utf8");
const demo = await readFile(new URL("../src/components/common/ModuleGameplayDemo.tsx", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/202610140020_week_five_chain_chaos.sql", import.meta.url), "utf8");

const first = buildChainChaosScenario("session:student:5:1:7");
const repeated = buildChainChaosScenario("session:student:5:1:7");
const otherRun = buildChainChaosScenario("session:student:5:1:8");
assert.deepEqual(first, repeated, "The same technical run seed must reproduce the exact product stream");
assert.notDeepEqual(first, otherRun, "A replay must receive a fresh deterministic product stream");
assert.equal(first.length, CHAIN_TOTAL_PRODUCTS, "The three stages must contain the declared total product count");
assert.equal(CHAIN_TOTAL_PRODUCTS, CHAIN_SECTION_COUNTS.reduce((sum, count) => sum + count, 0));
assert.equal(CHAIN_MAX_RAW_SCORE, CHAIN_TOTAL_PRODUCTS * 10);
assert.equal(CHAIN_SECTION_DURATION_MS, 30_000, "Each stage must last thirty seconds");

for (let section = 0; section < 3; section += 1) {
  const products = first.filter((product) => product.section === section);
  const good = products.filter((product) => product.kind === "good").length;
  const defective = products.length - good;
  assert.ok(Math.abs(good - defective) <= 1, `Stage ${section + 1} must be balanced`);
  assert.ok(Math.min(...products.map((product) => product.spawnAtMs)) >= 3_000, `Stage ${section + 1} must start with a safe orientation window`);
  assert.ok(Math.max(...products.map((product) => product.spawnAtMs)) < CHAIN_SECTION_DURATION_MS - 5_000, `Stage ${section + 1} must leave a fair decision window`);
}

const correctDecisions = first.map((product) => ({
  productId: product.id,
  section: product.section,
  kind: product.kind,
  route: product.kind === "good" ? "shipping" : "recycling",
  correct: true,
  points: 10,
  decidedAtMs: product.spawnAtMs + 2_500,
}));
assert.equal(rawScoreFor(correctDecisions), CHAIN_MAX_RAW_SCORE);
assert.equal(normalizedChainScore(correctDecisions), 100, "A perfect run must normalize to 100");
assert.equal(chaosFor(correctDecisions), 0);

const defectMistake = { ...correctDecisions[0], kind: "defective", route: "shipping", correct: false, points: -5 };
const wasteMistake = { ...correctDecisions[1], kind: "good", route: "recycling", correct: false, points: -5 };
assert.equal(chaosFor([defectMistake, wasteMistake]), 26, "The two mistake types must have visibly different systemic costs");
assert.equal(activeWorkload([defectMistake], defectMistake.section, defectMistake.decidedAtMs + 2_700), 0, "A complaint must precede return workload");
assert.equal(activeWorkload([defectMistake], defectMistake.section, defectMistake.decidedAtMs + 3_000), 1, "A delayed return must create workload");

assert.match(component, /event\.key === "ArrowLeft"/);
assert.match(component, /event\.key === "ArrowRight"/);
assert.match(component, /document\.hidden/, "Background tabs must pause the local game clock");
assert.match(component, /void onDraft\?\./, "Meaningful checkpoints must persist as drafts");
assert.doesNotMatch(component, /onDraft[\s\S]{0,100}(requestAnimationFrame|setInterval)/, "The render loop must not write every frame to the database");
assert.match(component, /if \(forceSubmit && !completedRef\.current/, "Teacher finish must persist a partial result");
assert.match(component, /submissionStarted\.current/, "Natural finish and force finish must share a single-submit guard");
assert.match(component, /const activeSection = sectionRef\.current/, "A critical transition must not process the next stage with the previous stage clock");
assert.match(component, /item\.section === product\.section/, "The critical chaos threshold must be scoped to the active stage");
assert.match(component, /complaint|şikâyet/i, "The delayed complaint chain must be visible in the system UI");
assert.match(component, /chain-return-belt/, "Returned products must be visible on a dedicated return belt");

assert.match(studentPage, /session\.selected_week === 5 && session\.current_module === 1/);
assert.match(studentPage, /<Week5ChainChaos/);
assert.match(teacherPage, /session\.selected_week === 5 && currentModule === 1/);
assert.match(selector, /title: "Zincirleme Kaos"/);
assert.match(countdown, /weekId === 5 && moduleId === 1/);
assert.match(demo, /WeekFiveChainChaosDemo/);
assert.match(migration, /target_session\.selected_week = 5 and target_module_id > 1/);
assert.match(migration, /target_session\.selected_week not in \(1, 3, 4, 5\)/);
assert.match(migration, /current_run_number = current_run_number \+ 1/);
assert.match(migration, /next_module_turn :=[\s\S]*\+ 1/);
assert.doesNotMatch(migration, /create table/i, "Week 5 Module 1 must reuse the current run/draft/submission model");

console.log("Week 5 Chain-Reaction Chaos validation passed");
