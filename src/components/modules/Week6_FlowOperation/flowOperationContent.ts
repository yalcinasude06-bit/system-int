import type { Locale } from "@/lib/i18n/dictionaries";

export type LocalizedText = Record<Locale, string>;
export type FlowStageKind = "warehouse" | "tank" | "missing" | "timeline" | "graph";
export type TrendDirection = "up" | "flat" | "down";

type BaseScenario = { id: string; kind: FlowStageKind; title: LocalizedText; unit: LocalizedText };
export type WarehouseScenario = BaseScenario & { kind: "warehouse"; initial: number; outflow: number; duration: number; target: number; productionChoices: [number, number, number] };
export type TankScenario = BaseScenario & { kind: "tank"; initial: number; inflow: number; duration: number; target: number; capacity: 100 };
export type MissingScenario = BaseScenario & { kind: "missing"; initial: number; final: number; duration: number; knownFlow: number; hiddenFlow: "inflow" | "outflow" };
export type TimelineScenario = BaseScenario & { kind: "timeline"; initial: number; days: [{ inflow: number; outflow: number }, { inflow: number; outflow: number }] };
export type GraphScenario = BaseScenario & { kind: "graph"; initial: number; dailyFlows: [{ inflow: number; outflow: number }, { inflow: number; outflow: number }, { inflow: number; outflow: number }]; capacity?: number; floor?: number; distractors: [number[], number[]] };
export type FlowScenario = WarehouseScenario | TankScenario | MissingScenario | TimelineScenario | GraphScenario;

export type WarehouseAction = { kind: "warehouse"; productionRate: number };
export type TankAction = { kind: "tank"; outflowRate: number };
export type MissingAction = { kind: "missing"; flowValue: number };
export type TimelineAction = { kind: "timeline"; direction: TrendDirection };
export type GraphAction = { kind: "graph"; graphId: string };
export type FlowAction = WarehouseAction | TankAction | MissingAction | TimelineAction | GraphAction;
export type FlowRecord = { scenarioId: string; action: FlowAction };
export type GraphChoice = { id: string; values: number[] };

const l = (tr: string, en: string): LocalizedText => ({ tr, en });
const stockUnit = l("birim", "units");

export const warehousePool: WarehouseScenario[] = [
  { id: "A1", kind: "warehouse", title: l("Elektronik Deposu", "Electronics Depot"), unit: stockUnit, initial: 40, outflow: 8, duration: 2, target: 52, productionChoices: [10, 14, 18] },
  { id: "A2", kind: "warehouse", title: l("Mobilya Deposu", "Furniture Depot"), unit: stockUnit, initial: 60, outflow: 9, duration: 2, target: 70, productionChoices: [11, 14, 17] },
  { id: "A3", kind: "warehouse", title: l("Gıda Deposu", "Food Depot"), unit: stockUnit, initial: 75, outflow: 12, duration: 1, target: 83, productionChoices: [15, 20, 25] },
  { id: "A4", kind: "warehouse", title: l("Oyuncak Deposu", "Toy Depot"), unit: stockUnit, initial: 30, outflow: 6, duration: 3, target: 51, productionChoices: [10, 13, 16] },
  { id: "A5", kind: "warehouse", title: l("İlaç Deposu", "Medicine Depot"), unit: stockUnit, initial: 96, outflow: 15, duration: 2, target: 100, productionChoices: [12, 17, 22] },
  { id: "A6", kind: "warehouse", title: l("Kitap Deposu", "Book Depot"), unit: stockUnit, initial: 28, outflow: 7, duration: 4, target: 48, productionChoices: [9, 12, 15] },
];

export const tankPool: TankScenario[] = [
  { id: "B1", kind: "tank", title: l("Arıtma Tankı", "Treatment Tank"), unit: stockUnit, initial: 92, inflow: 14, duration: 2, target: 88, capacity: 100 },
  { id: "B2", kind: "tank", title: l("Soğutma Tankı", "Cooling Tank"), unit: stockUnit, initial: 88, inflow: 12, duration: 2, target: 80, capacity: 100 },
  { id: "B3", kind: "tank", title: l("Karışım Tankı", "Mixing Tank"), unit: stockUnit, initial: 95, inflow: 10, duration: 1, target: 90, capacity: 100 },
  { id: "B4", kind: "tank", title: l("Yağmur Tankı", "Rainwater Tank"), unit: stockUnit, initial: 85, inflow: 15, duration: 3, target: 70, capacity: 100 },
  { id: "B5", kind: "tank", title: l("Besleme Tankı", "Feed Tank"), unit: stockUnit, initial: 80, inflow: 18, duration: 2, target: 84, capacity: 100 },
  { id: "B6", kind: "tank", title: l("Yıkama Tankı", "Wash Tank"), unit: stockUnit, initial: 90, inflow: 16, duration: 3, target: 84, capacity: 100 },
];

export const missingPool: MissingScenario[] = [
  { id: "C1", kind: "missing", title: l("Kayıp Üretim Girişi", "Missing Production Inflow"), unit: stockUnit, initial: 40, final: 46, duration: 2, knownFlow: 7, hiddenFlow: "inflow" },
  { id: "C2", kind: "missing", title: l("Kayıp Sevkiyat Çıkışı", "Missing Shipping Outflow"), unit: stockUnit, initial: 62, final: 50, duration: 3, knownFlow: 6, hiddenFlow: "outflow" },
  { id: "C3", kind: "missing", title: l("Kayıp Dolum Girişi", "Missing Filling Inflow"), unit: stockUnit, initial: 25, final: 40, duration: 3, knownFlow: 4, hiddenFlow: "inflow" },
  { id: "C4", kind: "missing", title: l("Kayıp Tüketim Çıkışı", "Missing Consumption Outflow"), unit: stockUnit, initial: 90, final: 78, duration: 2, knownFlow: 8, hiddenFlow: "outflow" },
  { id: "C5", kind: "missing", title: l("Kayıp Tedarik Girişi", "Missing Supply Inflow"), unit: stockUnit, initial: 48, final: 68, duration: 4, knownFlow: 5, hiddenFlow: "inflow" },
  { id: "C6", kind: "missing", title: l("Kayıp Dağıtım Çıkışı", "Missing Distribution Outflow"), unit: stockUnit, initial: 72, final: 63, duration: 3, knownFlow: 7, hiddenFlow: "outflow" },
];

export const timelinePool: TimelineScenario[] = [
  { id: "D1", kind: "timeline", title: l("İki Günlük Paket Akışı", "Two-Day Package Flow"), unit: stockUnit, initial: 50, days: [{ inflow: 12, outflow: 7 }, { inflow: 9, outflow: 11 }] },
  { id: "D2", kind: "timeline", title: l("İki Günlük Sipariş Akışı", "Two-Day Order Flow"), unit: stockUnit, initial: 60, days: [{ inflow: 7, outflow: 13 }, { inflow: 10, outflow: 12 }] },
  { id: "D3", kind: "timeline", title: l("İki Günlük Malzeme Akışı", "Two-Day Material Flow"), unit: stockUnit, initial: 35, days: [{ inflow: 13, outflow: 8 }, { inflow: 6, outflow: 11 }] },
  { id: "D4", kind: "timeline", title: l("İki Günlük Ürün Akışı", "Two-Day Product Flow"), unit: stockUnit, initial: 90, days: [{ inflow: 6, outflow: 10 }, { inflow: 15, outflow: 8 }] },
  { id: "D5", kind: "timeline", title: l("İki Günlük Kasa Akışı", "Two-Day Cash Flow"), unit: stockUnit, initial: 45, days: [{ inflow: 16, outflow: 9 }, { inflow: 3, outflow: 13 }] },
  { id: "D6", kind: "timeline", title: l("İki Günlük Enerji Akışı", "Two-Day Energy Flow"), unit: stockUnit, initial: 70, days: [{ inflow: 5, outflow: 14 }, { inflow: 17, outflow: 8 }] },
];

export const graphPool: GraphScenario[] = [
  { id: "E1", kind: "graph", title: l("Düzenli Üretim", "Steady Production"), unit: stockUnit, initial: 20, dailyFlows: [{ inflow: 8, outflow: 4 }, { inflow: 8, outflow: 4 }, { inflow: 8, outflow: 4 }], distractors: [[20, 20, 20, 20], [20, 16, 12, 8]] },
  { id: "E2", kind: "graph", title: l("Hızlı Sevkiyat", "Fast Shipping"), unit: stockUnit, initial: 70, dailyFlows: [{ inflow: 4, outflow: 9 }, { inflow: 4, outflow: 9 }, { inflow: 4, outflow: 9 }], distractors: [[70, 75, 80, 85], [70, 70, 70, 70]] },
  { id: "E3", kind: "graph", title: l("Dengeli Hat", "Balanced Line"), unit: stockUnit, initial: 50, dailyFlows: [{ inflow: 7, outflow: 7 }, { inflow: 7, outflow: 7 }, { inflow: 7, outflow: 7 }], distractors: [[50, 57, 64, 71], [50, 43, 36, 29]] },
  { id: "E4", kind: "graph", title: l("Kapasite Sınırı", "Capacity Limit"), unit: stockUnit, initial: 90, dailyFlows: [{ inflow: 12, outflow: 4 }, { inflow: 12, outflow: 4 }, { inflow: 12, outflow: 4 }], capacity: 100, distractors: [[90, 98, 106, 114], [90, 82, 74, 66]] },
  { id: "E5", kind: "graph", title: l("Değişken Akış", "Variable Flow"), unit: stockUnit, initial: 40, dailyFlows: [{ inflow: 8, outflow: 4 }, { inflow: 4, outflow: 10 }, { inflow: 12, outflow: 5 }], distractors: [[40, 44, 48, 52], [40, 36, 32, 28]] },
  { id: "E6", kind: "graph", title: l("Alt Sınır", "Lower Bound"), unit: stockUnit, initial: 10, dailyFlows: [{ inflow: 2, outflow: 8 }, { inflow: 2, outflow: 8 }, { inflow: 2, outflow: 8 }], floor: 0, distractors: [[10, 4, -2, -8], [10, 16, 22, 28]] },
];

export const allFlowScenarios: FlowScenario[] = [...warehousePool, ...tankPool, ...missingPool, ...timelinePool, ...graphPool];

export function stockAfter(initial: number, inflow: number, outflow: number, duration: number, floor = 0, capacity = Number.POSITIVE_INFINITY) {
  return Math.min(capacity, Math.max(floor, initial + (inflow - outflow) * duration));
}

export function warehouseCorrectRate(scenario: WarehouseScenario) { return scenario.outflow + (scenario.target - scenario.initial) / scenario.duration; }
export function tankCorrectOutflow(scenario: TankScenario) { return scenario.inflow - (scenario.target - scenario.initial) / scenario.duration; }
export function missingCorrectFlow(scenario: MissingScenario) {
  const changePerStep = (scenario.final - scenario.initial) / scenario.duration;
  return scenario.hiddenFlow === "inflow" ? scenario.knownFlow + changePerStep : scenario.knownFlow - changePerStep;
}
export function timelineValues(scenario: TimelineScenario) {
  return scenario.days.reduce<number[]>((values, day) => [...values, stockAfter(values.at(-1)!, day.inflow, day.outflow, 1)], [scenario.initial]);
}
export function timelineDirection(scenario: TimelineScenario): TrendDirection {
  const final = timelineValues(scenario).at(-1)!;
  return final > scenario.initial ? "up" : final < scenario.initial ? "down" : "flat";
}
export function graphSimulation(scenario: GraphScenario) {
  let stock = scenario.initial;
  let overflow = 0;
  const values = [stock];
  for (const day of scenario.dailyFlows) {
    const raw = stock + day.inflow - day.outflow;
    overflow += Math.max(0, raw - (scenario.capacity ?? Number.POSITIVE_INFINITY));
    stock = Math.min(scenario.capacity ?? Number.POSITIVE_INFINITY, Math.max(scenario.floor ?? 0, raw));
    values.push(stock);
  }
  return { values, overflow };
}
export function graphChoices(scenario: GraphScenario, seedKey: string): GraphChoice[] {
  const correct = { id: `${scenario.id}-model`, values: graphSimulation(scenario).values };
  const choices = [correct, { id: `${scenario.id}-alt-a`, values: scenario.distractors[0] }, { id: `${scenario.id}-alt-b`, values: scenario.distractors[1] }];
  return seededShuffle(choices, hashSeed(`${seedKey}:${scenario.id}:graphs`));
}

export function scoreFlowAction(scenario: FlowScenario, action: FlowAction) {
  if (scenario.kind !== action.kind) return 0;
  if (scenario.kind === "warehouse" && action.kind === "warehouse") return action.productionRate === warehouseCorrectRate(scenario) ? 20 : 0;
  if (scenario.kind === "tank" && action.kind === "tank") return action.outflowRate === tankCorrectOutflow(scenario) ? 20 : 0;
  if (scenario.kind === "missing" && action.kind === "missing") return action.flowValue === missingCorrectFlow(scenario) ? 20 : 0;
  if (scenario.kind === "timeline" && action.kind === "timeline") return action.direction === timelineDirection(scenario) ? 20 : 0;
  return scenario.kind === "graph" && action.kind === "graph" && action.graphId === `${scenario.id}-model` ? 20 : 0;
}
export function scoreFlowRecords(round: readonly FlowScenario[], records: readonly FlowRecord[]) {
  return records.slice(0, 5).reduce((score, record, index) => score + (record.scenarioId === round[index]?.id ? scoreFlowAction(round[index]!, record.action) : 0), 0);
}

function hashSeed(value: string) { let hash = 2166136261; for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); } return hash >>> 0; }
function seededRandom(seed: number) { let state = seed >>> 0; return () => { state += 0x6d2b79f5; let value = state; value = Math.imul(value ^ (value >>> 15), value | 1); value ^= value + Math.imul(value ^ (value >>> 7), value | 61); return ((value ^ (value >>> 14)) >>> 0) / 4294967296; }; }
function seededShuffle<T>(items: readonly T[], seed: number) { const random = seededRandom(seed); const result = [...items]; for (let index = result.length - 1; index > 0; index -= 1) { const target = Math.floor(random() * (index + 1)); [result[index], result[target]] = [result[target]!, result[index]!]; } return result; }
export function buildFlowOperationRound(seedKey: string): [WarehouseScenario, TankScenario, MissingScenario, TimelineScenario, GraphScenario] {
  const select = <T>(pool: readonly T[], kind: FlowStageKind) => seededShuffle(pool, hashSeed(`${seedKey}:${kind}`))[0]!;
  return [select(warehousePool, "warehouse"), select(tankPool, "tank"), select(missingPool, "missing"), select(timelinePool, "timeline"), select(graphPool, "graph")];
}
