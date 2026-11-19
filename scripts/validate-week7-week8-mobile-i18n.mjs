import assert from "node:assert/strict";
import fs from "node:fs";
import { loopSignCases } from "../src/components/modules/Week7_LoopSigns/loopSignsContent.ts";
import { stockRaceRounds } from "../src/components/modules/Week7_StockRace/stockRaceContent.ts";
import { curveRounds } from "../src/components/modules/Week7_DrawTheCurve/curveContent.ts";
import { crisisCases } from "../src/components/modules/Week8_CrisisMeeting/crisisMeetingContent.ts";
import { evidenceCases } from "../src/components/modules/Week8_EvidenceMarket/evidenceMarketContent.ts";

function verifyLocalized(value, path = "root") {
  if (Array.isArray(value)) return value.forEach((item, index) => verifyLocalized(item, `${path}[${index}]`));
  if (!value || typeof value !== "object") return;
  if (Object.hasOwn(value, "tr") || Object.hasOwn(value, "en")) {
    assert.equal(typeof value.tr, "string", `${path}.tr missing`);
    assert.equal(typeof value.en, "string", `${path}.en missing`);
    assert.ok(value.tr.trim().length > 0, `${path}.tr empty`);
    assert.ok(value.en.trim().length > 0, `${path}.en empty`);
    return;
  }
  for (const [key, child] of Object.entries(value)) verifyLocalized(child, `${path}.${key}`);
}

verifyLocalized({ loopSignCases, stockRaceRounds, curveRounds, crisisCases, evidenceCases });
assert.deepEqual([loopSignCases.length, stockRaceRounds.length, curveRounds.length, crisisCases.length, evidenceCases.length], [5, 5, 5, 5, 5]);

const week7Css = fs.readFileSync(new URL("../src/components/modules/week7Games.module.css", import.meta.url), "utf8");
const week8Css = fs.readFileSync(new URL("../src/components/modules/week8Games.module.css", import.meta.url), "utf8");
assert.doesNotMatch(week7Css, /font-size:\s*(?:[1-9](?:\.\d+)?|10(?:\.0+)?)px\b/, "Week 7 contains text smaller than 10.5px");
assert.doesNotMatch(week8Css, /font-size:\s*\.(?:[1-6])\d*rem\b/, "Week 8 contains text smaller than .7rem");
assert.match(week7Css, /@media \(max-width: 600px\)/);
assert.match(week8Css, /@media\(max-width:480px\)/);
console.log("Week 7–8 mobile typography and bilingual content validation passed.");
