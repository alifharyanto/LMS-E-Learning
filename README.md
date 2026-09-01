# CourseUp LMS

Website Learning Management System modern berbasis HTML5 + Tailwind CSS + Vanilla JavaScript.

## Struktur folder

- `index.php` – landing page utama dan semua navigasi utama
- `login.php` – halaman login siswa
- `register.php` – halaman register siswa
- `dashboard.php` – dashboard profil siswa dan riwayat latihan
- `app.js` – logika aplikasi, LocalStorage, quiz CRUD, forum, dan dashboard
- `styles.css` – custom styling tambahan
- `koneksi.php` – konfigurasi koneksi database MySQL (fallback aman)
- `schema/schema_mysql.sql` – skema untuk database MySQL
- `Materi/` – folder PDF materi untuk viewer langsung di browser

## Cara menampilkan materi PDF

Pastikan semua file PDF berada di folder root `./Materi/` seperti:

- `./Materi/Matematika-Dasar.pdf`
- `./Materi/Fisika-Dasar.pdf`
- `./Materi/Pemrograman-Web.pdf`
- `./Materi/Bahasa-Inggris.pdf`

Semua file diakses secara langsung dari browser melalui `iframe` atau `embed` dan tidak perlu di-download.

## Jalankan lokal

- Pastikan XAMPP / PHP aktif.
- Buka project di browser: `http://localhost/lms-learning/index.php`
- Untuk login default demo: `admin@courseup.com` / `admin123`

## Catatan

Jika Anda ingin menghubungkan ke database MySQL yang sesungguhnya, import file `schema/schema_mysql.sql` ke database MySQL Anda lalu sesuaikan konfigurasi di `koneksi.php`.
