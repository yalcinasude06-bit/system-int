# Yük testi

Bu betik, öğretmen oturumu oluşturma ve modül yönetimi için uygulamanın API rotalarını; öğrenci katılımı, durum alma ve gönderim için Supabase RPC'lerini kullanır. Test hedefi mutlaka üretimden ayrı olmalıdır. Betik, `LOADTEST_ENVIRONMENT=staging` ve `LOADTEST_ALLOW_CLEANUP=true` olmadan çalışmaz; test öğretmenlerine ait oturum ve profilleri hem öncesinde hem sonrasında service-role ile temizler.

## Hazırlık

`.env.loadtest` dosyasını (Git'e eklemeden) aşağıdaki değerlerle oluşturun:

```dotenv
LOADTEST_ENVIRONMENT=staging
LOADTEST_ALLOW_CLEANUP=true
LOADTEST_APP_URL=https://staging-or-preview.example.com
LOADTEST_SUPABASE_URL=https://staging-project.supabase.co
LOADTEST_SUPABASE_ANON_KEY=...
LOADTEST_SERVICE_ROLE_KEY=...
LOADTEST_TEACHER_ACCOUNTS='[{"username":"...","password":"..."},{"username":"...","password":"..."},{"username":"...","password":"..."},{"username":"...","password":"..."},{"username":"...","password":"..."}]'
```

Bu test hedefinde uygulamanın production ile aynı migration sürümü, `TEACHER_ACCOUNTS` içindeki beş test hesabı ve `ENABLE_DATA_RESET=false` bulunmalıdır. Temizliği test betiği service-role ile yapar; reset endpoint'i açılmaz.

## Çalıştırma sırası

```bash
set -a; source .env.loadtest; set +a
node scripts/loadtest/run.mjs --phase=1
node scripts/loadtest/run.mjs --phase=2
node scripts/loadtest/run.mjs --phase=3
```

Faz 1 geçmeden Faz 2, Faz 2 geçmeden Faz 3 çalıştırılmamalıdır. Her çalıştırma `reports/loadtest/` altında zaman damgalı bir rapor üretir.

## Ölçümler ve sınırlar

- Katılım ve gönderim: başarı oranı ≥ %99,5, p95 < 2.000 ms.
- Öğrencinin modül başlangıcını görmesi: Faz 1 ve 3 için ≤ 3.000 ms; Faz 2 için ≤ 5.000 ms.
- Tekil `(oturum, öğrenci)` gönderimi, puan/hız bonusu ve öğretmen kapsamlı profil puanları doğrulanır.
- Faz 3'te çapraz öğretmen erişimi 403 dönmelidir.

Uygulama öğrenci durumunu yetkili RPC üzerinden kısa aralıklı yoklama ile güncellediği için betik, ham tablo Realtime aboneliği yerine öğrencinin gerçek `get_student_game_state` görünürlük süresini ölçer. Bu, RLS'yi gevşetmeden kullanıcıya görünen teslim süresini test eder.
