CREATE DATABASE db_learning;
USE db_learning;

-- ========== TABLE: users ==========
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'student') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== TABLE: quiz_questions ==========
CREATE TABLE IF NOT EXISTS quiz_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question TEXT NOT NULL,
  option_a VARCHAR(255) NOT NULL,
  option_b VARCHAR(255) NOT NULL,
  option_c VARCHAR(255) NOT NULL,
  option_d VARCHAR(255) NOT NULL,
  answer_index TINYINT NOT NULL CHECK (answer_index IN (0,1,2,3)),
  explanation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== TABLE: quiz_results ==========
CREATE TABLE IF NOT EXISTS quiz_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  score INT NOT NULL,
  total INT NOT NULL,
  percent INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== TABLE: forum_threads ==========
CREATE TABLE IF NOT EXISTS forum_threads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  author VARCHAR(150) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== TABLE: forum_comments ==========
CREATE TABLE IF NOT EXISTS forum_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  thread_id INT NOT NULL,
  user_id INT DEFAULT NULL,
  author VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_thread_id (thread_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== TABLE: faqs ==========
CREATE TABLE IF NOT EXISTS faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== TABLE: contacts ==========
CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('unread', 'read', 'replied') NOT NULL DEFAULT 'unread',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== TABLE: materials ==========
CREATE TABLE IF NOT EXISTS materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  file_path VARCHAR(255),
  file_size INT,
  file_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== SEED DATA: Users ==========
INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@courseup.com', '$2y$10$YourHashedPasswordHere', 'admin'),
('student', 'student@courseup.com', '$2y$10$YourHashedPasswordHere', 'student')
ON DUPLICATE KEY UPDATE username=username;

-- ========== SEED DATA: Quiz Questions ==========
INSERT INTO quiz_questions (question, option_a, option_b, option_c, option_d, answer_index, explanation) VALUES
('Bahasa markup yang digunakan untuk struktur halaman web adalah?', 'HTML', 'CSS', 'JavaScript', 'PHP', 0, 'HTML adalah bahasa markup utama untuk membangun struktur konten web.'),
('CSS dipakai untuk tujuan utama apa?', 'Menghubungkan database', 'Mengatur tampilan dan layout', 'Memproses data', 'Mengirim email', 1, 'CSS berfungsi untuk styling, layout, dan visual halaman web.'),
('Apa fungsi utama JavaScript pada frontend web?', 'Menyimpan file PDF', 'Menangani interaksi dan logika halaman', 'Membuat sertifikat', 'Menyusun query SQL', 1, 'JavaScript digunakan untuk interaksi, validasi, dan logika di sisi client.'),
('Tag semantic HTML yang paling tepat untuk judul utama halaman adalah?', '<div>', '<section>', '<h1>', '<span>', 2, '<h1> adalah heading utama yang paling tepat untuk judul halaman.'),
('Apa kepanjangan dari HTTP?', 'Hyper Text Transfer Protocol', 'High Technology Terminal Protocol', 'Hyperlink Text Transmission Plan', 'Home Telephone Transmission Process', 0, 'HTTP (HyperText Transfer Protocol) adalah protokol untuk transfer data di web.'),
('Mana yang merupakan framework JavaScript?', 'Bootstrap', 'Tailwind CSS', 'React', 'MySQL', 2, 'React adalah library JavaScript yang populer untuk membangun UI interaktif.'),
('Apa itu REST API?', 'Rapid Electronic System Transmission', 'Real-time Electronic Service Transfer', 'Representational State Transfer API', 'Remote Error System Transfer', 2, 'REST API adalah arsitektur untuk membuat web service yang scalable.'),
('Berapa jumlah dimensi dalam grid CSS?', '1 dimensi', '2 dimensi', '3 dimensi', '4 dimensi', 1, 'CSS Grid adalah sistem layout 2D untuk mengatur elemen di baris dan kolom.'),
('Element HTML mana yang digunakan untuk formulir input?', '<form>', '<table>', '<div>', '<span>', 0, '<form> digunakan untuk mengumpulkan data input dari pengguna.'),
('Apa perbedaan utama antara let dan var di JavaScript?', 'Scope dan hoisting', 'Tipe data', 'Performa', 'Tidak ada perbedaan', 0, 'let memiliki block scope sedangkan var memiliki function scope, juga berbeda dalam hoisting behavior.')
ON DUPLICATE KEY UPDATE question=question;

-- ========== SEED DATA: FAQs ==========
INSERT INTO faqs (question, answer) VALUES
('Bagaimana cara mengakses kursus materi?', 'Buka halaman "Kursus Materi" lalu pilih modul yang ingin dibaca. Materi akan tampil langsung di viewer PDF tanpa perlu download. Anda perlu login terlebih dahulu untuk mengakses semua fitur.'),
('Apakah saya harus login dulu untuk melihat profil?', 'Ya. Halaman profil (dashboard) dan semua fitur pembelajaran hanya bisa diakses setelah Anda membuat akun dan login berhasil. Ini dilakukan untuk tracking progress belajar Anda.'),
('Apakah soal dapat diubah oleh admin?', 'Ya. Admin memiliki akses ke panel admin untuk menambah, mengedit, dan menghapus soal dari menu "Kelola Quiz Web Developer". Setiap perubahan langsung tersimpan di database.'),
('Apakah forum bisa dikomentari?', 'Ya. Setiap thread (postingan) di forum dapat dibalas dengan komentar. Komentar akan otomatis tersimpan di database dengan nama pengguna dan waktu posting Anda. Admin juga bisa menghapus thread atau komentar jika diperlukan.'),
('Berapa lama cookie session saya berlaku?', 'Session Anda berlaku selama browser masih terbuka. Session akan otomatis dihapus setelah browser ditutup atau Anda klik tombol "Keluar". Untuk keamanan, jangan gunakan perangkat publik untuk login ke akun Anda.'),
('Bagaimana cara reset password saya?', 'Saat ini fitur reset password belum tersedia. Silakan hubungi admin di email admin@courseup.com untuk membantu mereset password Anda. Kami merekomendasikan untuk menggunakan password yang kuat dan mudah diingat.'),
('Apa itu skor persentase di dashboard?', 'Skor persentase adalah rata-rata nilai dari semua quiz yang telah Anda selesaikan. Jika Anda mengerjakan 3 quiz dengan skor 80%, 90%, dan 85%, maka skor rata-rata Anda adalah 85%. Coba ambil quiz lebih banyak untuk meningkatkan score.'),
('Apakah data forum dan quiz saya aman?', 'Ya. Semua data Anda disimpan dengan aman di database MySQL dengan enkripsi password menggunakan bcrypt. Tim admin bertanggung jawab untuk backup data secara berkala. Data Anda tidak akan dibagikan kepada pihak ketiga.')
ON DUPLICATE KEY UPDATE question=question;