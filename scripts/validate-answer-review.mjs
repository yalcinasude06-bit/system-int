import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ANSWER_REVIEW_TOTAL_MS,
  MATCHING_ROUND_ONE_REVIEW_MS,
  evaluatePlacementSnapshot,
  remainingReviewTime,
} from "../src/lib/answerReview.ts";

assert.equal(ANSWER_REVIEW_TOTAL_MS, 5000, "Final in-scene review must last five seconds in total");
assert.equal(MATCHING_ROUND_ONE_REVIEW_MS, 4000, "The first matching page must review for four seconds");
assert.equal(remainingReviewTime(1_000, 5_000, 3_250), 2_750, "Restored review must resume from the remaining duration");
assert.equal(remainingReviewTime(1_000, 5_000, 7_000), 0, "Expired review must complete immediately after restore");

const tenAnswerKey = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`item-${index}`, `answer-${index}`]));
const sevenCorrectSnapshot = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`item-${index}`, index < 7 ? `answer-${index}` : `wrong-${index}`]));
const correctedDisplay = { ...tenAnswerKey };
const evaluation = evaluatePlacementSnapshot(sevenCorrectSnapshot, tenAnswerKey);
assert.equal(evaluation.correctCount, 7, "Seven original matches must remain seven correct answers");
assert.equal(evaluation.score, 70, "Seven of ten original matches must score 70");
assert.equal(evaluatePlacementSnapshot(correctedDisplay, tenAnswerKey).score, 100, "The corrected display is independently complete");
assert.equal(evaluatePlacementSnapshot(sevenCorrectSnapshot, tenAnswerKey).score, 70, "Visual correction must not mutate or rescore the original snapshot");

const moduleOneSource = await readFile(new URL("../src/components/modules/Module1_SystemBuild/ConceptualStage.tsx", import.meta.url), "utf8");
const moduleFourSource = await readFile(new URL("../src/components/modules/Module4_CompleteSystem/index.tsx", import.meta.url), "utf8");
const weekFourSource = await readFile(new URL("../src/components/modules/Week4_SystemProcess/index.tsx", import.meta.url), "utf8");
const studentSource = await readFile(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const globalStyles = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

assert.match(moduleOneSource, /originalPlacementsRef/, "Module 1 must preserve an immutable first-placement snapshot");
assert.match(moduleOneSource, /startReviewClock\(ANSWER_REVIEW_TOTAL_MS/, "Module 1 must defer its final submission for the full review window");
assert.match(moduleOneSource, /submitSnapshot\(snapshot, "completed"\)/, "Module 1 must submit the original snapshot after review");
assert.match(moduleOneSource, /const wrong = Boolean\(originalPlacements/, "Module 1 must mark only incorrect original placements");
assert.doesNotMatch(moduleOneSource, /motion\.|layoutId=|correctedAnatomyPlacements|anatomy-correction-badge/, "Module 1 must not move or auto-correct cards after checking");

assert.match(moduleFourSource, /startRoundReview\(0, next\)/, "The fifth match must start first-page review instead of advancing immediately");
assert.match(moduleFourSource, /MATCHING_ROUND_ONE_REVIEW_MS/, "The first matching page must use its bounded review duration");
assert.match(moduleFourSource, /firstPageSnapshotRef/, "The first matching page must preserve its original snapshot");
assert.match(moduleFourSource, /secondPageSnapshotRef/, "The second matching page must preserve its original snapshot");
assert.doesNotMatch(moduleFourSource, /matching-result-modal/, "The matching review must stay in the game scene without a result modal");
assert.doesNotMatch(moduleFourSource, /type-result-explanation|correctedTarget|matching-correct-target|showCorrections/, "Matching review must not reveal or highlight correct answers");

assert.match(weekFourSource, /snapshotRef\.current \?\? snapshot/, "Week 4 Module 3 must score the immutable first snapshot");
assert.match(weekFourSource, /evaluatedCardIsWrong/, "Initial mistakes must remain visibly marked throughout review");
assert.match(weekFourSource, /evaluatedCardIsCorrect/, "Initial correct placements must remain visibly marked throughout review");
assert.match(weekFourSource, /beginCheckedReview\(snapshot, startedAt, ANSWER_REVIEW_TOTAL_MS\)/, "Week 4 Module 3 must keep the scene visible for five seconds total");
assert.doesNotMatch(weekFourSource, /finishCorrection|measureFlyers|flyers\.map|system-correction-log|corrected-placement/, "Week 4 Module 3 must not move or auto-correct cards after checking");

assert.doesNotMatch(globalStyles, /systemWrongPulse|anatomy-correction-badge|matching-correct-target|system-correction-log/, "Removed correction animations and explanation UI must not remain in the stylesheet");

assert.match(studentSource, /<Module1SystemBuild[^>]*existingDraft=\{activeDraft\}/, "Module 1 must restore checked drafts without reopening the attempt");
assert.match(studentSource, /<Module4CompleteSystem[^>]*existingDraft=\{activeDraft\}/, "Module 4 must restore both review pages from drafts");

console.log("Answer review validation passed");
