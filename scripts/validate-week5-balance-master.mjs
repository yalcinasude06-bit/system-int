import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CONTROL_ROOM_CONFIG,
  applyIntervention,
  buildControlRoomScenario,
  cardWindowIndex,
  cardsForState,
  createInitialControlRoomState,
  getIntervention,
  hasCollapsed,
  interventionPool,
  restoreControlRoomState,
  scoreControlRoom,
  stepSimulation,
} from "../src/components/modules/Week5_BalanceMaster/controlRoomEngine.ts";

const component = await readFile(new URL("../src/components/modules/Week5_BalanceMaster/index.tsx", import.meta.url), "utf8");
const studentPage = await readFile(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const teacherPage = await readFile(new URL("../src/app/teacher/session/[pin]/page.tsx", import.meta.url), "utf8");
const selector = await readFile(new URL("../src/components/teacher/ModuleSelector.tsx", import.meta.url), "utf8");
const countdown = await readFile(new URL("../src/components/common/ModuleStartCountdown.tsx", import.meta.url), "utf8");
const demo = await readFile(new URL("../src/components/common/ModuleGameplayDemo.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/202610140022_week_five_balance_master.sql", import.meta.url), "utf8");

assert.ok(interventionPool.length >= 12, "The intervention pool must contain at least twelve interventions");
assert.equal(interventionPool.length, 16, "The final control room design should expose sixteen interventions");
assert.equal(new Set(interventionPool.map((item) => item.id)).size, interventionPool.length, "Intervention IDs must be unique");
for (const intervention of interventionPool) {
  assert.ok(intervention.name.tr && intervention.name.en && intervention.description.tr && intervention.description.en, `${intervention.id} must be bilingual`);
  assert.ok(intervention.icon && intervention.conditions.tr && intervention.sideEffect.en && intervention.contextualExplanation.tr, `${intervention.id} must include its complete pedagogical metadata`);
  assert.ok(intervention.cooldownMs >= 6_000 && intervention.cooldownMs <= 8_000, `${intervention.id} cooldown must stay in the 6–8 second range`);
  assert.ok(intervention.delayedEffect.delayMs >= 4_000 && intervention.delayedEffect.delayMs <= 10_000, `${intervention.id} delayed effect must stay in the 4–10 second range`);
  assert.ok(!("cost" in intervention) && !("teamCost" in intervention), `${intervention.id} must not retain hidden budget or team costs`);
}

const scenario = buildControlRoomScenario("session:student:5:3:4");
assert.deepEqual(scenario, buildControlRoomScenario("session:student:5:3:4"), "The same technical run seed must reproduce the event and card schedule");
assert.notDeepEqual(scenario, buildControlRoomScenario("session:student:5:3:5"), "A replay must vary the deterministic scenario");
assert.equal(scenario.events.length, 8, "Eight staged events must cover the 90-second round");
assert.ok(scenario.events[0].atMs >= 10_000, "The opening phase must provide readable low pressure");
assert.ok(scenario.events.every((event, index) => index === 0 || event.atMs > scenario.events[index - 1].atMs), "Events must be ordered across the three difficulty phases");
assert.ok(scenario.events.some((event) => event.atMs < 30_000) && scenario.events.some((event) => event.atMs >= 30_000 && event.atMs < 60_000) && scenario.events.some((event) => event.atMs >= 60_000), "Events must span low-pressure, wave, and critical phases");
assert.notDeepEqual(scenario.initialState, buildControlRoomScenario("session:student:5:3:5").initialState, "A replay must vary its bounded starting state");
assert.equal(scenario.cardWindows.length, 10, "The ninety-second round must have ten nine-second card windows");
for (let index = 0; index < scenario.cardWindows.length; index += 1) {
  const window = scenario.cardWindows[index];
  assert.equal(window.length, 4, `Card window ${index + 1} must contain four interventions`);
  assert.equal(new Set(window).size, 4, `Card window ${index + 1} must not duplicate an intervention`);
  assert.ok(window.some((id) => getIntervention(id).kind === "supportive"), `Card window ${index + 1} must retain a reasonable supportive option`);
  if (index > 0) {
    const overlap = window.filter((id) => scenario.cardWindows[index - 1].includes(id));
    assert.equal(overlap.length, 2, `Exactly two cards must remain when window ${index + 1} rotates`);
    for (const id of overlap) assert.equal(window.indexOf(id), scenario.cardWindows[index - 1].indexOf(id), `Retained card ${id} must not jump to a different tap position`);
  }
}
const responsesByEvent = {
  "order-surge": ["limit-orders", "prioritize-orders", "balance-workload"],
  "machine-warning": ["planned-maintenance", "emergency-maintenance", "reserve-capacity"],
  "quality-alarm": ["quality-boost", "balance-workload"],
  "staff-shortage": ["extra-support", "cross-train", "balance-workload"],
};
for (const event of scenario.events) {
  const visibleCards = scenario.cardWindows[cardWindowIndex(event.atMs)];
  assert.ok(responsesByEvent[event.type].some((id) => visibleCards.includes(id)), `${event.id} must have a causally relevant response in its active card window`);
}

const initial = createInitialControlRoomState(scenario);
function advance(state, currentScenario, durationMs) {
  let next = state;
  for (let elapsed = 0; elapsed < durationMs; elapsed += CONTROL_ROOM_CONFIG.fixedStepMs) next = stepSimulation(next, currentScenario, Math.min(CONTROL_ROOM_CONFIG.fixedStepMs, durationMs - elapsed));
  return next;
}
const accelerated = applyIntervention(initial, scenario, "accelerate");
assert.equal(accelerated.accepted, true);
assert.ok(accelerated.state.pendingEffects.some((effect) => effect.sourceId === "accelerate"), "An intervention must enqueue its delayed effect");
const duplicate = applyIntervention(accelerated.state, scenario, "accelerate");
assert.equal(duplicate.accepted, false, "Cooldown must prevent immediate repeated clicking");
assert.equal(duplicate.availability.reason, "cooldown");
const beforeDelay = advance(accelerated.state, scenario, 4_900);
assert.ok(beforeDelay.pendingEffects.some((effect) => effect.sourceId === "accelerate"), "A delayed effect must not fire early");
const afterDelay = stepSimulation(beforeDelay, scenario, 200);
assert.ok(!afterDelay.pendingEffects.some((effect) => effect.sourceId === "accelerate"), "A delayed effect must fire after its due time");
assert.ok(afterDelay.effectLog.some((entry) => entry.id.startsWith("effect-accelerate")), "Applied delayed effects must appear in the causal log");

const hiddenResourceFree = applyIntervention({ ...initial, team: 0 }, scenario, "quality-boost");
assert.equal(hiddenResourceFree.accepted, true, "Hidden team capacity must never lock a visible intervention");
const blockedMajor = applyIntervention(accelerated.state, scenario, "planned-maintenance");
assert.equal(blockedMajor.accepted, false, "A second major intervention must wait until the active major intervention resolves");
assert.equal(blockedMajor.availability.reason, "major-active");
const maintenance = applyIntervention(initial, scenario, "planned-maintenance");
const conflictingShortcut = applyIntervention(maintenance.state, scenario, "cancel-maintenance");
assert.equal(conflictingShortcut.accepted, true);
assert.equal(conflictingShortcut.use?.conflict, true, "A tactical contradictory shortcut must not receive the full benefit of maintenance");

let bounded = createInitialControlRoomState(scenario);
for (let elapsed = 0; elapsed < CONTROL_ROOM_CONFIG.durationMs; elapsed += CONTROL_ROOM_CONFIG.fixedStepMs) {
  bounded = stepSimulation(bounded, scenario, CONTROL_ROOM_CONFIG.fixedStepMs);
  for (const value of [bounded.production, bounded.failureRisk, bounded.delay, bounded.health, bounded.team, bounded.qualityRisk, bounded.fatigue]) {
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 100, "All simulation indicators and resources must remain finite and within 0–100");
  }
}
assert.equal(bounded.elapsedMs, CONTROL_ROOM_CONFIG.durationMs, "A natural round must end at ninety seconds");

let critical = { ...createInitialControlRoomState(scenario), failureRisk: 96, health: 0 };
critical = advance(critical, scenario, CONTROL_ROOM_CONFIG.criticalGraceMs - 100);
assert.equal(hasCollapsed(critical), false, "A brief threshold breach must not end the game");
critical = stepSimulation(critical, scenario, 200);
assert.equal(hasCollapsed(critical), true, "A sustained five-second critical breach must end the game");

function simulate(policy, seed) {
  const currentScenario = buildControlRoomScenario(seed);
  let state = createInitialControlRoomState(currentScenario);
  let criticalSamples = 0;
  const seedOffset = [...seed].reduce((total, character) => total + character.charCodeAt(0), 0);
  for (let elapsed = 0; elapsed < CONTROL_ROOM_CONFIG.durationMs; elapsed += CONTROL_ROOM_CONFIG.fixedStepMs) {
    if (policy === "smart" && elapsed % 2_000 === 0) {
      const cards = cardsForState(state, currentScenario);
      const preferred = state.failureRisk > 48 || state.health < 55
        ? ["emergency-maintenance", "planned-maintenance", "reserve-capacity"]
        : state.delay > 38 || state.backlog > 18
          ? ["limit-orders", "prioritize-orders", "balance-workload", "extra-support"]
          : state.qualityRisk > 30
            ? ["quality-boost"]
            : elapsed < 30_000
              ? ["planned-maintenance", "reserve-capacity", "cross-train", "balance-workload"]
              : ["cross-train", "reserve-capacity", "balance-workload", "accelerate"];
      for (const id of preferred) {
        if (!cards.includes(id)) continue;
        const result = applyIntervention(state, currentScenario, id);
        if (result.accepted) { state = result.state; break; }
      }
    }
    if (policy === "random" && elapsed % 2_000 === 0) {
      const cards = cardsForState(state, currentScenario);
      const id = cards[(seedOffset + elapsed / 2_000) % cards.length];
      const result = applyIntervention(state, currentScenario, id);
      if (result.accepted) state = result.state;
    }
    state = stepSimulation(state, currentScenario, CONTROL_ROOM_CONFIG.fixedStepMs);
    if (state.failureRisk >= 70 || state.delay >= 70 || state.health <= 30) criticalSamples += 1;
    if (hasCollapsed(state)) break;
  }
  return { state, score: scoreControlRoom(state), criticalSamples, scenario: currentScenario };
}

const seedResults = Array.from({ length: 20 }, (_, index) => {
  const seed = `balance-policy-seed-${index + 1}`;
  return { seed, smart: simulate("smart", seed), idle: simulate("idle", seed), random: simulate("random", seed) };
});
const average = (values) => values.reduce((total, value) => total + value, 0) / values.length;
const smartAverage = average(seedResults.map((result) => result.smart.score.total));
const idleAverage = average(seedResults.map((result) => result.idle.score.total));
const randomAverage = average(seedResults.map((result) => result.random.score.total));
for (const result of seedResults) {
  for (const run of [result.smart, result.idle, result.random]) assert.ok(run.score.total >= 0 && run.score.total <= 100, `${result.seed} produced a score outside 0–100`);
  assert.equal(result.idle.state.elapsedMs, CONTROL_ROOM_CONFIG.durationMs, `${result.seed} idle run must remain playable for the full ninety seconds`);
  assert.equal(result.idle.state.triggeredEventIds.length, result.idle.scenario.events.length, `${result.seed} idle run must encounter every staged event`);
  assert.ok(result.idle.score.total > 0 && result.idle.score.total < 85, `${result.seed} idle score must be outcome-based without becoming high or artificially zero`);
}
const visiblyWorseIdleRuns = seedResults.filter(({ idle }) => {
  const initialMetrics = idle.scenario.initialState;
  return idle.state.health <= initialMetrics.health - 10 || idle.state.failureRisk >= initialMetrics.failureRisk + 18 || idle.state.delay >= initialMetrics.delay + 18;
}).length;
assert.ok(visiblyWorseIdleRuns >= 16, `At least sixteen idle runs must show causal measurable deterioration (received ${visiblyWorseIdleRuns})`);
assert.ok(smartAverage >= idleAverage + 7, `Contextual policy average (${smartAverage.toFixed(1)}) must meaningfully outperform idle (${idleAverage.toFixed(1)})`);
assert.ok(smartAverage >= randomAverage + 7, `Contextual policy average (${smartAverage.toFixed(1)}) must meaningfully outperform random choices (${randomAverage.toFixed(1)})`);
assert.ok(seedResults.filter((result) => result.smart.score.total > result.idle.score.total).length >= 16, "The smart policy must beat idle in most deterministic seeds");
assert.ok(seedResults.filter((result) => result.smart.score.total > result.random.score.total).length >= 16, "The smart policy must beat random tapping in most deterministic seeds");
assert.doesNotMatch(scoreControlRoom.toString(), /interventionUses\.length\s*===?\s*0|uses\s*===?\s*0[^?]*0/, "Idle scoring must not contain an automatic zero shortcut");

const restored = restoreControlRoomState({ ...initial, production: 999, delay: -20, health: Number.NaN, budget: 42 }, scenario);
assert.deepEqual(restored, createInitialControlRoomState(scenario), "Invalid draft metrics must safely fall back to the seeded fresh state");
const clamped = restoreControlRoomState({ ...initial, production: 999, delay: -20, budget: 42 }, scenario);
assert.equal(clamped.production, 100);
assert.equal(clamped.delay, 0);
assert.ok(!("budget" in clamped), "Legacy draft budget fields must be dropped during restore");

assert.match(component, /requestAnimationFrame/, "The UI must drive the fixed-step engine from animation frames");
assert.match(component, /document\.hidden/, "Background tabs must pause simulation time");
assert.match(component, /window\.addEventListener\("pagehide"/, "Page exit must preserve the latest draft checkpoint");
assert.match(component, /if \(forceSubmit && !completedRef\.current/, "Teacher finish must submit partial progress");
assert.match(component, /submissionStarted\.current/, "Natural finish, collapse, retry, and teacher finish must share a single-submit guard");
assert.doesNotMatch(component, /setInterval/, "The game must not use an independent setInterval clock");
assert.doesNotMatch(component, /balance-resources|balance-event-band|balance-effect-log|state\.budget|intervention\.cost|teamCost/, "Removed resource tables, event band, effect log, and budget costs must not remain in the UI");
assert.match(component, /balance-transient-notice/, "Immediate and delayed effects must use a single transient notification line");
assert.match(component, /balance-transient-row[\s\S]*balance-transient-notice[\s\S]*balance-time/, "The transient message and countdown must share the bottom status row");
assert.match(component, /remainingTime[\s\S]*padStart\(2, "0"\)/, "The countdown must use a stable mm:ss label");
assert.doesNotMatch(component, /balance-round-status|text\.safeTime|text\.phaseLow|text\.phaseWave|text\.phaseCritical/, "Safe-time and phase labels must be removed from the student UI");
assert.match(css, /\.balance-transient-row \{[^}]*grid-template-columns: minmax\(0,1fr\) 92px;/, "Desktop status layout must reserve a stable countdown column");
assert.match(css, /@media \(max-width: 360px\)[\s\S]*\.balance-transient-row \{ grid-template-columns: 1fr;/, "The message and countdown must stack without overlap on the narrowest phones");
assert.doesNotMatch(component, /setState\(next\)[\s\S]{0,140}saveDraft\(next\)/, "The frame loop must not write a draft on every fixed step");
assert.match(studentPage, /session\.selected_week === 5 && session\.current_module === 3[\s\S]*<Week5BalanceMaster/);
assert.match(teacherPage, /session\.selected_week === 5 && currentModule <= 3/);
assert.match(selector, /id: 3, title: "Denge Ustası"/);
assert.match(countdown, /weekFiveModuleThreeBrief/);
assert.match(demo, /WeekFiveBalanceMasterDemo/);
assert.match(css, /\.balance-action-grid \{[^}]*grid-template-columns: repeat\(4/);
assert.match(css, /@media \(max-width: 820px\)[\s\S]*\.balance-action-grid \{ grid-template-columns: repeat\(2/, "Intervention cards must become a readable 2×2 grid on narrow screens");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.balance-machine svg/);
assert.doesNotMatch(migration, /create table|alter table|drop table/i, "Week 5 Module 3 must reuse the existing submission model");
assert.match(migration, /selected_week in \(3, 4, 5\) and target_module_id > 3/, "The full three-module Week 5 set must be enabled");
assert.match(migration, /current_run_number = current_run_number \+ 1/);
assert.match(migration, /module_turn_counters = jsonb_set/);

console.table(seedResults.map(({ seed, smart, idle, random }) => ({
  seed: seed.replace("balance-policy-seed-", "#"),
  smart: smart.score.total,
  idle: idle.score.total,
  random: random.score.total,
  idleProduction: Math.round(idle.state.production),
  idleHealth: Math.round(idle.state.health),
  idleFailure: Math.round(idle.state.failureRisk),
  idleDelay: Math.round(idle.state.delay),
  idleEvents: idle.state.triggeredEventIds.length,
  idleCriticalSec: Number((idle.criticalSamples * CONTROL_ROOM_CONFIG.fixedStepMs / 1_000).toFixed(1)),
})));
console.log(`Week 5 Balance Master validation passed (20-seed averages: smart ${smartAverage.toFixed(1)}, idle ${idleAverage.toFixed(1)}, random ${randomAverage.toFixed(1)})`);
