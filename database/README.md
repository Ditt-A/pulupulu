# Database akun Pulupulu

Jalankan `npm run seed` untuk membuat `database/pulupulu.sqlite` dan mengisi 13 akun anggota serta satu akun admin.

Password awal berada di `server/seed-data.mjs` agar proses seeding dapat diulang. Di SQLite, password hanya disimpan sebagai salted scrypt hash dan seluruh akun ditandai untuk mengganti password setelah login pertama.

File SQLite tidak disimpan ke Git karena berisi data autentikasi lokal.

