import type { Locale } from "@/lib/i18n/dictionaries";

export type LocalizedText = Record<Locale, string>;
export type DelayTrailMonth = { before: LocalizedText; after: LocalizedText };
export type DelayTrailCase = {
  id: string;
  stage: number;
  title: LocalizedText;
  context: LocalizedText;
  initiatorIndex: number;
  months: readonly DelayTrailMonth[];
  explanation: LocalizedText;
  feedbackLoop?: LocalizedText;
};

export type DelayTrailResolution = "first" | "second" | "teaching";
export type DelayTrailRecord = {
  caseId: string;
  selections: number[];
  resolution: DelayTrailResolution;
  revealedThrough: number;
};

export const DELAY_TRAIL_STAGE_COUNT = 5;
export const DELAY_TRAIL_STAGE_SCORE = 20;
export const DELAY_TRAIL_MAX_SCORE = 100;
export const DELAY_TRAIL_SECOND_CHANCE_MS = 6_000;
export const DELAY_TRAIL_REVEAL_STEP_MS = 450;

const l = (tr: string, en: string): LocalizedText => ({ tr, en });
const m = (trBefore: string, trAfter: string, enBefore: string, enAfter: string): DelayTrailMonth => ({
  before: l(trBefore, enBefore),
  after: l(trAfter, enAfter),
});

export const DELAY_TRAIL_MONTHS: Record<Locale, readonly string[]> = {
  tr: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran"],
  en: ["January", "February", "March", "April", "May", "June"],
};

export const DELAY_TRAIL_STAGES = [
  l("Gecikmenin Başlangıcı", "The Start of the Delay"),
  l("Görünmeyen Bağlantı", "The Hidden Connection"),
  l("Kısır Döngüyü Kır", "Break the Vicious Cycle"),
  l("Çözümün Yan Etkisi", "The Solution's Side Effect"),
  l("Kaldıraç Noktasını Bul", "Find the Leverage Point"),
] as const;

export const DELAY_TRAIL_CASES: readonly DelayTrailCase[] = [
  {
    id: "G01", stage: 0, initiatorIndex: 0,
    title: l("Bakımın Geciken Bedeli", "The Delayed Cost of Maintenance"),
    context: l("Fabrika · Makine bakımı", "Factory · Machine maintenance"),
    months: [
      m("Planlı bakım aralığı uzatıldı", "Planlı bakım takvimi korundu", "The scheduled maintenance interval was extended", "The scheduled maintenance plan was preserved"),
      m("Küçük aşınmalar birikmeye başladı", "Aşınmalar bakımda erken giderildi", "Minor wear began to accumulate", "Wear was addressed early during maintenance"),
      m("Makine titreşimi yükseldi", "Makine kararlı çalıştı", "Machine vibration increased", "The machine ran steadily"),
      m("Plansız duruşlar görüldü", "Plansız duruşlar azaldı", "Unplanned stoppages occurred", "Unplanned stoppages decreased"),
      m("Siparişler gecikmeye başladı", "Siparişler zamanında hazırlandı", "Orders began to be delayed", "Orders were prepared on time"),
      m("Teslimat şikâyetleri arttı", "Teslimat şikâyetleri azaldı", "Delivery complaints increased", "Delivery complaints decreased"),
    ],
    explanation: l("Bakım kararının etkisi hemen değil, biriken yıpranma üzerinden aylara yayılarak görüldü.", "The maintenance decision appeared over several months through accumulated wear rather than immediately."),
  },
  {
    id: "G02", stage: 0, initiatorIndex: 1,
    title: l("Yeni Ekip, Eksik Eğitim", "New Team, Incomplete Training"),
    context: l("Üretim · İnsan faktörü", "Production · Human factors"),
    months: [
      m("Yeni üretim hattı açıldı", "Yeni üretim hattı açıldı", "A new production line opened", "A new production line opened"),
      m("İşe giriş eğitimi kısaltıldı", "İşe giriş eğitimi tamamlandı", "Onboarding training was shortened", "Onboarding training was completed"),
      m("Yeni çalışanların uygulama hataları arttı", "Uygulama hataları azaldı", "New employees made more execution errors", "Execution errors decreased"),
      m("Hatalı ürün sayısı yükseldi", "Ürün kalitesi iyileşti", "The number of defective products rose", "Product quality improved"),
      m("İadeler çoğalmaya başladı", "İadeler azaldı", "Returns began to increase", "Returns decreased"),
      m("Müşteri şikâyetleri arttı", "Müşteri şikâyetleri azaldı", "Customer complaints increased", "Customer complaints decreased"),
    ],
    explanation: l("Eğitim süresindeki kısalma birkaç ay sonra kalite ve müşteri deneyimine yansıdı.", "Shortening the training period affected quality and customer experience several months later."),
  },
  {
    id: "G03", stage: 0, initiatorIndex: 0,
    title: l("Stok Eşiği", "The Stock Threshold"),
    context: l("Perakende · Stok yönetimi", "Retail · Inventory management"),
    months: [
      m("Yeniden sipariş eşiği düşürüldü", "Yeniden sipariş eşiği uygun düzeyde tutuldu", "The reorder threshold was lowered", "The reorder threshold was kept at an appropriate level"),
      m("Depoda güvenlik stoku azaldı", "Güvenlik stoku yeterli kaldı", "Safety stock in the warehouse decreased", "Safety stock remained sufficient"),
      m("Yoğun talepte stok çabuk tükendi", "Yoğun talep stokla karşılandı", "Stock ran out quickly during peak demand", "Stock met the peak demand"),
      m("Raf boşlukları görünmeye başladı", "Raf doluluğu korundu", "Empty shelf spaces began to appear", "Shelf availability was maintained"),
      m("Kaybedilen satışlar arttı", "Kaybedilen satışlar azaldı", "Lost sales increased", "Lost sales decreased"),
      m("Müşteri memnuniyeti düştü", "Müşteri memnuniyeti yükseldi", "Customer satisfaction fell", "Customer satisfaction rose"),
    ],
    explanation: l("Sipariş kuralındaki değişiklik önce stokta, daha sonra raflarda ve müşteri memnuniyetinde görüldü.", "The ordering-rule change appeared first in inventory, then on shelves and in customer satisfaction."),
  },
  {
    id: "G04", stage: 0, initiatorIndex: 1,
    title: l("Destek Masasında Bekleyiş", "Waiting at the Support Desk"),
    context: l("Hizmet · Teknik destek", "Service · Technical support"),
    months: [
      m("Destek talebi sayısı normal seyretti", "Destek talebi sayısı normal seyretti", "Support request volume was normal", "Support request volume was normal"),
      m("Uzman destek saatleri azaltıldı", "Uzman destek saatleri korundu", "Expert support hours were reduced", "Expert support hours were preserved"),
      m("Karmaşık talepler çözülmeden kaldı", "Karmaşık talepler çözüldü", "Complex requests remained unresolved", "Complex requests were resolved"),
      m("Açık talep kuyruğu büyüdü", "Açık talep kuyruğu küçüldü", "The open request queue grew", "The open request queue shrank"),
      m("Yanıt süresi uzadı", "Yanıt süresi kısaldı", "Response time increased", "Response time decreased"),
      m("Müşteri şikâyetleri arttı", "Müşteri şikâyetleri azaldı", "Customer complaints increased", "Customer complaints decreased"),
    ],
    explanation: l("Kaynağın azaltılması aynı gün fark edilmese de biriken çözülmemiş işler gecikmeli sonucu oluşturdu.", "Although the resource cut was not visible immediately, accumulated unresolved work produced the delayed outcome."),
  },
  {
    id: "G05", stage: 0, initiatorIndex: 2,
    title: l("Kalibrasyon Gecikmesi", "The Calibration Delay"),
    context: l("Sağlık laboratuvarı · Ölçüm kalitesi", "Health laboratory · Measurement quality"),
    months: [
      m("Laboratuvarda normal iş yükü vardı", "Laboratuvarda normal iş yükü vardı", "The laboratory had a normal workload", "The laboratory had a normal workload"),
      m("Yeni analiz cihazları kuruldu", "Yeni analiz cihazları kuruldu", "New analysis devices were installed", "New analysis devices were installed"),
      m("Kalibrasyon kontrolü ertelendi", "Kalibrasyon kontrolü zamanında yapıldı", "The calibration check was postponed", "The calibration check was completed on time"),
      m("Ölçüm sapmaları görülmeye başladı", "Ölçüm sapmaları önlendi", "Measurement deviations began to appear", "Measurement deviations were prevented"),
      m("Numunelerin tekrar çalışma sayısı arttı", "Tekrar çalışma ihtiyacı azaldı", "Sample reruns increased", "The need for reruns decreased"),
      m("Sonuç bekleme süresi uzadı", "Sonuçlar zamanında verildi", "Result waiting times increased", "Results were delivered on time"),
    ],
    explanation: l("Kalibrasyon kararındaki gecikme önce ölçüm kalitesini, sonra hizmet süresini etkiledi.", "The delayed calibration decision affected measurement quality first and service time afterward."),
  },
  {
    id: "G06", stage: 1, initiatorIndex: 1,
    title: l("Satışın Verdiği Söz", "The Promise Made by Sales"),
    context: l("Satış–üretim–sevkiyat", "Sales–production–shipping"),
    months: [
      m("Ürüne ilgi yükselmeye başladı", "Ürüne ilgi yükselmeye başladı", "Interest in the product began to rise", "Interest in the product began to rise"),
      m("Satış, kapasiteyi kontrol etmeden sipariş aldı", "Satış, kapasiteye göre sipariş aldı", "Sales accepted orders without checking capacity", "Sales accepted orders according to capacity"),
      m("Üretimde iş yığılması oluştu", "Üretim yükü dengelendi", "Work piled up in production", "The production load was balanced"),
      m("Paketleme yetişemedi", "Paketleme yetişti", "Packaging could not keep up", "Packaging kept up"),
      m("Sevkiyatlar gecikti", "Sevkiyatlar zamanında çıktı", "Shipments were delayed", "Shipments left on time"),
      m("Teslimat şikâyetleri arttı", "Teslimat şikâyetleri azaldı", "Delivery complaints increased", "Delivery complaints decreased"),
    ],
    explanation: l("Bir birimin verdiği söz, diğer birimin kapasitesiyle ilişkilendirilmediğinde sorun tüm akışa yayıldı.", "When one unit's promise was not linked to another unit's capacity, the problem spread across the entire flow."),
  },
  {
    id: "G07", stage: 1, initiatorIndex: 0,
    title: l("Birbirinden Habersiz Depolar", "Warehouses Out of Sync"),
    context: l("Depo–satış–müşteri", "Warehouse–sales–customer"),
    months: [
      m("Depo ve satış ortak stok kaydını bıraktı", "Depo ve satış ortak stok kaydını sürdürdü", "Warehouse and sales stopped sharing inventory records", "Warehouse and sales continued sharing inventory records"),
      m("Stok bilgilerinde farklılıklar oluştu", "Stok bilgileri tutarlı kaldı", "Inventory records became inconsistent", "Inventory records remained consistent"),
      m("Satışta olmayan ürünler satıldı", "Yalnızca mevcut ürünler satıldı", "Unavailable products were sold", "Only available products were sold"),
      m("Sipariş düzeltmeleri arttı", "Sipariş düzeltmeleri azaldı", "Order corrections increased", "Order corrections decreased"),
      m("Teslimat iptalleri çoğaldı", "Teslimat iptalleri azaldı", "Delivery cancellations increased", "Delivery cancellations decreased"),
      m("Müşteri güveni zayıfladı", "Müşteri güveni güçlendi", "Customer trust weakened", "Customer trust strengthened"),
    ],
    explanation: l("Bölümler arasındaki bilgi bağlantısının kopması gecikerek müşteriye yansıdı.", "The broken information link between departments reached the customer after a delay."),
  },
  {
    id: "G08", stage: 1, initiatorIndex: 2,
    title: l("Tedarikten Üretime", "From Procurement to Production"),
    context: l("Satın alma–üretim–kalite", "Procurement–production–quality"),
    months: [
      m("Yeni ürün ailesi planlandı", "Yeni ürün ailesi planlandı", "A new product family was planned", "A new product family was planned"),
      m("Tedarikçi sayısı artırıldı", "Tedarikçi sayısı artırıldı", "The number of suppliers increased", "The number of suppliers increased"),
      m("Giriş kalite kontrolü kaldırıldı", "Giriş kalite kontrolü uygulandı", "Incoming quality control was removed", "Incoming quality control was applied"),
      m("Uygun olmayan malzeme hatta girdi", "Uygun malzeme üretime alındı", "Unsuitable material entered the line", "Suitable material entered production"),
      m("Üretimde yeniden işleme arttı", "Yeniden işleme ihtiyacı azaldı", "Rework increased in production", "The need for rework decreased"),
      m("Sipariş teslimleri gecikti", "Siparişler zamanında tamamlandı", "Order deliveries were delayed", "Orders were completed on time"),
    ],
    explanation: l("Tedarik bölümündeki kontrol kararı üretimdeki iş yükünü, ardından teslimatı etkiledi.", "The control decision in procurement affected production workload and then delivery."),
  },
  {
    id: "G09", stage: 1, initiatorIndex: 1,
    title: l("Kayıp Müşteri Kaydı", "The Missing Customer Record"),
    context: l("Çağrı merkezi–teknik ekip", "Call center–technical team"),
    months: [
      m("Destek ekibine yeni personel katıldı", "Destek ekibine yeni personel katıldı", "New staff joined the support team", "New staff joined the support team"),
      m("Ortak talep takip sistemi kapatıldı", "Ortak talep takip sistemi korundu", "The shared request-tracking system was closed", "The shared request-tracking system was preserved"),
      m("Talepler iki kez açılmaya başladı", "Tekrarlı kayıtlar önlendi", "Requests began to be opened twice", "Duplicate records were prevented"),
      m("Teknik ekip aynı işi tekrarladı", "Teknik ekip işleri tek seferde çözdü", "The technical team repeated the same work", "The technical team resolved work in one pass"),
      m("Bekleyen talepler arttı", "Bekleyen talepler azaldı", "Pending requests increased", "Pending requests decreased"),
      m("Müşteri bekleme süresi uzadı", "Müşteri bekleme süresi kısaldı", "Customer waiting time increased", "Customer waiting time decreased"),
    ],
    explanation: l("Birimler arası veri akışı bozulduğu için tekrar işleme ve gecikme oluştu.", "Broken data flow between units created repeated work and delay."),
  },
  {
    id: "G10", stage: 1, initiatorIndex: 0,
    title: l("Yanlış Nöbet Planı", "The Wrong Shift Plan"),
    context: l("Hastane · Randevu süreçleri", "Hospital · Appointment processes"),
    months: [
      m("Nöbet planı talep verisi olmadan hazırlandı", "Nöbet planı talep verisine göre hazırlandı", "The shift plan was prepared without demand data", "The shift plan was prepared using demand data"),
      m("Yoğun saatlerde personel yetersiz kaldı", "Yoğun saatlere yeterli personel ayrıldı", "Staffing was insufficient during peak hours", "Enough staff were assigned to peak hours"),
      m("Muayene kuyruğu uzadı", "Muayene kuyruğu kısaldı", "The examination queue grew", "The examination queue shortened"),
      m("Randevular ertelendi", "Randevular zamanında gerçekleşti", "Appointments were postponed", "Appointments took place on time"),
      m("Yeni haftalara sarkan iş yükü büyüdü", "Birikmiş iş yükü azaldı", "Work carried into later weeks increased", "The backlog decreased"),
      m("Randevu şikâyetleri arttı", "Randevu şikâyetleri azaldı", "Appointment complaints increased", "Appointment complaints decreased"),
    ],
    explanation: l("Planlama ile gerçek talep eşleşmeyince gecikme birimler ve aylar boyunca birikti.", "When planning did not match actual demand, delay accumulated across units and months."),
  },
  {
    id: "G11", stage: 2, initiatorIndex: 0,
    title: l("Hız Baskısı Döngüsü", "The Speed-Pressure Loop"),
    context: l("Fabrika · Üretim baskısı", "Factory · Production pressure"),
    months: [
      m("Üretim hedefi kapasitenin üstüne çıkarıldı", "Üretim hedefi kapasiteye göre ayarlandı", "The production target was raised above capacity", "The production target was aligned with capacity"),
      m("Fazla mesai süreleri uzadı", "Mesai yükü dengelendi", "Overtime hours increased", "The workload was balanced"),
      m("Çalışan yorgunluğu arttı", "Çalışan yorgunluğu azaldı", "Employee fatigue increased", "Employee fatigue decreased"),
      m("Ürün hataları arttı", "Ürün hataları azaldı", "Product defects increased", "Product defects decreased"),
      m("Yeniden işleme yükü büyüdü", "Yeniden işleme yükü azaldı", "The rework load grew", "The rework load decreased"),
      m("Geciken siparişler daha çok hız baskısı yarattı", "Teslimatlar dengelendi; hız baskısı azaldı", "Delayed orders created even more speed pressure", "Deliveries stabilized and speed pressure decreased"),
    ],
    explanation: l("Yüksek hedef → yorgunluk → hata → yeniden işleme → yeni hız baskısı döngüsü oluşturdu.", "A high target → fatigue → defects → rework → renewed speed pressure formed a reinforcing loop."),
    feedbackLoop: l("Gecikmelerin yarattığı yeni hız baskısı, ocaktaki aşırı hedef politikasını güçlendirdi.", "New speed pressure from delays reinforced January's excessive target policy."),
  },
  {
    id: "G12", stage: 2, initiatorIndex: 1,
    title: l("Çağrı Kapatma Yarışı", "The Call-Closing Race"),
    context: l("Müşteri hizmetleri · Teşvik", "Customer service · Incentives"),
    months: [
      m("Çağrı sayısı olağan düzeydeydi", "Çağrı sayısı olağan düzeydeydi", "Call volume was at a normal level", "Call volume was at a normal level"),
      m("Primler yalnızca kısa görüşmeye bağlandı", "Primler kalıcı çözüme de bağlandı", "Bonuses were tied only to short calls", "Bonuses were also tied to lasting resolutions"),
      m("Talepler eksik çözülerek kapatıldı", "Talepler ilk görüşmede çözüldü", "Requests were closed without full resolution", "Requests were resolved on the first call"),
      m("Müşteriler yeniden aramaya başladı", "Tekrar aramalar azaldı", "Customers began calling again", "Repeat calls decreased"),
      m("Çağrı yoğunluğu yükseldi", "Çağrı yoğunluğu dengelendi", "Call volume increased", "Call volume stabilized"),
      m("Bekleme artınca görüşmeler daha da kısaltıldı", "Bekleme düştü; görüşme kalitesi korundu", "Calls were shortened further as waits increased", "Waits decreased and call quality was preserved"),
    ],
    explanation: l("Kısa görüşme primi, yeniden aramayı artırarak sistemi kendi kendine sıkıştırdı.", "The short-call bonus increased repeat calls and caused the system to constrain itself."),
    feedbackLoop: l("Artan çağrı yoğunluğu çalışanları daha hızlı kapatmaya itti ve hatalı davranışı pekiştirdi.", "Growing call volume pushed employees to close calls faster and reinforced the faulty behavior."),
  },
  {
    id: "G13", stage: 2, initiatorIndex: 0,
    title: l("Fazla Mesai Sarmalı", "The Overtime Spiral"),
    context: l("Yazılım ekibi · Teslim baskısı", "Software team · Delivery pressure"),
    months: [
      m("Ekip sürekli fazla mesaiye geçirildi", "Ekip sürdürülebilir çalışma planına geçti", "The team was put on continuous overtime", "The team adopted a sustainable work plan"),
      m("Dinlenme süresi azaldı", "Dinlenme ve odaklanma süresi korundu", "Rest time decreased", "Rest and focus time were preserved"),
      m("Kod hataları çoğaldı", "Kod hataları azaldı", "Code defects increased", "Code defects decreased"),
      m("Düzeltme işleri birikti", "Düzeltme işleri azaldı", "Fixing work piled up", "Fixing work decreased"),
      m("Yeni işler gecikmeye başladı", "Yeni işler zamanında ilerledi", "New work began to be delayed", "New work progressed on time"),
      m("Gecikmeleri kapatmak için mesai yeniden artırıldı", "Ek mesai ihtiyacı azaldı", "Overtime was increased again to catch up", "The need for overtime decreased"),
    ],
    explanation: l("Gecikme fazla mesaiyi, fazla mesai hataları, hatalar da yeni gecikmeleri artırdı.", "Delay increased overtime, overtime increased defects, and defects created further delay."),
    feedbackLoop: l("Hazirandaki fazla mesai kararı başlangıçtaki aynı çalışma düzenini besledi.", "June's overtime decision fed the same work pattern that began the chain."),
  },
  {
    id: "G14", stage: 2, initiatorIndex: 1,
    title: l("İndirim Alışkanlığı", "The Discount Habit"),
    context: l("Perakende · Fiyat politikası", "Retail · Pricing policy"),
    months: [
      m("Mağazaya ziyaretçi sayısı sabitti", "Mağazaya ziyaretçi sayısı sabitti", "Store visitor numbers were stable", "Store visitor numbers were stable"),
      m("Sürekli yüksek indirim uygulandı", "İndirimler hedefli ve sınırlı uygulandı", "A continuous high discount was applied", "Discounts were targeted and limited"),
      m("Müşteriler normal fiyatı beklemez oldu", "Müşteriler ürün değerine odaklandı", "Customers stopped accepting the regular price", "Customers focused on product value"),
      m("İndirimsiz satışlar düştü", "İndirimsiz satışlar korundu", "Full-price sales fell", "Full-price sales were preserved"),
      m("Kârlılık baskısı büyüdü", "Kârlılık dengelendi", "Profitability pressure grew", "Profitability stabilized"),
      m("Satış açığını kapatmak için indirim artırıldı", "Sürekli indirim ihtiyacı azaldı", "Discounts were increased to close the sales gap", "The need for continuous discounts decreased"),
    ],
    explanation: l("Sürekli indirim, indirim beklentisini güçlendirdi ve şirketi daha fazla indirime bağımlı kıldı.", "Continuous discounts strengthened discount expectations and made the company more dependent on them."),
    feedbackLoop: l("Düşen normal fiyatlı satışlar yeni indirim kararı doğurarak döngüyü pekiştirdi.", "Falling full-price sales triggered new discounts and reinforced the loop."),
  },
  {
    id: "G15", stage: 2, initiatorIndex: 2,
    title: l("Acele Sipariş Kısır Döngüsü", "The Rush-Order Vicious Cycle"),
    context: l("Depo–tedarikçi · Stok", "Warehouse–supplier · Inventory"),
    months: [
      m("Sezonluk talep artışı beklendi", "Sezonluk talep artışı beklendi", "A seasonal demand increase was expected", "A seasonal demand increase was expected"),
      m("Depoda mevcut stok sayıldı", "Depoda mevcut stok sayıldı", "Current warehouse stock was counted", "Current warehouse stock was counted"),
      m("Stok uyarı sistemi devre dışı bırakıldı", "Stok uyarı sistemi etkin tutuldu", "The inventory alert system was disabled", "The inventory alert system remained active"),
      m("Eksikler son anda fark edildi", "Eksikler önceden görüldü", "Shortages were noticed at the last moment", "Shortages were identified in advance"),
      m("Acil siparişler ve maliyetler arttı", "Planlı siparişler ve maliyetler dengelendi", "Emergency orders and costs increased", "Planned orders and costs stabilized"),
      m("Acil harcamalar yüzünden planlı alımlar kısıldı", "Planlı alım bütçesi korundu", "Planned purchases were cut because of emergency spending", "The planned purchasing budget was preserved"),
    ],
    explanation: l("Geç fark edilen eksikler, acil harcamayı büyütüp planlı alımı daha da zorlaştırdı.", "Shortages noticed too late increased emergency spending and made planned purchasing even harder."),
    feedbackLoop: l("Planlı alım bütçesinin azalması sonraki dönemde yeniden stok açığı riskini artırdı.", "The reduced planned-purchase budget increased the risk of another shortage in the next period."),
  },
  {
    id: "G16", stage: 3, initiatorIndex: 0,
    title: l("Ucuz Bakım, Pahalı Arıza", "Cheap Maintenance, Costly Failure"),
    context: l("Fabrika · Maliyet politikası", "Factory · Cost policy"),
    months: [
      m("Bakım bütçesi kesildi", "Bakım bütçesi korundu", "The maintenance budget was cut", "The maintenance budget was preserved"),
      m("Aylık giderler kısa süre düştü", "Bakım giderleri planlı düzeyde kaldı", "Monthly expenses fell briefly", "Maintenance expenses remained at the planned level"),
      m("Önlenebilir arızalar birikmeye başladı", "Olası arızalar erken giderildi", "Preventable failures began to accumulate", "Potential failures were addressed early"),
      m("Acil onarım sayısı yükseldi", "Acil onarım ihtiyacı azaldı", "Emergency repairs increased", "The need for emergency repair decreased"),
      m("Üretim duruşları arttı", "Üretim duruşları azaldı", "Production stoppages increased", "Production stoppages decreased"),
      m("Toplam işletme maliyeti yükseldi", "Toplam maliyet kontrol altında kaldı", "Total operating cost rose", "Total cost remained under control"),
    ],
    explanation: l("Başlangıçtaki maliyet avantajı daha büyük, gecikmiş onarım maliyeti yarattı.", "The initial cost advantage created a larger delayed repair cost."),
  },
  {
    id: "G17", stage: 3, initiatorIndex: 1,
    title: l("Kampanyanın Görünmeyen Bedeli", "The Campaign's Hidden Cost"),
    context: l("E-ticaret · Kampanya yönetimi", "E-commerce · Campaign management"),
    months: [
      m("Yeni sezon ürünleri satışa çıktı", "Yeni sezon ürünleri satışa çıktı", "New-season products went on sale", "New-season products went on sale"),
      m("Kapasitesiz büyük kampanya başlatıldı", "Kampanya stok ve sevkiyat kapasitesine göre açıldı", "A major campaign was launched without capacity", "The campaign was aligned with stock and shipping capacity"),
      m("Siparişler kısa sürede arttı", "Siparişler karşılanabilir düzeyde arttı", "Orders increased rapidly", "Orders increased to a manageable level"),
      m("Paketleme kuyruğu taşmaya başladı", "Paketleme kuyruğu dengelendi", "The packaging queue began to overflow", "The packaging queue stabilized"),
      m("Gecikmeler ve iadeler arttı", "Gecikmeler ve iadeler azaldı", "Delays and returns increased", "Delays and returns decreased"),
      m("Yeni müşteri memnuniyeti düştü", "Yeni müşteri memnuniyeti yükseldi", "New-customer satisfaction fell", "New-customer satisfaction rose"),
    ],
    explanation: l("Hızlı satış artışı iyi görünse de taşıma kapasitesinin aşılması sonraki aylarda olumsuz tepki üretti.", "Although rapid sales growth looked positive, exceeding handling capacity produced adverse effects in later months."),
  },
  {
    id: "G18", stage: 3, initiatorIndex: 2,
    title: l("Kontrolü Azalt, İşi Çoğalt", "Reduce Control, Multiply the Work"),
    context: l("Üretim · Kalite denetimi", "Production · Quality inspection"),
    months: [
      m("Fabrika sipariş hedefini tutturdu", "Fabrika sipariş hedefini tutturdu", "The factory met its order target", "The factory met its order target"),
      m("Ürün çeşidi artırıldı", "Ürün çeşidi artırıldı", "The product range expanded", "The product range expanded"),
      m("Son kalite kontrol adımı kaldırıldı", "Son kalite kontrol adımı korundu", "The final quality-control step was removed", "The final quality-control step was preserved"),
      m("Ürünler ilk etapta daha hızlı sevk edildi", "Ürünler güvenilir biçimde sevk edildi", "Products were initially shipped faster", "Products were shipped reliably"),
      m("Hatalı ürün iadeleri arttı", "Hatalı ürün iadeleri azaldı", "Defective-product returns increased", "Defective-product returns decreased"),
      m("Yeniden üretim maliyeti yükseldi", "Yeniden üretim maliyeti azaldı", "Reproduction cost rose", "Reproduction cost decreased"),
    ],
    explanation: l("Kısa vadede hız kazandıran karar uzun vadede yeniden üretim iş yükü oluşturdu.", "The decision that gained speed in the short term created reproduction workload in the long term."),
  },
  {
    id: "G19", stage: 3, initiatorIndex: 1,
    title: l("Hızlı İşe Alımın Yan Etkisi", "The Side Effect of Rapid Hiring"),
    context: l("İnsan kaynakları · Büyüme", "Human resources · Growth"),
    months: [
      m("Şirket yeni bir bölgeye açıldı", "Şirket yeni bir bölgeye açıldı", "The company expanded into a new region", "The company expanded into a new region"),
      m("Uyum programı tamamen kaldırıldı", "Uyum programı planlı biçimde uygulandı", "The orientation program was removed entirely", "The orientation program was applied as planned"),
      m("Yeni personel hemen sahaya çıktı", "Yeni personel eğitimle sahaya çıktı", "New staff began field work immediately", "New staff began field work after training"),
      m("İş akışında tekrar hataları arttı", "İş akışındaki hatalar azaldı", "Repeated workflow errors increased", "Workflow errors decreased"),
      m("Deneyimli çalışanların düzeltme yükü arttı", "Deneyimli çalışanların düzeltme yükü azaldı", "The correction load on experienced staff increased", "The correction load on experienced staff decreased"),
      m("Toplam ekip verimliliği düştü", "Toplam ekip verimliliği yükseldi", "Overall team productivity fell", "Overall team productivity rose"),
    ],
    explanation: l("İlk ay kazanılan hız, tekrar çalışma nedeniyle birkaç ay sonra verim kaybına dönüştü.", "The speed gained in the first month became a productivity loss after several months of repeated work."),
  },
  {
    id: "G20", stage: 3, initiatorIndex: 0,
    title: l("Yazılımda Hızlı Yayın", "A Rushed Software Release"),
    context: l("Yazılım · Sürüm politikası", "Software · Release policy"),
    months: [
      m("Sürüm öncesi test aşaması kısaltıldı", "Sürüm öncesi test aşaması korundu", "Pre-release testing was shortened", "Pre-release testing was preserved"),
      m("Yeni özellikler erken yayımlandı", "Yeni özellikler kontrollü yayımlandı", "New features were released early", "New features were released in a controlled way"),
      m("Gizli hatalar kullanıcıya ulaştı", "Hatalar yayına çıkmadan yakalandı", "Hidden defects reached users", "Defects were caught before release"),
      m("Destek talepleri birikmeye başladı", "Destek talepleri azaldı", "Support requests began to pile up", "Support requests decreased"),
      m("Acil düzeltmeler yeni çalışmayı yavaşlattı", "Yeni geliştirmeler planlı ilerledi", "Emergency fixes slowed new work", "New development progressed as planned"),
      m("Kullanıcı güveni azaldı", "Kullanıcı güveni yükseldi", "User trust decreased", "User trust increased"),
    ],
    explanation: l("Hızlı yayın ilk anda kazanım sağladı; sonraki aylarda kalite ve destek maliyeti oluşturdu.", "The rushed release delivered an immediate gain but created quality and support costs in later months."),
  },
  {
    id: "G21", stage: 4, initiatorIndex: 0,
    title: l("Yanlış Performans Primi", "The Wrong Performance Bonus"),
    context: l("Üretim · Teşvik tasarımı", "Production · Incentive design"),
    months: [
      m("Prim yalnızca üretim adedine bağlandı", "Prim üretim ve kaliteye birlikte bağlandı", "The bonus was tied only to production volume", "The bonus was tied to both production and quality"),
      m("Çalışanlar hızı kaliteye tercih etti", "Hız ve kalite birlikte gözetildi", "Employees favored speed over quality", "Speed and quality were considered together"),
      m("Kontrol atlama davranışı yaygınlaştı", "Kontrol adımları korundu", "Skipping checks became widespread", "Control steps were preserved"),
      m("Gizli hatalı ürün sayısı yükseldi", "Hatalı ürün sayısı azaldı", "Hidden defective products increased", "Defective products decreased"),
      m("İade ve yeniden işleme yükü arttı", "İade ve yeniden işleme azaldı", "Returns and rework increased", "Returns and rework decreased"),
      m("Şirketin net verimliliği düştü", "Şirketin net verimliliği yükseldi", "The company's net productivity fell", "The company's net productivity rose"),
    ],
    explanation: l("Tekil çalışanın davranışını değiştiren şey prim kuralıydı; yapısal kaldıraç ödül sisteminde yer aldı.", "The bonus rule changed individual behavior; the structural leverage point was in the reward system."),
  },
  {
    id: "G22", stage: 4, initiatorIndex: 1,
    title: l("Kopuk Planlama Sistemi", "The Disconnected Planning System"),
    context: l("Satış–üretim–depo · Entegrasyon", "Sales–production–warehouse · Integration"),
    months: [
      m("Şirket farklı satış kanallarına açıldı", "Şirket farklı satış kanallarına açıldı", "The company expanded into different sales channels", "The company expanded into different sales channels"),
      m("Sipariş ve kapasite sistemleri ayrıldı", "Sipariş ve kapasite sistemleri bağlandı", "Order and capacity systems were separated", "Order and capacity systems were connected"),
      m("Aşırı sipariş taahhütleri verildi", "Gerçekçi sipariş taahhütleri verildi", "Excessive order commitments were made", "Realistic order commitments were made"),
      m("Üretimde öncelik çatışması oluştu", "Üretim öncelikleri tutarlı kaldı", "Production priorities conflicted", "Production priorities remained consistent"),
      m("Teslim programı sık sık değişti", "Teslim programı kararlı ilerledi", "The delivery schedule changed frequently", "The delivery schedule progressed steadily"),
      m("Müşteri teslimat güveni azaldı", "Müşteri teslimat güveni yükseldi", "Customer confidence in delivery fell", "Customer confidence in delivery rose"),
    ],
    explanation: l("Sorun yalnızca yoğun talep değil, kapasite ve sipariş kararları arasındaki kopuk yapıydı.", "The problem was not just high demand but the disconnected structure between capacity and order decisions."),
  },
  {
    id: "G23", stage: 4, initiatorIndex: 2,
    title: l("Vardiya Devir Boşluğu", "The Shift-Handover Gap"),
    context: l("Hastane laboratuvarı · Bilgi akışı", "Hospital laboratory · Information flow"),
    months: [
      m("Yeni laboratuvar bölümü açıldı", "Yeni laboratuvar bölümü açıldı", "A new laboratory unit opened", "A new laboratory unit opened"),
      m("İş yükü farklı vardiyalara dağıldı", "İş yükü farklı vardiyalara dağıldı", "Work was distributed across shifts", "Work was distributed across shifts"),
      m("Standart vardiya devir kaydı kaldırıldı", "Standart vardiya devir kaydı uygulandı", "The standard shift-handover record was removed", "The standard shift-handover record was used"),
      m("Eksik numune bilgileri oluştu", "Numune bilgileri eksiksiz aktarıldı", "Sample information became incomplete", "Sample information was transferred completely"),
      m("Tekrar test istekleri arttı", "Tekrar test istekleri azaldı", "Retest requests increased", "Retest requests decreased"),
      m("Sonuçların teslim süresi uzadı", "Sonuçlar zamanında iletildi", "Result delivery time increased", "Results were delivered on time"),
    ],
    explanation: l("Bireysel dikkatsizlik değil, vardiyalar arası bilgi aktarım kuralının eksikliği sonucu belirledi.", "The missing information-transfer rule between shifts, not individual carelessness, determined the outcome."),
  },
  {
    id: "G24", stage: 4, initiatorIndex: 0,
    title: l("Görünmeyen Arızalar", "Invisible Failures"),
    context: l("Fabrika · Bilgi ve karar sistemi", "Factory · Information and decision system"),
    months: [
      m("Arıza bildirimleri bakım ekibine kapatıldı", "Arıza bildirimleri bakım ekibine açıldı", "Failure reports were hidden from the maintenance team", "Failure reports were opened to the maintenance team"),
      m("Küçük uyarılar kayıt dışı kaldı", "Küçük uyarılar zamanında kaydedildi", "Minor warnings went unrecorded", "Minor warnings were recorded on time"),
      m("Tekrarlayan sorunlar görülmedi", "Tekrarlayan sorunlar erken belirlendi", "Recurring problems went unseen", "Recurring problems were identified early"),
      m("Planlı onarım yapılamadı", "Planlı onarım zamanında yapıldı", "Planned repair could not be performed", "Planned repair was performed on time"),
      m("Beklenmedik üretim kesintileri arttı", "Beklenmedik kesintiler azaldı", "Unexpected production interruptions increased", "Unexpected interruptions decreased"),
      m("Sipariş gecikmeleri arttı", "Sipariş gecikmeleri azaldı", "Order delays increased", "Order delays decreased"),
    ],
    explanation: l("Makineyi tek tek düzeltmek yerine arıza bilgi akışını açmak kalıcı iyileşmenin kaldıraç noktası oldu.", "Opening the failure-information flow, rather than fixing machines one by one, became the leverage point for lasting improvement."),
  },
  {
    id: "G25", stage: 4, initiatorIndex: 1,
    title: l("Teslimatın Gizli Kuralı", "The Hidden Rule of Delivery"),
    context: l("Lojistik · Performans hedefi", "Logistics · Performance target"),
    months: [
      m("Dağıtım bölgesi büyüdü", "Dağıtım bölgesi büyüdü", "The distribution region expanded", "The distribution region expanded"),
      m("Sürücü hedefi yalnızca teslimat adedi oldu", "Sürücü hedefi doğru ve zamanında teslimatı kapsadı", "The driver target covered only delivery count", "The driver target covered accurate and timely delivery"),
      m("Adres doğrulama adımları atlandı", "Adres doğrulama adımları korundu", "Address-verification steps were skipped", "Address-verification steps were preserved"),
      m("Yanlış adrese gönderiler arttı", "Yanlış adrese gönderiler azaldı", "Shipments to wrong addresses increased", "Shipments to wrong addresses decreased"),
      m("Tekrar teslimat yükü büyüdü", "Tekrar teslimat yükü azaldı", "The redelivery load grew", "The redelivery load decreased"),
      m("Toplam teslim süresi uzadı", "Toplam teslim süresi kısaldı", "Total delivery time increased", "Total delivery time decreased"),
    ],
    explanation: l("Sürücüleri suçlamak yerine yanlış teşvik edilen davranışı üreten performans kuralı değiştirildi.", "Instead of blaming drivers, the performance rule producing the wrongly incentivized behavior was changed."),
  },
] as const;

const CASE_BY_ID = new Map(DELAY_TRAIL_CASES.map((item) => [item.id, item]));

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

export function buildDelayTrailRound(seedKey: string): DelayTrailCase[] {
  const random = seededRandom(hashSeed(`week-5-delay-trail:${seedKey}`));
  return Array.from({ length: DELAY_TRAIL_STAGE_COUNT }, (_, stage) => {
    const pool = DELAY_TRAIL_CASES.filter((item) => item.stage === stage);
    return pool[Math.floor(random() * pool.length)]!;
  });
}

export function delayTrailCaseById(caseId: string) {
  return CASE_BY_ID.get(caseId);
}

export function pointsForDelayTrailRecord(record: DelayTrailRecord, expectedStage?: number) {
  const scenario = CASE_BY_ID.get(record.caseId);
  if (!scenario || (expectedStage !== undefined && scenario.stage !== expectedStage) || record.revealedThrough < 5) return 0;
  if (record.resolution === "first" && record.selections.length === 1 && record.selections[0] === scenario.initiatorIndex) return 20;
  if (record.resolution === "second" && record.selections.length === 2 && record.selections[0] !== scenario.initiatorIndex && record.selections[1] === scenario.initiatorIndex) return 10;
  return 0;
}

export function validatedDelayTrailScore(selectedCaseIds: readonly string[], records: readonly DelayTrailRecord[]) {
  if (selectedCaseIds.length !== DELAY_TRAIL_STAGE_COUNT) return 0;
  const selected = selectedCaseIds.map((id) => CASE_BY_ID.get(id));
  if (selected.some((item, stage) => !item || item.stage !== stage)) return 0;
  return Math.min(DELAY_TRAIL_MAX_SCORE, records.reduce((score, record, stage) => {
    if (stage >= DELAY_TRAIL_STAGE_COUNT || record.caseId !== selectedCaseIds[stage]) return score;
    return score + pointsForDelayTrailRecord(record, stage);
  }, 0));
}
