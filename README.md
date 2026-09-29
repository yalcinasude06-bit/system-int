# Sistem Laboratuvarı

Sistem analizi eğitimini dört etkileşimli modül, canlı sınıf oturumları ve
Supabase Realtime altyapısıyla deneyime dönüştüren Next.js uygulaması.

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

- Öğretmen oturumu tarayıcıda kalıcıdır; yenilemede mevcut sınıf ve öğrenciler yüklenir.
- Öğrenciler PIN, okul numarası ve ad soyad ile katılır. Aynı okul numarasıyla yeniden
  katılım puanı ve ilerlemeyi korur.
- Modül 1, dokuz temel kavramı sistem anatomisi üzerinde kurdurur.
- Modül 2, beş ilişki türünü ve artı/eksi kutuplu şok yayılımını simüle eder.
- Modül 3, Churchman 2-Kuralı ile dinamik sistem sınırı çizdirir.
- Modül 4, değer zincirini bilgi/malzeme kartlarıyla çalıştırır ve kriz anında
  alternatif üretim rotası kurdurur.
