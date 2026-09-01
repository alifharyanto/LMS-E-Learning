<?php
session_start();

$host = 'localhost';
$username = 'root';
$password = '';
$database = 'db_learning';

$koneksi = mysqli_connect($host, $username, $password, $database);
if (!$koneksi) {
    die('Koneksi gagal: ' . mysqli_connect_error());
}
mysqli_set_charset($koneksi, 'utf8mb4');

function redirect($target)
{
    header('Location: ' . $target);
    exit;
}

function ensureDatabaseSchema($conn)
{
    $queries = [
        "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            email VARCHAR(150) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role ENUM('admin','student') NOT NULL DEFAULT 'student',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS quiz_questions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            question TEXT NOT NULL,
            option_a VARCHAR(255) NOT NULL,
            option_b VARCHAR(255) NOT NULL,
            option_c VARCHAR(255) NOT NULL,
            option_d VARCHAR(255) NOT NULL,
            answer_index TINYINT NOT NULL,
            explanation TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS quiz_results (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            score INT NOT NULL,
            total INT NOT NULL,
            percent INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )",
        "CREATE TABLE IF NOT EXISTS forum_threads (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT DEFAULT NULL,
            author VARCHAR(150) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )",
        "CREATE TABLE IF NOT EXISTS forum_comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            thread_id INT NOT NULL,
            user_id INT DEFAULT NULL,
            author VARCHAR(150) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )",
        "CREATE TABLE IF NOT EXISTS faqs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            question VARCHAR(255) NOT NULL,
            answer TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"
    ];

    foreach ($queries as $query) {
        mysqli_query($conn, $query);
    }

    $adminCheck = mysqli_query($conn, "SELECT id FROM users WHERE username = 'admin' LIMIT 1");
    if (mysqli_num_rows($adminCheck) === 0) {
        mysqli_query($conn, "INSERT INTO users (username, email, password, role) VALUES ('admin', 'admin@courseup.com', '" . password_hash('admin123', PASSWORD_DEFAULT) . "', 'admin')");
    }

    $studentCheck = mysqli_query($conn, "SELECT id FROM users WHERE username = 'student' LIMIT 1");
    if (mysqli_num_rows($studentCheck) === 0) {
        mysqli_query($conn, "INSERT INTO users (username, email, password, role) VALUES ('student', 'student@courseup.com', '" . password_hash('student123', PASSWORD_DEFAULT) . "', 'student')");
    }

    $questionCount = mysqli_query($conn, "SELECT COUNT(*) AS total FROM quiz_questions");
    $questionRow = mysqli_fetch_assoc($questionCount);
    if ((int) $questionRow['total'] === 0) {
        mysqli_query($conn, "INSERT INTO quiz_questions (question, option_a, option_b, option_c, option_d, answer_index, explanation) VALUES
            ('Bahasa markup yang digunakan untuk struktur halaman web adalah?', 'HTML', 'CSS', 'JavaScript', 'PHP', 0, 'HTML adalah bahasa markup utama untuk membangun struktur konten web.'),
            ('CSS dipakai untuk tujuan utama apa?', 'Menghubungkan database', 'Mengatur tampilan dan layout', 'Memproses data', 'Mengirim email', 1, 'CSS berfungsi untuk styling, layout, dan visual page web.'),
            ('Apa fungsi utama JavaScript pada frontend web?', 'Menyimpan file PDF', 'Menangani interaksi dan logika halaman', 'Membuat sertifikat', 'Menyusun query SQL', 1, 'JavaScript digunakan untuk interaksi, validasi, dan logika di sisi client.'),
            ('Tag semantic HTML yang paling tepat untuk judul utama halaman adalah?', '<div>', '<section>', '<h1>', '<span>', 2, '<h1> adalah heading utama yang paling tepat untuk judul page.')");
    }

    $faqCount = mysqli_query($conn, "SELECT COUNT(*) AS total FROM faqs");
    $faqRow = mysqli_fetch_assoc($faqCount);
    if ((int) $faqRow['total'] === 0) {
        mysqli_query($conn, "INSERT INTO faqs (question, answer) VALUES
            ('Bagaimana cara mengakses kursus materi?', 'Buka halaman Kursus Materi lalu pilih modul yang ingin dibaca. Materi akan tampil langsung di viewer PDF tanpa perlu download.'),
            ('Apakah saya harus login dulu untuk melihat profil?', 'Ya. Halaman profil dan dashboard hanya bisa diakses setelah akun dibuat dan login berhasil.'),
            ('Apakah soal dapat diubah oleh admin?', 'Ya. Admin dapat menambah, edit, dan hapus soal dari panel admin.'),
            ('Apakah forum bisa dikomentari?', 'Ya. Setiap postingan forum dapat dibalas dengan komentar yang otomatis tersimpan di database.')");
    }
}

ensureDatabaseSchema($koneksi);
