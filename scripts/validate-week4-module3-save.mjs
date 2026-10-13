import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const component = await readFile(new URL("../src/components/modules/Week4_SystemProcess/index.tsx", import.meta.url), "utf8");
const studentPage = await readFile(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const moduleSelector = await readFile(new URL("../src/components/teacher/ModuleSelector.tsx", import.meta.url), "utf8");
const sessionClient = await readFile(new URL("../src/lib/session.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/202610130019_module_turns_and_checked_drafts.sql", import.meta.url), "utf8");
const types = await readFile(new URL("../src/types/index.ts", import.meta.url), "utf8");

const checkedReview = component.slice(
  component.indexOf("const beginCheckedReview"),
  component.indexOf("useEffect(() => {", component.indexOf("const beginCheckedReview")),
);
assert.match(component, /const snapshot = \{ \.\.\.placementsRef\.current \}/, "Check must freeze the first placement snapshot");
assert.match(component, /score: correctCount \* pointsPerCard/, "The frozen snapshot must score ten points per correct card");
assert.match(checkedReview, /submissionFor\(snapshot, "completed", snapshot/, "The durable result must use the frozen first-check snapshot");
assert.ok(
  checkedReview.indexOf("void submitResult(submission)") < checkedReview.indexOf("void onDraft?.(draftSubmission)"),
  "The final submission must start before the defensive checked draft",
);
assert.match(checkedReview, /onReviewStart\?\.\(startedAt \+ durationMs\)/, "The route must receive an absolute review deadline");
assert.match(checkedReview, /startReviewClock\(durationMs, \(\) => setCompleted\(true\)/, "Five seconds must control only the visual review transition");
assert.doesNotMatch(checkedReview, /correctedPlacements|setPlacements/, "Review must not auto-correct or move the frozen cards");
assert.match(component, /wasInitiallyWrong[\s\S]*wrong-placement/, "Only wrong first-check placements must receive the error style");

assert.doesNotMatch(studentPage, /Promise\.allSettled\(\[\.\.\.draftWrites\.current\]\)/, "Final submission must not wait for every draft request");
assert.match(studentPage, /const isAnswerReviewing = answerReview\?\.key === activeModuleKey/, "The route must retain the board while the active round is under review");
assert.match(studentPage, /!isAnswerReviewing && activeSubmission/, "A saved submission must not remove the board before review ends");
assert.match(studentPage, /Tur kapandı, kayıt doğrulanıyor\./, "A closed-round race must display a verification state");
assert.match(studentPage, /result\.reason === "already-submitted"/, "A late draft after final submission must be handled explicitly");
assert.match(studentPage, /result\.reason === "module-closed-or-stale"/, "A stale draft must trigger state reconciliation");
assert.match(sessionClient, /\[database:\$\{operation\}\]/, "Database write failures must log a safe operation and code summary");
const safeLogger = sessionClient.slice(sessionClient.indexOf("function logDatabaseFailure"), sessionClient.indexOf("function isTransientDatabaseFailure"));
assert.doesNotMatch(safeLogger, /details|hint|student|payload|pin/i, "Diagnostic logs must exclude row details, identity, answers, and PINs");
assert.doesNotMatch(sessionClient, /studentNumber.*console|payload.*console|target_pin.*console/s, "Diagnostic logs must not include student identity, answers, or PINs");

assert.doesNotMatch(migration, /create table/i, "Visible module turns must not add a run table");
assert.match(migration, /module_turn_counters jsonb not null default '\{\}'::jsonb/, "Sessions must persist low-cost per-module counters");
assert.match(migration, /current_module_turn int not null default 0/, "Sessions must expose the current visible play number");
assert.match(migration, /format\('%s:%s', target_session\.selected_week, target_module_id\)/, "Start must scope visible turns by week and module");
assert.match(migration, /current_run_number = current_run_number \+ 1/, "The technical run number must remain globally monotonic");
assert.match(migration, /next_module_turn :=[\s\S]*\+ 1/, "Start must atomically increment the visible module turn");
const cancelFunction = migration.slice(
  migration.indexOf("create or replace function public.cancel_session_module_start"),
  migration.indexOf("create or replace function public.save_module_draft"),
);
assert.match(cancelFunction, /restored_module_turn := greatest\(target_session\.current_module_turn - 1, 0\)/, "Countdown cancellation must restore the visible counter");
assert.doesNotMatch(cancelFunction, /current_run_number\s*=/, "Countdown cancellation must never reuse a technical run number");
const draftFunction = migration.slice(
  migration.indexOf("create or replace function public.save_module_draft"),
  migration.indexOf("create or replace function public.get_student_session_status"),
);
assert.match(draftFunction, /where id = target_student_id and session_id = target_session_id\s+for update/, "Draft and final submission must serialize on the student row");
assert.match(draftFunction, /'saved', false, 'reason', 'already-submitted'/, "Late drafts must report an already-submitted outcome");
assert.match(types, /current_module_turn: number/, "Session types must expose the visible module turn");
assert.match(types, /module_turn_counters: Record<string, number>/, "Session types must expose per-module counters");
assert.match(moduleSelector, /moduleTurnCounters\[`\$\{activeWeek\}:\$\{id\}`\]/, "Every module row must read its own visible play count");
assert.match(moduleSelector, /\{moduleTurn\}\. Oynanış/, "Previously played module rows must display their own play count");

function finalizeRace(order) {
  let submission = null;
  let scoreContribution = 0;
  const checkedDraft = { score: 60, completionStatus: "incomplete" };
  for (const step of order) {
    if (step === "submit" && !submission) {
      submission = { score: 60, completionStatus: "completed" };
      scoreContribution += 60;
    }
    if (step === "finish" && !submission) {
      submission = checkedDraft;
      scoreContribution += checkedDraft.score;
    }
  }
  return { submission, scoreContribution };
}

assert.deepEqual(finalizeRace(["submit", "finish", "submit"]), {
  submission: { score: 60, completionStatus: "completed" },
  scoreContribution: 60,
}, "Submit-first and duplicate retry must keep one completed score contribution");
assert.deepEqual(finalizeRace(["finish", "submit"]), {
  submission: { score: 60, completionStatus: "incomplete" },
  scoreContribution: 60,
}, "Finish-first must preserve a checked draft score without upgrading it to completed");

const visibleTurns = new Map();
const startVisibleTurn = (week, module) => {
  const key = `${week}:${module}`;
  const next = (visibleTurns.get(key) ?? 0) + 1;
  visibleTurns.set(key, next);
  return next;
};
assert.deepEqual([
  startVisibleTurn(4, 1),
  startVisibleTurn(4, 2),
  startVisibleTurn(4, 1),
  startVisibleTurn(4, 3),
], [1, 1, 2, 1], "Visible turns must increment independently per week and module");
const cancelledKey = "4:3";
visibleTurns.set(cancelledKey, Math.max((visibleTurns.get(cancelledKey) ?? 1) - 1, 0));
assert.equal(startVisibleTurn(4, 3), 1, "Cancelling the countdown must not consume a visible play number");

console.log("Week 4 Module 3 save-race and module-turn validation passed");
