import type { LocalizedText } from "../Week7_LoopSigns/loopSignsContent";

export type TankId = "A" | "B" | "C";
export type FlowChange = {
  at: number;
  field: "inflow" | "outflow";
  value: number;
};

export type StockTank = {
  id: TankId;
  start: number;
  inflow: number;
  outflow: number;
  change?: FlowChange;
};

export type StockRaceRound = {
  id: string;
  target: number;
  prompt: LocalizedText;
  note: LocalizedText;
  tanks: StockTank[];
};

const t = (tr: string, en: string): LocalizedText => ({ tr, en });

export const stockRaceRounds: StockRaceRound[] = [
  {
    id: "SR1",
    target: 70,
    prompt: t("Hedef çizgisine ilk hangi depo ulaşır?", "Which tank reaches the target line first?"),
    note: t("İki deponun başlangıç, Giriş ve Çıkış değerlerini karşılaştır.", "Compare both tanks' starting level, Inflow, and Outflow."),
    tanks: [
      { id: "A", start: 20, inflow: 12, outflow: 4 },
      { id: "B", start: 42, inflow: 7, outflow: 3 },
    ],
  },
  {
    id: "SR2",
    target: 80,
    prompt: t("Hedef 80 · Önce hangi depo dolar?", "Target 80 · Which tank fills first?"),
    note: t("Yüksek başlangıç tek başına yeterli değildir.", "A high starting level is not enough on its own."),
    tanks: [
      { id: "A", start: 25, inflow: 12, outflow: 4 },
      { id: "B", start: 55, inflow: 7, outflow: 3 },
      { id: "C", start: 40, inflow: 10, outflow: 5 },
    ],
  },
  {
    id: "SR3",
    target: 90,
    prompt: t("En dolu görünen depo yarışı kazanır mı?", "Will the fullest-looking tank win the race?"),
    note: t("Başlangıç seviyesi ile iki akışı birlikte düşün.", "Consider the starting level together with both flows."),
    tanks: [
      { id: "A", start: 70, inflow: 5, outflow: 3 },
      { id: "B", start: 30, inflow: 12, outflow: 4 },
      { id: "C", start: 45, inflow: 14, outflow: 4 },
    ],
  },
  {
    id: "SR4",
    target: 90,
    prompt: t("4. saniyedeki Giriş değişimini hesaba kat.", "Account for the Inflow change at second 4."),
    note: t("4. saniyede A: Giriş 12 → 5", "At second 4, A: Inflow 12 → 5"),
    tanks: [
      { id: "A", start: 35, inflow: 12, outflow: 3, change: { at: 4, field: "inflow", value: 5 } },
      { id: "B", start: 55, inflow: 8, outflow: 3 },
      { id: "C", start: 60, inflow: 7, outflow: 3 },
    ],
  },
  {
    id: "SR5",
    target: 85,
    prompt: t("2. saniyedeki Çıkış değişimini hesaba kat.", "Account for the Outflow change at second 2."),
    note: t("2. saniyede A: Çıkış 6 → 1", "At second 2, A: Outflow 6 → 1"),
    tanks: [
      { id: "A", start: 55, inflow: 8, outflow: 6, change: { at: 2, field: "outflow", value: 1 } },
      { id: "B", start: 50, inflow: 8, outflow: 3 },
      { id: "C", start: 60, inflow: 7, outflow: 3 },
    ],
  },
];
