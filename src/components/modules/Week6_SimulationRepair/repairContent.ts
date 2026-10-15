import type { Locale } from "@/lib/i18n/dictionaries";

export type LocalizedText = Record<Locale, string>;
export type Diagnosis = "verification" | "validation";
export type RepairCategory = "sign" | "timestep" | "initial" | "unit" | "delay" | "relation" | "capacity" | "behavior";

type BaseScenario = {
  id: string;
  category: RepairCategory;
  diagnosis: Diagnosis;
  title: LocalizedText;
  context: LocalizedText;
  reference: LocalizedText;
  evidence: LocalizedText;
  brokenOutput: string | LocalizedText;
  fixedOutput: string | LocalizedText;
  modelSeries?: number[];
  realSeries?: number[];
  fixedSeries?: number[];
};

export type SignScenario = BaseScenario & { category: "sign"; terms: [number, number, number]; brokenSigns: ["+" | "-", "+" | "-"]; correctSigns: ["+" | "-", "+" | "-"] };
export type TimestepScenario = BaseScenario & { category: "timestep"; initial: number; inflow: number; outflow: number; brokenValue: number; correctValue: number; choices: number[] };
export type InitialScenario = BaseScenario & { category: "initial"; brokenValue: number; correctValue: number; inflow: number; outflow: number; choices: number[]; suffix?: string };
export type UnitScenario = BaseScenario & { category: "unit"; input: number; brokenOperation: string; correctOperation: "times24" | "divide1000" | "percentOf200"; operationChoices: ("times24" | "divide1000" | "percentOf200")[] };
export type DelayScenario = BaseScenario & { category: "delay"; source: LocalizedText; target: LocalizedText; correctDelay: number; delayUnit: "days" | "weeks"; delayChoices: number[] };
export type RelationScenario = BaseScenario & { category: "relation"; nodes: { id: string; label: LocalizedText }[]; correctFrom: string; correctTo: string; polarity: "positive" | "negative" };
export type CapacityScenario = BaseScenario & { category: "capacity"; brokenCapacity: number; correctCapacity: number; capacityChoices: number[]; unit: LocalizedText };
export type BehaviorScenario = BaseScenario & { category: "behavior"; correctStructure: "seasonal" | "balancing" | "delayed"; structureChoices: ("seasonal" | "balancing" | "delayed")[] };
export type RepairScenario = SignScenario | TimestepScenario | InitialScenario | UnitScenario | DelayScenario | RelationScenario | CapacityScenario | BehaviorScenario;

export type SignRepair = { kind: "sign"; signs: ["+" | "-", "+" | "-"] };
export type TimestepRepair = { kind: "timestep"; value: number };
export type InitialRepair = { kind: "initial"; value: number };
export type UnitRepair = { kind: "unit"; operation: UnitScenario["correctOperation"] };
export type DelayRepair = { kind: "delay"; value: number; unit: DelayScenario["delayUnit"] };
export type RelationRepair = { kind: "relation"; from: string; to: string; polarity: RelationScenario["polarity"] };
export type CapacityRepair = { kind: "capacity"; value: number };
export type BehaviorRepair = { kind: "behavior"; structure: BehaviorScenario["correctStructure"] };
export type RepairAction = SignRepair | TimestepRepair | InitialRepair | UnitRepair | DelayRepair | RelationRepair | CapacityRepair | BehaviorRepair;
export type RepairProgress = { caseId: string; diagnosis?: Diagnosis; repair?: RepairAction };

const l = (tr: string, en: string): LocalizedText => ({ tr, en });

export function localizedOutput(value: string | LocalizedText, locale: Locale) {
  return typeof value === "string" ? value : value[locale];
}

export const signCases: SignScenario[] = [
  { id: "V01", category: "sign", diagnosis: "verification", title: l("Stok işaretleri", "Stock signs"), context: l("Başlangıç 100 · üretim 20 · sevkiyat 12", "Initial 100 · production 20 · shipping 12"), reference: l("Model tanımı: 100 + 20 − 12 = 108", "Model definition: 100 + 20 − 12 = 108"), evidence: l("Program iki akışın yönünü ters uyguluyor.", "The program applies both flow directions in reverse."), brokenOutput: "92", fixedOutput: "108", terms: [100, 20, 12], brokenSigns: ["-", "+"], correctSigns: ["+", "-"] },
  { id: "V02", category: "sign", diagnosis: "verification", title: l("Nüfus işareti", "Population sign"), context: l("Nüfus 50 · doğum 3 · ölüm 2", "Population 50 · births 3 · deaths 2"), reference: l("Model tanımı: 50 + 3 − 2 = 51", "Model definition: 50 + 3 − 2 = 51"), evidence: l("Ölüm terimi kodda nüfusa ekleniyor.", "The death term is added to population in code."), brokenOutput: "55", fixedOutput: "51", terms: [50, 3, 2], brokenSigns: ["+", "+"], correctSigns: ["+", "-"] },
  { id: "V03", category: "sign", diagnosis: "verification", title: l("Kuyruk işareti", "Queue sign"), context: l("Kuyruk 30 · gelen 12 · tamamlanan 8", "Queue 30 · arrivals 12 · completed 8"), reference: l("Model tanımı: 30 + 12 − 8 = 34", "Model definition: 30 + 12 − 8 = 34"), evidence: l("Gelen işler kodda kuyruktan çıkarılıyor.", "Arrivals are subtracted from the queue in code."), brokenOutput: "10", fixedOutput: "34", terms: [30, 12, 8], brokenSigns: ["-", "-"], correctSigns: ["+", "-"] },
];

export const timestepCases: TimestepScenario[] = [
  { id: "V04", category: "timestep", diagnosis: "verification", title: l("Yarım günlük adım", "Half-day step"), context: l("Stok 40 · giriş 8/gün · çıkış 4/gün", "Stock 40 · inflow 8/day · outflow 4/day"), reference: l("Şartname: Δt = 0,5 gün · beklenen 42", "Specification: Δt = 0.5 day · expected 42"), evidence: l("Program Δt=1 kullanıp 44 üretiyor.", "The program uses Δt=1 and produces 44."), brokenOutput: "44", fixedOutput: "42", initial: 40, inflow: 8, outflow: 4, brokenValue: 1, correctValue: .5, choices: [.25, .5, 1] },
  { id: "V05", category: "timestep", diagnosis: "verification", title: l("Çeyrek adım", "Quarter step"), context: l("Stok 20 · giriş 2 · çıkış 10", "Stock 20 · inflow 2 · outflow 10"), reference: l("Şartname: Δt = 0,25 · beklenen 18", "Specification: Δt = 0.25 · expected 18"), evidence: l("Program Δt=1 kullanıp 12 üretiyor.", "The program uses Δt=1 and produces 12."), brokenOutput: "12", fixedOutput: "18", initial: 20, inflow: 2, outflow: 10, brokenValue: 1, correctValue: .25, choices: [.2, .25, 1] },
  { id: "V06", category: "timestep", diagnosis: "verification", title: l("Beşte bir adım", "One-fifth step"), context: l("Stok 70 · giriş 6 · çıkış 16", "Stock 70 · inflow 6 · outflow 16"), reference: l("Şartname: Δt = 0,2 · beklenen 68", "Specification: Δt = 0.2 · expected 68"), evidence: l("Program Δt=1 kullanıp 60 üretiyor.", "The program uses Δt=1 and produces 60."), brokenOutput: "60", fixedOutput: "68", initial: 70, inflow: 6, outflow: 16, brokenValue: 1, correctValue: .2, choices: [.1, .2, 1] },
];

export const initialCases: InitialScenario[] = [
  { id: "V07", category: "initial", diagnosis: "verification", title: l("İlk stok", "Initial stock"), context: l("Giriş 10 · çıkış 4", "Inflow 10 · outflow 4"), reference: l("Şartname: ilk stok 80 · beklenen 86", "Specification: initial stock 80 · expected 86"), evidence: l("Kod ilk stoku 0 alıp 6 üretiyor.", "Code starts stock at 0 and produces 6."), brokenOutput: "6", fixedOutput: "86", brokenValue: 0, correctValue: 80, inflow: 10, outflow: 4, choices: [0, 40, 80] },
  { id: "V08", category: "initial", diagnosis: "verification", title: l("Açılış kuyruğu", "Opening queue"), context: l("Gelen 6 · tamamlanan 8", "Arrivals 6 · completed 8"), reference: l("Şartname: açılışta 24 müşteri · beklenen 22", "Specification: 24 customers at opening · expected 22"), evidence: l("Kod kuyruğu 0'dan başlatıyor.", "Code starts the queue at 0."), brokenOutput: "0", fixedOutput: "22", brokenValue: 0, correctValue: 24, inflow: 6, outflow: 8, choices: [0, 12, 24] },
  { id: "V09", category: "initial", diagnosis: "verification", title: l("Batarya başlangıcı", "Battery start"), context: l("Şarj +8 · tüketim −10", "Charge +8 · use −10"), reference: l("Şartname: ilk doluluk %60 · beklenen %58", "Specification: initial charge 60% · expected 58%"), evidence: l("Kod bataryayı %0'dan başlatıyor.", "Code starts the battery at 0%."), brokenOutput: "%0", fixedOutput: "%58", brokenValue: 0, correctValue: 60, inflow: 8, outflow: 10, choices: [0, 30, 60], suffix: "%" },
];

export const unitCases: UnitScenario[] = [
  { id: "V10", category: "unit", diagnosis: "verification", title: l("Saatten güne", "Hourly to daily"), context: l("Üretim hızı: 5 ürün/saat", "Production rate: 5 units/hour"), reference: l("Bir günlük toplam 5 × 24 olmalı.", "One-day total must be 5 × 24."), evidence: l("Program 5'i doğrudan günlük toplam kullanıyor.", "The program uses 5 directly as the daily total."), brokenOutput: "5", fixedOutput: "120", input: 5, brokenOperation: "× 1", correctOperation: "times24", operationChoices: ["times24", "divide1000", "percentOf200"] },
  { id: "V11", category: "unit", diagnosis: "verification", title: l("Kilogramdan tona", "Kilograms to tonnes"), context: l("Malzeme miktarı: 1500 kg", "Material amount: 1500 kg"), reference: l("Ton tutan stokta 1500 ÷ 1000 kullanılmalı.", "A tonne-based stock must use 1500 ÷ 1000."), evidence: l("Program 1500 kg'ı 1500 ton gösteriyor.", "The program displays 1500 kg as 1500 tonnes."), brokenOutput: "1500 t", fixedOutput: "1,5 t", input: 1500, brokenOperation: "× 1", correctOperation: "divide1000", operationChoices: ["divide1000", "times24", "percentOf200"] },
  { id: "V12", category: "unit", diagnosis: "verification", title: l("Orandan adede", "Rate to count"), context: l("200 ürün · %10 fire", "200 units · 10% waste"), reference: l("Fire: %10 × 200 olmalı.", "Waste must be 10% × 200."), evidence: l("Program %10'u 10 adet sanıyor.", "The program treats 10% as 10 units."), brokenOutput: "10", fixedOutput: "20", input: 200, brokenOperation: "%10", correctOperation: "percentOf200", operationChoices: ["percentOf200", "times24", "divide1000"] },
];

export const delayCases: DelayScenario[] = [
  { id: "G13", category: "delay", diagnosis: "validation", title: l("Tedarik gecikmesi", "Supply delay"), context: l("Gerçekte tedarik 4 gün sonra geliyor.", "In reality, supply arrives after 4 days."), reference: l("Kod testi geçti: anlık teslimat denklemi doğru çalışıyor.", "Code test passed: the instant-delivery equation runs correctly."), evidence: l("Model teslimatı aynı gün gösteriyor; gözlem 4 gün bekliyor.", "The model delivers the same day; observations wait 4 days."), brokenOutput: l("Anlık", "Instant"), fixedOutput: l("4 gün", "4 days"), source: l("Tedarik", "Supply"), target: l("Mal kabul", "Receiving"), correctDelay: 4, delayUnit: "days", delayChoices: [2, 4, 6], modelSeries: [0, 8, 12, 15, 17], realSeries: [0, 0, 0, 0, 8], fixedSeries: [0, 0, 0, 0, 8] },
  { id: "G14", category: "delay", diagnosis: "validation", title: l("Eğitim etkisi", "Training effect"), context: l("Kalite etkisi gerçekte 2 hafta sonra başlıyor.", "The quality effect starts after 2 weeks in reality."), reference: l("Kod testi geçti: anlık etki denklemi doğru çalışıyor.", "Code test passed: the instant-effect equation runs correctly."), evidence: l("Model kaliteyi hemen artırıyor; gözlem gecikmeli.", "The model raises quality immediately; observation is delayed."), brokenOutput: "0", fixedOutput: l("2 hafta", "2 weeks"), source: l("Eğitim", "Training"), target: l("Kalite", "Quality"), correctDelay: 2, delayUnit: "weeks", delayChoices: [1, 2, 4], modelSeries: [20, 45, 62, 72, 78], realSeries: [20, 20, 20, 45, 62], fixedSeries: [20, 20, 20, 45, 62] },
  { id: "G15", category: "delay", diagnosis: "validation", title: l("Bakım süresi", "Maintenance duration"), context: l("Bakımın tamamlanması gerçekte 3 gün sürüyor.", "Maintenance takes 3 days to complete in reality."), reference: l("Kod testi geçti: anlık sağlık etkisi doğru hesaplanıyor.", "Code test passed: the instant health effect is calculated correctly."), evidence: l("Model arıza riskini hemen düşürüyor.", "The model reduces failure risk immediately."), brokenOutput: "0", fixedOutput: l("3 gün", "3 days"), source: l("Bakım", "Maintenance"), target: l("Makine sağlığı", "Machine health"), correctDelay: 3, delayUnit: "days", delayChoices: [1, 3, 5], modelSeries: [70, 42, 25, 18, 15], realSeries: [70, 70, 70, 42, 25], fixedSeries: [70, 70, 70, 42, 25] },
];

export const relationCases: RelationScenario[] = [
  { id: "G16", category: "relation", diagnosis: "validation", title: l("Besin ve ölüm", "Food and mortality"), context: l("Besin kıtlığı ölüm oranını artırıyor.", "Food scarcity increases mortality."), reference: l("Kod testi geçti: mevcut nüfus denklemleri tutarlı.", "Code test passed: existing population equations are consistent."), evidence: l("Modelde besin ile ölüm oranı arasında bağ yok.", "The model has no link from food to mortality."), brokenOutput: "—", fixedOutput: "↘", nodes: [{ id: "food", label: l("Besin düzeyi", "Food level") }, { id: "death", label: l("Ölüm oranı", "Mortality") }, { id: "birth", label: l("Doğum oranı", "Birth rate") }], correctFrom: "food", correctTo: "death", polarity: "negative", modelSeries: [50, 50, 50, 50], realSeries: [50, 44, 35, 29], fixedSeries: [50, 44, 35, 29] },
  { id: "G17", category: "relation", diagnosis: "validation", title: l("Fiyat ve talep", "Price and demand"), context: l("Fiyat arttıkça gerçek talep düşüyor.", "Real demand falls as price rises."), reference: l("Kod testi geçti: bağımsız talep hesabı doğru çalışıyor.", "Code test passed: the independent demand calculation works."), evidence: l("Modelde fiyat değişimi talebi etkilemiyor.", "Price changes do not affect demand in the model."), brokenOutput: "—", fixedOutput: "↘", nodes: [{ id: "price", label: l("Fiyat", "Price") }, { id: "demand", label: l("Talep", "Demand") }, { id: "supply", label: l("Arz", "Supply") }], correctFrom: "price", correctTo: "demand", polarity: "negative", modelSeries: [60, 60, 60, 60], realSeries: [60, 52, 43, 34], fixedSeries: [60, 52, 43, 34] },
  { id: "G18", category: "relation", diagnosis: "validation", title: l("Kuyruk ve vardiya", "Queue and staffing"), context: l("Kuyruk yükselince yöneticiler vardiyayı büyütüyor.", "Managers increase staffing when the queue grows."), reference: l("Kod testi geçti: mevcut vardiya değeri doğru uygulanıyor.", "Code test passed: the current staffing value is applied correctly."), evidence: l("Kuyruk ile vardiya kararı arasında bağlantı yok.", "There is no connection from queue to staffing decision."), brokenOutput: "—", fixedOutput: "↗", nodes: [{ id: "queue", label: l("Kuyruk", "Queue") }, { id: "shift", label: l("Vardiya kararı", "Staffing decision") }, { id: "price", label: l("Fiyat", "Price") }], correctFrom: "queue", correctTo: "shift", polarity: "positive", modelSeries: [30, 42, 55, 70], realSeries: [30, 42, 48, 45], fixedSeries: [30, 42, 48, 45] },
];

export const capacityCases: CapacityScenario[] = [
  { id: "G19", category: "capacity", diagnosis: "validation", title: l("Paketleme kapasitesi", "Packing capacity"), context: l("Gerçek hat en çok 12 ürün/gün tamamlıyor.", "The real line completes at most 12 units/day."), reference: l("Kod testi geçti: sınırsız çıkış denklemi doğru çalışıyor.", "Code test passed: the unlimited-output equation runs correctly."), evidence: l("Model 20/gün çıkışa izin veriyor.", "The model allows output of 20/day."), brokenOutput: l("20/gün", "20/day"), fixedOutput: l("12/gün", "12/day"), brokenCapacity: 20, correctCapacity: 12, capacityChoices: [8, 12, 20], unit: l("ürün/gün", "units/day"), modelSeries: [0, 20, 40, 60], realSeries: [0, 12, 24, 36], fixedSeries: [0, 12, 24, 36] },
  { id: "G20", category: "capacity", diagnosis: "validation", title: l("Depo üst sınırı", "Warehouse limit"), context: l("Gerçek depo en fazla 500 ürün alıyor.", "The real warehouse holds at most 500 units."), reference: l("Kod testi geçti: sınırsız stok birikimi doğru hesaplanıyor.", "Code test passed: unlimited stock accumulation is calculated correctly."), evidence: l("Model stokun 650'ye çıkmasına izin veriyor.", "The model allows stock to rise to 650."), brokenOutput: "650", fixedOutput: "500 + 150", brokenCapacity: 650, correctCapacity: 500, capacityChoices: [400, 500, 650], unit: l("ürün", "units"), modelSeries: [350, 450, 550, 650], realSeries: [350, 450, 500, 500], fixedSeries: [350, 450, 500, 500] },
  { id: "G21", category: "capacity", diagnosis: "validation", title: l("Tank kapasitesi", "Tank capacity"), context: l("Tankın gerçek kapasitesi 100.", "The tank's real capacity is 100."), reference: l("Kod testi geçti: sınırsız seviye denklemi doğru çalışıyor.", "Code test passed: the unlimited-level equation runs correctly."), evidence: l("Model 120 seviyesini kabul ediyor.", "The model accepts a level of 120."), brokenOutput: "120", fixedOutput: "100 + 20", brokenCapacity: 120, correctCapacity: 100, capacityChoices: [80, 100, 120], unit: l("birim", "units"), modelSeries: [70, 88, 104, 120], realSeries: [70, 88, 100, 100], fixedSeries: [70, 88, 100, 100] },
];

export const behaviorCases: BehaviorScenario[] = [
  { id: "G22", category: "behavior", diagnosis: "validation", title: l("Mevsimsel talep", "Seasonal demand"), context: l("Gerçek talep mevsimsel dalgalanıyor.", "Real demand fluctuates seasonally."), reference: l("Kod testi geçti: sabit talep varsayımı doğru uygulanıyor.", "Code test passed: the constant-demand assumption is implemented correctly."), evidence: l("Model düz çizgi üretiyor; gözlem dalgalı.", "The model produces a flat line; observations fluctuate."), brokenOutput: l("Sabit", "Flat"), fixedOutput: l("Mevsimsel", "Seasonal"), correctStructure: "seasonal", structureChoices: ["seasonal", "balancing", "delayed"], modelSeries: [50, 50, 50, 50, 50], realSeries: [35, 62, 42, 68, 38], fixedSeries: [35, 62, 42, 68, 38] },
  { id: "G23", category: "behavior", diagnosis: "validation", title: l("Hedefe dönüş", "Return to target"), context: l("Gerçek stok zamanla hedefe dönüyor.", "Real stock returns to its target over time."), reference: l("Kod testi geçti: geri bildirimsiz büyüme doğru uygulanıyor.", "Code test passed: growth without feedback is implemented correctly."), evidence: l("Model sınırsız büyüyor; gözlem hedefte dengeleniyor.", "The model grows without limit; observation settles at a target."), brokenOutput: "∞", fixedOutput: l("Denge", "Balance"), correctStructure: "balancing", structureChoices: ["balancing", "seasonal", "delayed"], modelSeries: [30, 50, 75, 105, 140], realSeries: [30, 58, 74, 80, 80], fixedSeries: [30, 58, 74, 80, 80] },
  { id: "G24", category: "behavior", diagnosis: "validation", title: l("Gecikmeli düzeltme", "Delayed correction"), context: l("Gerçek sistem hedef çevresinde aşıp geri dönüyor.", "The real system overshoots and returns around the target."), reference: l("Kod testi geçti: anlık düzeltme kuralı doğru uygulanıyor.", "Code test passed: the instant-correction rule is implemented correctly."), evidence: l("Model düzgün yaklaşırken gözlem salınıyor.", "The model approaches smoothly while observations oscillate."), brokenOutput: l("Düzgün", "Smooth"), fixedOutput: l("Aşma", "Overshoot"), correctStructure: "delayed", structureChoices: ["delayed", "balancing", "seasonal"], modelSeries: [20, 45, 62, 72, 78], realSeries: [20, 70, 92, 68, 82], fixedSeries: [20, 70, 92, 68, 82] },
];

export const repairCasePools: Record<RepairCategory, RepairScenario[]> = { sign: signCases, timestep: timestepCases, initial: initialCases, unit: unitCases, delay: delayCases, relation: relationCases, capacity: capacityCases, behavior: behaviorCases };
export const allRepairCases: RepairScenario[] = Object.values(repairCasePools).flat();

export function repairIsCorrect(scenario: RepairScenario, repair: RepairAction | undefined) {
  if (!repair || repair.kind !== scenario.category) return false;
  if (scenario.category === "sign" && repair.kind === "sign") return repair.signs[0] === scenario.correctSigns[0] && repair.signs[1] === scenario.correctSigns[1];
  if (scenario.category === "timestep" && repair.kind === "timestep") return repair.value === scenario.correctValue;
  if (scenario.category === "initial" && repair.kind === "initial") return repair.value === scenario.correctValue;
  if (scenario.category === "unit" && repair.kind === "unit") return repair.operation === scenario.correctOperation;
  if (scenario.category === "delay" && repair.kind === "delay") return repair.value === scenario.correctDelay && repair.unit === scenario.delayUnit;
  if (scenario.category === "relation" && repair.kind === "relation") return repair.from === scenario.correctFrom && repair.to === scenario.correctTo && repair.polarity === scenario.polarity;
  if (scenario.category === "capacity" && repair.kind === "capacity") return repair.value === scenario.correctCapacity;
  return scenario.category === "behavior" && repair.kind === "behavior" && repair.structure === scenario.correctStructure;
}

export function scoreRepairProgress(round: readonly RepairScenario[], progress: readonly RepairProgress[]) {
  return progress.slice(0, 5).reduce((score, record, index) => {
    const scenario = round[index];
    if (!scenario || record.caseId !== scenario.id) return score;
    return score + (record.diagnosis === scenario.diagnosis ? 8 : 0) + (repairIsCorrect(scenario, record.repair) ? 12 : 0);
  }, 0);
}

function hashSeed(value: string) { let hash = 2166136261; for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); } return hash >>> 0; }
function seededRandom(seed: number) { let state = seed >>> 0; return () => { state += 0x6d2b79f5; let value = state; value = Math.imul(value ^ (value >>> 15), value | 1); value ^= value + Math.imul(value ^ (value >>> 7), value | 61); return ((value ^ (value >>> 14)) >>> 0) / 4294967296; }; }
function seededShuffle<T>(items: readonly T[], seed: number) { const random = seededRandom(seed); const result = [...items]; for (let index = result.length - 1; index > 0; index -= 1) { const target = Math.floor(random() * (index + 1)); [result[index], result[target]] = [result[target]!, result[index]!]; } return result; }

export function buildRepairRound(seedKey: string): [RepairScenario, RepairScenario, RepairScenario, RepairScenario, RepairScenario] {
  const verification: RepairCategory[] = ["sign", "timestep", "initial", "unit"];
  const validation: RepairCategory[] = ["delay", "relation", "capacity", "behavior"];
  const threeVerification = hashSeed(`${seedKey}:balance`) % 2 === 0;
  const selected = [
    ...seededShuffle(verification, hashSeed(`${seedKey}:verification`)).slice(0, threeVerification ? 3 : 2),
    ...seededShuffle(validation, hashSeed(`${seedKey}:validation`)).slice(0, threeVerification ? 2 : 3),
  ];
  const categories = seededShuffle(selected, hashSeed(`${seedKey}:order`));
  return categories.map((category) => seededShuffle(repairCasePools[category], hashSeed(`${seedKey}:${category}:case`))[0]!) as [RepairScenario, RepairScenario, RepairScenario, RepairScenario, RepairScenario];
}
