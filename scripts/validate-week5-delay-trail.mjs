import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DELAY_TRAIL_CASES,
  DELAY_TRAIL_MAX_SCORE,
  DELAY_TRAIL_SECOND_CHANCE_MS,
  DELAY_TRAIL_STAGE_COUNT,
  buildDelayTrailRound,
  pointsForDelayTrailRecord,
  validatedDelayTrailScore,
} from "../src/components/modules/Week5_DelayTrail/delayTrailContent.ts";

const component = await readFile(new URL("../src/components/modules/Week5_DelayTrail/index.tsx", import.meta.url), "utf8");
const studentPage = await readFile(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const selector = await readFile(new URL("../src/components/teacher/ModuleSelector.tsx", import.meta.url), "utf8");
const countdown = await readFile(new URL("../src/components/common/ModuleStartCountdown.tsx", import.meta.url), "utf8");
const demo = await readFile(new URL("../src/components/common/ModuleGameplayDemo.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/202610150023_week_five_delay_trail.sql", import.meta.url), "utf8");

assert.equal(DELAY_TRAIL_CASES.length, 25, "The case bank must include all 25 cases");
assert.equal(DELAY_TRAIL_STAGE_COUNT, 5);
assert.equal(DELAY_TRAIL_MAX_SCORE, 100);
assert.equal(DELAY_TRAIL_SECOND_CHANCE_MS, 6_000);

for (let stage = 0; stage < DELAY_TRAIL_STAGE_COUNT; stage += 1) {
  assert.equal(DELAY_TRAIL_CASES.filter((item) => item.stage === stage).length, 5, `Stage ${stage + 1} must own five cases`);
}
for (const scenario of DELAY_TRAIL_CASES) {
  assert.equal(scenario.months.length, 6, `${scenario.id} must include six months`);
  assert.ok(scenario.initiatorIndex >= 0 && scenario.initiatorIndex <= 2, `${scenario.id} must begin in January, February or March`);
  for (const value of [scenario.title, scenario.context, scenario.explanation, ...scenario.months.flatMap((month) => [month.before, month.after])]) {
    assert.ok(value.tr.trim() && value.en.trim(), `${scenario.id} must be complete in Turkish and English`);
  }
}
assert.ok(DELAY_TRAIL_CASES.filter((item) => item.stage === 2).every((item) => item.feedbackLoop?.tr && item.feedbackLoop.en), "Every stage-three case must explain its feedback loop");

const seed = "session:student:5:1:12";
const first = buildDelayTrailRound(seed);
const repeated = buildDelayTrailRound(seed);
assert.deepEqual(first.map((item) => item.id), repeated.map((item) => item.id), "Refresh must reproduce the same five cases");
assert.equal(first.length, 5);
first.forEach((scenario, stage) => assert.equal(scenario.stage, stage, `Stage ${stage + 1} must select only from its own pool`));

const selectedCaseIds = first.map((item) => item.id);
const perfect = first.map((scenario) => ({ caseId: scenario.id, selections: [scenario.initiatorIndex], resolution: "first", revealedThrough: 5 }));
assert.equal(validatedDelayTrailScore(selectedCaseIds, perfect), 100, "Five first-try answers must score 100");
const recoveredFirst = { caseId: first[0].id, selections: [(first[0].initiatorIndex + 1) % 6, first[0].initiatorIndex], resolution: "second", revealedThrough: 5 };
const recoveredSecond = { caseId: first[1].id, selections: [(first[1].initiatorIndex + 1) % 6, first[1].initiatorIndex], resolution: "second", revealedThrough: 5 };
assert.equal(pointsForDelayTrailRecord(recoveredFirst, 0), 10, "A corrected second try must score 10");
assert.equal(pointsForDelayTrailRecord({ ...recoveredFirst, resolution: "teaching" }, 0), 0, "A teaching reveal must score zero");
assert.equal(pointsForDelayTrailRecord({ ...perfect[0], revealedThrough: 4 }, 0), 0, "An unfinished reveal must not score");
assert.equal(validatedDelayTrailScore(selectedCaseIds, [perfect[0], recoveredSecond]), 30, "Partial teacher finish must preserve only completed stage points");
assert.equal(validatedDelayTrailScore(["G06", ...selectedCaseIds.slice(1)], perfect), 0, "A case outside its stage pool must invalidate the payload");

const marchCase = DELAY_TRAIL_CASES.find((item) => item.initiatorIndex === 2);
assert.ok(marchCase);
assert.equal(marchCase.months[0].before.tr, marchCase.months[0].after.tr, "January must stay unchanged for a March initiator");
assert.equal(marchCase.months[1].before.tr, marchCase.months[1].after.tr, "February must stay unchanged for a March initiator");

assert.match(component, /DELAY_TRAIL_REVEAL_STEP_MS/);
assert.match(component, /Date\.now\(\) \+ DELAY_TRAIL_SECOND_CHANCE_MS/);
assert.match(component, /resolution: DelayTrailResolution/);
assert.match(component, /revealedThrough: Math\.min\(5, active\.revealedThrough \+ 1\)/, "Cards must reveal sequentially");
assert.match(component, /if \(forceSubmit && !completedRef\.current/, "Teacher finish must share the single-submit path");
assert.match(component, /submissionStarted\.current/, "Only one final submission may be made");
assert.match(component, /window\.addEventListener\("pagehide", flushDraft\)/, "Page exit must flush the current draft");
assert.match(component, /ArrowRight.*ArrowDown/s, "Month cards must support arrow-key navigation");
assert.doesNotMatch(component, /final-score|score\}\s*\/\s*100/, "The completion screen must not reveal results early");

assert.match(studentPage, /<Week5DelayTrail/);
assert.doesNotMatch(studentPage, /Week5ChainChaos/);
assert.match(selector, /title: "Gecikmenin İzinde"/);
assert.match(countdown, /Module 1: Tracing the Delay/);
assert.match(demo, /function WeekFiveDelayTrailDemo/);
assert.match(demo, /Eğitim tamamlandı/);
assert.match(styles, /grid-template-columns: repeat\(6,minmax\(0,1fr\)\)/, "Desktop must show one six-month row");
assert.match(styles, /\.delay-trail-grid \{ grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/, "Responsive layout must use a 3×2 month grid");

assert.match(migration, /week5_delay_trail_score/);
assert.match(migration, /public\.validated_module_score\(target_week_id, target_module_id, new_payload, new_score\)/, "Final score must be recomputed server-side");
assert.match(migration, /not \(target_session\.selected_week = 5 and target_session\.current_module = 1\)/, "This module must be excluded from speed bonuses");
assert.doesNotMatch(migration, /create table/i, "The new module must reuse the existing persistence model");

console.log("Week 5 Tracing the Delay validation passed");
