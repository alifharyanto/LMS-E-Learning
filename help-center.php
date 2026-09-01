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
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              brand: { blue: '#2563EB', dark: '#111111' },
              ocean: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' },
              emerald: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#134e4a' }
            }
          }
        }
      };
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet" />
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body data-page="help" class="bg-gradient-to-b from-slate-50 to-emerald-50 text-slate-900 antialiased">
    <header class="sticky top-0 z-40 border-b border-emerald-300/30 bg-white/70 backdrop-blur-md">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="index.php" class="flex items-center gap-3 group">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-700 to-emerald-600 text-lg font-black text-white shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-all">C</div>
          <div><span class="text-2xl font-black tracking-tight bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">Course</span><span class="text-2xl font-black tracking-tight text-emerald-600">Up</span></div>
        </a>

        <div class="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          <a href="index.php" class="transition hover:text-emerald-600 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-ocean-600 after:to-emerald-600 after:transition-all hover:after:w-full">Beranda</a>
          <a href="courses.php" class="transition hover:text-emerald-600 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-ocean-600 after:to-emerald-600 after:transition-all hover:after:w-full">Kursus Materi</a>
          <a href="quiz.php" class="transition hover:text-emerald-600 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-ocean-600 after:to-emerald-600 after:transition-all hover:after:w-full">Latihan Soal</a>
          <a href="forum.php" class="transition hover:text-emerald-600 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-ocean-600 after:to-emerald-600 after:transition-all hover:after:w-full">Forum</a>
          <a href="help-center.php" class="font-semibold bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">Help Center</a>
        </div>

        <div class="flex items-center gap-3">
          <?php if ($user): ?>
            <a href="dashboard.php" class="ml-1 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-300 bg-emerald-50 hover:shadow-lg hover:shadow-emerald-500/20 transition" aria-label="Dashboard pengguna">
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" alt="Avatar pengguna" class="h-full w-full object-cover" />
            </a>
          <?php else: ?>
            <a href="login.php" class="rounded-full bg-gradient-to-r from-ocean-700 to-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-emerald-500/30 transition">Login</a>
          <?php endif; ?>
        </div>
      </nav>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <section class="rounded-[32px] border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-8 shadow-sm card-glow" data-aos="fade-up">
        <span class="inline-flex rounded-full border border-emerald-300/50 bg-emerald-50/50 backdrop-blur-sm px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">❓ Help Center</span>
        <h1 class="mt-4 text-4xl font-black text-slate-900">Pertanyaan yang sering ditanyakan</h1>
        <p class="mt-3 text-lg text-slate-600">Temukan jawaban untuk pertanyaan umum tentang CourseUp</p>

        <?php if ($message): ?>
          <div class="mt-6 rounded-2xl border <?php echo $message_type === 'success' ? 'border-emerald-300/50 bg-emerald-50/50' : 'border-orange-300/50 bg-orange-50/50'; ?> p-4 backdrop-blur-sm">
            <p class="text-sm font-semibold <?php echo $message_type === 'success' ? 'text-emerald-700' : 'text-orange-700'; ?>"><?php echo htmlspecialchars($message); ?></p>
          </div>
        <?php endif; ?>

        <!-- Admin Add FAQ Form -->
        <?php if ($user && $user['role'] === 'admin'): ?>
          <div class="mt-8 rounded-2xl border border-emerald-300/50 bg-gradient-to-br from-emerald-50/50 to-ocean-50/50 p-6 backdrop-blur-sm">
            <h2 class="text-lg font-bold text-slate-900 mb-4">✏️ Tambah FAQ Baru (Admin)</h2>
            <form method="POST" class="space-y-4">
              <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
              <input type="hidden" name="action" value="add_faq">
              <div>
                <input name="faq_question" type="text" class="w-full rounded-xl border border-emerald-300/30 bg-white/50 px-4 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white transition" placeholder="Judul FAQ" required />
              </div>
              <div>
                <textarea name="faq_answer" rows="3" class="w-full rounded-xl border border-emerald-300/30 bg-white/50 px-4 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white transition" placeholder="Jawaban FAQ" required></textarea>
              </div>
              <button type="submit" class="rounded-full bg-gradient-to-r from-ocean-700 to-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-emerald-500/30 transition">Tambah FAQ</button>
            </form>
          </div>
        <?php endif; ?>

        <!-- FAQ List -->
        <div class="mt-8 space-y-4">
          <?php if (empty($faqs)): ?>
            <p class="text-center text-slate-500 py-8">Belum ada FAQ tersedia.</p>
          <?php else: ?>
            <?php foreach ($faqs as $faq): ?>
              <details class="group rounded-2xl border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition cursor-pointer card-glow">
                <summary class="flex items-center justify-between gap-4 font-semibold text-slate-900 list-none">
                  <span><?php echo htmlspecialchars($faq['question']); ?></span>
                  <span class="text-2xl group-open:rotate-180 transition transform text-emerald-600">+</span>
                </summary>
                <div class="mt-4 text-slate-600 space-y-3">
                  <p><?php echo htmlspecialchars($faq['answer']); ?></p>
                  <?php if ($user && $user['role'] === 'admin'): ?>
                    <div class="pt-3 border-t border-emerald-300/30 flex gap-2">
                      <button onclick="editFaqModal(<?php echo (int)$faq['id']; ?>)" class="text-xs font-semibold text-emerald-600 hover:text-emerald-700">Edit</button>
                      <form method="POST" style="display:inline;">
                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                        <input type="hidden" name="action" value="delete_faq">
                        <input type="hidden" name="faq_id" value="<?php echo (int)$faq['id']; ?>">
                        <button type="submit" class="text-xs font-semibold text-orange-600 hover:text-orange-700" onclick="return confirm('Hapus FAQ ini?')">Hapus</button>
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
        <div class="w-full max-w-md rounded-3xl border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-6 shadow-lg">
          <h3 class="text-xl font-black text-slate-900">Edit FAQ</h3>
          <form id="editForm" method="POST" class="mt-5 space-y-4">
            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
            <input type="hidden" name="action" value="edit_faq">
            <input type="hidden" name="faq_id" id="editFaqId" value="">
            
            <input name="faq_question" id="editFaqQuestion" type="text" class="w-full rounded-2xl border border-emerald-300/30 bg-white/50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white transition" required />
            <textarea name="faq_answer" id="editFaqAnswer" rows="4" class="w-full rounded-2xl border border-emerald-300/30 bg-white/50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white transition" required></textarea>

            <div class="flex gap-3">
              <button type="submit" class="flex-1 rounded-full bg-gradient-to-r from-ocean-700 to-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-emerald-500/30 transition">Simpan</button>
              <button type="button" onclick="closeEditModal()" class="flex-1 rounded-full border border-emerald-300/30 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300/50 transition">Batal</button>
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
