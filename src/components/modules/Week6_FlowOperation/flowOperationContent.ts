export type FlowQuestionKind = "production" | "shipping" | "final" | "duration" | "initial";

export type FlowScenario = {
  id: string;
  kind: FlowQuestionKind;
  initial: number;
  production: number;
  shipping: number;
  duration: number;
  final: number;
  choices: [number, number, number];
  answer: number;
};

export type FlowAction = { kind: FlowQuestionKind; value: number };
export type FlowRecord = { scenarioId: string; action: FlowAction };
export type FlowSimulation = Pick<FlowScenario, "initial" | "production" | "shipping" | "duration"> & { final: number };

export const productionPool: FlowScenario[] = [
  { id: "Q01", kind: "production", initial: 40, production: 14, shipping: 8, duration: 2, final: 52, choices: [10, 14, 18], answer: 14 },
  { id: "Q02", kind: "production", initial: 30, production: 8, shipping: 4, duration: 3, final: 42, choices: [6, 8, 10], answer: 8 },
  { id: "Q03", kind: "production", initial: 55, production: 4, shipping: 7, duration: 2, final: 49, choices: [2, 4, 6], answer: 4 },
  { id: "Q04", kind: "production", initial: 20, production: 9, shipping: 3, duration: 2, final: 32, choices: [7, 9, 11], answer: 9 },
  { id: "Q05", kind: "production", initial: 70, production: 4, shipping: 6, duration: 3, final: 64, choices: [2, 4, 8], answer: 4 },
  { id: "Q06", kind: "production", initial: 48, production: 11, shipping: 5, duration: 2, final: 60, choices: [9, 11, 13], answer: 11 },
];

export const shippingPool: FlowScenario[] = [
  { id: "Q07", kind: "shipping", initial: 50, production: 12, shipping: 8, duration: 2, final: 58, choices: [6, 8, 10], answer: 8 },
  { id: "Q08", kind: "shipping", initial: 36, production: 10, shipping: 6, duration: 3, final: 48, choices: [4, 6, 8], answer: 6 },
  { id: "Q09", kind: "shipping", initial: 80, production: 6, shipping: 8, duration: 2, final: 76, choices: [6, 8, 10], answer: 8 },
  { id: "Q10", kind: "shipping", initial: 24, production: 9, shipping: 6, duration: 2, final: 30, choices: [4, 6, 8], answer: 6 },
  { id: "Q11", kind: "shipping", initial: 65, production: 5, shipping: 6, duration: 3, final: 62, choices: [4, 6, 8], answer: 6 },
  { id: "Q12", kind: "shipping", initial: 40, production: 11, shipping: 8, duration: 2, final: 46, choices: [6, 8, 10], answer: 8 },
];

export const finalPool: FlowScenario[] = [
  { id: "Q13", kind: "final", initial: 45, production: 12, shipping: 7, duration: 2, final: 55, choices: [45, 55, 65], answer: 55 },
  { id: "Q14", kind: "final", initial: 60, production: 8, shipping: 12, duration: 3, final: 48, choices: [48, 52, 56], answer: 48 },
  { id: "Q15", kind: "final", initial: 25, production: 9, shipping: 5, duration: 3, final: 37, choices: [33, 37, 41], answer: 37 },
  { id: "Q16", kind: "final", initial: 90, production: 6, shipping: 10, duration: 2, final: 82, choices: [80, 82, 88], answer: 82 },
  { id: "Q17", kind: "final", initial: 35, production: 13, shipping: 8, duration: 2, final: 45, choices: [40, 45, 50], answer: 45 },
  { id: "Q18", kind: "final", initial: 72, production: 7, shipping: 7, duration: 4, final: 72, choices: [68, 72, 76], answer: 72 },
];

export const durationPool: FlowScenario[] = [
  { id: "Q19", kind: "duration", initial: 40, production: 10, shipping: 6, duration: 3, final: 52, choices: [2, 3, 4], answer: 3 },
  { id: "Q20", kind: "duration", initial: 60, production: 5, shipping: 9, duration: 3, final: 48, choices: [2, 3, 4], answer: 3 },
  { id: "Q21", kind: "duration", initial: 30, production: 10, shipping: 5, duration: 3, final: 45, choices: [2, 3, 4], answer: 3 },
  { id: "Q22", kind: "duration", initial: 70, production: 4, shipping: 8, duration: 2, final: 62, choices: [1, 2, 3], answer: 2 },
  { id: "Q23", kind: "duration", initial: 36, production: 9, shipping: 6, duration: 4, final: 48, choices: [2, 3, 4], answer: 4 },
  { id: "Q24", kind: "duration", initial: 90, production: 3, shipping: 8, duration: 3, final: 75, choices: [2, 3, 4], answer: 3 },
];

export const initialPool: FlowScenario[] = [
  { id: "Q25", kind: "initial", initial: 50, production: 12, shipping: 8, duration: 3, final: 62, choices: [44, 50, 56], answer: 50 },
  { id: "Q26", kind: "initial", initial: 48, production: 5, shipping: 9, duration: 2, final: 40, choices: [44, 48, 52], answer: 48 },
  { id: "Q27", kind: "initial", initial: 65, production: 11, shipping: 7, duration: 2, final: 73, choices: [61, 65, 69], answer: 65 },
  { id: "Q28", kind: "initial", initial: 60, production: 6, shipping: 8, duration: 3, final: 54, choices: [54, 60, 66], answer: 60 },
  { id: "Q29", kind: "initial", initial: 75, production: 10, shipping: 7, duration: 2, final: 81, choices: [69, 75, 81], answer: 75 },
  { id: "Q30", kind: "initial", initial: 50, production: 4, shipping: 10, duration: 2, final: 38, choices: [44, 50, 56], answer: 50 },
];

export const flowScenarioPools: Record<FlowQuestionKind, FlowScenario[]> = {
  production: productionPool,
  shipping: shippingPool,
  final: finalPool,
  duration: durationPool,
  initial: initialPool,
};

export const allFlowScenarios = Object.values(flowScenarioPools).flat();

export function calculateFinalStock(initial: number, production: number, shipping: number, duration: number) {
  return initial + (production - shipping) * duration;
}

export function simulateFlowSelection(scenario: FlowScenario, value: number): FlowSimulation {
  const initial = scenario.kind === "initial" ? value : scenario.initial;
  const production = scenario.kind === "production" ? value : scenario.production;
  const shipping = scenario.kind === "shipping" ? value : scenario.shipping;
  const duration = scenario.kind === "duration" ? value : scenario.duration;
  return { initial, production, shipping, duration, final: calculateFinalStock(initial, production, shipping, duration) };
}

export function scoreFlowAction(scenario: FlowScenario, action: FlowAction) {
  return action.kind === scenario.kind && action.value === scenario.answer ? 20 : 0;
}

export function scoreFlowRecords(round: readonly FlowScenario[], records: readonly FlowRecord[]) {
  return records.slice(0, 5).reduce((score, record, index) => {
    const scenario = round[index];
    return score + (scenario && record.scenarioId === scenario.id ? scoreFlowAction(scenario, record.action) : 0);
  }, 0);
}

function hashSeed(value: string) { let hash = 2166136261; for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); } return hash >>> 0; }
function seededRandom(seed: number) { let state = seed >>> 0; return () => { state += 0x6d2b79f5; let value = state; value = Math.imul(value ^ (value >>> 15), value | 1); value ^= value + Math.imul(value ^ (value >>> 7), value | 61); return ((value ^ (value >>> 14)) >>> 0) / 4294967296; }; }
export function seededShuffle<T>(items: readonly T[], seed: number) { const random = seededRandom(seed); const result = [...items]; for (let index = result.length - 1; index > 0; index -= 1) { const target = Math.floor(random() * (index + 1)); [result[index], result[target]] = [result[target]!, result[index]!]; } return result; }

export function shuffledFlowChoices(scenario: FlowScenario, seedKey: string) {
  return seededShuffle(scenario.choices, hashSeed(`${seedKey}:${scenario.id}:choices`));
}

export function buildFlowOperationRound(seedKey: string): [FlowScenario, FlowScenario, FlowScenario, FlowScenario, FlowScenario] {
  const kinds: FlowQuestionKind[] = ["production", "shipping", "final", "duration", "initial"];
  const selected = kinds.map((kind) => seededShuffle(flowScenarioPools[kind], hashSeed(`${seedKey}:${kind}`))[0]!);
  return seededShuffle(selected, hashSeed(`${seedKey}:order`)) as [FlowScenario, FlowScenario, FlowScenario, FlowScenario, FlowScenario];
}
