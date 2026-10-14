import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  HUNTER_CORRECT_OPPORTUNITIES,
  HUNTER_LEVEL_DURATION_MS,
  HUNTER_MAX_HIT_SCORE,
  HUNTER_TASK_TRANSITION_MS,
  HUNTER_TASK_WINDOW_MS,
  HUNTER_TARGET_DURATION_MS,
  arcadeScoreFor,
  buildProblemHunterRound,
  normalizedHunterScore,
  problemHunterPool,
  taskForLevelTime,
} from "../src/components/modules/Week5_ProblemHunter/problemHunterContent.ts";

const component = await readFile(new URL("../src/components/modules/Week5_ProblemHunter/index.tsx", import.meta.url), "utf8");
const studentPage = await readFile(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const teacherPage = await readFile(new URL("../src/app/teacher/session/[pin]/page.tsx", import.meta.url), "utf8");
const selector = await readFile(new URL("../src/components/teacher/ModuleSelector.tsx", import.meta.url), "utf8");
const countdown = await readFile(new URL("../src/components/common/ModuleStartCountdown.tsx", import.meta.url), "utf8");
const demo = await readFile(new URL("../src/components/common/ModuleGameplayDemo.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/202610140021_week_five_problem_hunter.sql", import.meta.url), "utf8");

const categories = ["event", "pattern", "structure"];
const contexts = ["production", "logistics", "sales", "inventory", "quality", "service"];

assert.equal(problemHunterPool.length, 90, "The pool must contain exactly 90 targets");
assert.equal(new Set(problemHunterPool.map((item) => item.id)).size, 90, "All pool IDs must be unique");
for (const category of categories) {
  assert.equal(problemHunterPool.filter((item) => item.category === category).length, 30, `${category} must contain 30 targets`);
  for (const context of contexts) {
    assert.equal(problemHunterPool.filter((item) => item.category === category && item.context === context).length, 5, `${category}/${context} must contain five targets`);
  }
}
for (const item of problemHunterPool) {
  assert.ok(item.text.tr && item.text.en && item.explanation.tr && item.explanation.en, `${item.id} must be bilingual`);
  assert.ok(item.icon, `${item.id} must include an icon`);
  assert.ok(item.text.tr.length <= 70 && item.text.en.length <= 70, `${item.id} must remain readable on a short-lived target`);
}
assert.equal(new Set(problemHunterPool.map((item) => item.text.tr)).size, 90, "Turkish target text must be unique");
assert.equal(new Set(problemHunterPool.map((item) => item.text.en)).size, 90, "English target text must be unique");

const round = buildProblemHunterRound("session:student:5:2:1");
const repeatedRound = buildProblemHunterRound("session:student:5:2:1");
const nextRun = buildProblemHunterRound("session:student:5:2:2");
assert.deepEqual(round, repeatedRound, "The same technical run seed must be deterministic");
assert.notDeepEqual(round.map((target) => target.id), nextRun.map((target) => target.id), "A new technical run must vary the target selection");
assert.equal(HUNTER_LEVEL_DURATION_MS, 35_000, "Every level must provide 35 seconds of active play");
assert.equal(HUNTER_TASK_WINDOW_MS, 10_000, "The shifting mission must change every ten active seconds");
assert.equal(HUNTER_TASK_TRANSITION_MS, 1_500, "Mission changes must remain readable for 1.5 seconds");
assert.deepEqual(HUNTER_TARGET_DURATION_MS, [4_500, 4_000, 3_500], "Target visibility must slow to the requested readable durations");
assert.equal(round.length, 42, "A play must schedule the complete non-overlapping target calendar");
assert.equal(new Set(round.map((target) => target.id)).size, round.length, "No target may repeat within one play");
assert.deepEqual([0, 1, 2].map((level) => round.filter((target) => target.level === level).length), [7, 14, 21]);
for (const target of round) assert.equal(target.durationMs, HUNTER_TARGET_DURATION_MS[target.level], `Level ${target.level + 1} uses the wrong visibility duration`);

for (const [level, maximum] of [[0, 1], [1, 2], [2, 3]]) {
  for (let time = 0; time <= HUNTER_LEVEL_DURATION_MS; time += 50) {
    const active = round.filter((target) => target.level === level && time >= target.spawnAtMs && time < target.spawnAtMs + target.durationMs);
    assert.ok(active.length <= maximum, `Level ${level + 1} exceeded its ${maximum}-target concurrency cap at ${time}ms`);
    assert.equal(new Set(active.map((target) => target.hole)).size, active.length, `Two live targets shared a hole at level ${level + 1}/${time}ms`);
  }
}

for (let phase = 0; phase < 4; phase += 1) {
  const start = phase * HUNTER_TASK_WINDOW_MS;
  const end = start + HUNTER_TASK_WINDOW_MS;
  const phaseTargets = round.filter((target) => target.level === 2 && target.spawnAtMs >= start && target.spawnAtMs < end);
  const task = taskForLevelTime(2, start);
  assert.ok(phaseTargets.some((target) => target.category === task), `Phase ${phase + 1} must guarantee a correct target`);
  assert.ok(phaseTargets.every((target) => target.spawnAtMs + target.durationMs <= end), `Phase ${phase + 1} targets must clear before the next mission`);
}
assert.deepEqual([0, 1, 2, 3].map((phase) => taskForLevelTime(2, phase * HUNTER_TASK_WINDOW_MS)), ["event", "pattern", "structure", "event"]);

const action = (outcome, points, targetId) => ({ targetId, level: 0, task: "structure", category: "structure", outcome, points, atMs: 0 });
assert.equal(arcadeScoreFor([action("correct", 10, "a"), action("wrong", -5, "b"), action("miss", -2, "c")]), 3, "Correct, wrong, and missed scoring must be +10/-5/-2");
assert.equal(arcadeScoreFor([action("wrong", -5, "a"), action("miss", -2, "b")]), 0, "Arcade score must never become negative");
const perfect = Array.from({ length: HUNTER_CORRECT_OPPORTUNITIES }, (_, index) => action("correct", 10, String(index)));
assert.equal(HUNTER_MAX_HIT_SCORE, HUNTER_CORRECT_OPPORTUNITIES * 10);
assert.equal(normalizedHunterScore(perfect), 100, "The fixed correct-opportunity cap must normalize a perfect play to 100");
assert.equal(normalizedHunterScore([...perfect, action("correct", 10, "extra")]), 100, "The module score must be capped at 100");

assert.match(component, /resolvedIds\.current\.has\(target\.id\)/, "Targets must be protected against duplicate clicks");
assert.match(component, /document\.hidden/, "The game timer must pause in a background tab");
assert.match(component, /setIsHidden\(hidden\);\s*lastTick\.current = performance\.now\(\);\s*saveDraft/, "Visibility changes must preserve progress before pausing or resuming");
assert.match(component, /transitionRemainingRef\.current > 0[\s\S]*return;/, "Mission transition time must not consume active game time");
assert.match(component, /taskTransitionRemainingMs/, "An in-progress mission transition must survive draft restore");
assert.match(component, /forceSubmit[\s\S]*finalize\("teacher-ended"\)/, "Teacher finish must save a partial result");
assert.match(component, /onDraft/, "Meaningful progress must be draftable");
assert.match(component, /const nextCheckpoint = Math\.floor\(nextElapsed \/ 5_000\);[\s\S]*if \(nextCheckpoint > draftCheckpoint\.current\)[\s\S]*saveDraft/, "The timer may checkpoint progress only at bounded five-second intervals");
assert.match(studentPage, /session\.selected_week === 5 && session\.current_module === 2[\s\S]*<Week5ProblemHunter/);
assert.match(teacherPage, /session\.selected_week === 5 && currentModule <= 3/);
assert.match(selector, /id: 2, title: "Sorun Avcısı"/);
assert.match(countdown, /weekFiveModuleTwoBrief/);
assert.match(demo, /WeekFiveProblemHunterDemo/);
assert.match(css, /\.hunter-board[\s\S]*grid-template-columns: repeat\(3/);
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.hunter-board[\s\S]*grid-template-columns: repeat\(3/, "The required 2×3 board must remain intact on mobile");
assert.match(css, /@media \(max-width: 390px\)[\s\S]*\.hunter-hud \{ grid-template-columns: 1fr;/, "The HUD must stack safely at 320–390px and large system fonts");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.hunter-target[^\{]*\{ animation: none/);

assert.doesNotMatch(migration, /create table|alter table|drop table/i, "Module 2 enablement must not introduce a new table");
assert.match(migration, /selected_week = 5 and target_module_id > 2/, "Week 5 Module 2 must be enabled and later modules must remain locked");
assert.match(migration, /current_run_number = current_run_number \+ 1/, "The technical run number must remain monotonic");
assert.match(migration, /module_turn_counters = jsonb_set/, "Visible module-based play counters must remain intact");

console.log("Week 5 Problem Hunter content, schedule, scoring, responsive integration, and migration validation passed");
