import type { Locale } from "@/lib/i18n/dictionaries";

export type ChainProductKind = "good" | "defective";
export type ChainRoute = "shipping" | "recycling";
export type ChainProduct = {
  id: string;
  section: number;
  spawnAtMs: number;
  kind: ChainProductKind;
  label: Record<Locale, string>;
};

export type ChainDecision = {
  productId: string;
  section: number;
  kind: ChainProductKind;
  route: ChainRoute;
  correct: boolean;
  points: number;
  decidedAtMs: number;
};

export const CHAIN_SECTION_DURATION_MS = 30_000;
export const CHAIN_SECTION_COUNTS = [5, 7, 8] as const;
export const CHAIN_TOTAL_PRODUCTS = CHAIN_SECTION_COUNTS.reduce((total, count) => total + count, 0);
export const CHAIN_MAX_RAW_SCORE = CHAIN_TOTAL_PRODUCTS * 10;
export const CHAIN_SENSOR_PROGRESS = .28;

const sectionSchedules = [
  [3_500, 8_500, 13_500, 18_500, 23_500],
  [3_500, 7_000, 10_500, 14_000, 17_500, 21_000, 24_500],
  [3_500, 6_300, 9_100, 11_900, 14_700, 17_500, 20_300, 23_100],
] as const;

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target]!, result[index]!];
  }
  return result;
}

export function buildChainChaosScenario(seedKey: string): ChainProduct[] {
  const random = seededRandom(hashSeed(`week-5-chain-chaos:${seedKey}`));
  return sectionSchedules.flatMap((schedule, section) => {
    const defectiveCount = Math.floor(schedule.length / 2);
    const kinds = shuffle<ChainProductKind>([
      ...Array.from({ length: schedule.length - defectiveCount }, () => "good" as const),
      ...Array.from({ length: defectiveCount }, () => "defective" as const),
    ], random);
    return schedule.map((spawnAtMs, index) => ({
      id: `W5M1-S${section + 1}-P${index + 1}-${kinds[index] === "good" ? "G" : "D"}`,
      section,
      spawnAtMs,
      kind: kinds[index]!,
      label: kinds[index] === "good"
        ? { tr: "Sağlam ürün", en: "Good product" }
        : { tr: "Hatalı ürün", en: "Defective product" },
    }));
  });
}

export function isCorrectRoute(kind: ChainProductKind, route: ChainRoute) {
  return (kind === "good" && route === "shipping") || (kind === "defective" && route === "recycling");
}

export function rawScoreFor(decisions: readonly ChainDecision[]) {
  return decisions.reduce((score, decision) => Math.max(0, score + decision.points), 0);
}

export function normalizedChainScore(decisions: readonly ChainDecision[]) {
  return Math.round(rawScoreFor(decisions) / CHAIN_MAX_RAW_SCORE * 100);
}

export function chaosFor(decisions: readonly ChainDecision[]) {
  return Math.min(100, decisions.reduce((chaos, decision) => {
    if (decision.correct) return chaos;
    return chaos + (decision.kind === "defective" ? 18 : 8);
  }, 0));
}

export function activeWorkload(decisions: readonly ChainDecision[], section: number, elapsedMs: number) {
  return decisions.reduce((load, decision) => {
    if (decision.section !== section || decision.correct) return load;
    const age = elapsedMs - decision.decidedAtMs;
    if (decision.kind === "defective" && age >= 2_800 && age < 11_000) return load + 1;
    if (decision.kind === "good" && age >= 0 && age < 6_000) return load + .6;
    return load;
  }, 0);
}

export function transitDurationFor(product: ChainProduct, decisions: readonly ChainDecision[]) {
  const priorLoad = activeWorkload(decisions, product.section, product.spawnAtMs);
  const sectionBase = [3_200, 2_850, 2_550][product.section] ?? 2_550;
  return sectionBase * (1 + Math.min(1.8, priorLoad) * .22);
}
