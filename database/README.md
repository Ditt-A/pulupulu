# Arsip database SQLite Pulupulu

Folder ini hanya dipertahankan untuk file SQLite lokal versi lama. Backend aktif sekarang menggunakan PostgreSQL Neon melalui `DATABASE_URL`.

Jalankan `npm run db:migrate` lalu `npm run seed` untuk menyiapkan 13 akun anggota dan satu akun admin di PostgreSQL. Nilai password awal dibaca dari environment variable `SEED_PASSWORD_*` pada `.env.local`, kemudian hanya hash scrypt beserta salt yang disimpan ke database.

File SQLite lama dan `.env.local` tidak disimpan ke Git. Data SQLite tidak diimpor otomatis ke PostgreSQL.
