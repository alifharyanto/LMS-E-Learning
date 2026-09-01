<?php
require __DIR__ . '/koneksi.php';

// Fetch all FAQs from database
$faqs_result = mysqli_query($koneksi, 'SELECT id, question, answer FROM faqs ORDER BY created_at DESC');
$faqs = mysqli_fetch_all($faqs_result, MYSQLI_ASSOC);

$user = $_SESSION['user'] ?? null;
$csrf_token = generateCSRFToken();
$message = '';
$message_type = '';

// Handle FAQ operations for admin
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $user && $user['role'] === 'admin' && isset($_POST['csrf_token'])) {
    if (!validateCSRFToken($_POST['csrf_token'])) {
        $message = 'Token validasi gagal.';
        $message_type = 'error';
    } elseif (isset($_POST['action']) && $_POST['action'] === 'add_faq') {
        $faq_question = trim($_POST['faq_question'] ?? '');
        $faq_answer = trim($_POST['faq_answer'] ?? '');

        if ($faq_question && $faq_answer) {
            $stmt = mysqli_prepare($koneksi, 'INSERT INTO faqs (question, answer) VALUES (?, ?)');
            mysqli_stmt_bind_param($stmt, 'ss', $faq_question, $faq_answer);
            if (mysqli_stmt_execute($stmt)) {
                $message = 'FAQ berhasil ditambahkan!';
                $message_type = 'success';
                // Refresh FAQs
                $faqs_result = mysqli_query($koneksi, 'SELECT id, question, answer FROM faqs ORDER BY created_at DESC');
                $faqs = mysqli_fetch_all($faqs_result, MYSQLI_ASSOC);
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
                // Refresh FAQs
                $faqs_result = mysqli_query($koneksi, 'SELECT id, question, answer FROM faqs ORDER BY created_at DESC');
                $faqs = mysqli_fetch_all($faqs_result, MYSQLI_ASSOC);
            } else {
                $message = 'Gagal memperbarui FAQ.';
                $message_type = 'error';
            }
            mysqli_stmt_close($stmt);
        }
    } elseif (isset($_POST['action']) && $_POST['action'] === 'delete_faq') {
        $faq_id = (int)($_POST['faq_id'] ?? 0);
        if ($faq_id > 0) {
            $stmt = mysqli_prepare($koneksi, 'DELETE FROM faqs WHERE id = ?');
            mysqli_stmt_bind_param($stmt, 'i', $faq_id);
            if (mysqli_stmt_execute($stmt)) {
                $message = 'FAQ berhasil dihapus!';
                $message_type = 'success';
                // Refresh FAQs
                $faqs_result = mysqli_query($koneksi, 'SELECT id, question, answer FROM faqs ORDER BY created_at DESC');
                $faqs = mysqli_fetch_all($faqs_result, MYSQLI_ASSOC);
            } else {
                $message = 'Gagal menghapus FAQ.';
                $message_type = 'error';
            }
            mysqli_stmt_close($stmt);
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Help Center | CourseUp</title>
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
  <body data-page="help" class="bg-slate-50 text-slate-900 antialiased">
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="index.php" class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white">C</div>
          <div><span class="text-2xl font-black tracking-tight text-slate-900">Course</span><span class="text-2xl font-black tracking-tight text-blue-600">Up</span></div>
        </a>

        <div class="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          <a href="index.php" class="transition hover:text-blue-600">Beranda</a>
          <a href="courses.php" class="transition hover:text-blue-600">Kursus Materi</a>
          <a href="quiz.php" class="transition hover:text-blue-600">Latihan Soal</a>
          <a href="forum.php" class="transition hover:text-blue-600">Forum</a>
          <a href="help-center.php" class="font-semibold text-blue-600">Help Center</a>
        </div>

        <div class="flex items-center gap-3">
          <?php if ($user): ?>
            <a href="dashboard.php" class="ml-1 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-blue-200 bg-slate-100" aria-label="Dashboard pengguna">
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" alt="Avatar pengguna" class="h-full w-full object-cover" />
            </a>
          <?php else: ?>
            <a href="login.php" class="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Login</a>
          <?php endif; ?>
        </div>
      </nav>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <section class="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm" data-aos="fade-up">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Help Center</p>
        <h1 class="mt-3 text-4xl font-black text-slate-900">Pertanyaan yang sering ditanyakan</h1>

        <?php if ($message): ?>
          <div class="mt-6 rounded-2xl border <?php echo $message_type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'; ?> p-4">
            <p class="text-sm font-semibold <?php echo $message_type === 'success' ? 'text-green-700' : 'text-red-700'; ?>"><?php echo htmlspecialchars($message); ?></p>
          </div>
        <?php endif; ?>

        <!-- Admin Add FAQ Form -->
        <?php if ($user && $user['role'] === 'admin'): ?>
          <div class="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <h2 class="text-lg font-bold text-slate-900 mb-4">Tambah FAQ Baru (Admin)</h2>
            <form method="POST" class="space-y-4">
              <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
              <input type="hidden" name="action" value="add_faq">
              <div>
                <input name="faq_question" type="text" class="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500" placeholder="Judul FAQ" required />
              </div>
              <div>
                <textarea name="faq_answer" rows="3" class="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500" placeholder="Jawaban FAQ" required></textarea>
              </div>
              <button type="submit" class="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700">Tambah FAQ</button>
            </form>
          </div>
        <?php endif; ?>

        <!-- FAQ List -->
        <div class="mt-8 space-y-4">
          <?php if (empty($faqs)): ?>
            <p class="text-center text-slate-500 py-8">Belum ada FAQ tersedia.</p>
          <?php else: ?>
            <?php foreach ($faqs as $faq): ?>
              <details class="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition cursor-pointer">
                <summary class="flex items-center justify-between gap-4 font-semibold text-slate-900 list-none">
                  <span><?php echo htmlspecialchars($faq['question']); ?></span>
                  <span class="text-2xl group-open:rotate-180 transition transform">+</span>
                </summary>
                <div class="mt-4 text-slate-600 space-y-3">
                  <p><?php echo htmlspecialchars($faq['answer']); ?></p>
                  <?php if ($user && $user['role'] === 'admin'): ?>
                    <div class="pt-3 border-t border-slate-200 flex gap-2">
                      <button onclick="editFaqModal(<?php echo (int)$faq['id']; ?>)" class="text-xs font-semibold text-blue-600 hover:text-blue-700">Edit</button>
                      <form method="POST" style="display:inline;">
                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                        <input type="hidden" name="action" value="delete_faq">
                        <input type="hidden" name="faq_id" value="<?php echo (int)$faq['id']; ?>">
                        <button type="submit" class="text-xs font-semibold text-red-600 hover:text-red-700" onclick="return confirm('Hapus FAQ ini?')">Hapus</button>
                      </form>
                    </div>
                  <?php endif; ?>
                </div>
              </details>
            <?php endforeach; ?>
          <?php endif; ?>
        </div>
      </section>
    </main>

    <!-- Edit Modal for Admin -->
    <?php if ($user && $user['role'] === 'admin'): ?>
      <div id="editModal" style="display:none" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          <h3 class="text-xl font-black text-slate-900">Edit FAQ</h3>
          <form id="editForm" method="POST" class="mt-5 space-y-4">
            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
            <input type="hidden" name="action" value="edit_faq">
            <input type="hidden" name="faq_id" id="editFaqId" value="">
            
            <input name="faq_question" id="editFaqQuestion" type="text" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required />
            <textarea name="faq_answer" id="editFaqAnswer" rows="4" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required></textarea>

            <div class="flex gap-3">
              <button type="submit" class="flex-1 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Simpan</button>
              <button type="button" onclick="closeEditModal()" class="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300">Batal</button>
            </div>
          </form>
        </div>
      </div>

      <script>
        const faqs = <?php echo json_encode($faqs); ?>;

        function editFaqModal(id) {
          const faq = faqs.find(f => f.id == id);
          if (faq) {
            document.getElementById('editFaqId').value = id;
            document.getElementById('editFaqQuestion').value = faq.question;
            document.getElementById('editFaqAnswer').value = faq.answer;
            document.getElementById('editModal').style.display = 'flex';
          }
        }

        function closeEditModal() {
          document.getElementById('editModal').style.display = 'none';
        }
      </script>
    <?php endif; ?>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>
  </body>
</html>
