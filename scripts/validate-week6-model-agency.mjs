import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildModelAgencyRound, modelAgencyProjects, modelTypes, scoreModelAgencyAnswers } from "../src/components/modules/Week6_ModelAgency/modelAgencyContent.ts";

const component = await readFile(new URL("../src/components/modules/Week6_ModelAgency/index.tsx", import.meta.url), "utf8");
const student = await readFile(new URL("../src/app/student/play/[pin]/page.tsx", import.meta.url), "utf8");
const teacher = await readFile(new URL("../src/app/teacher/session/[pin]/page.tsx", import.meta.url), "utf8");
const selector = await readFile(new URL("../src/components/teacher/ModuleSelector.tsx", import.meta.url), "utf8");
const demo = await readFile(new URL("../src/components/common/ModuleGameplayDemo.tsx", import.meta.url), "utf8");
const countdown = await readFile(new URL("../src/components/common/ModuleStartCountdown.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/202610170033_week_six_model_agency.sql", import.meta.url), "utf8");

assert.equal(modelAgencyProjects.length, 24, "The agency needs all 24 projects");
assert.deepEqual(modelTypes.map((type) => modelAgencyProjects.filter((project) => project.modelType === type).length), [6, 6, 6, 6]);
assert.equal(new Set(modelAgencyProjects.map((project) => project.id)).size, 24);
assert.ok(modelAgencyProjects.every((project) => project.role.tr && project.role.en && project.request.tr && project.request.en && project.badge));

for (let index = 0; index < 500; index += 1) {
  const seed = `agency-${index}`;
  const round = buildModelAgencyRound(seed);
  assert.equal(round.length, 5);
  assert.equal(new Set(round.map((project) => project.id)).size, 5);
  assert.equal(new Set(round.map((project) => project.modelType)).size, 4);
  assert.deepEqual(buildModelAgencyRound(seed).map((project) => project.id), round.map((project) => project.id));
  assert.equal(scoreModelAgencyAnswers(round, round.map((project) => ({ projectId: project.id, selectedModelType: project.modelType }))), 100);
}

assert.match(component, /gameId = "week-6-model-agency-v1"/);
assert.match(component, /feedbackDuration = 1000/);
assert.match(component, /lockedRef\.current = true/);
assert.match(component, /finalize\(answersRef\.current, "teacher-ended"\)/);
assert.doesNotMatch(component, /Sonraki|Next|Kontrol Et|Check Answer/);
assert.match(student, /session\.selected_week === 6 && session\.current_module === 3/);
assert.match(teacher, /session\.selected_week === 6 && currentModule <= 3/);
assert.match(selector, /title: "3\. Model Ajansı"/);
assert.match(demo, /function WeekSixModelAgencyDemo/);
assert.match(countdown, /Gerçek bir müşterinin isteğini oku/);

const moduleCss = css.slice(css.indexOf("Week 6 · Module 3"));
assert.match(moduleCss, /height:calc\(100dvh - 60px - env\(safe-area-inset-bottom\)\)/);
assert.match(moduleCss, /overflow:visible/);
assert.match(moduleCss, /grid-template-columns:1fr 1fr/);
assert.match(moduleCss, /min-height:48px/);
assert.match(moduleCss, /@media \(max-width:340px\),\(max-height:590px\)/);
assert.match(moduleCss, /@media \(forced-colors:active\)/);
for (const size of [...moduleCss.matchAll(/font-size:\s*([0-9.]+)px/g)].map((match) => Number(match[1]))) assert.ok(size >= 10 || moduleCss.indexOf(`font-size:${size}px`) > moduleCss.indexOf("week-six-agency-demo"), `Game text must stay readable: ${size}px`);
for (const [width, height] of [[320, 568], [360, 640], [375, 667], [390, 844], [430, 932]]) assert.ok(width >= 320 && height - 60 >= 508, `${width}x${height} must fit the compact game`);

assert.match(migration, /week6_model_agency_score/);
assert.match(migration, /count\(distinct public\.week6_model_agency_type\(value\)\).*<> 4/s);
assert.match(migration, /response ->> 'projectId' is distinct from project_id/);
assert.match(migration, /result := result \+ 20/);
assert.doesNotMatch(migration, /isCorrect|claimed_score.*week6_model_agency_score/);
assert.match(migration, /target_module_id > 3/);
assert.match(migration, /current_module in \(1, 2, 3\)/);
assert.doesNotMatch(migration, /create policy|grant select on table|alter table/);

console.log("Week 6 Model Agency validation passed: 24 cases, deterministic balanced rounds, one-tap flow, responsive UI, integration, and trusted scoring.");
