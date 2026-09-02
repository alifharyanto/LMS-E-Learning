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

function generateCSRFToken()
{
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function validateCSRFToken($token)
{
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

function setFlash($key, $message, $type = 'info')
{
    $_SESSION['flash'][$key] = ['message' => $message, 'type' => $type];
}

function getFlash($key)
{
    if (isset($_SESSION['flash'][$key])) {
        $flash = $_SESSION['flash'][$key];
        unset($_SESSION['flash'][$key]);
        return $flash;
    }
    return null;
}

function refreshAuthenticatedUser($conn)
{
    if (empty($_SESSION['user']['id'])) {
        return;
    }

    $userId = (int) $_SESSION['user']['id'];
    $stmt = mysqli_prepare($conn, 'SELECT id, username, email, full_name, profile_photo, role FROM users WHERE id = ? LIMIT 1');
    mysqli_stmt_bind_param($stmt, 'i', $userId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $user = mysqli_fetch_assoc($result);
    mysqli_stmt_close($stmt);

    if (!$user) {
        unset($_SESSION['user']);
        return;
    }

    $_SESSION['user'] = [
        'id' => (int) $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'full_name' => $user['full_name'] ?? '',
        'profile_photo' => $user['profile_photo'] ?? '',
        'role' => strtolower(trim($user['role']))
    ];
}

function ensureDatabaseSchema($conn)
{
    $tables = [
        "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            email VARCHAR(150) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            full_name VARCHAR(150) DEFAULT '',
            profile_photo VARCHAR(255) DEFAULT '',
            role ENUM('admin','student') NOT NULL DEFAULT 'student',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_role (role),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS quiz_categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            parent_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES quiz_categories(id) ON DELETE CASCADE,
            UNIQUE KEY unique_parent_name (parent_id, name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS quiz_questions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category_id INT NULL,
            question TEXT NOT NULL,
            option_a VARCHAR(255) NOT NULL,
            option_b VARCHAR(255) NOT NULL,
            option_c VARCHAR(255) NOT NULL,
            option_d VARCHAR(255) NOT NULL,
            answer_index TINYINT NOT NULL,
            explanation TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES quiz_categories(id) ON DELETE SET NULL,
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS quiz_results (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            category_id INT NULL,
            score INT NOT NULL,
            total INT NOT NULL,
            percent INT NOT NULL,
            correct_answers INT NOT NULL DEFAULT 0,
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES quiz_categories(id) ON DELETE SET NULL,
            INDEX idx_user_id (user_id),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS forum_threads (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS forum_comments (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS faqs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            question VARCHAR(255) NOT NULL,
            answer TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS materials (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100) NOT NULL,
            file_path VARCHAR(255),
            file_size INT DEFAULT 0,
            file_type VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_materials_category (category),
            INDEX idx_materials_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS contacts (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS contact_attempts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(150) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_contact_email (email),
            INDEX idx_contact_time (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS study_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            page_name VARCHAR(100) NOT NULL,
            minutes_spent INT NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_page_name (page_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ];

    foreach ($tables as $query) {
        mysqli_query($conn, $query);
    }

    foreach (['full_name', 'profile_photo'] as $column) {
        $check = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE '$column'");
        if (mysqli_num_rows($check) === 0) {
            mysqli_query($conn, "ALTER TABLE users ADD COLUMN $column VARCHAR(255) DEFAULT ''");
        }
    }

    $checkQuizCategory = mysqli_query($conn, "SHOW COLUMNS FROM quiz_questions LIKE 'category_id'");
    if (mysqli_num_rows($checkQuizCategory) === 0) {
        mysqli_query($conn, "ALTER TABLE quiz_questions ADD COLUMN category_id INT NULL AFTER explanation");
        mysqli_query($conn, "ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_ibfk_category FOREIGN KEY (category_id) REFERENCES quiz_categories(id) ON DELETE SET NULL");
    }

    $checkResultCategory = mysqli_query($conn, "SHOW COLUMNS FROM quiz_results LIKE 'category_id'");
    if (mysqli_num_rows($checkResultCategory) === 0) {
        mysqli_query($conn, "ALTER TABLE quiz_results ADD COLUMN category_id INT NULL AFTER user_id");
        mysqli_query($conn, "ALTER TABLE quiz_results ADD CONSTRAINT quiz_results_ibfk_category FOREIGN KEY (category_id) REFERENCES quiz_categories(id) ON DELETE SET NULL");
    }

    $checkCorrect = mysqli_query($conn, "SHOW COLUMNS FROM quiz_results LIKE 'correct_answers'");
    if (mysqli_num_rows($checkCorrect) === 0) {
        mysqli_query($conn, "ALTER TABLE quiz_results ADD COLUMN correct_answers INT NOT NULL DEFAULT 0 AFTER percent");
    }

    $adminCheck = mysqli_query($conn, "SELECT id FROM users WHERE username = 'admin' LIMIT 1");
    if (mysqli_num_rows($adminCheck) === 0) {
        mysqli_query($conn, "INSERT INTO users (username, email, password, full_name, role) VALUES ('admin', 'admin@courseup.com', '" . password_hash('admin123', PASSWORD_DEFAULT) . "', 'Administrator', 'admin')");
    }

    $studentCheck = mysqli_query($conn, "SELECT id FROM users WHERE username = 'student' LIMIT 1");
    if (mysqli_num_rows($studentCheck) === 0) {
        mysqli_query($conn, "INSERT INTO users (username, email, password, full_name, role) VALUES ('student', 'student@courseup.com', '" . password_hash('student123', PASSWORD_DEFAULT) . "', 'Student Demo', 'student')");
    }

    $categoryCount = mysqli_query($conn, "SELECT COUNT(*) AS total FROM quiz_categories");
    $categoryRow = mysqli_fetch_assoc($categoryCount);
    if ((int) $categoryRow['total'] === 0) {
        mysqli_query($conn, "INSERT INTO quiz_categories (name, parent_id) VALUES ('Web Development', NULL), ('Frontend', 1), ('Backend', 1), ('Design', NULL)");
    }

    $questionCount = mysqli_query($conn, "SELECT COUNT(*) AS total FROM quiz_questions");
    $questionRow = mysqli_fetch_assoc($questionCount);
    if ((int) $questionRow['total'] === 0) {
        $defaultCategory = mysqli_query($conn, "SELECT id FROM quiz_categories WHERE name = 'Frontend' LIMIT 1");
        $defaultCategoryId = mysqli_fetch_assoc($defaultCategory)['id'] ?? 0;
        if ($defaultCategoryId > 0) {
            mysqli_query($conn, "INSERT INTO quiz_questions (category_id, question, option_a, option_b, option_c, option_d, answer_index, explanation) VALUES
                ($defaultCategoryId, 'Bahasa markup yang digunakan untuk struktur halaman web adalah?', 'HTML', 'CSS', 'JavaScript', 'PHP', 0, 'HTML adalah bahasa markup utama untuk membangun struktur konten web.'),
                ($defaultCategoryId, 'CSS dipakai untuk tujuan utama apa?', 'Menghubungkan database', 'Mengatur tampilan dan layout', 'Memproses data', 'Mengirim email', 1, 'CSS berfungsi untuk styling, layout, dan visual page web.'),
                ($defaultCategoryId, 'Apa fungsi utama JavaScript pada frontend web?', 'Menyimpan file PDF', 'Menangani interaksi dan logika halaman', 'Membuat sertifikat', 'Menyusun query SQL', 1, 'JavaScript digunakan untuk interaksi, validasi, dan logika di sisi client.'),
                ($defaultCategoryId, 'Tag semantic HTML yang paling tepat untuk judul utama halaman adalah?', '<div>', '<section>', '<h1>', '<span>', 2, '<h1> adalah heading utama yang paling tepat untuk judul page.')");
        }
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
refreshAuthenticatedUser($koneksi);
