<?php
require __DIR__ . '/koneksi.php';

if (!isset($_SESSION['user'])) {
    redirect('login.php');
}

$user = $_SESSION['user'];
if ($user['role'] !== 'student') {
    redirect('admin.php');
}

// Fetch quiz results
$resultQuery = mysqli_prepare($koneksi, 'SELECT score, total, percent, created_at FROM quiz_results WHERE user_id = ? ORDER BY created_at DESC');
mysqli_stmt_bind_param($resultQuery, 'i', $user['id']);
mysqli_stmt_execute($resultQuery);
$results = mysqli_stmt_get_result($resultQuery);
$results = mysqli_fetch_all($results, MYSQLI_ASSOC);

// Calculate stats
$quizzes_taken = count($results);
$avg_score = 0;
if ($quizzes_taken > 0) {
    $avg_score_query = mysqli_prepare($koneksi, 'SELECT AVG(percent) as avg_percent FROM quiz_results WHERE user_id = ?');
    mysqli_stmt_bind_param($avg_score_query, 'i', $user['id']);
    mysqli_stmt_execute($avg_score_query);
    $avg_result = mysqli_stmt_get_result($avg_score_query);
    $avg_data = mysqli_fetch_assoc($avg_result);
    $avg_score = round($avg_data['avg_percent'] ?? 0);
}

// Forum activity
$forum_threads_query = mysqli_prepare($koneksi, 'SELECT COUNT(*) as count FROM forum_threads WHERE user_id = ?');
mysqli_stmt_bind_param($forum_threads_query, 'i', $user['id']);
mysqli_stmt_execute($forum_threads_query);
$forum_result = mysqli_stmt_get_result($forum_threads_query);
$forum_data = mysqli_fetch_assoc($forum_result);
$forum_threads_count = $forum_data['count'] ?? 0;

// Latest activity date
$latest_query = mysqli_prepare($koneksi, 'SELECT MAX(created_at) as latest FROM quiz_results WHERE user_id = ?');
mysqli_stmt_bind_param($latest_query, 'i', $user['id']);
mysqli_stmt_execute($latest_query);
$latest_result = mysqli_stmt_get_result($latest_query);
$latest_data = mysqli_fetch_assoc($latest_result);
$latest_activity = $latest_data['latest'] ?? null;

// Fetch FAQs
$faq_query = mysqli_prepare($koneksi, 'SELECT id, question, answer FROM faqs ORDER BY created_at DESC LIMIT 5');
mysqli_stmt_execute($faq_query);
$faq_result = mysqli_stmt_get_result($faq_query);
$faqs = mysqli_fetch_all($faq_result, MYSQLI_ASSOC);
?>
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dashboard | CourseUp</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>tailwind.config = { theme: { extend: { colors: { brand: { blue: '#2563EB', dark: '#111111' }, ocean: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' }, emerald: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#134e4a' } } } } };</script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet" />
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body data-page="dashboard" class="bg-gradient-to-b from-slate-50 to-emerald-50 text-slate-900 antialiased">
    <header class="sticky top-0 z-40 border-b border-emerald-300/30 bg-white/70 backdrop-blur-md">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="index.php" class="flex items-center gap-3 group">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-700 to-emerald-600 text-lg font-black text-white group-hover:shadow-lg group-hover:shadow-emerald-500/30 transition-all">C</div>
          <div><span class="text-2xl font-black tracking-tight bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">Course</span><span class="text-2xl font-black tracking-tight text-emerald-600">Up</span></div>
        </a>
        <div class="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          <a href="index.php" class="transition hover:text-emerald-600">Beranda</a>
          <a href="courses.php" class="transition hover:text-emerald-600">Kursus Materi</a>
          <a href="quiz.php" class="transition hover:text-emerald-600">Latihan Soal</a>
          <a href="forum.php" class="transition hover:text-emerald-600">Forum</a>
          <a href="help-center.php" class="transition hover:text-emerald-600">Help Center</a>
        </div>
        <div class="flex items-center gap-3">
          <a href="logout.php" class="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:border-red-500">Keluar</a>
          <a href="dashboard.php" class="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-300 bg-emerald-50 hover:shadow-lg hover:shadow-emerald-500/20 transition">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" alt="Avatar pengguna" class="h-full w-full object-cover" />
          </a>
        </div>
      </nav>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section class="mb-8 rounded-[32px] border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-6 shadow-sm card-glow" data-aos="fade-up">
        <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-4">
            <div class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-emerald-300 bg-emerald-50 hover:shadow-lg hover:shadow-emerald-500/20 transition">
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" alt="Profil siswa" class="h-full w-full object-cover" />
            </div>
            <div>
              <span class="inline-flex rounded-full border border-emerald-300/50 bg-emerald-50/50 backdrop-blur-sm px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">👤 Profil Siswa</span>
              <h1 class="mt-2 text-3xl font-black text-slate-900"><?php echo htmlspecialchars($user['username']); ?></h1>
              <p class="text-sm text-slate-500"><?php echo htmlspecialchars($user['email']); ?></p>
            </div>
          </div>

          <div class="rounded-2xl bg-gradient-to-br from-ocean-100 to-emerald-100 px-5 py-4 text-left border border-emerald-300/50 card-glow">
            <span class="inline-flex rounded-full border border-ocean-300/50 bg-ocean-100/50 px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-ocean-700">⏱️ Waktu Belajar</span>
            <p class="mt-2 text-3xl font-black bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">4j 30m</p>
            <p class="text-sm text-slate-600">Minggu ini</p>
          </div>
        </div>
      </section>

      <section class="grid gap-6 md:grid-cols-3">
        <article class="rounded-3xl border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-5 shadow-sm card-glow" data-aos="fade-up"><span class="inline-flex rounded-full border border-emerald-300/50 bg-emerald-50/50 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 px-2 py-1">📋 Kuis Diselesaikan</span><p class="mt-3 text-4xl font-black text-slate-900"><?php echo $quizzes_taken; ?></p><p class="mt-2 text-sm text-slate-600">Quiz yang telah dikerjakan</p></article>
        <article class="rounded-3xl border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-5 shadow-sm card-glow" data-aos="fade-up" data-aos-delay="100"><span class="inline-flex rounded-full border border-emerald-300/50 bg-emerald-50/50 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 px-2 py-1">📊 Skor Rata-rata</span><p class="mt-3 text-4xl font-black bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent"><?php echo $avg_score; ?>%</p><p class="mt-2 text-sm text-slate-600">Rata-rata hasil latihan</p></article>
        <article class="rounded-3xl border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-5 shadow-sm card-glow" data-aos="fade-up" data-aos-delay="200"><span class="inline-flex rounded-full border border-emerald-300/50 bg-emerald-50/50 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 px-2 py-1">💬 Forum Threads</span><p class="mt-3 text-4xl font-black text-slate-900"><?php echo $forum_threads_count; ?></p><p class="mt-2 text-sm text-slate-600">Thread yang dibuat</p></article>
      </section>

      <section class="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="rounded-3xl border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-5 shadow-sm card-glow" data-aos="fade-right">
          <div class="flex items-center justify-between gap-3"><h2 class="text-xl font-black text-slate-900">📈 Statistik Pembelajaran</h2><span class="rounded-full bg-gradient-to-r from-ocean-100 to-emerald-100 border border-emerald-300/50 px-3 py-1 text-xs font-semibold text-emerald-700">Seumur Hidup</span></div>
          <div class="mt-6">
            <div class="mb-2 flex items-center justify-between text-sm text-slate-600"><span>Progress belajar</span><span class="font-semibold text-emerald-600"><?php echo $avg_score; ?>%</span></div>
            <div class="h-3 w-full overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-gradient-to-r from-ocean-600 to-emerald-600" style="width: <?php echo $avg_score; ?>%"></div></div>
          </div>
          <div class="mt-8 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-ocean-50/50 border border-emerald-300/30 p-4">
            <span class="inline-flex rounded-full border border-emerald-300/50 bg-emerald-100/50 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 px-2 py-1">📋 Ringkasan Aktivitas</span>
            <ul class="mt-4 space-y-3 text-sm text-slate-700">
              <li class="flex items-center justify-between"><span>Quiz Diselesaikan</span><span class="font-semibold bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent"><?php echo $quizzes_taken; ?> kuis</span></li>
              <li class="flex items-center justify-between"><span>Skor Tertinggi</span><span class="font-semibold bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent"><?php echo !empty($results) ? max(array_column($results, 'percent')) : 0; ?>%</span></li>
              <li class="flex items-center justify-between"><span>Thread Forum</span><span class="font-semibold bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent"><?php echo $forum_threads_count; ?> thread</span></li>
            </ul>
          </div>
        </div>

        <div class="rounded-3xl border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-5 shadow-sm card-glow" data-aos="fade-left">
          <h2 class="text-xl font-black text-slate-900">📝 Riwayat Nilai</h2>
          <?php if (empty($results)): ?>
            <p class="mt-5 text-sm text-slate-500">Belum ada riwayat nilai.</p>
          <?php else: ?>
            <div class="mt-5 space-y-4">
              <?php foreach ($results as $item): ?>
                <div class="rounded-2xl border border-emerald-300/30 bg-gradient-to-br from-white/50 to-emerald-50/30 backdrop-blur-sm p-4 hover:border-emerald-300/50 transition">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-slate-800">Ujian Web Developer</p>
                      <p class="text-xs text-slate-500"><?php echo date('d M Y', strtotime($item['created_at'])); ?></p>
                    </div>
                    <span class="rounded-full bg-gradient-to-r from-ocean-100 to-emerald-100 border border-emerald-300/50 px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent"><?php echo (int) $item['score']; ?>/<?php echo (int) $item['total']; ?></span>
                  </div>
                  <div class="mt-3 h-2.5 rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-gradient-to-r from-ocean-600 to-emerald-600" style="width: <?php echo (int) $item['percent']; ?>%"></div>
                  </div>
                </div>
              <?php endforeach; ?>
            </div>
          <?php endif; ?>
        </div>
      </section>

      <section class="mt-8 rounded-3xl border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-5 shadow-sm card-glow" data-aos="fade-up">
        <div class="flex items-center justify-between gap-3 mb-6">
          <h2 class="text-xl font-black text-slate-900">❓ Pertanyaan yang Sering Diajukan</h2>
          <a href="help-center.php" class="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition">Lihat Semua →</a>
        </div>
        
        <?php if (empty($faqs)): ?>
          <p class="text-sm text-slate-500 text-center py-8">Belum ada FAQ yang tersedia.</p>
        <?php else: ?>
          <div class="space-y-3">
            <?php foreach ($faqs as $faq): ?>
              <details class="group rounded-xl border border-emerald-300/30 bg-emerald-50/50 backdrop-blur-sm p-4 cursor-pointer transition hover:border-emerald-300/50 hover:bg-emerald-50">
                <summary class="flex items-center justify-between font-medium text-slate-700 marker:content-none">
                  <span class="flex items-center gap-3">
                    <span class="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-ocean-100 to-emerald-100 text-xs font-bold text-emerald-700 group-open:bg-gradient-to-br group-open:from-ocean-600 group-open:to-emerald-600 group-open:text-white transition">?</span>
                    <span class="group-open:text-emerald-600 transition"><?php echo htmlspecialchars($faq['question']); ?></span>
                  </span>
                  <svg class="h-5 w-5 text-slate-400 group-open:rotate-180 group-open:text-emerald-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                  </svg>
                </summary>
                <div class="mt-4 pl-9 text-sm text-slate-600 leading-relaxed">
                  <?php echo htmlspecialchars($faq['answer']); ?>
                </div>
              </details>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
      </section>
    </main>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>
  </body>
</html>

