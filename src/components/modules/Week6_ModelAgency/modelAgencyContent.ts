export type ModelType = "physical" | "analog" | "schematic" | "mathematical";
export type LocalizedText = { tr: string; en: string };

export type ModelAgencyProject = {
  id: string;
  modelType: ModelType;
  role: LocalizedText;
  request: LocalizedText;
  portrait: number;
  badge: string;
};

export const modelTypeLabels: Record<ModelType, LocalizedText> = {
  physical: { tr: "Fiziksel", en: "Physical" },
  analog: { tr: "Analog", en: "Analog" },
  schematic: { tr: "Şematik", en: "Schematic" },
  mathematical: { tr: "Matematiksel", en: "Mathematical" },
};

export const modelTypes: ModelType[] = ["physical", "analog", "schematic", "mathematical"];

export const modelAgencyProjects: ModelAgencyProject[] = [
  { id: "F01", modelType: "physical", role: { tr: "Fabrika yöneticisi", en: "Factory manager" }, request: { tr: "Yeni tesis yerleşimini ölçekli bir 3B düzen üzerinde görmek istiyorum.", en: "I want to see the new facility layout as a scaled 3D arrangement." }, portrait: 1, badge: "🏭" },
  { id: "F02", modelType: "physical", role: { tr: "Köprü mühendisi", en: "Bridge engineer" }, request: { tr: "Küçültülmüş beton köprü prototipini rüzgâr tünelinde denemeliyiz.", en: "We should test a reduced concrete bridge prototype in a wind tunnel." }, portrait: 3, badge: "🌉" },
  { id: "F03", modelType: "physical", role: { tr: "Ürün tasarımcısı", en: "Product designer" }, request: { tr: "Termosun tam boyutlu çalışan bir örneğini müşteriye sunmalıyım.", en: "I need to present a full-size working thermos sample to the client." }, portrait: 6, badge: "🧴" },
  { id: "F04", modelType: "physical", role: { tr: "Şehir plancısı", en: "Urban planner" }, request: { tr: "Yeni meydanın binaları ve yollarıyla ölçekli maketini hazırlayın.", en: "Prepare a scale model of the new square with its buildings and roads." }, portrait: 4, badge: "🏙️" },
  { id: "F05", modelType: "physical", role: { tr: "Mobilya üreticisi", en: "Furniture manufacturer" }, request: { tr: "Katlanır sandalyenin çalışan prototipiyle mekanizmayı sınamalıyız.", en: "We need a working folding-chair prototype to test the mechanism." }, portrait: 7, badge: "🪑" },
  { id: "F06", modelType: "physical", role: { tr: "Depo yöneticisi", en: "Warehouse manager" }, request: { tr: "Raf ve koridorları minyatür 3B depo düzeninde karşılaştırmak istiyorum.", en: "I want to compare racks and aisles in a miniature 3D warehouse layout." }, portrait: 2, badge: "📦" },
  { id: "A01", modelType: "analog", role: { tr: "Su sistemleri mühendisi", en: "Water systems engineer" }, request: { tr: "Boru basıncı ve akışı elektrik devresindeki gerilim ve akımla temsil edelim.", en: "Represent pipe pressure and flow using voltage and current in an electrical circuit." }, portrait: 5, badge: "💧" },
  { id: "A02", modelType: "analog", role: { tr: "Elektrik eğitmeni", en: "Electrical instructor" }, request: { tr: "Gerilim ve akımı su deposu ile borulardaki akışa benzeterek anlatalım.", en: "Explain voltage and current by comparing them to a water tank and pipe flow." }, portrait: 0, badge: "⚡" },
  { id: "A03", modelType: "analog", role: { tr: "Hastane operasyon uzmanı", en: "Hospital operations specialist" }, request: { tr: "Bekleyen hastaları dolup boşalan bir su deposuyla temsil etmek istiyorum.", en: "I want to represent waiting patients with a filling and draining water tank." }, portrait: 6, badge: "🏥" },
  { id: "A04", modelType: "analog", role: { tr: "Psikolog", en: "Psychologist" }, request: { tr: "Stresin artış ve azalmasını giriş-çıkış vanalı bir kapla gösterelim.", en: "Show stress rising and falling with a vessel that has inlet and outlet valves." }, portrait: 4, badge: "🧠" },
  { id: "A05", modelType: "analog", role: { tr: "Trafik araştırmacısı", en: "Traffic researcher" }, request: { tr: "Yoldaki araç akışını kanallarda ilerleyen bilyelerle inceleyelim.", en: "Study road traffic by using marbles moving through channels." }, portrait: 2, badge: "🚗" },
  { id: "A06", modelType: "analog", role: { tr: "Finans analisti", en: "Financial analyst" }, request: { tr: "Nakit ve rezerv hareketini birbirine bağlı iki su deposuyla gösterin.", en: "Show cash and reserve movement using two connected water tanks." }, portrait: 7, badge: "💰" },
  { id: "S01", modelType: "schematic", role: { tr: "Hastane yöneticisi", en: "Hospital administrator" }, request: { tr: "Hastanın kabulden taburculuğa ilerleyişini karar noktalarıyla akış diyagramına dökün.", en: "Map the patient journey from admission to discharge with decision points in a flowchart." }, portrait: 3, badge: "🩺" },
  { id: "S02", modelType: "schematic", role: { tr: "İnsan kaynakları yöneticisi", en: "Human resources manager" }, request: { tr: "Birimlerin ve raporlama ilişkilerinin organizasyon şemasını hazırlayın.", en: "Create an organization chart of departments and reporting relationships." }, portrait: 5, badge: "👥" },
  { id: "S03", modelType: "schematic", role: { tr: "Lojistik uzmanı", en: "Logistics specialist" }, request: { tr: "Sipariş, toplama, paketleme ve sevkiyat adımlarını süreç diyagramında gösterin.", en: "Show order, picking, packing and shipping steps in a process diagram." }, portrait: 1, badge: "🚚" },
  { id: "S04", modelType: "schematic", role: { tr: "Yazılım mimarı", en: "Software architect" }, request: { tr: "Verinin sistemdeki düğümler arasında nasıl aktığını oklar ve bağlantılarla çizin.", en: "Draw how data moves between system nodes using arrows and connections." }, portrait: 0, badge: "💻" },
  { id: "S05", modelType: "schematic", role: { tr: "Bakım uzmanı", en: "Maintenance specialist" }, request: { tr: "Sensör, kontrolcü ve motor ilişkisini blok diyagramıyla gösterin.", en: "Show the relationship among sensor, controller and motor in a block diagram." }, portrait: 7, badge: "🔧" },
  { id: "S06", modelType: "schematic", role: { tr: "Sistem analisti", en: "Systems analyst" }, request: { tr: "Stok, sipariş ve üretim arasındaki neden-sonuç oklarını görünür kılın.", en: "Make the causal arrows among stock, orders and production visible." }, portrait: 2, badge: "🔗" },
  { id: "M01", modelType: "mathematical", role: { tr: "Üretim planlamacısı", en: "Production planner" }, request: { tr: "Kapasite ve talep denklemleriyle en düşük maliyetli üretim planını bulalım.", en: "Find the lowest-cost production plan with capacity and demand equations." }, portrait: 4, badge: "📊" },
  { id: "M02", modelType: "mathematical", role: { tr: "Nüfus araştırmacısı", en: "Population researcher" }, request: { tr: "Doğum ve ölüm oranlarıyla gelecek nüfusu tahmin etmek istiyorum.", en: "I want to forecast future population using birth and death rates." }, portrait: 6, badge: "🌍" },
  { id: "M03", modelType: "mathematical", role: { tr: "Finans uzmanı", en: "Finance specialist" }, request: { tr: "Ödemelerden sonra kalan borcu hesaplayan bir formül kurun.", en: "Build a formula that calculates the remaining debt after payments." }, portrait: 0, badge: "🧮" },
  { id: "M04", modelType: "mathematical", role: { tr: "Çağrı merkezi yöneticisi", en: "Call center manager" }, request: { tr: "Müşteri bekleme süresini kuyruk denklemleriyle hesaplayalım.", en: "Calculate customer waiting time using queueing equations." }, portrait: 2, badge: "🎧" },
  { id: "M05", modelType: "mathematical", role: { tr: "Stok analisti", en: "Inventory analyst" }, request: { tr: "Üretim ve sevkiyata göre dönem sonu stok denklemini kurun.", en: "Create the ending-inventory equation from production and shipping." }, portrait: 5, badge: "📈" },
  { id: "M06", modelType: "mathematical", role: { tr: "Enerji uzmanı", en: "Energy specialist" }, request: { tr: "Gelecekteki elektrik açığını sayısal simülasyonla öngörmeliyiz.", en: "We need to forecast a future electricity shortage with a numerical simulation." }, portrait: 3, badge: "🔋" },
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

export function buildModelAgencyRound(seedKey: string) {
  const selected = modelTypes.map((modelType) => shuffled(modelAgencyProjects.filter((project) => project.modelType === modelType), `${seedKey}:${modelType}`)[0]!);
  const extraType = shuffled(modelTypes, `${seedKey}:extra`)[0]!;
  selected.push(shuffled(modelAgencyProjects.filter((project) => project.modelType === extraType && project.id !== selected.find((item) => item.modelType === extraType)?.id), `${seedKey}:extra:${extraType}`)[0]!);
  return shuffled(selected, `${seedKey}:round`);
}

export function scoreModelAgencyAnswers(projects: ModelAgencyProject[], answers: Array<{ projectId: string; selectedModelType: ModelType }>) {
  return answers.reduce((score, answer, index) => score + (projects[index]?.id === answer.projectId && projects[index]?.modelType === answer.selectedModelType ? 20 : 0), 0);
}
