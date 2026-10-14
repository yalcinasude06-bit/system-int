import type { Locale } from "@/lib/i18n/dictionaries";

export type TargetCategory = "event" | "pattern" | "structure";
export type TargetContext = "production" | "logistics" | "sales" | "inventory" | "quality" | "service";
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

export const HUNTER_LEVEL_DURATION_MS = 20_000;
export const HUNTER_TASK_WINDOW_MS = 5_000;
export const HUNTER_TASK_TRANSITION_MS = 600;
export const HUNTER_MAX_HIT_SCORE = 130;
export const HUNTER_CORRECT_OPPORTUNITIES = 13;

const contextIcons: Record<TargetContext, string> = {
  production: "⚙️",
  logistics: "🚚",
  sales: "📈",
  inventory: "📦",
  quality: "🔎",
  service: "🎧",
};

const explanations: Record<TargetCategory, LocalizedText> = {
  event: { tr: "Belirli bir anda gerçekleşmiş tekil bir sonucu anlatır.", en: "It describes a single outcome at a specific time." },
  pattern: { tr: "Zaman içinde tekrar eden bir eğilim veya davranışı anlatır.", en: "It describes a trend or behavior repeated over time." },
  structure: { tr: "Sonuçları üretebilen yerleşik kural, ilişki veya süreci anlatır.", en: "It describes an established rule, relationship, or process that can produce outcomes." },
};

type ContentRow = [TargetContext, string, string];

function buildItems(prefix: string, category: TargetCategory, rows: ContentRow[]): TargetItem[] {
  return rows.map(([context, tr, en], index) => ({
    id: `W5M2-${prefix}${String(index + 1).padStart(2, "0")}`,
    text: { tr, en },
    category,
    context,
    icon: contextIcons[context],
    explanation: explanations[category],
  }));
}

const eventItems = buildItems("E", "event", [
  ["production", "Bugün paketleme hattı 18 dakika durdu.", "The packaging line stopped for 18 minutes today."],
  ["production", "Bu sabah pres makinesi arıza verdi.", "The press machine failed this morning."],
  ["production", "Dünkü vardiyada sekiz parça reddedildi.", "Eight parts were rejected during yesterday's shift."],
  ["production", "Saat 14.00 üretim hedefi kaçırıldı.", "The production target was missed at 2 p.m."],
  ["production", "Pazartesi montaj bandında bir kaza yaşandı.", "An accident occurred on the assembly line on Monday."],
  ["logistics", "Bugün 12 sipariş geç teslim edildi.", "Twelve orders were delivered late today."],
  ["logistics", "Bu sabah bir kamyon yanlış depoya gitti.", "A truck went to the wrong warehouse this morning."],
  ["logistics", "Dünkü sevkiyatta iki koli hasar gördü.", "Two parcels were damaged in yesterday's shipment."],
  ["logistics", "Saat 09.00 rotasındaki araç yolda kaldı.", "The vehicle on the 9 a.m. route broke down."],
  ["logistics", "Bugünkü sevkiyatlardan biri yanlış adrese gitti.", "One of today's shipments went to the wrong address."],
  ["sales", "Dün büyük bir müşteri siparişini iptal etti.", "A major customer canceled an order yesterday."],
  ["sales", "Bu sabah çevrim içi satış sistemi kapandı.", "The online sales system went offline this morning."],
  ["sales", "Bugün hedeflenen satışın yüzde 70'i gerçekleşti.", "Seventy percent of today's sales target was reached."],
  ["sales", "Saat 16.00'da kampanya kodu çalışmadı.", "The campaign code failed at 4 p.m."],
  ["sales", "Dünkü teklif müşteri tarafından reddedildi.", "Yesterday's proposal was rejected by the customer."],
  ["inventory", "Akşam vardiyasında bir malzeme eksik çıktı.", "One material was missing during the evening shift."],
  ["inventory", "Bugün A rafındaki ürün tükendi.", "The product on shelf A ran out today."],
  ["inventory", "Dün sistemde 24 adet fazla stok göründü.", "The system showed 24 excess items yesterday."],
  ["inventory", "Bu sabah sayımda üç koli bulunamadı.", "Three parcels were missing in this morning's count."],
  ["inventory", "Saat 11.00'de acil malzeme talebi açıldı.", "An urgent material request was opened at 11 a.m."],
  ["quality", "Dün bir müşteri hatalı ürün bildirdi.", "A customer reported a defective product yesterday."],
  ["quality", "Bugün iki ürün kalite kontrolünden geçemedi.", "Two products failed quality control today."],
  ["quality", "Bu sabah ölçüm cihazı yanlış değer verdi.", "The measuring device gave a wrong value this morning."],
  ["quality", "Dünkü numunede yüzey çatlağı bulundu.", "A surface crack was found in yesterday's sample."],
  ["quality", "Saat 13.00 partisinde etiket hatası görüldü.", "A labeling error was found in the 1 p.m. batch."],
  ["service", "Bugün çağrı merkezine 38 şikâyet geldi.", "The call center received 38 complaints today."],
  ["service", "Bu sabah bir müşteri 22 dakika bekledi.", "A customer waited for 22 minutes this morning."],
  ["service", "Dünkü destek talebi yanlış ekibe aktarıldı.", "Yesterday's support request was sent to the wrong team."],
  ["service", "Saat 10.00 randevusuna temsilci katılmadı.", "The representative missed the 10 a.m. appointment."],
  ["service", "Bugün bir iade talebi yanıtsız kaldı.", "A return request went unanswered today."],
]);

const patternItems = buildItems("P", "pattern", [
  ["production", "Son altı ayda plansız duruşlar sürekli arttı.", "Unplanned stoppages rose steadily over six months."],
  ["production", "Her yoğun sezonda üretim arızaları artıyor.", "Production failures rise during every peak season."],
  ["production", "Gece vardiyalarında çıktı miktarı hep düşüyor.", "Output consistently drops during night shifts."],
  ["production", "Hat değişimlerinde bekleme süresi giderek uzuyor.", "Waiting time keeps growing during line changes."],
  ["production", "Son dört haftadır günlük üretim dalgalanıyor.", "Daily production has fluctuated for four weeks."],
  ["logistics", "Son altı ayda teslimat gecikmeleri sürekli arttı.", "Delivery delays rose steadily over six months."],
  ["logistics", "Her ay sonunda sevkiyat yığılması oluşuyor.", "A shipment backlog forms at the end of every month."],
  ["logistics", "Yağışlı günlerde teslimat süresi düzenli uzuyor.", "Delivery time regularly grows on rainy days."],
  ["logistics", "Son haftalarda boş araç dönüşleri artıyor.", "Empty vehicle returns have risen in recent weeks."],
  ["logistics", "Pazartesi rotalarında gecikme sık tekrarlanıyor.", "Delays frequently recur on Monday routes."],
  ["sales", "Satışlar üç çeyrektir düşüş eğiliminde.", "Sales have trended downward for three quarters."],
  ["sales", "Her kampanya sonrası iadeler geçici olarak yükseliyor.", "Returns temporarily rise after every campaign."],
  ["sales", "Ayın son haftasında indirim talebi artıyor.", "Discount requests rise in the last week of each month."],
  ["sales", "Yeni müşterilerin tekrar alışveriş oranı düşüyor.", "Repeat purchases by new customers are declining."],
  ["sales", "Son beş haftadır çevrim içi dönüşüm oranı artıyor.", "Online conversion has risen for five weeks."],
  ["inventory", "Stok seviyeleri her ay sert biçimde dalgalanıyor.", "Inventory levels fluctuate sharply every month."],
  ["inventory", "Kritik malzemeler her çeyrekte yeniden tükeniyor.", "Critical materials run out again every quarter."],
  ["inventory", "Son haftalarda depo sayım farkları büyüyor.", "Warehouse count discrepancies are growing lately."],
  ["inventory", "Yoğun günlerde raf yenileme süresi uzuyor.", "Shelf replenishment takes longer on busy days."],
  ["inventory", "Fazla stok miktarı üç aydır düzenli artıyor.", "Excess inventory has risen steadily for three months."],
  ["quality", "Hatalı ürün oranı üç çeyrektir artıyor.", "The defect rate has risen for three quarters."],
  ["quality", "Gece vardiyasında kontrol hataları tekrarlanıyor.", "Inspection errors recur during the night shift."],
  ["quality", "Her yeni ürün geçişinde hata oranı yükseliyor.", "The defect rate rises with every new product changeover."],
  ["quality", "Son altı partide ölçüm sapması büyüyor.", "Measurement deviation has grown across six batches."],
  ["quality", "Müşteri iadeleri her ayın sonunda yükseliyor.", "Customer returns rise at the end of every month."],
  ["service", "Son haftalarda ortalama bekleme süresi uzuyor.", "Average waiting time has grown in recent weeks."],
  ["service", "Müşteri şikâyetleri her ay sonunda yükseliyor.", "Customer complaints rise at the end of every month."],
  ["service", "Pazartesi sabahları çağrı yoğunluğu tekrarlanıyor.", "Call volume repeatedly peaks on Monday mornings."],
  ["service", "İlk temasta çözüm oranı dört aydır düşüyor.", "First-contact resolution has fallen for four months."],
  ["service", "Yoğun saatlerde terk edilen çağrılar artıyor.", "Abandoned calls rise during peak hours."],
]);

const structureItems = buildItems("S", "structure", [
  ["production", "Bakım planı üretim takvimine bağlanmıyor.", "The maintenance plan is not linked to production."],
  ["production", "Prim sistemi yalnızca üretim hızını ödüllendiriyor.", "The bonus system rewards production speed alone."],
  ["production", "Vardiya değişiminde standart devir süreci yok.", "There is no standard handoff process between shifts."],
  ["production", "Makine kapasitesi planlama kuralında yer almıyor.", "Machine capacity is absent from the planning rule."],
  ["production", "Arıza bilgisi planlama ekibine otomatik iletilmiyor.", "Failure data is not sent automatically to planning."],
  ["logistics", "Sevkiyat öncelikleri için yazılı karar kuralı yok.", "There is no written rule for shipment priorities."],
  ["logistics", "Rota planı güncel trafik verisini kullanmıyor.", "Route planning does not use current traffic data."],
  ["logistics", "Depo ve taşıyıcı ortak teslimat kaydı tutmuyor.", "Warehouse and carrier lack a shared delivery record."],
  ["logistics", "Araç doluluğu sipariş kabulünde kontrol edilmiyor.", "Vehicle capacity is not checked when orders are accepted."],
  ["logistics", "Gecikme sorumluluğu ekipler arasında tanımlanmıyor.", "Delay ownership is not defined across teams."],
  ["sales", "Siparişler kapasite kontrolü yapılmadan kabul ediliyor.", "Orders are accepted without a capacity check."],
  ["sales", "Satış primi teslimat kalitesini hesaba katmıyor.", "Sales incentives ignore delivery quality."],
  ["sales", "Kampanya kararı stok sistemiyle bağlantılı değil.", "Campaign decisions are not linked to inventory."],
  ["sales", "Müşteri geri bildirimi ürün ekibine düzenli ulaşmıyor.", "Customer feedback does not regularly reach product teams."],
  ["sales", "Teklif onayında kârlılık kontrol adımı bulunmuyor.", "Proposal approval lacks a profitability check."],
  ["inventory", "Depo ve satış arasında ortak stok kaydı yok.", "Sales and warehouse lack a shared inventory record."],
  ["inventory", "Yeniden sipariş eşiği talep değişimine göre güncellenmiyor.", "Reorder thresholds are not updated with demand changes."],
  ["inventory", "Malzeme sahipliği departmanlar arasında belirsiz.", "Material ownership is unclear across departments."],
  ["inventory", "Sayım düzeltmeleri kaynak işlemle ilişkilendirilmiyor.", "Count corrections are not linked to source transactions."],
  ["inventory", "Tedarik süresi stok planına otomatik yansımıyor.", "Lead time is not reflected automatically in stock plans."],
  ["quality", "Kalite kontrol adımı paketleme sürecinde bulunmuyor.", "The packaging process lacks a quality-control step."],
  ["quality", "Denetçi hedefleri üretim hedeflerinden ayrı belirleniyor.", "Inspector targets are set apart from production targets."],
  ["quality", "Hata kayıtları tedarikçi değerlendirmesine bağlanmıyor.", "Defect records are not linked to supplier reviews."],
  ["quality", "Ölçüm cihazları için ortak kalibrasyon takvimi yok.", "There is no shared calibration schedule for instruments."],
  ["quality", "Düzeltici faaliyetlerin sahibi açıkça tanımlanmıyor.", "Corrective-action ownership is not clearly defined."],
  ["service", "Çağrılar uzmanlığa göre yönlendirilmiyor.", "Calls are not routed according to expertise."],
  ["service", "Temsilci primi kısa görüşme süresini ödüllendiriyor.", "Agent incentives reward short call duration."],
  ["service", "Şikâyet kayıtları ürün süreçleriyle paylaşılmıyor.", "Complaint records are not shared with product processes."],
  ["service", "İade yetkisi için açık bir karar matrisi yok.", "There is no clear decision matrix for return approval."],
  ["service", "Tekrarlanan talepler için kök inceleme adımı bulunmuyor.", "Repeated requests have no structural review step."],
]);

export const problemHunterPool: TargetItem[] = [...eventItems, ...patternItems, ...structureItems];

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

const levelOneTimes = [1_200, 3_600, 6_000, 8_400, 10_800, 13_200, 15_600, 18_000];
const levelTwoTimes = [900, 2_600, 4_300, 6_000, 7_700, 9_400, 11_100, 12_800, 14_500, 16_200];
const taskCycle: TargetCategory[] = ["event", "pattern", "structure", "event"];

function scheduleSlots(): Slot[] {
  const levelOneCategories: TargetCategory[] = ["structure", "event", "structure", "pattern", "structure", "event", "structure", "pattern"];
  const levelTwoCategories: TargetCategory[] = ["pattern", "event", "pattern", "structure", "pattern", "event", "pattern", "structure", "pattern", "event"];
  const slots: Slot[] = [
    ...levelOneTimes.map((spawnAtMs, index) => ({ level: 0, task: "structure" as const, category: levelOneCategories[index]!, spawnAtMs, durationMs: 1_900 })),
    ...levelTwoTimes.map((spawnAtMs, index) => ({ level: 1, task: "pattern" as const, category: levelTwoCategories[index]!, spawnAtMs, durationMs: 2_500 })),
  ];
  for (let phase = 0; phase < taskCycle.length; phase += 1) {
    const task = taskCycle[phase]!;
    const traps = (["event", "pattern", "structure"] as TargetCategory[]).filter((category) => category !== task);
    [task, traps[0]!, traps[1]!].forEach((category, index) => slots.push({
      level: 2,
      task,
      category,
      spawnAtMs: phase * HUNTER_TASK_WINDOW_MS + [700, 2_000, 3_300][index]!,
      durationMs: 1_500,
    }));
  }
  return slots;
}

export function taskForLevelTime(level: number, elapsedMs: number): TargetCategory {
  if (level === 0) return "structure";
  if (level === 1) return "pattern";
  return taskCycle[Math.min(taskCycle.length - 1, Math.floor(elapsedMs / HUNTER_TASK_WINDOW_MS))]!;
}

export function buildProblemHunterRound(seedKey: string): ScheduledTarget[] {
  const random = seededRandom(hashSeed(`week-5-problem-hunter:${seedKey}`));
  const pools = {
    event: shuffle(problemHunterPool.filter((item) => item.category === "event"), random),
    pattern: shuffle(problemHunterPool.filter((item) => item.category === "pattern"), random),
    structure: shuffle(problemHunterPool.filter((item) => item.category === "structure"), random),
  };
  const cursors: Record<TargetCategory, number> = { event: 0, pattern: 0, structure: 0 };
  const holeCycles = Array.from({ length: 5 }, () => shuffle([0, 1, 2, 3, 4, 5], random)).flat();
  let previousHole = -1;
  return scheduleSlots().map((slot, index) => {
    const item = pools[slot.category][cursors[slot.category]++]!;
    let hole = holeCycles[index]!;
    if (hole === previousHole) hole = (hole + 1) % 6;
    previousHole = hole;
    return { ...item, ...slot, hole };
  });
}

export function arcadeScoreFor(actions: readonly HunterAction[]) {
  return actions.reduce((score, action) => Math.max(0, score + action.points), 0);
}

// The schedule contains exactly 13 hittable task targets. Dividing the
// penalty-aware arcade score by their fixed 130-point maximum prevents faster
// devices or repeated clicking from creating extra module-score opportunities.
export function normalizedHunterScore(actions: readonly HunterAction[]) {
  return Math.max(0, Math.min(100, Math.round(arcadeScoreFor(actions) / HUNTER_MAX_HIT_SCORE * 100)));
}
