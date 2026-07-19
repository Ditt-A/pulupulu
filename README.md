# Pulupulu

Website kenangan MMD FILKOM 33 dengan Vue, Vite, Vercel Function, dan PostgreSQL Neon.

## Menjalankan secara lokal

Pastikan Node.js sesuai versi pada `package.json`, lalu pasang dependensi:

```sh
npm install
```

Salin `.env.example` menjadi `.env.local`, kemudian isi connection string PostgreSQL Neon dan seluruh `SEED_PASSWORD_*` dengan password awal baru:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
SEED_PASSWORD_ALBERT_PASUNDA="Contoh#Baru2026!"
```

Jangan commit `.env.local`, connection string, atau password database ke Git. `server/seed-data.mjs` hanya menyimpan identitas akun dan nama environment variable, bukan nilai password. Password seed lama pernah tersimpan di riwayat Git, sehingga jangan dipakai kembali untuk database produksi.

Siapkan tabel dan akun awal secara berurutan:

```sh
npm run db:migrate
npm run seed
```

Keduanya juga dapat dijalankan sekaligus dengan `npm run db:setup`. Setelah itu, jalankan frontend dan API lokal:

```sh
npm run dev
```

## Deploy ke Vercel dan Neon

1. Hubungkan repository ke Vercel.
2. Tambahkan integrasi Neon melalui Vercel Marketplace dan hubungkan databasenya ke project. Integrasi tersebut menyediakan `DATABASE_URL` sebagai environment variable.
3. Ambil environment project dengan `npx vercel env pull .env.local` (atau salin `DATABASE_URL` dari Neon), lalu isi kembali seluruh `SEED_PASSWORD_*` di file lokal tersebut.
4. Jalankan `npm run db:migrate`, lalu `npm run seed` secara sengaja untuk database tujuan.
5. Deploy project. Frontend dibangun dari Vite dan endpoint `/api/*` dijalankan melalui Vercel Function.

Migrasi dan seed tidak dijalankan otomatis pada setiap deploy. Jalankan migrasi hanya saat ada perubahan schema, dan seed hanya saat ingin membuat atau memperbarui akun awal. Seeder tidak menghapus pesan yang sudah tersimpan, tetapi mereset password akun seed dan mengakhiri seluruh sesi login aktif.

Database PostgreSQL dimulai sebagai database baru. Data dari file SQLite lama tidak disalin otomatis; lakukan import terpisah jika data lama memang perlu dipertahankan.

## Pemeriksaan produksi

```sh
npm run type-check
npm run build
```
