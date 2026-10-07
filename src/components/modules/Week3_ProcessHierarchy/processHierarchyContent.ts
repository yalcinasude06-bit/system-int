import type { Locale } from "@/lib/i18n/dictionaries";

export type ProcessLayer = "core" | "subprocess" | "activity";

export type LocalizedText = Record<Locale, string>;

export type ProcessHierarchyItem = {
  id: string;
  core: LocalizedText;
  subprocess: LocalizedText;
  activity: LocalizedText;
};

export type ProcessCard = {
  id: string;
  layer: ProcessLayer;
  text: LocalizedText;
};

export type ProcessHierarchyRound = {
  id: string;
  item: ProcessHierarchyItem;
  cards: ProcessCard[];
};

export const processLayerOrder: ProcessLayer[] = ["core", "subprocess", "activity"];

export const processLayerLabels: Record<ProcessLayer, LocalizedText> = {
  core: { tr: "Temel süreçler", en: "Core processes" },
  subprocess: { tr: "Alt süreçler", en: "Sub-processes" },
  activity: { tr: "Faaliyetler / görevler", en: "Activities / tasks" },
};

export const processHierarchyPool: ProcessHierarchyItem[] = [
  {
    id: "purchasing",
    core: { tr: "Satın Alma Süreci", en: "Purchasing Process" },
    subprocess: { tr: "Tedarikçi Seçimi", en: "Supplier Selection" },
    activity: { tr: "Tedarikçiden teklif istemek", en: "Request a quote from the supplier" },
  },
  {
    id: "production",
    core: { tr: "Üretim Süreci", en: "Production Process" },
    subprocess: { tr: "Üretim Planlama", en: "Production Planning" },
    activity: { tr: "Üretim emri oluşturmak", en: "Create a production order" },
  },
  {
    id: "sales",
    core: { tr: "Satış Süreci", en: "Sales Process" },
    subprocess: { tr: "Sipariş Yönetimi", en: "Order Management" },
    activity: { tr: "Müşteri siparişini sisteme girmek", en: "Enter the customer order into the system" },
  },
  {
    id: "logistics",
    core: { tr: "Lojistik Süreci", en: "Logistics Process" },
    subprocess: { tr: "Sevkiyat Planlama", en: "Shipment Planning" },
    activity: { tr: "Sevkiyat etiketi basmak", en: "Print a shipping label" },
  },
  {
    id: "human-resources",
    core: { tr: "İnsan Kaynakları Süreci", en: "Human Resources Process" },
    subprocess: { tr: "İşe Alım", en: "Recruitment" },
    activity: { tr: "Aday özgeçmişini incelemek", en: "Review a candidate's resume" },
  },
  {
    id: "quality-management",
    core: { tr: "Kalite Yönetimi Süreci", en: "Quality Management Process" },
    subprocess: { tr: "Girdi Kalite Kontrolü", en: "Incoming Quality Control" },
    activity: { tr: "Gelen malzemeden numune almak", en: "Take a sample from incoming material" },
  },
  {
    id: "maintenance-management",
    core: { tr: "Bakım Yönetimi Süreci", en: "Maintenance Management Process" },
    subprocess: { tr: "Önleyici Bakım", en: "Preventive Maintenance" },
    activity: { tr: "Makinenin yağ seviyesini kontrol etmek", en: "Check the machine's oil level" },
  },
  {
    id: "customer-services",
    core: { tr: "Müşteri Hizmetleri Süreci", en: "Customer Services Process" },
    subprocess: { tr: "Şikâyet Yönetimi", en: "Complaint Management" },
    activity: { tr: "Müşteri şikâyet kaydı oluşturmak", en: "Create a customer complaint record" },
  },
  {
    id: "finance",
    core: { tr: "Finans Süreci", en: "Finance Process" },
    subprocess: { tr: "Fatura Yönetimi", en: "Invoice Management" },
    activity: { tr: "Faturayı sisteme kaydetmek", en: "Register the invoice in the system" },
  },
  {
    id: "product-development",
    core: { tr: "Ürün Geliştirme Süreci", en: "Product Development Process" },
    subprocess: { tr: "Prototip Geliştirme", en: "Prototype Development" },
    activity: { tr: "Prototip üzerinde dayanıklılık testi yapmak", en: "Perform a durability test on the prototype" },
  },
];

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
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function buildProcessHierarchyRounds(sessionId: string): ProcessHierarchyRound[] {
  const random = seededRandom(hashSeed(`week-3-module-1:${sessionId}`));
  return shuffle(processHierarchyPool, random).slice(0, 5).map((item) => ({
    id: item.id,
    item,
    cards: shuffle(processLayerOrder.map((layer) => ({
      id: `${item.id}:${layer}`,
      layer,
      text: item[layer],
    })), random),
  }));
}
