import assert from "node:assert/strict";
import { crisisCases } from "../src/components/modules/Week8_CrisisMeeting/crisisMeetingContent.ts";
import { scoreCrisisAttempts } from "../src/components/modules/Week8_CrisisMeeting/crisisMeetingEngine.ts";
import { evidenceCases } from "../src/components/modules/Week8_EvidenceMarket/evidenceMarketContent.ts";
import { scoreEvidenceAttempts } from "../src/components/modules/Week8_EvidenceMarket/evidenceMarketEngine.ts";

assert.equal(crisisCases.length, 5);
assert.equal(evidenceCases.length, 5);
assert.equal(scoreCrisisAttempts(crisisCases.map((item) => ({ caseId: item.id, allocation: item.ideal }))), 100);
assert.equal(scoreEvidenceAttempts(evidenceCases.map((item) => ({ caseId: item.id, opened: item.required, solutionId: item.correct }))), 100);
assert.equal(scoreCrisisAttempts([{ caseId: "CM1", allocation: [0, 0, 2, 1] }]), 20);
assert.equal(scoreCrisisAttempts([{ caseId: "CM1", allocation: [1, 0, 1, 1] }]), 16);
assert.equal(scoreEvidenceAttempts([{ caseId: "EM1", opened: ["density", "route"], solutionId: "forklift" }]), 8);
for (const item of evidenceCases) assert.ok(item.evidence.reduce((sum, evidence) => sum + (item.required.includes(evidence.id) ? evidence.cost : 0), 0) <= 70);
console.log("Week 8 game validation passed.");
