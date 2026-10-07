# Sistem Laboratuvarı

Sistem analizi eğitimini etkileşimli modüller ve canlı sınıf oturumlarıyla
deneyime dönüştüren Next.js uygulaması.

## Yerel geliştirme

```bash
npm install
cp .env.example .env.local
npm run dev
```

Supabase şeması `supabase/migrations` klasöründedir. Migration’ları bağlı projeye
uygulamak için:

```bash
npx supabase db push
```

## Öğrenme akışı

- Öğretmen yetkisi yalnızca açık tarayıcı sekmesinde tutulur; sekme kapatıldığında yeniden
  kullanıcı adı ve şifre doğrulaması gerekir.
- Öğretmen paneli sunucu tarafında doğrulanan kullanıcı adı/şifre ve sekme kapsamlı imzalı
  oturum ile korunur. Çoklu hesaplar `TEACHER_ACCOUNTS`, imzalama anahtarı ise
  `TEACHER_TOKEN_SECRET` ile tanımlanır. Eski `TEACHER_USERNAME` / `TEACHER_PASSWORD`
  kurulumu yalnızca geriye uyumluluk için desteklenir; kaynak kodda parola bulunmaz.
- Her öğretmen yalnızca kendi oturumlarını, öğrencilerini ve genel sıralamasını görür.
  Öğretmen işlemleri doğrudan istemciden veritabanına değil, sahiplik doğrulayan sunucu
  API'leri üzerinden yapılır.
- Öğrenciler PIN, okul numarası ve ad soyad ile katılır. Aynı okul numarasıyla yeniden
  katılım puanı ve ilerlemeyi korur.
- On dört haftalık menüde Hafta 1'in beş modülü ve Hafta 3'ün süreç hiyerarşisi, eksik adım
  ve akış diyagramı modülleri aktiftir; diğer haftalar yaklaşan içerik kartını gösterir.
- Öğrenciler öğretmen modülü başlatana kadar bekleme ekranında kalır; başlangıçta 3-2-1
  geri sayımı gösterilir. Yanıt gönderildikten sonra puan ve sıralama, öğretmen sonuçları
  açıklayana kadar gizli tutulur.
- Projeksiyon paneli modül satırı içi başlat/bitir kontrollerini, büyük PIN ve QR alanını,
  oturum/genel sıralamayı sade iki sütunlu tahta görünümünde sunar.
- Oturum sıralaması `session_score`, genel sıralama ise kalıcı öğrenci profilindeki
  `total_score` alanı üzerinden canlı güncellenir.
- Modül 1, dokuz temel kavramı sistem anatomisi üzerinde kurdurur.
- Arayüz açık/pastel eğitim teması kullanır; Modül 1 çevre, amaç, sınır, arayüz,
  bileşen, ilişki, girdi, çıktı ve kısıt katmanlarını kod tabanlı SVG kanvasta gösterir.
- Modül 1 yanıtı veritabanı RPC’siyle tek sefer kabul edilir; yeniden gönderim puanı
  değiştirmez ve sayfa yenilendiğinde kilitli yerleşim geri yüklenir.
- Modül 2, talep artışından kampanya kararına uzanan on adımlı nedensel zinciri sürükleme,
  dokunma veya klavye oklarıyla oynanan tarafsız kart destesi üzerinden öğretir. Her kart 10
  puandır; yanlış seçim akışı kesmeden doğru sistem durumuna ilerler.
- Modül 3, on farklı girdi-çıktı sistemi için 3B kara kutudaki dönüşüm sürecini üç yakın seçenek
  arasından tek seçimde buldurur. Yanlışta doğru süreç 1,5 saniye gösterilir; öğretmen erken
  bitirirse o ana kadarki doğru yanıtlar kısmi puan olarak kaydedilir.
- Modül 4, on sistem türünü metinsiz SVG illüstrasyonlarla serbestçe eşleştirir. Öğrenci
  bağlantıları değiştirebilir; toplu kontrolde doğru/yanlış çizgiler ve açıklamalar gösterilir.
- Modül 5, altı ilişki türü ve 36 soruluk havuzdan dengeli seçilen on balonu; zaman, iğne
  fırlatma, geri sekme ve patlama animasyonlarıyla oynatır.

## Yük testi

Tekrarlanabilir 100 → 500 → 5×100 eşzamanlılık testleri [scripts/loadtest/README.md](scripts/loadtest/README.md)
altında tanımlıdır. Betikler, yanlışlıkla canlı sınıf verilerini etkilememek için yalnızca
`LOADTEST_ENVIRONMENT=staging` ve `LOADTEST_ALLOW_CLEANUP=true` ile işaretlenmiş izole bir
hedefte çalışır. Test sonuçları `reports/loadtest/` altında üretilir.

Öğretmen arayüzünde veri silme düğmesi yoktur. Geliştirme/test temizliği için korunan
`/api/teacher/reset` rotası, varsayılanı `false` olan `ENABLE_DATA_RESET=true` bayrağı olmadan
403 döner; Production'da bu bayrak asla etkinleştirilmemelidir.
