import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const phases = {
  1: { teachers: 1, studentsPerTeacher: 100, rampMs: 20_000, visibilityLimitMs: 3_000 },
  2: { teachers: 1, studentsPerTeacher: 500, rampMs: 45_000, visibilityLimitMs: 5_000 },
  3: { teachers: 5, studentsPerTeacher: 100, rampMs: 20_000, visibilityLimitMs: 3_000 },
};

const phase = Number(process.argv.find((argument) => argument.startsWith("--phase="))?.split("=")[1]);
const plan = phases[phase];
if (!plan) throw new Error("Usage: node scripts/loadtest/run.mjs --phase=1|2|3");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set for a load-test environment.`);
  return value;
}

const appUrl = required("LOADTEST_APP_URL").replace(/\/$/, "");
const supabaseUrl = required("LOADTEST_SUPABASE_URL");
const anonKey = required("LOADTEST_SUPABASE_ANON_KEY");
const serviceRoleKey = required("LOADTEST_SERVICE_ROLE_KEY");
const accounts = JSON.parse(required("LOADTEST_TEACHER_ACCOUNTS"));

if (process.env.LOADTEST_ENVIRONMENT !== "staging" || process.env.LOADTEST_ALLOW_CLEANUP !== "true") {
  throw new Error("Refusing to run: set LOADTEST_ENVIRONMENT=staging and LOADTEST_ALLOW_CLEANUP=true for an isolated test target.");
}
if (!Array.isArray(accounts) || accounts.length < plan.teachers || accounts.some((account) => !account?.username || !account?.password)) {
  throw new Error(`LOADTEST_TEACHER_ACCOUNTS must contain ${plan.teachers} valid account(s).`);
}

const service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const client = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
const report = {
  phase,
  startedAt: new Date().toISOString(),
  environment: "staging",
  plan,
  timings: { join: [], gameState: [], visibility: [], submit: [], moduleStart: [], moduleFinish: [] },
  failures: [],
  integrity: {},
  pass: false,
};

function elapsed(start) { return performance.now() - start; }
function percentile(samples, percentileValue) {
  if (!samples.length) return null;
  const sorted = [...samples].sort((left, right) => left - right);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1)]);
}
function metrics(samples) {
  const succeeded = samples.filter((sample) => sample.ok);
  return {
    total: samples.length,
    succeeded: succeeded.length,
    successRate: samples.length ? Number((succeeded.length / samples.length * 100).toFixed(2)) : 0,
    p50Ms: percentile(succeeded.map((sample) => sample.ms), .5),
    p95Ms: percentile(succeeded.map((sample) => sample.ms), .95),
    p99Ms: percentile(succeeded.map((sample) => sample.ms), .99),
  };
}
function record(name, ms, ok, context, error) {
  report.timings[name].push({ ms: Math.round(ms), ok });
  if (!ok) report.failures.push({ operation: name, context, message: error instanceof Error ? error.message : String(error) });
}
async function measured(name, context, work) {
  const started = performance.now();
  try {
    const value = await work();
    record(name, elapsed(started), true, context);
    return value;
  } catch (error) {
    record(name, elapsed(started), false, context, error);
    throw error;
  }
}
async function api(pathname, options = {}) {
  const response = await fetch(`${appUrl}${pathname}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof body.error === "string" ? body.error : `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}
async function login(account) {
  return api("/api/teacher/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(account),
  });
}
async function teacherApi(pathname, token, method = "GET", body) {
  return api(pathname, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}
async function cleanTeachers(teacherUsernames) {
  const { error: sessionError } = await service.from("sessions").delete().in("teacher_username", teacherUsernames);
  if (sessionError) throw sessionError;
  const { error: profileError } = await service.from("student_profiles").delete().in("teacher_username", teacherUsernames);
  if (profileError) throw profileError;
}
async function ramp(items, rampMs, operation) {
  const start = performance.now();
  return Promise.all(items.map((item, index) => new Promise((resolve) => {
    const target = Math.floor(index * rampMs / Math.max(items.length - 1, 1));
    setTimeout(() => resolve(operation(item)), Math.max(0, target - elapsed(start)));
  })));
}
async function rpc(name, args) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw error;
  return data;
}
async function waitForStarted(pin, studentId, limitMs) {
  const started = performance.now();
  while (elapsed(started) <= limitMs) {
    const state = await rpc("get_student_game_state", { target_pin: pin, target_student_id: studentId });
    if (state.session?.is_module_started) return elapsed(started);
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  throw new Error(`State was not visible within ${limitMs}ms`);
}
function expectedBonus(position, size, baseScore) {
  const timeBonus = size === 1 ? 10 : Math.round(10 * (size - 1 - position) / (size - 1));
  return Math.round(timeBonus * Math.max(0, Math.min(baseScore, 100)) / 100);
}
async function verifyIntegrity(sessions) {
  const sessionIds = sessions.map((session) => session.id);
  const [{ data: students, error: studentsError }, { data: submissions, error: submissionsError }, { data: profiles, error: profilesError }] = await Promise.all([
    service.from("students").select("id,session_id,student_number,session_score").in("session_id", sessionIds),
    service.from("submissions").select("id,session_id,student_id,student_number,score,speed_bonus,is_submitted,submitted_at").in("session_id", sessionIds).eq("is_submitted", true).order("submitted_at").order("id"),
    service.from("student_profiles").select("teacher_username,student_number,total_score").in("teacher_username", sessions.map((session) => session.teacherUsername)),
  ]);
  if (studentsError || submissionsError || profilesError) throw studentsError || submissionsError || profilesError;

  const duplicateKeys = new Set();
  const seen = new Set();
  for (const submission of submissions) {
    const key = `${submission.session_id}:${submission.student_number}`;
    if (seen.has(key)) duplicateKeys.add(key);
    seen.add(key);
  }
  const scores = new Map(students.map((student) => [student.id, student.session_score]));
  const expectedScores = new Map();
  for (const session of sessions) {
    const sessionSubmissions = submissions.filter((submission) => submission.session_id === session.id);
    sessionSubmissions.forEach((submission, position) => {
      const expected = submission.score + expectedBonus(position, sessionSubmissions.length, submission.score);
      expectedScores.set(submission.student_id, expected);
    });
  }
  const inconsistentScores = [...expectedScores].filter(([studentId, expected]) => scores.get(studentId) !== expected).length;
  const profileByKey = new Map(profiles.map((profile) => [`${profile.teacher_username}:${profile.student_number}`, profile.total_score]));
  const profileMismatches = students.filter((student) => {
    const session = sessions.find((item) => item.id === student.session_id);
    return session && profileByKey.get(`${session.teacherUsername}:${student.student_number}`) !== student.session_score;
  }).length;
  const pinsUnique = new Set(sessions.map((session) => session.pin)).size === sessions.length;
  report.integrity = {
    expectedStudents: plan.teachers * plan.studentsPerTeacher,
    students: students.length,
    submissions: submissions.length,
    duplicateSubmissions: duplicateKeys.size,
    inconsistentScores,
    profileMismatches,
    pinsUnique,
  };
  return duplicateKeys.size === 0 && inconsistentScores === 0 && profileMismatches === 0 && pinsUnique && students.length === plan.teachers * plan.studentsPerTeacher && submissions.length === plan.teachers * plan.studentsPerTeacher;
}

async function runClass(teacher, teacherIndex) {
  const auth = await login(teacher);
  const created = await teacherApi("/api/teacher/sessions", auth.token, "POST", { title: `Load test P${phase} T${teacherIndex + 1}` });
  const session = { id: created.session.id, pin: created.session.pin_code, teacherUsername: teacher.username, token: auth.token };
  const identities = Array.from({ length: plan.studentsPerTeacher }, (_, index) => ({
    number: `LT-${phase}-${teacherIndex + 1}-${String(index + 1).padStart(4, "0")}`,
    name: `Load Student ${teacherIndex + 1}-${index + 1}`,
  }));
  const students = await ramp(identities, plan.rampMs, async (identity) => {
    const joined = await measured("join", identity.number, () => rpc("join_session_student", {
      target_pin: session.pin,
      target_student_number: identity.number,
      target_full_name: identity.name,
      target_avatar: "🧪",
    }));
    await measured("gameState", identity.number, () => rpc("get_student_game_state", { target_pin: session.pin, target_student_id: joined.id }));
    return { ...joined, ...identity };
  });
  const moduleStart = await measured("moduleStart", session.pin, () => teacherApi(`/api/teacher/sessions/${session.id}/module`, session.token, "POST", { action: "start", moduleId: 1 }));
  await Promise.all(students.map((student) => measured("visibility", student.number, () => waitForStarted(session.pin, student.id, plan.visibilityLimitMs))));
  await Promise.all(students.map((student) => measured("submit", student.number, () => rpc("submit_module_once", {
    target_session_id: session.id,
    target_student_id: student.id,
    target_week_id: 1,
    target_module_id: 1,
    target_stage: 1,
    new_payload: { source: "loadtest", phase, teacher: teacher.username },
    new_score: 80,
  }))));
  await measured("moduleFinish", session.pin, () => teacherApi(`/api/teacher/sessions/${session.id}/module`, session.token, "POST", { action: "finish" }));
  return { ...session, moduleStart };
}

async function verifyIsolation(sessions) {
  if (sessions.length < 2) return true;
  const response = await fetch(`${appUrl}/api/teacher/sessions?pin=${encodeURIComponent(sessions[1].pin)}`, {
    headers: { Authorization: `Bearer ${sessions[0].token}` },
  });
  report.integrity.crossTeacherStatus = response.status;
  return response.status === 403;
}

function markdown() {
  const rows = Object.entries(report.timings).map(([name, samples]) => {
    const result = metrics(samples);
    return `| ${name} | ${result.succeeded}/${result.total} | ${result.successRate}% | ${result.p50Ms ?? "-"} | ${result.p95Ms ?? "-"} | ${result.p99Ms ?? "-"} |`;
  }).join("\n");
  const integrityRows = Object.entries(report.integrity).map(([name, value]) => `| ${name} | ${String(value)} |`).join("\n");
  return `# Load test — Phase ${phase}\n\n- Started: ${report.startedAt}\n- Target: isolated staging environment\n- Status: ${report.pass ? "PASS" : "FAIL"}\n\n## Operation metrics\n\n| Operation | Success | Rate | p50 ms | p95 ms | p99 ms |\n| --- | ---: | ---: | ---: | ---: | ---: |\n${rows}\n\n## Integrity checks\n\n| Check | Result |\n| --- | ---: |\n${integrityRows}\n\n## Errors\n\n${report.failures.length ? report.failures.slice(0, 25).map((failure) => `- ${failure.operation} (${failure.context}): ${failure.message}`).join("\n") : "None"}\n\n## Decision\n\n${report.pass ? `Phase ${phase} passed. ${phase < 3 ? `Phase ${phase + 1} may be started.` : "All planned phases passed."}` : `Phase ${phase} did not pass. Diagnose and rerun this phase before moving on.`}\n`;
}

const teacherAccounts = accounts.slice(0, plan.teachers);
try {
  await cleanTeachers(teacherAccounts.map((account) => account.username));
  const sessions = await Promise.all(teacherAccounts.map((teacher, index) => runClass(teacher, index)));
  const integrityPassed = await verifyIntegrity(sessions);
  const isolated = await verifyIsolation(sessions);
  const join = metrics(report.timings.join);
  const submit = metrics(report.timings.submit);
  const visibility = metrics(report.timings.visibility);
  report.pass = join.successRate >= 99.5 && submit.successRate >= 99.5 && (join.p95Ms ?? Infinity) < 2_000 && (submit.p95Ms ?? Infinity) < 2_000 && (visibility.p99Ms ?? Infinity) <= plan.visibilityLimitMs && integrityPassed && isolated;
} catch (error) {
  report.failures.push({ operation: "phase", context: `phase-${phase}`, message: error instanceof Error ? error.message : String(error) });
} finally {
  try { await cleanTeachers(teacherAccounts.map((account) => account.username)); } catch (error) {
    report.failures.push({ operation: "cleanup", context: `phase-${phase}`, message: error instanceof Error ? error.message : String(error) });
    report.pass = false;
  }
}

const reportDirectory = path.join(process.cwd(), "reports/loadtest");
await fs.mkdir(reportDirectory, { recursive: true });
await fs.writeFile(path.join(reportDirectory, `phase-${phase}-${Date.now()}.md`), markdown());
console.log(`Phase ${phase}: ${report.pass ? "PASS" : "FAIL"}`);
process.exitCode = report.pass ? 0 : 1;
