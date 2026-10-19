export type Locale = "tr" | "en";
export type LocalizedText = Record<Locale, string>;
export type LoopGroup = "water" | "population" | "market" | "biosphere" | "production";
export type Polarity = "+" | "-";

export type LoopNode = {
  id: string;
  label: LocalizedText;
  x: number;
  y: number;
};

export type LoopLink = {
  id: string;
  from: string;
  to: string;
  polarity: Polarity;
  bend?: number;
};

export type LoopPath = {
  type: "R" | "B";
  linkIds: string[];
};

export type PredictionOptionId = "A" | "B" | "C";

export type LoopPrediction = {
  question: LocalizedText;
  options: Array<{ id: PredictionOptionId; text: LocalizedText }>;
  correctOptionId: PredictionOptionId;
  explanation: LocalizedText;
};

export type LoopRepairCase = {
  id: string;
  group: LoopGroup;
  situation: LocalizedText;
  explanation: LocalizedText;
  nodes: LoopNode[];
  links: LoopLink[];
  initialErrors: {
    polarityLinkIds: [string, string];
  };
  loops: LoopPath[];
  prediction: LoopPrediction;
};

export type LoopLinkState = Pick<LoopLink, "id" | "from" | "to" | "polarity">;
export type LoopAttempt = { caseId: string; signature: string; predictionChoiceId: PredictionOptionId | null };
export type LoopCompletion = LoopAttempt;

const t = (tr: string, en: string): LocalizedText => ({ tr, en });

const fourNodeLayout = [
  { x: 18, y: 22 },
  { x: 82, y: 22 },
  { x: 82, y: 78 },
  { x: 18, y: 78 },
];

const fiveNodeLayout = [
  { x: 50, y: 12 },
  { x: 86, y: 38 },
  { x: 72, y: 84 },
  { x: 28, y: 84 },
  { x: 14, y: 38 },
];

function nodes(items: Array<[string, string, string]>): LoopNode[] {
  const layout = items.length === 5 ? fiveNodeLayout : fourNodeLayout;
  return items.map(([id, tr, en], index) => ({ id, label: t(tr, en), ...layout[index]! }));
}

function link(id: string, from: string, to: string, polarity: Polarity, bend = 0): LoopLink {
  return { id, from, to, polarity, ...(bend ? { bend } : {}) };
}

function question(
  question: [string, string],
  options: Array<[PredictionOptionId, string, string]>,
  correctOptionId: PredictionOptionId,
  explanation: [string, string],
): LoopPrediction {
  return {
    question: t(...question),
    options: options.map(([id, tr, en]) => ({ id, text: t(tr, en) })),
    correctOptionId,
    explanation: t(...explanation),
  };
}

export const loopGroups: LoopGroup[] = ["water", "population", "market", "biosphere", "production"];

export const loopGroupLabels: Record<LoopGroup, LocalizedText> = {
  water: t("Su ve kontrol", "Water and control"),
  population: t("Nüfus", "Population"),
  market: t("Pazar", "Market"),
  biosphere: t("Biyosfer", "Biosphere"),
  production: t("Üretim / stok", "Production / inventory"),
};

export const week7LoopCases: LoopRepairCase[] = [
  {
    id: "W01", group: "water",
    situation: t("Bir depo, hedef su seviyesine göre musluğu otomatik ayarlıyor.", "A tank adjusts its inlet automatically according to the target water level."),
    explanation: t("Seviye yükseldikçe fark azalır; fark büyüdükçe musluk ve giriş artar. Bu negatif geri bildirim hedefe yaklaştıran dengeleyici döngüdür.", "As the level rises, the gap shrinks; a larger gap opens the tap and increases inflow. This negative feedback is a balancing loop toward the target."),
    nodes: nodes([["target", "İstenen seviye", "Target level"], ["gap", "Seviye farkı", "Level gap"], ["tap", "Musluk açıklığı", "Tap opening"], ["inflow", "Su girişi", "Water inflow"], ["level", "Su seviyesi", "Water level"]]),
    links: [link("e1", "target", "gap", "+"), link("e2", "gap", "tap", "+"), link("e3", "tap", "inflow", "+"), link("e4", "inflow", "level", "+"), link("e5", "level", "gap", "-", -12)],
    initialErrors: { polarityLinkIds: ["e5", "e3"] },
    loops: [{ type: "B", linkIds: ["e2", "e3", "e4", "e5"] }],
    prediction: question(
      ["Su seviyesi hedefe yaklaşırken seviye farkı azalırsa su girişi nasıl değişir?", "As the water level approaches the target and the level gap shrinks, how does inflow change?"],
      [["A", "Hızlanır", "Speeds up"], ["B", "Yavaşlar", "Slows down"], ["C", "Değişmez", "Stays unchanged"]], "B",
      ["Fark küçüldükçe musluk açıklığı ve buna bağlı su girişi azalır.", "As the gap shrinks, the tap opening and therefore the inflow decrease."],
    ),
  },
  {
    id: "W02", group: "water",
    situation: t("Bir oda termostatı sıcaklık farkına göre ısıtıcı gücünü değiştiriyor.", "A room thermostat changes heater power according to the temperature gap."),
    explanation: t("Oda ısındıkça sıcaklık farkı küçülür; fark büyüdüğünde ısıtıcı daha çok çalışır. Döngü sıcaklığı hedefte tutmaya çalışır.", "As the room warms, the temperature gap shrinks; a larger gap drives more heater power. The loop tries to hold temperature at its target."),
    nodes: nodes([["target", "Hedef sıcaklık", "Target temperature"], ["gap", "Sıcaklık farkı", "Temperature gap"], ["power", "Isıtıcı gücü", "Heater power"], ["heat", "Isı girişi", "Heat input"], ["actual", "Oda sıcaklığı", "Room temperature"]]),
    links: [link("e1", "target", "gap", "+"), link("e2", "gap", "power", "+"), link("e3", "power", "heat", "+"), link("e4", "heat", "actual", "+"), link("e5", "actual", "gap", "-", -12)],
    initialErrors: { polarityLinkIds: ["e2", "e4"] },
    loops: [{ type: "B", linkIds: ["e2", "e3", "e4", "e5"] }],
    prediction: question(
      ["Hedef sıcaklık sabitken oda sıcaklığı yükselirse sıcaklık farkı ilk anda nasıl değişir?", "With target temperature fixed, how does the temperature gap initially change when room temperature rises?"],
      [["A", "Azalır", "Decreases"], ["B", "Aynı kalır", "Stays the same"], ["C", "Artar", "Increases"]], "A",
      ["Gerçek sıcaklığın yükselmesi hedef ile oda arasındaki farkı küçültür.", "A rise in actual temperature narrows the gap between the target and the room."],
    ),
  },
  {
    id: "W03", group: "water",
    situation: t("Bir öğrenci bardağı istenen miktara kadar doldururken akışı azaltıyor.", "A student reduces the pour while filling a glass to the desired amount."),
    explanation: t("Bardaktaki su arttıkça doldurma farkı azalır; fark azaldığında dökme kararı ve akış düşer. Bu, taşmayı önleyen dengeleyici bir kontroldür.", "As water in the glass rises, the fill gap falls; a smaller gap reduces the pouring decision and flow. This balancing control prevents overflow."),
    nodes: nodes([["desired", "İstenen miktar", "Desired amount"], ["gap", "Doldurma farkı", "Fill gap"], ["pour", "Dökme kararı", "Pouring decision"], ["amount", "Bardaktaki su", "Water in glass"]]),
    links: [link("e1", "desired", "gap", "+"), link("e2", "gap", "pour", "+"), link("e3", "pour", "amount", "+"), link("e4", "amount", "gap", "-", 13)],
    initialErrors: { polarityLinkIds: ["e1", "e3"] },
    loops: [{ type: "B", linkIds: ["e2", "e3", "e4"] }],
    prediction: question(
      ["Bardaktaki su hedefe yaklaşırken doldurma farkı azalırsa dökme kararı nasıl etkilenir?", "As the water in the glass nears the target and the fill gap shrinks, how is the pouring decision affected?"],
      [["A", "Güçlenir", "Becomes stronger"], ["B", "Değişmez", "Stays unchanged"], ["C", "Zayıflar", "Becomes weaker"]], "C",
      ["Daha küçük doldurma farkı, dökme kararını azaltma yönünde etkiler.", "A smaller fill gap pushes the pouring decision downward."],
    ),
  },
  {
    id: "W04", group: "water",
    situation: t("Bir pompa, boru basıncını hedef değerde tutmak için vanayı yönetiyor.", "A pump manages a valve to keep pipe pressure at its target."),
    explanation: t("Basınç yükselince hata küçülür; hata büyürse vana, giriş ve gerçek basınç artar. Tek eksi ilişki döngüyü dengeleyici yapar.", "Higher pressure reduces the error; a larger error increases valve opening, inflow, and actual pressure. The single negative relation makes the loop balancing."),
    nodes: nodes([["target", "Hedef basınç", "Target pressure"], ["error", "Basınç hatası", "Pressure error"], ["valve", "Vana açıklığı", "Valve opening"], ["flow", "Boru girişi", "Pipe inflow"], ["pressure", "Gerçek basınç", "Actual pressure"]]),
    links: [link("e1", "target", "error", "+"), link("e2", "error", "valve", "+"), link("e3", "valve", "flow", "+"), link("e4", "flow", "pressure", "+"), link("e5", "pressure", "error", "-", -12)],
    initialErrors: { polarityLinkIds: ["e4", "e1"] },
    loops: [{ type: "B", linkIds: ["e2", "e3", "e4", "e5"] }],
    prediction: question(
      ["Bu modelde basınç hatası büyürse vana açıklığı doğrudan nasıl değişir?", "In this model, how does valve opening directly change when the pressure error grows?"],
      [["A", "Azalır", "Decreases"], ["B", "Artar", "Increases"], ["C", "Sabit kalır", "Stays constant"]], "B",
      ["Basınç hatası vana açıklığını pozitif etkilediği için vana daha çok açılır.", "Because pressure error positively affects valve opening, the valve opens further."],
    ),
  },
  {
    id: "P01", group: "population",
    situation: t("Doğurganlık oranı ve nüfus bileşimi sabit kabul edilen bir topluluğu inceleyin.", "Examine a community where fertility rate and population composition are assumed constant."),
    explanation: t("Doğumlar çocukları, yetişkinleşme yetişkinleri artırır; yetişkinleşme çocuk sayısını azaltır. Sabit doğurganlık varsayımı altında yetişkinler doğumları artırabilir.", "Births increase children and maturation increases adults, while maturation reduces children. Under the stated fixed-fertility assumption, adults can increase births."),
    nodes: nodes([["births", "Doğumlar", "Births"], ["children", "Çocuklar", "Children"], ["maturation", "Yetişkinleşme", "Maturation"], ["adults", "Yetişkinler", "Adults"]]),
    links: [link("e1", "births", "children", "+"), link("e2", "children", "maturation", "+", 8), link("e3", "maturation", "children", "-", -8), link("e4", "maturation", "adults", "+"), link("e5", "adults", "births", "+")],
    initialErrors: { polarityLinkIds: ["e3", "e4"] },
    loops: [{ type: "R", linkIds: ["e1", "e2", "e4", "e5"] }, { type: "B", linkIds: ["e2", "e3"] }],
    prediction: question(
      ["Doğumlar sabitken yetişkinleşme hızı artarsa çocuk sayısı ilk anda nasıl etkilenir?", "With births fixed, how is the number of children initially affected when maturation rises?"],
      [["A", "Azalma yönünde", "Toward a decrease"], ["B", "Değişmeden", "No change"], ["C", "Artış yönünde", "Toward an increase"]], "A",
      ["Yetişkinleşme çocuk stokundan çıkış olduğu için çocuk sayısını doğrudan azaltır.", "Maturation is an outflow from the child stock, so it directly reduces the number of children."],
    ),
  },
  {
    id: "P02", group: "population",
    situation: t("Sabit doğurganlıkta yeni kuşakların gelecekteki doğurgan nüfusa katıldığı bir büyümeyi izleyin.", "Track growth in which new generations join the future fertile population under constant fertility."),
    explanation: t("Doğurgan nüfus doğumları, doğumlar çocukları, çocuklar da gelecekteki doğurgan nüfusu artırır. Tüm ilişkiler aynı yönde olduğu için döngü pekiştiricidir.", "The fertile population increases births, births increase children, and children add to the future fertile population. With all same-direction links, the loop is reinforcing."),
    nodes: nodes([["fertile", "Doğurgan nüfus", "Fertile population"], ["births", "Doğumlar", "Births"], ["children", "Çocuk nüfus", "Child population"], ["future", "Gelecek doğurgan nüfus", "Future fertile population"]]),
    links: [link("e1", "fertile", "births", "+"), link("e2", "births", "children", "+"), link("e3", "children", "future", "+"), link("e4", "future", "fertile", "+")],
    initialErrors: { polarityLinkIds: ["e2", "e4"] },
    loops: [{ type: "R", linkIds: ["e1", "e2", "e3", "e4"] }],
    prediction: question(
      ["Bu modelde çocuk nüfus artarsa gelecekteki doğurgan nüfus hangi yönde etkilenir?", "In this model, which way is the future fertile population affected when the child population rises?"],
      [["A", "Azalma yönünde", "Toward a decrease"], ["B", "Etkilenmez", "Unaffected"], ["C", "Artış yönünde", "Toward an increase"]], "C",
      ["Çocuk nüfus ile gelecekteki doğurgan nüfus arasındaki ilişki pozitiftir.", "The relation from child population to future fertile population is positive."],
    ),
  },
  {
    id: "P03", group: "population",
    situation: t("Kalabalıklaşmanın ölüm oranı üzerinden nüfusu sınırladığı bir bölgeyi inceleyin.", "Examine a region where crowding limits population through the mortality rate."),
    explanation: t("Nüfus arttıkça kalabalıklaşma ve ölüm oranı yükselir; ölümler nüfusu azaltır. Tek ters yönlü etki dengeleyici geri bildirim oluşturur.", "As population grows, crowding and mortality rise; deaths reduce population. The single opposite-direction effect creates balancing feedback."),
    nodes: nodes([["population", "Nüfus", "Population"], ["crowding", "Kalabalıklaşma", "Crowding"], ["mortality", "Ölüm oranı", "Mortality rate"], ["deaths", "Ölümler", "Deaths"], ["pressure", "Kaynak baskısı", "Resource pressure"]]),
    links: [link("e1", "population", "crowding", "+"), link("e2", "crowding", "pressure", "+"), link("e3", "pressure", "mortality", "+"), link("e4", "mortality", "deaths", "+"), link("e5", "deaths", "population", "-")],
    initialErrors: { polarityLinkIds: ["e5", "e2"] },
    loops: [{ type: "B", linkIds: ["e1", "e2", "e3", "e4", "e5"] }],
    prediction: question(
      ["Diğer koşullar sabitken kalabalıklaşma artarsa kaynak baskısı nasıl değişir?", "Other conditions held constant, how does resource pressure change when crowding rises?"],
      [["A", "Azalır", "Decreases"], ["B", "Artar", "Increases"], ["C", "Aynı kalır", "Stays the same"]], "B",
      ["Modelde kalabalıklaşma kaynak baskısını pozitif yönde etkiler.", "In the model, crowding positively affects resource pressure."],
    ),
  },
  {
    id: "P04", group: "population",
    situation: t("Bir toplumda yetişkinleşmenin çocuk ve yetişkin nüfusu üzerindeki iki etkisini izleyin.", "Track the two effects of maturation on child and adult populations in a community."),
    explanation: t("Yetişkinleşme çocukları azaltıp yetişkinleri artırır. Yetişkinlerin bakım kapasitesi çocukların hayatta kalmasını artırdığında ikinci, pekiştirici bir yol oluşur.", "Maturation reduces children while increasing adults. When adults raise care capacity and child survival, a second reinforcing path appears."),
    nodes: nodes([["children", "Çocuklar", "Children"], ["maturation", "Yetişkinleşme", "Maturation"], ["adults", "Yetişkinler", "Adults"], ["care", "Bakım kapasitesi", "Care capacity"], ["survival", "Çocukların hayatta kalması", "Child survival"]]),
    links: [link("e1", "children", "maturation", "+", 8), link("e2", "maturation", "children", "-", -8), link("e3", "maturation", "adults", "+"), link("e4", "adults", "care", "+"), link("e5", "care", "survival", "+"), link("e6", "survival", "children", "+")],
    initialErrors: { polarityLinkIds: ["e2", "e5"] },
    loops: [{ type: "B", linkIds: ["e1", "e2"] }, { type: "R", linkIds: ["e1", "e3", "e4", "e5", "e6"] }],
    prediction: question(
      ["Yetişkin sayısı artarsa bakım kapasitesi doğrudan nasıl etkilenir?", "How is care capacity directly affected when the number of adults rises?"],
      [["A", "Artar", "Increases"], ["B", "Değişmez", "Stays unchanged"], ["C", "Azalır", "Decreases"]], "A",
      ["Yetişkinler bakım kapasitesini pozitif yönde besler.", "Adults positively contribute to care capacity."],
    ),
  },
  {
    id: "M01", group: "market",
    situation: t("Bir işletme gelirin bir bölümünü yeniden reklama yatırıyor.", "A business reinvests part of its revenue in advertising."),
    explanation: t("Reklam farkındalığı, farkındalık talebi, talep geliri ve gelir reklam bütçesini artırır. Tüm etkiler aynı yönde olduğundan büyüme pekişir.", "Advertising raises awareness, awareness raises demand, demand raises revenue, and revenue raises the ad budget. All links reinforce growth."),
    nodes: nodes([["ads", "Reklam yoğunluğu", "Advertising"], ["awareness", "Marka farkındalığı", "Brand awareness"], ["demand", "Talep", "Demand"], ["revenue", "Gelir", "Revenue"], ["budget", "Reklam bütçesi", "Ad budget"]]),
    links: [link("e1", "ads", "awareness", "+"), link("e2", "awareness", "demand", "+"), link("e3", "demand", "revenue", "+"), link("e4", "revenue", "budget", "+"), link("e5", "budget", "ads", "+")],
    initialErrors: { polarityLinkIds: ["e4", "e2"] },
    loops: [{ type: "R", linkIds: ["e1", "e2", "e3", "e4", "e5"] }],
    prediction: question(
      ["Diğer koşullar sabitken marka farkındalığı artarsa talep nasıl etkilenir?", "Other conditions held constant, how is demand affected when brand awareness rises?"],
      [["A", "Azalır", "Decreases"], ["B", "Sabit kalır", "Stays constant"], ["C", "Artar", "Increases"]], "C",
      ["Marka farkındalığından talebe giden pozitif bağ talebi artırır.", "The positive link from brand awareness to demand raises demand."],
    ),
  },
  {
    id: "M02", group: "market",
    situation: t("Sipariş birikimi teslim gecikmesini artırınca müşteriler yeni siparişlerini azaltıyor.", "When order backlog increases delivery delay, customers reduce new orders."),
    explanation: t("Birikim gecikmeyi artırır; gecikme yeni siparişleri azaltır. Daha az gelen sipariş birikimin artışını frenlediği için döngü dengeleyicidir.", "Backlog raises delay, while delay reduces new orders. Fewer incoming orders restrain backlog growth, so the loop is balancing."),
    nodes: nodes([["backlog", "Sipariş birikimi", "Order backlog"], ["delay", "Teslim gecikmesi", "Delivery delay"], ["newOrders", "Yeni siparişler", "New orders"], ["incoming", "Gelen sipariş", "Incoming orders"], ["fulfillment", "Karşılama hızı", "Fulfillment rate"]]),
    links: [link("e1", "backlog", "delay", "+"), link("e2", "delay", "newOrders", "-"), link("e3", "newOrders", "incoming", "+"), link("e4", "incoming", "backlog", "+"), link("e5", "fulfillment", "backlog", "-", -12)],
    initialErrors: { polarityLinkIds: ["e2", "e3"] },
    loops: [{ type: "B", linkIds: ["e1", "e2", "e3", "e4"] }],
    prediction: question(
      ["Teslim gecikmesi artarsa yeni siparişler üzerinde ilk doğrudan etki ne olur?", "What is the first direct effect on new orders when delivery delay rises?"],
      [["A", "Artış olur", "They increase"], ["B", "Azalış olur", "They decrease"], ["C", "Değişim olmaz", "They do not change"]], "B",
      ["Gecikmeden yeni siparişlere giden negatif bağ siparişleri azaltır.", "The negative link from delay to new orders reduces orders."],
    ),
  },
  {
    id: "M03", group: "market",
    situation: t("Bir hizmet işletmesinde büyüyen müşteri sayısı bekleme süresini etkiliyor.", "In a service business, a growing customer base affects waiting time."),
    explanation: t("Tatmin tavsiyeleri ve müşteri sayısını artırır; yük ve bekleme yükseldiğinde tatmin azalır. Bu sınırlandırıcı etki dengeleyici döngü kurar.", "Satisfaction raises recommendations and customer count; higher load and waiting reduce satisfaction. This limiting effect forms a balancing loop."),
    nodes: nodes([["satisfaction", "Müşteri tatmini", "Customer satisfaction"], ["recommendations", "Tavsiyeler", "Recommendations"], ["customers", "Müşteri sayısı", "Customer count"], ["load", "Hizmet yükü", "Service load"], ["wait", "Bekleme süresi", "Waiting time"]]),
    links: [link("e1", "satisfaction", "recommendations", "+"), link("e2", "recommendations", "customers", "+"), link("e3", "customers", "load", "+"), link("e4", "load", "wait", "+"), link("e5", "wait", "satisfaction", "-")],
    initialErrors: { polarityLinkIds: ["e5", "e1"] },
    loops: [{ type: "B", linkIds: ["e1", "e2", "e3", "e4", "e5"] }],
    prediction: question(
      ["Hizmet kapasitesi sabitken hizmet yükü artarsa bekleme süresi nasıl etkilenir?", "With service capacity fixed, how is waiting time affected when service load rises?"],
      [["A", "Artış yönünde", "Toward an increase"], ["B", "Değişmeden", "No change"], ["C", "Azalış yönünde", "Toward a decrease"]], "A",
      ["Hizmet yükünden bekleme süresine giden pozitif bağ beklemeyi artırır.", "The positive link from service load to waiting time increases the wait."],
    ),
  },
  {
    id: "M04", group: "market",
    situation: t("Bir firma talep ile kapasite arasındaki farka göre yatırım yapıyor.", "A firm invests according to the gap between demand and capacity."),
    explanation: t("Talep kapasite açığını büyütür, mevcut kapasite açığı küçültür. Açık yatırım ve kapasiteyi artırınca başlangıçtaki açık kapanır.", "Demand widens the capacity gap, while existing capacity narrows it. The gap drives investment and capacity, which then closes the original gap."),
    nodes: nodes([["demand", "Talep", "Demand"], ["gap", "Kapasite açığı", "Capacity gap"], ["investment", "Kapasite yatırımı", "Capacity investment"], ["capacity", "Kapasite", "Capacity"]]),
    links: [link("e1", "demand", "gap", "+"), link("e2", "gap", "investment", "+"), link("e3", "investment", "capacity", "+"), link("e4", "capacity", "gap", "-", 13)],
    initialErrors: { polarityLinkIds: ["e4", "e2"] },
    loops: [{ type: "B", linkIds: ["e2", "e3", "e4"] }],
    prediction: question(
      ["Talep sabitken mevcut kapasite yükselirse kapasite açığı nasıl değişir?", "With demand fixed, how does the capacity gap change when existing capacity rises?"],
      [["A", "Büyür", "Widens"], ["B", "Aynı kalır", "Stays the same"], ["C", "Küçülür", "Narrows"]], "C",
      ["Kapasite, kapasite açığını negatif etkilediği için açık küçülür.", "Capacity negatively affects the capacity gap, so the gap narrows."],
    ),
  },
  {
    id: "B01", group: "biosphere",
    situation: t("Gündüz oluşan bulutların yüzeyi gölgelemesiyle sıcaklığın değişimini inceleyin.", "Examine how daytime cloud shading changes surface temperature."),
    explanation: t("Sıcaklık buharlaşmayı ve bulut nemini artırır; daha fazla bulut örtüsü yüzey sıcaklığını düşürür. Böylece döngü dengeleyici olur.", "Temperature increases evaporation and cloud moisture; more cloud cover lowers surface temperature. The resulting loop is balancing."),
    nodes: nodes([["temperature", "Yüzey sıcaklığı", "Surface temperature"], ["evaporation", "Buharlaşma", "Evaporation"], ["moisture", "Bulut nemi", "Cloud moisture"], ["cover", "Bulut örtüsü", "Cloud cover"]]),
    links: [link("e1", "temperature", "evaporation", "+"), link("e2", "evaporation", "moisture", "+"), link("e3", "moisture", "cover", "+"), link("e4", "cover", "temperature", "-")],
    initialErrors: { polarityLinkIds: ["e4", "e1"] },
    loops: [{ type: "B", linkIds: ["e1", "e2", "e3", "e4"] }],
    prediction: question(
      ["Diğer etkenler sabitken yüzey sıcaklığı artarsa buharlaşma nasıl değişir?", "Other factors held constant, how does evaporation change when surface temperature rises?"],
      [["A", "Artar", "Increases"], ["B", "Değişmez", "Stays unchanged"], ["C", "Azalır", "Decreases"]], "A",
      ["Sıcaklıktan buharlaşmaya giden pozitif ilişki buharlaşmayı artırır.", "The positive relation from temperature to evaporation increases evaporation."],
    ),
  },
  {
    id: "B02", group: "biosphere",
    situation: t("Nemli hava bulut suyunu beslerken yağış buluttaki suyu tüketiyor.", "Humid air feeds cloud water while rainfall consumes water in the cloud."),
    explanation: t("Bulut suyu damlacık büyümesini ve yağışı artırır; yağış ise bulut suyunu azaltır. Bu tüketim ilişkisi döngüyü dengeleyici yapar.", "Cloud water increases droplet growth and rainfall, while rainfall reduces cloud water. This depletion relation makes the loop balancing."),
    nodes: nodes([["humidity", "Hava nemi", "Air humidity"], ["cloud", "Bulut suyu", "Cloud water"], ["droplets", "Damlacık büyümesi", "Droplet growth"], ["rain", "Yağış", "Rainfall"]]),
    links: [link("e1", "humidity", "cloud", "+"), link("e2", "cloud", "droplets", "+"), link("e3", "droplets", "rain", "+"), link("e4", "rain", "cloud", "-", 13)],
    initialErrors: { polarityLinkIds: ["e2", "e4"] },
    loops: [{ type: "B", linkIds: ["e2", "e3", "e4"] }],
    prediction: question(
      ["Hava nemi sabitken yağış artarsa bulut suyu ilk anda nasıl etkilenir?", "With air humidity fixed, how is cloud water initially affected when rainfall rises?"],
      [["A", "Artış yönünde", "Toward an increase"], ["B", "Etkilenmez", "Unaffected"], ["C", "Azalış yönünde", "Toward a decrease"]], "C",
      ["Yağış bulut suyunu tüketen negatif bir çıkış etkisidir.", "Rainfall is a negative outflow effect that consumes cloud water."],
    ),
  },
  {
    id: "B03", group: "biosphere",
    situation: t("Yağışla beslenen toprak suyunun bitki büyümesi ve terlemeyle azalmasını izleyin.", "Track how rain-fed soil water is reduced by plant growth and transpiration."),
    explanation: t("Yağış toprak suyunu, su bitki büyümesini, büyüme terlemeyi artırır; terleme toprağın suyunu azaltır. Son ilişki döngüyü dengeler.", "Rain raises soil water, water raises plant growth, and growth raises transpiration; transpiration reduces soil water. The last relation balances the loop."),
    nodes: nodes([["rain", "Yağış", "Rainfall"], ["soil", "Toprak suyu", "Soil water"], ["growth", "Bitki büyümesi", "Plant growth"], ["transpiration", "Terleme", "Transpiration"]]),
    links: [link("e1", "rain", "soil", "+"), link("e2", "soil", "growth", "+"), link("e3", "growth", "transpiration", "+"), link("e4", "transpiration", "soil", "-", 13)],
    initialErrors: { polarityLinkIds: ["e3", "e1"] },
    loops: [{ type: "B", linkIds: ["e2", "e3", "e4"] }],
    prediction: question(
      ["Diğer koşullar sabitken terleme artarsa toprak suyu nasıl etkilenir?", "Other conditions held constant, how is soil water affected when transpiration rises?"],
      [["A", "Artar", "Increases"], ["B", "Azalır", "Decreases"], ["C", "Aynı kalır", "Stays the same"]], "B",
      ["Terleme toprak suyunu azaltan negatif bir ilişkidir.", "Transpiration has a negative relation to soil water and reduces it."],
    ),
  },
  {
    id: "B04", group: "biosphere",
    situation: t("Diğer etkiler sabitken kısa vadeli su buharı geri bildirimini inceleyin.", "Examine short-term water-vapor feedback while holding other effects constant."),
    explanation: t("Sıcaklık buharlaşmayı ve atmosferik su buharını artırır; su buharının ısı tutması sıcaklığı yeniden yükseltir. Tüm etkiler aynı yönde olduğundan döngü pekiştiricidir.", "Temperature raises evaporation and atmospheric water vapor; heat trapping by water vapor raises temperature again. With all links in the same direction, the loop is reinforcing."),
    nodes: nodes([["temperature", "Sıcaklık", "Temperature"], ["evaporation", "Buharlaşma", "Evaporation"], ["vapor", "Atmosferik su buharı", "Atmospheric water vapor"], ["trapping", "Isı tutma", "Heat trapping"]]),
    links: [link("e1", "temperature", "evaporation", "+"), link("e2", "evaporation", "vapor", "+"), link("e3", "vapor", "trapping", "+"), link("e4", "trapping", "temperature", "+")],
    initialErrors: { polarityLinkIds: ["e1", "e3"] },
    loops: [{ type: "R", linkIds: ["e1", "e2", "e3", "e4"] }],
    prediction: question(
      ["Bu modelde atmosferik su buharı artarsa ısı tutma nasıl değişir?", "In this model, how does heat trapping change when atmospheric water vapor rises?"],
      [["A", "Artar", "Increases"], ["B", "Sabit kalır", "Stays constant"], ["C", "Azalır", "Decreases"]], "A",
      ["Su buharından ısı tutmaya giden ilişki pozitiftir.", "The relation from water vapor to heat trapping is positive."],
    ),
  },
  {
    id: "U01", group: "production",
    situation: t("Bir üretim ekibi stok açığına göre üretim planını güncelliyor.", "A production team updates its plan according to the inventory gap."),
    explanation: t("Üretim stoku artırır, stok artışı açığı azaltır; açık büyürse plan ve üretim yükselir. Bu hedef arayan döngü dengeleyicidir.", "Production raises inventory, while higher inventory reduces the gap; a larger gap raises the plan and production. This goal-seeking loop is balancing."),
    nodes: nodes([["inventory", "Stok", "Inventory"], ["gap", "Stok açığı", "Inventory gap"], ["plan", "Üretim planı", "Production plan"], ["production", "Üretim hızı", "Production rate"]]),
    links: [link("e1", "inventory", "gap", "-"), link("e2", "gap", "plan", "+"), link("e3", "plan", "production", "+"), link("e4", "production", "inventory", "+")],
    initialErrors: { polarityLinkIds: ["e1", "e3"] },
    loops: [{ type: "B", linkIds: ["e1", "e2", "e3", "e4"] }],
    prediction: question(
      ["Hedef stok sabitken mevcut stok yükselirse stok açığı nasıl değişir?", "With target inventory fixed, how does the inventory gap change when current inventory rises?"],
      [["A", "Büyür", "Widens"], ["B", "Aynı kalır", "Stays the same"], ["C", "Küçülür", "Narrows"]], "C",
      ["Mevcut stok arttığında hedef ile stok arasındaki açık küçülür.", "When current inventory rises, the gap between the target and inventory narrows."],
    ),
  },
  {
    id: "U02", group: "production",
    situation: t("Fazla stok görüldüğünde sevkiyat hedefinin yükseltildiği bir depoyu inceleyin.", "Examine a warehouse where the shipping target rises when excess inventory is observed."),
    explanation: t("Stok fazlası sevkiyat hedefini ve sevkiyatı artırır; sevkiyat stoku azaltır. Böylece fazlalığı gideren dengeleyici bir döngü oluşur.", "Excess inventory raises the shipping target and shipments; shipments reduce inventory. This creates a balancing loop that removes the excess."),
    nodes: nodes([["inventory", "Stok", "Inventory"], ["excess", "Stok fazlası", "Excess inventory"], ["target", "Sevkiyat hedefi", "Shipping target"], ["shipping", "Sevkiyat hızı", "Shipping rate"]]),
    links: [link("e1", "inventory", "excess", "+"), link("e2", "excess", "target", "+"), link("e3", "target", "shipping", "+"), link("e4", "shipping", "inventory", "-")],
    initialErrors: { polarityLinkIds: ["e4", "e2"] },
    loops: [{ type: "B", linkIds: ["e1", "e2", "e3", "e4"] }],
    prediction: question(
      ["Diğer akışlar sabitken sevkiyat hızı artarsa stok ilk anda nasıl etkilenir?", "With other flows fixed, how is inventory initially affected when the shipping rate rises?"],
      [["A", "Artar", "Increases"], ["B", "Azalır", "Decreases"], ["C", "Değişmez", "Stays unchanged"]], "B",
      ["Sevkiyat stoktan çıkış olduğu için stok üzerinde azaltıcı etki yapar.", "Shipping is an outflow from inventory, so it has a reducing effect."],
    ),
  },
  {
    id: "U03", group: "production",
    situation: t("Çalışan sayısı arttığında kişi başı yük ve işten ayrılma değişiyor.", "When employee count rises, workload per person and turnover change."),
    explanation: t("Daha çok çalışan kişi başı yükü, düşük yük de ayrılmayı azaltır; daha az ayrılma çalışan sayısını korur. İki ters ilişki döngüyü pekiştirici yapar.", "More employees reduce workload per person, and lower workload reduces turnover; less turnover preserves employee count. Two negative links make the loop reinforcing."),
    nodes: nodes([["employees", "Çalışan sayısı", "Employee count"], ["workload", "Kişi başı iş yükü", "Workload per person"], ["turnover", "İşten ayrılma", "Turnover"], ["loss", "Çalışan kaybı", "Employee loss"]]),
    links: [link("e1", "employees", "workload", "-"), link("e2", "workload", "turnover", "+"), link("e3", "turnover", "loss", "+"), link("e4", "loss", "employees", "-")],
    initialErrors: { polarityLinkIds: ["e1", "e3"] },
    loops: [{ type: "R", linkIds: ["e1", "e2", "e3", "e4"] }],
    prediction: question(
      ["Toplam iş aynı kalırken çalışan sayısı artarsa kişi başı iş yükü nasıl değişir?", "With total work unchanged, how does workload per person change when employee count rises?"],
      [["A", "Azalır", "Decreases"], ["B", "Değişmez", "Stays unchanged"], ["C", "Artar", "Increases"]], "A",
      ["Çalışan sayısından kişi başı iş yüküne giden ilişki negatiftir.", "The relation from employee count to workload per person is negative."],
    ),
  },
  {
    id: "U04", group: "production",
    situation: t("Sipariş birikimi yükselince fazla mesaiyle karşılama hızının artırıldığı bir hattı inceleyin.", "Examine a line where overtime raises fulfillment when order backlog grows."),
    explanation: t("Birikim fazla mesaiyi, fazla mesai karşılama hızını artırır; karşılama birikimi azaltır. Bu, sipariş yığılmasını sınırlayan dengeleyici döngüdür.", "Backlog raises overtime, overtime raises fulfillment, and fulfillment reduces backlog. This is a balancing loop that limits order accumulation."),
    nodes: nodes([["incoming", "Gelen sipariş", "Incoming orders"], ["backlog", "Sipariş birikimi", "Order backlog"], ["overtime", "Fazla mesai", "Overtime"], ["fulfillment", "Karşılama hızı", "Fulfillment rate"]]),
    links: [link("e1", "incoming", "backlog", "+"), link("e2", "backlog", "overtime", "+"), link("e3", "overtime", "fulfillment", "+"), link("e4", "fulfillment", "backlog", "-", 13)],
    initialErrors: { polarityLinkIds: ["e2", "e3"] },
    loops: [{ type: "B", linkIds: ["e2", "e3", "e4"] }],
    prediction: question(
      ["Bu modelde sipariş birikimi artarsa fazla mesai nasıl etkilenir?", "In this model, how is overtime affected when order backlog rises?"],
      [["A", "Azalır", "Decreases"], ["B", "Sabit kalır", "Stays constant"], ["C", "Artar", "Increases"]], "C",
      ["Sipariş birikiminden fazla mesaiye giden bağ pozitiftir.", "The link from order backlog to overtime is positive."],
    ),
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

function shuffled<T>(items: T[], seed: string) {
  const result = [...items];
  let state = hashSeed(seed) || 1;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const target = state % (index + 1);
    [result[index], result[target]] = [result[target]!, result[index]!];
  }
  return result;
}

export function buildLoopRepairRound(seedKey: string) {
  const selected = loopGroups.map((group) => shuffled(
    week7LoopCases.filter((item) => item.group === group),
    `${seedKey}:${group}`,
  )[0]!);
  return shuffled(selected, `${seedKey}:round`);
}

export function initialLinkStates(item: LoopRepairCase): LoopLinkState[] {
  return item.links.map((current) => ({
    id: current.id,
    from: current.from,
    to: current.to,
    polarity: item.initialErrors.polarityLinkIds.includes(current.id) ? (current.polarity === "+" ? "-" : "+") : current.polarity,
  }));
}

export function isCaseSolved(item: LoopRepairCase, states: LoopLinkState[]) {
  return states.length === item.links.length && item.links.every((correct, index) => {
    const current = states[index];
    return current?.id === correct.id && current.from === correct.from && current.to === correct.to && current.polarity === correct.polarity;
  });
}

export function answerSignature(states: LoopLinkState[]) {
  return states.map((current) => `${current.id}:${current.from}>${current.to}:${current.polarity}`).join("|");
}

export function correctAnswerSignature(item: LoopRepairCase) {
  return answerSignature(item.links);
}

export function incorrectLinkIds(item: LoopRepairCase, states: LoopLinkState[]) {
  return item.links.flatMap((correct, index) => {
    const current = states[index];
    return current?.id === correct.id && current.from === correct.from && current.to === correct.to && current.polarity === correct.polarity ? [] : [correct.id];
  });
}

export function isValidAttemptSignature(item: LoopRepairCase, signature: string) {
  return statesFromSignature(item, signature) !== null;
}

export function statesFromSignature(item: LoopRepairCase, signature: string, allowReversed = false): LoopLinkState[] | null {
  const parts = signature.split("|");
  if (parts.length !== item.links.length) return null;
  const states: LoopLinkState[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]!;
    const match = /^([^:]+):([^:>]+)>([^:>]+):([+-])$/.exec(part);
    const definition = item.links[index];
    if (!match || !definition || match[1] !== definition.id) return null;
    const [, , from, to, polarity] = match;
    const canonical = from === definition.from && to === definition.to;
    const reversed = from === definition.to && to === definition.from;
    if (!canonical && !(allowReversed && reversed)) return null;
    states.push({ id: definition.id, from: definition.from, to: definition.to, polarity: polarity as Polarity });
  }
  return states;
}

export function normalizeLegacySignature(item: LoopRepairCase, signature: string) {
  const states = statesFromSignature(item, signature, true);
  return states ? answerSignature(states) : null;
}

export function scoreLoopAttempt(item: LoopRepairCase, attempt: LoopAttempt) {
  if (attempt.caseId !== item.id) return 0;
  const states = statesFromSignature(item, attempt.signature);
  if (!states) return 0;
  const incorrectCount = incorrectLinkIds(item, states).length;
  const diagramScore = incorrectCount === 0 ? 12 : incorrectCount === 1 ? 6 : 0;
  const predictionScore = attempt.predictionChoiceId === item.prediction.correctOptionId ? 8 : 0;
  return diagramScore + predictionScore;
}

export function scoreLoopAttempts(round: LoopRepairCase[], attempts: LoopAttempt[]) {
  return attempts.reduce((score, attempt, index) => score + (round[index] ? scoreLoopAttempt(round[index], attempt) : 0), 0);
}

export const scoreLoopCompletions = scoreLoopAttempts;
