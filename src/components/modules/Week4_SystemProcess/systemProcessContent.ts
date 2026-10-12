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
  card("sys01", "is", "Parçalar ilişkilidir", "Parts are connected", "Bir parçadaki değişim diğer parçaları etkileyebilir.", "A change in one part can affect other parts.", [2, 7]),
  card("sys02", "is", "Bütün önemlidir", "The whole matters", "Sistem yalnızca parçaların ayrı ayrı toplamı değildir.", "A system is more than its parts considered separately.", [2, 43]),
  card("sys03", "is", "Geri bildirim önemlidir", "Feedback matters", "Geri bildirim sistemin davranışını yeniden etkiler.", "Feedback influences the system’s behavior again.", [39]),
  card("sys04", "is", "Değişim izlenir", "Change is monitored", "Sistemin zaman içindeki değişimi dikkate alınır.", "How the system changes over time is considered.", [39]),
  card("sys05", "is", "Etkileşim önemlidir", "Interaction matters", "Parçalar arasındaki karşılıklı etkiler sonucu biçimlendirir.", "Mutual effects among parts shape the outcome.", [2, 39]),
  card("sys06", "is", "Süreçler birlikte işler", "Processes work together", "Süreçler birbirinden kopuk değil, bağlantılıdır.", "Processes are connected rather than isolated.", [39]),
  card("sys07", "is", "Parçalar birbirini etkiler", "Parts affect one another", "Bir parçanın davranışı diğerlerine bağlı olabilir.", "A part’s behavior can depend on the others.", [7, 49]),
  card("sys08", "is", "Çevre dikkate alınır", "The environment is considered", "Sistem çevresi ve bağlamıyla birlikte değerlendirilir.", "A system is evaluated with its environment and context.", [11, 12]),
  card("sys09", "is", "Bağlantılar önemlidir", "Connections matter", "Bağlantılar bütünün nasıl çalıştığını açıklar.", "Connections help explain how the whole works.", [2, 7]),
  card("sys10", "is", "Bütünsel bakış gerekir", "A holistic view is needed", "Parçalar, ilişkiler ve bütün birlikte görülür.", "Parts, relationships, and the whole are viewed together.", [43, 46]),
  card("sys11", "is", "Sonuçlar birlikte oluşur", "Outcomes emerge together", "Sistem sonuçları birden çok etkileşimin ürünüdür.", "System outcomes result from multiple interactions.", [2, 44]),
  card("sys12", "is", "Zaman içindeki örüntüler izlenir", "Patterns over time are monitored", "Tek bir an yerine zaman içindeki davranış incelenir.", "Behavior over time is studied instead of a single moment.", [10, 41]),
  card("nosys01", "isNot", "Her parça tamamen bağımsızdır", "Every part is completely independent", "Sistem parçaları arasında ilişkiler ve bağımlılıklar vardır.", "System parts have relationships and dependencies.", [2, 7]),
  card("nosys02", "isNot", "Yalnızca tek parça önemlidir", "Only one part matters", "Bütünü anlamak için diğer parçalar ve ilişkiler de gerekir.", "Understanding the whole also requires other parts and relationships.", [2, 43]),
  card("nosys03", "isNot", "Geri bildirim gereksizdir", "Feedback is unnecessary", "Geri bildirim sistem davranışını anlamaya yardım eder.", "Feedback helps us understand system behavior.", [39]),
  card("nosys04", "isNot", "Çevre önemsizdir", "The environment is irrelevant", "Çevre ve bağlam sistemi etkileyebilir.", "The environment and context can affect the system.", [11, 12]),
  card("nosys05", "isNot", "Değişim dikkate alınmaz", "Change is ignored", "Sistemler ve süreçler zaman içinde değişebilir.", "Systems and processes can change over time.", [39]),
  card("nosys06", "isNot", "Tüm ilişkiler tek yönlüdür", "All relationships are one-way", "Karşılıklı etkiler ve geri bildirim döngüleri oluşabilir.", "Mutual effects and feedback loops can occur.", [2, 44]),
  card("nosys07", "isNot", "Yalnızca sonuca bakılır", "Only the outcome is considered", "Sonuçla birlikte süreç ve nedenler de incelenir.", "The process and causes are studied with the outcome.", [4, 39]),
  card("nosys08", "isNot", "Bütünün hiçbir önemi yoktur", "The whole has no importance", "Bütünün davranışı parçaların tekil davranışından farklı olabilir.", "The whole can behave differently from individual parts.", [43, 46]),
  card("nosys09", "isNot", "İlişkiler tamamen önemsizdir", "Relationships are completely irrelevant", "Sistem davranışını ilişkiler ve etkileşimler biçimlendirir.", "Relationships and interactions shape system behavior.", [2, 7]),
  card("nosys10", "isNot", "Süreci incelemeye gerek yoktur", "There is no need to study the process", "Süreç, sonucun nasıl oluştuğunu gösterir.", "The process shows how an outcome develops.", [39]),
  card("nosys11", "isNot", "Her sorunun tek nedeni vardır", "Every problem has one cause", "Karmaşık sorunlarda birden çok etkileşimli neden olabilir.", "Complex problems can have multiple interacting causes.", [2, 44]),
  card("nosys12", "isNot", "Parçaları bilmek her zaman yeterlidir", "Knowing the parts is always enough", "Parçaların ilişkilerini ve bütünün işleyişini de görmek gerekir.", "We must also see relationships and how the whole works.", [2, 43, 46]),
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
  const random = seededRandom(hashSeed(`week-4-module-3:${seedKey}`));
  const isCards = shuffle(systemProcessPool.filter((item) => item.target === "is"), random).slice(0, 3);
  const isNotCards = shuffle(systemProcessPool.filter((item) => item.target === "isNot"), random).slice(0, 3);
  return shuffle([...isCards, ...isNotCards], random).map((item, order) => ({ ...item, order }));
}
