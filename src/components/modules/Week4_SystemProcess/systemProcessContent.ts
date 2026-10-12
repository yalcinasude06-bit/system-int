import type { Locale } from "@/lib/i18n/dictionaries";

export type SystemProcessTarget = "is" | "isNot";

export type LocalizedText = Record<Locale, string>;

export type SystemProcessCard = {
  id: string;
  target: SystemProcessTarget;
  text: LocalizedText;
  explanation: LocalizedText;
  sourcePages: number[];
};

export type PresentedSystemProcessCard = SystemProcessCard & { order: number };

const text = (tr: string, en: string): LocalizedText => ({ tr, en });

const card = (
  id: string,
  target: SystemProcessTarget,
  tr: string,
  en: string,
  explanationTr: string,
  explanationEn: string,
  sourcePages: number[],
): SystemProcessCard => ({ id, target, text: text(tr, en), explanation: text(explanationTr, explanationEn), sourcePages });


export const systemProcessPool: SystemProcessCard[] = [
  card("W4M2-01", "is", "Sistemin parçaları arasındaki ilişkiler, ortaya çıkan sonucu etkiler.", "Relationships among a system’s parts affect the outcome.", "Parçaların etkileşimi bütünün davranışını değiştirebilir.", "Interactions between parts can change the behavior of the whole.", [2, 7]),
  card("W4M2-02", "is", "Bir süreçteki iş adımları birbirini etkileyebilir.", "Work steps in a process can affect one another.", "İş akışındaki aşamalar bağımsız değildir.", "Stages in a workflow are not independent.", [39]),
  card("W4M2-03", "is", "Süreç yaklaşımı bütünsellik, evrimsellik ve etkileşime dayanır.", "The process approach is based on wholeness, evolution, and interaction.", "Kaynak bu üç ilkeyi süreç yaklaşımının temelleri sayar.", "The source treats these three principles as foundations of the process approach.", [39]),
  card("W4M2-04", "is", "Geri bildirim, sürecin işleyişini yeniden değerlendirmeyi sağlar.", "Feedback enables us to reassess how a process works.", "Geri bildirim süreçleri ve sonuçları gözden geçirmeye yardımcı olur.", "Feedback helps review processes and their outcomes.", [39]),
  card("W4M2-05", "is", "Bir sorunu anlamak için öncesini ve sonrasını da düşünmek gerekir.", "To understand a problem, we should also consider what came before and after it.", "Sürecin geçmişi ve sonraki etkileri vardır.", "A process has a history and later effects.", [39]),
  card("W4M2-06", "is", "Sistemin bütünsel başarısı, parçaların tek tek başarısından farklı olabilir.", "A system’s overall success can differ from the success of its individual parts.", "Yerel başarı bütünün başarısını garanti etmez.", "Local success does not guarantee the success of the whole.", [43, 46]),
  card("W4M2-07", "is", "Süreçler zaman içinde değişebilir ve gelişebilir.", "Processes can change and develop over time.", "Evrimsellik durağan değil değişen süreci ifade eder.", "Evolution means a process changes rather than remains static.", [39]),
  card("W4M2-08", "is", "Bir parçanın etkisi, diğer parçalarla olan ilişkilerine bağlı olabilir.", "A part’s effect can depend on its relationships with other parts.", "Bir parçayı ilişkilerinden koparmak açıklamayı eksiltir.", "Separating a part from its relationships makes the explanation incomplete.", [7, 49]),
  card("W4M2-09", "is", "Bir problemin görünen belirtisi ile temel nedeni farklı olabilir.", "A problem’s visible symptom and its root cause can be different.", "Görülen olayın arkasındaki yapı ve nedenler araştırılır.", "We investigate the structures and causes behind the visible event.", [4, 41, 42, 43, 44]),
  card("W4M2-10", "is", "Kararların kısa ve uzun vadeli etkileri birlikte değerlendirilir.", "The short- and long-term effects of decisions are evaluated together.", "Sistem gecikmeleri ve uzun dönemli etkiler önem taşır.", "System delays and long-term effects matter.", [10]),
  card("W4M2-11", "is", "Süreçler arasındaki karşılıklı bağımlılık dikkate alınır.", "Mutual dependency between processes is taken into account.", "Farklı faaliyetler birbirini etkiler.", "Different activities affect one another.", [39, 44]),
  card("W4M2-12", "is", "Bir problemin çözümünde farklı disiplinlerin bakış açıları kullanılabilir.", "Different disciplines’ perspectives can be used to solve a problem.", "Disiplinler arası yaklaşım daha bütünsel değerlendirme sunar.", "An interdisciplinary approach offers a more holistic evaluation.", [47, 54]),
  card("W4M2-13", "is", "Yalnızca mevcut duruma değil, değişim örüntüsüne de bakılır.", "We look not only at the present state, but also at the pattern of change.", "Bir anlık görüntü yerine zamandaki eğilim anlaşılır.", "We understand the trend over time rather than a single snapshot.", [3, 5]),
  card("W4M2-14", "is", "Bir müdahalenin diğer süreçlere etkisi araştırılır.", "The effect of an intervention on other processes is investigated.", "Müdahale başka bölümlerde sonuçlar doğurabilir.", "An intervention can create consequences in other parts.", [10, 44]),
  card("W4M2-15", "is", "Sistemin içinde bulunduğu çevre, analiz sırasında göz önüne alınır.", "The environment a system is in is considered during analysis.", "Sistem çevre ve bağlamıyla ele alınır.", "A system is considered together with its environment and context.", [11, 12]),
  card("W4M2-16", "isNot", "Sistem, birbirinden bağımsız parçaların toplamından ibarettir.", "A system is merely the sum of parts that are independent from one another.", "Sistem ilişkiler ve etkileşimli bir bütündür.", "A system is a whole of relationships and interactions.", [2]),
  card("W4M2-17", "isNot", "Bir bölüm iyileşirse bütün sistem mutlaka iyileşir.", "If one unit improves, the whole system necessarily improves.", "Tek bölümdeki iyileşme tüm sistemin sonucunu garanti etmez.", "An improvement in one unit does not guarantee the outcome for the whole system.", [43, 46]),
  card("W4M2-18", "isNot", "Bir sürecin önceki ve sonraki aşamaları önemsizdir.", "The earlier and later stages of a process are unimportant.", "Sürecin öncesi, sonrası ve etkileşimleri önemlidir.", "A process’s before, after, and interactions are important.", [39]),
  card("W4M2-19", "isNot", "Süreç yaklaşımı yalnızca sabit parçaları inceler; ilişkileri dikkate almaz.", "The process approach studies only fixed parts and ignores relationships.", "Süreç yaklaşımı ilişkili akışları ve değişimi inceler.", "The process approach studies connected flows and change.", [39]),
  card("W4M2-20", "isNot", "Geri bildirim, süreçleri anlamak için gerekli değildir.", "Feedback is not needed to understand processes.", "Geri bildirim süreçler arasındaki etkileşimin parçasıdır.", "Feedback is part of the interaction between processes.", [39]),
  card("W4M2-21", "isNot", "Bir problemin her zaman yalnızca tek bir nedeni vardır.", "A problem always has only one cause.", "Karmaşık sorunlar birden çok etkileşimli etkene bağlı olabilir.", "Complex problems can depend on multiple interacting factors.", [2, 44]),
  card("W4M2-22", "isNot", "Bir iş adımındaki değişiklik diğer adımları etkilemez.", "A change in one work step does not affect other steps.", "Birbirine bağlı faaliyetler değişimlerden etkilenebilir.", "Connected activities can be affected by changes.", [39]),
  card("W4M2-23", "isNot", "Bütünü anlamak için parçaları ayrı ayrı incelemek her zaman yeterlidir.", "To understand the whole, it is always enough to study parts separately.", "Parçaların ilişkilerini ve sistemin işlevini de görmek gerekir.", "We must also see the relationships between parts and the system’s function.", [2, 43, 46]),
  card("W4M2-24", "isNot", "Sistemin çevresindeki koşullar hiçbir zaman önemli değildir.", "Conditions around a system are never important.", "Sistem çevre ve bağlamıyla ele alınır.", "A system is considered together with its environment and context.", [11, 12]),
  card("W4M2-25", "isNot", "Kararların yalnızca bugünkü sonuçları önemlidir.", "Only today’s results of decisions matter.", "Gecikmiş ve uzun vadeli sonuçlar da değerlendirilir.", "Delayed and long-term consequences are also evaluated.", [10, 41]),
  card("W4M2-26", "isNot", "Sistem düşüncesi yalnızca görünen belirtilerle ilgilenir.", "Systems thinking is concerned only with visible symptoms.", "Belirtilerin arkasındaki yapıları ve kök nedenleri arar.", "It looks for the structures and root causes behind symptoms.", [4, 5]),
  card("W4M2-27", "isNot", "Problemleri birbirinden tamamen bağımsız incelemek sistem yaklaşımının temel kuralıdır.", "Studying problems as completely independent is a basic rule of the systems approach.", "Sistem yaklaşımı bağımlılıkları ve ortak bağlamı görür.", "The systems approach sees dependencies and shared context.", [8, 44, 47]),
  card("W4M2-28", "isNot", "Sistemdeki etkileşimler yalnızca tek yönde gerçekleşir.", "Interactions in a system occur in only one direction.", "Karşılıklı etki ve geri bildirim döngüleri oluşabilir.", "Mutual effects and feedback loops can form.", [2, 44]),
  card("W4M2-29", "isNot", "Süreçlerin değişmeyeceği varsayılmalı, yeniden tasarım düşünülmemelidir.", "We should assume processes will not change and should not consider redesign.", "Süreç yaklaşımı evrimselliği ve tasarımı dışlamaz.", "The process approach does not exclude evolution or redesign.", [39]),
  card("W4M2-30", "isNot", "Karmaşık problemlerde farklı disiplinlerin görüşlerine ihtiyaç yoktur.", "Complex problems do not need views from different disciplines.", "Birden çok disiplinden yararlanmak sorunları anlamayı kolaylaştırır.", "Drawing on multiple disciplines makes problems easier to understand.", [47, 54]),
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

export function buildSystemProcessRound(seedKey: string): PresentedSystemProcessCard[] {
  const random = seededRandom(hashSeed(`week-4-module-2:${seedKey}`));
  const isCards = shuffle(systemProcessPool.filter((item) => item.target === "is"), random).slice(0, 6);
  const isNotCards = shuffle(systemProcessPool.filter((item) => item.target === "isNot"), random).slice(0, 6);
  return shuffle([...isCards, ...isNotCards], random).map((item, order) => ({ ...item, order }));
}
