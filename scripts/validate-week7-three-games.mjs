import assert from "node:assert/strict";
import fs from "node:fs";
import { loopSignCases } from "../src/components/modules/Week7_LoopSigns/loopSignsContent.ts";
import { scoreLoopSignAttempts, toggleLoopSign } from "../src/components/modules/Week7_LoopSigns/loopSignsEngine.ts";
import { stockRaceRounds } from "../src/components/modules/Week7_StockRace/stockRaceContent.ts";
import { raceResult, scoreStockRaceAttempts, stockAtTime, timeToTarget } from "../src/components/modules/Week7_StockRace/stockRaceEngine.ts";
import { curveRounds } from "../src/components/modules/Week7_DrawTheCurve/curveContent.ts";
import { scoreCurveAttempts, scoreCurvePoints, targetPoints } from "../src/components/modules/Week7_DrawTheCurve/curveScoring.ts";

assert.equal(loopSignCases.length, 5);
assert.deepEqual(loopSignCases.map((item) => item.nodes.length), [3, 4, 4, 5, 5]);
assert.equal(toggleLoopSign(null), "+");
assert.equal(toggleLoopSign("+"), "-");
assert.equal(toggleLoopSign("-"), "+");
const perfectLoops = loopSignCases.map((item, index) => ({ caseId: item.id, signs: [...item.signs], loopType: index === 4 ? item.loopType : null }));
assert.equal(scoreLoopSignAttempts(perfectLoops), 100);
assert.equal(scoreLoopSignAttempts(perfectLoops.slice(0, 2)), 40);
assert.equal(loopSignCases.every((item) => item.edges.length === item.nodes.length), true);

assert.equal(stockRaceRounds.length, 5);
const outcomes = stockRaceRounds.map(raceResult);
assert.deepEqual(outcomes.map((result) => result.winner), ["A", "B", "C", "B", "A"]);
for (const [index, result] of outcomes.entries()) {
  assert.equal(Number.isFinite(result.time), true);
  assert.ok(result.arrivals[1].time - result.arrivals[0].time > 0.2, `round ${index + 1} must have a unique winner`);
  const winnerTank = stockRaceRounds[index].tanks.find((tank) => tank.id === result.winner);
  assert.ok(winnerTank);
  assert.ok(Math.abs(stockAtTime(winnerTank, result.time) - stockRaceRounds[index].target) < 0.001);
}
assert.equal(timeToTarget(stockRaceRounds[1].tanks[1], 80), 6.25);
assert.equal(scoreStockRaceAttempts(stockRaceRounds.map((round, index) => ({ roundId: round.id, prediction: outcomes[index].winner }))), 100);
const stockSources = [
  "src/components/modules/Week7_StockRace/index.tsx",
  "src/components/modules/Week7_StockRace/stockRaceContent.ts",
].map((file) => fs.readFileSync(file, "utf8")).join("\n");
assert.equal(/\bNet(?:\s+akış)?\b/i.test(stockSources), false, "Stock Race must not expose a Net label");

assert.equal(curveRounds.length, 5);
const perfectCurves = curveRounds.map((round) => ({ roundId: round.id, points: targetPoints(round.id) }));
assert.equal(scoreCurveAttempts(perfectCurves), 100);
for (const [index, round] of curveRounds.entries()) {
  const target = targetPoints(round.id);
  assert.equal(target.length, 32);
  assert.equal(scoreCurvePoints(round, target), 20);
  const closeVariant = target.map((point, pointIndex) => ({ ...point, y: Math.max(0, Math.min(1, point.y + Math.sin(pointIndex) * .025)) }));
  assert.ok(scoreCurvePoints(round, closeVariant) >= 16, `round ${index + 1} should tolerate natural drawing variation`);
}

const migration = fs.readFileSync("supabase/migrations/202610190040_week_seven_three_games.sql", "utf8");
for (const gameId of ["week-7-loop-signs-v4", "week-7-stock-race-v1", "week-7-draw-curve-v1"]) assert.ok(migration.includes(gameId));
assert.ok(migration.includes("target_session.selected_week in (3, 4, 5, 6, 7)"));
assert.ok(migration.includes("week7_curve_attempt_score"));
assert.ok(migration.includes("Could not enable the Week 7 speed bonus"));

console.log("Week 7 three-game validation passed");
