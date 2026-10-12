import type { Locale } from "@/lib/i18n/dictionaries";

export type LocalizedText = Record<Locale, string>;
export type FactoryStageId = "mechanical" | "biological" | "sociocultural";
export type FactoryZone = "machine" | "sensor" | "workers";
export type FactoryEffectType = "organized" | "overdrive" | "jam" | "feedback" | "blind" | "shortage" | "cooperate" | "conflict" | "pollution" | "recover";
export type FactoryMetrics = { production: number; adaptation: number; participation: number };

export type FactoryOption = {
  id: string;
  text: LocalizedText;
  isCorrect: boolean;
  effectType: FactoryEffectType;
  metrics: FactoryMetrics;
  explanation: LocalizedText;
  notification: LocalizedText;
  timeline: LocalizedText[];
};

export type FactoryScenario = {
  id: string;
  stage: FactoryStageId;
  event: LocalizedText;
  question: LocalizedText;
  hints: Record<FactoryZone, LocalizedText>;
  repairZone: FactoryZone;
  learning: LocalizedText;
  options: [FactoryOption, FactoryOption, FactoryOption];
};

export type PresentedFactoryScenario = Omit<FactoryScenario, "options"> & { options: FactoryOption[] };

const text = (tr: string, en: string): LocalizedText => ({ tr, en });
const metric = (production: number, adaptation: number, participation: number): FactoryMetrics => ({ production, adaptation, participation });

const effectTimelines: Record<FactoryEffectType, LocalizedText[]> = {
  organized: [text("Görevler ayrıldı", "Roles separated"), text("Akış dengelendi", "Flow balanced"), text("İstasyonlar doldu", "Stations filled")],
  overdrive: [text("Hız artırıldı", "Speed increased"), text("Hat ısındı", "Line overheated"), text("Sıkışma oluştu", "A jam formed")],
  jam: [text("Sorun ertelendi", "Problem ignored"), text("Paketler birikti", "Packages piled up"), text("Hat durdu", "The line stopped")],
  feedback: [text("Sinyal okundu", "Signal read"), text("Plan güncellendi", "Plan updated"), text("Üretim uyumlandı", "Production adapted")],
  blind: [text("Veri kapatıldı", "Data was disabled"), text("Değişim kaçırıldı", "Change was missed"), text("Yanlış ürün birikti", "Wrong stock accumulated")],
  shortage: [text("İhtiyaç görülmedi", "Need was missed"), text("Malzeme azaldı", "Materials ran low"), text("İstasyon boş kaldı", "A station stood empty")],
  cooperate: [text("Görüşler toplandı", "Ideas were gathered"), text("Karar paylaşıldı", "Decision was shared"), text("Ekip birlikte üretti", "The team produced together")],
  conflict: [text("Sesler bastırıldı", "Voices were suppressed"), text("Gerilim arttı", "Tension increased"), text("Akış yavaşladı", "Flow slowed")],
  pollution: [text("Atık görmezden gelindi", "Waste was ignored"), text("Duman arttı", "Smoke increased"), text("Çevre ve üretim zarar gördü", "Environment and output suffered")],
  recover: [text("Arıza bulundu", "Fault located"), text("Doğru bölge onarıldı", "Correct zone repaired"), text("Akış yeniden başladı", "Flow resumed")],
};

const option = (
  id: string,
  tr: string,
  en: string,
  isCorrect: boolean,
  effectType: FactoryEffectType,
  metrics: FactoryMetrics,
  explanationTr: string,
  explanationEn: string,
  notificationTr: string,
  notificationEn: string,
): FactoryOption => ({
  id,
  text: text(tr, en),
  isCorrect,
  effectType,
  metrics,
  explanation: text(explanationTr, explanationEn),
  notification: text(notificationTr, notificationEn),
  timeline: effectTimelines[effectType],
});

const hints = (machineTr: string, machineEn: string, sensorTr: string, sensorEn: string, workersTr: string, workersEn: string): Record<FactoryZone, LocalizedText> => ({
  machine: text(machineTr, machineEn),
  sensor: text(sensorTr, sensorEn),
  workers: text(workersTr, workersEn),
});

export const factoryStageLabels: Record<FactoryStageId, LocalizedText> = {
  mechanical: text("Mekanik Sistem", "Mechanical System"),
  biological: text("Biyolojik Sistem", "Biological System"),
  sociocultural: text("Sosyo-Kültürel Sistem", "Socio-Cultural System"),
};

export const factoryZoneLabels: Record<FactoryZone, LocalizedText> = {
  machine: text("Makine", "Machine"),
  sensor: text("Sensör", "Sensor"),
  workers: text("Çalışanlar", "Workers"),
};

export const factoryScenarioPool: FactoryScenario[] = [
  {
    id: "W4M1-M01", stage: "mechanical",
    event: text("Aynı iş iki istasyonda tekrarlanıyor; bir istasyon ise boş bekliyor.", "The same job is repeated at two stations while another station sits empty."),
    question: text("Üretim düzenini nasıl kurarsın?", "How will you organize production?"),
    hints: hints("Makine iki kez aynı işlemi yapıyor.", "The machine performs the same task twice.", "Sensör akışın bir noktada yığıldığını gösteriyor.", "The sensor shows a buildup at one point.", "Çalışanların görev sınırları belirsiz.", "The workers' role boundaries are unclear."),
    repairZone: "machine",
    learning: text("Mekanik model, açık görevler ve koordineli iş bölümüyle düzen sağlar.", "The mechanical model creates order through clear roles and coordinated division of labor."),
    options: [
      option("M01-A", "Görevleri netleştirip istasyonları yeniden düzenle", "Clarify roles and reorganize the stations", true, "organized", metric(12, 2, 3), "İş bölümü tekrarı kaldırdı ve boş istasyonu devreye aldı.", "Division of labor removed duplication and activated the empty station.", "Görevler ayrıldı; hat dengeli çalışıyor.", "Roles were separated; the line is balanced."),
      option("M01-B", "Tüm makinelerin hızını iki katına çıkar", "Double the speed of every machine", false, "overdrive", metric(-14, -5, -4), "Hız, bozuk düzeni büyüttü ve hatta sıkışma yarattı.", "Speed amplified the faulty setup and jammed the line.", "Hat aşırı hızlandı ve paketler sıkıştı!", "The line is overdriven and packages are jammed!"),
      option("M01-C", "Boş istasyonu görmezden gel", "Ignore the empty station", false, "jam", metric(-9, -5, -6), "Tekrarlanan iş sürdüğü için darboğaz büyüdü.", "The bottleneck grew because duplicate work continued.", "Darboğaz büyüyor; üretim durmak üzere.", "The bottleneck is growing; production is about to stop."),
    ],
  },
  {
    id: "W4M1-M02", stage: "mechanical",
    event: text("Paketleme istasyonu, montajdan daha yavaş çalışıyor.", "The packing station is running slower than assembly."),
    question: text("Darboğazı nasıl yönetirsin?", "How will you manage the bottleneck?"),
    hints: hints("Montaj makinesi paketlemeyi bekliyor.", "The assembly machine is waiting for packing.", "Sensör paketleme önünde artan kuyruk ölçüyor.", "The sensor measures a growing queue before packing.", "Çalışanlar malzemeyi elle taşımaya başladı.", "Workers have begun moving materials by hand."),
    repairZone: "machine",
    learning: text("Kapasiteler dengelenmeden yalnızca bir parçayı hızlandırmak sistemi hızlandırmaz.", "Speeding up one part does not speed up the system unless capacities are balanced."),
    options: [
      option("M02-A", "İstasyon kapasitelerini dengele", "Balance station capacities", true, "organized", metric(11, 3, 2), "Kapasite dengesi darboğazı giderdi.", "Capacity balancing removed the bottleneck.", "Paketleme ve montaj aynı ritimde.", "Packing and assembly now share the same rhythm."),
      option("M02-B", "Montajı daha da hızlandır", "Speed up assembly even more", false, "overdrive", metric(-12, -4, -3), "Darboğazın önüne daha fazla iş yığıldı.", "More work piled up before the bottleneck.", "Kuyruk büyüdü; hat aşırı yüklendi.", "The queue grew; the line is overloaded."),
      option("M02-C", "Kuyruğu vardiya sonuna kadar beklet", "Leave the queue until the end of the shift", false, "jam", metric(-8, -3, -5), "Beklemek akış sorununu çözmedi.", "Waiting did not solve the flow problem.", "Paketler birikti ve geç teslimat başladı.", "Packages piled up and deliveries are late."),
    ],
  },
  {
    id: "W4M1-M03", stage: "mechanical",
    event: text("Bakım zamanı gelen dişli düzensiz ses çıkarıyor.", "A gear due for maintenance is making an irregular noise."),
    question: text("Üretimi nasıl korursun?", "How will you protect production?"),
    hints: hints("Dişli titreşiyor ve ısınıyor.", "The gear is vibrating and heating up.", "Sensör sıcaklığın eşik değere yaklaştığını bildiriyor.", "The sensor reports temperature nearing its limit.", "Çalışanlar plansız duruştan endişeli.", "Workers are concerned about an unplanned stop."),
    repairZone: "machine",
    learning: text("Mekanik düzen, önleyici bakım ve standart çalışma ister.", "Mechanical order depends on preventive maintenance and standard work."),
    options: [
      option("M03-A", "Planlı bakım için hattı güvenle durdur", "Stop the line safely for planned maintenance", true, "organized", metric(5, 6, 3), "Kısa planlı duruş büyük arızayı önledi.", "A short planned stop prevented a major failure.", "Bakım tamamlandı; dişli düzenli dönüyor.", "Maintenance is complete; the gear turns smoothly."),
      option("M03-B", "Sesi bastırıp üretime devam et", "Mask the noise and keep producing", false, "jam", metric(-15, -7, -6), "Belirtiyi gizlemek arızayı büyüttü.", "Masking the symptom made the fault worse.", "Dişli kilitlendi; hat aniden durdu!", "The gear locked; the line stopped suddenly!"),
      option("M03-C", "Makineyi daha yüksek devirde çalıştır", "Run the machine at higher speed", false, "overdrive", metric(-16, -8, -5), "Aşırı devir ısıyı ve hasarı artırdı.", "Overdrive increased heat and damage.", "Makine aşırı ısındı ve güvenlik duruşu verdi.", "The machine overheated and triggered a safety stop."),
    ],
  },
  {
    id: "W4M1-M04", stage: "mechanical",
    event: text("Vardiyalar aynı ürünü farklı adımlarla üretiyor.", "Shifts produce the same product using different steps."),
    question: text("Kalite farkını nasıl azaltırsın?", "How will you reduce quality variation?"),
    hints: hints("Makine ayarları her vardiyada değişiyor.", "Machine settings change each shift.", "Sensör ölçümleri vardiyalar arasında dalgalı.", "Sensor readings fluctuate between shifts.", "Çalışanlar ortak bir iş sırası kullanmıyor.", "Workers do not use a shared work sequence."),
    repairZone: "machine",
    learning: text("Standartlaştırma, tekrarlanabilir mekanik düzenin temelidir.", "Standardization is the foundation of repeatable mechanical order."),
    options: [
      option("M04-A", "Ortak iş standardı ve kontrol listesi oluştur", "Create a shared work standard and checklist", true, "organized", metric(9, 4, 4), "Ortak standart değişkenliği azalttı.", "A shared standard reduced variation.", "Vardiyalar aynı güvenli sırayı izliyor.", "Shifts now follow the same safe sequence."),
      option("M04-B", "En hızlı vardiyanın hızını herkese uygula", "Impose the fastest shift's speed on everyone", false, "overdrive", metric(-9, -3, -9), "Bağlamı görmeden hız dayatmak hata üretti.", "Imposing speed without context created errors.", "Hız arttı; kalite ve katılım düştü.", "Speed rose; quality and participation fell."),
      option("M04-C", "Farklılıkları kayıt altına alma", "Do not record the differences", false, "blind", metric(-7, -8, -6), "Ölçüm olmayınca kök neden görünmez kaldı.", "Without measurement, the root cause stayed hidden.", "Kalite farkı görünmez kaldı ve büyüdü.", "Quality variation stayed hidden and grew."),
    ],
  },
  {
    id: "W4M1-M05", stage: "mechanical",
    event: text("Hammadde kutuları yanlış istasyonlara bırakılıyor.", "Raw-material boxes are being delivered to the wrong stations."),
    question: text("Akışı nasıl düzenlersin?", "How will you organize the flow?"),
    hints: hints("Makine doğru parçayı beklerken boşta kalıyor.", "The machine sits idle while waiting for the correct part.", "Sensör sık malzeme değişimi algılıyor.", "The sensor detects frequent material swaps.", "Çalışanlar kutu etiketlerini ayırt etmekte zorlanıyor.", "Workers struggle to distinguish box labels."),
    repairZone: "machine",
    learning: text("Görsel düzen ve doğru yerleşim, sistemde gereksiz hareketi azaltır.", "Visual organization and correct placement reduce unnecessary movement in a system."),
    options: [
      option("M05-A", "Renk kodlu sabit malzeme alanları kur", "Create color-coded fixed material zones", true, "organized", metric(10, 4, 5), "Görsel yerleşim doğru parçayı doğru noktaya bağladı.", "Visual layout connected each part to the right point.", "Malzeme akışı sadeleşti; bekleme azaldı.", "Material flow is clearer and waiting decreased."),
      option("M05-B", "Kutuları koridora yığ", "Stack the boxes in the corridor", false, "jam", metric(-10, -4, -7), "Düzensiz stok ulaşımı ve güvenliği bozdu.", "Disorganized stock hurt access and safety.", "Koridor kapandı; hat beslenemiyor.", "The corridor is blocked; the line cannot be supplied."),
      option("M05-C", "Makine hızını artırarak zamanı telafi et", "Compensate by increasing machine speed", false, "overdrive", metric(-8, -4, -5), "Hız, yanlış malzeme akışını düzeltmedi.", "Speed did not fix the incorrect material flow.", "Yanlış parça daha hızlı işlendi.", "The wrong parts were processed faster."),
    ],
  },
  {
    id: "W4M1-M06", stage: "mechanical",
    event: text("Kalite kontrol adımı bazen atlanıyor.", "The quality-control step is sometimes skipped."),
    question: text("Süreci nasıl güvenilir kılarsın?", "How will you make the process reliable?"),
    hints: hints("Makine hatalı paketi sonraki adıma geçiriyor.", "The machine passes a faulty package onward.", "Sensör kontrol kaydı olmayan ürünleri işaretliyor.", "The sensor flags products with no inspection record.", "Çalışanlar kontrolün ne zaman yapılacağından emin değil.", "Workers are unsure when inspection should happen."),
    repairZone: "machine",
    learning: text("Kontrolün akışa yerleşmesi, mekanik sürecin güvenilirliğini artırır.", "Embedding control in the flow increases the reliability of a mechanical process."),
    options: [
      option("M06-A", "Kontrolü zorunlu bir süreç adımı yap", "Make inspection a mandatory process step", true, "organized", metric(7, 5, 4), "Kontrol noktası akışın doğal parçası oldu.", "Inspection became a natural part of the flow.", "Hatalı paketler hatta ilerlemeden ayrılıyor.", "Faulty packages are removed before advancing."),
      option("M06-B", "Kontrolü yalnızca şikâyet gelince yap", "Inspect only after a complaint", false, "blind", metric(-8, -9, -4), "Geç geri bildirim hatalı ürünleri durduramadı.", "Late feedback could not stop faulty products.", "Hatalar müşteriye kadar ulaştı.", "Defects reached the customer."),
      option("M06-C", "Kontrol süresini sıfıra yaklaştır", "Reduce inspection time almost to zero", false, "overdrive", metric(-7, -5, -5), "Aşırı hız kontrolün amacını ortadan kaldırdı.", "Excessive speed defeated the purpose of inspection.", "Kontrol var görünüyor ama hatalar geçiyor.", "Inspection exists on paper, but defects pass through."),
    ],
  },
  {
    id: "W4M1-B01", stage: "biological",
    event: text("Müşteri talebi değişti; fabrika hâlâ eski ürünü aynı miktarda üretiyor.", "Customer demand changed, but the factory still produces the old product at the same volume."),
    question: text("Fabrikayı çevreye nasıl uyarlarsın?", "How will you adapt the factory to its environment?"),
    hints: hints("Makine eski ürünle stok alanını dolduruyor.", "The machine is filling stock with the old product.", "Sensör yeni talep sinyali gönderiyor.", "The sensor is sending a new demand signal.", "Çalışanlar müşteriden farklı istekler duyuyor.", "Workers are hearing different requests from customers."),
    repairZone: "sensor",
    learning: text("Biyolojik model, çevreden gelen geri bildirimle uyum sağlar.", "The biological model adapts through feedback from its environment."),
    options: [
      option("B01-A", "Talep verisini plana bağlayıp üretimi ayarla", "Connect demand data to planning and adjust production", true, "feedback", metric(7, 14, 5), "Geri bildirim üretim planını çevreye uyarladı.", "Feedback aligned the production plan with the environment.", "Yeni talep okundu; üretim uyumlandı.", "New demand was read; production adapted."),
      option("B01-B", "Eski plana aynen devam et", "Continue with the old plan", false, "blind", metric(-10, -15, -4), "Çevre sinyali görmezden gelindiği için stok şişti.", "Stock grew because the environmental signal was ignored.", "Eski ürün stoku büyüyor!", "Stock of the old product is growing!"),
      option("B01-C", "Sensörü kapat; plan değişmesin", "Disable the sensor so the plan does not change", false, "shortage", metric(-12, -16, -6), "Geri bildirimi kapatmak sistemi çevresine körleştirdi.", "Disabling feedback blinded the system to its environment.", "Fabrika talebi göremiyor ve yanlış üretim yapıyor.", "The factory cannot see demand and produces the wrong output."),
    ],
  },
  {
    id: "W4M1-B02", stage: "biological",
    event: text("Hammadde tedariki beklenmedik biçimde azaldı.", "The supply of raw materials unexpectedly decreased."),
    question: text("Sürekliliği nasıl korursun?", "How will you preserve continuity?"),
    hints: hints("Makinenin besleme haznesi hızla boşalıyor.", "The machine hopper is emptying quickly.", "Sensör üç saatlik malzeme kaldığını gösteriyor.", "The sensor shows three hours of material remaining.", "Çalışanlar alternatif malzemeyi tanıyor.", "Workers know an alternative material."),
    repairZone: "sensor",
    learning: text("Canlı sistemler kıtlık sinyalini okuyup kaynak kullanımını uyarlar.", "Living systems read shortage signals and adapt resource use."),
    options: [
      option("B02-A", "Stok sinyaline göre planı azaltıp alternatifi doğrula", "Reduce the plan from stock feedback and validate the alternative", true, "feedback", metric(3, 13, 6), "Kaynak kullanımı gerçek koşula uyarlandı.", "Resource use adapted to real conditions.", "Plan güncellendi; alternatif malzeme kontrollü kullanılıyor.", "The plan was updated; alternative material is used carefully."),
      option("B02-B", "Aynı hızla üretmeye devam et", "Keep producing at the same speed", false, "shortage", metric(-13, -11, -5), "Kıtlık sinyali yok sayılınca hat malzemesiz kaldı.", "Ignoring the shortage signal left the line without material.", "Hazne boşaldı; istasyon durdu.", "The hopper emptied; the station stopped."),
      option("B02-C", "Stok sensörünün uyarısını sustur", "Mute the stock sensor alert", false, "blind", metric(-9, -14, -5), "Uyarıyı susturmak kaynağı artırmadı.", "Muting the alert did not increase the resource.", "Kıtlık görünmez oldu ama büyümeye devam etti.", "The shortage became invisible but kept growing."),
    ],
  },
  {
    id: "W4M1-B03", stage: "biological",
    event: text("Ortam sıcaklığı yükseldi ve ürün kalitesi dalgalanıyor.", "Ambient temperature rose and product quality is fluctuating."),
    question: text("Sistem dengesini nasıl geri kurarsın?", "How will you restore system balance?"),
    hints: hints("Makine normalden sıcak çalışıyor.", "The machine is running hotter than normal.", "Sensör sıcaklık ile kalite hatasını birlikte gösteriyor.", "The sensor links temperature with quality errors.", "Çalışanlar soğutma molalarının yetmediğini söylüyor.", "Workers say cooling breaks are insufficient."),
    repairZone: "sensor",
    learning: text("Denge, değişkenlerin izlenmesi ve geri besleme ile korunur.", "Balance is maintained by monitoring variables and using feedback."),
    options: [
      option("B03-A", "Sıcaklık geri bildirimine göre hız ve soğutmayı ayarla", "Adjust speed and cooling from temperature feedback", true, "feedback", metric(5, 12, 5), "Sistem koşula göre yeni bir denge kurdu.", "The system formed a new balance for the conditions.", "Sıcaklık düştü; kalite yeniden dengeli.", "Temperature fell; quality is stable again."),
      option("B03-B", "Kalite alarmını geçici olarak kapat", "Temporarily disable the quality alarm", false, "blind", metric(-10, -13, -4), "Alarm kapanınca neden değil yalnızca görünürlük kayboldu.", "Disabling the alarm removed visibility, not the cause.", "Hata sinyali yok; hatalı ürünler birikiyor.", "There is no error signal; defective products are accumulating."),
      option("B03-C", "Hızı artırıp kaybı telafi et", "Increase speed to compensate for losses", false, "overdrive", metric(-14, -10, -6), "Ek hız ısıyı ve kalite kaybını artırdı.", "Extra speed increased heat and quality loss.", "Hat aşırı ısındı; kayıp büyüdü.", "The line overheated; losses grew."),
    ],
  },
  {
    id: "W4M1-B04", stage: "biological",
    event: text("İade oranı yavaşça yükseliyor fakat günlük üretim hedefi tutuyor.", "Returns are slowly increasing although the daily output target is met."),
    question: text("Hangi sinyali izlersin?", "Which signal will you follow?"),
    hints: hints("Makine hedef adedi tamamlıyor.", "The machine meets the output target.", "Sensör iadelerin belirli partilerde arttığını gösteriyor.", "The sensor shows returns rising in specific batches.", "Çalışanlar küçük bir ayar sapması fark etmiş.", "Workers noticed a small setting drift."),
    repairZone: "sensor",
    learning: text("Uyum yalnızca çıktı miktarını değil, gecikmeli kalite geri bildirimini de izlemeyi gerektirir.", "Adaptation requires tracking delayed quality feedback, not only output volume."),
    options: [
      option("B04-A", "İade verisini parti ve ayar kayıtlarıyla eşleştir", "Connect return data with batch and setting records", true, "feedback", metric(6, 12, 6), "Gecikmeli sinyal kök ayar sapmasını görünür kıldı.", "The delayed signal exposed the root setting drift.", "Sapma bulundu; sonraki partiler uyumlandı.", "The drift was found; following batches adapted."),
      option("B04-B", "Hedef tuttuğu için değişiklik yapma", "Make no change because the target was met", false, "blind", metric(-9, -11, -5), "Tek metrik, sistemdeki kalite kaybını sakladı.", "A single metric hid quality loss in the system.", "Üretim sürüyor; iadeler artıyor.", "Production continues; returns are rising."),
      option("B04-C", "İadeleri stoktan yenileriyle değiştir", "Replace returns with new items from stock", false, "shortage", metric(-7, -8, -4), "Belirti karşılandı ama üretim nedeni düzelmedi.", "The symptom was handled, but the production cause remained.", "Stok azalıyor; hata aynı kalıyor.", "Stock is shrinking; the fault remains."),
    ],
  },
  {
    id: "W4M1-B05", stage: "biological",
    event: text("Yeni bir rakip daha kısa teslimat süresi sunuyor.", "A new competitor offers a shorter delivery time."),
    question: text("Çevresel değişime nasıl yanıt verirsin?", "How will you respond to the environmental change?"),
    hints: hints("Makine çevrim süresi tek başına teslimatı açıklamıyor.", "Machine cycle time alone does not explain delivery.", "Sensör siparişten teslimata toplam süreyi gösteriyor.", "The sensor shows total time from order to delivery.", "Çalışanlar onay beklemelerinin uzun olduğunu söylüyor.", "Workers say approval waits are long."),
    repairZone: "sensor",
    learning: text("Çevreye uyum, bütün akıştan gelen geri bildirimi kullanır.", "Adapting to the environment uses feedback from the whole flow."),
    options: [
      option("B05-A", "Toplam teslimat akışını ölçüp beklemeleri azalt", "Measure the full delivery flow and reduce waiting", true, "feedback", metric(8, 13, 6), "Bütün akıştan gelen veri gerçek gecikmeyi gösterdi.", "Data from the whole flow revealed the real delay.", "Beklemeler azaldı; teslimat hızlandı.", "Waiting decreased; delivery became faster."),
      option("B05-B", "Yalnızca makine hızını artır", "Increase only machine speed", false, "overdrive", metric(-5, -6, -5), "Makine süresi kısaldı ama onay beklemeleri kaldı.", "Machine time fell, but approval waits remained.", "Stok hızlı büyüyor; teslimat değişmedi.", "Stock grows faster; delivery did not change."),
      option("B05-C", "Rakip verisini izlemeyi bırak", "Stop tracking competitor data", false, "blind", metric(-7, -12, -4), "Çevresel değişimi görmemek uyumu engelledi.", "Ignoring environmental change prevented adaptation.", "Pazar sinyali kayboldu; siparişler azalıyor.", "The market signal disappeared; orders are falling."),
    ],
  },
  {
    id: "W4M1-B06", stage: "biological",
    event: text("Enerji tüketimi arttı ve şebeke sık sık uyarı veriyor.", "Energy use increased and the grid is issuing frequent alerts."),
    question: text("Fabrikayı nasıl uyarlarsın?", "How will you adapt the factory?"),
    hints: hints("Makine boş beklerken de tam güç çekiyor.", "The machine draws full power while idle.", "Sensör tüketim zirvelerini vardiya başlangıcında gösteriyor.", "The sensor shows consumption peaks at shift start.", "Çalışanlar makineleri aynı anda başlatıyor.", "Workers start machines at the same time."),
    repairZone: "sensor",
    learning: text("Kaynak geri bildirimi, çalışma ritmini çevresel sınırlara uyarlar.", "Resource feedback adapts operating rhythm to environmental limits."),
    options: [
      option("B06-A", "Tüketim verisine göre kademeli başlatma uygula", "Use staggered starts based on consumption data", true, "feedback", metric(7, 11, 5), "Enerji geri bildirimi çalışma ritmini dengeledi.", "Energy feedback balanced the operating rhythm.", "Zirve tüketim düştü; üretim sürüyor.", "Peak use dropped; production continues."),
      option("B06-B", "Uyarıları kapatıp aynı düzende sürdür", "Disable alerts and keep the same pattern", false, "blind", metric(-8, -13, -4), "Uyarıyı kapatmak çevresel sınırı kaldırmadı.", "Disabling the alert did not remove the environmental limit.", "Şebeke sinyali görünmüyor; kesinti yaklaşıyor.", "The grid signal is hidden; an outage is approaching."),
      option("B06-C", "Tüm makineleri daha erken aynı anda başlat", "Start every machine earlier at the same time", false, "shortage", metric(-11, -10, -5), "Eşzamanlı yük kaynak yetersizliğini büyüttü.", "Simultaneous load worsened the resource shortage.", "Enerji sınırı aşıldı; hatlar kapandı.", "The energy limit was exceeded; lines shut down."),
    ],
  },
  {
    id: "W4M1-S01", stage: "sociocultural",
    event: text("Yönetim daha fazla çıktı istiyor; çalışanlar güvenlik ve yorgunluk sorunu bildiriyor.", "Management wants more output; workers report safety and fatigue problems."),
    question: text("Kararı nasıl oluşturursun?", "How will you form the decision?"),
    hints: hints("Makine hız artırmaya hazır ama koruyucu bakım bekliyor.", "The machine can speed up but awaits protective maintenance.", "Sensör küçük güvenlik duruşlarının arttığını gösteriyor.", "The sensor shows an increase in minor safety stops.", "Çalışanların deneyimi mevcut hedefin riskli olduğunu söylüyor.", "Worker experience says the current target is risky."),
    repairZone: "workers",
    learning: text("Sosyo-kültürel model, amaçları ve anlamları katılımla uzlaştırır.", "The socio-cultural model reconciles goals and meanings through participation."),
    options: [
      option("S01-A", "Çalışanlarla güvenli üretim hedefini birlikte belirle", "Set a safe output target together with workers", true, "cooperate", metric(8, 7, 14), "Katılımcı karar, üretim ve güvenliği ortak amaçta buluşturdu.", "Participatory decision-making aligned output and safety around a shared purpose.", "Ekip ortak hedefte anlaştı; güvenli akış başladı.", "The team agreed on a shared target; safe flow began."),
      option("S01-B", "Şikâyetleri dikkate alma", "Ignore the complaints", false, "conflict", metric(-9, -6, -16), "Çalışan bilgisini dışlamak gerilim ve hata yarattı.", "Excluding worker knowledge created tension and errors.", "Gerilim yükseldi; ekip akışı yavaşlattı.", "Tension rose; team flow slowed."),
      option("S01-C", "Hedefi hemen yüzde yirmi artır", "Immediately raise the target by twenty percent", false, "overdrive", metric(-12, -6, -14), "Ortak karar olmadan artırılan hedef güveni ve güvenliği bozdu.", "Raising the target without shared decision-making damaged trust and safety.", "Hat hızlandı; güvenlik duruşları arttı!", "The line sped up; safety stops increased!"),
    ],
  },
  {
    id: "W4M1-S02", stage: "sociocultural",
    event: text("Yeni vardiya planı çalışanların bakım sorumluluklarıyla çakışıyor.", "A new shift plan conflicts with workers' care responsibilities."),
    question: text("Planı nasıl sürdürülebilir kılarsın?", "How will you make the plan sustainable?"),
    hints: hints("Makine vardiya başında operatör bekliyor.", "The machine waits for operators at shift start.", "Sensör geç başlangıçların belirli günlerde yoğunlaştığını gösteriyor.", "The sensor shows late starts clustering on certain days.", "Çalışanlar esnek başlangıç önerileri hazırlamış.", "Workers have prepared flexible-start suggestions."),
    repairZone: "workers",
    learning: text("İnsanların yaşam bağlamı, sosyo-kültürel sistemin çalışma biçimini etkiler.", "People's life context shapes how a socio-cultural system works."),
    options: [
      option("S02-A", "Ekip önerileriyle esnek vardiya düzeni kur", "Build a flexible shift plan with team input", true, "cooperate", metric(6, 8, 13), "Ortak düzen hem işi hem yaşam koşullarını gözetti.", "The shared arrangement respected both work and life conditions.", "Vardiyalar sahiplenildi; başlangıçlar düzenli.", "The shifts gained ownership; starts are consistent."),
      option("S02-B", "Geç kalan herkesi cezalandır", "Punish everyone who arrives late", false, "conflict", metric(-7, -5, -15), "Koşulları anlamadan ceza uygulamak güveni azalttı.", "Punishment without understanding conditions reduced trust.", "Gerilim arttı; devamsızlık büyüyor.", "Tension rose; absence is increasing."),
      option("S02-C", "Makineyi operatör olmadan çalıştır", "Run the machine without an operator", false, "overdrive", metric(-12, -5, -10), "İnsan rolünü yok saymak güvenlik riski yarattı.", "Ignoring the human role created a safety risk.", "Kontrolsüz hat güvenlik duruşuna geçti.", "The unattended line entered a safety stop."),
    ],
  },
  {
    id: "W4M1-S03", stage: "sociocultural",
    event: text("Deneyimli çalışanlar kalite bilgisini yeni ekiple paylaşmıyor.", "Experienced workers are not sharing quality knowledge with the new team."),
    question: text("Ortak öğrenmeyi nasıl kurarsın?", "How will you create shared learning?"),
    hints: hints("Makine ayarı kişiden kişiye değişiyor.", "Machine settings vary from person to person.", "Sensör yeni vardiyada daha fazla hata gösteriyor.", "The sensor shows more errors on the new shift.", "Çalışanlar bilginin yalnızca ustalarda kaldığını söylüyor.", "Workers say knowledge remains only with veterans."),
    repairZone: "workers",
    learning: text("Sosyo-kültürel sistemlerde bilgi, ilişki ve ortak pratikle yaşar.", "In socio-cultural systems, knowledge lives through relationships and shared practice."),
    options: [
      option("S03-A", "Usta-yeni çalışan eşleşmesi ve ortak öğrenme saati kur", "Create veteran-newcomer pairs and shared learning time", true, "cooperate", metric(7, 8, 14), "Bilgi ilişki içinde görünür ve ortak hale geldi.", "Knowledge became visible and shared through relationships.", "Ekip birlikte öğreniyor; kalite dengeleniyor.", "The team is learning together; quality is stabilizing."),
      option("S03-B", "Bilgiyi paylaşmayanları ekipten dışla", "Exclude those who do not share knowledge", false, "conflict", metric(-6, -5, -15), "Dışlama bilgi akışını daha da kapattı.", "Exclusion closed knowledge flow even further.", "Gruplar ayrıştı; işbirliği durdu.", "Groups split apart; cooperation stopped."),
      option("S03-C", "Yeni çalışanlardan daha hızlı olmalarını iste", "Ask newcomers to work faster", false, "overdrive", metric(-9, -5, -12), "Öğrenme olmadan hız baskısı hatayı artırdı.", "Speed pressure without learning increased errors.", "Hız baskısı arttı; hatalar çoğaldı.", "Speed pressure rose; errors multiplied."),
    ],
  },
  {
    id: "W4M1-S04", stage: "sociocultural",
    event: text("Fabrikanın atığı mahallede koku ve tepki oluşturuyor.", "Factory waste is causing odor and concern in the neighborhood."),
    question: text("Fabrikanın çevresiyle ilişkisini nasıl yönetirsin?", "How will you manage the factory's relationship with its community?"),
    hints: hints("Makine atık miktarını artırmış.", "The machine is generating more waste.", "Sensör emisyon sınırına yaklaşıldığını gösteriyor.", "The sensor shows emissions nearing the limit.", "Çalışanlar ve mahalle sakinleri çözüm toplantısı istiyor.", "Workers and residents want a solution meeting."),
    repairZone: "workers",
    learning: text("Sosyo-kültürel sistem, paydaşların değerlerini ve ortak yaşamı hesaba katar.", "A socio-cultural system accounts for stakeholder values and shared life."),
    options: [
      option("S04-A", "Çalışanlar ve mahalleyle atık azaltma planı oluştur", "Create a waste-reduction plan with workers and residents", true, "cooperate", metric(4, 10, 13), "Paydaş katılımı uygulanabilir ortak çözüm üretti.", "Stakeholder participation produced a workable shared solution.", "Atık planı başladı; güven yeniden kuruluyor.", "The waste plan began; trust is rebuilding."),
      option("S04-B", "Kokuyla ilgili şikâyetleri reddet", "Dismiss the odor complaints", false, "pollution", metric(-7, -12, -15), "Toplum sinyalini yok saymak çevresel ve sosyal zararı büyüttü.", "Ignoring the community signal increased environmental and social harm.", "Duman arttı; mahalleyle bağ koptu.", "Smoke increased; the community relationship broke down."),
      option("S04-C", "Üretim hedefini yükselt", "Raise the production target", false, "overdrive", metric(-9, -10, -13), "Daha fazla çıktı atık ve çatışmayı artırdı.", "More output increased waste and conflict.", "Üretim hızlandı; atık ve tepki büyüdü.", "Production sped up; waste and opposition grew."),
    ],
  },
  {
    id: "W4M1-S05", stage: "sociocultural",
    event: text("Yönetim yeni teknolojiyi açıklamadan uygulamak istiyor.", "Management wants to introduce new technology without explaining it."),
    question: text("Değişimi nasıl yönetirsin?", "How will you manage the change?"),
    hints: hints("Makine yeni arayüzle çalışacak.", "The machine will use a new interface.", "Sensör pilot denemede öğrenme süresinin gerektiğini gösteriyor.", "The sensor pilot shows that learning time is needed.", "Çalışanlar işlerini kaybetmekten endişeli.", "Workers worry about losing their jobs."),
    repairZone: "workers",
    learning: text("Teknolojik değişim, anlam, güven ve katılım boyutlarıyla birlikte yönetilir.", "Technological change must be managed together with meaning, trust, and participation."),
    options: [
      option("S05-A", "Amacı açıkla; çalışanlarla eğitim ve geçiş planı yap", "Explain the purpose and plan training and transition with workers", true, "cooperate", metric(6, 10, 14), "Açıklık ve katılım değişimin sahiplenilmesini sağladı.", "Clarity and participation built ownership of the change.", "Ekip yeni sistemi güvenle öğreniyor.", "The team is learning the new system with confidence."),
      option("S05-B", "Soruları yasakla ve sistemi bir gecede değiştir", "Ban questions and switch systems overnight", false, "conflict", metric(-10, -9, -16), "Anlamsız ve katılımsız değişim direnç doğurdu.", "Change without meaning or participation created resistance.", "Belirsizlik çatışmaya dönüştü; akış aksıyor.", "Uncertainty became conflict; flow is disrupted."),
      option("S05-C", "Eğitim olmadan hedefi artır", "Raise targets without training", false, "overdrive", metric(-11, -8, -14), "Öğrenme süresi olmadan hız baskısı hata üretti.", "Speed pressure without learning time produced errors.", "Yeni arayüzde hatalar ve stres arttı.", "Errors and stress rose with the new interface."),
    ],
  },
  {
    id: "W4M1-S06", stage: "sociocultural",
    event: text("İki ekip teslimat gecikmesi için birbirini suçluyor.", "Two teams blame each other for delivery delays."),
    question: text("Ortak amacı nasıl geri kurarsın?", "How will you restore a shared purpose?"),
    hints: hints("Makine ekip değişiminde uzun süre boş kalıyor.", "The machine sits idle for long periods during handoffs.", "Sensör gecikmenin ekipler arası devirde oluştuğunu gösteriyor.", "The sensor shows delays occurring at team handoffs.", "Çalışanlar başarı ölçütlerinin birbirine zıt olduğunu söylüyor.", "Workers say their success measures conflict."),
    repairZone: "workers",
    learning: text("Ortak amaç ve birlikte tasarlanan ölçütler, alt gruplar arasındaki çatışmayı azaltır.", "A shared purpose and jointly designed measures reduce conflict between subgroups."),
    options: [
      option("S06-A", "Ekiplerle ortak teslimat amacı ve devir kuralı belirle", "Define a shared delivery goal and handoff rule with both teams", true, "cooperate", metric(8, 8, 13), "Ortak ölçüt yerel hedefleri bütünün amacıyla birleştirdi.", "A shared measure aligned local goals with the whole system's purpose.", "Ekipler aynı hedefe çalışıyor; devir hızlandı.", "Teams now work toward one goal; handoffs are faster."),
      option("S06-B", "Bir ekibi herkesin önünde suçla", "Blame one team publicly", false, "conflict", metric(-8, -6, -16), "Suçlama savunmayı artırdı ve bilgi paylaşımını azalttı.", "Blame increased defensiveness and reduced information sharing.", "Çatışma büyüdü; devir tamamen durdu.", "Conflict grew; the handoff stopped completely."),
      option("S06-C", "Her iki ekibin hedefini ayrı ayrı yükselt", "Raise both teams' targets separately", false, "overdrive", metric(-7, -5, -13), "Yerel baskı ortak akışı daha da parçaladı.", "Local pressure fragmented the shared flow further.", "Ekipler hızlandı ama aradaki kuyruk büyüdü.", "Teams sped up, but the queue between them grew."),
    ],
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

export function buildFactoryRound(seedKey: string): PresentedFactoryScenario[] {
  const random = seededRandom(hashSeed(`week-4-module-1-factory:${seedKey}`));
  const stageOrder: FactoryStageId[] = ["mechanical", "biological", "sociocultural"];
  return stageOrder.flatMap((stage) => {
    const stageScenarios = factoryScenarioPool.filter((scenario) => scenario.stage === stage);
    const mandatory = stageScenarios[0]!;
    const selected = [mandatory, ...shuffle(stageScenarios.slice(1), random).slice(0, 2)];
    return selected.map((scenario) => ({ ...scenario, options: shuffle(scenario.options, random) }));
  });
}

export function clampMetric(value: number) {
  return Math.max(0, Math.min(100, value));
}
