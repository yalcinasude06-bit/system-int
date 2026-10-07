import type { Locale } from "@/lib/i18n/dictionaries";

export type LocalizedText = Record<Locale, string>;

export type MissingProcessQuestion = {
  id: string;
  title: LocalizedText;
  input: LocalizedText;
  steps: Array<LocalizedText | null>;
  correct: LocalizedText;
  distractors: [LocalizedText, LocalizedText];
};

export type MissingProcessOption = {
  id: string;
  text: LocalizedText;
  isCorrect: boolean;
};

export type MissingProcessRound = MissingProcessQuestion & {
  options: MissingProcessOption[];
};

const t = (tr: string, en: string): LocalizedText => ({ tr, en });

export const missingProcessLabels = {
  input: t("Girdi", "Input"),
  missingStep: t("Eksik adım", "Missing step"),
  options: t("Eksik süreç adımını seç", "Select the missing process step"),
};

export const missingProcessPool: MissingProcessQuestion[] = [
  { id: "online-order", title: t("Online Sipariş Hazırlama", "Online Order Preparation"), input: t("Müşteri siparişi", "Customer order"), steps: [t("Sipariş alınır", "Order is received"), t("Ödeme doğrulanır", "Payment is verified"), null, t("Ürün paketlenir", "Product is packaged"), t("Kargoya teslim edilir", "Handed over to the carrier")], correct: t("Ürün raftan toplanır", "Product is picked from the shelf"), distractors: [t("Yeni tedarikçi aranır", "A new supplier is sought"), t("Satış raporu hazırlanır", "A sales report is prepared")] },
  { id: "purchasing", title: t("Satın Alma Süreci", "Purchasing Process"), input: t("Malzeme ihtiyacı", "Material requirement"), steps: [t("İhtiyaç belirlenir", "The need is identified"), t("Teklifler toplanır", "Quotations are collected"), null, t("Sipariş verilir", "The order is placed"), t("Malzeme teslim alınır", "The material is received")], correct: t("Teklif onaylanır", "The quotation is approved"), distractors: [t("Stok sayımı yapılır", "Inventory is counted"), t("Ürün paketlenir", "The product is packaged")] },
  { id: "production", title: t("Üretim Süreci", "Production Process"), input: t("Hammadde", "Raw material"), steps: [t("Hammadde alınır", "Raw material is received"), t("İşleme başlanır", "Processing begins"), null, t("Kalite kontrol yapılır", "Quality control is performed"), t("Ürün paketlenir", "The product is packaged")], correct: t("Parçalar birleştirilir", "Parts are assembled"), distractors: [t("Personel işe alınır", "Staff are recruited"), t("Bütçe hazırlanır", "A budget is prepared")] },
  { id: "hospital-admission", title: t("Hastane Hasta Kabul Süreci", "Hospital Patient Admission Process"), input: t("Hastanın başvurusu", "Patient application"), steps: [t("Hasta başvurur", "The patient applies"), t("Kimlik bilgileri alınır", "Identity information is collected"), null, t("Kayıt oluşturulur", "A record is created"), t("Hasta ilgili birime yönlendirilir", "The patient is directed to the relevant unit")], correct: t("Randevu ve başvuru bilgileri kontrol edilir", "Appointment and application details are checked"), distractors: [t("Hasta taburcu edilir", "The patient is discharged"), t("İlaç siparişi verilir", "Medication is ordered")] },
  { id: "invoicing", title: t("Faturalama Süreci", "Invoicing Process"), input: t("Tamamlanmış satış işlemi", "Completed sales transaction"), steps: [t("Satış bilgileri alınır", "Sales information is received"), t("Ürün/hizmet bilgileri kontrol edilir", "Product/service information is checked"), null, t("Fatura onaylanır", "The invoice is approved"), t("Müşteriye gönderilir", "It is sent to the customer")], correct: t("Fatura oluşturulur", "The invoice is created"), distractors: [t("Üretim planı yapılır", "A production plan is prepared"), t("Stoklar sayılır", "Inventory is counted")] },
  { id: "product-return", title: t("Ürün İade Süreci", "Product Return Process"), input: t("Müşterinin iade talebi", "Customer's return request"), steps: [t("İade talebi alınır", "The return request is received"), t("İade koşulları kontrol edilir", "Return conditions are checked"), null, t("İade onaylanır", "The return is approved"), t("Ücret geri ödenir", "The payment is refunded")], correct: t("Ürün kontrol edilir", "The product is inspected"), distractors: [t("Reklam kampanyası hazırlanır", "An advertising campaign is prepared"), t("Personel eğitimi yapılır", "Staff training is conducted")] },
  { id: "complaint-management", title: t("Müşteri Şikâyeti Yönetimi", "Customer Complaint Management"), input: t("Müşteri şikâyeti", "Customer complaint"), steps: [t("Şikâyet kaydedilir", "The complaint is recorded"), t("Şikâyet sınıflandırılır", "The complaint is classified"), null, t("Çözüm uygulanır", "The solution is implemented"), t("Müşteriye bilgi verilir", "The customer is informed")], correct: t("Sorunun nedeni incelenir", "The cause of the problem is investigated"), distractors: [t("Ürün fiyatı belirlenir", "The product price is determined"), t("Personel maaşı hesaplanır", "Staff salaries are calculated")] },
  { id: "recruitment", title: t("İşe Alım Süreci", "Recruitment Process"), input: t("Personel ihtiyacı", "Staffing need"), steps: [t("İhtiyaç belirlenir", "The need is identified"), t("İş ilanı yayınlanır", "The job posting is published"), t("Başvurular alınır", "Applications are received"), null, t("Uygun aday işe alınır", "The suitable candidate is hired")], correct: t("Adaylarla görüşme yapılır", "Candidates are interviewed"), distractors: [t("Ürünler paketlenir", "Products are packaged"), t("Tedarikçiye sipariş verilir", "An order is placed with the supplier")] },
  { id: "maintenance", title: t("Bakım Süreci", "Maintenance Process"), input: t("Makine arızası bildirimi", "Machine failure report"), steps: [t("Arıza bildirilir", "The failure is reported"), t("Makine incelenir", "The machine is inspected"), null, t("Onarım uygulanır", "The repair is performed"), t("Makine test edilir", "The machine is tested")], correct: t("Arızanın nedeni belirlenir", "The cause of the failure is identified"), distractors: [t("Müşteri aranır", "The customer is called"), t("Fatura oluşturulur", "An invoice is created")] },
  { id: "quality-control", title: t("Kalite Kontrol Süreci", "Quality Control Process"), input: t("Üretimi tamamlanmış ürün", "Finished product"), steps: [t("Ürün kontrol alanına gelir", "The product arrives at the inspection area"), t("Ölçüm yapılır", "Measurements are taken"), null, t("Sonuç kaydedilir", "The result is recorded"), t("Ürün uygun bölüme yönlendirilir", "The product is directed to the appropriate area")], correct: t("Ölçüm sonucu standartlarla karşılaştırılır", "The measurement result is compared with standards"), distractors: [t("Ürün yeniden tasarlanır", "The product is redesigned"), t("Yeni çalışan alınır", "A new employee is hired")] },
  { id: "warehouse-receipt", title: t("Depoya Malzeme Kabulü", "Warehouse Material Receipt"), input: t("Tedarikçiden gelen malzeme", "Material received from the supplier"), steps: [t("Malzeme teslim alınır", "The material is received"), t("Evraklar kontrol edilir", "Documents are checked"), null, t("Sistem kaydı yapılır", "The system record is created"), t("Malzeme depoya yerleştirilir", "The material is placed in the warehouse")], correct: t("Miktar ve kalite kontrolü yapılır", "Quantity and quality are checked"), distractors: [t("Satış fiyatı belirlenir", "The sales price is determined"), t("Müşteriye teklif hazırlanır", "A quotation is prepared for the customer")] },
  { id: "order-to-production", title: t("Siparişten Üretime Geçiş", "Order-to-Production Transition"), input: t("Onaylanmış müşteri siparişi", "Approved customer order"), steps: [t("Sipariş bilgileri alınır", "Order information is received"), t("Teknik gereksinimler kontrol edilir", "Technical requirements are checked"), null, t("İş emri oluşturulur", "A work order is created"), t("Üretime gönderilir", "It is sent to production")], correct: t("Malzeme ve kapasite uygunluğu kontrol edilir", "Material and capacity availability are checked"), distractors: [t("Ürün sevk edilir", "The product is shipped"), t("Personel izinleri düzenlenir", "Staff leave is arranged")] },
  { id: "cargo-delivery", title: t("Kargo Teslim Süreci", "Cargo Delivery Process"), input: t("Sevke hazır paket", "Package ready for shipment"), steps: [t("Paket teslim alınır", "The package is received"), t("Adres bilgisi kontrol edilir", "The address is checked"), t("Dağıtım aracına yüklenir", "It is loaded onto the delivery vehicle"), null, t("Teslimat kaydı oluşturulur", "The delivery record is created")], correct: t("Paket müşteriye teslim edilir", "The package is delivered to the customer"), distractors: [t("Yeni paket üretilir", "A new package is produced"), t("Stok sayımı yapılır", "Inventory is counted")] },
  { id: "course-registration", title: t("Üniversite Ders Kayıt Süreci", "University Course Registration Process"), input: t("Öğrencinin ders seçim talebi", "Student's course selection request"), steps: [t("Dersler seçilir", "Courses are selected"), t("Kontenjanlar kontrol edilir", "Quotas are checked"), null, t("Danışman onayı alınır", "Advisor approval is obtained"), t("Kayıt kesinleştirilir", "Registration is finalized")], correct: t("Ön koşullar kontrol edilir", "Prerequisites are checked"), distractors: [t("Diploma hazırlanır", "The diploma is prepared"), t("Ders notları açıklanır", "Course grades are announced")] },
  { id: "product-development", title: t("Yeni Ürün Geliştirme", "New Product Development"), input: t("Yeni ürün ihtiyacı / müşteri beklentisi", "New product need / customer expectation"), steps: [t("İhtiyaç belirlenir", "The need is identified"), t("Ürün fikri geliştirilir", "The product idea is developed"), null, t("Prototip test edilir", "The prototype is tested"), t("Ürün son haline getirilir", "The product is finalized")], correct: t("Prototip hazırlanır", "The prototype is prepared"), distractors: [t("Mevcut ürün imha edilir", "The existing product is destroyed"), t("Fatura düzenlenir", "An invoice is issued")] },
  { id: "marketing-campaign", title: t("Pazarlama Kampanyası", "Marketing Campaign"), input: t("Pazarlama hedefi", "Marketing objective"), steps: [t("Hedef kitle belirlenir", "The target audience is identified"), t("Kampanya mesajı hazırlanır", "The campaign message is prepared"), null, t("İçerikler oluşturulur", "Content is created"), t("Kampanya yayınlanır", "The campaign is launched")], correct: t("İletişim kanalları seçilir", "Communication channels are selected"), distractors: [t("Ürün sevkiyatı yapılır", "The product is shipped"), t("Makine bakımı yapılır", "Machine maintenance is performed")] },
  { id: "budget-preparation", title: t("Bütçe Hazırlama Süreci", "Budget Preparation Process"), input: t("Birimlerin kaynak ihtiyaçları", "Departments' resource needs"), steps: [t("Birim talepleri toplanır", "Department requests are collected"), t("Maliyetler değerlendirilir", "Costs are evaluated"), null, t("Bütçe taslağı oluşturulur", "A draft budget is created"), t("Yönetim onayına sunulur", "It is submitted for management approval")], correct: t("Öncelikler belirlenir", "Priorities are determined"), distractors: [t("Ürün paketlenir", "The product is packaged"), t("Sipariş sevk edilir", "The order is shipped")] },
  { id: "safety-risk", title: t("İş Güvenliği Risk Değerlendirmesi", "Occupational Safety Risk Assessment"), input: t("Çalışma alanı ve faaliyet bilgileri", "Work area and activity information"), steps: [t("Çalışma alanı incelenir", "The work area is inspected"), t("Tehlikeler belirlenir", "Hazards are identified"), null, t("Önlemler belirlenir", "Precautions are determined"), t("Sonuçlar kaydedilir", "Results are recorded")], correct: t("Risklerin olasılık ve etkisi değerlendirilir", "The likelihood and impact of risks are evaluated"), distractors: [t("Ürün müşteriye teslim edilir", "The product is delivered to the customer"), t("Yeni tedarikçi seçilir", "A new supplier is selected")] },
  { id: "stock-replenishment", title: t("Stok Yenileme Süreci", "Stock Replenishment Process"), input: t("Düşük stok bilgisi", "Low-stock information"), steps: [t("Stok seviyesi kontrol edilir", "The stock level is checked"), t("İhtiyaç miktarı belirlenir", "The required quantity is determined"), null, t("Malzeme teslim alınır", "The material is received"), t("Stok kaydı güncellenir", "The inventory record is updated")], correct: t("Tedarikçiye sipariş verilir", "An order is placed with the supplier"), distractors: [t("Müşteriye anket gönderilir", "A survey is sent to the customer"), t("Üretim hattı kapatılır", "The production line is shut down")] },
  { id: "technical-service", title: t("Teknik Servis Süreci", "Technical Service Process"), input: t("Arızalı ürün", "Faulty product"), steps: [t("Ürün teslim alınır", "The product is received"), t("Arıza kaydı açılır", "A fault record is opened"), null, t("Onarım yapılır", "The repair is performed"), t("Ürün test edilerek teslim edilir", "The product is tested and returned")], correct: t("Arıza teşhis edilir", "The fault is diagnosed"), distractors: [t("Yeni müşteri aranır", "A new customer is sought"), t("Reklam hazırlanır", "An advertisement is prepared")] },
  { id: "travel-approval", title: t("Seyahat İzin Süreci", "Travel Authorization Process"), input: t("Çalışanın seyahat talebi", "Employee's travel request"), steps: [t("Seyahat talebi oluşturulur", "The travel request is created"), null, t("Seyahat birimine bilgi verilir", "The travel unit is informed"), t("Bilet işlemleri yapılır", "Ticket arrangements are made"), t("Ödeme süreci hazırlanır", "The payment process is prepared")], correct: t("Yönetici onayı alınır", "Manager approval is obtained"), distractors: [t("Yeni personel alınır", "New staff are recruited"), t("Ürün kalite kontrolden geçirilir", "The product undergoes quality control")] },
  { id: "restaurant-order", title: t("Restoran Sipariş Süreci", "Restaurant Order Process"), input: t("Müşterinin yemek siparişi", "Customer's food order"), steps: [t("Sipariş alınır", "The order is received"), t("Sipariş mutfağa iletilir", "The order is sent to the kitchen"), null, t("Yemek kontrol edilir", "The meal is checked"), t("Müşteriye servis edilir", "It is served to the customer")], correct: t("Yemek hazırlanır", "The meal is prepared"), distractors: [t("Günlük ciro hesaplanır", "Daily revenue is calculated"), t("Tedarikçi sözleşmesi hazırlanır", "A supplier contract is prepared")] },
  { id: "bank-loan", title: t("Banka Kredi Başvurusu", "Bank Loan Application"), input: t("Müşterinin kredi başvurusu", "Customer's loan application"), steps: [t("Başvuru alınır", "The application is received"), t("Belgeler kontrol edilir", "Documents are checked"), null, t("Kredi kararı verilir", "The loan decision is made"), t("Müşteriye sonuç bildirilir", "The customer is notified of the result")], correct: t("Müşterinin kredi riski değerlendirilir", "The customer's credit risk is assessed"), distractors: [t("Müşteriye banka kartı gönderilir", "A bank card is sent to the customer"), t("Şube bütçesi hazırlanır", "The branch budget is prepared")] },
  { id: "production-planning", title: t("Üretim Planlama Süreci", "Production Planning Process"), input: t("Müşteri talebi ve sipariş bilgileri", "Customer demand and order information"), steps: [t("Talep bilgileri alınır", "Demand information is received"), t("Mevcut stok kontrol edilir", "Current inventory is checked"), null, t("Üretim miktarları belirlenir", "Production quantities are determined"), t("Üretim planı yayınlanır", "The production plan is published")], correct: t("Kapasite ve kaynaklar kontrol edilir", "Capacity and resources are checked"), distractors: [t("Ürünler müşteriye teslim edilir", "Products are delivered to the customer"), t("Fatura kesilir", "An invoice is issued")] },
  { id: "ecommerce-return", title: t("E-Ticaret İade ve Geri Ödeme Süreci", "E-Commerce Return and Refund Process"), input: t("İade talebi ve geri gönderilen ürün", "Return request and returned product"), steps: [t("İade talebi kaydedilir", "The return request is recorded"), t("Ürün teslim alınır", "The product is received"), null, t("İade onaylanır", "The return is approved"), t("Ödeme müşteriye geri gönderilir", "The payment is refunded to the customer")], correct: t("Ürünün iade koşullarına uygunluğu kontrol edilir", "The product's compliance with return conditions is checked"), distractors: [t("Ürün yeniden müşteriye satılır", "The product is resold to the customer"), t("Satış hedefi belirlenir", "The sales target is determined")] },
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
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function buildMissingProcessRounds(sessionId: string): MissingProcessRound[] {
  const random = seededRandom(hashSeed(`week-3-module-2:${sessionId}`));
  let previousCorrectIndex = -1;
  return shuffle(missingProcessPool, random).slice(0, 10).map((question) => {
    let options = shuffle<MissingProcessOption>([
      { id: "correct", text: question.correct, isCorrect: true },
      { id: "distractor-1", text: question.distractors[0], isCorrect: false },
      { id: "distractor-2", text: question.distractors[1], isCorrect: false },
    ], random);
    const correctIndex = options.findIndex((option) => option.isCorrect);
    if (correctIndex === previousCorrectIndex) options = [...options.slice(1), options[0]];
    previousCorrectIndex = options.findIndex((option) => option.isCorrect);
    return { ...question, options };
  });
}
