import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const relations = await readFile(new URL("../src/components/modules/Module2_Relations/index.tsx", import.meta.url), "utf8");
const factory = await readFile(new URL("../src/components/modules/Week4_FactoryTransform/index.tsx", import.meta.url), "utf8");
const systemProcess = await readFile(new URL("../src/components/modules/Week4_SystemProcess/index.tsx", import.meta.url), "utf8");
const hunter = await readFile(new URL("../src/components/modules/Week5_ProblemHunter/index.tsx", import.meta.url), "utf8");
const balance = await readFile(new URL("../src/components/modules/Week5_BalanceMaster/index.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

assert.match(relations, /answersFromDraft\(existingDraft\)/, "Relation-chain progress must restore from a draft");
assert.match(relations, /onPointerCancel=\{resetCardVisual\}/, "Cancelled pointer drags must restore the card");
assert.match(relations, /onTouchCancel=\{resetCardVisual\}/, "Cancelled touch drags must restore the card");
assert.match(relations, /onLostPointerCapture=/, "Lost pointer capture must restore the card");
assert.match(relations, /x\.stop\(\);\s*x\.set\(0\);/, "Interrupted card motion must return to x=0");
assert.match(relations, /transitionWatchdog/, "Interrupted animations must have a lock-release watchdog");
assert.match(relations, /visibilitychange/, "Tab changes must recover interrupted gestures");
assert.match(relations, /orientationchange/, "Screen rotation must recover interrupted gestures");
assert.match(relations, /dragMomentum=\{false\}/, "Mobile swipe inertia must not leave a card off screen");
assert.match(relations, /<button type="button" className="swipe-zone negative"/, "The accessible left choice must remain available");
assert.match(relations, /<button type="button" className="swipe-zone positive"/, "The accessible right choice must remain available");
assert.match(css, /\.active-card \{[^}]*touch-action: pan-y;[^}]*overscroll-behavior-x: contain;/, "Horizontal dragging must preserve vertical page scrolling");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, "Reduced-motion behavior must remain available");

assert.match(factory, /scoringVersion: 2/);
assert.match(factory, /maxBaseScore: 100/);
assert.match(css, /\.factory-decision-progress \{[^}]*repeat\(5,minmax\(0,1fr\)\)/);
assert.match(systemProcess, /evaluatedCardIsCorrect/);
assert.match(systemProcess, /evaluatedCardIsWrong/);
assert.doesNotMatch(systemProcess, /correctedPlacements: (?!null)/, "Evaluation must not auto-move wrong cards");

assert.match(hunter, /taskTransitionRemainingMs/);
assert.match(css, /@media \(max-width: 390px\)[\s\S]*\.hunter-hud \{ grid-template-columns: 1fr;/);
assert.doesNotMatch(balance, /balance-resources|balance-event-band|balance-effect-log|state\.budget|teamCost/);
assert.match(balance, /balance-transient-notice/);
assert.match(balance, /direction === "high" \? "↑" : "↓"/);

console.log("Cross-module revision validation passed");
