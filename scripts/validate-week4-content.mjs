import assert from "node:assert/strict";

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

assert.equal(systemProcessPool.length, 30, "Week 4 Module 2 must have 30 cards");
assert.equal(systemProcessPool.filter((card) => card.target === "is").length, 15, "Module 2 must have 15 system-process cards");
assert.equal(systemProcessPool.filter((card) => card.target === "isNot").length, 15, "Module 2 must have 15 non-system-process cards");
assert.equal(new Set(systemProcessPool.map((card) => card.id)).size, 30, "Week 4 Module 2 card IDs must be unique");
systemProcessPool.forEach((card, index) => {
  assert.equal(card.id, `W4M2-${String(index + 1).padStart(2, "0")}`, "Module 2 IDs must be complete and ordered");
  assert.ok(card.sourcePages.length > 0, `${card.id} must retain its source pages`);
});
const systemRound = buildSystemProcessRound("content-validation");
assert.equal(systemRound.length, 12, "A Module 2 round must contain 12 cards");
assert.equal(systemRound.filter((card) => card.target === "is").length, 6, "A Module 2 round must contain six system-process cards");
assert.equal(systemRound.filter((card) => card.target === "isNot").length, 6, "A Module 2 round must contain six non-system-process cards");
assert.deepEqual(buildSystemProcessRound("content-validation"), systemRound, "Module 2 selection must be deterministic");

console.log("Week 4 content validation passed");
