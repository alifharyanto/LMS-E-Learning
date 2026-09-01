USE db_learning;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','student') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

INSERT INTO users (username, email, password, role)
SELECT 'admin', 'admin@courseup.com', '$2y$10$wM.CndeTHn2T5b1V8nC2G.8pLgnG2negL8l75nM4o6zTnmJd9hY6O', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

INSERT INTO users (username, email, password, role)
SELECT 'student', 'student@courseup.com', '$2y$10$XbNw7n9o5pQ7VjQwS0E7t.u9xzFD0u7uMv0YpL1z3G0oJt6hF5M1C', 'student'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'student');

INSERT INTO quiz_questions (question, option_a, option_b, option_c, option_d, answer_index, explanation)
SELECT 'Bahasa markup yang digunakan untuk struktur halaman web adalah?', 'HTML', 'CSS', 'JavaScript', 'PHP', 0, 'HTML adalah bahasa markup utama untuk membangun struktur konten web.'
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE question = 'Bahasa markup yang digunakan untuk struktur halaman web adalah?');

INSERT INTO faqs (question, answer)
SELECT 'Bagaimana cara mengakses kursus materi?', 'Buka halaman Kursus Materi lalu pilih modul yang ingin dibaca. Materi akan tampil langsung di viewer PDF tanpa perlu download.'
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = 'Bagaimana cara mengakses kursus materi?');
