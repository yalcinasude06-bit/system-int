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

const loopUi = fs.readFileSync("src/components/modules/Week7_LoopSigns/index.tsx", "utf8");
const stockUi = fs.readFileSync("src/components/modules/Week7_StockRace/index.tsx", "utf8");
const curveUi = fs.readFileSync("src/components/modules/Week7_DrawTheCurve/index.tsx", "utf8");
const week7Css = fs.readFileSync("src/components/modules/week7Games.module.css", "utf8");
const demos = fs.readFileSync("src/components/common/ModuleGameplayDemo.tsx", "utf8");
const reviewTiming = fs.readFileSync("src/components/modules/week7ReviewTiming.ts", "utf8");
assert.match(loopUi, /signPositioner/, "Sign positioning must be separate from its motion button transform");
assert.match(loopUi, /className=\{styles\.loopPulse\}><motion\.div className=\{styles\.loopPulseInner\}/, "Loop result must have a fixed center wrapper separate from its scale animation");
assert.match(week7Css, /\.loopPulse \{[^}]*left: 50%; top: 50%; width: 0; height: 0/);
assert.doesNotMatch(week7Css, /\.loopPulse \{[^}]*transform:/, "The fixed loop center must not share a transform with Framer Motion");
assert.match(loopUi, /markerEnd=\{`url\(#w7-loop-arrow-\$\{item\.id\}\)`\}/, "Every causal edge needs a visible direction marker");
assert.match(loopUi, /refX="9"[\s\S]*?markerUnits="userSpaceOnUse"/, "Loop arrowheads should sit at the trimmed node boundary");
for (const source of [loopUi, stockUi, curveUi]) {
  assert.doesNotMatch(source, /if \(completed\) return/, "A module-specific completion screen must not replace common feedback");
  assert.match(source, /saveError:[\s\S]*?retry:/, "Failed final submissions must be retryable in the game");
}
assert.match(stockUi, /height: `\$\{level\}%`/, "The tank fill must track the same 0-100 value displayed to students");
assert.match(stockUi, /bottom: `\$\{current\.target\}%`/, "The target line must use the scenario's target scale");
assert.match(stockUi, /className=\{styles\.tankStage\} data-round-id=\{current\.id\}/, "Each stock round should remount its visual stage to avoid leaking prior-round liquid state");
assert.match(week7Css, /\.tankInterior \{[^}]*inset: 4px[^}]*overflow: hidden/);
assert.match(week7Css, /\.water \{[^}]*bottom: 0/);
assert.match(stockUi, /styles\.water\} style=\{\{ height: `\$\{level\}%` \}\}/);
assert.match(reviewTiming, /loopSigns: \{ normal: 1450, reducedMotion: 700 \}/);
assert.match(reviewTiming, /stockRace: \{ normal: 1550, reducedMotion: 650 \}/);
assert.match(reviewTiming, /drawCurve: \{ normal: 1550, reducedMotion: 800 \}/);
for (const [source, key] of [[loopUi, "loopSigns"], [stockUi, "stockRace"], [curveUi, "drawCurve"]]) {
  assert.match(source, new RegExp(`WEEK7_REVIEW_TIMING\\.${key}\\.reducedMotion`));
  assert.match(source, new RegExp(`WEEK7_REVIEW_TIMING\\.${key}\\.normal`));
}
assert.match(curveUi, /<div className=\{styles\.prompt\}><strong>\{text\.instruction\}<\/strong><\/div>/, "The curve prompt above the chart should only contain the drawing instruction");
assert.match(curveUi, /review \? `\+\$\{review\.points\}\/20 · \$\{current\.label\[locale\]\}` : current\.label\[locale\]/, "Curve label must remain visible below the chart during play and review");
assert.match(curveUi, /<small>\{current\.prompt\[locale\]\}<\/small>/, "The concise scenario description should remain below the chart");
assert.match(curveUi, /const sharedStart = current\.pastValues\.at\(-1\)!/);
assert.match(curveUi, /\{ x: 0, y: sharedStart \}/, "Student and actual curves must share the past-curve endpoint");
assert.match(curveUi, /\(92 - svgY\) \/ 82/, "Pointer input must map to the chart plot coordinates");
assert.doesNotMatch(demos.match(/function WeekSevenStockRaceDemo\(\)[\s\S]*?\n}\n\nfunction WeekSevenDrawCurveDemo/)?.[0] ?? "", /week-seven-stock-demo-start|text\.start/, "The stock intro must not show a decorative Start control");
assert.doesNotMatch(demos.match(/function WeekSevenLoopSignsDemo\(\)[\s\S]*?\n}\n\nfunction WeekSevenStockRaceDemo/)?.[0] ?? "", /text\.prompt/, "Loop intro instruction is already shown once in the briefing");
assert.doesNotMatch(demos.match(/function WeekSevenDrawCurveDemo\(\)[\s\S]*?\n}\n\nconst demos/)?.[0] ?? "", /<strong>/, "Curve intro instruction is already shown once in the briefing");
assert.match(demos, /M0 0L\.8 4\.2L1\.8 3\.2L3 5\.8L4 5\.3L2\.9 2\.5L5\.1 2\.5Z/, "The demo pointer should be small and anchored at the shared curve start");

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
