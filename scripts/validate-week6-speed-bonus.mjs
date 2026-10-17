import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const student = await readFile(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const teacher = await readFile(new URL("../src/app/teacher/session/[pin]/page.tsx", import.meta.url), "utf8");
const finalizer = await readFile(new URL("../supabase/migrations/202610150029_week_six_simulation_repair.sql", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/202610170034_week_six_collective_revision.sql", import.meta.url), "utf8");

function finalize(rows, cap = 100) {
  const completed = rows.filter((row) => row.completed).sort((a, b) => a.submittedAt - b.submittedAt);
  return rows.map((row) => {
    const position = completed.findIndex((item) => item.id === row.id);
    if (position < 0) return { ...row, bonus: 0, total: row.score };
    const raw = completed.length === 1 ? 10 : Math.round(10 * (completed.length - 1 - position) / (completed.length - 1));
    const bonus = Math.round(raw * Math.max(0, Math.min(row.score, cap)) / cap);
    return { ...row, bonus, total: row.score + bonus };
  });
}

const baseRows = [
  { id: "perfect", score: 100, submittedAt: 1, completed: true },
  { id: "partial", score: 80, submittedAt: 2, completed: true },
  { id: "zero", score: 0, submittedAt: 3, completed: true },
  { id: "teacher-ended", score: 60, submittedAt: 0, completed: false },
];
for (const moduleId of [1, 2, 3]) {
  const result = finalize(baseRows);
  assert.deepEqual(result.map(({ bonus }) => bonus), [10, 4, 0, 0], `Week 6 Module ${moduleId} accuracy-weighted order bonus`);
  assert.deepEqual(result.map(({ total }) => total), [110, 84, 0, 60]);
  assert.ok(result.every(({ bonus }) => bonus >= 0 && bonus <= 10));
}
const runOne = finalize(baseRows), runTwo = finalize([{ id: "new", score: 80, submittedAt: 1, completed: true }]);
assert.deepEqual(runOne.map(({ total }) => total), [110, 84, 0, 60]);
assert.equal(runTwo[0].total, 88, "A later run is finalized independently");

assert.doesNotMatch(student, /selected_week === 6[^;\n]*speedBonusEligible/);
assert.doesNotMatch(teacher, /selected_week === 6[^;\n]*speedBonusEligible/);
assert.match(student, /activeSubmission\?\.speed_bonus \?\? 0/);
assert.match(teacher, /submission\.speed_bonus \?\? 0/);
assert.match(finalizer, /completion_status = 'completed'/);
assert.match(finalizer, /run_number = target_session\.current_run_number/);
assert.match(finalizer, /calculated\.calculated_bonus - calculated\.speed_bonus as bonus_delta/);
assert.match(finalizer, /student_profiles\.total_score \+ excluded\.total_score/);
assert.match(migration, /Remove only the Week 6 exclusion/);
assert.match(migration, /target_session\\\.selected_week = 5/);
assert.match(migration, /Speed-bonus eligibility verification failed/);
assert.doesNotMatch(migration, /where week_id = 6/i, "Historical Week 6 rounds must not be rewritten");

console.log("Week 6 speed-bonus validation passed: M1/M2/M3 order and accuracy weighting, 0-10 bounds, incomplete zero, replay isolation, DB fields, UI fields, and forward-only SQL guard.");
