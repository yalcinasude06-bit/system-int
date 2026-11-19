export type LocalText = { tr: string; en: string };

export type CrisisStakeholder = {
  id: string;
  role: LocalText;
  proposal: LocalText;
  icon: string;
  impact: [number, number, number];
};

export type CrisisCase = {
  id: string;
  title: LocalText;
  situation: LocalText;
  target: LocalText;
  learning: LocalText;
  stakeholders: CrisisStakeholder[];
  ideal: number[];
};

export const crisisCases: CrisisCase[] = [
  {
    id: "CM1", title: { tr: "Ani Sipariş Artışı", en: "Sudden Order Surge" },
    situation: { tr: "Büyük sipariş geldi. Sevkiyat hızlanmalı, hata patlamamalı.", en: "A large order arrived. Shipping must accelerate without a spike in errors." },
    target: { tr: "Akışı artır, kaliteyi koru, ekibi yorma.", en: "Increase flow, protect quality, avoid exhausting the team." },
    learning: { tr: "En iyi karar, akışla insanı birlikte düşünür.", en: "The best decision considers flow and people together." },
    stakeholders: [
      { id: "production", role: { tr: "Üretim Şefi", en: "Production Lead" }, proposal: { tr: "Hattı hemen hızlandıralım.", en: "Speed up the line now." }, icon: "⚙️", impact: [18, -11, -10] },
      { id: "quality", role: { tr: "Kalite Sorumlusu", en: "Quality Lead" }, proposal: { tr: "Son kontrole ek kontrol koyalım.", en: "Add another final inspection." }, icon: "🔍", impact: [-5, 17, -4] },
      { id: "planning", role: { tr: "Planlama Uzmanı", en: "Planning Specialist" }, proposal: { tr: "Siparişleri iki dalgaya bölelim.", en: "Split orders into two waves." }, icon: "🗓️", impact: [12, 8, 8] },
      { id: "hr", role: { tr: "İK Sorumlusu", en: "HR Lead" }, proposal: { tr: "Deneyimli ekibi kritik istasyona kaydıralım.", en: "Move the experienced team to the critical station." }, icon: "👥", impact: [7, 8, 13] },
    ], ideal: [0, 0, 2, 1],
  },
  {
    id: "CM2", title: { tr: "Şikâyetler Arttı", en: "Complaints Increased" },
    situation: { tr: "Müşteri şikâyetleri yükseldi. Hata artıyor, ekip yoruluyor.", en: "Customer complaints are rising. Errors are up and the team is tired." },
    target: { tr: "Hataları düşür, tempoyu tamamen bozma.", en: "Reduce errors without stopping the pace." },
    learning: { tr: "İnsan ve süreç birlikte iyileştirilir.", en: "People and process improve together." },
    stakeholders: [
      { id: "manager", role: { tr: "Yönetici", en: "Manager" }, proposal: { tr: "Kontrolleri sıkılaştıralım.", en: "Tighten inspections." }, icon: "📋", impact: [-6, 12, -9] },
      { id: "foreman", role: { tr: "Usta Başı", en: "Foreman" }, proposal: { tr: "Mola ve vardiya düzenini iyileştirelim.", en: "Improve breaks and shift planning." }, icon: "🧑‍🏭", impact: [6, 7, 15] },
      { id: "purchasing", role: { tr: "Satınalma", en: "Purchasing" }, proposal: { tr: "Daha ucuz parça kullanalım.", en: "Use a cheaper part." }, icon: "🏷️", impact: [4, -16, -5] },
      { id: "training", role: { tr: "Eğitim Sorumlusu", en: "Training Lead" }, proposal: { tr: "Kısa kalite eğitimi verelim.", en: "Run a short quality training." }, icon: "🎓", impact: [6, 14, 9] },
    ], ideal: [0, 1, 0, 2],
  },
  {
    id: "CM3", title: { tr: "Yeni Makine Geçişi", en: "New Machine Transition" },
    situation: { tr: "Yeni makine kuruluyor. Geçişte duruş riski var.", en: "A new machine is being installed. The transition may cause downtime." },
    target: { tr: "Duruşu azalt, uyumu koru.", en: "Reduce downtime and protect adaptation." },
    learning: { tr: "Pilot test ve hazırlık, geçişi güvenli yapar.", en: "Pilot testing and preparation make transitions safer." },
    stakeholders: [
      { id: "supplier", role: { tr: "Tedarikçi", en: "Supplier" }, proposal: { tr: "Doğrudan tam kurulum yapalım.", en: "Go straight to full installation." }, icon: "🚚", impact: [13, -8, -9] },
      { id: "maintenance", role: { tr: "Bakım Ekibi", en: "Maintenance" }, proposal: { tr: "Önce kısa pilot test yapalım.", en: "Run a short pilot test first." }, icon: "🛠️", impact: [10, 14, 6] },
      { id: "operator", role: { tr: "Operatör Temsilcisi", en: "Operator Rep" }, proposal: { tr: "Kullanıcı eğitimini öne alalım.", en: "Prioritize user training." }, icon: "🎛️", impact: [5, 8, 15] },
      { id: "finance", role: { tr: "Finans", en: "Finance" }, proposal: { tr: "Kurulumu tek seferde bitirelim.", en: "Finish installation in one pass." }, icon: "💼", impact: [11, -6, -12] },
    ], ideal: [0, 2, 1, 0],
  },
  {
    id: "CM4", title: { tr: "Tedarik Gecikmesi", en: "Supply Delay" },
    situation: { tr: "Kritik parça gecikti. Üretim riske girdi.", en: "A critical part is late. Production is at risk." },
    target: { tr: "Stok tükenmesin, panik büyümesin.", en: "Prevent stockout and contain the panic." },
    learning: { tr: "Doğru tepki, tüm akışın eşgüdümüdür.", en: "The right response coordinates the whole flow." },
    stakeholders: [
      { id: "purchasing", role: { tr: "Satınalma", en: "Purchasing" }, proposal: { tr: "Tek tedarikçiye baskı yapalım.", en: "Pressure the sole supplier." }, icon: "📞", impact: [4, -5, -7] },
      { id: "planning", role: { tr: "Planlama", en: "Planning" }, proposal: { tr: "Kritik siparişleri önceliklendirelim.", en: "Prioritize critical orders." }, icon: "🗂️", impact: [12, 7, 5] },
      { id: "warehouse", role: { tr: "Depo", en: "Warehouse" }, proposal: { tr: "Güvenlik stokunu kontrollü kullanalım.", en: "Use safety stock carefully." }, icon: "📦", impact: [10, 9, 5] },
      { id: "sales", role: { tr: "Satış", en: "Sales" }, proposal: { tr: "Güncel teslim tarihi verelim.", en: "Share updated delivery dates." }, icon: "🤝", impact: [5, 8, 12] },
    ], ideal: [0, 1, 1, 1],
  },
  {
    id: "CM5", title: { tr: "Bilgi Kopukluğu", en: "Information Disconnect" },
    situation: { tr: "Şubeler farklı dosyalar kullanıyor. İşler tekrarlanıyor.", en: "Branches use different files, creating duplicate work." },
    target: { tr: "Ortak görünürlük sağla.", en: "Create shared visibility." },
    learning: { tr: "Görünürlük ve eşgüdüm, kopuk sistemi toparlar.", en: "Visibility and coordination reconnect the system." },
    stakeholders: [
      { id: "regional", role: { tr: "Bölge Müdürü", en: "Regional Manager" }, proposal: { tr: "Mail trafiğini artıralım.", en: "Increase email traffic." }, icon: "✉️", impact: [-4, 2, -6] },
      { id: "system", role: { tr: "Sistem Sorumlusu", en: "System Lead" }, proposal: { tr: "Ortak pano ve tek veri ekranı kuralım.", en: "Build a shared board and single data view." }, icon: "🖥️", impact: [13, 14, 8] },
      { id: "team", role: { tr: "Takım Lideri", en: "Team Lead" }, proposal: { tr: "Haftalık kısa koordinasyon yapalım.", en: "Hold a short weekly coordination meeting." }, icon: "🧭", impact: [7, 7, 14] },
      { id: "operations", role: { tr: "Operasyon", en: "Operations" }, proposal: { tr: "Tüm süreci aynı gün değiştirelim.", en: "Change the whole process today." }, icon: "⚡", impact: [8, -9, -13] },
    ], ideal: [0, 2, 1, 0],
  },
];
