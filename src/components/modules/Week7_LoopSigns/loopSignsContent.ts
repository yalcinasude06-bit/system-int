export type Week7Locale = "tr" | "en";
export type LocalizedText = Record<Week7Locale, string>;
export type LoopPolarity = "+" | "-";
export type LoopType = "R" | "B";

export type LoopSignNode = {
  id: string;
  label: LocalizedText;
  x: number;
  y: number;
};

export type LoopSignEdge = {
  id: string;
  from: string;
  to: string;
  sign: LoopPolarity;
  explanation: LocalizedText;
};

export type LoopSignCase = {
  id: string;
  situation: LocalizedText;
  assumption: LocalizedText;
  nodes: LoopSignNode[];
  edges: LoopSignEdge[];
  signs: LoopPolarity[];
  loopType: LoopType;
};

const t = (tr: string, en: string): LocalizedText => ({ tr, en });

const layouts: Record<number, Array<{ x: number; y: number }>> = {
  3: [{ x: 50, y: 12 }, { x: 84, y: 71 }, { x: 16, y: 71 }],
  4: [{ x: 24, y: 17 }, { x: 76, y: 17 }, { x: 76, y: 79 }, { x: 24, y: 79 }],
  5: [{ x: 50, y: 8 }, { x: 88, y: 34 }, { x: 74, y: 82 }, { x: 26, y: 82 }, { x: 12, y: 34 }],
};

function nodes(items: Array<[string, string, string]>): LoopSignNode[] {
  const layout = layouts[items.length]!;
  return items.map(([id, tr, en], index) => ({ id, label: t(tr, en), ...layout[index]! }));
}

function edges(items: Array<[string, string, LoopPolarity, string, string]>): LoopSignEdge[] {
  return items.map(([from, to, sign, tr, en], index) => ({
    id: `e${index + 1}`,
    from,
    to,
    sign,
    explanation: t(tr, en),
  }));
}

export const loopSignCases: LoopSignCase[] = [
  {
    id: "LS1",
    situation: t("Reklam harcaması arttığında etkileri düşün.", "Think through the effects of higher advertising spend."),
    assumption: t("Satış gelirinin bir kısmı yeniden reklama ayrılır.", "Part of sales revenue is reinvested in advertising."),
    nodes: nodes([["ads", "Reklam", "Advertising"], ["awareness", "Bilinirlik", "Awareness"], ["revenue", "Satış geliri", "Sales revenue"]]),
    edges: edges([
      ["ads", "awareness", "+", "Reklam arttıkça bilinirlik aynı yönde artar.", "More advertising raises awareness in the same direction."],
      ["awareness", "revenue", "+", "Bilinirlik arttıkça satış geliri aynı yönde artar.", "More awareness raises sales revenue in the same direction."],
      ["revenue", "ads", "+", "Gelir arttıkça reklama ayrılan tutar da artar.", "More revenue increases the amount reinvested in advertising."],
    ]),
    signs: ["+", "+", "+"],
    loopType: "R",
  },
  {
    id: "LS2",
    situation: t("Depo hedef stoktan uzaklaştığında üretim tepkisini izle.", "Follow the production response when inventory moves away from target."),
    assumption: t("Hedef stok sabittir; plan ve üretim hızı birlikte ele alınır.", "Target inventory is fixed; plan and production rate are treated together."),
    nodes: nodes([["stock", "Depo stoku", "Inventory"], ["gap", "Stok açığı", "Stock gap"], ["plan", "Üretim planı", "Production plan"], ["rate", "Üretim hızı", "Production rate"]]),
    edges: edges([
      ["stock", "gap", "-", "Stok arttıkça hedefe olan açık ters yönde azalır.", "As inventory rises, the gap to target falls in the opposite direction."],
      ["gap", "plan", "+", "Açık büyüdükçe üretim planı artar.", "A larger gap raises the production plan."],
      ["plan", "rate", "+", "Daha yüksek plan üretim hızını artırır.", "A higher plan raises the production rate."],
      ["rate", "stock", "+", "Üretim hızı arttıkça depodaki stok artar.", "A higher production rate increases inventory."],
    ]),
    signs: ["-", "+", "+", "+"],
    loopType: "B",
  },
  {
    id: "LS3",
    situation: t("Bekleme uzadığında müşteri ve iş yükü zincirini izle.", "Follow the customer and workload chain when waiting time grows."),
    assumption: t("Hizmet kapasitesi sabittir.", "Service capacity is fixed."),
    nodes: nodes([["wait", "Bekleme", "Waiting time"], ["satisfaction", "Memnuniyet", "Satisfaction"], ["orders", "Tekrar sipariş", "Repeat orders"], ["load", "İş yükü", "Workload"]]),
    edges: edges([
      ["wait", "satisfaction", "-", "Bekleme arttıkça memnuniyet ters yönde azalır.", "Longer waits reduce satisfaction in the opposite direction."],
      ["satisfaction", "orders", "+", "Memnuniyet arttıkça tekrar siparişler artar.", "Higher satisfaction increases repeat orders."],
      ["orders", "load", "+", "Siparişler arttıkça iş yükü artar.", "More orders increase workload."],
      ["load", "wait", "+", "Kapasite sabitken iş yükü beklemeyi artırır.", "With fixed capacity, more workload raises waiting time."],
    ]),
    signs: ["-", "+", "+", "+"],
    loopType: "B",
  },
  {
    id: "LS4",
    situation: t("Barajdan sulama arttığında kaynak döngüsünü tamamla.", "Complete the resource loop when irrigation from the reservoir rises."),
    assumption: t("Verim yükselince ekili alan genişletilir.", "Cultivated land expands when yield improves."),
    nodes: nodes([["water", "Baraj suyu", "Reservoir water"], ["irrigation", "Sulama hızı", "Irrigation rate"], ["yield", "Tarımsal verim", "Crop yield"], ["land", "Ekili alan", "Cultivated land"], ["use", "Su tüketimi", "Water use"]]),
    edges: edges([
      ["water", "irrigation", "+", "Daha çok kullanılabilir su sulamayı artırır.", "More available water raises irrigation."],
      ["irrigation", "yield", "+", "Sulama arttıkça tarımsal verim artar.", "More irrigation raises crop yield."],
      ["yield", "land", "+", "Verim artınca ekili alan genişletilir.", "Higher yield encourages cultivated land to expand."],
      ["land", "use", "+", "Ekili alan büyüdükçe su tüketimi artar.", "More cultivated land raises water use."],
      ["use", "water", "-", "Tüketim arttıkça barajdaki su ters yönde azalır.", "More use reduces reservoir water in the opposite direction."],
    ]),
    signs: ["+", "+", "+", "+", "-"],
    loopType: "B",
  },
  {
    id: "LS5",
    situation: t("Bakım kararının kâr üzerinden geri dönüşünü tamamla.", "Complete the maintenance loop through its return to profit."),
    assumption: t("Bakım bütçesi kârdan ayrılır.", "The maintenance budget is funded from profit."),
    nodes: nodes([["budget", "Bakım bütçesi", "Maintenance budget"], ["frequency", "Bakım sıklığı", "Maintenance frequency"], ["faults", "Arıza sayısı", "Number of failures"], ["loss", "Üretim kaybı", "Production loss"], ["profit", "Kâr", "Profit"]]),
    edges: edges([
      ["budget", "frequency", "+", "Bütçe arttıkça bakım sıklığı artar.", "A larger budget increases maintenance frequency."],
      ["frequency", "faults", "-", "Bakım sıklaştıkça arıza sayısı ters yönde azalır.", "More frequent maintenance reduces failures in the opposite direction."],
      ["faults", "loss", "+", "Arızalar arttıkça üretim kaybı artar.", "More failures increase production loss."],
      ["loss", "profit", "-", "Üretim kaybı arttıkça kâr ters yönde azalır.", "More production loss reduces profit in the opposite direction."],
      ["profit", "budget", "+", "Kâr arttıkça bakıma ayrılabilen bütçe artar.", "More profit increases the budget available for maintenance."],
    ]),
    signs: ["+", "-", "+", "-", "+"],
    loopType: "R",
  },
];
