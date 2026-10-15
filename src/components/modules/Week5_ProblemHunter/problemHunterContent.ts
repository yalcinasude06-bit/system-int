import type { Locale } from "@/lib/i18n/dictionaries";

export type TargetCategory = "event" | "pattern" | "structure";
export type TargetContext = "delivery" | "production" | "safety" | "inventory" | "sales" | "coordination";
export type LocalizedText = Record<Locale, string>;

export type TargetItem = {
  id: string;
  text: LocalizedText;
  category: TargetCategory;
  context: TargetContext;
  icon: string;
  explanation: LocalizedText;
};

export type ScheduledTarget = TargetItem & {
  level: number;
  task: TargetCategory;
  hole: number;
  spawnAtMs: number;
  durationMs: number;
};

export type HunterOutcome = "correct" | "wrong" | "miss" | "ignored";
export type HunterAction = {
  targetId: string;
  level: number;
  task: TargetCategory;
  category: TargetCategory;
  outcome: HunterOutcome;
  points: number;
  atMs: number;
};

export const HUNTER_LEVEL_DURATION_MS = 36_000;
export const HUNTER_TASK_WINDOW_MS = 12_000;
export const HUNTER_TASK_TRANSITION_MS = 2_000;
export const HUNTER_TARGET_DURATION_MS = [6_000, 5_500, 5_000] as const;
export const HUNTER_CORRECT_POINTS = 10;

const contextIcons: Record<TargetContext, string> = {
  delivery: "🚚",
  production: "⚙️",
  safety: "🦺",
  inventory: "📦",
  sales: "🤝",
  coordination: "🔄",
};

const explanations: Record<TargetCategory, LocalizedText> = {
  event: { tr: "Belirli bir anda gerçekleşen tekil bir gözlemi anlatır.", en: "It describes a single observation at a specific time." },
  pattern: { tr: "Zaman içinde tekrarlanan veya yön değiştiren bir eğilimi anlatır.", en: "It describes a repetition or trend observed over time." },
  structure: { tr: "Davranışı üretebilecek bir kuralı, süreci veya ilişkiyi anlatır.", en: "It describes a rule, process, or relationship that could produce behavior." },
};

type ContentRow = [id: string, category: TargetCategory, context: TargetContext, tr: string, en: string];

function buildItems(_version: string, items: ContentRow[]) {
  return items;
}

const rows = buildItems("week-5-problem-hunter-v2", [
  ["T01", "event", "delivery", "Bugün üç sipariş gecikti.", "Three orders were delayed today."],
  ["T02", "event", "delivery", "Sabahki sevkiyat yetişmedi.", "The morning shipment did not arrive on time."],
  ["T03", "event", "delivery", "Bir sipariş yanlış adrese gitti.", "One order went to the wrong address."],
  ["T04", "event", "delivery", "Dün bir müşteri ürünü geç aldı.", "A customer received the product late yesterday."],
  ["T05", "event", "delivery", "Bugün bir sevkiyat iptal edildi.", "A shipment was canceled today."],
  ["T06", "pattern", "delivery", "Geciken sipariş sayısı üç aydır artıyor.", "Delayed orders have risen for three months."],
  ["T07", "pattern", "delivery", "Siparişler her hafta gecikiyor.", "Orders are delayed every week."],
  ["T08", "pattern", "delivery", "Yoğun dönemlerde gecikmeler tekrarlanıyor.", "Delays recur during busy periods."],
  ["T09", "pattern", "delivery", "Son haftalarda sevkiyat süresi uzuyor.", "Shipment times have grown in recent weeks."],
  ["T10", "pattern", "delivery", "Yanlış teslimatlar her ay artıyor.", "Incorrect deliveries increase every month."],
  ["T11", "structure", "delivery", "Siparişler kapasiteye göre planlanmıyor.", "Orders are not planned according to capacity."],
  ["T12", "structure", "delivery", "Sevkiyat görevleri açıkça tanımlanmamış.", "Shipping responsibilities are not clearly defined."],
  ["T13", "structure", "delivery", "Satış ve üretim arasında bilgi paylaşımı yok.", "Sales and production do not share information."],
  ["T14", "structure", "delivery", "Acil siparişler için öncelik kuralı yok.", "There is no priority rule for urgent orders."],
  ["T15", "structure", "delivery", "Depo ile sevkiyatın ortak kayıt sistemi yok.", "Warehouse and shipping lack a shared record system."],

  ["U01", "event", "production", "Bugün makine bozuldu.", "The machine broke down today."],
  ["U02", "event", "production", "Sabah üretim hattı durdu.", "The production line stopped this morning."],
  ["U03", "event", "production", "Dün bir parça hatalı üretildi.", "A part was produced incorrectly yesterday."],
  ["U04", "event", "production", "Bir makine bugün aşırı ısındı.", "A machine overheated today."],
  ["U05", "event", "production", "Gece vardiyasında üretim kesildi.", "Production stopped during the night shift."],
  ["U06", "pattern", "production", "Son aylarda arızalar artıyor.", "Failures have increased in recent months."],
  ["U07", "pattern", "production", "Yoğun vardiyalarda arızalar tekrarlanıyor.", "Failures recur during busy shifts."],
  ["U08", "pattern", "production", "Hatalı ürün sayısı her hafta artıyor.", "The number of defective products rises every week."],
  ["U09", "pattern", "production", "Üretim duruşları giderek uzuyor.", "Production stoppages are getting longer."],
  ["U10", "pattern", "production", "Her ay benzer üretim aksaklıkları yaşanıyor.", "Similar production disruptions occur every month."],
  ["U11", "structure", "production", "Düzenli bakım planı yok.", "There is no regular maintenance plan."],
  ["U12", "structure", "production", "Üretim planında makine kapasitesi kontrol edilmiyor.", "Machine capacity is not checked in production planning."],
  ["U13", "structure", "production", "Hata bildirimleri bakım ekibine iletilmiyor.", "Failure reports are not sent to the maintenance team."],
  ["U14", "structure", "production", "Makine kontrolü için sorumlu atanmamış.", "No one is assigned to inspect the machines."],
  ["U15", "structure", "production", "Üretim öncesi kontrol adımı tanımlanmamış.", "No pre-production inspection step has been defined."],

  ["G01", "event", "safety", "Bugün depoda yangın çıktı.", "A fire broke out in the warehouse today."],
  ["G02", "event", "safety", "Sabah iş kazası yaşandı.", "A workplace accident occurred this morning."],
  ["G03", "event", "safety", "Bir güvenlik alarmı bugün çalışmadı.", "A safety alarm failed today."],
  ["G04", "event", "safety", "Bu sabah makinenin koruyucu kapağı yerinden çıktı.", "The machine's safety cover came off this morning."],
  ["G05", "event", "safety", "Bir iş kazası dün bildirildi.", "A workplace accident was reported yesterday."],
  ["G06", "pattern", "safety", "İş kazaları son üç ayda arttı.", "Workplace accidents rose for three months."],
  ["G07", "pattern", "safety", "Aynı bölümde kazalar tekrar ediyor.", "Accidents keep recurring in the same department."],
  ["G08", "pattern", "safety", "Güvenlik ihlalleri her hafta görülüyor.", "Safety violations are observed every week."],
  ["G09", "pattern", "safety", "Vardiya sonlarında kazalar sıklaşıyor.", "Accidents become more frequent near shift endings."],
  ["G10", "pattern", "safety", "Küçük yangınlar son dönemde artıyor.", "Small fires have increased recently."],
  ["G11", "structure", "safety", "İş güvenliği kuralları belirlenmemiş.", "Workplace safety rules have not been defined."],
  ["G12", "structure", "safety", "Riskli işler için yazılı prosedür yok.", "There is no written procedure for risky tasks."],
  ["G13", "structure", "safety", "Güvenlik kontrolünden sorumlu kişi yok.", "No person is responsible for safety inspections."],
  ["G14", "structure", "safety", "Acil çıkış yollarının kontrol planı yok.", "There is no inspection plan for emergency exits."],
  ["G15", "structure", "safety", "Tehlike bildirimlerini izleyen bir süreç yok.", "There is no process for tracking hazard reports."],

  ["S01", "event", "inventory", "Bugün bir ürün stokta kalmadı.", "A product ran out of stock today."],
  ["S02", "event", "inventory", "Dün depo sayımında hata bulundu.", "An error was found in yesterday's warehouse count."],
  ["S03", "event", "inventory", "Bir sipariş stoktan karşılanamadı.", "An order could not be filled from stock."],
  ["S04", "event", "inventory", "Bugün depoya fazla mal geldi.", "Excess goods arrived at the warehouse today."],
  ["S05", "event", "inventory", "Sabah bir ürün yanlış rafa kondu.", "A product was placed on the wrong shelf this morning."],
  ["S06", "pattern", "inventory", "Stok eksikleri her ay tekrarlanıyor.", "Stock shortages recur every month."],
  ["S07", "pattern", "inventory", "Yoğun dönemlerde ürünler tükeniyor.", "Products run out during busy periods."],
  ["S08", "pattern", "inventory", "Fazla stok miktarı aylardır artıyor.", "Excess inventory has increased for months."],
  ["S09", "pattern", "inventory", "Depo sayım farkları sık görülüyor.", "Warehouse count differences are frequently observed."],
  ["S10", "pattern", "inventory", "Son haftalarda stok devir hızı düşüyor.", "Inventory turnover has fallen in recent weeks."],
  ["S11", "structure", "inventory", "Yeniden sipariş verme kuralı yok.", "There is no reorder rule."],
  ["S12", "structure", "inventory", "Stok hedefleri satış tahminine bağlanmamış.", "Inventory targets are not linked to sales forecasts."],
  ["S13", "structure", "inventory", "Raf yerleşimi için standart düzen yok.", "There is no standard layout for shelves."],
  ["S14", "structure", "inventory", "Depoya giriş kayıt kontrolü tanımlanmamış.", "No incoming inventory record check has been defined."],
  ["S15", "structure", "inventory", "Satış ile depo arasında ortak stok ekranı yok.", "Sales and warehouse lack a shared inventory screen."],

  ["M01", "event", "sales", "Bugün bir müşteri siparişini iptal etti.", "A customer canceled an order today."],
  ["M02", "event", "sales", "Dün bir müşteri şikâyet yazdı.", "A customer submitted a complaint yesterday."],
  ["M03", "event", "sales", "Bugün bir müşteri sipariş vermekten vazgeçti.", "A customer decided not to place an order today."],
  ["M04", "event", "sales", "Bir müşteri bugün iade istedi.", "A customer requested a return today."],
  ["M05", "event", "sales", "Dün bir fiyat teklifi reddedildi.", "A price quote was rejected yesterday."],
  ["M06", "pattern", "sales", "Müşteri şikâyetleri üç aydır artıyor.", "Customer complaints have risen for three months."],
  ["M07", "pattern", "sales", "Satışlar son haftalarda düşüyor.", "Sales have declined in recent weeks."],
  ["M08", "pattern", "sales", "İadeler her ay daha sık yaşanıyor.", "Returns occur more often every month."],
  ["M09", "pattern", "sales", "Tekrar satın alma oranı giderek azalıyor.", "The repeat purchase rate is steadily declining."],
  ["M10", "pattern", "sales", "Kampanya bitince satışlar sık düşüyor.", "Sales often fall after campaigns end."],
  ["M11", "structure", "sales", "Şikâyetleri ilgili ekibe aktaran süreç yok.", "No process routes complaints to the right team."],
  ["M12", "structure", "sales", "Satış hedefleri stok kapasitesine göre belirlenmiyor.", "Sales targets ignore inventory capacity."],
  ["M13", "structure", "sales", "İade kararları için ortak kural yok.", "There is no shared rule for return decisions."],
  ["M14", "structure", "sales", "Satış ve kalite ekipleri veri paylaşmıyor.", "Sales and quality teams do not share data."],
  ["M15", "structure", "sales", "Müşteri taleplerini izleyen kayıt sistemi yok.", "No record system tracks customer requests."],

  ["K01", "event", "coordination", "Bugün iki ekip aynı işi yaptı.", "Two teams performed the same task today."],
  ["K02", "event", "coordination", "Dün bir görev sahipsiz kaldı.", "A task had no owner yesterday."],
  ["K03", "event", "coordination", "Bu sabah toplantı iptal edildi.", "This morning's meeting was canceled."],
  ["K04", "event", "coordination", "Bir talep bugün yanlış ekibe gitti.", "A request went to the wrong team today."],
  ["K05", "event", "coordination", "Dün bir karar geç bildirildi.", "A decision was communicated late yesterday."],
  ["K06", "pattern", "coordination", "Görev karışıklıkları sık tekrarlanıyor.", "Task mix-ups recur frequently."],
  ["K07", "pattern", "coordination", "Toplantılar her hafta uzuyor.", "Meetings run longer every week."],
  ["K08", "pattern", "coordination", "Ekipler arası bekleme süresi artıyor.", "Waiting time between teams is increasing."],
  ["K09", "pattern", "coordination", "Aynı işler her ay yeniden yapılıyor.", "The same tasks are redone every month."],
  ["K10", "pattern", "coordination", "Yanlış ekibe giden talepler çoğalıyor.", "Requests sent to the wrong team are increasing."],
  ["K11", "structure", "coordination", "Bölümlerin görev sınırları tanımlanmamış.", "Department responsibility boundaries are not defined."],
  ["K12", "structure", "coordination", "Birimler için ortak iş akışı yok.", "There is no shared workflow across units."],
  ["K13", "structure", "coordination", "Kararları paylaşacak sorumlu belirlenmemiş.", "No one is assigned to communicate decisions."],
  ["K14", "structure", "coordination", "İş devri için standart süreç bulunmuyor.", "There is no standard process for work handoffs."],
  ["K15", "structure", "coordination", "Ekipler ortak hedefle değerlendirilmiyor.", "Teams are not evaluated against a shared goal."],
]);

export const problemHunterPool: TargetItem[] = rows.map(([id, category, context, tr, en]) => ({
  id,
  category,
  context,
  text: { tr, en },
  icon: contextIcons[context],
  explanation: explanations[category],
}));

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

type Slot = { level: number; task: TargetCategory; category: TargetCategory; spawnAtMs: number; durationMs: number };

const taskCycle: TargetCategory[] = ["event", "pattern", "structure"];
const levelOneTimes = [500, 4_200, 7_900, 11_600, 15_300, 19_000];
const levelTwoTimes = [500, 4_200, 7_900, 11_600, 15_300, 19_000];
const phaseOffsets = [500, 3_500, 6_500];

function scheduleSlots(random: () => number = () => .5): Slot[] {
  const levelOneCategories = shuffle<TargetCategory>(["structure", "structure", "structure", "event", "event", "pattern"], random);
  const levelTwoCategories = shuffle<TargetCategory>(["pattern", "pattern", "pattern", "event", "event", "structure"], random);
  const slots: Slot[] = levelOneTimes.map((spawnAtMs, index) => ({ level: 0, task: "structure", category: levelOneCategories[index]!, spawnAtMs, durationMs: HUNTER_TARGET_DURATION_MS[0] }));
  levelTwoTimes.forEach((spawnAtMs, index) => slots.push({ level: 1, task: "pattern", category: levelTwoCategories[index]!, spawnAtMs, durationMs: HUNTER_TARGET_DURATION_MS[1] }));
  taskCycle.forEach((task, phase) => {
    const traps = (["event", "pattern", "structure"] as TargetCategory[]).filter((category) => category !== task);
    const phaseCategories = shuffle<TargetCategory>([task, traps[0]!, traps[1]!], random);
    phaseOffsets.forEach((offset, index) => slots.push({ level: 2, task, category: phaseCategories[index]!, spawnAtMs: phase * HUNTER_TASK_WINDOW_MS + offset, durationMs: HUNTER_TARGET_DURATION_MS[2] }));
  });
  return slots;
}

const scoringSlots = scheduleSlots();
export const HUNTER_CORRECT_OPPORTUNITIES = scoringSlots.filter((slot) => slot.category === slot.task).length;
export const HUNTER_MAX_HIT_SCORE = HUNTER_CORRECT_OPPORTUNITIES * HUNTER_CORRECT_POINTS;

export function taskForLevelTime(level: number, elapsedMs: number): TargetCategory {
  if (level === 0) return "structure";
  if (level === 1) return "pattern";
  return taskCycle[Math.min(taskCycle.length - 1, Math.floor(elapsedMs / HUNTER_TASK_WINDOW_MS))]!;
}

export function isHunterLevelComplete(schedule: readonly ScheduledTarget[], resolvedTargetIds: ReadonlySet<string>, level: number) {
  const levelTargets = schedule.filter((target) => target.level === level);
  return levelTargets.length > 0 && levelTargets.every((target) => resolvedTargetIds.has(target.id));
}

export function buildProblemHunterRound(seedKey: string): ScheduledTarget[] {
  const random = seededRandom(hashSeed(`week-5-problem-hunter:${seedKey}`));
  const practiceAdjacentIds = new Set(["T01", "T06", "T11"]);
  const pools = Object.fromEntries((["event", "pattern", "structure"] as TargetCategory[]).map((category) => {
    const shuffled = shuffle(problemHunterPool.filter((item) => item.category === category), random);
    return [category, [...shuffled.filter((item) => !practiceAdjacentIds.has(item.id)), ...shuffled.filter((item) => practiceAdjacentIds.has(item.id))]];
  })) as Record<TargetCategory, TargetItem[]>;
  const preferredIds: Record<TargetCategory, string[]> = {
    event: ["U01", "G02"],
    pattern: ["T07", "U06"],
    structure: ["U11", "G11", "T13", "S11"],
  };
  const preferredPools = Object.fromEntries((Object.keys(preferredIds) as TargetCategory[]).map((category) => [
    category,
    shuffle(preferredIds[category].map((id) => problemHunterPool.find((item) => item.id === id)!), random),
  ])) as Record<TargetCategory, TargetItem[]>;
  const cursors: Record<TargetCategory, number> = { event: 0, pattern: 0, structure: 0 };
  const usedIds = new Set<string>();
  const slots = scheduleSlots(random);
  const holeCycles = Array.from({ length: Math.ceil(slots.length / 6) }, () => shuffle([0, 1, 2, 3, 4, 5], random)).flat();
  let previousHole = -1;
  return slots.map((slot, index) => {
    let item = slot.level === 0 ? preferredPools[slot.category].find((candidate) => !usedIds.has(candidate.id)) : undefined;
    while (!item) {
      const candidate = pools[slot.category][cursors[slot.category]++]!;
      if (!usedIds.has(candidate.id)) item = candidate;
    }
    usedIds.add(item.id);
    let hole = holeCycles[index]!;
    while (hole === previousHole) hole = (hole + 1) % 6;
    previousHole = hole;
    return { ...item, ...slot, hole };
  });
}

export function arcadeScoreFor(actions: readonly HunterAction[]) {
  return Math.max(0, actions.reduce((score, action) => score + action.points, 0));
}

// The maximum is derived from the schedule's actual hittable targets, so pace
// changes cannot silently change the value of a perfect 100-point play.
export function normalizedHunterScore(actions: readonly HunterAction[], correctOpportunityCount = HUNTER_CORRECT_OPPORTUNITIES) {
  const maximumScore = Math.max(1, correctOpportunityCount * HUNTER_CORRECT_POINTS);
  return Math.max(0, Math.min(100, Math.round(arcadeScoreFor(actions) / maximumScore * 100)));
}
