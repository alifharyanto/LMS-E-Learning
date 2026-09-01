CREATE DATABASE IF NOT EXISTS db_learning
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_learning;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'student') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question TEXT NOT NULL,
  option_a VARCHAR(255) NOT NULL,
  option_b VARCHAR(255) NOT NULL,
  option_c VARCHAR(255) NOT NULL,
  option_d VARCHAR(255) NOT NULL,
  answer_index TINYINT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  score INT NOT NULL,
  total INT NOT NULL,
  percent INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS forum_threads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  author VARCHAR(150) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS forum_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  thread_id INT NOT NULL,
  user_id INT DEFAULT NULL,
  author VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO quiz_questions
  (question, option_a, option_b, option_c, option_d, answer_index, explanation)
SELECT 'Bahasa markup yang digunakan untuk struktur halaman web adalah?',
  'HTML', 'CSS', 'JavaScript', 'PHP', 0,
  'HTML adalah bahasa markup utama untuk membangun struktur konten web.'
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE question = 'Bahasa markup yang digunakan untuk struktur halaman web adalah?');

INSERT INTO quiz_questions
  (question, option_a, option_b, option_c, option_d, answer_index, explanation)
SELECT 'CSS dipakai untuk tujuan utama apa?',
  'Menghubungkan database', 'Mengatur tampilan dan layout', 'Memproses data', 'Mengirim email', 1,
  'CSS berfungsi untuk styling, layout, dan visual halaman web.'
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE question = 'CSS dipakai untuk tujuan utama apa?');

INSERT INTO quiz_questions
  (question, option_a, option_b, option_c, option_d, answer_index, explanation)
SELECT 'Apa fungsi utama JavaScript pada frontend web?',
  'Menyimpan file PDF', 'Menangani interaksi dan logika halaman', 'Membuat sertifikat', 'Menyusun query SQL', 1,
  'JavaScript digunakan untuk interaksi, validasi, dan logika di sisi client.'
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE question = 'Apa fungsi utama JavaScript pada frontend web?');

INSERT INTO quiz_questions
  (question, option_a, option_b, option_c, option_d, answer_index, explanation)
SELECT 'Tag semantic HTML yang paling tepat untuk judul utama halaman adalah?',
  '<div>', '<section>', '<h1>', '<span>', 2,
  '<h1> adalah heading utama yang paling tepat untuk judul halaman.'
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE question = 'Tag semantic HTML yang paling tepat untuk judul utama halaman adalah?');

INSERT INTO faqs (question, answer)
SELECT 'Bagaimana cara mengakses kursus materi?',
  'Buka halaman Kursus Materi lalu pilih modul yang ingin dibaca. Materi akan tampil langsung di viewer PDF tanpa perlu download.'
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = 'Bagaimana cara mengakses kursus materi?');

INSERT INTO faqs (question, answer)
SELECT 'Apakah saya harus login dulu untuk melihat profil?',
  'Ya. Halaman profil dan dashboard hanya bisa diakses setelah akun dibuat dan login berhasil.'
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = 'Apakah saya harus login dulu untuk melihat profil?');

INSERT INTO faqs (question, answer)
SELECT 'Apakah soal dapat diubah oleh admin?',
  'Ya. Admin dapat menambah, edit, dan hapus soal dari panel admin.'
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = 'Apakah soal dapat diubah oleh admin?');

INSERT INTO faqs (question, answer)
SELECT 'Apakah forum bisa dikomentari?',
  'Ya. Setiap postingan forum dapat dibalas dengan komentar yang otomatis tersimpan di database.'
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = 'Apakah forum bisa dikomentari?');
