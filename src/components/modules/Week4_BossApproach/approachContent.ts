import type { Locale } from "@/lib/i18n/dictionaries";

export type LocalizedText = Record<Locale, string>;
export type ApproachId = "indirgemeci" | "analitik" | "neden_sonuc" | "deneysel" | "mekanik" | "yararci" | "surec" | "genislemeci";

export type BossApproachQuestion = {
  id: string;
  difficulty: "easy" | "medium" | "hard";
  speech: LocalizedText;
  approachId: ApproachId;
  optionIds: [ApproachId, ApproachId, ApproachId, ApproachId];
  explanation: LocalizedText;
  sourcePage: number;
};

export type PresentedBossApproachQuestion = BossApproachQuestion & { options: ApproachId[] };

const text = (tr: string, en: string): LocalizedText => ({ tr, en });

export const approachLabels: Record<ApproachId, LocalizedText> = {
  indirgemeci: text("İndirgemeci Yaklaşım", "Reductionist Approach"),
  analitik: text("Analitik Yaklaşım", "Analytical Approach"),
  neden_sonuc: text("Neden–Sonuç Mekanizması Yaklaşımı", "Cause–Effect Mechanism Approach"),
  deneysel: text("Deneysel Yaklaşım", "Experimental Approach"),
  mekanik: text("Mekanik Yaklaşım", "Mechanical Approach"),
  yararci: text("Yararcı (Fayda) Yaklaşımı", "Utilitarian (Benefit) Approach"),
  surec: text("Süreç Yaklaşımı", "Process Approach"),
  genislemeci: text("Genişlemeci Yaklaşım", "Expansionist Approach"),
};

const explanations: Record<ApproachId, LocalizedText> = {
  indirgemeci: text("İndirgemeci yaklaşım, karmaşık bütünü en temel ve daha basit yapı taşlarına indirgeyerek açıklar.", "The reductionist approach explains a complex whole by reducing it to its simplest building blocks."),
  analitik: text("Analitik yaklaşım, sistemi parçalara ayırır, inceler ve bütünü yeniden birleştirir.", "The analytical approach separates a system into parts, studies them, and then puts the whole back together."),
  neden_sonuc: text("Neden–sonuç yaklaşımı, olayı doğrudan neden ve sonuç bağlantılarıyla açıklar.", "The cause–effect approach explains an event through direct links between causes and outcomes."),
  deneysel: text("Deneysel yaklaşım, gözlem, deney, sınama ve ölçümle bilgiye ulaşır.", "The experimental approach reaches knowledge through observation, experiments, testing, and measurement."),
  mekanik: text("Mekanik yaklaşım, sistemi belirlenmiş işlevleri olan düzenli bir makine gibi ele alır.", "The mechanical approach treats a system like an orderly machine with defined functions."),
  yararci: text("Yararcı yaklaşım, karar verirken pratik yararı ve faydayı temel ölçüt sayar.", "The utilitarian approach treats practical usefulness and benefit as the main decision criterion."),
  surec: text("Süreç yaklaşımı, ilişkili faaliyet akışını, öncesi-sonrası ve geri bildirimi birlikte inceler.", "The process approach studies connected activities, what comes before and after, and feedback together."),
  genislemeci: text("Genişlemeci yaklaşım, öğeyi içinde bulunduğu daha büyük sistemin parçası olarak anlar.", "The expansionist approach understands an item as part of the larger system around it."),
};

const question = (
  id: string,
  difficulty: BossApproachQuestion["difficulty"],
  tr: string,
  en: string,
  approachId: ApproachId,
  optionIds: BossApproachQuestion["optionIds"],
  sourcePage: number,
): BossApproachQuestion => ({ id, difficulty, speech: text(tr, en), approachId, optionIds, explanation: explanations[approachId], sourcePage });

export const bossApproachPool: BossApproachQuestion[] = [
  question("W4M1-01", "easy", "Sorunun kaynağını bulmak için sistemi en küçük temel parçalarına kadar ayıralım.", "To find the source of the problem, let’s break the system down into its smallest basic parts.", "indirgemeci", ["surec", "indirgemeci", "yararci", "genislemeci"], 33),
  question("W4M1-02", "easy", "Önce üretim hattını bölümlere ayıralım, her bölümü inceleyip sonra birlikte nasıl çalıştıklarını açıklayalım.", "First, let’s divide the production line into sections, examine each one, and then explain how they work together.", "analitik", ["deneysel", "mekanik", "analitik", "yararci"], 34),
  question("W4M1-03", "easy", "Makinenin durmasının belirli bir nedeni var. Neden ile sonucu açıklayan doğrudan bağlantıyı bulalım.", "The machine stopped for a specific reason. Let’s find the direct link that explains the cause and the outcome.", "neden_sonuc", ["neden_sonuc", "surec", "genislemeci", "yararci"], 35),
  question("W4M1-04", "easy", "Yeni üretim yönteminin daha iyi olduğunu düşünmek yetmez. Deney yapıp sonuçlarını ölçelim.", "Thinking that the new production method is better is not enough. Let’s test it and measure the results.", "deneysel", ["mekanik", "analitik", "indirgemeci", "deneysel"], 36),
  question("W4M1-05", "easy", "İşletmemizi bir saat mekanizması gibi düşünelim. Her bölüm belirlenen görevini düzenli biçimde yerine getirmeli.", "Let’s think of our business as a clockwork mechanism. Every unit should carry out its assigned task regularly.", "mekanik", ["surec", "mekanik", "genislemeci", "deneysel"], 37),
  question("W4M1-06", "easy", "Üç farklı yatırımımız var. Bize en fazla pratik faydayı sağlayan seçeneğe öncelik verelim.", "We have three investments. Let’s prioritize the option that gives us the greatest practical benefit.", "yararci", ["yararci", "deneysel", "surec", "indirgemeci"], 38),
  question("W4M1-07", "easy", "Satış, üretim ve teslimatı ayrı departmanlar olarak değil, birbirini etkileyen bir iş akışı olarak inceleyelim.", "Let’s study sales, production, and delivery not as separate departments, but as a workflow that affects itself.", "surec", ["mekanik", "analitik", "surec", "yararci"], 39),
  question("W4M1-08", "easy", "Fabrikamızın sorununu anlamadan önce içinde bulunduğu sektörü ve ekonomiyi de değerlendirelim.", "Before we understand our factory’s problem, let’s also consider its industry and the economy around it.", "genislemeci", ["indirgemeci", "deneysel", "mekanik", "genislemeci"], 40),
  question("W4M1-09", "medium", "Üretim sisteminin temel yapı taşlarını belirleyelim. Önce bu en küçük birimlerden başlayacağız.", "Let’s identify the production system’s fundamental building blocks. We will start with these smallest units.", "indirgemeci", ["analitik", "genislemeci", "indirgemeci", "surec"], 33),
  question("W4M1-10", "medium", "Müşteri hizmetlerini anlamak için görevleri tek tek ayıralım, nasıl işlediklerini öğrendikten sonra yeniden bir araya getirelim.", "To understand customer service, let’s separate the tasks one by one, learn how they work, and then bring them together again.", "analitik", ["analitik", "yararci", "deneysel", "mekanik"], 34),
  question("W4M1-11", "medium", "Bu arızayı açıklayan neden ortaya konduğunda, sonucun nasıl oluştuğunu da açıklayabileceğiz.", "Once we identify the cause that explains this fault, we can also explain how the outcome occurs.", "neden_sonuc", ["genislemeci", "deneysel", "surec", "neden_sonuc"], 35),
  question("W4M1-12", "medium", "Yeni kalite kontrol yöntemini doğrudan uygulamayalım. Önce bir hipotez kurup deney sonuçlarıyla test edelim.", "Let’s not apply the new quality-control method immediately. First, let’s form a hypothesis and test it with experimental results.", "deneysel", ["mekanik", "deneysel", "yararci", "indirgemeci"], 36),
  question("W4M1-13", "medium", "Her çalışanın görevi önceden tanımlı olsun. Organizasyon, parçaları uyum içinde işleyen bir makine gibi çalışsın.", "Let every employee’s task be defined in advance. The organization should work like a machine whose parts operate in harmony.", "mekanik", ["genislemeci", "surec", "mekanik", "deneysel"], 37),
  question("W4M1-14", "medium", "Projeleri beklenen yararlarına göre sıralayalım. Kaynakları bize daha çok fayda sağlayacak alanlara ayıralım.", "Let’s rank projects by their expected benefits. Let’s allocate resources to areas that will provide more value.", "yararci", ["deneysel", "yararci", "analitik", "mekanik"], 38),
  question("W4M1-15", "medium", "Bir işteki gecikmenin sonraki işleri nasıl etkilediğini ve geri bildirimlerin akışı nasıl değiştirdiğini inceleyelim.", "Let’s examine how a delay in one job affects later jobs and how feedback changes the flow.", "surec", ["surec", "mekanik", "indirgemeci", "yararci"], 39),
  question("W4M1-16", "medium", "Hastanenin performansını yalnızca klinik içinde değil, bağlı olduğu sağlık sistemi içinde de değerlendirelim.", "Let’s evaluate the hospital’s performance not only within the clinic, but also within the health system it belongs to.", "genislemeci", ["analitik", "deneysel", "neden_sonuc", "genislemeci"], 40),
  question("W4M1-17", "hard", "Karmaşık problemi anlamak için önce daha basit, temel öğelere indirgememiz gerektiğini düşünüyorum.", "To understand the complex problem, I think we first need to reduce it to simpler, fundamental elements.", "indirgemeci", ["surec", "analitik", "yararci", "indirgemeci"], 33),
  question("W4M1-18", "hard", "Sistemi açıklarken önce parçalarına ayırıp her birinin davranışını tanımlayacağım; sonra bütünü yeniden kuracağım.", "When explaining the system, I will first separate it into parts and describe each behavior; then I will rebuild the whole.", "analitik", ["genislemeci", "analitik", "mekanik", "deneysel"], 34),
  question("W4M1-19", "hard", "Bu olayın gerçekleşmesi için gerekli ve yeterli olan sebebi belirleyebilirsek sonucu açıklayabiliriz.", "If we can identify the necessary and sufficient cause for this event, we can explain the outcome.", "neden_sonuc", ["neden_sonuc", "mekanik", "surec", "deneysel"], 35),
  question("W4M1-20", "hard", "İki yöntem hakkında varsayımlarımız var. Hangisinin gerçekten işe yaradığını tekrarlanabilir gözlem ve deneylerle sınayalım.", "We have assumptions about two methods. Let’s test which one truly works with repeatable observations and experiments.", "deneysel", ["analitik", "yararci", "deneysel", "genislemeci"], 36),
  question("W4M1-21", "hard", "Organizasyonu mekanik yasalarla açıklanabilen, belirlenmiş işlevleri yerine getiren düzenli bir yapı olarak görüyorum.", "I see the organization as an orderly structure that can be explained by mechanical laws and performs defined functions.", "mekanik", ["surec", "mekanik", "indirgemeci", "genislemeci"], 37),
  question("W4M1-22", "hard", "Bir çözümün değerini belirlerken öncelikle sağlayacağı pratik yararı esas alırım.", "When determining a solution’s value, I primarily use the practical benefit it will provide.", "yararci", ["yararci", "analitik", "mekanik", "deneysel"], 38),
  question("W4M1-23", "hard", "Sorunu yalnızca mevcut faaliyetlerde aramayalım. Öncesini, sonrasını ve süreçlerin karşılıklı etkileşimini birlikte düşünelim.", "Let’s not look for the problem only in current activities. Let’s consider what came before and after, and how processes interact with one another.", "surec", ["neden_sonuc", "indirgemeci", "surec", "mekanik"], 39),
  question("W4M1-24", "hard", "Bir tedarik problemini yalnızca kendi firmamızda aramayalım; tedarik zincirinin ve daha geniş ekonomik sistemin içindeki yerimizi inceleyelim.", "Let’s not look for a supply problem only inside our own firm; let’s examine our place in the supply chain and the wider economic system.", "genislemeci", ["mekanik", "deneysel", "analitik", "genislemeci"], 40),
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
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target]!, result[index]!];
  }
  return result;
}

export function buildBossApproachRound(seedKey: string): PresentedBossApproachQuestion[] {
  const random = seededRandom(hashSeed(`week-4-module-1:${seedKey}`));
  const approachIds = Object.keys(approachLabels) as ApproachId[];
  const selected = approachIds.map((approachId) => shuffle(bossApproachPool.filter((question) => question.approachId === approachId), random)[0]!);
  const selectedIds = new Set(selected.map((question) => question.id));
  const remaining = shuffle(bossApproachPool.filter((question) => !selectedIds.has(question.id)), random).slice(0, 2);
  return shuffle([...selected, ...remaining], random).map((question) => ({ ...question, options: shuffle(question.optionIds, random) }));
}
