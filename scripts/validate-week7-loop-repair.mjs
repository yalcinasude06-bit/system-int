import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  answerSignature,
  buildLoopRepairRound,
  correctAnswerSignature,
  incorrectLinkIds,
  initialLinkStates,
  isCaseSolved,
  isValidAttemptSignature,
  loopGroups,
  normalizeLegacySignature,
  scoreLoopAttempt,
  scoreLoopAttempts,
  week7LoopCases,
} from "../src/components/modules/Week7_LoopRepair/loopRepairContent.ts";

assert.equal(week7LoopCases.length, 20, "The pool must contain exactly 20 cases");
assert.equal(new Set(week7LoopCases.map((item) => item.id)).size, 20, "Case ids must be unique");

for (const group of loopGroups) {
  assert.equal(week7LoopCases.filter((item) => item.group === group).length, 4, `${group} must contain four cases`);
}

for (const item of week7LoopCases) {
  assert.ok(item.nodes.length >= 4 && item.nodes.length <= 5, `${item.id} must have 4-5 nodes`);
  assert.ok(item.links.length >= 4 && item.links.length <= 6, `${item.id} must have 4-6 links`);
  assert.ok(item.situation.tr && item.situation.en && item.explanation.tr && item.explanation.en, `${item.id} must be bilingual`);
  assert.equal(new Set(item.nodes.map((node) => node.id)).size, item.nodes.length, `${item.id} node ids must be unique`);
  assert.equal(new Set(item.links.map((edge) => edge.id)).size, item.links.length, `${item.id} link ids must be unique`);

  const nodeIds = new Set(item.nodes.map((node) => node.id));
  for (const node of item.nodes) assert.ok(node.label.tr && node.label.en, `${item.id}/${node.id} must be bilingual`);
  for (const edge of item.links) {
    assert.ok(nodeIds.has(edge.from) && nodeIds.has(edge.to), `${item.id}/${edge.id} must use existing nodes`);
    assert.notEqual(edge.from, edge.to, `${item.id}/${edge.id} cannot be a self loop`);
  }

  assert.equal(item.initialErrors.polarityLinkIds.length, 2, `${item.id} must start with two polarity errors`);
  assert.equal(new Set(item.initialErrors.polarityLinkIds).size, 2, `${item.id} polarity errors must affect different links`);
  assert.ok(item.initialErrors.polarityLinkIds.every((id) => item.links.some((edge) => edge.id === id)), `${item.id} polarity errors must exist`);

  const initial = initialLinkStates(item);
  assert.equal(initial.length, item.links.length);
  assert.equal(initial.filter((edge, index) => edge.polarity !== item.links[index].polarity).length, 2, `${item.id} must start with two polarity errors`);
  assert.equal(initial.filter((edge, index) => edge.from !== item.links[index].from || edge.to !== item.links[index].to).length, 0, `${item.id} arrows must start in canonical directions`);
  assert.deepEqual(new Set(incorrectLinkIds(item, initial)), new Set(item.initialErrors.polarityLinkIds), `${item.id} must identify only its two wrong signs`);
  assert.equal(isValidAttemptSignature(item, answerSignature(initial)), true, `${item.id} initial answer must be a valid v3 signature`);
  assert.equal(isCaseSolved(item, initial), false, `${item.id} cannot start solved`);
  assert.equal(isCaseSolved(item, item.links), true, `${item.id} canonical model must solve`);

  const reversedLegacy = item.links.map((edge, index) => index === 0 ? { ...edge, from: edge.to, to: edge.from } : edge);
  assert.equal(isValidAttemptSignature(item, answerSignature(reversedLegacy)), false, `${item.id} v3 signatures must reject reversed arrows`);
  assert.equal(normalizeLegacySignature(item, answerSignature(reversedLegacy)), correctAnswerSignature(item), `${item.id} legacy direction must normalize without losing polarity`);

  assert.ok(item.prediction.question.tr && item.prediction.question.en && item.prediction.explanation.tr && item.prediction.explanation.en, `${item.id} prediction must be bilingual`);
  assert.deepEqual(item.prediction.options.map((option) => option.id), ["A", "B", "C"], `${item.id} must have A/B/C options`);
  assert.ok(item.prediction.options.every((option) => option.text.tr && option.text.en), `${item.id} options must be bilingual`);
  assert.equal(item.prediction.options.filter((option) => option.id === item.prediction.correctOptionId).length, 1, `${item.id} must have one correct prediction`);

  for (const loop of item.loops) {
    assert.ok(loop.linkIds.length >= 2, `${item.id} loops need at least two links`);
    const edges = loop.linkIds.map((id) => item.links.find((edge) => edge.id === id));
    assert.ok(edges.every(Boolean), `${item.id} loop must reference known links`);
    for (let index = 0; index < edges.length; index += 1) {
      const current = edges[index];
      const next = edges[(index + 1) % edges.length];
      assert.equal(current.to, next.from, `${item.id} loop path must be continuous`);
    }
    const negativeCount = edges.filter((edge) => edge.polarity === "-").length;
    assert.equal(loop.type, negativeCount % 2 === 0 ? "R" : "B", `${item.id} loop polarity label must match parity`);
  }
}

assert.ok(new Set(week7LoopCases.map((item) => item.prediction.correctOptionId)).size === 3, "Correct predictions must not stay in one position");

for (let seed = 0; seed < 500; seed += 1) {
  const first = buildLoopRepairRound(`validation:${seed}`);
  const second = buildLoopRepairRound(`validation:${seed}`);
  assert.deepEqual(first.map((item) => item.id), second.map((item) => item.id), "Selection must be deterministic for a run");
  assert.equal(first.length, 5);
  assert.equal(new Set(first.map((item) => item.id)).size, 5);
  assert.deepEqual(new Set(first.map((item) => item.group)), new Set(loopGroups), "A round must contain one case from every group");
}

const sampleRound = buildLoopRepairRound("score-validation");
const wrongPrediction = (item) => item.prediction.options.find((option) => option.id !== item.prediction.correctOptionId).id;
const perfectAttempts = sampleRound.map((item) => ({ caseId: item.id, signature: correctAnswerSignature(item), predictionChoiceId: item.prediction.correctOptionId }));
const zeroAttempts = sampleRound.map((item) => ({ caseId: item.id, signature: answerSignature(initialLinkStates(item)), predictionChoiceId: wrongPrediction(item) }));
const oneErrorAttempts = sampleRound.map((item) => {
  const states = initialLinkStates(item).map((state) => state.id === item.initialErrors.polarityLinkIds[0] ? item.links.find((edge) => edge.id === state.id) : state);
  return { caseId: item.id, signature: answerSignature(states), predictionChoiceId: item.prediction.correctOptionId };
});
const diagramOnlyAttempts = sampleRound.map((item) => ({ caseId: item.id, signature: correctAnswerSignature(item), predictionChoiceId: wrongPrediction(item) }));
const predictionOnlyAttempts = sampleRound.map((item) => ({ caseId: item.id, signature: answerSignature(initialLinkStates(item)), predictionChoiceId: item.prediction.correctOptionId }));
assert.equal(scoreLoopAttempts(sampleRound, perfectAttempts), 100);
assert.equal(scoreLoopAttempts(sampleRound, zeroAttempts), 0, "Five checked wrong cases must complete with zero points");
assert.equal(scoreLoopAttempts(sampleRound, oneErrorAttempts), 70, "One wrong sign plus a correct prediction must score 14 per case");
assert.equal(scoreLoopAttempts(sampleRound, diagramOnlyAttempts), 60, "Perfect signs with wrong predictions must score 12 per case");
assert.equal(scoreLoopAttempts(sampleRound, predictionOnlyAttempts), 40, "Two wrong signs with correct predictions must score 8 per case");
const mixedAttempts = [perfectAttempts[0], oneErrorAttempts[1], diagramOnlyAttempts[2], predictionOnlyAttempts[3], zeroAttempts[4]];
assert.equal(scoreLoopAttempts(sampleRound, mixedAttempts), 54);
assert.equal(scoreLoopAttempts(sampleRound, mixedAttempts.slice(0, 2)), 34, "Teacher-ended partial progress must preserve earned points");
assert.equal(scoreLoopAttempt(sampleRound[0], { ...perfectAttempts[0], predictionChoiceId: null }), 12, "Migrated v1/v2 attempts must not receive prediction points");
assert.equal(scoreLoopAttempt(sampleRound[0], { ...perfectAttempts[0], signature: "e1:forged>endpoint:+" }), 0);

const component = readFileSync(new URL("../src/components/modules/Week7_LoopRepair/index.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const student = readFileSync(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const teacher = readFileSync(new URL("../src/app/teacher/session/[pin]/page.tsx", import.meta.url), "utf8");
const selector = readFileSync(new URL("../src/components/teacher/ModuleSelector.tsx", import.meta.url), "utf8");
const countdown = readFileSync(new URL("../src/components/common/ModuleStartCountdown.tsx", import.meta.url), "utf8");
const demo = readFileSync(new URL("../src/components/common/ModuleGameplayDemo.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/202610190039_week_seven_loop_prediction.sql", import.meta.url), "utf8");

assert.match(component, /week-7-loop-repair-v3/);
assert.match(component, /legacyV2GameId = "week-7-loop-repair-v2"/);
assert.match(component, /legacyV1GameId = "week-7-loop-repair-v1"/);
assert.match(component, /normalizeLegacySignature/);
assert.match(component, /predictionChoiceId/);
assert.match(component, /currentPredictionChoiceId/);
assert.match(component, /data-control="polarity"/);
assert.doesNotMatch(component, /data-control="direction"|ArrowLeftRight|onDirection|applyDirection/);
assert.match(component, /data-direction="fixed"/);
assert.doesNotMatch(component, /markerStart/);
assert.match(component, /markerEnd=\{`url\(#\$\{marker\}\)`\}/);
assert.match(component, /12-sign-accuracy-plus-8-prediction-no-speed-or-tap-deduction/);
assert.match(component, /reviewDuration = 1400/);
assert.match(component, /disabled=\{!predictionChoice\}/);
assert.match(component, /const checkCase/);
assert.match(component, /check: "Kontrol Et"/);
assert.match(component, /attempts: checkedAttempts/);
assert.match(css, /\.loop-sign-control \{[^}]*min-width:44px[^}]*background:transparent[^}]*border:0/);
assert.doesNotMatch(css, /\.loop-direction-control/);
assert.match(css, /\.loop-prediction-options \{[^}]*grid-template-columns:repeat\(3/);
assert.match(css, /\.loop-repair-check \{[^}]*min-height:44px/);
assert.match(css, /\.loop-edge\.edge-error/);
assert.match(css, /prefers-reduced-motion:\s*reduce/);
assert.match(student, /session\.selected_week === 7 && session\.current_module === 1/);
assert.match(student, /<Week7LoopRepair[\s\S]*seedKey=\{`\$\{session\.id\}:\$\{student\.id\}:7:1:\$\{session\.current_run_number\}`\}/);
assert.match(student, /!\(session\.selected_week === 7 && session\.current_module === 1\)/, "Student totals must omit speed bonus");
assert.match(teacher, /!\(session\.selected_week === 7 && session\.current_module === 1\)/, "Teacher totals must omit speed bonus");
assert.match(selector, /const weekSevenModules/);
assert.match(countdown, /weekSevenModuleOneBrief/);
assert.match(demo, /function WeekSevenLoopRepairDemo/);
assert.match(demo, /duration: 10/);
assert.match(demo, /week-seven-demo-prediction/);
assert.doesNotMatch(demo.match(/function WeekSevenLoopRepairDemo[\s\S]*?\n}\n\nconst demos/)?.[0] ?? "", /direction|arrow direction|ok yönü/i);

assert.match(migration, /create or replace function public\.week7_loop_prediction_correct_option/);
assert.match(migration, /create or replace function public\.week7_loop_signature_v3_valid/);
assert.match(migration, /create or replace function public\.week7_loop_diagram_score_v3/);
assert.match(migration, /create or replace function public\.week7_loop_repair_score_v3/);
assert.match(migration, /when target_week_id = 7 and target_module_id = 1 and new_payload ->> 'gameId' = 'week-7-loop-repair-v1'/);
assert.match(migration, /when target_week_id = 7 and target_module_id = 1 and new_payload ->> 'gameId' = 'week-7-loop-repair-v2'/);
assert.match(migration, /when target_week_id = 7 and target_module_id = 1 and new_payload ->> 'gameId' = 'week-7-loop-repair-v3'/);
assert.match(migration, /<> 100[\s\S]*<> 0[\s\S]*<> 70[\s\S]*<> 60[\s\S]*<> 40/);
assert.doesNotMatch(migration, /alter table|create policy|grant (?:select|insert|update|delete)/i, "Week 7 v3 must not broaden table or RLS access");
assert.match(migration, /revoke all on function public\.week7_loop_repair_score_v3\(jsonb\) from public, anon, authenticated/);
assert.match(migration, /grant execute on function public\.week7_loop_repair_score_v3\(jsonb\) to service_role/);

const sqlPredictionKeys = new Map([...migration.matchAll(/when '([WPMBU]\d{2})' then '([ABC])'/g)].map((match) => [match[1], match[2]]));
assert.equal(sqlPredictionKeys.size, 20, "SQL must contain all 20 trusted prediction keys");
for (const item of week7LoopCases) assert.equal(sqlPredictionKeys.get(item.id), item.prediction.correctOptionId, `${item.id} client and SQL prediction keys must match`);

console.log("Week 7 loop repair v3 validation passed: 20 bilingual predictions, fixed arrows, two sign errors, 12+8 scoring, legacy drafts, trusted SQL, and responsive interaction contract.");
