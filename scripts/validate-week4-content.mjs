import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const { approachLabels, bossApproachPool, buildBossApproachRound } = await import("../src/components/modules/Week4_BossApproach/approachContent.ts");
const { buildSystemProcessRound, systemProcessPool } = await import("../src/components/modules/Week4_SystemProcess/systemProcessContent.ts");

assert.equal(bossApproachPool.length, 24, "Week 4 Module 1 must have 24 questions");
assert.equal(new Set(bossApproachPool.map((question) => question.id)).size, 24, "Week 4 Module 1 question IDs must be unique");
const expectedApproaches = ["indirgemeci", "analitik", "neden_sonuc", "deneysel", "mekanik", "yararci", "surec", "genislemeci"];
bossApproachPool.forEach((question, index) => {
  assert.equal(question.id, `W4M1-${String(index + 1).padStart(2, "0")}`, "Module 1 IDs must be complete and ordered");
  assert.equal(question.approachId, expectedApproaches[index % expectedApproaches.length], `${question.id} has the wrong answer key`);
});
assert.deepEqual(
  Object.keys(approachLabels).sort(),
  [...new Set(bossApproachPool.map((question) => question.approachId))].sort(),
  "The pool must cover all eight approaches",
);
const bossRound = buildBossApproachRound("content-validation");
assert.equal(bossRound.length, 10, "A Module 1 round must contain 10 questions");
assert.equal(new Set(bossRound.map((question) => question.id)).size, 10, "A Module 1 round must not repeat questions");
assert.equal(new Set(bossRound.map((question) => question.approachId)).size, 8, "A Module 1 round must include all eight approaches");
bossRound.forEach((question) => {
  assert.equal(question.options.length, 4, `${question.id} must render four options`);
  assert.equal(question.options.filter((option) => option === question.approachId).length, 1, `${question.id} must include exactly one correct option`);
});
assert.deepEqual(buildBossApproachRound("content-validation"), bossRound, "Module 1 selection must be deterministic");

assert.equal(systemProcessPool.length, 24, "Week 4 Module 2 must have 24 cards");
assert.equal(systemProcessPool.filter((card) => card.target === "is").length, 12, "Module 2 must have 12 systems-thinking cards");
assert.equal(systemProcessPool.filter((card) => card.target === "isNot").length, 12, "Module 2 must have 12 unsuitable cards");
assert.equal(new Set(systemProcessPool.map((card) => card.id)).size, 24, "Week 4 Module 2 card IDs must be unique");
systemProcessPool.forEach((card, index) => {
  const expectedId = index < 12 ? `sys${String(index + 1).padStart(2, "0")}` : `nosys${String(index - 11).padStart(2, "0")}`;
  assert.equal(card.id, expectedId, "Module 2 IDs must be complete and ordered");
  assert.ok(card.sourcePages.length > 0, `${card.id} must retain its source pages`);
  assert.ok(card.text.tr.trim().split(/\s+/).length <= 7, `${card.id} must remain short enough for the card UI`);
});
const systemRound = buildSystemProcessRound("content-validation");
assert.equal(systemRound.length, 6, "A Module 2 round must contain six cards");
assert.equal(systemRound.filter((card) => card.target === "is").length, 3, "A Module 2 round must contain three systems-thinking cards");
assert.equal(systemRound.filter((card) => card.target === "isNot").length, 3, "A Module 2 round must contain three unsuitable cards");
assert.equal(new Set(systemRound.map((card) => card.id)).size, 6, "A Module 2 round must not repeat cards");
assert.deepEqual(buildSystemProcessRound("content-validation"), systemRound, "Module 2 selection must be deterministic");

const bossSource = await readFile(new URL("../src/components/modules/Week4_BossApproach/index.tsx", import.meta.url), "utf8");
const portraitSource = await readFile(new URL("../src/components/modules/Week4_BossApproach/BossPortrait.tsx", import.meta.url), "utf8");
const systemSource = await readFile(new URL("../src/components/modules/Week4_SystemProcess/index.tsx", import.meta.url), "utf8");
const demoSource = await readFile(new URL("../src/components/common/ModuleGameplayDemo.tsx", import.meta.url), "utf8");
const studentSource = await readFile(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const globalStyles = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
assert.doesNotMatch(bossSource, /boss-next-button|Sonraki patron|Next boss/, "Module 1 must advance without a next button");
assert.doesNotMatch(bossSource, /current\.sourcePage|Kaynak sayfa|Source page/, "Module 1 must not expose source-page metadata");
assert.match(bossSource, /feedbackDuration = 1050/, "Module 1 feedback must auto-advance after about one second");
assert.doesNotMatch(bossSource, /🧑|👩|👨/, "Module 1 must not use emoji bosses");
assert.match(portraitSource, /const profiles = \[/, "Module 1 must use local illustrated boss profiles");
assert.equal((portraitSource.match(/\{ skin:/g) ?? []).length, 8, "Module 1 must provide eight distinct boss illustrations");
assert.match(systemSource, /onPointerMove/, "Module 2 must provide pointer dragging for mouse and touch");
assert.match(systemSource, /onZoneKeyDown/, "Module 2 must retain a keyboard placement path");
assert.match(systemSource, /system-trash-lid/, "Module 2 must render an animated trash lid");
assert.match(systemSource, /submittedPlacements/, "Module 2 must preserve the first-check scoring snapshot");
assert.doesNotMatch(studentSource, /firstCheckCorrect\}\/12/, "The result screen must not retain the old 12-card denominator");
assert.match(studentSource, /payload\.cardCount/, "The result denominator must come from the submitted round");
assert.match(demoSource, /Parçalar ilişkilidir/, "The onboarding demo must use the specified positive example");
assert.match(demoSource, /Çevre önemsizdir/, "The onboarding demo must use the specified unsuitable example");
assert.match(demoSource, /week-four-demo-trash-lid/, "The onboarding demo must animate a real trash lid element");
assert.match(globalStyles, /\.system-process-zones \{[^}]*grid-template:[^}]*repeat\(2/s, "Desktop targets must remain side by side");
assert.match(globalStyles, /@media \(max-width: 600px\)[\s\S]*?\.system-process-zones \{ grid-template-columns: 1fr;/, "The target layout must stack safely on narrow screens");
assert.match(globalStyles, /@media \(prefers-reduced-motion: reduce\)/, "Week 4 interactions must honor reduced-motion preferences");

console.log("Week 4 content validation passed");
