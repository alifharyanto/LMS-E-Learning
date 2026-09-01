<?php
require __DIR__ . '/koneksi.php';

// Check admin access
if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
    redirect('login.php');
}

$admin_user = $_SESSION['user'];
$message = '';
$message_type = '';

// ============ HANDLE MATERIAL CRUD ============
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['csrf_token'])) {
    if (!validateCSRFToken($_POST['csrf_token'])) {
        $message = 'Token validasi gagal. Silakan coba lagi.';
        $message_type = 'error';
    } 
    // Add Material
    elseif (isset($_POST['action']) && $_POST['action'] === 'add_material') {
        $title = trim($_POST['title'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $category = trim($_POST['category'] ?? '');

        if ($title && $category) {
            $file_path = '';
            $file_size = 0;
            $file_type = '';

            if (!isset($_FILES['material_file']) || $_FILES['material_file']['error'] !== UPLOAD_ERR_OK) {
                $message = 'File materi PDF wajib dipilih.';
                $message_type = 'error';
            } elseif (strtolower(pathinfo($_FILES['material_file']['name'], PATHINFO_EXTENSION)) !== 'pdf') {
                $message = 'File materi harus berformat PDF.';
                $message_type = 'error';
            } else {
                $upload_dir = __DIR__ . '/Materi/';
                if (!is_dir($upload_dir)) {
                    mkdir($upload_dir, 0755, true);
                }

                $file_name = time() . '_' . bin2hex(random_bytes(4)) . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $_FILES['material_file']['name']);
                $file_path = 'Materi/' . $file_name;
                $file_size = $_FILES['material_file']['size'];
                $file_type = 'application/pdf';

                if (!move_uploaded_file($_FILES['material_file']['tmp_name'], $upload_dir . $file_name)) {
                    $message = 'Gagal upload file. Silakan coba lagi.';
                    $message_type = 'error';
                    $file_path = '';
                }
            }

            if (!$message) {
                $stmt = mysqli_prepare($koneksi, 'INSERT INTO materials (title, description, category, file_path, file_size, file_type) VALUES (?, ?, ?, ?, ?, ?)');
                mysqli_stmt_bind_param($stmt, 'ssssis', $title, $description, $category, $file_path, $file_size, $file_type);
                if (mysqli_stmt_execute($stmt)) {
                    $message = 'Materi berhasil ditambahkan!';
                    $message_type = 'success';
                } else {
                    $message = 'Gagal menambahkan materi.';
                    $message_type = 'error';
                }
                mysqli_stmt_close($stmt);
            }
        } else {
            $message = 'Judul dan kategori harus diisi.';
            $message_type = 'error';
        }
    }
    // Delete Material
    elseif (isset($_POST['action']) && $_POST['action'] === 'delete_material') {
        $material_id = (int)($_POST['material_id'] ?? 0);
        if ($material_id > 0) {
            $stmt = mysqli_prepare($koneksi, 'SELECT file_path FROM materials WHERE id = ?');
            mysqli_stmt_bind_param($stmt, 'i', $material_id);
            mysqli_stmt_execute($stmt);
            $result = mysqli_stmt_get_result($stmt);
            $material = mysqli_fetch_assoc($result);
            mysqli_stmt_close($stmt);

            if ($material && $material['file_path'] && file_exists(__DIR__ . '/' . $material['file_path'])) {
                unlink(__DIR__ . '/' . $material['file_path']);
            }

            $stmt = mysqli_prepare($koneksi, 'DELETE FROM materials WHERE id = ?');
            mysqli_stmt_bind_param($stmt, 'i', $material_id);
            if (mysqli_stmt_execute($stmt)) {
                $message = 'Materi berhasil dihapus!';
                $message_type = 'success';
            } else {
                $message = 'Gagal menghapus materi.';
                $message_type = 'error';
            }
            mysqli_stmt_close($stmt);
        }
    }
    // Mark Contact as Read
    elseif (isset($_POST['action']) && $_POST['action'] === 'mark_contact_read') {
        $contact_id = (int)($_POST['contact_id'] ?? 0);
        if ($contact_id > 0) {
            $stmt = mysqli_prepare($koneksi, 'UPDATE contacts SET status = ? WHERE id = ?');
            $status = 'read';
            mysqli_stmt_bind_param($stmt, 'si', $status, $contact_id);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        }
    }
    // Delete Contact
    elseif (isset($_POST['action']) && $_POST['action'] === 'delete_contact') {
        $contact_id = (int)($_POST['contact_id'] ?? 0);
        if ($contact_id > 0) {
            $stmt = mysqli_prepare($koneksi, 'DELETE FROM contacts WHERE id = ?');
            mysqli_stmt_bind_param($stmt, 'i', $contact_id);
            if (mysqli_stmt_execute($stmt)) {
                $message = 'Kontak berhasil dihapus!';
                $message_type = 'success';
            } else {
                $message = 'Gagal menghapus kontak.';
                $message_type = 'error';
            }
            mysqli_stmt_close($stmt);
        }
    }
    // Add Quiz
    elseif (isset($_POST['action']) && $_POST['action'] === 'add_quiz') {
        $question = trim($_POST['question'] ?? '');
        $option_a = trim($_POST['option_a'] ?? '');
        $option_b = trim($_POST['option_b'] ?? '');
        $option_c = trim($_POST['option_c'] ?? '');
        $option_d = trim($_POST['option_d'] ?? '');
        $answer_index = (int)($_POST['answer_index'] ?? 0);
        $explanation = trim($_POST['explanation'] ?? '');

        if ($question && $option_a && $option_b && $option_c && $option_d && in_array($answer_index, [0, 1, 2, 3])) {
            $stmt = mysqli_prepare($koneksi, 'INSERT INTO quiz_questions (question, option_a, option_b, option_c, option_d, answer_index, explanation) VALUES (?, ?, ?, ?, ?, ?, ?)');
            mysqli_stmt_bind_param($stmt, 'sssssss', $question, $option_a, $option_b, $option_c, $option_d, $answer_index, $explanation);
            if (mysqli_stmt_execute($stmt)) {
                $message = 'Soal berhasil ditambahkan!';
                $message_type = 'success';
            } else {
                $message = 'Gagal menambahkan soal.';
                $message_type = 'error';
            }
            mysqli_stmt_close($stmt);
        } else {
            $message = 'Semua field soal harus diisi dengan benar.';
            $message_type = 'error';
        }
    }
    // Delete Quiz
    elseif (isset($_POST['action']) && $_POST['action'] === 'delete_quiz') {
        $quiz_id = (int)($_POST['quiz_id'] ?? 0);
        if ($quiz_id > 0) {
            $stmt = mysqli_prepare($koneksi, 'DELETE FROM quiz_questions WHERE id = ?');
            mysqli_stmt_bind_param($stmt, 'i', $quiz_id);
            if (mysqli_stmt_execute($stmt)) {
                $message = 'Soal berhasil dihapus!';
                $message_type = 'success';
            } else {
                $message = 'Gagal menghapus soal.';
                $message_type = 'error';
            }
            mysqli_stmt_close($stmt);
        }
    }
    // Add FAQ
    elseif (isset($_POST['action']) && $_POST['action'] === 'add_faq') {
        $faq_question = trim($_POST['faq_question'] ?? '');
        $faq_answer = trim($_POST['faq_answer'] ?? '');

        if ($faq_question && $faq_answer) {
            $stmt = mysqli_prepare($koneksi, 'INSERT INTO faqs (question, answer) VALUES (?, ?)');
            mysqli_stmt_bind_param($stmt, 'ss', $faq_question, $faq_answer);
            if (mysqli_stmt_execute($stmt)) {
                $message = 'FAQ berhasil ditambahkan!';
                $message_type = 'success';
            } else {
                $message = 'Gagal menambahkan FAQ.';
                $message_type = 'error';
            }
            mysqli_stmt_close($stmt);
        } else {
            $message = 'Pertanyaan dan jawaban FAQ harus diisi.';
            $message_type = 'error';
        }
    }
    // Delete FAQ
    elseif (isset($_POST['action']) && $_POST['action'] === 'delete_faq') {
        $faq_id = (int)($_POST['faq_id'] ?? 0);
        if ($faq_id > 0) {
            $stmt = mysqli_prepare($koneksi, 'DELETE FROM faqs WHERE id = ?');
            mysqli_stmt_bind_param($stmt, 'i', $faq_id);
            if (mysqli_stmt_execute($stmt)) {
                $message = 'FAQ berhasil dihapus!';
                $message_type = 'success';
            } else {
                $message = 'Gagal menghapus FAQ.';
                $message_type = 'error';
            }
            mysqli_stmt_close($stmt);
        }
    }
}

// Fetch all data
$contacts_result = mysqli_query($koneksi, 'SELECT * FROM contacts ORDER BY created_at DESC');
$contacts = mysqli_fetch_all($contacts_result, MYSQLI_ASSOC);

$materials_result = mysqli_query($koneksi, 'SELECT * FROM materials ORDER BY created_at DESC');
$materials = mysqli_fetch_all($materials_result, MYSQLI_ASSOC);

$quizzes_result = mysqli_query($koneksi, 'SELECT id, question, option_a, option_b, option_c, option_d, answer_index, explanation FROM quiz_questions ORDER BY created_at DESC');
$quizzes = mysqli_fetch_all($quizzes_result, MYSQLI_ASSOC);

$faqs_result = mysqli_query($koneksi, 'SELECT id, question, answer FROM faqs ORDER BY created_at DESC');
$faqs = mysqli_fetch_all($faqs_result, MYSQLI_ASSOC);

// Calculate statistics
$unread_contacts = count(array_filter($contacts, fn($c) => $c['status'] === 'unread'));
$total_materials = count($materials);
$total_quizzes = count($quizzes);
$total_faqs = count($faqs);

$csrf_token = generateCSRFToken();
$answer_labels = ['A', 'B', 'C', 'D'];
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Admin Panel | CourseUp E-Learning</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/feather-icons"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="styles.css" />
    <style>
        .tab-btn.active {
            @apply border-b-2 border-blue-600 text-blue-600;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body class="bg-slate-50 text-slate-900 antialiased">
    <!-- Header -->
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <a href="index.php" class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white">C</div>
                <div><span class="text-2xl font-black tracking-tight text-slate-900">Course</span><span class="text-2xl font-black tracking-tight text-blue-600">Up</span></div>
            </a>
            <div class="flex items-center gap-3">
                <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Admin Panel</span>
                <a href="logout.php" class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-500 hover:text-red-600">Keluar</a>
            </div>
        </nav>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <!-- Welcome Section -->
        <section class="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-center justify-between gap-4">
                <div>
                    <p class="text-sm font-semibold uppercase tracking-widest text-blue-600">Panel Administrator</p>
                    <h1 class="mt-2 text-3xl font-black text-slate-900">Selamat datang, <span class="text-blue-600"><?php echo htmlspecialchars($admin_user['username']); ?></span></h1>
                </div>
                <a href="index.php" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Lihat Website</a>
            </div>
        </section>

        <?php if ($message): ?>
            <div class="mb-6 rounded-lg border <?php echo $message_type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'; ?> p-4">
                <p class="text-sm font-semibold <?php echo $message_type === 'success' ? 'text-green-700' : 'text-red-700'; ?>"><?php echo htmlspecialchars($message); ?></p>
            </div>
        <?php endif; ?>

        <!-- Statistics Cards -->
        <section class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold uppercase text-slate-500">Kontak Masuk</p>
                        <p class="mt-2 text-3xl font-black text-slate-900"><?php echo count($contacts); ?></p>
                        <p class="mt-1 text-xs text-red-600 font-semibold"><?php echo $unread_contacts; ?> belum dibaca</p>
                    </div>
                    <div class="rounded-lg bg-red-50 p-3 text-red-600">
                        <i data-feather="mail" class="w-6 h-6"></i>
                    </div>
                </div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold uppercase text-slate-500">Materi</p>
                        <p class="mt-2 text-3xl font-black text-slate-900"><?php echo $total_materials; ?></p>
                        <p class="mt-1 text-xs text-blue-600 font-semibold">file tersimpan</p>
                    </div>
                    <div class="rounded-lg bg-blue-50 p-3 text-blue-600">
                        <i data-feather="book" class="w-6 h-6"></i>
                    </div>
                </div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold uppercase text-slate-500">Quiz</p>
                        <p class="mt-2 text-3xl font-black text-slate-900"><?php echo $total_quizzes; ?></p>
                        <p class="mt-1 text-xs text-green-600 font-semibold">soal aktif</p>
                    </div>
                    <div class="rounded-lg bg-green-50 p-3 text-green-600">
                        <i data-feather="help-circle" class="w-6 h-6"></i>
                    </div>
                </div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold uppercase text-slate-500">FAQ</p>
                        <p class="mt-2 text-3xl font-black text-slate-900"><?php echo $total_faqs; ?></p>
                        <p class="mt-1 text-xs text-purple-600 font-semibold">pertanyaan</p>
                    </div>
                    <div class="rounded-lg bg-purple-50 p-3 text-purple-600">
                        <i data-feather="message-circle" class="w-6 h-6"></i>
                    </div>
                </div>
            </div>
        </section>

        <!-- Tabs Navigation -->
        <section class="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="flex border-b border-slate-200 overflow-x-auto">
                <button class="tab-btn active px-6 py-4 text-sm font-semibold transition" onclick="switchTab(event, 'dashboard')">
                    <i data-feather="layout" class="w-4 h-4 inline mr-2"></i> Dashboard
                </button>
                <button class="tab-btn px-6 py-4 text-sm font-semibold transition" onclick="switchTab(event, 'contacts')">
                    <i data-feather="mail" class="w-4 h-4 inline mr-2"></i> Kontak (<?php echo count($contacts); ?>)
                </button>
                <button class="tab-btn px-6 py-4 text-sm font-semibold transition" onclick="switchTab(event, 'materials')">
                    <i data-feather="book" class="w-4 h-4 inline mr-2"></i> Materi
                </button>
                <button class="tab-btn px-6 py-4 text-sm font-semibold transition" onclick="switchTab(event, 'quiz')">
                    <i data-feather="help-circle" class="w-4 h-4 inline mr-2"></i> Quiz
                </button>
                <button class="tab-btn px-6 py-4 text-sm font-semibold transition" onclick="switchTab(event, 'faq')">
                    <i data-feather="message-circle" class="w-4 h-4 inline mr-2"></i> FAQ
                </button>
            </div>

            <!-- Dashboard Tab -->
            <div id="dashboard" class="tab-content active p-6">
                <h2 class="text-xl font-black text-slate-900 mb-4">Ringkasan Admin</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="rounded-lg border border-slate-200 p-4 bg-slate-50">
                        <h3 class="font-semibold text-slate-900 mb-2">Aktivitas Terbaru</h3>
                        <ul class="space-y-2 text-sm">
                            <li class="flex justify-between"><span>Kontak Masuk:</span><span class="font-semibold text-red-600"><?php echo $unread_contacts; ?> belum dibaca</span></li>
                            <li class="flex justify-between"><span>Total Materi:</span><span class="font-semibold"><?php echo $total_materials; ?> file</span></li>
                            <li class="flex justify-between"><span>Total Soal Quiz:</span><span class="font-semibold"><?php echo $total_quizzes; ?> soal</span></li>
                            <li class="flex justify-between"><span>Total FAQ:</span><span class="font-semibold"><?php echo $total_faqs; ?> pertanyaan</span></li>
                        </ul>
                    </div>
                    <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <h3 class="font-semibold text-blue-900 mb-2">Tips Admin</h3>
                        <ul class="space-y-2 text-sm text-blue-800">
                            <li>• Periksa kontak masuk secara berkala</li>
                            <li>• Tambahkan materi pembelajaran baru</li>
                            <li>• Kelola soal quiz dengan baik</li>
                            <li>• Update FAQ untuk membantu pengguna</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Contacts Tab -->
            <div id="contacts" class="tab-content p-6">
                <h2 class="text-xl font-black text-slate-900 mb-6">Kelola Kontak Masuk</h2>
                
                <?php if (count($contacts) > 0): ?>
                    <div class="space-y-4">
                        <?php foreach ($contacts as $contact): ?>
                            <div class="rounded-lg border <?php echo $contact['status'] === 'unread' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'; ?> p-4">
                                <div class="flex items-start justify-between gap-4">
                                    <div class="flex-1">
                                        <div class="flex items-center gap-2 mb-2">
                                            <h3 class="font-semibold text-slate-900"><?php echo htmlspecialchars($contact['name']); ?></h3>
                                            <span class="px-2 py-1 text-xs font-semibold rounded-full <?php echo $contact['status'] === 'unread' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'; ?>">
                                                <?php echo ucfirst($contact['status']); ?>
                                            </span>
                                        </div>
                                        <p class="text-sm text-slate-600 mb-2"><strong>Email:</strong> <?php echo htmlspecialchars($contact['email']); ?></p>
                                        <?php if ($contact['phone']): ?>
                                            <p class="text-sm text-slate-600 mb-2"><strong>Telepon:</strong> <?php echo htmlspecialchars($contact['phone']); ?></p>
                                        <?php endif; ?>
                                        <p class="text-sm text-slate-600 mb-2"><strong>Subjek:</strong> <?php echo htmlspecialchars($contact['subject']); ?></p>
                                        <p class="text-sm text-slate-700 mb-2"><strong>Pesan:</strong></p>
                                        <p class="text-sm text-slate-700 p-3 bg-white rounded border border-slate-200"><?php echo nl2br(htmlspecialchars($contact['message'])); ?></p>
                                        <p class="text-xs text-slate-500 mt-2"><?php echo date('d M Y H:i', strtotime($contact['created_at'])); ?></p>
                                    </div>
                                    <div class="flex gap-2">
                                        <?php if ($contact['status'] === 'unread'): ?>
                                            <form method="POST" class="inline">
                                                <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                                                <input type="hidden" name="action" value="mark_contact_read">
                                                <input type="hidden" name="contact_id" value="<?php echo $contact['id']; ?>">
                                                <button type="submit" class="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded hover:bg-green-700">Tandai Baca</button>
                                            </form>
                                        <?php endif; ?>
                                        <form method="POST" class="inline" onsubmit="return confirm('Hapus kontak ini?');">
                                            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                                            <input type="hidden" name="action" value="delete_contact">
                                            <input type="hidden" name="contact_id" value="<?php echo $contact['id']; ?>">
                                            <button type="submit" class="px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700">Hapus</button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php else: ?>
                    <div class="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
                        <i data-feather="inbox" class="w-12 h-12 mx-auto text-slate-400 mb-2"></i>
                        <p class="text-slate-600">Tidak ada kontak masuk</p>
                    </div>
                <?php endif; ?>
            </div>

            <!-- Materials Tab -->
            <div id="materials" class="tab-content p-6">
                <h2 class="text-xl font-black text-slate-900 mb-6">Kelola Materi Pembelajaran</h2>
                
                <!-- Add Material Form -->
                <div class="mb-6 rounded-lg border border-slate-200 bg-white p-6">
                    <h3 class="text-lg font-bold text-slate-900 mb-4">Tambah Materi Baru</h3>
                    <form method="POST" enctype="multipart/form-data" class="space-y-4">
                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                        <input type="hidden" name="action" value="add_material">
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-slate-900 mb-2">Judul Materi *</label>
                                <input type="text" name="title" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Contoh: HTML Basics">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-900 mb-2">Kategori *</label>
                                <select name="category" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Pilih Kategori</option>
                                    <option value="HTML">HTML</option>
                                    <option value="CSS">CSS</option>
                                    <option value="JavaScript">JavaScript</option>
                                    <option value="PHP">PHP</option>
                                    <option value="Database">Database</option>
                                    <option value="Lainnya">Lainnya</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-slate-900 mb-2">Deskripsi</label>
                            <textarea name="description" rows="3" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Deskripsi materi pembelajaran..."></textarea>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-slate-900 mb-2">File Materi (PDF, DOC, dll)</label>
                            <input type="file" name="material_file" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>

                        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">Tambah Materi</button>
                    </form>
                </div>

                <!-- Materials List -->
                <div class="space-y-4">
                    <h3 class="text-lg font-bold text-slate-900">Daftar Materi (<?php echo count($materials); ?>)</h3>
                    <?php if (count($materials) > 0): ?>
                        <?php foreach ($materials as $material): ?>
                            <div class="rounded-lg border border-slate-200 bg-white p-4">
                                <div class="flex items-start justify-between gap-4">
                                    <div class="flex-1">
                                        <h4 class="font-semibold text-slate-900"><?php echo htmlspecialchars($material['title']); ?></h4>
                                        <p class="text-sm text-slate-600 mt-1"><span class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold"><?php echo htmlspecialchars($material['category']); ?></span></p>
                                        <?php if ($material['description']): ?>
                                            <p class="text-sm text-slate-600 mt-2"><?php echo htmlspecialchars($material['description']); ?></p>
                                        <?php endif; ?>
                                        <?php if ($material['file_path']): ?>
                                            <p class="text-xs text-slate-500 mt-2">
                                                <i data-feather="file" class="w-3 h-3 inline mr-1"></i>
                                                <?php echo basename($material['file_path']); ?> 
                                                (<?php echo round($material['file_size'] / 1024 / 1024, 2); ?> MB)
                                            </p>
                                        <?php endif; ?>
                                        <p class="text-xs text-slate-400 mt-2">Ditambahkan: <?php echo date('d M Y', strtotime($material['created_at'])); ?></p>
                                    </div>
                                    <div class="flex gap-2">
                                        <form method="POST" class="inline" onsubmit="return confirm('Hapus materi ini?');">
                                            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                                            <input type="hidden" name="action" value="delete_material">
                                            <input type="hidden" name="material_id" value="<?php echo $material['id']; ?>">
                                            <button type="submit" class="px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700">Hapus</button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div class="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
                            <i data-feather="folder" class="w-12 h-12 mx-auto text-slate-400 mb-2"></i>
                            <p class="text-slate-600">Belum ada materi. Tambahkan materi baru di atas.</p>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Quiz Tab -->
            <div id="quiz" class="tab-content p-6">
                <h2 class="text-xl font-black text-slate-900 mb-6">Kelola Quiz Web Developer</h2>
                
                <!-- Add Quiz Form -->
                <div class="mb-6 rounded-lg border border-slate-200 bg-white p-6">
                    <h3 class="text-lg font-bold text-slate-900 mb-4">Tambah Soal Quiz</h3>
                    <form method="POST" class="space-y-4">
                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                        <input type="hidden" name="action" value="add_quiz">
                        
                        <div>
                            <label class="block text-sm font-semibold text-slate-900 mb-2">Pertanyaan *</label>
                            <textarea name="question" rows="2" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tuliskan pertanyaan..."></textarea>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-slate-900 mb-2">Pilihan A *</label>
                                <input type="text" name="option_a" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Pilihan A...">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-900 mb-2">Pilihan B *</label>
                                <input type="text" name="option_b" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Pilihan B...">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-900 mb-2">Pilihan C *</label>
                                <input type="text" name="option_c" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Pilihan C...">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-900 mb-2">Pilihan D *</label>
                                <input type="text" name="option_d" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Pilihan D...">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-slate-900 mb-2">Jawaban Benar *</label>
                                <select name="answer_index" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Pilih Jawaban</option>
                                    <option value="0">A</option>
                                    <option value="1">B</option>
                                    <option value="2">C</option>
                                    <option value="3">D</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-slate-900 mb-2">Penjelasan Jawaban</label>
                            <textarea name="explanation" rows="2" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Jelaskan jawaban yang benar..."></textarea>
                        </div>

                        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">Tambah Soal</button>
                    </form>
                </div>

                <!-- Quiz List -->
                <div class="space-y-4">
                    <h3 class="text-lg font-bold text-slate-900">Daftar Soal Quiz (<?php echo count($quizzes); ?>)</h3>
                    <?php if (count($quizzes) > 0): ?>
                        <?php foreach ($quizzes as $index => $quiz): ?>
                            <div class="rounded-lg border border-slate-200 bg-white p-4">
                                <div class="mb-3">
                                    <h4 class="font-semibold text-slate-900">Soal <?php echo $index + 1; ?></h4>
                                    <p class="text-slate-700 mt-1"><?php echo htmlspecialchars($quiz['question']); ?></p>
                                </div>
                                <div class="ml-4 space-y-1 text-sm mb-3">
                                    <p class="<?php echo $quiz['answer_index'] == 0 ? 'font-semibold text-green-700 bg-green-50 px-2 py-1 rounded' : 'text-slate-600'; ?>">A. <?php echo htmlspecialchars($quiz['option_a']); ?></p>
                                    <p class="<?php echo $quiz['answer_index'] == 1 ? 'font-semibold text-green-700 bg-green-50 px-2 py-1 rounded' : 'text-slate-600'; ?>">B. <?php echo htmlspecialchars($quiz['option_b']); ?></p>
                                    <p class="<?php echo $quiz['answer_index'] == 2 ? 'font-semibold text-green-700 bg-green-50 px-2 py-1 rounded' : 'text-slate-600'; ?>">C. <?php echo htmlspecialchars($quiz['option_c']); ?></p>
                                    <p class="<?php echo $quiz['answer_index'] == 3 ? 'font-semibold text-green-700 bg-green-50 px-2 py-1 rounded' : 'text-slate-600'; ?>">D. <?php echo htmlspecialchars($quiz['option_d']); ?></p>
                                </div>
                                <?php if ($quiz['explanation']): ?>
                                    <p class="text-xs text-slate-600 mb-3"><strong>Penjelasan:</strong> <?php echo htmlspecialchars($quiz['explanation']); ?></p>
                                <?php endif; ?>
                                <form method="POST" class="inline" onsubmit="return confirm('Hapus soal ini?');">
                                    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                                    <input type="hidden" name="action" value="delete_quiz">
                                    <input type="hidden" name="quiz_id" value="<?php echo $quiz['id']; ?>">
                                    <button type="submit" class="px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700">Hapus</button>
                                </form>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>

            <!-- FAQ Tab -->
            <div id="faq" class="tab-content p-6">
                <h2 class="text-xl font-black text-slate-900 mb-6">Kelola FAQ</h2>
                
                <!-- Add FAQ Form -->
                <div class="mb-6 rounded-lg border border-slate-200 bg-white p-6">
                    <h3 class="text-lg font-bold text-slate-900 mb-4">Tambah FAQ Baru</h3>
                    <form method="POST" class="space-y-4">
                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                        <input type="hidden" name="action" value="add_faq">
                        
                        <div>
                            <label class="block text-sm font-semibold text-slate-900 mb-2">Pertanyaan *</label>
                            <input type="text" name="faq_question" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tuliskan pertanyaan...">
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-slate-900 mb-2">Jawaban *</label>
                            <textarea name="faq_answer" rows="4" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tuliskan jawaban..."></textarea>
                        </div>

                        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">Tambah FAQ</button>
                    </form>
                </div>

                <!-- FAQ List -->
                <div class="space-y-4">
                    <h3 class="text-lg font-bold text-slate-900">Daftar FAQ (<?php echo count($faqs); ?>)</h3>
                    <?php if (count($faqs) > 0): ?>
                        <?php foreach ($faqs as $faq): ?>
                            <div class="rounded-lg border border-slate-200 bg-white p-4">
                                <h4 class="font-semibold text-slate-900"><?php echo htmlspecialchars($faq['question']); ?></h4>
                                <p class="text-slate-700 mt-2"><?php echo nl2br(htmlspecialchars($faq['answer'])); ?></p>
                                <form method="POST" class="inline mt-3" onsubmit="return confirm('Hapus FAQ ini?');">
                                    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                                    <input type="hidden" name="action" value="delete_faq">
                                    <input type="hidden" name="faq_id" value="<?php echo $faq['id']; ?>">
                                    <button type="submit" class="px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700">Hapus</button>
                                </form>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
        </section>
    </main>

    <script>
        feather.replace();

        function switchTab(e, tabName) {
            e.preventDefault();
            
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Remove active class from all buttons
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            
            // Add active class to clicked button
            e.target.closest('.tab-btn').classList.add('active');
        }
    </script>
</body>
</html>
