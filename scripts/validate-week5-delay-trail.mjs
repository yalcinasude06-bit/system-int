import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DELAY_TRAIL_CASES,
  DELAY_TRAIL_MAX_SCORE,
  DELAY_TRAIL_SECOND_CHANCE_MS,
  DELAY_TRAIL_STAGE_TRANSITION_MS,
  DELAY_TRAIL_STAGE_COUNT,
  DELAY_TRAIL_SUMMARY_PAUSE_MS,
  DELAY_TRAIL_SUMMARY_READING_MS,
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
const baseMigration = await readFile(new URL("../supabase/migrations/202610150023_week_five_delay_trail.sql", import.meta.url), "utf8");
const revisedPoolMigration = await readFile(new URL("../supabase/migrations/202610150024_week_five_delay_trail_revised_pool.sql", import.meta.url), "utf8");
const speedBonusMigration = await readFile(new URL("../supabase/migrations/202610150025_week_five_delay_trail_speed_bonus.sql", import.meta.url), "utf8");

assert.equal(DELAY_TRAIL_CASES.length, 25, "The case bank must include all 25 cases");
assert.equal(DELAY_TRAIL_STAGE_COUNT, 5);
assert.equal(DELAY_TRAIL_MAX_SCORE, 100);
assert.equal(DELAY_TRAIL_SECOND_CHANCE_MS, 6_000);
assert.equal(DELAY_TRAIL_SUMMARY_PAUSE_MS, 800, "The completed chain must remain unobstructed for 0.8 seconds");
assert.equal(DELAY_TRAIL_SUMMARY_READING_MS, 2_200, "The explanation must remain readable for 2.2 seconds");
assert.ok(DELAY_TRAIL_STAGE_TRANSITION_MS >= 200 && DELAY_TRAIL_STAGE_TRANSITION_MS <= 300, "The stage transition must last 200–300 ms");
assert.equal(DELAY_TRAIL_SUMMARY_PAUSE_MS + DELAY_TRAIL_SUMMARY_READING_MS, 3_000, "Automatic advancement must occur three seconds after the final reveal");

for (let stage = 0; stage < DELAY_TRAIL_STAGE_COUNT; stage += 1) {
  const stageCases = DELAY_TRAIL_CASES.filter((item) => item.stage === stage);
  assert.equal(stageCases.length, 5, `Stage ${stage + 1} must own five cases`);
  assert.deepEqual(stageCases.map((item) => item.initiatorIndex).sort(), [0, 1, 2, 3, 4], `Stage ${stage + 1} must cover January through May exactly once`);
}
for (const scenario of DELAY_TRAIL_CASES) {
  assert.equal(scenario.months.length, 6, `${scenario.id} must include six months`);
  assert.ok(scenario.initiatorIndex >= 0 && scenario.initiatorIndex <= 4, `${scenario.id} must begin between January and May`);
  for (const value of [scenario.title, scenario.context, scenario.explanation, ...scenario.months.flatMap((month) => [month.before, month.after])]) {
    assert.ok(value.tr.trim() && value.en.trim(), `${scenario.id} must be complete in Turkish and English`);
  }
  scenario.months.forEach((month, monthIndex) => {
    for (const locale of ["tr", "en"]) {
      if (monthIndex < scenario.initiatorIndex) assert.equal(month.before[locale], month.after[locale], `${scenario.id} must not rewrite ${locale} history before its initiator`);
      else assert.notEqual(month.before[locale], month.after[locale], `${scenario.id} must transform ${locale} content from its initiator through June`);
    }
  });
}
assert.ok(DELAY_TRAIL_CASES.filter((item) => item.stage === 2).every((item) => item.feedbackLoop?.tr && item.feedbackLoop.en), "Every stage-three case must explain its feedback loop");
assert.deepEqual(
  [0, 1, 2, 3, 4].map((month) => DELAY_TRAIL_CASES.filter((item) => item.initiatorIndex === month).length),
  [5, 5, 5, 5, 5],
  "The complete pool must be balanced 5/5/5/5/5 across January through May",
);

const seed = "session:student:5:1:12";
const first = buildDelayTrailRound(seed);
const repeated = buildDelayTrailRound(seed);
assert.deepEqual(first.map((item) => item.id), repeated.map((item) => item.id), "Refresh must reproduce the same five cases");
assert.equal(first.length, 5);
first.forEach((scenario, stage) => assert.equal(scenario.stage, stage, `Stage ${stage + 1} must select only from its own pool`));
assert.deepEqual(first.map((scenario) => scenario.initiatorIndex).sort(), [0, 1, 2, 3, 4], "Every round must contain all five possible initiator months exactly once");
for (let index = 0; index < 100; index += 1) {
  const round = buildDelayTrailRound(`session:student:5:1:${index}`);
  assert.deepEqual(round.map((scenario) => scenario.initiatorIndex).sort(), [0, 1, 2, 3, 4], `Seed ${index} must preserve the five-month balance`);
}

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

const mayCase = DELAY_TRAIL_CASES.find((item) => item.initiatorIndex === 4);
assert.ok(mayCase);
assert.ok(mayCase.months.slice(0, 4).every((month) => month.before.tr === month.after.tr), "January through April must stay unchanged for a May initiator");

assert.match(component, /DELAY_TRAIL_REVEAL_STEP_MS/);
assert.match(component, /Date\.now\(\) \+ DELAY_TRAIL_SECOND_CHANCE_MS/);
assert.match(component, /resolution: DelayTrailResolution/);
assert.match(component, /revealedThrough: Math\.min\(5, active\.revealedThrough \+ 1\)/, "Cards must reveal sequentially");
assert.match(component, /if \(forceSubmit && !completedRef\.current/, "Teacher finish must share the single-submit path");
assert.match(component, /submissionStarted\.current/, "Only one final submission may be made");
assert.match(component, /window\.addEventListener\("pagehide", flushDraft\)/, "Page exit must flush the current draft");
assert.match(component, /ArrowRight.*ArrowDown/s, "Month cards must support arrow-key navigation");
assert.doesNotMatch(component, /final-score|score\}\s*\/\s*100/, "The completion screen must not reveal results early");
assert.match(component, /Haziran'daki sonuca hangi geçmiş karar yol açtı\?/);
assert.match(component, /Bu zinciri başlatan geçmiş karara dokun\./);
assert.doesNotMatch(component, /delay-trail-issue|text\.old|text\.improved|text\.order/, "The live screen must not repeat June, before/improved labels or layout guidance");
assert.equal(component.match(/currentCase\.feedbackLoop &&/g)?.length, 1, "The feedback loop must be revealed only once in the result explanation");
assert.match(component, /phase !== "transforming"/, "The interface must stay quiet while the month-by-month transformation runs");
assert.match(component, /setSummaryVisible\(true\), DELAY_TRAIL_SUMMARY_PAUSE_MS/, "The summary must appear only after the completed-chain pause");
assert.match(component, /setAutoTransitioning\(true\), totalDelay - DELAY_TRAIL_STAGE_TRANSITION_MS/, "The soft transition must begin shortly before automatic advancement");
assert.match(component, /window\.setTimeout\(advanceStage, totalDelay\)/, "The next stage must start automatically after the reading period");
assert.match(component, /if \(activeStage >= 4\) \{\s*finalize\("completed"\)/, "The fifth stage must automatically use the existing completion path");
assert.doesNotMatch(component, /text\.next|text\.finish|onClick=\{advanceStage\}/, "No manual next-stage or complete-module control may remain");
assert.match(component, /phase === "summary" && summaryVisible/, "The existing explanation must remain visible during the automatic reading period");

assert.match(studentPage, /<Week5DelayTrail/);
assert.doesNotMatch(studentPage, /Week5ChainChaos/);
assert.match(selector, /title: "Gecikmenin İzinde"/);
assert.match(countdown, /Module 1: Tracing the Delay/);
assert.match(demo, /function WeekFiveDelayTrailDemo/);
assert.match(demo, /Eğitim tamamlandı/);
assert.match(styles, /\.delay-trail-grid \{[^}]*grid-template-columns: repeat\(6,minmax\(0,1fr\)\)/, "Desktop must show one six-month row");
assert.match(styles, /\.delay-trail-grid \{ grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/, "Responsive layout must use a 3×2 month grid");
assert.match(styles, /\.delay-trail-arrow-turn \{ display: none; \}/, "The misleading March down-arrow must be hidden on narrow screens");
assert.match(styles, /\.delay-trail-mobile-turn \{ position: absolute;[\s\S]*display: block;/, "A connected responsive March-to-April route must replace the down-arrow");
assert.match(component, /M99,25 H99\.5 V50 H0\.5 V75 H4/, "The mobile connector must end at the April card, not June");

assert.match(baseMigration, /week5_delay_trail_score/);
assert.match(baseMigration, /public\.validated_module_score\(target_week_id, target_module_id, new_payload, new_score\)/, "Final score must be recomputed server-side");
assert.match(baseMigration, /not \(target_session\.selected_week = 5 and target_session\.current_module = 1\)/, "The legacy migration must document the former speed-bonus exclusion");
assert.doesNotMatch(revisedPoolMigration, /create table/i, "The revised pool must reuse the existing persistence model");
for (const scenario of DELAY_TRAIL_CASES) {
  assert.match(revisedPoolMigration, new RegExp(`when '${scenario.id}' then ${scenario.initiatorIndex}`), `${scenario.id} must use the same answer key on the client and server`);
}

const speedFinishFunction = speedBonusMigration.slice(
  speedBonusMigration.indexOf("create or replace function public.finish_session_module"),
  speedBonusMigration.indexOf("revoke all on function public.finish_session_module"),
);
assert.ok(speedFinishFunction.length > 0, "The speed-bonus migration must replace the module-finish function");
assert.doesNotMatch(speedFinishFunction, /not \(target_session\.selected_week = 5 and target_session\.current_module = 1\)/, "Tracing the Delay must participate in speed bonuses");
assert.match(speedFinishFunction, /completion_status = 'completed'/, "Incomplete plays must remain ineligible for speed bonuses");
assert.match(speedFinishFunction, /row_number\(\) over \(order by submission\.submitted_at, submission\.id\) - 1 as position/, "Speed ranking must use the existing deterministic submission order");
assert.match(speedFinishFunction, /when ranked\.group_size = 1 then 10/, "A sole completed player must remain eligible for the ten-point rank bonus");
assert.match(speedFinishFunction, /10\.0 \* \(ranked\.group_size - 1 - ranked\.position\) \/ \(ranked\.group_size - 1\)/, "The shared zero-to-ten rank formula must be preserved");
assert.match(speedFinishFunction, /\* greatest\(0, least\(ranked\.score, public\.module_score_cap/, "The rank bonus must remain weighted by the validated base score");
assert.match(speedFinishFunction, /session_score = greatest\(0, student\.session_score \+ total\.bonus_delta\)/, "The finalized bonus must update the session total exactly once");
assert.match(speedFinishFunction, /public\.student_profiles\.total_score \+ excluded\.total_score/, "The finalized bonus must update the persistent profile total");
assert.match(speedBonusMigration, /grant execute on function public\.finish_session_module\(uuid, bigint\) to service_role/, "Only the teacher service path may finish a run");

console.log("Week 5 Tracing the Delay validation passed");
