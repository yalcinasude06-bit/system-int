import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const { approachLabels, bossApproachPool, buildBossApproachRound } = await import("../src/components/modules/Week4_BossApproach/approachContent.ts");
const { buildSystemProcessRound, systemProcessPool } = await import("../src/components/modules/Week4_SystemProcess/systemProcessContent.ts");
const { buildFactoryRound, factoryScenarioPool } = await import("../src/components/modules/Week4_FactoryTransform/factoryContent.ts");

assert.equal(factoryScenarioPool.length, 18, "Week 4 Module 1 must have 18 factory scenarios");
assert.equal(new Set(factoryScenarioPool.map((scenario) => scenario.id)).size, 18, "Factory scenario IDs must be unique");
for (const stage of ["mechanical", "biological", "sociocultural"]) {
  assert.equal(factoryScenarioPool.filter((scenario) => scenario.stage === stage).length, 6, `${stage} must have six scenarios`);
}
factoryScenarioPool.forEach((scenario) => {
  assert.equal(scenario.options.length, 3, `${scenario.id} must offer three decisions`);
  assert.equal(scenario.options.filter((option) => option.isCorrect).length, 1, `${scenario.id} must have one correct decision`);
  assert.equal(Object.keys(scenario.hints).length, 3, `${scenario.id} must support all inspection zones`);
  scenario.options.forEach((option) => assert.equal(option.timeline.length, 3, `${option.id} must expose a three-step visual timeline`));
});
for (const locale of ["tr", "en"]) {
  const correctIsStrictlyLongest = factoryScenarioPool.filter((scenario) => {
    const correct = scenario.options.find((item) => item.isCorrect).text[locale].trim().split(/\s+/).length;
    const longestWrong = Math.max(...scenario.options.filter((item) => !item.isCorrect).map((item) => item.text[locale].trim().split(/\s+/).length));
    return correct > longestWrong;
  }).length;
  assert.ok(correctIsStrictlyLongest <= 6, `Factory correct choices must not be systematically longest in ${locale}`);
}
const factoryRound = buildFactoryRound("content-validation");
assert.equal(factoryRound.length, 9, "A factory round must contain nine decisions");
assert.deepEqual(factoryRound.map((scenario) => scenario.stage), ["mechanical", "mechanical", "mechanical", "biological", "biological", "biological", "sociocultural", "sociocultural", "sociocultural"], "Factory stages must contain three decisions each");
assert.equal(factoryRound[0].id, "W4M1-M01", "The core mechanical scenario must always be present");
assert.equal(factoryRound[3].id, "W4M1-B01", "The core biological scenario must always be present");
assert.equal(factoryRound[6].id, "W4M1-S01", "The core socio-cultural scenario must always be present");
assert.deepEqual(buildFactoryRound("content-validation"), factoryRound, "Factory selection and option order must be deterministic");

assert.equal(bossApproachPool.length, 24, "Week 4 Module 2 must have 24 questions");
assert.equal(new Set(bossApproachPool.map((question) => question.id)).size, 24, "Week 4 Module 2 question IDs must be unique");
const expectedApproaches = ["indirgemeci", "analitik", "neden_sonuc", "deneysel", "mekanik", "yararci", "surec", "genislemeci"];
bossApproachPool.forEach((question, index) => {
  assert.equal(question.id, `W4M1-${String(index + 1).padStart(2, "0")}`, "Legacy boss IDs must stay complete and ordered for migrated drafts");
  assert.equal(question.approachId, expectedApproaches[index % expectedApproaches.length], `${question.id} has the wrong answer key`);
});
assert.deepEqual(
  Object.keys(approachLabels).sort(),
  [...new Set(bossApproachPool.map((question) => question.approachId))].sort(),
  "The pool must cover all eight approaches",
);
const bossRound = buildBossApproachRound("content-validation");
assert.equal(bossRound.length, 10, "A Module 2 round must contain 10 questions");
assert.equal(new Set(bossRound.map((question) => question.id)).size, 10, "A Module 2 round must not repeat questions");
assert.equal(new Set(bossRound.map((question) => question.approachId)).size, 8, "A Module 2 round must include all eight approaches");
bossRound.forEach((question) => {
  assert.equal(question.options.length, 4, `${question.id} must render four options`);
  assert.equal(question.options.filter((option) => option === question.approachId).length, 1, `${question.id} must include exactly one correct option`);
});
assert.deepEqual(buildBossApproachRound("content-validation"), bossRound, "Module 2 selection must be deterministic");

assert.equal(systemProcessPool.length, 24, "Week 4 Module 3 must have 24 cards");
assert.equal(systemProcessPool.filter((card) => card.target === "is").length, 12, "Module 3 must have 12 systems-thinking cards");
assert.equal(systemProcessPool.filter((card) => card.target === "isNot").length, 12, "Module 3 must have 12 unsuitable cards");
assert.equal(new Set(systemProcessPool.map((card) => card.id)).size, 24, "Week 4 Module 3 card IDs must be unique");
systemProcessPool.forEach((card, index) => {
  const expectedId = index < 12 ? `sys${String(index + 1).padStart(2, "0")}` : `nosys${String(index - 11).padStart(2, "0")}`;
  assert.equal(card.id, expectedId, "Module 3 IDs must be complete and ordered");
  assert.ok(card.sourcePages.length > 0, `${card.id} must retain its source pages`);
  assert.ok(card.text.tr.trim().split(/\s+/).length <= 7, `${card.id} must remain short enough for the card UI`);
  assert.ok(card.text.en.trim().split(/\s+/).length <= 7, `${card.id} must remain short enough for the English card UI`);
});
const systemRound = buildSystemProcessRound("content-validation");
assert.equal(systemRound.length, 8, "A Module 3 round must contain eight cards");
assert.equal(systemRound.filter((card) => card.target === "is").length, 4, "A Module 3 round must contain four systems-thinking cards");
assert.equal(systemRound.filter((card) => card.target === "isNot").length, 4, "A Module 3 round must contain four unsuitable cards");
assert.equal(new Set(systemRound.map((card) => card.id)).size, 8, "A Module 3 round must not repeat cards");
assert.deepEqual(buildSystemProcessRound("content-validation"), systemRound, "Module 3 selection must be deterministic");

const bossSource = await readFile(new URL("../src/components/modules/Week4_BossApproach/index.tsx", import.meta.url), "utf8");
const portraitSource = await readFile(new URL("../src/components/modules/Week4_BossApproach/BossPortrait.tsx", import.meta.url), "utf8");
const systemSource = await readFile(new URL("../src/components/modules/Week4_SystemProcess/index.tsx", import.meta.url), "utf8");
const factorySource = await readFile(new URL("../src/components/modules/Week4_FactoryTransform/index.tsx", import.meta.url), "utf8");
const demoSource = await readFile(new URL("../src/components/common/ModuleGameplayDemo.tsx", import.meta.url), "utf8");
const studentSource = await readFile(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const globalStyles = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const scoreCapMigration = await readFile(new URL("../supabase/migrations/202610120017_week_four_module_three_eight_cards.sql", import.meta.url), "utf8");
assert.match(factorySource, /recoveryWindowMs = 5000/, "Module 1 recovery must use an exact five-second window");
assert.match(factorySource, /performance\.now\(\)/, "Module 1 recovery must use a monotonic in-page deadline");
assert.match(factorySource, /deadlineEpoch/, "Module 1 recovery deadline must survive draft reloads");
assert.match(factorySource, /clickedRepairZones/, "Module 1 must record every repair-zone attempt");
assert.match(factorySource, /points: 10/, "Module 1 must award ten points for a first-correct answer");
assert.match(factorySource, /points: 4/, "Module 1 must award four points for a successful recovery");
assert.doesNotMatch(factorySource, /<Button onClick=\{advance\}/, "Module 1 must advance without an explicit next-decision action");
assert.match(factorySource, /window\.setTimeout\(advance, delay\)/, "Module 1 must auto-advance after visual feedback");
assert.doesNotMatch(factorySource, /className="factory-hud"|className="factory-metrics"/, "Module 1 gameplay must not expose live score or metric panels");
assert.match(factorySource, /continueFeedback/, "Module 1 results must require explicit acknowledgement before feedback");
assert.doesNotMatch(bossSource, /boss-next-button|Sonraki patron|Next boss/, "Module 2 must advance without a next button");
assert.doesNotMatch(bossSource, /current\.sourcePage|Kaynak sayfa|Source page/, "Module 2 must not expose source-page metadata");
assert.match(bossSource, /feedbackDuration = 1050/, "Module 2 feedback must auto-advance after about one second");
assert.doesNotMatch(bossSource, /🧑|👩|👨/, "Module 2 must not use emoji bosses");
assert.match(portraitSource, /const profiles = \[/, "Module 2 must use local illustrated boss profiles");
assert.equal((portraitSource.match(/\{ skin:/g) ?? []).length, 8, "Module 2 must provide eight distinct boss illustrations");
assert.match(systemSource, /onPointerMove/, "Module 3 must provide pointer dragging for mouse and touch");
assert.match(systemSource, /onZoneKeyDown/, "Module 3 must retain a keyboard placement path");
assert.match(systemSource, /system-trash-lid/, "Module 3 must render an animated trash lid");
assert.match(systemSource, /submittedPlacements/, "Module 3 must preserve the first-check scoring snapshot");
assert.match(systemSource, /continueFeedback/, "Module 3 results must require explicit acknowledgement before feedback");
assert.match(studentSource, /result-review/, "The student route must persist the result-review transition across reloads");
assert.doesNotMatch(studentSource, /firstCheckCorrect\}\/12/, "The result screen must not retain the old 12-card denominator");
assert.match(studentSource, /payload\.cardCount/, "The result denominator must come from the submitted round");
assert.match(demoSource, /Parçalar ilişkilidir/, "The onboarding demo must use the specified positive example");
assert.match(demoSource, /Çevre önemsizdir/, "The onboarding demo must use the specified unsuitable example");
assert.match(demoSource, /week-four-demo-trash-lid/, "The onboarding demo must animate a real trash lid element");
assert.match(demoSource, /Fabrikayı incele, karar ver; gerekirse 5 saniyede kurtar!/, "Factory onboarding must include the required instruction");
assert.match(demoSource, /duration: 10/, "Factory onboarding must use the ten-second storyboard");
assert.match(demoSource, /İncele → Karar ver → Kurtar/, "Factory onboarding must end with the interaction summary");
assert.match(globalStyles, /\.factory-zone\.repair-target/, "The repair target must receive a visible factory-scene highlight");
assert.match(globalStyles, /@media \(max-width: 700px\)[\s\S]*?\.factory-scene/, "The factory must provide a narrow-screen layout");
assert.match(globalStyles, /\.system-process-zones \{[^}]*grid-template:[^}]*repeat\(2/s, "Desktop targets must remain side by side");
assert.match(globalStyles, /@media \(max-width: 700px\)[\s\S]*?\.system-process-zones \{ grid-template-columns: repeat\(2/, "The two targets must remain side by side on phones when space permits");
assert.match(globalStyles, /@media \(max-width: 350px\)[\s\S]*?\.system-process-zones \{ grid-template-columns: 1fr;/, "The target layout must stack only on exceptionally narrow screens");
assert.match(globalStyles, /@media \(prefers-reduced-motion: reduce\)/, "Week 4 interactions must honor reduced-motion preferences");
assert.match(scoreCapMigration, /target_module_id = 3 then 80/, "Module 3 score cap must match eight ten-point cards");

console.log("Week 4 content validation passed");
