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

  assert.notEqual(item.initialErrors.polarityLinkId, item.initialErrors.directionLinkId, `${item.id} errors must affect different links`);
  assert.ok(item.links.some((edge) => edge.id === item.initialErrors.polarityLinkId), `${item.id} polarity error must exist`);
  assert.ok(item.links.some((edge) => edge.id === item.initialErrors.directionLinkId), `${item.id} direction error must exist`);

  const initial = initialLinkStates(item);
  assert.equal(initial.length, item.links.length);
  assert.equal(initial.filter((edge, index) => edge.polarity !== item.links[index].polarity).length, 1, `${item.id} must start with one polarity error`);
  assert.equal(initial.filter((edge, index) => edge.from !== item.links[index].from || edge.to !== item.links[index].to).length, 1, `${item.id} must start with one direction error`);
  assert.deepEqual(new Set(incorrectLinkIds(item, initial)), new Set([item.initialErrors.polarityLinkId, item.initialErrors.directionLinkId]), `${item.id} must identify only its two erroneous links`);
  assert.equal(isValidAttemptSignature(item, answerSignature(initial)), true, `${item.id} initial answer must be a valid checkable signature`);
  assert.equal(isCaseSolved(item, initial), false, `${item.id} cannot start solved`);
  assert.equal(new Set(initial.map((edge) => `${edge.from}>${edge.to}`)).size, initial.length, `${item.id} initial links must remain visually distinct`);
  assert.equal(isCaseSolved(item, item.links), true, `${item.id} canonical model must solve`);

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

for (let seed = 0; seed < 500; seed += 1) {
  const first = buildLoopRepairRound(`validation:${seed}`);
  const second = buildLoopRepairRound(`validation:${seed}`);
  assert.deepEqual(first.map((item) => item.id), second.map((item) => item.id), "Selection must be deterministic for a run");
  assert.equal(first.length, 5);
  assert.equal(new Set(first.map((item) => item.id)).size, 5);
  assert.deepEqual(new Set(first.map((item) => item.group)), new Set(loopGroups), "A round must contain one case from every group");
}

const sampleRound = buildLoopRepairRound("score-validation");
const correctAttempts = sampleRound.map((item) => ({ caseId: item.id, signature: correctAnswerSignature(item) }));
const wrongAttempts = sampleRound.map((item) => ({ caseId: item.id, signature: answerSignature(initialLinkStates(item)) }));
const mixedAttempts = correctAttempts.map((attempt, index) => index < 2 ? attempt : wrongAttempts[index]);
assert.equal(scoreLoopAttempts(sampleRound, correctAttempts), 100);
assert.equal(scoreLoopAttempts(sampleRound, wrongAttempts), 0, "Five checked wrong diagrams must complete with zero points");
assert.equal(wrongAttempts.length, 5, "All-wrong flow still records all five checks");
assert.equal(scoreLoopAttempts(sampleRound, mixedAttempts), 40);
assert.equal(scoreLoopAttempts(sampleRound, correctAttempts.slice(0, 2)), 40, "Teacher-ended partial progress must preserve earned points");
assert.equal(scoreLoopAttempts(sampleRound, [{ ...correctAttempts[0], signature: "forged" }]), 0);
assert.equal(isValidAttemptSignature(sampleRound[0], "e1:forged>endpoint:+"), false);

const component = readFileSync(new URL("../src/components/modules/Week7_LoopRepair/index.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const student = readFileSync(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const teacher = readFileSync(new URL("../src/app/teacher/session/[pin]/page.tsx", import.meta.url), "utf8");
const selector = readFileSync(new URL("../src/components/teacher/ModuleSelector.tsx", import.meta.url), "utf8");
const countdown = readFileSync(new URL("../src/components/common/ModuleStartCountdown.tsx", import.meta.url), "utf8");
const demo = readFileSync(new URL("../src/components/common/ModuleGameplayDemo.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/202610190038_week_seven_loop_repair_check.sql", import.meta.url), "utf8");
assert.match(component, /week-7-loop-repair-v2/);
assert.match(component, /legacyGameId = "week-7-loop-repair-v1"/);
assert.match(component, /data-control="polarity"/);
assert.match(component, /data-control="direction"/);
assert.match(component, /data-direction=\{forward \? "forward" : "reverse"\}/);
assert.match(component, /markerStart=\{!forward/);
assert.match(component, /markerEnd=\{forward/);
assert.match(component, /20-per-correct-checked-diagram-no-tap-deduction/);
assert.match(component, /reviewDuration = 1000/);
assert.match(component, /const checkDiagram/);
assert.match(component, /check: "Kontrol Et"/);
assert.match(component, /attempts: checkedAttempts/);
assert.doesNotMatch(component, /isCaseSolved/);
assert.match(css, /\.loop-sign-control \{[^}]*min-width:44px[^}]*background:transparent[^}]*border:0/);
assert.match(css, /\.loop-direction-control \{[^}]*min-width:46px[^}]*border-radius:50%/);
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
assert.match(migration, /create or replace function public\.week7_loop_attempt_signature_valid/);
assert.match(migration, /create or replace function public\.week7_loop_repair_score_v2/);
assert.match(migration, /week-7-loop-repair-v1[\s\S]*week7_loop_repair_score/);
assert.match(migration, /week-7-loop-repair-v2[\s\S]*week7_loop_repair_score_v2/);
assert.match(migration, /wrong_v2[\s\S]*<> 0/);
assert.doesNotMatch(migration, /alter table|create policy|grant (?:select|insert|update|delete)/i, "Week 7 v2 must not broaden table or RLS access");
assert.match(migration, /revoke all on function public\.week7_loop_repair_score_v2\(jsonb\) from public, anon, authenticated/);
assert.match(migration, /grant execute on function public\.week7_loop_repair_score_v2\(jsonb\) to service_role/);

console.log("Week 7 loop repair v2 validation passed: explicit checks, all-wrong completion, trusted mixed scoring, fixed-path arrows, accessibility, and backward compatibility.");
