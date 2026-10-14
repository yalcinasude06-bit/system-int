import type { Locale } from "@/lib/i18n/dictionaries";

export type LocalizedText = Record<Locale, string>;
export type EventType = "order-surge" | "machine-warning" | "quality-alarm" | "staff-shortage";
export type InterventionKind = "supportive" | "tradeoff" | "risky";
export type InterventionId =
  | "accelerate"
  | "planned-maintenance"
  | "extra-support"
  | "quality-boost"
  | "cancel-maintenance"
  | "remove-quality"
  | "overtime"
  | "ignore-fault"
  | "prioritize-orders"
  | "balance-workload"
  | "accept-all"
  | "double-target"
  | "emergency-maintenance"
  | "limit-orders"
  | "cross-train"
  | "reserve-capacity";

export type SimulationDelta = Partial<{
  production: number;
  failureRisk: number;
  delay: number;
  health: number;
  budget: number;
  team: number;
  backlog: number;
  qualityRisk: number;
  fatigue: number;
  ordersReceived: number;
  ordersCompleted: number;
}>;

export type DelayedEffectBlueprint = {
  delayMs: number;
  delta: SimulationDelta;
  message: LocalizedText;
};

export type InterventionDefinition = {
  id: InterventionId;
  name: LocalizedText;
  icon: string;
  description: LocalizedText;
  cost: number;
  teamCost: number;
  cooldownMs: number;
  kind: InterventionKind;
  instantEffect: SimulationDelta;
  delayedEffect: DelayedEffectBlueprint;
  conditions: LocalizedText;
  sideEffect: LocalizedText;
  contextualExplanation: LocalizedText;
};

export type ControlRoomEvent = {
  id: string;
  type: EventType;
  atMs: number;
  durationMs: number;
  intensity: number;
  title: LocalizedText;
  message: LocalizedText;
  effect: SimulationDelta;
};

export type ControlRoomScenario = {
  seedKey: string;
  events: ControlRoomEvent[];
  cardWindows: InterventionId[][];
};

export type PendingEffect = {
  id: string;
  sourceId: InterventionId;
  dueAtMs: number;
  delta: SimulationDelta;
  message: LocalizedText;
};

export type EffectLogEntry = {
  id: string;
  atMs: number;
  sourceId: InterventionId | EventType | "system";
  message: LocalizedText;
  tone: "positive" | "warning" | "neutral";
};

export type InterventionUse = {
  id: string;
  interventionId: InterventionId;
  atMs: number;
  useful: boolean;
  risky: boolean;
  conflict: boolean;
  unnecessary: boolean;
  explanation: LocalizedText;
};

export type ControlRoomState = {
  elapsedMs: number;
  production: number;
  failureRisk: number;
  delay: number;
  health: number;
  budget: number;
  team: number;
  backlog: number;
  qualityRisk: number;
  fatigue: number;
  ordersReceived: number;
  ordersCompleted: number;
  safeMs: number;
  criticalMs: number;
  sampledMs: number;
  healthIntegral: number;
  failureIntegral: number;
  cooldowns: Partial<Record<InterventionId, number>>;
  pendingEffects: PendingEffect[];
  effectLog: EffectLogEntry[];
  interventionUses: InterventionUse[];
  triggeredEventIds: string[];
  modifiers: {
    acceleratedUntil: number;
    qualityControlUntil: number;
    limitedOrdersUntil: number;
    reserveUntil: number;
  };
};

export type InterventionAvailability = { available: boolean; reason: "ready" | "cooldown" | "budget" | "team" | "condition"; remainingMs: number };
export type InterventionResult = { state: ControlRoomState; accepted: boolean; availability: InterventionAvailability; use?: InterventionUse };
export type ControlRoomScore = { total: number; safe: number; orders: number; sustainability: number; efficiency: number };

export const CONTROL_ROOM_CONFIG = {
  durationMs: 60_000,
  fixedStepMs: 100,
  cardWindowMs: 9_000,
  criticalGraceMs: 5_000,
  safeThresholds: { production: 40, failureRisk: 70, delay: 70, health: 30 },
  maxLogEntries: 8,
} as const;

const text = (tr: string, en: string): LocalizedText => ({ tr, en });

export const interventionPool: InterventionDefinition[] = [
  {
    id: "accelerate", name: text("Üretimi Hızlandır", "Accelerate Production"), icon: "⚡",
    description: text("Çıktıyı hemen artırır; yüksek yükte yıpranmayı büyütür.", "Raises output now; increases wear under heavy load."),
    cost: 8, teamCost: 7, cooldownMs: 5_000, kind: "tradeoff",
    instantEffect: { production: 14, delay: -5, backlog: -2 },
    delayedEffect: { delayMs: 5_000, delta: { health: -8, failureRisk: 11, fatigue: 8 }, message: text("Hızlandırmanın gecikmiş yükü → sağlık düştü, arıza riski arttı.", "Delayed acceleration load → health fell and failure risk rose.") },
    conditions: text("Sağlıklı makinede ve birikmiş iş varken daha etkilidir.", "Works best with a healthy machine and an existing backlog."),
    sideEffect: text("Kapasite sınırında ek hız, net üretimi sonradan düşürebilir.", "At the capacity limit, extra speed can later reduce net output."),
    contextualExplanation: text("Kısa vadeli hız, sistem sınırları gözetilmezse gecikmiş arıza baskısı yarattı.", "Short-term speed created delayed failure pressure when system limits were ignored."),
  },
  {
    id: "planned-maintenance", name: text("Planlı Bakım", "Planned Maintenance"), icon: "🔧",
    description: text("Üretimi kısa süre azaltır; sağlığı gecikmeli güçlendirir.", "Temporarily lowers output; improves health after a delay."),
    cost: 18, teamCost: 12, cooldownMs: 6_500, kind: "supportive",
    instantEffect: { production: -10, delay: 3 },
    delayedEffect: { delayMs: 6_000, delta: { health: 20, failureRisk: -16, fatigue: -4 }, message: text("Planlı bakım tamamlandı → makine sağlığı yükseldi.", "Planned maintenance completed → machine health improved.") },
    conditions: text("Sağlık düştüğünde veya arıza riski yükseldiğinde değerlidir.", "Valuable when health falls or failure risk rises."),
    sideEffect: text("Gereksiz sıklıkta kullanım bütçe ve kapasite kaybettirir.", "Unnecessary repetition wastes budget and capacity."),
    contextualExplanation: text("Kısa üretim kaybı, gecikmeli olarak daha dayanıklı bir akış sağladı.", "A short output loss produced a more resilient flow later."),
  },
  {
    id: "extra-support", name: text("Ek Personel / Destek", "Extra Staff / Support"), icon: "👥",
    description: text("Uyum süresinden sonra ekip kapasitesini artırır.", "Increases team capacity after an onboarding delay."),
    cost: 20, teamCost: 3, cooldownMs: 7_000, kind: "supportive",
    instantEffect: { production: -2 },
    delayedEffect: { delayMs: 5_000, delta: { team: 22, production: 7, fatigue: -5 }, message: text("Yeni destek uyum sağladı → ekip kapasitesi arttı.", "New support finished onboarding → team capacity increased.") },
    conditions: text("Personel eksikliği ve yüksek iş yükünde daha yararlıdır.", "More useful during staff shortages and heavy workloads."),
    sideEffect: text("İlk anda tam kapasite sağlamaz ve bütçe tüketir.", "It does not provide full capacity immediately and consumes budget."),
    contextualExplanation: text("Destek anında değil, uyum gecikmesinden sonra kapasiteye dönüştü.", "Support became capacity only after an onboarding delay."),
  },
  {
    id: "quality-boost", name: text("Kalite Kontrolünü Güçlendir", "Strengthen Quality Control"), icon: "🔎",
    description: text("Akışı biraz yavaşlatır; yeniden iş yükünü azaltır.", "Slows flow slightly; reduces rework later."),
    cost: 15, teamCost: 10, cooldownMs: 6_000, kind: "supportive",
    instantEffect: { production: -6, delay: 2 },
    delayedEffect: { delayMs: 5_000, delta: { qualityRisk: -22, backlog: -4, delay: -7 }, message: text("Kalite kontrolü etkisini gösterdi → yeniden iş ve gecikme azaldı.", "Quality control took effect → rework and delay fell.") },
    conditions: text("Kalite alarmında veya hızlı üretim sonrasında değerlidir.", "Valuable during a quality alert or after accelerated production."),
    sideEffect: text("Düşük kalite riskinde aşırı kullanım darboğaz yaratabilir.", "Overuse at low quality risk can create a bottleneck."),
    contextualExplanation: text("Kısa hız kaybı, gecikmeli yeniden işi ve teslimat baskısını azalttı.", "A short speed loss reduced delayed rework and delivery pressure."),
  },
  {
    id: "cancel-maintenance", name: text("Bakımı İptal Et", "Cancel Maintenance"), icon: "⛔",
    description: text("Kapasiteyi hemen açar; ileride yıpranmayı büyütür.", "Frees capacity now; increases wear later."),
    cost: 2, teamCost: 0, cooldownMs: 5_500, kind: "risky",
    instantEffect: { production: 8, delay: -3 },
    delayedEffect: { delayMs: 6_000, delta: { health: -16, failureRisk: 19 }, message: text("İptal edilen bakımın bedeli → yıpranma ve arıza riski yükseldi.", "Cost of canceled maintenance → wear and failure risk increased.") },
    conditions: text("Yalnızca sağlık yüksekken kısa bir kapasite takası olabilir.", "Only a short capacity tradeoff when health is high."),
    sideEffect: text("Düşük sağlıkta kritik arıza baskısı oluşturur.", "Creates critical failure pressure at low health."),
    contextualExplanation: text("Bakımı iptal etmek bugünü rahatlattı, sonraki dakikayı kırılganlaştırdı.", "Canceling maintenance eased the present but made the next minute fragile."),
  },
  {
    id: "remove-quality", name: text("Kalite Kontrolünü Kaldır", "Remove Quality Control"), icon: "🚫",
    description: text("Akışı hemen hızlandırır; hata ve yeniden işi artırır.", "Speeds flow immediately; increases defects and rework."),
    cost: 1, teamCost: 0, cooldownMs: 5_500, kind: "risky",
    instantEffect: { production: 10, delay: -3 },
    delayedEffect: { delayMs: 5_000, delta: { qualityRisk: 24, backlog: 6, delay: 8 }, message: text("Kontrolsüz ürünler geri döndü → yeniden iş kuyruğu büyüdü.", "Unchecked products returned → the rework queue grew.") },
    conditions: text("Kısa vadeli hız sağlar fakat sürdürülebilir bir çözüm değildir.", "Provides short-term speed but is not a sustainable solution."),
    sideEffect: text("İade ve yeniden iş yükü teslimatları geciktirir.", "Returns and rework delay deliveries."),
    contextualExplanation: text("Kontrolü kaldırmak akışı önce hızlandırdı, sonra geri dönen işi büyüttü.", "Removing control sped up flow first, then increased returning work."),
  },
  {
    id: "overtime", name: text("Zorunlu Fazla Mesai", "Mandatory Overtime"), icon: "🌙",
    description: text("Üretimi kısa süre yükseltir; yorgunluk biriktirir.", "Raises output briefly; accumulates fatigue."),
    cost: 12, teamCost: 12, cooldownMs: 6_000, kind: "tradeoff",
    instantEffect: { production: 11, delay: -5 },
    delayedEffect: { delayMs: 6_000, delta: { fatigue: 22, health: -8, failureRisk: 10, qualityRisk: 8 }, message: text("Fazla mesai yorgunluğu → hata ve arıza baskısı arttı.", "Overtime fatigue → defect and failure pressure increased.") },
    conditions: text("Yüksek gecikmede tek seferlik geçici rahatlama sağlar.", "Provides one temporary relief during high delay."),
    sideEffect: text("Üst üste kullanım ekip ve kaliteyi hızla yıpratır.", "Repeated use quickly harms the team and quality."),
    contextualExplanation: text("Fazla mesai kuyruğu azalttı; gecikmeli yorgunluk yeni risk üretti.", "Overtime reduced the queue; delayed fatigue created new risk."),
  },
  {
    id: "ignore-fault", name: text("Arızayı Görmezden Gel", "Ignore the Fault"), icon: "🙈",
    description: text("Duruşu erteler; kritik makine riski biriktirir.", "Postpones downtime; builds critical machine risk."),
    cost: 0, teamCost: 0, cooldownMs: 5_000, kind: "risky",
    instantEffect: { production: 7, delay: -2 },
    delayedEffect: { delayMs: 4_000, delta: { failureRisk: 27, health: -17, delay: 10 }, message: text("Görmezden gelinen uyarı → kritik arıza baskısına dönüştü.", "Ignored warning → became critical failure pressure.") },
    conditions: text("Anlık duruşu önler fakat sorunu ortadan kaldırmaz.", "Avoids immediate downtime but does not remove the problem."),
    sideEffect: text("Yüksek riskte sistemin çökmesine yol açabilir.", "Can cause system collapse when risk is already high."),
    contextualExplanation: text("Uyarıyı ertelemek sorunu silmedi; daha güçlü biçimde geri getirdi.", "Postponing the warning did not remove it; it returned more strongly."),
  },
  {
    id: "prioritize-orders", name: text("Siparişleri Önceliklendir", "Prioritize Orders"), icon: "📋",
    description: text("Kritik siparişleri öne alır; toplam kuyruğu sıfırlamaz.", "Moves critical orders forward; does not erase the total queue."),
    cost: 7, teamCost: 5, cooldownMs: 5_000, kind: "tradeoff",
    instantEffect: { delay: -10, backlog: -2 },
    delayedEffect: { delayMs: 5_000, delta: { backlog: 3, delay: 3 }, message: text("Öncelik dışı siparişler bekledi → kuyruğun bir bölümü geri döndü.", "Non-priority orders waited → part of the queue returned.") },
    conditions: text("Sipariş dalgasında kritik gecikmeyi sınırlar.", "Limits critical delays during an order surge."),
    sideEffect: text("Diğer siparişlerde küçük birikme oluşturabilir.", "Can create a small backlog among other orders."),
    contextualExplanation: text("Önceliklendirme kritik gecikmeyi azalttı ama toplam talebi yok etmedi.", "Prioritization reduced critical delay but did not remove total demand."),
  },
  {
    id: "balance-workload", name: text("İş Yükünü Dengele", "Balance Workload"), icon: "⚖️",
    description: text("Kısa düzenleme sonrası sıkışıklığı ekipler arasında dağıtır.", "Redistributes congestion after a short reorganization."),
    cost: 10, teamCost: 8, cooldownMs: 5_500, kind: "supportive",
    instantEffect: { production: -3 },
    delayedEffect: { delayMs: 4_000, delta: { delay: -13, backlog: -4, team: 7, fatigue: -6 }, message: text("İş yükü dengelendi → kuyruk ve ekip baskısı azaldı.", "Workload balanced → queue and team pressure fell.") },
    conditions: text("Gecikme, yorgunluk veya personel eksikliğinde etkilidir.", "Effective during delays, fatigue, or staff shortages."),
    sideEffect: text("Dengeli durumda sık tekrarı kaynak israfıdır.", "Repeating it in an already balanced state wastes resources."),
    contextualExplanation: text("Kısa yeniden düzenleme, gecikmeli olarak sistem genelindeki sıkışmayı azalttı.", "A short reorganization later reduced congestion across the system."),
  },
  {
    id: "accept-all", name: text("Tüm Yeni Siparişleri Kabul Et", "Accept All New Orders"), icon: "📥",
    description: text("Fırsatı büyütür; kapasite yetmezse kuyruk hızla artar.", "Expands opportunity; rapidly grows the queue if capacity is insufficient."),
    cost: 0, teamCost: 2, cooldownMs: 6_000, kind: "tradeoff",
    instantEffect: { budget: 8, ordersReceived: 10, backlog: 10, production: 3 },
    delayedEffect: { delayMs: 6_000, delta: { delay: 14, failureRisk: 5 }, message: text("Kabul edilen ek siparişler → teslimat baskısını artırdı.", "Extra accepted orders → increased delivery pressure.") },
    conditions: text("Boş kapasite ve düşük kuyruk varken değerlidir.", "Valuable when spare capacity exists and the queue is low."),
    sideEffect: text("Dolu sistemde gelir fırsatı gecikme krizine dönüşür.", "In a full system, revenue opportunity becomes a delay crisis."),
    contextualExplanation: text("Yeni iş almak kapasiteyle eşleşmeyince gecikmiş teslimat baskısı üretti.", "Taking new work without matching capacity created delayed delivery pressure."),
  },
  {
    id: "double-target", name: text("Performans Hedefini İkiye Katla", "Double the Performance Target"), icon: "🎯",
    description: text("Baskıyla kısa hız sağlar; sürdürülebilir değildir.", "Creates short speed through pressure; not sustainable."),
    cost: 3, teamCost: 8, cooldownMs: 6_500, kind: "risky",
    instantEffect: { production: 9, delay: -3 },
    delayedEffect: { delayMs: 6_000, delta: { fatigue: 19, failureRisk: 14, qualityRisk: 11, health: -7 }, message: text("İki kat hedef baskısı → yorgunluk, hata ve arıza arttı.", "Doubled target pressure → fatigue, defects, and failures increased.") },
    conditions: text("Yalnızca sağlıklı ve düşük baskılı sistem kısa süre tolere edebilir.", "Only a healthy, low-pressure system can tolerate it briefly."),
    sideEffect: text("Kapasite sınırında net üretimi düşürebilir.", "Can reduce net output at the capacity limit."),
    contextualExplanation: text("Hedefi büyütmek kapasiteyi büyütmedi; baskıyı ve gecikmiş riski büyüttü.", "Raising the target did not raise capacity; it raised pressure and delayed risk."),
  },
  {
    id: "emergency-maintenance", name: text("Acil Bakım", "Emergency Maintenance"), icon: "🛠️",
    description: text("Makine uyarısında üretimi kesip kritik riski düşürür.", "Stops output during a warning and reduces critical risk."),
    cost: 24, teamCost: 16, cooldownMs: 7_000, kind: "supportive",
    instantEffect: { production: -14, delay: 5 },
    delayedEffect: { delayMs: 4_000, delta: { health: 25, failureRisk: -27 }, message: text("Acil bakım tamamlandı → kritik makine riski bastırıldı.", "Emergency maintenance completed → critical machine risk was contained.") },
    conditions: text("Makine uyarısında veya arıza riski yükseldiğinde açılır.", "Unlocks during a machine warning or elevated failure risk."),
    sideEffect: text("Yüksek bütçe ve ekip kapasitesi kullanır.", "Consumes substantial budget and team capacity."),
    contextualExplanation: text("Kısa duruş, daha uzun ve kontrolsüz bir arıza olasılığını azalttı.", "A short stop reduced the chance of a longer uncontrolled failure."),
  },
  {
    id: "limit-orders", name: text("Sipariş Kabulünü Sınırla", "Limit Order Intake"), icon: "🛑",
    description: text("Yeni talebi geçici azaltır; mevcut kuyruğa çalışma alanı açar.", "Temporarily reduces new demand and creates room for the current queue."),
    cost: 5, teamCost: 2, cooldownMs: 6_000, kind: "supportive",
    instantEffect: { production: -2 },
    delayedEffect: { delayMs: 4_000, delta: { delay: -8, backlog: -3 }, message: text("Sınırlı sipariş kabulü → mevcut kuyruğun baskısı azaldı.", "Limited order intake → pressure from the existing queue fell.") },
    conditions: text("Sipariş dalgası veya yüksek gecikmede etkilidir.", "Effective during an order surge or high delay."),
    sideEffect: text("Düşük talepte gereksiz kullanım fırsat kaybettirir.", "Unnecessary use during low demand loses opportunity."),
    contextualExplanation: text("Talebi geçici sınırlamak, sistemi kuyruğu eritmek için zaman kazandırdı.", "Temporarily limiting demand gave the system time to clear its queue."),
  },
  {
    id: "cross-train", name: text("Çapraz Eğitim", "Cross-Training"), icon: "🎓",
    description: text("Kısa öğrenme süresinden sonra ekip esnekliğini artırır.", "Improves team flexibility after a short learning period."),
    cost: 16, teamCost: 7, cooldownMs: 7_000, kind: "supportive",
    instantEffect: { production: -5 },
    delayedEffect: { delayMs: 7_000, delta: { team: 17, fatigue: -9, production: 5 }, message: text("Çapraz eğitim tamamlandı → ekip esnekliği yükseldi.", "Cross-training completed → team flexibility increased.") },
    conditions: text("Personel eksikliğine karşı gecikmeli dayanıklılık sağlar.", "Provides delayed resilience against staff shortages."),
    sideEffect: text("İlk anda üretim kapasitesi kullanır.", "Uses production capacity at first."),
    contextualExplanation: text("Öğrenmeye ayrılan kısa süre, sonraki sıkışmada esnek kapasiteye dönüştü.", "Time spent learning became flexible capacity during the next bottleneck."),
  },
  {
    id: "reserve-capacity", name: text("Kapasite Tamponu Ayır", "Reserve Capacity Buffer"), icon: "🛡️",
    description: text("Bir miktar hızı bırakır; ani olaylara karşı tampon oluşturur.", "Gives up some speed and creates a buffer for sudden events."),
    cost: 11, teamCost: 6, cooldownMs: 6_000, kind: "supportive",
    instantEffect: { production: -6, failureRisk: -4 },
    delayedEffect: { delayMs: 5_000, delta: { health: 9, failureRisk: -8, team: 5 }, message: text("Kapasite tamponu → ani yükün makineye aktarılmasını azalttı.", "Capacity buffer → reduced how much sudden load reached the machine.") },
    conditions: text("Yük artmadan önce koruyucu değer üretir.", "Creates protective value before demand rises."),
    sideEffect: text("Anlık üretim hedefinden bilinçli olarak vazgeçer.", "Deliberately gives up some immediate output."),
    contextualExplanation: text("Boş bırakılan küçük kapasite, sistemin karşı tepkisini yumuşattı.", "A small amount of spare capacity softened the system's reaction."),
  },
];

const interventionById = new Map(interventionPool.map((item) => [item.id, item]));

export function getIntervention(id: InterventionId) {
  return interventionById.get(id)!;
}

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

export function buildControlRoomScenario(seedKey: string): ControlRoomScenario {
  const random = seededRandom(hashSeed(`week-5-balance-master:${seedKey}`));
  const eventTemplates: Array<Omit<ControlRoomEvent, "id" | "atMs" | "intensity"> & { baseAtMs: number }> = [
    { type: "order-surge", baseAtMs: 8_000, durationMs: 7_000, title: text("Sipariş dalgası", "Order surge"), message: text("Yeni siparişler kuyruğu büyütüyor.", "New orders are growing the queue."), effect: { ordersReceived: 8, backlog: 8, delay: 5 } },
    { type: "machine-warning", baseAtMs: 19_000, durationMs: 7_500, title: text("Bakım uyarısı", "Maintenance warning"), message: text("Makinede titreşim arttı; müdahale için zaman var.", "Machine vibration increased; there is time to respond."), effect: { health: -5, failureRisk: 11 } },
    { type: "quality-alarm", baseAtMs: 32_000, durationMs: 8_000, title: text("Kalite alarmı", "Quality alert"), message: text("Yeniden iş riski yükseliyor.", "Rework risk is rising."), effect: { qualityRisk: 13, backlog: 3 } },
    { type: "staff-shortage", baseAtMs: 45_000, durationMs: 8_500, title: text("Personel eksikliği", "Staff shortage"), message: text("Kullanılabilir ekip kapasitesi azaldı.", "Available team capacity decreased."), effect: { team: -13, production: -5, fatigue: 5 } },
  ];
  const events = eventTemplates.map((event, index) => {
    const jitter = Math.round(random() * 1_200);
    const intensity = .88 + random() * .24;
    return { ...event, id: `W5M3-E${index + 1}`, atMs: event.baseAtMs + jitter, intensity };
  });
  const pairSource: InterventionId[][] = [
    ["accelerate", "accept-all"],
    ["planned-maintenance", "balance-workload"],
    ["prioritize-orders", "limit-orders"],
    ["emergency-maintenance", "ignore-fault"],
    ["quality-boost", "remove-quality"],
    ["extra-support", "overtime"],
    ["cross-train", "double-target"],
    ["reserve-capacity", "cancel-maintenance"],
  ];
  const pairs = pairSource.map((pair) => shuffle(pair, random));
  const cardWindows = Array.from({ length: 7 }, (_, index) => index % 2 === 0
    ? [pairs[index]![0]!, pairs[index + 1]![0]!, pairs[index]![1]!, pairs[index + 1]![1]!]
    : [pairs[index + 1]![0]!, pairs[index]![0]!, pairs[index + 1]![1]!, pairs[index]![1]!]);
  return { seedKey, events, cardWindows };
}

export function createInitialControlRoomState(): ControlRoomState {
  return {
    elapsedMs: 0,
    production: 55,
    failureRisk: 18,
    delay: 24,
    health: 80,
    budget: 100,
    team: 76,
    backlog: 12,
    qualityRisk: 16,
    fatigue: 10,
    ordersReceived: 12,
    ordersCompleted: 0,
    safeMs: 0,
    criticalMs: 0,
    sampledMs: 0,
    healthIntegral: 0,
    failureIntegral: 0,
    cooldowns: {},
    pendingEffects: [],
    effectLog: [{ id: "system-start", atMs: 0, sourceId: "system", message: text("Kontrol odası aktif. İlk 5 saniye düşük baskılı başlangıç.", "Control room online. The first 5 seconds are a low-pressure start."), tone: "neutral" }],
    interventionUses: [],
    triggeredEventIds: [],
    modifiers: { acceleratedUntil: 0, qualityControlUntil: 0, limitedOrdersUntil: 0, reserveUntil: 0 },
  };
}

export function clampMetric(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function clampState(state: ControlRoomState): ControlRoomState {
  return {
    ...state,
    elapsedMs: Math.max(0, Math.min(CONTROL_ROOM_CONFIG.durationMs, state.elapsedMs)),
    production: clampMetric(state.production),
    failureRisk: clampMetric(state.failureRisk),
    delay: clampMetric(state.delay),
    health: clampMetric(state.health),
    budget: clampMetric(state.budget),
    team: clampMetric(state.team),
    backlog: Math.max(0, Number.isFinite(state.backlog) ? state.backlog : 0),
    qualityRisk: clampMetric(state.qualityRisk),
    fatigue: clampMetric(state.fatigue),
    ordersReceived: Math.max(0, Number.isFinite(state.ordersReceived) ? state.ordersReceived : 0),
    ordersCompleted: Math.max(0, Number.isFinite(state.ordersCompleted) ? state.ordersCompleted : 0),
    safeMs: Math.max(0, state.safeMs),
    criticalMs: Math.max(0, state.criticalMs),
    sampledMs: Math.max(0, state.sampledMs),
    healthIntegral: Math.max(0, state.healthIntegral),
    failureIntegral: Math.max(0, state.failureIntegral),
  };
}

function withDelta(state: ControlRoomState, delta: SimulationDelta) {
  return clampState({
    ...state,
    production: state.production + (delta.production ?? 0),
    failureRisk: state.failureRisk + (delta.failureRisk ?? 0),
    delay: state.delay + (delta.delay ?? 0),
    health: state.health + (delta.health ?? 0),
    budget: state.budget + (delta.budget ?? 0),
    team: state.team + (delta.team ?? 0),
    backlog: state.backlog + (delta.backlog ?? 0),
    qualityRisk: state.qualityRisk + (delta.qualityRisk ?? 0),
    fatigue: state.fatigue + (delta.fatigue ?? 0),
    ordersReceived: state.ordersReceived + (delta.ordersReceived ?? 0),
    ordersCompleted: state.ordersCompleted + (delta.ordersCompleted ?? 0),
  });
}

function addLog(state: ControlRoomState, entry: EffectLogEntry) {
  return { ...state, effectLog: [...state.effectLog, entry].slice(-CONTROL_ROOM_CONFIG.maxLogEntries) };
}

export function cardWindowIndex(elapsedMs: number) {
  return Math.min(6, Math.floor(Math.max(0, elapsedMs) / CONTROL_ROOM_CONFIG.cardWindowMs));
}

export function cardsForState(state: ControlRoomState, scenario: ControlRoomScenario) {
  return scenario.cardWindows[cardWindowIndex(state.elapsedMs)]!;
}

export function activeEvents(state: ControlRoomState, scenario: ControlRoomScenario) {
  return scenario.events.filter((event) => state.elapsedMs >= event.atMs && state.elapsedMs < event.atMs + event.durationMs);
}

function eventIsActive(state: ControlRoomState, scenario: ControlRoomScenario, type: EventType) {
  return activeEvents(state, scenario).some((event) => event.type === type);
}

export function getInterventionAvailability(state: ControlRoomState, scenario: ControlRoomScenario, intervention: InterventionDefinition): InterventionAvailability {
  const remainingMs = Math.max(0, (state.cooldowns[intervention.id] ?? 0) - state.elapsedMs);
  if (remainingMs > 0) return { available: false, reason: "cooldown", remainingMs };
  if (state.budget < intervention.cost) return { available: false, reason: "budget", remainingMs: 0 };
  if (state.team < intervention.teamCost) return { available: false, reason: "team", remainingMs: 0 };
  if (intervention.id === "emergency-maintenance" && state.failureRisk < 30 && !eventIsActive(state, scenario, "machine-warning")) return { available: false, reason: "condition", remainingMs: 0 };
  return { available: true, reason: "ready", remainingMs: 0 };
}

function scaledDelta(delta: SimulationDelta, factor: number): SimulationDelta {
  return Object.fromEntries(Object.entries(delta).map(([key, value]) => [key, Number(value) * factor])) as SimulationDelta;
}

export function applyIntervention(state: ControlRoomState, scenario: ControlRoomScenario, interventionId: InterventionId): InterventionResult {
  const intervention = getIntervention(interventionId);
  const availability = getInterventionAvailability(state, scenario, intervention);
  if (!availability.available) return { state, accepted: false, availability };

  let instant = { ...intervention.instantEffect };
  let delayed = { ...intervention.delayedEffect.delta };
  let useful = intervention.kind !== "risky";
  let conflict = false;
  let unnecessary = false;

  if (interventionId === "accelerate") {
    const healthFactor = .55 + state.health / 220;
    instant.production = 14 * healthFactor;
    delayed.failureRisk = (delayed.failureRisk ?? 0) + Math.max(0, state.production - 65) * .18;
    useful = state.backlog > 12 && state.health > 48 && state.failureRisk < 58;
    conflict = state.pendingEffects.some((effect) => (effect.sourceId === "planned-maintenance" || effect.sourceId === "emergency-maintenance") && effect.dueAtMs - state.elapsedMs < 4_500);
    if (conflict) instant = scaledDelta(instant, .45);
  } else if (interventionId === "planned-maintenance") {
    unnecessary = state.health > 87 && state.failureRisk < 20;
    if (unnecessary) delayed = scaledDelta(delayed, .35);
    useful = !unnecessary;
    conflict = state.modifiers.acceleratedUntil > state.elapsedMs;
  } else if (interventionId === "extra-support") {
    useful = state.team < 70 || state.fatigue > 45 || eventIsActive(state, scenario, "staff-shortage");
    unnecessary = !useful;
  } else if (interventionId === "quality-boost") {
    useful = state.qualityRisk > 22 || eventIsActive(state, scenario, "quality-alarm") || state.modifiers.acceleratedUntil > state.elapsedMs;
    unnecessary = state.qualityRisk < 15;
    if (unnecessary) delayed = scaledDelta(delayed, .45);
  } else if (interventionId === "cancel-maintenance") {
    useful = state.health > 78 && state.delay > 60 && state.failureRisk < 35;
    conflict = state.pendingEffects.some((effect) => effect.sourceId === "planned-maintenance" || effect.sourceId === "emergency-maintenance");
  } else if (interventionId === "remove-quality") {
    useful = false;
  } else if (interventionId === "overtime") {
    useful = state.delay > 58 && state.fatigue < 35 && state.team > 45;
    unnecessary = state.delay < 30;
  } else if (interventionId === "ignore-fault") {
    useful = false;
    delayed.failureRisk = (delayed.failureRisk ?? 0) + state.failureRisk * .12;
  } else if (interventionId === "prioritize-orders") {
    useful = state.delay > 30 || eventIsActive(state, scenario, "order-surge");
    unnecessary = state.delay < 18;
  } else if (interventionId === "balance-workload") {
    useful = state.delay > 28 || state.fatigue > 35 || state.team < 65 || eventIsActive(state, scenario, "staff-shortage");
    unnecessary = state.delay < 18 && state.team > 78;
    if (unnecessary) delayed = scaledDelta(delayed, .45);
  } else if (interventionId === "accept-all") {
    useful = state.backlog < 10 && state.team > 72 && state.health > 72;
    delayed.delay = (delayed.delay ?? 0) + Math.max(0, state.backlog - 15) * .25;
  } else if (interventionId === "double-target") {
    useful = state.health > 82 && state.failureRisk < 22 && state.fatigue < 20;
  } else if (interventionId === "emergency-maintenance") {
    useful = true;
    const need = Math.max(.75, Math.min(1.2, state.failureRisk / 55 + (100 - state.health) / 180));
    delayed = scaledDelta(delayed, need);
    conflict = state.modifiers.acceleratedUntil > state.elapsedMs;
  } else if (interventionId === "limit-orders") {
    useful = state.delay > 36 || state.backlog > 20 || eventIsActive(state, scenario, "order-surge");
    unnecessary = state.backlog < 9 && state.delay < 22;
    if (unnecessary) delayed = scaledDelta(delayed, .4);
  } else if (interventionId === "cross-train") {
    useful = state.team < 70 || state.fatigue > 35 || state.elapsedMs < 42_000;
  } else if (interventionId === "reserve-capacity") {
    useful = state.failureRisk > 30 || state.elapsedMs < 18_000 || state.elapsedMs > 38_000;
  }

  let next = withDelta(state, { ...instant, budget: (instant.budget ?? 0) - intervention.cost, team: (instant.team ?? 0) - intervention.teamCost });
  const useNumber = next.interventionUses.length + 1;
  const pending: PendingEffect = {
    id: `${intervention.id}-${Math.round(state.elapsedMs)}-${useNumber}`,
    sourceId: intervention.id,
    dueAtMs: state.elapsedMs + intervention.delayedEffect.delayMs,
    delta: delayed,
    message: intervention.delayedEffect.message,
  };
  const use: InterventionUse = {
    id: `use-${Math.round(state.elapsedMs)}-${useNumber}`,
    interventionId,
    atMs: state.elapsedMs,
    useful,
    risky: intervention.kind === "risky" || (!useful && intervention.kind === "tradeoff"),
    conflict,
    unnecessary,
    explanation: intervention.contextualExplanation,
  };
  next = {
    ...next,
    cooldowns: { ...next.cooldowns, [interventionId]: state.elapsedMs + intervention.cooldownMs },
    pendingEffects: [...next.pendingEffects, pending],
    interventionUses: [...next.interventionUses, use],
    modifiers: {
      ...next.modifiers,
      acceleratedUntil: interventionId === "accelerate" || interventionId === "overtime" || interventionId === "double-target" ? state.elapsedMs + 5_000 : next.modifiers.acceleratedUntil,
      qualityControlUntil: interventionId === "quality-boost" ? state.elapsedMs + 9_000 : next.modifiers.qualityControlUntil,
      limitedOrdersUntil: interventionId === "limit-orders" ? state.elapsedMs + 8_000 : next.modifiers.limitedOrdersUntil,
      reserveUntil: interventionId === "reserve-capacity" ? state.elapsedMs + 9_000 : next.modifiers.reserveUntil,
    },
  };
  next = addLog(next, {
    id: `action-${use.id}`,
    atMs: state.elapsedMs,
    sourceId: interventionId,
    message: useful && !conflict ? intervention.description : intervention.sideEffect,
    tone: useful && !conflict ? "positive" : "warning",
  });
  return { state: next, accepted: true, availability, use };
}

function stepSlice(state: ControlRoomState, scenario: ControlRoomScenario, dtMs: number) {
  const seconds = dtMs / 1_000;
  const fromMs = state.elapsedMs;
  const toMs = Math.min(CONTROL_ROOM_CONFIG.durationMs, fromMs + dtMs);
  let next = { ...state, elapsedMs: toMs };

  for (const event of scenario.events) {
    if (event.atMs > fromMs && event.atMs <= toMs && !next.triggeredEventIds.includes(event.id)) {
      next = withDelta(next, scaledDelta(event.effect, event.intensity));
      next = addLog(next, { id: `event-${event.id}`, atMs: event.atMs, sourceId: event.type, message: event.message, tone: "warning" });
      next = { ...next, triggeredEventIds: [...next.triggeredEventIds, event.id] };
    }
  }

  const due = next.pendingEffects.filter((effect) => effect.dueAtMs > fromMs && effect.dueAtMs <= toMs);
  for (const effect of due) {
    next = withDelta(next, effect.delta);
    next = addLog(next, { id: `effect-${effect.id}`, atMs: effect.dueAtMs, sourceId: effect.sourceId, message: effect.message, tone: getIntervention(effect.sourceId).kind === "supportive" ? "positive" : "warning" });
  }
  if (due.length) {
    const dueIds = new Set(due.map((effect) => effect.id));
    next = { ...next, pendingEffects: next.pendingEffects.filter((effect) => !dueIds.has(effect.id)) };
  }

  const events = activeEvents(next, scenario);
  const orderPressure = events.filter((event) => event.type === "order-surge").reduce((total, event) => total + event.intensity, 0);
  const machinePressure = events.filter((event) => event.type === "machine-warning").reduce((total, event) => total + event.intensity, 0);
  const qualityPressure = events.filter((event) => event.type === "quality-alarm").reduce((total, event) => total + event.intensity, 0);
  const staffPressure = events.filter((event) => event.type === "staff-shortage").reduce((total, event) => total + event.intensity, 0);
  const phase = toMs < 5_000 ? 0 : toMs < 20_000 ? 1 : toMs < 40_000 ? 2 : 3;
  const baseArrival = [0.28, .72, .88, 1.02][phase]!;
  const intakeFactor = next.modifiers.limitedOrdersUntil > toMs ? .52 : 1;
  const arrivals = (baseArrival + orderPressure * .48) * intakeFactor * seconds;
  const reserveFactor = next.modifiers.reserveUntil > toMs ? .62 : 1;
  const qualityFactor = next.modifiers.qualityControlUntil > toMs ? .46 : 1;
  const staffFactor = Math.max(.58, 1 - staffPressure * .2);
  const machineFactor = Math.max(.38, (0.58 + next.health / 205) * (1 - next.failureRisk / 185));
  const teamFactor = .58 + next.team / 238;
  const outputRate = Math.max(.15, (.3 + next.production / 72) * machineFactor * teamFactor * staffFactor);
  const completed = Math.min(next.backlog + arrivals, outputRate * seconds);
  const rework = completed * (next.qualityRisk / 100) * .19 * qualityFactor;
  const backlog = Math.max(0, next.backlog + arrivals + rework - completed);
  const delayTarget = Math.min(100, 10 + backlog * 2.15 + orderPressure * 12 + rework * 4);
  const productionTarget = Math.max(15, Math.min(92, 30 + next.health * .36 + next.team * .22 - next.failureRisk * .27 + Math.min(18, backlog * .36)));
  const healthLoss = (Math.max(0, next.production - 62) * .012 + next.fatigue * .003 + machinePressure * .38) * reserveFactor * seconds;
  const failureTarget = Math.min(100, (100 - next.health) * .48 + next.fatigue * .24 + Math.max(0, next.production - 68) * .42 + machinePressure * 20);
  const fatigueDelta = (Math.max(0, next.production - 58) * .009 + Math.max(0, 58 - next.team) * .01 - .11) * seconds;
  const qualityDelta = (Math.max(0, next.production - 70) * .012 + qualityPressure * .75 - (next.modifiers.qualityControlUntil > toMs ? .55 : .08)) * seconds;

  next = clampState({
    ...next,
    backlog,
    ordersReceived: next.ordersReceived + arrivals,
    ordersCompleted: next.ordersCompleted + completed,
    delay: next.delay + (delayTarget - next.delay) * .085 * seconds,
    production: next.production + (productionTarget - next.production) * .065 * seconds,
    health: next.health - healthLoss + (next.production < 48 ? .035 * seconds : 0),
    failureRisk: next.failureRisk + (failureTarget - next.failureRisk) * .055 * seconds * reserveFactor,
    fatigue: next.fatigue + fatigueDelta,
    qualityRisk: next.qualityRisk + qualityDelta,
    budget: next.budget + .21 * seconds,
    team: next.team + (.16 - staffPressure * .19) * seconds,
  });

  const safe = next.production >= CONTROL_ROOM_CONFIG.safeThresholds.production
    && next.failureRisk < CONTROL_ROOM_CONFIG.safeThresholds.failureRisk
    && next.delay < CONTROL_ROOM_CONFIG.safeThresholds.delay
    && next.health > CONTROL_ROOM_CONFIG.safeThresholds.health;
  const critical = next.failureRisk >= 90 || next.delay >= 92 || next.health <= 12;
  next = {
    ...next,
    safeMs: next.safeMs + (safe ? dtMs : 0),
    criticalMs: critical ? next.criticalMs + dtMs : 0,
    sampledMs: next.sampledMs + dtMs,
    healthIntegral: next.healthIntegral + next.health * dtMs,
    failureIntegral: next.failureIntegral + next.failureRisk * dtMs,
  };
  return next;
}

export function stepSimulation(state: ControlRoomState, scenario: ControlRoomScenario, dtMs: number) {
  let next = state;
  let remaining = Math.max(0, Math.min(2_000, Number.isFinite(dtMs) ? dtMs : 0));
  while (remaining > 0 && next.elapsedMs < CONTROL_ROOM_CONFIG.durationMs) {
    const slice = Math.min(250, remaining, CONTROL_ROOM_CONFIG.durationMs - next.elapsedMs);
    next = stepSlice(next, scenario, slice);
    remaining -= slice;
  }
  return next;
}

export function isSafeState(state: ControlRoomState) {
  return state.production >= CONTROL_ROOM_CONFIG.safeThresholds.production
    && state.failureRisk < CONTROL_ROOM_CONFIG.safeThresholds.failureRisk
    && state.delay < CONTROL_ROOM_CONFIG.safeThresholds.delay
    && state.health > CONTROL_ROOM_CONFIG.safeThresholds.health;
}

export function hasCollapsed(state: ControlRoomState) {
  return state.criticalMs >= CONTROL_ROOM_CONFIG.criticalGraceMs;
}

export function scoreControlRoom(state: ControlRoomState): ControlRoomScore {
  const elapsed = Math.max(1, state.sampledMs || state.elapsedMs);
  const safe = Math.max(0, Math.min(40, state.safeMs / elapsed * 40));
  const orders = Math.max(0, Math.min(25, state.ordersCompleted / Math.max(1, state.ordersReceived) * 25));
  const averageHealth = state.sampledMs ? state.healthIntegral / state.sampledMs : state.health;
  const averageFailure = state.sampledMs ? state.failureIntegral / state.sampledMs : state.failureRisk;
  const sustainability = Math.max(0, Math.min(20, (averageHealth / 100 * .55 + (100 - averageFailure) / 100 * .45) * 20));
  const uses = state.interventionUses.length;
  const decisionPenalty = uses ? state.interventionUses.reduce((total, use) => total + (use.risky ? 1 : 0) + (use.conflict ? 1 : 0) + (use.unnecessary ? .75 : 0), 0) / uses : 0;
  const decisionQuality = uses ? Math.max(0, Math.min(1, 1 - decisionPenalty * .55)) : .15;
  const efficiency = Math.max(0, Math.min(15, (state.budget / 100 * .35 + decisionQuality * .65) * 15));
  return { safe: Math.round(safe), orders: Math.round(orders), sustainability: Math.round(sustainability), efficiency: Math.round(efficiency), total: Math.max(0, Math.min(100, Math.round(safe + orders + sustainability + efficiency))) };
}

export function causalFeedback(state: ControlRoomState, limit = 2) {
  const candidates = [...state.interventionUses]
    .sort((a, b) => Number(b.conflict || b.risky || b.unnecessary) - Number(a.conflict || a.risky || a.unnecessary) || b.atMs - a.atMs);
  return candidates.slice(0, limit).map((use) => ({ interventionId: use.interventionId, explanation: use.explanation }));
}

export function restoreControlRoomState(value: unknown) {
  if (!value || typeof value !== "object") return createInitialControlRoomState();
  const candidate = value as Partial<ControlRoomState>;
  const required = [candidate.elapsedMs, candidate.production, candidate.failureRisk, candidate.delay, candidate.health, candidate.budget, candidate.team];
  if (!required.every((item) => typeof item === "number" && Number.isFinite(item))) return createInitialControlRoomState();
  const initial = createInitialControlRoomState();
  return clampState({
    ...initial,
    ...candidate,
    cooldowns: candidate.cooldowns && typeof candidate.cooldowns === "object" ? candidate.cooldowns : {},
    pendingEffects: Array.isArray(candidate.pendingEffects) ? candidate.pendingEffects : [],
    effectLog: Array.isArray(candidate.effectLog) ? candidate.effectLog.slice(-CONTROL_ROOM_CONFIG.maxLogEntries) : initial.effectLog,
    interventionUses: Array.isArray(candidate.interventionUses) ? candidate.interventionUses : [],
    triggeredEventIds: Array.isArray(candidate.triggeredEventIds) ? candidate.triggeredEventIds.filter((id): id is string => typeof id === "string") : [],
    modifiers: candidate.modifiers && typeof candidate.modifiers === "object" ? { ...initial.modifiers, ...candidate.modifiers } : initial.modifiers,
  });
}
