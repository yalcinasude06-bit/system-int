import type { Locale } from "@/lib/i18n/dictionaries";

export type LocalizedText = Record<Locale, string>;
export type FlowSymbol = "startEnd" | "process" | "decision" | "data" | "document" | "delay" | "control";
export type FlowRow = "top" | "main" | "bottom";

export type FlowNode = {
  id: string;
  text: LocalizedText;
  symbol: FlowSymbol;
  blank?: boolean;
  column: number;
  row?: FlowRow;
};

export type FlowEdge = {
  from: string;
  to: string;
  label?: LocalizedText;
  loop?: boolean;
};

export type FlowchartDiagram = {
  id: string;
  difficulty: "easy" | "medium" | "hard";
  title: LocalizedText;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

const text = (tr: string, en: string): LocalizedText => ({ tr, en });
const node = (id: string, tr: string, en: string, symbol: FlowSymbol, column: number, options?: { blank?: boolean; row?: FlowRow }): FlowNode => ({ id, text: text(tr, en), symbol, column, ...options });
const edge = (from: string, to: string, label?: LocalizedText, loop = false): FlowEdge => ({ from, to, label, loop });
const yes = text("Evet", "Yes");
const no = text("Hayır", "No");
const back = text("dön", "return");

export const flowSymbolLabels: Record<FlowSymbol, LocalizedText> = {
  startEnd: text("Başlangıç / Bitiş", "Start / End"),
  process: text("İşlem / Süreç", "Process"),
  decision: text("Karar", "Decision"),
  data: text("Veri (Girdi / Çıktı)", "Data (Input / Output)"),
  document: text("Belge / Rapor", "Document / Report"),
  delay: text("Bekleme", "Delay"),
  control: text("Kontrol / Denetim", "Control / Audit"),
};

export const flowSymbolOrder: FlowSymbol[] = ["startEnd", "process", "decision", "data", "document", "delay", "control"];

export const flowchartPool: FlowchartDiagram[] = [
  {
    id: "easy-online-order",
    difficulty: "easy",
    title: text("Online Sipariş Alma", "Online Order Intake"),
    nodes: [
      node("start", "Sipariş başlar", "Order begins", "startEnd", 0),
      node("info", "Müşteri sipariş bilgilerini girer", "Customer enters order information", "data", 1, { blank: true }),
      node("save", "Sipariş sisteme kaydedilir", "Order is saved in the system", "process", 2),
      node("summary", "Sipariş özeti oluşturulur", "Order summary is created", "document", 3, { blank: true }),
      node("end", "Sipariş işlemi tamamlanır", "Order processing is completed", "startEnd", 4),
    ],
    edges: [edge("start", "info"), edge("info", "save"), edge("save", "summary"), edge("summary", "end")],
  },
  {
    id: "easy-patient-registration",
    difficulty: "easy",
    title: text("Hasta Kayıt", "Patient Registration"),
    nodes: [
      node("start", "Hasta kayıt süreci başlar", "Patient registration begins", "startEnd", 0),
      node("identity", "Hasta kimlik bilgilerini verir", "Patient provides identity information", "data", 1),
      node("enter", "Bilgiler sisteme girilir", "Information is entered into the system", "process", 2, { blank: true }),
      node("form", "Hasta kayıt formu oluşturulur", "Patient registration form is created", "document", 3, { blank: true }),
      node("end", "Kayıt tamamlanır", "Registration is completed", "startEnd", 4),
    ],
    edges: [edge("start", "identity"), edge("identity", "enter"), edge("enter", "form"), edge("form", "end")],
  },
  {
    id: "easy-product-quality",
    difficulty: "easy",
    title: text("Ürün Kalite Kontrolü", "Product Quality Control"),
    nodes: [
      node("start", "Kontrol süreci başlar", "Control process begins", "startEnd", 0),
      node("inspect", "Ürün kontrol edilir", "Product is inspected", "control", 1, { blank: true }),
      node("decision", "Ürün uygun mu?", "Is the product suitable?", "decision", 2, { blank: true }),
      node("approve", "Ürün onaylanır", "Product is approved", "process", 3, { row: "top" }),
      node("separate", "Ürün ayrılır", "Product is separated", "process", 3, { row: "bottom" }),
      node("end", "Kontrol süreci biter", "Control process ends", "startEnd", 4),
    ],
    edges: [edge("start", "inspect"), edge("inspect", "decision"), edge("decision", "approve", yes), edge("decision", "separate", no), edge("approve", "end"), edge("separate", "end")],
  },
  {
    id: "easy-invoice",
    difficulty: "easy",
    title: text("Fatura Oluşturma", "Invoice Creation"),
    nodes: [
      node("start", "Faturalama başlar", "Invoicing begins", "startEnd", 0),
      node("sales", "Satış bilgileri alınır", "Sales information is received", "data", 1, { blank: true }),
      node("invoice", "Fatura hazırlanır", "Invoice is prepared", "document", 2, { blank: true }),
      node("send", "Fatura müşteriye gönderilir", "Invoice is sent to the customer", "process", 3),
      node("end", "Faturalama tamamlanır", "Invoicing is completed", "startEnd", 4),
    ],
    edges: [edge("start", "sales"), edge("sales", "invoice"), edge("invoice", "send"), edge("send", "end")],
  },
  {
    id: "easy-machine-maintenance",
    difficulty: "easy",
    title: text("Makine Bakımı", "Machine Maintenance"),
    nodes: [
      node("start", "Bakım süreci başlar", "Maintenance process begins", "startEnd", 0),
      node("check-one", "Makine kontrol edilir", "Machine is inspected", "control", 1, { blank: true }),
      node("maintenance", "Bakım işlemi yapılır", "Maintenance is performed", "process", 2, { blank: true }),
      node("check-two", "Makine yeniden kontrol edilir", "Machine is checked again", "control", 3),
      node("end", "Bakım tamamlanır", "Maintenance is completed", "startEnd", 4),
    ],
    edges: [edge("start", "check-one"), edge("check-one", "maintenance"), edge("maintenance", "check-two"), edge("check-two", "end")],
  },
  {
    id: "medium-purchasing",
    difficulty: "medium",
    title: text("Satın Alma Süreci", "Purchasing Process"),
    nodes: [
      node("start", "Malzeme ihtiyacı oluşur", "A material need arises", "startEnd", 0),
      node("request", "Talep formu hazırlanır", "Request form is prepared", "document", 1, { blank: true }),
      node("quotes", "Teklifler alınır", "Quotes are received", "data", 2),
      node("review", "Teklifler kontrol edilir", "Quotes are checked", "control", 3, { blank: true }),
      node("decision", "Uygun teklif var mı?", "Is there a suitable quote?", "decision", 4, { blank: true }),
      node("order", "Sipariş verilir", "Order is placed", "process", 5, { row: "top" }),
      node("delivery", "Malzeme teslim alınır", "Materials are received", "data", 6, { row: "top" }),
      node("new-quotes", "Yeni teklifler istenir", "New quotes are requested", "process", 5, { row: "bottom" }),
      node("end", "Süreç tamamlanır", "Process is completed", "startEnd", 7),
    ],
    edges: [edge("start", "request"), edge("request", "quotes"), edge("quotes", "review"), edge("review", "decision"), edge("decision", "order", yes), edge("order", "delivery"), edge("delivery", "end"), edge("decision", "new-quotes", no), edge("new-quotes", "quotes", back, true)],
  },
  {
    id: "medium-recruitment",
    difficulty: "medium",
    title: text("İşe Alım", "Recruitment"),
    nodes: [
      node("start", "Personel ihtiyacı oluşur", "A staffing need arises", "startEnd", 0),
      node("listing", "İş ilanı hazırlanır", "Job posting is prepared", "document", 1),
      node("applications", "Başvurular alınır", "Applications are received", "data", 2, { blank: true }),
      node("review", "Başvurular incelenir", "Applications are reviewed", "control", 3),
      node("decision", "Aday uygun mu?", "Is the candidate suitable?", "decision", 4, { blank: true }),
      node("interview", "Mülakat yapılır", "Interview is conducted", "process", 5, { row: "top" }),
      node("form", "İşe alım formu hazırlanır", "Hiring form is prepared", "document", 6, { blank: true, row: "top" }),
      node("reject", "Başvuru reddedilir", "Application is rejected", "startEnd", 5, { row: "bottom" }),
      node("end", "İşe alım tamamlanır", "Recruitment is completed", "startEnd", 7),
    ],
    edges: [edge("start", "listing"), edge("listing", "applications"), edge("applications", "review"), edge("review", "decision"), edge("decision", "interview", yes), edge("interview", "form"), edge("form", "end"), edge("decision", "reject", no)],
  },
  {
    id: "medium-technical-service",
    difficulty: "medium",
    title: text("Teknik Servis", "Technical Service"),
    nodes: [
      node("start", "Arızalı ürün gelir", "Faulty product arrives", "startEnd", 0),
      node("info", "Arıza bilgileri alınır", "Fault information is received", "data", 1),
      node("check", "Ürün kontrol edilir", "Product is inspected", "control", 2),
      node("detect", "Arıza tespit edilir", "Fault is identified", "process", 3),
      node("decision", "Parça gerekiyor mu?", "Is a part needed?", "decision", 4, { blank: true }),
      node("wait", "Parça gelmesi beklenir", "Part arrival is awaited", "delay", 5, { blank: true, row: "top" }),
      node("repair", "Onarım yapılır", "Repair is performed", "process", 6),
      node("test", "Ürün test edilir", "Product is tested", "control", 7, { blank: true }),
      node("end", "Müşteriye teslim edilir", "Delivered to the customer", "startEnd", 8),
    ],
    edges: [edge("start", "info"), edge("info", "check"), edge("check", "detect"), edge("detect", "decision"), edge("decision", "wait", yes), edge("wait", "repair"), edge("decision", "repair", no), edge("repair", "test"), edge("test", "end")],
  },
  {
    id: "medium-credit-application",
    difficulty: "medium",
    title: text("Banka Kredi Başvurusu", "Bank Loan Application"),
    nodes: [
      node("start", "Kredi başvurusu yapılır", "Loan application is made", "startEnd", 0),
      node("info", "Başvuru bilgileri alınır", "Application information is received", "data", 1),
      node("documents", "Belgeler kontrol edilir", "Documents are checked", "control", 2, { blank: true }),
      node("risk", "Kredi riski değerlendirilir", "Credit risk is assessed", "process", 3),
      node("decision", "Başvuru uygun mu?", "Is the application suitable?", "decision", 4, { blank: true }),
      node("contract", "Kredi sözleşmesi hazırlanır", "Loan agreement is prepared", "document", 5, { blank: true, row: "top" }),
      node("grant", "Kredi kullandırılır", "Loan is granted", "process", 6, { row: "top" }),
      node("reject", "Ret bildirimi hazırlanır", "Rejection notice is prepared", "document", 5, { row: "bottom" }),
      node("end", "Süreç tamamlanır", "Process is completed", "startEnd", 7),
    ],
    edges: [edge("start", "info"), edge("info", "documents"), edge("documents", "risk"), edge("risk", "decision"), edge("decision", "contract", yes), edge("contract", "grant"), edge("grant", "end"), edge("decision", "reject", no), edge("reject", "end")],
  },
  {
    id: "medium-product-return",
    difficulty: "medium",
    title: text("Ürün İade", "Product Return"),
    nodes: [
      node("start", "İade talebi alınır", "Return request is received", "startEnd", 0),
      node("form", "İade formu oluşturulur", "Return form is created", "document", 1),
      node("receive", "Ürün teslim alınır", "Product is received", "data", 2, { blank: true }),
      node("check", "Ürün kontrol edilir", "Product is inspected", "control", 3, { blank: true }),
      node("decision", "İade koşullarına uygun mu?", "Does it meet return conditions?", "decision", 4, { blank: true }),
      node("refund", "Geri ödeme yapılır", "Refund is made", "process", 5, { row: "top" }),
      node("report", "İade raporu oluşturulur", "Return report is created", "document", 6, { row: "top" }),
      node("reject", "Müşteriye ret bilgisi gönderilir", "Rejection information is sent to customer", "data", 5, { row: "bottom" }),
      node("end", "Süreç tamamlanır", "Process is completed", "startEnd", 7),
    ],
    edges: [edge("start", "form"), edge("form", "receive"), edge("receive", "check"), edge("check", "decision"), edge("decision", "refund", yes), edge("refund", "report"), edge("report", "end"), edge("decision", "reject", no), edge("reject", "end")],
  },
  {
    id: "hard-travel-permit",
    difficulty: "hard",
    title: text("Seyahat İzin Süreci", "Travel Authorization Process"),
    nodes: [
      node("start", "Seyahat talebi başlar", "Travel request begins", "startEnd", 0),
      node("info", "Çalışan seyahat bilgilerini girer", "Employee enters travel information", "data", 1),
      node("form", "Seyahat talep formu oluşturulur", "Travel request form is created", "document", 2, { blank: true }),
      node("review", "Yönetici talebi inceler", "Manager reviews the request", "control", 3, { blank: true }),
      node("approved", "Onaylandı mı?", "Was it approved?", "decision", 4, { blank: true }),
      node("notify", "Çalışana bilgi gönderilir", "Information is sent to employee", "data", 5, { row: "bottom" }),
      node("unit", "Seyahat birimine bildirilir", "Travel unit is notified", "process", 5, { row: "top" }),
      node("tickets", "Bilet seçenekleri hazırlanır", "Ticket options are prepared", "process", 6, { row: "top" }),
      node("suitable", "Biletler uygun mu?", "Are tickets suitable?", "decision", 7, { blank: true, row: "top" }),
      node("search", "Yeni bilet seçenekleri aranır", "New ticket options are searched", "process", 8, { row: "bottom" }),
      node("payment-info", "Ödeme birimine bilgi gönderilir", "Payment unit is notified", "data", 8, { row: "top" }),
      node("wait", "Ödeme hazırlanması beklenir", "Payment preparation is awaited", "delay", 9, { blank: true, row: "top" }),
      node("documents", "Seyahat belgeleri oluşturulur", "Travel documents are created", "document", 10),
      node("end", "Süreç tamamlanır", "Process is completed", "startEnd", 11),
    ],
    edges: [edge("start", "info"), edge("info", "form"), edge("form", "review"), edge("review", "approved"), edge("approved", "notify", no), edge("notify", "start", back, true), edge("approved", "unit", yes), edge("unit", "tickets"), edge("tickets", "suitable"), edge("suitable", "search", no), edge("search", "tickets", back, true), edge("suitable", "payment-info", yes), edge("payment-info", "wait"), edge("wait", "documents"), edge("documents", "end")],
  },
  {
    id: "hard-production-quality",
    difficulty: "hard",
    title: text("Üretim ve Kalite Kontrol", "Production and Quality Control"),
    nodes: [
      node("start", "Üretim emri alınır", "Production order is received", "startEnd", 0),
      node("plan", "Üretim planı oluşturulur", "Production plan is created", "document", 1),
      node("material-info", "Hammadde bilgileri alınır", "Raw material information is received", "data", 2),
      node("material-check", "Hammadde kontrol edilir", "Raw material is checked", "control", 3, { blank: true }),
      node("material-decision", "Hammadde uygun mu?", "Is the raw material suitable?", "decision", 4, { blank: true }),
      node("wait", "Yeni hammadde beklenir", "New raw material is awaited", "delay", 5, { blank: true, row: "bottom" }),
      node("produce", "Üretim yapılır", "Production is performed", "process", 5, { row: "top" }),
      node("quality-check", "Ürün kalite kontrolüne alınır", "Product enters quality control", "control", 6, { row: "top" }),
      node("quality-decision", "Ürün uygun mu?", "Is the product suitable?", "decision", 7, { blank: true, row: "top" }),
      node("rework", "Yeniden işleme gönderilir", "Sent for rework", "process", 8, { row: "bottom" }),
      node("report", "Kalite raporu hazırlanır", "Quality report is prepared", "document", 8, { blank: true, row: "top" }),
      node("ship", "Ürün sevke hazırlanır", "Product is prepared for shipment", "process", 9),
      node("end", "Süreç tamamlanır", "Process is completed", "startEnd", 10),
    ],
    edges: [edge("start", "plan"), edge("plan", "material-info"), edge("material-info", "material-check"), edge("material-check", "material-decision"), edge("material-decision", "wait", no), edge("wait", "material-check", back, true), edge("material-decision", "produce", yes), edge("produce", "quality-check"), edge("quality-check", "quality-decision"), edge("quality-decision", "rework", no), edge("rework", "quality-check", back, true), edge("quality-decision", "report", yes), edge("report", "ship"), edge("ship", "end")],
  },
  {
    id: "hard-supplier-selection",
    difficulty: "hard",
    title: text("Tedarikçi Seçimi", "Supplier Selection"),
    nodes: [
      node("start", "Satın alma ihtiyacı oluşur", "A purchasing need arises", "startEnd", 0),
      node("request", "Teklif talep belgesi hazırlanır", "Quote request document is prepared", "document", 1, { blank: true }),
      node("quotes", "Tedarikçi teklifleri alınır", "Supplier quotes are received", "data", 2),
      node("check", "Teklifler kontrol edilir", "Quotes are checked", "control", 3, { blank: true }),
      node("terms", "Teklif şartları uygun mu?", "Are quote terms suitable?", "decision", 4, { blank: true }),
      node("new-quote", "Yeni teklif istenir", "New quote is requested", "process", 5, { row: "bottom" }),
      node("performance", "Tedarikçi performansı değerlendirilir", "Supplier performance is evaluated", "control", 5, { row: "top" }),
      node("supplier", "Tedarikçi yeterli mi?", "Is the supplier sufficient?", "decision", 6, { row: "top" }),
      node("alternative", "Alternatif tedarikçi araştırılır", "Alternative supplier is researched", "process", 7, { row: "bottom" }),
      node("order", "Sipariş formu hazırlanır", "Order form is prepared", "document", 7, { row: "top" }),
      node("send", "Sipariş gönderilir", "Order is sent", "data", 8, { row: "top" }),
      node("wait", "Malzeme teslimatı beklenir", "Material delivery is awaited", "delay", 9, { blank: true, row: "top" }),
      node("material-check", "Malzeme kontrol edilir", "Material is checked", "control", 10, { blank: true }),
      node("end", "Kabul işlemi tamamlanır", "Acceptance process is completed", "startEnd", 11),
    ],
    edges: [edge("start", "request"), edge("request", "quotes"), edge("quotes", "check"), edge("check", "terms"), edge("terms", "new-quote", no), edge("new-quote", "quotes", back, true), edge("terms", "performance", yes), edge("performance", "supplier"), edge("supplier", "alternative", no), edge("alternative", "quotes", back, true), edge("supplier", "order", yes), edge("order", "send"), edge("send", "wait"), edge("wait", "material-check"), edge("material-check", "end")],
  },
  {
    id: "hard-laboratory-test",
    difficulty: "hard",
    title: text("Hastane Laboratuvar Test Süreci", "Hospital Laboratory Test Process"),
    nodes: [
      node("start", "Test talebi oluşturulur", "Test request is created", "startEnd", 0),
      node("patient", "Hasta bilgileri alınır", "Patient information is received", "data", 1),
      node("form", "Test istem formu oluşturulur", "Test order form is created", "document", 2, { blank: true }),
      node("sample", "Numune alınır", "Sample is taken", "process", 3),
      node("sample-check", "Numune kontrol edilir", "Sample is checked", "control", 4, { blank: true }),
      node("sample-decision", "Numune uygun mu?", "Is the sample suitable?", "decision", 5, { blank: true }),
      node("wait", "Yeni numune beklenir", "New sample is awaited", "delay", 6, { blank: true, row: "bottom" }),
      node("analysis", "Laboratuvar analizi yapılır", "Laboratory analysis is performed", "process", 6, { row: "top" }),
      node("result-check", "Sonuçlar kontrol edilir", "Results are checked", "control", 7, { row: "top" }),
      node("reliable", "Sonuç güvenilir mi?", "Is the result reliable?", "decision", 8, { blank: true, row: "top" }),
      node("repeat", "Analiz tekrarlanır", "Analysis is repeated", "process", 9, { row: "bottom" }),
      node("report", "Laboratuvar raporu hazırlanır", "Laboratory report is prepared", "document", 9, { row: "top" }),
      node("send", "Sonuç doktora gönderilir", "Result is sent to the doctor", "data", 10),
      node("end", "Süreç tamamlanır", "Process is completed", "startEnd", 11),
    ],
    edges: [edge("start", "patient"), edge("patient", "form"), edge("form", "sample"), edge("sample", "sample-check"), edge("sample-check", "sample-decision"), edge("sample-decision", "wait", no), edge("wait", "sample-check", back, true), edge("sample-decision", "analysis", yes), edge("analysis", "result-check"), edge("result-check", "reliable"), edge("reliable", "repeat", no), edge("repeat", "analysis", back, true), edge("reliable", "report", yes), edge("report", "send"), edge("send", "end")],
  },
  {
    id: "hard-customer-complaint",
    difficulty: "hard",
    title: text("Müşteri Şikâyeti Çözüm Süreci", "Customer Complaint Resolution Process"),
    nodes: [
      node("start", "Şikâyet alınır", "Complaint is received", "startEnd", 0),
      node("info", "Müşteri ve şikâyet bilgileri kaydedilir", "Customer and complaint information is recorded", "data", 1),
      node("form", "Şikâyet kayıt formu oluşturulur", "Complaint record form is created", "document", 2, { blank: true }),
      node("review", "Şikâyet incelenir", "Complaint is reviewed", "control", 3, { blank: true }),
      node("valid", "Şikâyet geçerli mi?", "Is the complaint valid?", "decision", 4),
      node("reject", "Müşteriye ret bilgisi gönderilir", "Rejection information is sent to customer", "data", 5, { row: "bottom" }),
      node("reject-end", "Süreç biter", "Process ends", "startEnd", 6, { row: "bottom" }),
      node("research", "Sorunun nedeni araştırılır", "Cause of the problem is researched", "process", 5, { row: "top" }),
      node("possible", "Çözüm uygulanabilir mi?", "Can the solution be applied?", "decision", 6, { blank: true, row: "top" }),
      node("wait", "Uzman birimden yanıt beklenir", "Response from specialist unit is awaited", "delay", 7, { blank: true, row: "bottom" }),
      node("apply", "Çözüm uygulanır", "Solution is applied", "process", 7, { row: "top" }),
      node("result", "Sonuç kontrol edilir", "Result is checked", "control", 8, { row: "top" }),
      node("satisfied", "Müşteri memnun mu?", "Is the customer satisfied?", "decision", 9, { blank: true, row: "top" }),
      node("improve", "Yeni çözüm geliştirilir", "New solution is developed", "process", 10, { row: "bottom" }),
      node("report", "Çözüm raporu hazırlanır", "Resolution report is prepared", "document", 10, { row: "top" }),
      node("send", "Müşteriye sonuç gönderilir", "Result is sent to customer", "data", 11),
      node("end", "Şikâyet kapatılır", "Complaint is closed", "startEnd", 12),
    ],
    edges: [edge("start", "info"), edge("info", "form"), edge("form", "review"), edge("review", "valid"), edge("valid", "reject", no), edge("reject", "reject-end"), edge("valid", "research", yes), edge("research", "possible"), edge("possible", "wait", no), edge("wait", "possible", back, true), edge("possible", "apply", yes), edge("apply", "result"), edge("result", "satisfied"), edge("satisfied", "improve", no), edge("improve", "apply", back, true), edge("satisfied", "report", yes), edge("report", "send"), edge("send", "end")],
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

export function buildFlowchartSymbolRounds(sessionId: string) {
  const difficulties: FlowchartDiagram["difficulty"][] = ["easy", "medium", "hard"];
  return difficulties.map((difficulty) => {
    const candidates = flowchartPool.filter((diagram) => diagram.difficulty === difficulty);
    return candidates[hashSeed(`${sessionId}:week-3-module-3:${difficulty}`) % candidates.length];
  });
}
