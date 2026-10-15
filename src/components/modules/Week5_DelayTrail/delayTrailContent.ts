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
    context: l("Üretim · Makine bakımı", "Production · Machine maintenance"),
    months: [
      m("Planlı bakım aralığı uzatıldı", "Planlı bakım takvimi korundu", "The scheduled maintenance interval was extended", "The scheduled maintenance plan was preserved"),
      m("Küçük aşınmalar birikmeye başladı", "Aşınmalar bakımda giderildi", "Minor wear began to accumulate", "Wear was addressed during maintenance"),
      m("Makine titreşimi yükseldi", "Makine kararlı çalıştı", "Machine vibration increased", "The machine ran steadily"),
      m("Plansız duruşlar görüldü", "Plansız duruşlar azaldı", "Unplanned stoppages occurred", "Unplanned stoppages decreased"),
      m("Üretim siparişleri gecikti", "Siparişler zamanında hazırlandı", "Production orders were delayed", "Orders were prepared on time"),
      m("Teslimat şikâyetleri arttı", "Teslimat şikâyetleri azaldı", "Delivery complaints increased", "Delivery complaints decreased"),
    ],
    explanation: l("Bakımda yapılan tasarruf hemen sorun yaratmadı; biriken aşınma birkaç ay sonra duruşa ve teslimat şikâyetine dönüştü.", "The maintenance saving did not cause an immediate problem; accumulated wear turned into stoppages and delivery complaints several months later."),
  },
  {
    id: "G02", stage: 0, initiatorIndex: 1,
    title: l("Yeni Ekip, Eksik Eğitim", "New Team, Incomplete Training"),
    context: l("Üretim · İnsan kaynağı", "Production · Human resources"),
    months: [
      m("Üretim hattına yeni ekipman kuruldu", "Üretim hattına yeni ekipman kuruldu", "New equipment was installed on the production line", "New equipment was installed on the production line"),
      m("Yeni çalışanların eğitimi kısaltıldı", "Yeni çalışanların eğitimi tamamlandı", "Training for new employees was shortened", "Training for new employees was completed"),
      m("Uygulama hataları sıklaştı", "Uygulama hataları azaldı", "Execution errors became more frequent", "Execution errors decreased"),
      m("Hatalı ürün sayısı yükseldi", "Ürün kalitesi iyileşti", "The number of defective products rose", "Product quality improved"),
      m("İade talepleri çoğaldı", "İade talepleri azaldı", "Return requests increased", "Return requests decreased"),
      m("Müşteri şikâyetleri arttı", "Müşteri şikâyetleri azaldı", "Customer complaints increased", "Customer complaints decreased"),
    ],
    explanation: l("Eksik eğitim anında değil, üretim ve teslimat aşamalarından geçerek müşteri deneyimini etkiledi.", "Incomplete training affected the customer experience only after passing through production and delivery stages."),
  },
  {
    id: "G03", stage: 0, initiatorIndex: 2,
    title: l("Stok Eşiği", "The Stock Threshold"),
    context: l("Perakende · Stok yönetimi", "Retail · Inventory management"),
    months: [
      m("Market ürün çeşitliliğini artırdı", "Market ürün çeşitliliğini artırdı", "The store expanded its product range", "The store expanded its product range"),
      m("Satış verileri düzenli incelendi", "Satış verileri düzenli incelendi", "Sales data was reviewed regularly", "Sales data was reviewed regularly"),
      m("Yeniden sipariş eşiği gereğinden fazla düşürüldü", "Sipariş eşiği talebe uygun tutuldu", "The reorder threshold was lowered too far", "The reorder threshold was kept in line with demand"),
      m("Güvenlik stoku hızla azaldı", "Güvenlik stoku yeterli kaldı", "Safety stock fell rapidly", "Safety stock remained sufficient"),
      m("Popüler ürünlerde raf boşlukları oluştu", "Popüler ürünler raflarda bulundu", "Popular products disappeared from shelves", "Popular products remained on the shelves"),
      m("Karşılanamayan müşteri talepleri arttı", "Karşılanamayan talepler azaldı", "Unmet customer demand increased", "Unmet demand decreased"),
    ],
    explanation: l("Mart ayındaki sipariş kuralı, talep sürdükçe stokların zamanla tükenmesine yol açtı.", "The ordering rule introduced in March caused inventory to run out over time as demand continued."),
  },
  {
    id: "G04", stage: 0, initiatorIndex: 3,
    title: l("Destek Masasında Bekleyiş", "Waiting at the Support Desk"),
    context: l("Hizmet · Teknik destek", "Service · Technical support"),
    months: [
      m("Teknik destek talep sayısı sabit kaldı", "Teknik destek talep sayısı sabit kaldı", "The number of technical support requests remained stable", "The number of technical support requests remained stable"),
      m("Yardım masasına yeni kategori eklendi", "Yardım masasına yeni kategori eklendi", "A new category was added to the help desk", "A new category was added to the help desk"),
      m("Destek talepleri düzenli çözüldü", "Destek talepleri düzenli çözüldü", "Support requests were resolved regularly", "Support requests were resolved regularly"),
      m("Uzman destek saatleri azaltıldı", "Uzman destek saatleri korundu", "Expert support hours were reduced", "Expert support hours were preserved"),
      m("Karmaşık talepler kuyrukta birikti", "Karmaşık talepler zamanında çözüldü", "Complex requests accumulated in the queue", "Complex requests were resolved on time"),
      m("Müşteri yanıt bekleme süresi uzadı", "Yanıt bekleme süresi kısaldı", "Customer response waiting time increased", "Response waiting time decreased"),
    ],
    explanation: l("Uzman kapasitesinin azaltılması, çözülmeyen taleplerin birikmesiyle izleyen aylarda bekleme süresini uzattı.", "Reducing expert capacity increased waiting times in the following months as unresolved requests accumulated."),
  },
  {
    id: "G05", stage: 0, initiatorIndex: 4,
    title: l("Kalibrasyon Gecikmesi", "The Calibration Delay"),
    context: l("Laboratuvar · Ölçüm güvenilirliği", "Laboratory · Measurement reliability"),
    months: [
      m("Yeni analiz cihazı kuruldu", "Yeni analiz cihazı kuruldu", "A new analysis device was installed", "A new analysis device was installed"),
      m("Cihazın kabul testleri tamamlandı", "Cihazın kabul testleri tamamlandı", "The device acceptance tests were completed", "The device acceptance tests were completed"),
      m("Rutin numuneler zamanında incelendi", "Rutin numuneler zamanında incelendi", "Routine samples were examined on time", "Routine samples were examined on time"),
      m("Aylık kalibrasyon günü planlandı", "Aylık kalibrasyon günü planlandı", "The monthly calibration day was scheduled", "The monthly calibration day was scheduled"),
      m("Planlanan kalibrasyon kontrolü ertelendi", "Kalibrasyon kontrolü zamanında yapıldı", "The scheduled calibration check was postponed", "The calibration check was completed on time"),
      m("Ölçüm sapmaları yüzünden numuneler yeniden çalışıldı", "Ölçüm sapmaları önlendi, tekrar testler azaldı", "Samples were rerun because of measurement deviations", "Measurement deviations were prevented and retesting decreased"),
    ],
    explanation: l("Mayıstaki kontrol ertelemesi birkaç hafta sonra yeniden test ihtiyacı doğurdu; önceki normal çalışma ayları hata nedeni değildi.", "Postponing the check in May created a need for retesting several weeks later; the earlier months of normal operation were not the cause."),
  },
  {
    id: "G06", stage: 1, initiatorIndex: 1,
    title: l("Satışın Verdiği Söz", "The Promise Made by Sales"),
    context: l("Satış · Üretim · Lojistik", "Sales · Production · Logistics"),
    months: [
      m("Yeni ürünün tanıtımı yapıldı", "Yeni ürünün tanıtımı yapıldı", "The new product was promoted", "The new product was promoted"),
      m("Satış kapasiteyi kontrol etmeden teslim sözü verdi", "Satış üretim kapasitesine uygun teslim sözü verdi", "Sales promised delivery without checking capacity", "Sales promised delivery in line with production capacity"),
      m("Üretimde yetişmeyen işler birikti", "Üretim yükü dengelendi", "Overdue work accumulated in production", "The production load was balanced"),
      m("Paketleme siparişlere yetişemedi", "Paketleme siparişlere yetişti", "Packaging could not keep up with orders", "Packaging kept up with orders"),
      m("Sevkiyat tarihleri ertelendi", "Sevkiyatlar zamanında çıktı", "Shipment dates were postponed", "Shipments left on time"),
      m("Teslimat şikâyetleri arttı", "Teslimat şikâyetleri azaldı", "Delivery complaints increased", "Delivery complaints decreased"),
    ],
    explanation: l("Satış bölümünün erken verdiği söz, sorunu aylar sonra lojistik bölümünde görünür hale getirdi.", "The early promise made by sales made the problem visible in logistics several months later."),
  },
  {
    id: "G07", stage: 1, initiatorIndex: 2,
    title: l("Birbirinden Habersiz Depolar", "Warehouses Out of Sync"),
    context: l("Satış · Depo bilgi akışı", "Sales · Warehouse information flow"),
    months: [
      m("Şirket iki depoyla çalışmaya başladı", "Şirket iki depoyla çalışmaya başladı", "The company began operating with two warehouses", "The company began operating with two warehouses"),
      m("Satışlar artan ürün talebini raporladı", "Satışlar artan ürün talebini raporladı", "Sales reported rising product demand", "Sales reported rising product demand"),
      m("Depo ve satışın ortak stok kaydı kapatıldı", "Ortak stok kaydı kullanılmaya devam edildi", "The shared inventory record used by warehouse and sales was disabled", "The shared inventory record remained in use"),
      m("Bölümlerin stok sayıları farklılaştı", "Bölümlerin stok sayıları tutarlı kaldı", "The departments' inventory counts diverged", "The departments' inventory counts remained consistent"),
      m("Satışı yapılan bazı ürünler depoda bulunamadı", "Satılan ürünler depoda karşılandı", "Some products that had been sold could not be found in the warehouse", "Sold products were available in the warehouse"),
      m("Sipariş iptalleri ve müşteri güvensizliği arttı", "Sipariş iptalleri azaldı, güven korundu", "Order cancellations and customer distrust increased", "Order cancellations decreased and trust was preserved"),
    ],
    explanation: l("Sorun tek başına depoda değil, iki bölümün ortak bilgi akışını kesen karardaydı.", "The problem was not in the warehouse alone, but in the decision that cut off the shared information flow between two departments."),
  },
  {
    id: "G08", stage: 1, initiatorIndex: 3,
    title: l("Tedarikten Üretime", "From Procurement to Production"),
    context: l("Satın alma · Kalite · Üretim", "Procurement · Quality · Production"),
    months: [
      m("Yeni ürün ailesi planlandı", "Yeni ürün ailesi planlandı", "A new product family was planned", "A new product family was planned"),
      m("Alternatif tedarikçiler araştırıldı", "Alternatif tedarikçiler araştırıldı", "Alternative suppliers were researched", "Alternative suppliers were researched"),
      m("Yeni tedarikçiyle ilk sevkiyat planlandı", "Yeni tedarikçiyle ilk sevkiyat planlandı", "The first shipment with the new supplier was planned", "The first shipment with the new supplier was planned"),
      m("Giriş kalite kontrolü kaldırıldı", "Giriş kalite kontrolü uygulandı", "Incoming quality control was removed", "Incoming quality control was applied"),
      m("Uygun olmayan malzeme üretim hattına girdi", "Uygun malzeme üretime alındı", "Unsuitable material entered the production line", "Suitable material entered production"),
      m("Yeniden işleme ve sipariş gecikmeleri arttı", "Yeniden işleme azaldı, teslimler hızlandı", "Rework and order delays increased", "Rework decreased and deliveries accelerated"),
    ],
    explanation: l("Satın almadaki kontrol eksikliği, sonraki ay üretim hatası ve teslimat gecikmesi olarak görüldü.", "The missing procurement control appeared the following month as production errors and delivery delays."),
  },
  {
    id: "G09", stage: 1, initiatorIndex: 4,
    title: l("Kayıp Müşteri Kaydı", "The Missing Customer Record"),
    context: l("Destek · Teknik ekip koordinasyonu", "Support · Technical team coordination"),
    months: [
      m("Çağrı merkezi yeni hizmet türünü tanıttı", "Çağrı merkezi yeni hizmet türünü tanıttı", "The call center introduced a new service type", "The call center introduced a new service type"),
      m("Teknik destek ekibi genişletildi", "Teknik destek ekibi genişletildi", "The technical support team was expanded", "The technical support team was expanded"),
      m("Müşteri kayıtları ortak ekrandan izlendi", "Müşteri kayıtları ortak ekrandan izlendi", "Customer records were tracked on a shared screen", "Customer records were tracked on a shared screen"),
      m("Tekrarlı talepler düzenli birleştirildi", "Tekrarlı talepler düzenli birleştirildi", "Duplicate requests were merged regularly", "Duplicate requests were merged regularly"),
      m("Ortak talep takip ekranı devre dışı bırakıldı", "Ortak talep takip ekranı korundu", "The shared request-tracking screen was disabled", "The shared request-tracking screen remained available"),
      m("Aynı talepler tekrar işlendi, bekleme süresi uzadı", "Tekrarlı işler önlendi, bekleme süresi kısaldı", "The same requests were processed repeatedly and waiting time increased", "Duplicate work was prevented and waiting time decreased"),
    ],
    explanation: l("Müşteri hizmetleri ile teknik destek arasındaki ortak kayıt kesilince aynı iş birden fazla ekibe düştü.", "When the shared record between customer service and technical support was removed, the same work reached multiple teams."),
  },
  {
    id: "G10", stage: 1, initiatorIndex: 0,
    title: l("Yanlış Nöbet Planı", "The Wrong Shift Plan"),
    context: l("Hastane · Personel planlama", "Hospital · Staff planning"),
    months: [
      m("Nöbet planı hasta başvuru verisi incelenmeden hazırlandı", "Nöbet planı başvuru verisine göre hazırlandı", "The shift plan was prepared without reviewing patient admission data", "The shift plan was prepared according to admission data"),
      m("Yoğun saatlerde personel yetersiz kaldı", "Yoğun saatlere yeterli personel ayrıldı", "Staffing was insufficient during peak hours", "Enough staff were assigned to peak hours"),
      m("Muayene kuyruğu uzadı", "Muayene kuyruğu kısaldı", "The examination queue grew", "The examination queue shortened"),
      m("Bazı randevular ertelendi", "Randevular zamanında gerçekleşti", "Some appointments were postponed", "Appointments took place on time"),
      m("Ertelenen işler yeni haftalara taşındı", "Biriken işler azaldı", "Postponed work carried into later weeks", "The backlog decreased"),
      m("Randevu şikâyetleri arttı", "Randevu şikâyetleri azaldı", "Appointment complaints increased", "Appointment complaints decreased"),
    ],
    explanation: l("Yılın başındaki kapasite planı, sonraki aylardaki randevu sıkışıklığının temelini oluşturdu.", "The capacity plan made at the start of the year laid the groundwork for appointment congestion in later months."),
  },
  {
    id: "G11", stage: 2, initiatorIndex: 2,
    title: l("Hız Baskısı Döngüsü", "The Speed-Pressure Loop"),
    context: l("Üretim · Performans hedefleri", "Production · Performance targets"),
    months: [
      m("Fabrikada sezonluk talep tahmini yapıldı", "Fabrikada sezonluk talep tahmini yapıldı", "A seasonal demand forecast was prepared at the factory", "A seasonal demand forecast was prepared at the factory"),
      m("Yeni siparişler üretim planına alındı", "Yeni siparişler üretim planına alındı", "New orders were added to the production plan", "New orders were added to the production plan"),
      m("Üretim hedefi makine kapasitesinin üzerine çıkarıldı", "Üretim hedefi gerçek kapasiteye göre belirlendi", "The production target was raised above machine capacity", "The production target was set according to actual capacity"),
      m("Fazla mesai ve çalışan yorgunluğu arttı", "Çalışma yükü dengelendi", "Overtime and employee fatigue increased", "The workload was balanced"),
      m("Yorgunluk kaynaklı ürün hataları çoğaldı", "Ürün hataları azaldı", "Fatigue-related product defects increased", "Product defects decreased"),
      m("Yeniden işleme geciktirdi; yönetim daha fazla hız istedi", "Yeniden işleme azaldı; yeni hız baskısı oluşmadı", "Rework caused delays and management demanded more speed", "Rework decreased and no new speed pressure emerged"),
    ],
    explanation: l("Kapasitenin üzerindeki hedef yorgunluk ve hataları artırdı; gecikmeler de yeni hız baskısına yol açtı.", "The target above capacity increased fatigue and defects, and the delays created renewed pressure for speed."),
    feedbackLoop: l("Hız baskısı → yorgunluk → hata → yeniden işleme → gecikme → daha fazla hız baskısı.", "Speed pressure → fatigue → defects → rework → delay → more speed pressure."),
  },
  {
    id: "G12", stage: 2, initiatorIndex: 3,
    title: l("Çağrı Kapatma Yarışı", "The Call-Closing Race"),
    context: l("Çağrı merkezi · Teşvik düzeni", "Call center · Incentive system"),
    months: [
      m("Müşteri talepleri sınıflandırıldı", "Müşteri talepleri sınıflandırıldı", "Customer requests were categorized", "Customer requests were categorized"),
      m("Çağrı merkezi olağan yoğunlukta çalıştı", "Çağrı merkezi olağan yoğunlukta çalıştı", "The call center operated at normal volume", "The call center operated at normal volume"),
      m("Görüşme kalitesi ölçülmeye devam edildi", "Görüşme kalitesi ölçülmeye devam edildi", "Call quality continued to be measured", "Call quality continued to be measured"),
      m("Primler yalnızca kısa görüşme süresine bağlandı", "Primlerde kalıcı çözüm kalitesi de ödüllendirildi", "Bonuses were tied only to short call duration", "Bonuses also rewarded the quality of lasting resolutions"),
      m("Talepler eksik çözüldü, müşteriler yeniden aradı", "Talepler ilk görüşmede çözüldü, tekrar aramalar azaldı", "Requests were only partly resolved and customers called again", "Requests were resolved on the first call and repeat calls decreased"),
      m("Aramalar yığıldı; ekip görüşmeleri daha da kısalttı", "Çağrı yoğunluğu dengelendi, görüşme kalitesi korundu", "Calls piled up and the team shortened them further", "Call volume stabilized and call quality was preserved"),
    ],
    explanation: l("Kısa görüşmeyi ödüllendiren kural tekrar aramaları büyüterek aynı davranışın daha da artmasına neden oldu.", "The rule rewarding short calls increased repeat calls and caused the same behavior to intensify."),
    feedbackLoop: l("Kısa görüşme teşviki → eksik çözüm → tekrar arama → kuyruk baskısı → daha kısa görüşme.", "Short-call incentive → incomplete resolution → repeat call → queue pressure → shorter call."),
  },
  {
    id: "G13", stage: 2, initiatorIndex: 4,
    title: l("Fazla Mesai Sarmalı", "The Overtime Spiral"),
    context: l("Yazılım geliştirme · İş yükü", "Software development · Workload"),
    months: [
      m("Proje kapsamı netleştirildi", "Proje kapsamı netleştirildi", "The project scope was clarified", "The project scope was clarified"),
      m("Yazılım ekibi görev dağılımını tamamladı", "Yazılım ekibi görev dağılımını tamamladı", "The software team completed task allocation", "The software team completed task allocation"),
      m("Sürüm testleri planlandığı gibi ilerledi", "Sürüm testleri planlandığı gibi ilerledi", "Release testing progressed as planned", "Release testing progressed as planned"),
      m("Takvimde küçük bir yoğunlaşma görüldü", "Takvimde küçük bir yoğunlaşma görüldü", "A minor schedule bottleneck appeared", "A minor schedule bottleneck appeared"),
      m("Gecikmeyi kapatmak için her gün zorunlu mesai başlatıldı", "İş yükü yeniden planlandı; dinlenme süreleri korundu", "Mandatory daily overtime began to make up the delay", "The workload was replanned and rest periods were preserved"),
      m("Yorgunluk kod hatalarını artırdı; düzeltmeler için yeni mesai istendi", "Kod hataları azaldı; ek mesai ihtiyacı oluşmadı", "Fatigue increased code defects and more overtime was requested for fixes", "Code defects decreased and no additional overtime was needed"),
    ],
    explanation: l("Zorunlu fazla mesai, yalnızca haftalar içinde yeni hata ve düzeltme yükü yaratarak kendini tekrar ettirdi.", "Mandatory overtime reproduced itself within weeks by creating new defects and corrective work."),
    feedbackLoop: l("Zorunlu mesai → yorgunluk → kod hatası → düzeltme yükü → yeni zorunlu mesai.", "Mandatory overtime → fatigue → code defects → corrective workload → new mandatory overtime."),
  },
  {
    id: "G14", stage: 2, initiatorIndex: 0,
    title: l("İndirim Alışkanlığı", "The Discount Habit"),
    context: l("Perakende · Fiyatlandırma politikası", "Retail · Pricing policy"),
    months: [
      m("Sürekli yüksek indirim politikası başlatıldı", "İndirimler hedefli ve süreli planlandı", "A continuous high-discount policy was launched", "Discounts were planned to be targeted and time-limited"),
      m("Müşteriler indirimli günleri beklemeye başladı", "Müşteriler normal satış döneminde de alışveriş yaptı", "Customers began waiting for discount days", "Customers also shopped during regular sales periods"),
      m("Normal fiyatlı satışlar azaldı", "Normal fiyatlı satışlar korundu", "Full-price sales decreased", "Full-price sales were preserved"),
      m("Kârlılık baskısı büyüdü", "Kârlılık dengelendi", "Profitability pressure grew", "Profitability stabilized"),
      m("Satış açığı için daha yüksek indirim yapıldı", "Satış açığı için sürekli indirim gerekmedi", "A larger discount was offered to close the sales gap", "Continuous discounts were not needed to close the sales gap"),
      m("Satışlar indirime bağımlı hale geldi", "Satışlar indirime bağımlı olmadan sürdü", "Sales became dependent on discounts", "Sales continued without becoming dependent on discounts"),
    ],
    explanation: l("Kısa dönemlik satış artışı hedefi müşterinin beklentisini değiştirerek daha fazla indirime ihtiyaç yarattı.", "The short-term sales-growth goal changed customer expectations and created a need for even more discounts."),
    feedbackLoop: l("İndirim → normal fiyatlı satışların düşmesi → satış açığı → daha çok indirim.", "Discount → falling full-price sales → sales gap → more discounting."),
  },
  {
    id: "G15", stage: 2, initiatorIndex: 1,
    title: l("Acele Sipariş Kısır Döngüsü", "The Rush-Order Vicious Cycle"),
    context: l("Depo · Satın alma", "Warehouse · Procurement"),
    months: [
      m("Sezonluk talep artışı öngörüldü", "Sezonluk talep artışı öngörüldü", "A seasonal demand increase was forecast", "A seasonal demand increase was forecast"),
      m("Stok uyarı sistemi devre dışı bırakıldı", "Stok uyarı sistemi etkin tutuldu", "The inventory alert system was disabled", "The inventory alert system remained active"),
      m("Depodaki eksikler geç fark edildi", "Eksikler önceden fark edildi", "Warehouse shortages were noticed late", "Shortages were identified in advance"),
      m("Acil siparişler ve ek taşıma maliyetleri arttı", "Planlı siparişler zamanında verildi", "Emergency orders and extra transport costs increased", "Planned orders were placed on time"),
      m("Acil giderler planlı alım bütçesini daralttı", "Planlı alım bütçesi korundu", "Emergency expenses reduced the planned purchasing budget", "The planned purchasing budget was preserved"),
      m("Yeni stok açığı oluştu; tekrar acil alım yapıldı", "Stok sürekliliği korundu, acil alım azaldı", "A new stock shortage emerged and another emergency purchase was made", "Inventory continuity was preserved and emergency purchasing decreased"),
    ],
    explanation: l("Erken uyarının kaldırılması acil satın alma masrafını artırdı; bu masraf sonraki planlı alımı da zorlaştırdı.", "Removing the early warning increased emergency purchasing costs, which then made the next planned purchase more difficult."),
    feedbackLoop: l("Stok uyarısızlığı → geç fark etme → acil alım masrafı → planlı alımın kısılması → yeni stok açığı.", "No inventory warning → late detection → emergency purchase cost → reduced planned purchasing → new stock shortage."),
  },
  {
    id: "G16", stage: 3, initiatorIndex: 3,
    title: l("Ucuz Bakım, Pahalı Arıza", "Cheap Maintenance, Costly Failure"),
    context: l("Üretim · Bakım maliyeti", "Production · Maintenance cost"),
    months: [
      m("Tesisin yıllık bütçesi belirlendi", "Tesisin yıllık bütçesi belirlendi", "The facility's annual budget was set", "The facility's annual budget was set"),
      m("Bakım ekipmanları yenilendi", "Bakım ekipmanları yenilendi", "Maintenance equipment was renewed", "Maintenance equipment was renewed"),
      m("Üretim hedefleri korundu", "Üretim hedefleri korundu", "Production targets were maintained", "Production targets were maintained"),
      m("Kısa dönem tasarruf için bakım bütçesi kesildi", "Önleyici bakım bütçesi korundu", "The maintenance budget was cut for short-term savings", "The preventive-maintenance budget was preserved"),
      m("Aylık giderler düştü; küçük arızalar birikti", "Bakım planlı yapıldı; küçük arızalar giderildi", "Monthly expenses fell while minor failures accumulated", "Maintenance was performed as planned and minor failures were addressed"),
      m("Plansız duruşlar toplam maliyeti yükseltti", "Plansız duruşlar azaldı; toplam maliyet dengelendi", "Unplanned stoppages increased total cost", "Unplanned stoppages decreased and total cost stabilized"),
    ],
    explanation: l("Mayıstaki gider avantajı gerçeğin tamamı değildi; Haziranda bakım eksikliğinin onarım ve duruş maliyeti ortaya çıktı.", "The expense advantage in May was not the whole story; the repair and downtime costs of inadequate maintenance appeared in June."),
  },
  {
    id: "G17", stage: 3, initiatorIndex: 4,
    title: l("Kampanyanın Görünmeyen Bedeli", "The Campaign's Hidden Cost"),
    context: l("E-ticaret · Sipariş kapasitesi", "E-commerce · Order capacity"),
    months: [
      m("Yeni sezon ürünleri belirlendi", "Yeni sezon ürünleri belirlendi", "New-season products were selected", "New-season products were selected"),
      m("Ürün fotoğrafları hazırlandı", "Ürün fotoğrafları hazırlandı", "Product photos were prepared", "Product photos were prepared"),
      m("Mağazanın sipariş sistemi test edildi", "Mağazanın sipariş sistemi test edildi", "The store's ordering system was tested", "The store's ordering system was tested"),
      m("Depo ve paketleme kapasitesi ölçüldü", "Depo ve paketleme kapasitesi ölçüldü", "Warehouse and packaging capacity was measured", "Warehouse and packaging capacity was measured"),
      m("Kapasiteye bakılmadan büyük kampanya başlatıldı", "Kampanya depo ve sevkiyat kapasitesine göre sınırlandı", "A major campaign was launched without considering capacity", "The campaign was limited according to warehouse and shipping capacity"),
      m("Sipariş yığılması teslimat gecikmesi ve iptal doğurdu", "Siparişler karşılandı, iptaller azaldı", "The order backlog caused delivery delays and cancellations", "Orders were fulfilled and cancellations decreased"),
    ],
    explanation: l("Satışı artırmak için açılan kampanya, teslimat kapasitesini aşınca birkaç hafta içinde müşteri kaybına dönüştü.", "The campaign launched to increase sales turned into customer loss within weeks when it exceeded delivery capacity."),
  },
  {
    id: "G18", stage: 3, initiatorIndex: 0,
    title: l("Kontrolü Azalt, İşi Çoğalt", "Reduce Control, Multiply the Work"),
    context: l("Üretim · Kalite maliyeti", "Production · Quality cost"),
    months: [
      m("Sevkiyatı hızlandırmak için son kalite kontrol kaldırıldı", "Son kalite kontrol adımı korundu", "Final quality control was removed to accelerate shipping", "The final quality-control step was preserved"),
      m("Ürünler başlangıçta daha hızlı gönderildi", "Ürünler güvenilir biçimde gönderildi", "Products were initially shipped faster", "Products were shipped reliably"),
      m("Bazı hatalı ürünler müşterilere ulaştı", "Hatalı ürünler sevkiyat öncesinde ayrıldı", "Some defective products reached customers", "Defective products were removed before shipping"),
      m("İade talepleri arttı", "İade talepleri azaldı", "Return requests increased", "Return requests decreased"),
      m("Yeniden üretim iş yükü büyüdü", "Yeniden üretim ihtiyacı azaldı", "The reproduction workload grew", "The need for reproduction decreased"),
      m("Toplam üretim maliyeti yükseldi", "Toplam üretim maliyeti azaldı", "Total production cost increased", "Total production cost decreased"),
    ],
    explanation: l("Kontrolü atlamak sevkiyatı önce hızlandırdı, ancak sonraki iadeler ve yeniden işleme toplam süre ve maliyeti büyüttü.", "Skipping the control step initially accelerated shipping, but later returns and rework increased total time and cost."),
  },
  {
    id: "G19", stage: 3, initiatorIndex: 1,
    title: l("Hızlı İşe Alımın Yan Etkisi", "The Side Effect of Rapid Hiring"),
    context: l("İnsan kaynağı · Uyum süreci", "Human resources · Onboarding process"),
    months: [
      m("Şirket yeni şube açtı", "Şirket yeni şube açtı", "The company opened a new branch", "The company opened a new branch"),
      m("Yeni çalışanların uyum programı kaldırıldı", "Yeni çalışanların uyum programı uygulandı", "The onboarding program for new employees was removed", "The onboarding program for new employees was implemented"),
      m("Yeni personel hemen tam iş yüküne geçirildi", "Personel eğitim sonrası kademeli başladı", "New staff were immediately assigned a full workload", "Staff started gradually after training"),
      m("İş akışında tekrar hataları arttı", "İş akışındaki hatalar azaldı", "Repeated workflow errors increased", "Workflow errors decreased"),
      m("Deneyimli çalışanların düzeltme yükü büyüdü", "Deneyimli çalışanların düzeltme yükü azaldı", "The correction load on experienced staff grew", "The correction load on experienced staff decreased"),
      m("Toplam ekip verimliliği düştü", "Toplam ekip verimliliği yükseldi", "Overall team productivity fell", "Overall team productivity rose"),
    ],
    explanation: l("Başlangıçta zaman kazandıran kısa yol, tekrar hata ve düzeltme işlerinin birikmesiyle uzun vadeli verimliliği düşürdü.", "The shortcut that initially saved time reduced long-term productivity as repeated errors and corrective work accumulated."),
  },
  {
    id: "G20", stage: 3, initiatorIndex: 2,
    title: l("Yazılımda Hızlı Yayın", "A Rushed Software Release"),
    context: l("Yazılım · Ürün kalitesi", "Software · Product quality"),
    months: [
      m("Yazılım için yeni sürüm planlandı", "Yazılım için yeni sürüm planlandı", "A new software release was planned", "A new software release was planned"),
      m("Yeni özellikler geliştirildi", "Yeni özellikler geliştirildi", "New features were developed", "New features were developed"),
      m("Yayını hızlandırmak için test süresi kısaltıldı", "Test süresi korundu, sürüm kontrollü yayımlandı", "Testing time was shortened to accelerate the release", "Testing time was preserved and the release was controlled"),
      m("Sürüm planlanandan erken yayımlandı", "Sürüm güvenilir biçimde yayımlandı", "The release went live earlier than planned", "The release went live reliably"),
      m("Gizli hatalar destek taleplerini artırdı", "Gizli hatalar yayımdan önce giderildi", "Hidden defects increased support requests", "Hidden defects were fixed before release"),
      m("Acil düzeltmeler ve kullanıcı kaybı arttı", "Acil düzeltme yükü azaldı, kullanıcı güveni korundu", "Emergency fixes and user loss increased", "The emergency-fix workload decreased and user trust was preserved"),
    ],
    explanation: l("Erken yayımlama ile kazanılan zaman, sonradan çıkan hataların düzeltilmesi sırasında kaybedildi.", "The time gained by releasing early was lost while fixing the defects that appeared afterward."),
  },
  {
    id: "G21", stage: 4, initiatorIndex: 4,
    title: l("Yanlış Performans Primi", "The Wrong Performance Bonus"),
    context: l("Üretim · Teşvik sistemi", "Production · Incentive system"),
    months: [
      m("Fabrikanın yıllık hedefleri açıklandı", "Fabrikanın yıllık hedefleri açıklandı", "The factory's annual targets were announced", "The factory's annual targets were announced"),
      m("Üretim hattında vardiyalar düzenlendi", "Üretim hattında vardiyalar düzenlendi", "Shifts on the production line were organized", "Shifts on the production line were organized"),
      m("Kalite kontrolleri düzenli yapıldı", "Kalite kontrolleri düzenli yapıldı", "Quality checks were carried out regularly", "Quality checks were carried out regularly"),
      m("Çalışan görüşmeleri gerçekleştirildi", "Çalışan görüşmeleri gerçekleştirildi", "Employee meetings were conducted", "Employee meetings were conducted"),
      m("Prim yalnızca üretilen parça sayısına bağlandı", "Prim üretim sayısı ve kaliteye birlikte bağlandı", "The bonus was tied only to the number of parts produced", "The bonus was tied to both production volume and quality"),
      m("Kalite adımları atlandı; iade ve yeniden işleme arttı", "Kontroller korundu; iade ve yeniden işleme azaldı", "Quality steps were skipped, increasing returns and rework", "Checks were preserved, reducing returns and rework"),
    ],
    explanation: l("İşçileri suçlamak yerine teşvik kuralını değiştirmek, kaliteyi bozan davranışı kaynağında etkiler.", "Changing the incentive rule instead of blaming workers addresses the source of the behavior that harms quality."),
  },
  {
    id: "G22", stage: 4, initiatorIndex: 0,
    title: l("Kopuk Planlama Sistemi", "The Disconnected Planning System"),
    context: l("Satış · Üretim · Sistem mimarisi", "Sales · Production · System architecture"),
    months: [
      m("Satış ve kapasite planı birbirinden bağımsız tutuldu", "Satış ve kapasite planları birleştirildi", "Sales and capacity plans were kept separate", "Sales and capacity plans were integrated"),
      m("Satış ekibi üretim kapasitesini görmedi", "Satış ekibi kapasiteyi gördü", "The sales team could not see production capacity", "The sales team could see capacity"),
      m("Gerçekçi olmayan teslim sözleri verildi", "Gerçekçi teslim sözleri verildi", "Unrealistic delivery promises were made", "Realistic delivery promises were made"),
      m("Üretimde öncelik çatışmaları oluştu", "Üretim öncelikleri tutarlı kaldı", "Production priority conflicts emerged", "Production priorities remained consistent"),
      m("Sevkiyat programı sık sık değişti", "Sevkiyat programı kararlı ilerledi", "The shipping schedule changed frequently", "The shipping schedule progressed steadily"),
      m("Müşteri teslimat güveni azaldı", "Müşteri teslimat güveni yükseldi", "Customer confidence in delivery fell", "Customer confidence in delivery rose"),
    ],
    explanation: l("Teslimat sorununu yalnızca sevkiyatta çözmeye çalışmak yerine iki planlama sistemini bağlamak daha etkili bir müdahaledir.", "Connecting the two planning systems is more effective than trying to solve the delivery problem only in shipping."),
  },
  {
    id: "G23", stage: 4, initiatorIndex: 1,
    title: l("Vardiya Devir Boşluğu", "The Shift-Handover Gap"),
    context: l("Laboratuvar · Bilgi akışı", "Laboratory · Information flow"),
    months: [
      m("Laboratuvarda ikinci vardiya açıldı", "Laboratuvarda ikinci vardiya açıldı", "A second shift opened in the laboratory", "A second shift opened in the laboratory"),
      m("Standart vardiya devir kaydı kaldırıldı", "Standart vardiya devir kaydı uygulandı", "The standard shift-handover record was removed", "The standard shift-handover record was implemented"),
      m("Numune bilgileri eksik aktarıldı", "Numune bilgileri eksiksiz aktarıldı", "Sample information was transferred incompletely", "Sample information was transferred completely"),
      m("Tekrar test istekleri çoğaldı", "Tekrar test istekleri azaldı", "Retest requests increased", "Retest requests decreased"),
      m("Sonuç dosyaları birikmeye başladı", "Sonuç dosyaları zamanında tamamlandı", "Result files began to accumulate", "Result files were completed on time"),
      m("Rapor teslim süresi uzadı", "Raporlar zamanında iletildi", "Report delivery time increased", "Reports were delivered on time"),
    ],
    explanation: l("Tek tek numune hatalarını düzeltmek yerine vardiyalar arasındaki standart kayıt düzenini kurmak sistemin işleyişini iyileştirir.", "Establishing a standard record process between shifts improves the system more effectively than correcting sample errors one by one."),
  },
  {
    id: "G24", stage: 4, initiatorIndex: 2,
    title: l("Görünmeyen Arızalar", "Invisible Failures"),
    context: l("Fabrika · Arıza bildirim sistemi", "Factory · Failure reporting system"),
    months: [
      m("Fabrikada bakım ekibi kuruldu", "Fabrikada bakım ekibi kuruldu", "A maintenance team was established at the factory", "A maintenance team was established at the factory"),
      m("Çalışanlara arıza bildirimi eğitimi verildi", "Çalışanlara arıza bildirimi eğitimi verildi", "Employees received failure-reporting training", "Employees received failure-reporting training"),
      m("Küçük arıza bildirimleri bakım ekibine kapatıldı", "Küçük arıza bildirimleri bakım ekibine açık tutuldu", "Minor failure reports were hidden from the maintenance team", "Minor failure reports remained visible to the maintenance team"),
      m("Tekrarlayan uyarılar kayıt dışı kaldı", "Tekrarlayan uyarılar kaydedildi", "Recurring warnings went unrecorded", "Recurring warnings were recorded"),
      m("Önleyici onarım zamanında planlanamadı", "Önleyici onarım zamanında planlandı", "Preventive repairs could not be scheduled on time", "Preventive repairs were scheduled on time"),
      m("Beklenmedik duruşlar ve gecikmeler arttı", "Beklenmedik duruşlar ve gecikmeler azaldı", "Unexpected stoppages and delays increased", "Unexpected stoppages and delays decreased"),
    ],
    explanation: l("Arıza sonrasında daha hızlı tamir yerine önceden bildirim ve erken bakım sağlayan kural, duruşların kaynağına müdahale eder.", "A rule enabling advance reporting and early maintenance addresses the source of stoppages more effectively than repairing faster after failure."),
  },
  {
    id: "G25", stage: 4, initiatorIndex: 3,
    title: l("Teslimatın Gizli Kuralı", "The Hidden Rule of Delivery"),
    context: l("Dağıtım · Performans ölçütleri", "Distribution · Performance metrics"),
    months: [
      m("Dağıtım ağı iki bölgeye genişledi", "Dağıtım ağı iki bölgeye genişledi", "The distribution network expanded to two regions", "The distribution network expanded to two regions"),
      m("Teslimat araçlarının rotaları yenilendi", "Teslimat araçlarının rotaları yenilendi", "Delivery vehicle routes were updated", "Delivery vehicle routes were updated"),
      m("Teslimat saatleri müşterilere bildirildi", "Teslimat saatleri müşterilere bildirildi", "Delivery times were communicated to customers", "Delivery times were communicated to customers"),
      m("Sürücü performansı yalnızca günlük teslimat sayısıyla ölçüldü", "Performans doğru ve zamanında teslimatı da kapsadı", "Driver performance was measured only by daily delivery count", "Performance also included accurate and timely delivery"),
      m("Adres doğrulama adımları atlanmaya başladı", "Adres doğrulama adımları korundu", "Address-verification steps began to be skipped", "Address-verification steps were preserved"),
      m("Tekrar teslimatlar ve toplam teslim süresi arttı", "Tekrar teslimatlar azaldı, süre kısaldı", "Redeliveries and total delivery time increased", "Redeliveries decreased and delivery time shortened"),
    ],
    explanation: l("Sürücüleri daha çok çalıştırmak değil, sayıyı tek başarı ölçütü olmaktan çıkarıp doğru teslimatı ödüllendirmek sonucu düzeltir.", "The outcome improves by rewarding accurate delivery instead of making drivers work harder or treating count as the only measure of success."),
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
  const initiatorOrder = Array.from({ length: DELAY_TRAIL_STAGE_COUNT }, (_, index) => index);
  for (let index = initiatorOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [initiatorOrder[index], initiatorOrder[swapIndex]] = [initiatorOrder[swapIndex]!, initiatorOrder[index]!];
  }
  return initiatorOrder.map((initiatorIndex, stage) => {
    const scenario = DELAY_TRAIL_CASES.find((item) => item.stage === stage && item.initiatorIndex === initiatorIndex);
    if (!scenario) throw new Error(`Missing delay-trail case for stage ${stage + 1}, month ${initiatorIndex + 1}`);
    return scenario;
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
