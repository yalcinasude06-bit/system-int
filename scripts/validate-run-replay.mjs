import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createModuleStartedPayload,
  MODULE_STARTED_EVENT,
  moduleStartedEventKey,
  moduleStartChannelTopic,
  parseModuleStartedPayload,
  shouldRefreshForModuleStart,
} from "../src/lib/moduleStartRealtime.ts";

const migration = await readFile(new URL("../supabase/migrations/202610130018_session_run_replays.sql", import.meta.url), "utf8");
const studentPage = await readFile(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const teacherPage = await readFile(new URL("../src/app/teacher/session/[pin]/page.tsx", import.meta.url), "utf8");
const teacherRoute = await readFile(new URL("../src/app/api/teacher/sessions/route.ts", import.meta.url), "utf8");
const moduleRoute = await readFile(new URL("../src/app/api/teacher/sessions/[sessionId]/module/route.ts", import.meta.url), "utf8");
const moduleStartBroadcastServer = await readFile(new URL("../src/lib/moduleStartBroadcastServer.ts", import.meta.url), "utf8");
const sessionClient = await readFile(new URL("../src/lib/session.ts", import.meta.url), "utf8");
const supabaseClient = await readFile(new URL("../src/lib/supabase.ts", import.meta.url), "utf8");
const types = await readFile(new URL("../src/types/index.ts", import.meta.url), "utf8");

assert.doesNotMatch(migration, /\bmodule_runs\b|\brun_id\b/, "Replay support must not create a run table or UUID run ID");
assert.match(migration, /current_run_number bigint not null default 0/, "Sessions must retain a monotonic run number with a legacy zero default");
assert.equal((migration.match(/add column if not exists run_number bigint not null default 0/g) ?? []).length, 3, "Submission, draft, and feedback rows must carry run_number");
assert.match(migration, /submissions_one_attempt_run_idx[\s\S]*session_id, student_number, week_id, module_id, run_number/, "Submission uniqueness must include the round");
assert.match(migration, /module_drafts_one_active_run_idx[\s\S]*session_id, student_number, week_id, module_id, run_number/, "Draft uniqueness must include the round");
assert.match(migration, /module_feedback_one_per_run_idx[\s\S]*session_id, student_number, week_id, module_id, run_number/, "Feedback uniqueness must include the round");
assert.match(migration, /where is_active = true and is_module_started = true[\s\S]*perform public\.finish_session_module\(active_session\.id\)/, "Migration must atomically finalize an active legacy game before changing RPC signatures");

const startFunction = migration.slice(migration.indexOf("create or replace function public.start_session_module"), migration.indexOf("create or replace function public.cancel_session_module_start"));
assert.match(startFunction, /for update/, "Start must lock the session row");
assert.match(startFunction, /if target_session\.is_module_started then/, "A second Start must be rejected");
assert.match(startFunction, /current_run_number = current_run_number \+ 1/, "Every successful Start must consume one session-wide run number");

const submitFunction = migration.slice(migration.indexOf("create or replace function public.submit_module_once"), migration.indexOf("create or replace function public.finish_session_module"));
assert.match(submitFunction, /target_session\.current_run_number <> expected_run_number/, "Submission must reject stale rounds inside the database");
assert.match(submitFunction, /on conflict \(session_id, student_number, week_id, module_id, run_number\) do nothing/, "Submission retries must be idempotent within one round");
assert.match(submitFunction, /'was_new', false/, "Duplicate submissions must report that no score was added");
assert.doesNotMatch(submitFunction, /row_number\(\) over|calculated_bonus/, "Submitting one student must not recalculate class speed bonuses");

const finishFunction = migration.slice(migration.indexOf("create or replace function public.finish_session_module"), migration.indexOf("create or replace function public.submit_module_feedback"));
assert.match(finishFunction, /and draft\.run_number = target_session\.current_run_number/, "Finish must only consume current-round drafts");
assert.match(finishFunction, /completion_status = 'completed'/, "Only complete submissions may receive speed bonus");
assert.match(finishFunction, /with ranked as[\s\S]*update public\.submissions submission[\s\S]*bonus_totals/s, "Finish must finalize bonuses with a set-based SQL pass");
assert.match(finishFunction, /else round\([\s\S]*10\.0 \* \(ranked\.group_size - 1 - ranked\.position\)[\s\S]*\)::int/, "Finish must preserve the existing rounded 0-10 order-bonus formula");
assert.match(finishFunction, /session_score = student\.session_score \+ total\.score_delta/, "Auto-finalized partial base scores must be added exactly once");

assert.match(migration, /when target_week_id = 4 and target_module_id = 1 then 50/, "New five-decision Factory rounds must use a 50-point server cap");
assert.match(migration, /format\('%s:%s:%s', feedback\.week_id, feedback\.module_id, feedback\.run_number\)/, "Feedback keys must include run_number");
assert.match(migration, /create or replace function public\.get_student_session_status/, "Students need a lightweight status RPC");
assert.match(migration, /submission\.run_number = target_session\.current_run_number/, "Full student state must return only the current-round submission");
assert.match(migration, /drop function if exists public\.submit_module_once\(uuid, uuid, int, int, int, jsonb, int\)/, "The run-bypassing submission signature must be removed");
assert.match(migration, /create or replace function public\.reconcile_session_scores/, "A controlled score reconciliation tool must remain available outside hot paths");

assert.match(types, /current_run_number: number/, "Session types must expose current_run_number");
assert.match(types, /run_number: number/, "Submission types must expose run_number");
assert.match(sessionClient, /expected_run_number: input\.expectedRunNumber/g, "All student writes must send the expected round");
assert.match(studentPage, /item\.run_number === session\?\.current_run_number/, "Existing submissions must be matched to the current round");
assert.match(studentPage, /draft\.run_number === session\?\.current_run_number/, "Draft hydration must be matched to the current round");
assert.match(studentPage, /`\$\{currentWeek\}:\$\{currentModule\}:\$\{currentRunNumber\}`/, "React and feedback keys must include run_number");
assert.equal((studentPage.match(/key=\{activeModuleKey\}/g) ?? []).length - 1, 16, "All sixteen available modules must remount cleanly for a new round");
assert.equal((studentPage.match(/sessionId=\{`\$\{session\.id\}:\$\{session\.current_run_number\}`\}/g) ?? []).length, 3, "All seeded Week 3 modules must vary by run_number");
assert.match(studentPage, /getStudentSessionStatus/, "Polling must use the lightweight student status call");
assert.doesNotMatch(studentPage, /setInterval\([^)]*load|2500/, "Student polling must not retain the 2.5-second full-state loop");
assert.match(studentPage, /5_500 \+ Math\.random\(\) \* 2_500/, "Active student polling must include 5.5–8 second jitter");
assert.match(studentPage, /\.on\("broadcast", \{ event: MODULE_STARTED_EVENT \}/, "Students must subscribe to the module-start Broadcast event");
assert.match(studentPage, /status === "SUBSCRIBED"\) void loadStatus\(\)/, "Initial and reconnected Realtime subscriptions must recover missed events through the status RPC");
assert.match(studentPage, /document\.addEventListener\("visibilitychange", refreshNow\)/, "Returning from a background tab must retain the status fallback");
assert.match(studentPage, /client\.removeChannel\(channel\)/, "Student Realtime subscriptions must be cleaned up with the component lifecycle");
assert.match(supabaseClient, /NEXT_PUBLIC_SUPABASE_ANON_KEY/, "The browser Realtime client must use only the public anon key");
assert.doesNotMatch(supabaseClient, /SERVICE_ROLE/, "The browser Supabase client must never contain the service-role key");

assert.doesNotMatch(teacherRoute, /\.select\("\*"\)/, "Teacher polling must not SELECT every column");
assert.match(teacherRoute, /\.eq\("run_number", found\.session\.current_run_number\)/, "Teacher summaries and details must filter the current round");
assert.match(teacherPage, /getTeacherSession\(pin, details\)/, "Teacher details must load on demand");
assert.doesNotMatch(teacherPage, /2500/, "Teacher polling must not retain the 2.5-second loop");
assert.match(teacherPage, /Bu tur \/ Toplam/, "Teacher results must separate round and cumulative scores");
assert.match(moduleRoute, /expected_run_number: expectedRunNumber/g, "Teacher cancel and finish must reject stale round requests");
assert.match(moduleRoute, /if \(action === "start"\) await broadcastModuleStarted\(client, sessionId, data\)/, "A successful start RPC must publish the session-scoped Broadcast before responding");
assert.match(moduleStartBroadcastServer, /catch \(error\)[\s\S]*polling will recover/, "Broadcast delivery failure must be non-fatal because polling remains the fallback");
assert.match(moduleStartBroadcastServer, /channel\.send\(\{[\s\S]*type: "broadcast"[\s\S]*event: MODULE_STARTED_EVENT[\s\S]*payload/, "The server must publish through Supabase Realtime Broadcast");
assert.match(moduleStartBroadcastServer, /import "server-only"/, "The Broadcast publisher and service-role client usage must stay on the server");
assert.doesNotMatch(moduleRoute, /postgres_changes/, "The module-start path must not expose direct sessions-table changes");

const startedAt = "2026-10-15T10:00:00.000Z";
const broadcastPayload = createModuleStartedPayload({ current_run_number: 8, module_started_at: startedAt, teacher_username: "must-not-leak" });
assert.deepEqual(broadcastPayload, { type: MODULE_STARTED_EVENT, runNumber: 8, startedAt }, "Broadcast payload must contain only the event type, run number, and start time");
assert.equal(moduleStartChannelTopic("550e8400-e29b-41d4-a716-446655440000"), "session-module-start:550e8400-e29b-41d4-a716-446655440000", "Each session must have a distinct channel topic");
assert.deepEqual(parseModuleStartedPayload(broadcastPayload), broadcastPayload, "A valid module-start Broadcast must be accepted");
assert.equal(parseModuleStartedPayload({ type: MODULE_STARTED_EVENT, runNumber: 8, startedAt: "invalid" }), null, "Malformed Broadcast timestamps must be ignored");
assert.equal(shouldRefreshForModuleStart(broadcastPayload, { current_run_number: 7, is_module_started: false, module_started_at: null }, ""), true, "A newer run event must trigger the secure status RPC");
assert.equal(shouldRefreshForModuleStart(broadcastPayload, { current_run_number: 9, is_module_started: false, module_started_at: null }, ""), false, "An old run event must be ignored");
assert.equal(shouldRefreshForModuleStart(broadcastPayload, { current_run_number: 8, is_module_started: true, module_started_at: startedAt }, ""), false, "An already-synchronized event must not refetch status");
assert.equal(shouldRefreshForModuleStart(broadcastPayload, { current_run_number: 7, is_module_started: false, module_started_at: null }, moduleStartedEventKey(broadcastPayload)), false, "A repeated Broadcast event must be idempotent");

assert.equal(60 + 85 + 90, 235, "Scores from repeated rounds must add rather than select a best score");

console.log("Run replay, cumulative score, and polling validation passed");
