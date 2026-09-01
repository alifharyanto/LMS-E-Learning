<?php
require __DIR__ . '/koneksi.php';

// Check admin access
if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
    redirect('login.php');
}

$admin_user = $_SESSION['user'];
$message = '';
$message_type = '';

// Handle Quiz CRUD
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['csrf_token'])) {
    if (!validateCSRFToken($_POST['csrf_token'])) {
        $message = 'Token validasi gagal. Silakan coba lagi.';
        $message_type = 'error';
    } elseif (isset($_POST['action']) && $_POST['action'] === 'add_quiz') {
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
                $message = 'Gagal menambahkan soal. Silakan coba lagi.';
                $message_type = 'error';
            }
            mysqli_stmt_close($stmt);
        } else {
            $message = 'Semua field soal harus diisi dengan benar.';
            $message_type = 'error';
        }
    } elseif (isset($_POST['action']) && $_POST['action'] === 'edit_quiz') {
        $quiz_id = (int)($_POST['quiz_id'] ?? 0);
        $question = trim($_POST['question'] ?? '');
        $option_a = trim($_POST['option_a'] ?? '');
        $option_b = trim($_POST['option_b'] ?? '');
        $option_c = trim($_POST['option_c'] ?? '');
        $option_d = trim($_POST['option_d'] ?? '');
        $answer_index = (int)($_POST['answer_index'] ?? 0);
        $explanation = trim($_POST['explanation'] ?? '');

        if ($quiz_id > 0 && $question && $option_a && $option_b && $option_c && $option_d && in_array($answer_index, [0, 1, 2, 3])) {
            $stmt = mysqli_prepare($koneksi, 'UPDATE quiz_questions SET question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, answer_index = ?, explanation = ? WHERE id = ?');
            mysqli_stmt_bind_param($stmt, 'sssssssi', $question, $option_a, $option_b, $option_c, $option_d, $answer_index, $explanation, $quiz_id);
            if (mysqli_stmt_execute($stmt)) {
                $message = 'Soal berhasil diperbarui!';
                $message_type = 'success';
            } else {
                $message = 'Gagal memperbarui soal.';
                $message_type = 'error';
            }
            mysqli_stmt_close($stmt);
        } else {
            $message = 'Data soal tidak valid.';
            $message_type = 'error';
        }
    } elseif (isset($_POST['action']) && $_POST['action'] === 'delete_quiz') {
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
    } elseif (isset($_POST['action']) && $_POST['action'] === 'add_faq') {
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
    } elseif (isset($_POST['action']) && $_POST['action'] === 'edit_faq') {
        $faq_id = (int)($_POST['faq_id'] ?? 0);
        $faq_question = trim($_POST['faq_question'] ?? '');
        $faq_answer = trim($_POST['faq_answer'] ?? '');

        if ($faq_id > 0 && $faq_question && $faq_answer) {
            $stmt = mysqli_prepare($koneksi, 'UPDATE faqs SET question = ?, answer = ? WHERE id = ?');
            mysqli_stmt_bind_param($stmt, 'ssi', $faq_question, $faq_answer, $faq_id);
            if (mysqli_stmt_execute($stmt)) {
                $message = 'FAQ berhasil diperbarui!';
                $message_type = 'success';
            } else {
                $message = 'Gagal memperbarui FAQ.';
                $message_type = 'error';
            }
            mysqli_stmt_close($stmt);
        } else {
            $message = 'Data FAQ tidak valid.';
            $message_type = 'error';
        }
    } elseif (isset($_POST['action']) && $_POST['action'] === 'delete_faq') {
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

// Fetch all quizzes
$quizzes_result = mysqli_query($koneksi, 'SELECT id, question, option_a, option_b, option_c, option_d, answer_index, explanation FROM quiz_questions ORDER BY created_at DESC');
$quizzes = mysqli_fetch_all($quizzes_result, MYSQLI_ASSOC);

// Fetch all FAQs
$faqs_result = mysqli_query($koneksi, 'SELECT id, question, answer FROM faqs ORDER BY created_at DESC');
$faqs = mysqli_fetch_all($faqs_result, MYSQLI_ASSOC);

$csrf_token = generateCSRFToken();
$answer_labels = ['A', 'B', 'C', 'D'];
?>
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Admin Panel | CourseUp</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = { theme: { extend: { colors: { brand: { blue: '#2563EB', dark: '#111111' } } } } };
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet" />
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body data-page="admin" class="bg-slate-50 text-slate-900 antialiased">
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="index.php" class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white">C</div>
          <div><span class="text-2xl font-black tracking-tight text-slate-900">Course</span><span class="text-2xl font-black tracking-tight text-blue-600">Up</span></div>
        </a>

        <div class="flex items-center gap-3">
          <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Admin</span>
          <a href="logout.php" class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-500 hover:text-red-600">Keluar</a>
        </div>
      </nav>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section class="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm" data-aos="fade-up">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Panel Administrator</p>
            <h1 class="mt-2 text-3xl font-black text-slate-900">Selamat datang, <span id="adminIdentity"><?php echo htmlspecialchars($admin_user['username']); ?></span></h1>
          </div>
          <a href="index.php" class="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Lihat website</a>
        </div>
      </section>

      <?php if ($message): ?>
        <div class="mt-6 rounded-3xl border <?php echo $message_type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'; ?> p-4">
          <p class="text-sm font-semibold <?php echo $message_type === 'success' ? 'text-green-700' : 'text-red-700'; ?>"><?php echo htmlspecialchars($message); ?></p>
        </div>
      <?php endif; ?>

      <section class="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up">
          <h2 class="text-xl font-black text-slate-900">Kelola Quiz Web Developer</h2>
          <form method="POST" class="mt-5 space-y-4">
            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
            <input type="hidden" name="action" value="add_quiz">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Pertanyaan</label>
              <textarea name="question" rows="3" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Masukkan pertanyaan quiz" required></textarea>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Pilihan A</label>
                <input name="option_a" type="text" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Pilihan B</label>
                <input name="option_b" type="text" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Pilihan C</label>
                <input name="option_c" type="text" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Pilihan D</label>
                <input name="option_d" type="text" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Jawaban benar</label>
              <select name="answer_index" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="0">A</option>
                <option value="1">B</option>
                <option value="2">C</option>
                <option value="3">D</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Penjelasan (opsional)</label>
              <textarea name="explanation" rows="2" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Penjelasan jawaban..."></textarea>
            </div>
            <button type="submit" class="w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">Tambah Soal</button>
          </form>

          <div class="mt-6 overflow-x-auto">
            <table class="min-w-full border-collapse text-left">
              <thead>
                <tr class="border-b border-slate-200 text-sm text-slate-600">
                  <th class="px-3 py-3 font-semibold">No</th>
                  <th class="px-3 py-3 font-semibold">Soal</th>
                  <th class="px-3 py-3 font-semibold">Jawaban</th>
                  <th class="px-3 py-3 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <?php foreach ($quizzes as $index => $quiz): ?>
                  <tr class="border-b border-slate-100 text-sm hover:bg-slate-50">
                    <td class="px-3 py-3"><?php echo $index + 1; ?></td>
                    <td class="px-3 py-3 max-w-xs truncate"><?php echo htmlspecialchars(substr($quiz['question'], 0, 50)); ?></td>
                    <td class="px-3 py-3"><?php echo $answer_labels[$quiz['answer_index']]; ?></td>
                    <td class="px-3 py-3 space-x-2">
                      <button onclick="editQuiz(<?php echo (int)$quiz['id']; ?>)" class="text-xs font-semibold text-blue-600 hover:text-blue-700">Edit</button>
                      <form method="POST" style="display:inline;">
                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                        <input type="hidden" name="action" value="delete_quiz">
                        <input type="hidden" name="quiz_id" value="<?php echo (int)$quiz['id']; ?>">
                        <button type="submit" class="text-xs font-semibold text-red-600 hover:text-red-700" onclick="return confirm('Hapus soal ini?')">Hapus</button>
                      </form>
                    </td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
            <?php if (empty($quizzes)): ?>
              <p class="mt-4 text-sm text-slate-500 text-center">Belum ada soal quiz.</p>
            <?php endif; ?>
          </div>
        </div>

        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up" data-aos-delay="100">
          <h2 class="text-xl font-black text-slate-900">Kelola FAQ</h2>
          <form method="POST" class="mt-5 space-y-4">
            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
            <input type="hidden" name="action" value="add_faq">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Judul FAQ</label>
              <input name="faq_question" type="text" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Contoh: Bagaimana cara login?" required />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Jawaban</label>
              <textarea name="faq_answer" rows="4" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Jawaban untuk FAQ..." required></textarea>
            </div>
            <button type="submit" class="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Tambah FAQ</button>
          </form>

          <div class="mt-6 overflow-x-auto">
            <table class="min-w-full border-collapse text-left">
              <thead>
                <tr class="border-b border-slate-200 text-sm text-slate-600">
                  <th class="px-3 py-3 font-semibold">No</th>
                  <th class="px-3 py-3 font-semibold">Judul</th>
                  <th class="px-3 py-3 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <?php foreach ($faqs as $index => $faq): ?>
                  <tr class="border-b border-slate-100 text-sm hover:bg-slate-50">
                    <td class="px-3 py-3"><?php echo $index + 1; ?></td>
                    <td class="px-3 py-3 max-w-xs truncate"><?php echo htmlspecialchars(substr($faq['question'], 0, 40)); ?></td>
                    <td class="px-3 py-3 space-x-2">
                      <button onclick="editFaq(<?php echo (int)$faq['id']; ?>)" class="text-xs font-semibold text-blue-600 hover:text-blue-700">Edit</button>
                      <form method="POST" style="display:inline;">
                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                        <input type="hidden" name="action" value="delete_faq">
                        <input type="hidden" name="faq_id" value="<?php echo (int)$faq['id']; ?>">
                        <button type="submit" class="text-xs font-semibold text-red-600 hover:text-red-700" onclick="return confirm('Hapus FAQ ini?')">Hapus</button>
                      </form>
                    </td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
            <?php if (empty($faqs)): ?>
              <p class="mt-4 text-sm text-slate-500 text-center">Belum ada FAQ.</p>
            <?php endif; ?>
          </div>
        </div>
      </section>
    </main>

    <!-- Edit Modal -->
    <div id="editModal" style="display:none" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <h3 class="text-xl font-black text-slate-900" id="modalTitle">Edit Soal</h3>
        <form id="editForm" method="POST" class="mt-5 space-y-4">
          <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
          <input type="hidden" name="action" id="editAction" value="">
          <input type="hidden" name="quiz_id" id="quizId" value="">
          <input type="hidden" name="faq_id" id="faqId" value="">
          
          <div id="quizFields" style="display:none;" class="space-y-4">
            <textarea name="question" id="editQuestion" rows="3" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required></textarea>
            <div class="grid gap-2 sm:grid-cols-2">
              <input name="option_a" id="editOptionA" type="text" class="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required />
              <input name="option_b" id="editOptionB" type="text" class="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required />
              <input name="option_c" id="editOptionC" type="text" class="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required />
              <input name="option_d" id="editOptionD" type="text" class="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required />
            </div>
            <select name="answer_index" id="editAnswerIndex" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500">
              <option value="0">A</option>
              <option value="1">B</option>
              <option value="2">C</option>
              <option value="3">D</option>
            </select>
            <textarea name="explanation" id="editExplanation" rows="2" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"></textarea>
          </div>

          <div id="faqFields" style="display:none;" class="space-y-4">
            <input name="faq_question" id="editFaqQuestion" type="text" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required />
            <textarea name="faq_answer" id="editFaqAnswer" rows="4" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required></textarea>
          </div>

          <div class="flex gap-3">
            <button type="submit" class="flex-1 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Simpan</button>
            <button type="button" onclick="closeModal()" class="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300">Batal</button>
          </div>
        </form>
      </div>
    </div>

    <script>
      const quizzes = <?php echo json_encode($quizzes); ?>;
      const faqs = <?php echo json_encode($faqs); ?>;

      function editQuiz(id) {
        const quiz = quizzes.find(q => q.id == id);
        if (quiz) {
          document.getElementById('modalTitle').textContent = 'Edit Soal';
          document.getElementById('editAction').value = 'edit_quiz';
          document.getElementById('quizId').value = id;
          document.getElementById('editQuestion').value = quiz.question;
          document.getElementById('editOptionA').value = quiz.option_a;
          document.getElementById('editOptionB').value = quiz.option_b;
          document.getElementById('editOptionC').value = quiz.option_c;
          document.getElementById('editOptionD').value = quiz.option_d;
          document.getElementById('editAnswerIndex').value = quiz.answer_index;
          document.getElementById('editExplanation').value = quiz.explanation || '';
          document.getElementById('quizFields').style.display = 'block';
          document.getElementById('faqFields').style.display = 'none';
          document.getElementById('editModal').style.display = 'flex';
        }
      }

      function editFaq(id) {
        const faq = faqs.find(f => f.id == id);
        if (faq) {
          document.getElementById('modalTitle').textContent = 'Edit FAQ';
          document.getElementById('editAction').value = 'edit_faq';
          document.getElementById('faqId').value = id;
          document.getElementById('editFaqQuestion').value = faq.question;
          document.getElementById('editFaqAnswer').value = faq.answer;
          document.getElementById('quizFields').style.display = 'none';
          document.getElementById('faqFields').style.display = 'block';
          document.getElementById('editModal').style.display = 'flex';
        }
      }

      function closeModal() {
        document.getElementById('editModal').style.display = 'none';
      }
    </script>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>
  </body>
</html>
