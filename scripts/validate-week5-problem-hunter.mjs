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
  isHunterLevelComplete,
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
const timedNoBonusMigration = await readFile(new URL("../supabase/migrations/202610150026_week_five_timed_modules_no_speed_bonus.sql", import.meta.url), "utf8");

const categories = ["event", "pattern", "structure"];
const contexts = ["delivery", "production", "safety", "inventory", "sales", "coordination"];
const expectedIds = ["T", "U", "G", "S", "M", "K"].flatMap((prefix) => Array.from({ length: 15 }, (_, index) => `${prefix}${String(index + 1).padStart(2, "0")}`));

assert.equal(problemHunterPool.length, 90, "The pool must contain exactly 90 targets");
assert.equal(new Set(problemHunterPool.map((item) => item.id)).size, 90, "All pool IDs must be unique");
assert.deepEqual(problemHunterPool.map((item) => item.id).sort(), expectedIds.sort(), "The requested T/U/G/S/M/K target IDs must all be present");
for (const category of categories) {
  assert.equal(problemHunterPool.filter((item) => item.category === category).length, 30, `${category} must contain 30 targets`);
  for (const context of contexts) {
    assert.equal(problemHunterPool.filter((item) => item.category === category && item.context === context).length, 5, `${category}/${context} must contain five targets`);
  }
}
for (const item of problemHunterPool) {
  assert.ok(item.text.tr && item.text.en && item.explanation.tr && item.explanation.en, `${item.id} must be bilingual`);
  assert.ok(item.icon, `${item.id} must include an icon`);
  assert.ok(item.text.tr.length <= 55 && item.text.en.length <= 55, `${item.id} must remain readable on a short-lived mobile target`);
  const trWords = item.text.tr.replace(/[.,!?]/g, "").trim().split(/\s+/).length;
  const enWords = item.text.en.replace(/[.,!?]/g, "").trim().split(/\s+/).length;
  assert.ok(trWords >= 3 && trWords <= 11, `${item.id} Turkish text must remain concise`);
  assert.ok(enWords >= 3 && enWords <= 14, `${item.id} English text must stay concise enough for the same target`);
}
assert.equal(new Set(problemHunterPool.map((item) => item.text.tr)).size, 90, "Turkish target text must be unique");
assert.equal(new Set(problemHunterPool.map((item) => item.text.en)).size, 90, "English target text must be unique");
const byId = new Map(problemHunterPool.map((item) => [item.id, item]));
assert.equal(byId.get("U12")?.text.tr, "Üretim planında makine kapasitesi kontrol edilmiyor.");
assert.equal(byId.get("M12")?.text.tr, "Satış hedefleri stok kapasitesine göre belirlenmiyor.");
assert.equal(byId.get("M03")?.text.tr, "Bugün bir müşteri sipariş vermekten vazgeçti.");
assert.equal(byId.get("G04")?.text.tr, "Bu sabah makinenin koruyucu kapağı yerinden çıktı.");
assert.equal(byId.get("U11")?.text.tr, "Düzenli bakım planı yok.");
assert.equal(byId.get("T11")?.text.tr, "Siparişler kapasiteye göre planlanmıyor.");
assert.equal(byId.get("G11")?.text.tr, "İş güvenliği kuralları belirlenmemiş.");
assert.equal(byId.get("T13")?.text.tr, "Satış ve üretim arasında bilgi paylaşımı yok.");
assert.equal(byId.get("U01")?.text.tr, "Bugün makine bozuldu.");
assert.equal(byId.get("G02")?.text.tr, "Sabah iş kazası yaşandı.");
assert.equal(byId.get("T07")?.text.tr, "Siparişler her hafta gecikiyor.");
assert.equal(byId.get("U06")?.text.tr, "Son aylarda arızalar artıyor.");
assert.ok(problemHunterPool.every((item) => !item.text.tr.includes("Depo kayıtları sık sık güncellenmiyor")), "Known category-ambiguous wording must not return");

const round = buildProblemHunterRound("session:student:5:2:1");
const repeatedRound = buildProblemHunterRound("session:student:5:2:1");
const nextRun = buildProblemHunterRound("session:student:5:2:2");
assert.deepEqual(round, repeatedRound, "The same technical run seed must be deterministic");
assert.notDeepEqual(round.map((target) => target.id), nextRun.map((target) => target.id), "A new technical run must vary the target selection");
assert.equal(HUNTER_LEVEL_DURATION_MS, 36_000, "The maximum level timer must cover the complete short schedule");
assert.equal(HUNTER_TASK_WINDOW_MS, 12_000, "The shifting mission must complete three readable windows without idle padding");
assert.equal(HUNTER_TASK_TRANSITION_MS, 2_000, "Mission changes must remain readable for two seconds");
assert.deepEqual(HUNTER_TARGET_DURATION_MS, [6_000, 5_500, 5_000], "Target visibility must use the requested readable durations");
assert.equal(round.length, 21, "A play must schedule exactly 21 targets");
assert.equal(new Set(round.map((target) => target.id)).size, round.length, "No target may repeat within one play");
assert.deepEqual([0, 1, 2].map((level) => round.filter((target) => target.level === level).length), [6, 6, 9]);
assert.deepEqual(categories.map((category) => round.filter((target) => target.category === category).length), [7, 7, 7], "The short round must remain category-balanced");
assert.deepEqual([0, 1, 2].map((level) => round.filter((target) => target.level === level && target.category === target.task).length), [3, 3, 3], "Every level must balance hittable targets and distractors");
const levelOnePreferred = new Set(["U01", "G02", "T07", "U06", "U11", "G11", "T13", "S11"]);
assert.ok(round.filter((target) => target.level === 0).every((target) => levelOnePreferred.has(target.id)), "Level one must use only the reviewed, unambiguous starter set");
for (const target of round) assert.equal(target.durationMs, HUNTER_TARGET_DURATION_MS[target.level], `Level ${target.level + 1} uses the wrong visibility duration`);

for (const [level, maximum] of [[0, 2], [1, 2], [2, 3]]) {
  for (let time = 0; time <= HUNTER_LEVEL_DURATION_MS; time += 50) {
    const active = round.filter((target) => target.level === level && time >= target.spawnAtMs && time < target.spawnAtMs + target.durationMs);
    assert.ok(active.length <= maximum, `Level ${level + 1} exceeded its ${maximum}-target concurrency cap at ${time}ms`);
    assert.equal(new Set(active.map((target) => target.hole)).size, active.length, `Two live targets shared a hole at level ${level + 1}/${time}ms`);
  }
}

for (const [level, minimumGap] of [[0, 3_000], [1, 3_000], [2, 2_500]]) {
  const starts = [...new Set(round.filter((target) => target.level === level).map((target) => target.spawnAtMs))].sort((a, b) => a - b);
  for (let index = 1; index < starts.length; index += 1) {
    const previous = starts[index - 1];
    const current = starts[index];
    if (level === 2 && Math.floor(previous / HUNTER_TASK_WINDOW_MS) !== Math.floor(current / HUNTER_TASK_WINDOW_MS)) continue;
    assert.ok(current - previous >= minimumGap, `Level ${level + 1} targets spawned too quickly`);
  }
}

for (let phase = 0; phase < 3; phase += 1) {
  const start = phase * HUNTER_TASK_WINDOW_MS;
  const end = start + HUNTER_TASK_WINDOW_MS;
  const phaseTargets = round.filter((target) => target.level === 2 && target.spawnAtMs >= start && target.spawnAtMs < end);
  const task = taskForLevelTime(2, start);
  assert.equal(phaseTargets.length, 3, `Phase ${phase + 1} must contain exactly three targets`);
  assert.equal(phaseTargets.filter((target) => target.category === task).length, 1, `Phase ${phase + 1} must contain exactly one hittable target`);
  assert.ok(phaseTargets.every((target) => target.spawnAtMs + target.durationMs <= end), `Phase ${phase + 1} targets must clear before the next mission`);
}
assert.deepEqual([0, 1, 2].map((phase) => taskForLevelTime(2, phase * HUNTER_TASK_WINDOW_MS)), ["event", "pattern", "structure"]);

for (let seed = 0; seed < 100; seed += 1) {
  const seededRound = buildProblemHunterRound(`session:student:5:2:${seed}`);
  assert.equal(new Set(seededRound.map((target) => target.id)).size, seededRound.length, `Seed ${seed} repeated a target`);
  assert.equal(seededRound.filter((target) => target.category === target.task).length, HUNTER_CORRECT_OPPORTUNITIES, `Seed ${seed} changed the scoring opportunity count`);
  assert.ok(seededRound.every((target) => !["T01", "T06", "T11"].includes(target.id)), `Seed ${seed} immediately reused a practice-adjacent delivery example`);
  assert.deepEqual(categories.map((category) => seededRound.filter((target) => target.category === category).length), [7, 7, 7], `Seed ${seed} changed category balance`);
  assert.deepEqual([0, 1, 2].map((level) => seededRound.filter((target) => target.level === level && target.category === target.task).length), [3, 3, 3], `Seed ${seed} changed correct-opportunity balance`);
}

const firstLevelIds = round.filter((target) => target.level === 0).map((target) => target.id);
assert.equal(isHunterLevelComplete(round, new Set(firstLevelIds.slice(0, -1)), 0), false, "A level must not end while one target remains unresolved");
assert.equal(isHunterLevelComplete(round, new Set(firstLevelIds), 0), true, "A level must end once all of its targets are resolved");

const action = (outcome, points, targetId) => ({ targetId, level: 0, task: "structure", category: "structure", outcome, points, atMs: 0 });
assert.equal(arcadeScoreFor([action("correct", 10, "a"), action("wrong", -5, "b"), action("miss", -2, "c")]), 3, "Correct, wrong, and missed scoring must be +10/-5/-2");
assert.equal(arcadeScoreFor([action("wrong", -5, "a"), action("miss", -2, "b")]), 0, "Arcade score must never become negative");
assert.equal(arcadeScoreFor([action("wrong", -5, "a"), action("correct", 10, "b")]), 5, "A wrong early tap must still reduce the final score");
const perfect = Array.from({ length: HUNTER_CORRECT_OPPORTUNITIES }, (_, index) => action("correct", 10, String(index)));
assert.equal(HUNTER_MAX_HIT_SCORE, HUNTER_CORRECT_OPPORTUNITIES * 10);
assert.equal(normalizedHunterScore(perfect, round.filter((target) => target.category === target.task).length), 100, "The generated round's correct opportunities must normalize a perfect play to 100");
assert.equal(normalizedHunterScore([...perfect, action("correct", 10, "extra")]), 100, "The module score must be capped at 100");
const idle = round.filter((target) => target.category === target.task).map((target) => action("miss", -2, target.id));
assert.equal(normalizedHunterScore(idle), 0, "An idle player must not gain score");

assert.match(component, /resolvedIds\.current\.has\(target\.id\)/, "Targets must be protected against duplicate clicks");
assert.match(component, /document\.hidden/, "The game timer must pause in a background tab");
assert.match(component, /setIsHidden\(hidden\);\s*lastTick\.current = performance\.now\(\);\s*saveDraft/, "Visibility changes must preserve progress before pausing or resuming");
assert.match(component, /transitionRemainingRef\.current > 0[\s\S]*return;/, "Mission transition time must not consume active game time");
assert.match(component, /tutorialState !== "closed"/, "Practice/help must pause the scored timer");
assert.match(component, /taskTransitionRemainingMs/, "An in-progress mission transition must survive draft restore");
assert.match(component, /forceSubmit[\s\S]*finalize\("teacher-ended"\)/, "Teacher finish must save a partial result");
assert.match(component, /isHunterLevelComplete\(schedule, resolvedIds\.current, activeLevel\)/, "A level must advance as soon as every scheduled target is resolved");
assert.match(component, /normalizedHunterScore\(nextActions, correctOpportunityCount\)/, "The module score must use the generated round's actual correct-opportunity count");
assert.match(component, /onDraft/, "Meaningful progress must be draftable");
assert.match(component, /const nextCheckpoint = Math\.floor\(nextElapsed \/ 5_000\);[\s\S]*if \(nextCheckpoint > draftCheckpoint\.current\)[\s\S]*saveDraft/, "The timer may checkpoint progress only at bounded five-second intervals");
assert.match(studentPage, /session\.selected_week === 5 && session\.current_module === 2[\s\S]*<Week5ProblemHunter/);
assert.match(teacherPage, /session\.selected_week === 5 && currentModule <= 3/);
assert.match(selector, /id: 2, title: "Sorun Avcısı"/);
assert.match(countdown, /weekFiveModuleTwoBrief/);
assert.match(demo, /WeekFiveProblemHunterDemo/);
assert.match(css, /\.hunter-board[\s\S]*grid-template-columns: repeat\(3/);
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.hunter-board[\s\S]*grid-template-columns: repeat\(3/, "The required 2×3 board must remain intact on mobile");
assert.match(component, /hunter-mission-kicker[\s\S]*taskChanged[\s\S]*missionLabel[\s\S]*missionDefinition/, "The mission must render as three explicit content rows, including the change announcement");
assert.match(component, /ŞU ANDA NEYİ YAKALAMALISIN\?/);
assert.match(component, /GÖREV DEĞİŞTİ!/);
assert.match(component, /className="hunter-timer"/, "Only the time HUD must remain in the student play screen");
assert.match(component, /Bugün üç sipariş gecikti\./);
assert.match(component, /Gecikmeler üç aydır artıyor\./);
assert.match(component, /Siparişler kapasiteye göre planlanmıyor\./);
assert.match(component, /Kuralı, planlama açığını veya birimler arası ilişkiyi bul\./);
assert.match(component, /Oyuna Başla/);
assert.match(component, /Nasıl Oynanır\?/);
assert.match(component, /localStorage\.setItem\(tutorialStorageKey, "seen"\)/, "Completed or skipped practice must not be forced on re-entry");
assert.match(component, /tutorialSolved[\s\S]*setTutorialSolved\(option\.category === "structure"\)/, "Practice must require choosing the structure example");
assert.doesNotMatch(component, /aria-label=\{`\$\{target\.text\[locale\]\}\. \$\{text\[target\.category\]\}`\}/, "Scored targets must not reveal their category in an accessible label");
assert.doesNotMatch(component, /hunter-hud|Doğru hedef|Arcade ilerlemesi|TrendingUp/, "Correct-target and arcade-progress HUD cards must be removed without touching score calculations");
assert.doesNotMatch(component, /hunter-summary|categorySummary|categoryCorrect|categoryWrong|categoryMissed/, "The module-specific analysis screen must not delay the general feedback flow");
assert.match(component, /hunter-submit-state/, "Only a transient save/retry state may remain after the game ends");
assert.match(studentPage, /if \(shouldShowFeedback && activeSubmission\)[\s\S]*ModuleFeedbackSurvey/, "A successful submit must continue into the shared feedback flow");
assert.match(css, /\.hunter-mission \{[^}]*height: auto;[^}]*display: grid;[^}]*grid-template-rows: auto auto auto;/, "The live mission layout must use a compact three-row grid flow");
assert.match(css, /\.hunter-mission-kicker span \{[^}]*overflow-wrap: anywhere;/, "Long mission labels must wrap instead of overlapping their icon");
assert.doesNotMatch(css, /\.hunter-mission[^\{]*\{[^}]*position: absolute/, "Mission rows must not use absolute positioning");
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.hunter-practice-options \{ grid-template-columns: 1fr;/, "Practice choices must stack on narrow screens");
assert.match(css, /@media \(max-width: 460px\)[\s\S]*\.hunter-board \{ height: clamp\(248px,43dvh,320px\); min-height: 248px;/, "The mobile board must adapt to usable dynamic viewport height");
assert.match(css, /\.student-game-navbar \.nav-inner \{ min-height: 52px;/, "Live Week 5 games must use the scoped compact student header on phones");
for (const viewport of [320, 360, 375, 390, 414, 430]) {
  const horizontalPadding = viewport <= 460 ? 18 : 32;
  assert.ok(viewport - horizontalPadding >= 302, `${viewport}px viewport must retain a usable mission content width`);
}
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.hunter-target[^\{]*\{ animation: none/);

assert.doesNotMatch(migration, /create table|alter table|drop table/i, "Module 2 enablement must not introduce a new table");
assert.match(migration, /selected_week = 5 and target_module_id > 2/, "Week 5 Module 2 must be enabled and later modules must remain locked");
assert.match(migration, /current_run_number = current_run_number \+ 1/, "The technical run number must remain monotonic");
assert.match(migration, /module_turn_counters = jsonb_set/, "Visible module-based play counters must remain intact");
assert.match(timedNoBonusMigration, /when target_session\.selected_week = 5 and target_session\.current_module in \(2, 3\) then 0/, "Week 5 Module 2 must receive zero database speed bonus");
assert.match(studentPage, /const speedBonusEligible = !\(session\.selected_week === 5 && \(session\.current_module === 2 \|\| session\.current_module === 3\)\)/, "Student totals and waiting copy must share the no-bonus gate");
assert.match(teacherPage, /const speedBonusEligible = !\(session\.selected_week === 5 && \(session\.current_module === 2 \|\| session\.current_module === 3\)\)/, "Teacher results must share the no-bonus gate");

console.log("Week 5 Problem Hunter content, schedule, scoring, responsive integration, and migration validation passed");
