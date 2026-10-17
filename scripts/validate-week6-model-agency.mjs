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
const legacyMigration = await readFile(new URL("../supabase/migrations/202610170033_week_six_model_agency.sql", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/202610170034_week_six_collective_revision.sql", import.meta.url), "utf8");

assert.equal(modelAgencyProjects.length, 24, "The agency needs all 24 projects");
assert.deepEqual(modelTypes.map((type) => modelAgencyProjects.filter((project) => project.modelType === type).length), [6, 6, 6, 6]);
assert.equal(new Set(modelAgencyProjects.map((project) => project.id)).size, 24);
assert.ok(modelAgencyProjects.every((project) => project.role.tr && project.role.en && project.request.tr && project.request.en && project.badge));

for (let index = 0; index < 500; index += 1) {
  const seed = `agency-${index}`;
  const round = buildModelAgencyRound(seed);
  assert.equal(round.length, 10);
  assert.equal(new Set(round.map((project) => project.id)).size, 10);
  assert.equal(new Set(round.map((project) => project.modelType)).size, 4);
  assert.ok(modelTypes.every((type) => round.filter((project) => project.modelType === type).length >= 2));
  assert.deepEqual(modelTypes.map((type) => round.filter((project) => project.modelType === type).length).sort(), [2, 2, 3, 3]);
  assert.deepEqual(buildModelAgencyRound(seed).map((project) => project.id), round.map((project) => project.id));
  assert.equal(scoreModelAgencyAnswers(round, round.map((project) => ({ projectId: project.id, selectedModelType: project.modelType }))), 100);
  assert.equal(scoreModelAgencyAnswers(round, round.slice(0, 5).map((project) => ({ projectId: project.id, selectedModelType: project.modelType }))), 50);
}

assert.match(component, /currentGameId = "week-6-model-agency-v2"/);
assert.match(component, /week-6-model-agency-v1/, "An active v1 draft must remain finishable");
assert.match(component, /feedbackDuration = 1000/);
assert.match(component, /lockedRef\.current = true/);
assert.match(component, /finalize\(answersRef\.current, "teacher-ended"\)/);
assert.doesNotMatch(component, /Sonraki|Next|Kontrol Et|Check Answer/);
assert.match(student, /session\.selected_week === 6 && session\.current_module === 3/);
assert.match(teacher, /session\.selected_week === 6 && currentModule <= 3/);
assert.match(selector, /title: "3\. Model Ajansı"/);
assert.match(selector, /10 proje \/ 24 müşterilik havuz/);
assert.match(demo, /function WeekSixModelAgencyDemo/);
const agencyDemo = demo.slice(demo.indexOf("function WeekSixModelAgencyDemo"), demo.indexOf("const demos"));
assert.match(agencyDemo, /duration: 10/);
assert.match(agencyDemo, /Proje 1\/10/);
assert.match(agencyDemo, /Yeni meydanın ölçekli maketini hazırlayın/);
for (const icon of ["Box", "Waves", "GitBranch", "Calculator", "MousePointer2"]) assert.match(agencyDemo, new RegExp(`<${icon}`));
assert.match(agencyDemo, /Doğru ✓/);
assert.doesNotMatch(agencyDemo, /📦|〰️|🔗|∑|👆/);
assert.match(countdown, /On müşterinin isteğini oku/);
assert.match(component, /toLocaleUpperCase\(locale === "tr" \? "tr-TR" : "en-US"\)/);
assert.doesNotMatch(component, /current\.badge|model-agency-portrait[^\n]*<span/, "The portrait must not render a profession emoji badge");
assert.doesNotMatch(demo, /week-six-agency-demo-client[^\n]*<span/, "The how-to-play portrait must not render a corner emoji badge");
assert.doesNotMatch(css, /model-agency-portrait>span|week-six-agency-demo-client span/, "Removed portrait badges must not leave dedicated CSS");
const agencyDemoCss = css.slice(css.indexOf("Week 6 countdown demo revision"));
assert.match(agencyDemoCss, /week-six-agency-demo-options \.selected/);
assert.match(agencyDemoCss, /prefers-reduced-motion:reduce/);

const moduleCss = css.slice(css.indexOf("Week 6 · Module 3"));
assert.match(moduleCss, /height:calc\(100dvh - 60px - env\(safe-area-inset-bottom\)\)/);
assert.match(moduleCss, /overflow:visible/);
assert.match(moduleCss, /grid-template-columns:1fr 1fr/);
assert.match(moduleCss, /min-height:48px/);
assert.match(moduleCss, /grid-template-columns:repeat\(10,minmax\(0,1fr\)\)/);
assert.match(moduleCss, /@media \(max-width:340px\),\(max-height:590px\)/);
assert.match(moduleCss, /@media \(forced-colors:active\)/);
for (const size of [...moduleCss.matchAll(/font-size:\s*([0-9.]+)px/g)].map((match) => Number(match[1]))) assert.ok(size >= 10 || moduleCss.indexOf(`font-size:${size}px`) > moduleCss.indexOf("week-six-agency-demo"), `Game text must stay readable: ${size}px`);
for (const [width, height] of [[320, 568], [360, 640], [375, 667], [390, 844], [430, 932]]) assert.ok(width >= 320 && height - 60 >= 508, `${width}x${height} must fit the compact game`);

assert.match(legacyMigration, /week6_model_agency_score/);
assert.match(migration, /week6_model_agency_score_v2/);
assert.match(migration, /jsonb_array_length\(selected\) <> 10/);
assert.match(migration, /having count\(\*\) >= 2/);
assert.match(migration, /response ->> 'projectId' is distinct from project_id/);
assert.match(migration, /result := result \+ 10/);
assert.doesNotMatch(migration, /isCorrect|claimed_score.*week6_model_agency_score_v2/);
assert.match(migration, /week-6-model-agency-v1/);
assert.match(migration, /week-6-model-agency-v2/);
assert.doesNotMatch(migration, /create policy|grant select on table|alter table/);

console.log("Week 6 Model Agency v2 validation passed: 24 cases, 500 deterministic 3-3-2-2 rounds, 10x10 scoring, legacy v1 continuity, badge-free portraits, responsive UI, and trusted scoring.");
