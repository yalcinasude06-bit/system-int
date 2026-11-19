import type { LocalizedText } from "../Week7_LoopSigns/loopSignsContent";

export type CurveKind = "linear" | "exponential" | "goal-seeking" | "s-shaped" | "oscillation";

export type CurveRound = {
  id: string;
  kind: CurveKind;
  prompt: LocalizedText;
  label: LocalizedText;
  feedback: LocalizedText;
  pastValues: number[];
};

const t = (tr: string, en: string): LocalizedText => ({ tr, en });

export const curveRounds: CurveRound[] = [
  {
    id: "DC1",
    kind: "linear",
    prompt: t("Giriş, çıkıştan sabit miktarda fazla.", "Inflow exceeds outflow by a constant amount."),
    label: t("Doğrusal artış", "Linear growth"),
    feedback: t("Sabit fark, aynı eğimle süren doğrusal artış üretir.", "A constant difference produces linear growth with the same slope."),
    pastValues: [.16, .18, .2, .22, .24, .26, .28, .3, .32, .34, .36, .38],
  },
  {
    id: "DC2",
    kind: "exponential",
    prompt: t("Büyüme miktarı mevcut nüfusla artıyor.", "The amount of growth rises with the current population."),
    label: t("Üstel büyüme", "Exponential growth"),
    feedback: t("Büyüme mevcut miktara bağlı olduğunda çizgi giderek dikleşir.", "When growth depends on the current amount, the curve becomes progressively steeper."),
    pastValues: [.12, .13, .14, .15, .17, .19, .21, .23, .25, .27, .29, .31],
  },
  {
    id: "DC3",
    kind: "goal-seeking",
    prompt: t("Sistem sabit bir hedefe yaklaşıyor.", "The system is approaching a fixed target."),
    label: t("Hedef arama", "Goal seeking"),
    feedback: t("Hedefe yaklaştıkça değişim yavaşlar ve çizgi yataylaşır.", "As the target gets closer, change slows and the curve levels off."),
    pastValues: [.12, .16, .2, .24, .27, .3, .32, .34, .36, .37, .38, .39],
  },
  {
    id: "DC4",
    kind: "s-shaped",
    prompt: t("Büyüme var ama kaynaklar sınırlı.", "Growth continues, but resources are limited."),
    label: t("S-şekilli büyüme", "S-shaped growth"),
    feedback: t("Büyüme önce hızlanır, kaynak sınırına yaklaşırken yavaşlar.", "Growth first accelerates, then slows as it approaches the resource limit."),
    pastValues: [.08, .09, .1, .11, .12, .14, .16, .18, .2, .23, .26, .29],
  },
  {
    id: "DC5",
    kind: "oscillation",
    prompt: t("Kontrol tepkisi gecikiyor.", "The control response is delayed."),
    label: t("Salınım", "Oscillation"),
    feedback: t("Gecikmeli düzeltme hedefi aşar; sistem yukarı ve aşağı salınır.", "Delayed correction overshoots the target, so the system oscillates up and down."),
    pastValues: [.4, .46, .53, .6, .66, .69, .67, .62, .56, .52, .51, .54],
  },
];
