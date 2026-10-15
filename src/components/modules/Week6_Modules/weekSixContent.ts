import type { Locale } from "@/lib/i18n/dictionaries";

export type LocalizedText = Record<Locale, string>;
export type WeekSixVariant = "flow" | "repair" | "agency";
export type FlowCategory = "target" | "overflow" | "missing-flow" | "prediction" | "graph";
export type RepairCategory = "sign" | "timestep" | "initial" | "conversion" | "delay" | "relation" | "capacity" | "behavior";
export type ModelTool = "physical" | "analog" | "schematic" | "mathematical";

export type WeekSixTask = {
  id: string;
  category: FlowCategory | RepairCategory | ModelTool;
  title: LocalizedText;
  prompt: LocalizedText;
  detail: LocalizedText;
  options: [LocalizedText, LocalizedText, LocalizedText, LocalizedText];
  correctIndex: number;
  visual: string;
  metrics?: { stock: number; inflow: number; outflow: number; target: number };
};

const t = (tr: string, en: string): LocalizedText => ({ tr, en });
const options = (...items: Array<[string, string]>) => items.map(([tr, en]) => t(tr, en)) as WeekSixTask["options"];

type FlowRow = [FlowCategory, string, string, string, string, string, string, string, string, string, string, string, string, number, string, number, number, number, number];
const flowRows: FlowRow[] = [
  ["target","Bitmiş Ürün Deposu","Finished Goods Depot","Stoku 60 birime getir.","Bring stock to 60 units.","Giriş 12, çıkış 7. Hangi işlem hedefe yaklaştırır?","Inflow is 12 and outflow is 7. Which action moves toward the target?","Girişi 5 azalt","Reduce inflow by 5","Çıkışı 5 artır","Increase outflow by 5","Akışı durdur","Stop the flow",0,"🏭",55,12,7,60],
  ["target","Hammadde Silosu","Raw Material Silo","Stoku 45 birimde tut.","Keep stock at 45 units.","Stok hedefin altında; tüketim girişten yüksek.","Stock is below target; usage exceeds inflow.","Girişi artır","Increase inflow","Çıkışı artır","Increase outflow","Girişi kapat","Close inflow",0,"🌾",34,6,10,45],
  ["target","Sipariş Havuzu","Order Pool","Bekleyen siparişi 20'ye indir.","Reduce pending orders to 20.","Yeni siparişler sevkiyattan hızlı geliyor.","New orders arrive faster than shipments.","Sevkiyatı artır","Increase shipping","Sipariş girişini artır","Increase order intake","Sevkiyatı azalt","Reduce shipping",0,"📋",31,9,5,20],
  ["target","Ara Stok Alanı","Work-in-Process Area","Ara stoku 30'a yaklaştır.","Move work-in-process toward 30.","Ara stok 42 ve büyümeye devam ediyor.","WIP is 42 and still growing.","Sonraki istasyonu hızlandır","Speed up the next station","Önceki istasyonu hızlandır","Speed up the previous station","Çıkışı durdur","Stop outflow",0,"📦",42,11,6,30],
  ["target","Su Tankı","Water Tank","Seviyeyi 70'te sabitle.","Stabilize the level at 70.","Seviye 66; giriş ve çıkış eşit.","Level is 66; inflow equals outflow.","Kısa süre girişi artır","Briefly increase inflow","Çıkışı kalıcı artır","Permanently increase outflow","İki akışı da kapat","Close both flows",0,"💧",66,8,8,70],
  ["target","Dağıtım Merkezi","Distribution Center","Stoku 50'ye dengele.","Balance stock at 50.","Stok 62, giriş çıkıştan 4 fazla.","Stock is 62; inflow exceeds outflow by 4.","Çıkışı girişten yüksek yap","Make outflow exceed inflow","Girişi daha da artır","Increase inflow further","Çıkışı sıfırla","Set outflow to zero",0,"🚚",62,10,6,50],
  ["overflow","Dolum Tankı","Filling Tank","Taşmayı önle.","Prevent overflow.","Tank %92 dolu; giriş 14, çıkış 4.","Tank is 92% full; inflow is 14, outflow is 4.","Girişi azalt, çıkışı artır","Reduce inflow and increase outflow","Girişi artır","Increase inflow","Çıkışı kapat","Close outflow",0,"🛢️",92,14,4,75],
  ["overflow","Paket Deposu","Package Depot","Yığılmayı durdur.","Stop the buildup.","Paketleme 15, sevkiyat 6 birim çalışıyor.","Packing runs at 15; shipping at 6 units.","Sevkiyatı hızlandır","Speed up shipping","Paketlemeyi hızlandır","Speed up packing","Sevkiyatı azalt","Reduce shipping",0,"📦",88,15,6,65],
  ["overflow","Atık Haznesi","Waste Reservoir","Hazneyi güvenli tut.","Keep the reservoir safe.","Atık girişi 9, arıtma çıkışı 3.","Waste inflow is 9; treatment outflow is 3.","Arıtma kapasitesini artır","Increase treatment capacity","Atık girişini artır","Increase waste inflow","Arıtmayı durdur","Stop treatment",0,"♻️",84,9,3,60],
  ["overflow","Çağrı Kuyruğu","Call Queue","Kuyruğun taşmasını önle.","Prevent queue overflow.","Dakikada 18 çağrı geliyor, 11 çağrı çözülüyor.","18 calls arrive per minute; 11 are resolved.","Çözüm hızını 18'in üstüne çıkar","Raise resolution above 18","Yeni kampanya başlat","Launch a new campaign","Temsilci azalt","Reduce agents",0,"☎️",79,18,11,55],
  ["overflow","Soğutma Tankı","Cooling Tank","Kritik seviyeyi düşür.","Lower the critical level.","Tank %95; vana çıkışı girişten yavaş.","Tank is 95%; valve outflow is slower than inflow.","Çıkış vanasını aç","Open the outlet valve","Girişi büyüt","Increase inflow","Vanayı kapat","Close the valve",0,"❄️",95,13,5,70],
  ["overflow","İade Deposu","Returns Depot","İade yığılmasını çöz.","Resolve the returns buildup.","İadeler 12, inceleme 4 birim/gün.","Returns are 12; inspection is 4 units/day.","İnceleme akışını artır","Increase inspection flow","İade kabulünü hızlandır","Speed up return intake","İncelemeyi azalt","Reduce inspection",0,"↩️",86,12,4,50],
  ["missing-flow","Montaj Hattı","Assembly Line","Eksik akışı bul.","Find the missing flow.","Parçalar giriyor, bitmiş ürün stoku değişmiyor.","Parts enter, but finished-goods stock does not change.","Montaj çıkışı","Assembly output","Sipariş girişi","Order intake","Hurda girişi","Scrap inflow",0,"🔧",40,10,0,55],
  ["missing-flow","Müşteri Kuyruğu","Customer Queue","Eksik akışı tanımla.","Identify the missing flow.","Müşteriler geliyor fakat kuyruktan kimse ayrılmıyor.","Customers arrive, but no one leaves the queue.","Hizmet tamamlama çıkışı","Service-completion outflow","Reklam girişi","Advertising inflow","Şikâyet stoku","Complaint stock",0,"👥",67,8,0,30],
  ["missing-flow","Enerji Deposu","Energy Store","Şemadaki eksik oku seç.","Choose the missing arrow.","Güneş üretimi depoya giriyor; tüketim gösterilmiyor.","Solar generation enters storage; consumption is missing.","Tüketim çıkışı","Consumption outflow","Üretim stoku","Production stock","Fiyat girişi","Price inflow",0,"🔋",73,11,0,60],
  ["missing-flow","Bakım İşleri","Maintenance Jobs","Eksik akışı tamamla.","Complete the missing flow.","Arızalar birikiyor; tamamlanan bakım bağlantısı yok.","Failures accumulate; completed maintenance is not connected.","Onarım çıkışı","Repair outflow","Arıza girişi","Failure inflow","Yedek parça stoku","Spare-parts stock",0,"🧰",71,7,0,35],
  ["missing-flow","Kasa Stoğu","Cash Stock","Eksik para akışını bul.","Find the missing cash flow.","Satış geliri var; giderler modelde görünmüyor.","Sales revenue exists; expenses are absent from the model.","Ödeme çıkışı","Payment outflow","Gelir girişi","Revenue inflow","Müşteri stoku","Customer stock",0,"💰",64,12,0,50],
  ["missing-flow","Tedarik Havuzu","Supply Pool","Kaybolan akışı ekle.","Add the missing flow.","Mal kabul var; üretime aktarım oku yok.","Receiving exists; the transfer-to-production arrow is missing.","Üretime sevk çıkışı","Transfer-to-production outflow","Yeni sipariş girişi","New-order inflow","Fiyat seviyesi","Price level",0,"🏗️",58,8,0,45],
  ["prediction","Hızlı İleri: Depo","Fast Forward: Depot","3 dönem sonrasını tahmin et.","Predict three periods ahead.","Stok 30; her dönem giriş 10, çıkış 6.","Stock is 30; each period inflow is 10 and outflow is 6.","42","42","34","34","18","18",0,"⏩",30,10,6,42],
  ["prediction","Hızlı İleri: Tank","Fast Forward: Tank","2 dönem sonrasını tahmin et.","Predict two periods ahead.","Seviye 50; giriş 7, çıkış 12.","Level is 50; inflow is 7 and outflow is 12.","40","40","55","55","24","24",0,"⏱️",50,7,12,40],
  ["prediction","Hızlı İleri: Sipariş","Fast Forward: Orders","4 dönem sonrasını tahmin et.","Predict four periods ahead.","Bekleyen 20; geliş 8, tamamlanan 5.","Pending is 20; arrivals are 8, completions are 5.","32","32","23","23","8","8",0,"📈",20,8,5,32],
  ["prediction","Hızlı İleri: Yakıt","Fast Forward: Fuel","3 dönem sonrasını tahmin et.","Predict three periods ahead.","Yakıt 70; ikmal 4, tüketim 9.","Fuel is 70; replenishment is 4 and consumption is 9.","55","55","65","65","31","31",0,"⛽",70,4,9,55],
  ["prediction","Hızlı İleri: Personel","Fast Forward: Staff","2 dönem sonrasını tahmin et.","Predict two periods ahead.","Personel 40; işe alım 3, ayrılma 5.","Staff is 40; hiring is 3 and departures are 5.","36","36","42","42","32","32",0,"🧑‍🏭",40,3,5,36],
  ["prediction","Hızlı İleri: İade","Fast Forward: Returns","5 dönem sonrasını tahmin et.","Predict five periods ahead.","İade 25; yeni 2, çözülen 4.","Returns are 25; 2 new and 4 resolved each period.","15","15","23","23","35","35",0,"📉",25,2,4,15],
  ["graph","Grafiği Seç: Büyüme","Choose the Graph: Growth","Doğru davranış grafiğini seç.","Choose the correct behavior graph.","Giriş sürekli çıkıştan büyük.","Inflow stays greater than outflow.","Sürekli yükselen ↗","Steadily rising ↗","Yatay →","Flat →","Sürekli düşen ↘","Steadily falling ↘",0,"📊",35,10,4,70],
  ["graph","Grafiği Seç: Denge","Choose the Graph: Balance","Doğru stok grafiğini seç.","Choose the correct stock graph.","Giriş ve çıkış her dönem eşit.","Inflow and outflow are equal each period.","Yatay →","Flat →","Yükselen ↗","Rising ↗","Düşen ↘","Falling ↘",0,"📊",50,7,7,50],
  ["graph","Grafiği Seç: Azalış","Choose the Graph: Decline","Doğru davranışı seç.","Choose the correct behavior.","Çıkış sürekli girişten büyük.","Outflow stays greater than inflow.","Sürekli düşen ↘","Steadily falling ↘","Yatay →","Flat →","Sürekli yükselen ↗","Steadily rising ↗",0,"📉",68,4,9,40],
  ["graph","Grafiği Seç: Taşma","Choose the Graph: Overflow","Kapasite sınırındaki davranışı seç.","Choose behavior at the capacity limit.","Net giriş pozitif; stok kapasiteye yaklaşıyor.","Net inflow is positive; stock approaches capacity.","Yükselip tavanda kalan ↗—","Rises then plateaus ↗—","Sıfıra düşen ↘","Drops to zero ↘","Dalgalanmayan yatay →","Always flat →",0,"🛢️",90,12,4,100],
  ["graph","Grafiği Seç: Salınım","Choose the Graph: Oscillation","Gecikmeli ayarın sonucunu seç.","Choose the result of delayed adjustment.","Düzeltmeler hedefi sırayla aşıyor ve altında kalıyor.","Corrections alternately overshoot and undershoot the target.","Hedef çevresinde dalga ∿","Waves around target ∿","Düz çizgi →","Straight line →","Sürekli yükseliş ↗","Continuous rise ↗",0,"🌊",52,9,8,50],
  ["graph","Grafiği Seç: Hedefe Yaklaşma","Choose the Graph: Goal Seeking","Doğru eğriyi bul.","Find the correct curve.","Hedeften uzaklaştıkça düzeltme akışı güçleniyor.","Corrective flow grows as the gap from target increases.","Hedefe yavaşlayan yaklaşım ↗⌁","Slowing approach to target ↗⌁","Sınırsız büyüme ↗","Unlimited growth ↗","Düz düşüş ↘","Straight decline ↘",0,"🎯",25,10,3,60],
];

export const flowOperationPool: WeekSixTask[] = flowRows.map((row, index) => ({
  id: `W6F${String(index + 1).padStart(2, "0")}-${index % 4}`, category: row[0], title: t(row[1], row[2]), prompt: t(row[3], row[4]), detail: t(row[5], row[6]),
  options: (() => { const base = options([row[7], row[8]], [row[9], row[10]], [row[11], row[12]], ["İşlem yapma", "Take no action"]); const shift = index % 4; return [...base.slice(-shift), ...base.slice(0, -shift)] as WeekSixTask["options"]; })(), correctIndex: index % 4, visual: row[14],
  metrics: { stock: row[15], inflow: row[16], outflow: row[17], target: row[18] },
}));

type RepairRow = [RepairCategory, string, string, string, string, string, string, string, string, string, string];
const repairRows: RepairRow[] = [
  ["sign","Stok ters yönde büyüyor","Stock grows in the wrong direction","Üretim arttığında stok azalıyor. Denklemde toplama yerine çıkarma var.","Stock falls when production rises. The equation subtracts instead of adding.","İşareti + yap","Change sign to +","Başlangıç değerini sıfırla","Reset initial value","Zaman adımını büyüt","Increase timestep"],
  ["sign","Talep ilişkisi ters","Demand relation is reversed","Fiyat artınca model talebi artırıyor.","The model raises demand when price increases.","İlişki işaretini negatif yap","Make the relation negative","Kapasiteyi kaldır","Remove capacity","Gecikme ekle","Add a delay"],
  ["sign","Maliyet yanlış azalıyor","Cost falls incorrectly","Hammadde fiyatı yükselirken toplam maliyet düşüyor.","Total cost falls while material price rises.","Maliyet bağlantısını pozitif yap","Make the cost link positive","Adımı iki katına çıkar","Double the timestep","Stoğu sıfırla","Set stock to zero"],
  ["timestep","Grafik zikzaklı","The graph is jagged","Sürekli süreç, çok büyük zaman adımı yüzünden sıçrıyor.","A continuous process jumps because the timestep is too large.","Zaman adımını küçült","Reduce the timestep","İşareti ters çevir","Reverse the sign","Kapasiteyi artır","Increase capacity"],
  ["timestep","Tank seviyesi negatif","Tank level becomes negative","Boşalma bir dönemde tanktaki miktarı aşıyor.","One-period drainage exceeds the amount in the tank.","Daha küçük zaman adımı kullan","Use a smaller timestep","Başlangıcı negatif yap","Make the initial value negative","Girişi sil","Delete inflow"],
  ["timestep","Salınım yapay büyüyor","Oscillation grows artificially","Hedef arama modeli her adımda hedefin çok ötesine sıçrıyor.","The goal-seeking model jumps far beyond its target each step.","Simülasyon adımını küçült","Reduce the simulation step","Gecikmeyi kaldır","Remove the delay","Akışı sabitle","Freeze the flow"],
  ["initial","Model yanlış noktadan başlıyor","The model starts at the wrong point","Gerçek depoda 80 ürün varken simülasyon 0'dan başlıyor.","The real depot has 80 items, but the simulation starts at 0.","Başlangıç stokunu 80 yap","Set initial stock to 80","Çıkış işaretini değiştir","Change the outflow sign","Dönüşümü kaldır","Remove conversion"],
  ["initial","İlk gün kuyruk kayıp","Day-one queue is missing","Açılışta bekleyen 24 müşteri modele girilmemiş.","The 24 customers waiting at opening are absent from the model.","Başlangıç kuyruğunu 24 yap","Set initial queue to 24","Zamanı hızlandır","Speed up time","Kapasiteyi sıfırla","Set capacity to zero"],
  ["initial","Enerji deposu boş görünüyor","Energy store appears empty","Batarya testten önce %60 dolu olmasına rağmen model boş.","The battery was 60% full before the test, but the model is empty.","İlk değeri %60 yap","Set the initial value to 60%","Tüketimi artı yap","Make consumption positive","Yeni gecikme ekle","Add a new delay"],
  ["conversion","Saat-gün karışıklığı","Hour-day mismatch","Saatlik sipariş hızı günlük stoktan doğrudan çıkarılıyor.","An hourly order rate is subtracted directly from a daily stock.","Hızı günlük birime dönüştür","Convert the rate to daily units","Başlangıç değerini artır","Increase initial value","Bağı sil","Delete the link"],
  ["conversion","Kilogram-ton hatası","Kilogram-ton error","Giriş kilogram, stok ton cinsinden hesaplanıyor.","Inflow is measured in kilograms while stock is calculated in tons.","Aynı birime dönüştür","Convert to the same unit","İşareti değiştir","Change the sign","Gecikmeyi uzat","Lengthen the delay"],
  ["conversion","Yüzde-adet hatası","Percent-count error","%10 kayıp, 10 adet kayıp gibi kullanılıyor.","A 10% loss is treated as a loss of 10 items.","Yüzdeyi stokla çarp","Multiply the percentage by stock","Zaman adımını büyüt","Increase timestep","Başlangıcı sıfırla","Reset the initial value"],
  ["delay","Teslimat anında geliyor","Delivery arrives instantly","Tedarik siparişi ile mal kabul arasında gerçek hayatta 4 gün var.","There are four real days between ordering and receiving supplies.","4 günlük gecikme ekle","Add a four-day delay","İşareti ters çevir","Reverse the sign","Kapasiteyi kaldır","Remove capacity"],
  ["delay","Eğitim etkisi anlık","Training effect is immediate","Eğitimin kaliteye etkisi modelde aynı dakika görülüyor.","Training affects quality in the same minute in the model.","Etki gecikmesi ekle","Add an effect delay","Başlangıcı artır","Increase the initial value","Birimi değiştir","Change the unit"],
  ["delay","Bakım sonucu erken","Maintenance result is too early","Bakım kararı arıza oranını hemen düşürüyor.","A maintenance decision lowers the failure rate immediately.","Uygulama gecikmesini tanımla","Define an implementation delay","Pozitif işaret ekle","Add a positive sign","Stoğu sil","Delete the stock"],
  ["relation","Satış bütçeden kopuk","Sales are disconnected from budget","Reklam bütçesi değişiyor ama talep hiç etkilenmiyor.","The ad budget changes, but demand is never affected.","Bütçe-talep ilişkisini ekle","Add the budget-demand relation","Zaman adımını büyüt","Increase timestep","İlk stoku azalt","Lower initial stock"],
  ["relation","Kuyruk personeli etkilemiyor","Queue does not affect staffing","Kuyruk büyüse de vardiya kararı değişmiyor.","Shift decisions do not change as the queue grows.","Kuyruktan vardiyaya bağ kur","Link queue to shift decisions","İşareti kaldır","Remove the sign","Birimleri karıştır","Mix the units"],
  ["relation","Kalite iadeden kopuk","Quality is disconnected from returns","Hata oranı artsa da iade akışı sabit kalıyor.","Return flow stays fixed even when the defect rate rises.","Hata-iade ilişkisini ekle","Add the defect-return relation","Kapasiteyi sonsuz yap","Make capacity infinite","Başlangıcı sıfırla","Reset initial value"],
  ["capacity","Tank sınırsız doluyor","Tank fills without limit","Model fiziksel tank kapasitesini aşarak büyüyor.","The model grows beyond the physical tank capacity.","Kapasite sınırı ekle","Add a capacity limit","Girişi negatif yap","Make inflow negative","Zaman adımını büyüt","Increase timestep"],
  ["capacity","Depo 500'ü aşıyor","Depot exceeds 500","Gerçek depo en fazla 500 kutu alıyor.","The real depot can hold at most 500 boxes.","500 kutuluk üst sınır koy","Set an upper limit of 500 boxes","Gecikmeyi kaldır","Remove delay","İlk değeri 5000 yap","Set initial value to 5000"],
  ["capacity","Ekip sonsuz iş alıyor","The team accepts unlimited work","Ekip kapasitesi 30 iş/günken model sınırsız tamamlıyor.","The team can handle 30 jobs/day, but the model completes unlimited work.","Çıkışı 30 ile sınırla","Cap outflow at 30","İşareti ters çevir","Reverse the sign","Stoğu kaldır","Remove the stock"],
  ["behavior","Model düz, gerçek dalgalı","Model is flat, reality fluctuates","Mevsimsel talep gerçek veride dalgalanıyor; model sabit.","Seasonal demand fluctuates in real data, but the model is flat.","Mevsimsel girdiyi ekle","Add a seasonal input","İlk değeri sıfırla","Reset initial value","Kapasiteyi kaldır","Remove capacity"],
  ["behavior","Model büyüyor, gerçek dengeli","Model grows, reality is stable","Gerçekte stok hedefe dönüyor; model sınırsız büyüyor.","Real stock returns to target, but the model grows without limit.","Dengeleyici geri bildirim ekle","Add balancing feedback","Zaman adımını büyüt","Increase timestep","Gecikmeyi sil","Delete delay"],
  ["behavior","Model hemen tepki veriyor","Model reacts immediately","Gerçek satışlar kampanyaya iki hafta sonra tepki veriyor.","Real sales react to the campaign after two weeks.","Davranış gecikmesini ekle","Add the behavior delay","Başlangıcı değiştir","Change initial value","İşareti pozitif yap","Make the sign positive"],
];

export const simulationRepairPool: WeekSixTask[] = repairRows.map((row, index) => ({
  id: `W6R${String(index + 1).padStart(2, "0")}-${index % 4}`, category: row[0], title: t(row[1], row[2]), prompt: t("Doğru onarımı seç.", "Choose the correct repair."), detail: t(row[3], row[4]),
  options: (() => { const base = options([row[5], row[6]], [row[7], row[8]], [row[9], row[10]], ["Modeli değiştirmeden çalıştır", "Run the model unchanged"]); const shift = index % 4; return [...base.slice(-shift), ...base.slice(0, -shift)] as WeekSixTask["options"]; })(), correctIndex: index % 4, visual: "🧪",
}));

const modelLabels: Record<ModelTool, LocalizedText> = {
  physical: t("Fiziksel Model", "Physical Model"), analog: t("Analog Model", "Analog Model"), schematic: t("Şematik Model", "Schematic Model"), mathematical: t("Matematiksel Model", "Mathematical Model"),
};
export const modelToolLabels = modelLabels;
const modelOrder: ModelTool[] = ["physical", "analog", "schematic", "mathematical"];
type AgencyRow = [ModelTool, string, string, string, string, string];
const agencyRows: AgencyRow[] = [
  ["physical","Mimar Deniz","Architect Deniz","Yeni müzenin insanların içinde yürüyebileceği ölçekli maketini istiyorum.","I need a scale model of the new museum that people can walk around.","🏛️"],
  ["physical","Mühendis Bora","Engineer Bora","Köprünün rüzgâr tünelinde test edilecek üç boyutlu örneği gerekli.","We need a three-dimensional bridge prototype for wind-tunnel testing.","🌉"],
  ["physical","Tasarımcı Ece","Designer Ece","Yeni şişenin elde nasıl hissedildiğini görmek için prototip istiyorum.","I need a prototype to see how the new bottle feels in the hand.","🧴"],
  ["physical","Şehir Plancısı Arda","Urban Planner Arda","Meydan düzenini binalarıyla birlikte ölçekli olarak sunmalıyız.","We must present the square layout with scaled buildings.","🏙️"],
  ["physical","Ürün Müdürü Selin","Product Manager Selin","Katlanır masanın çalışan gerçek boyutlu deneme örneğini hazırlayalım.","Let’s prepare a working full-size trial of the folding table.","🪑"],
  ["physical","Öğretmen Mert","Teacher Mert","Güneş sistemini sınıfta elle döndürülebilen kürelerle göstermek istiyorum.","I want to show the solar system with spheres students can rotate by hand.","🪐"],
  ["analog","Doktor İpek","Doctor İpek","Kan akışını suyun şeffaf borulardaki hareketiyle benzetmek istiyorum.","I want to represent blood flow using water moving through clear tubes.","🫀"],
  ["analog","Ekonomist Can","Economist Can","Piyasa dalgalanmasını yay ve ağırlık hareketiyle anlatan bir düzenek gerekli.","We need a spring-and-weight setup that represents market fluctuation.","⚖️"],
  ["analog","Eğitmen Zeynep","Trainer Zeynep","Elektrik akımını su akışı benzetmesiyle görünür kılalım.","Let’s make electric current visible through a water-flow analogy.","⚡"],
  ["analog","Psikolog Ozan","Psychologist Ozan","Stres birikimini dolan bir kap ve boşaltma vanasıyla anlatalım.","Let’s represent stress buildup with a filling vessel and release valve.","🧠"],
  ["analog","Lojistikçi Ada","Logistics Specialist Ada","Trafik akışını bilyelerin kanallardaki hareketiyle göstermek istiyorum.","I want to show traffic flow through marbles moving in channels.","🚦"],
  ["analog","Enerji Uzmanı Cem","Energy Specialist Cem","Şebeke dengesini iki bağlı su tankıyla temsil edelim.","Let’s represent grid balance with two connected water tanks.","🔌"],
  ["schematic","Süreç Uzmanı Ela","Process Specialist Ela","Siparişten teslimata tüm adımları ve karar noktalarını tek diyagramda gösterin.","Show every step and decision from order to delivery in one diagram.","🗺️"],
  ["schematic","Elektronikçi Kerem","Electronics Engineer Kerem","Devredeki parçaları ve bağlantıları standart sembollerle göstermeliyiz.","We must show circuit parts and connections with standard symbols.","🔋"],
  ["schematic","Yönetici Duru","Manager Duru","Departmanların kime rapor verdiğini kutular ve çizgilerle anlatın.","Use boxes and lines to show whom each department reports to.","🏢"],
  ["schematic","Veri Uzmanı Alp","Data Specialist Alp","Verinin sistemler arasında hangi yoldan aktığını görmem gerekiyor.","I need to see the path data follows between systems.","🖧"],
  ["schematic","Bakım Şefi Naz","Maintenance Chief Naz","Makine parçalarının bağlantısını patlatılmış görünümle işaretleyin.","Mark how machine parts connect in an exploded-view diagram.","⚙️"],
  ["schematic","Proje Lideri Eren","Project Lead Eren","İş paketlerinin bağımlılıklarını bir ağ şemasında gösterin.","Show work-package dependencies in a network diagram.","🕸️"],
  ["mathematical","Finansçı Aslı","Finance Specialist Aslı","Faiz, ödeme ve vade değişince borcun nasıl gelişeceğini hesaplamalıyız.","We must calculate how debt evolves as interest, payment, and term change.","🧮"],
  ["mathematical","Epidemiyolog Baran","Epidemiologist Baran","Bulaşma ve iyileşme oranlarıyla vaka sayısını tahmin etmek istiyorum.","I want to predict case counts using infection and recovery rates.","🦠"],
  ["mathematical","Üretim Analisti Suna","Production Analyst Suna","Talep ve kapasiteye göre en düşük maliyetli üretim planını bulalım.","Let’s find the lowest-cost production plan from demand and capacity.","📐"],
  ["mathematical","İklim Uzmanı Rüzgâr","Climate Specialist Rüzgâr","Sıcaklığın emisyon oranlarına göre yıllar içindeki değişimini hesaplayın.","Calculate temperature change over years from emission rates.","🌍"],
  ["mathematical","Operasyoncu Leyla","Operations Analyst Leyla","Kuyruk süresini geliş ve hizmet hızlarından sayısal olarak tahmin edelim.","Let’s numerically estimate queue time from arrival and service rates.","⏲️"],
  ["mathematical","Araştırmacı Tuna","Researcher Tuna","Nüfusun doğum ve ölüm oranlarıyla büyümesini denklemlerle inceleyelim.","Let’s study population growth with equations for birth and death rates.","📊"],
];

export const modelAgencyPool: WeekSixTask[] = agencyRows.map((row, index) => {
  const correctIndex = modelOrder.indexOf(row[0]);
  return { id: `W6A${String(index + 1).padStart(2, "0")}-${correctIndex}`, category: row[0], title: t(row[1], row[2]), prompt: t("Hangi model aracını kullanacaksın?", "Which modeling tool will you use?"), detail: t(row[3], row[4]), options: modelOrder.map((tool) => modelLabels[tool]) as WeekSixTask["options"], correctIndex, visual: row[5] };
});

function hashSeed(value: string) { let hash = 2166136261; for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); } return hash >>> 0; }
function seededRandom(seed: number) { let state = seed >>> 0; return () => { state += 0x6d2b79f5; let value = state; value = Math.imul(value ^ (value >>> 15), value | 1); value ^= value + Math.imul(value ^ (value >>> 7), value | 61); return ((value ^ (value >>> 14)) >>> 0) / 4294967296; }; }
function shuffle<T>(items: readonly T[], random: () => number) { const result = [...items]; for (let index = result.length - 1; index > 0; index -= 1) { const target = Math.floor(random() * (index + 1)); [result[index], result[target]] = [result[target]!, result[index]!]; } return result; }

export function buildWeekSixRound(variant: WeekSixVariant, seedKey: string): WeekSixTask[] {
  const random = seededRandom(hashSeed(`week-6:${variant}:${seedKey}`));
  const pool = variant === "flow" ? flowOperationPool : variant === "repair" ? simulationRepairPool : modelAgencyPool;
  const categories = variant === "flow"
    ? ["target", "overflow", "missing-flow", "prediction", "graph"]
    : variant === "repair"
      ? shuffle(["sign", "timestep", "initial", "conversion", "delay", "relation", "capacity", "behavior"], random).slice(0, 5)
      : ["physical", "analog", "schematic", "mathematical"];
  const selected = categories.map((category) => shuffle(pool.filter((task) => task.category === category), random)[0]!);
  if (variant === "agency") {
    const ids = new Set(selected.map((task) => task.id));
    selected.push(shuffle(pool.filter((task) => !ids.has(task.id)), random)[0]!);
  }
  return shuffle(selected, random);
}

export function validatedWeekSixScore(selectedTaskIds: readonly string[], answers: readonly { taskId: string; selectedIndex: number }[]) {
  if (selectedTaskIds.length !== 5 || new Set(selectedTaskIds).size !== 5) return 0;
  return answers.slice(0, 5).reduce((score, answer, index) => {
    const match = answer.taskId.match(/^W6[FRA](?:0[1-9]|[12][0-9]|30)-([0-3])$/);
    return score + (match && answer.taskId === selectedTaskIds[index] && answer.selectedIndex === Number(match[1]) ? 20 : 0);
  }, 0);
}
