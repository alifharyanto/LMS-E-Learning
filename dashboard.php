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
    <script>tailwind.config = { theme: { extend: { colors: { brand: { blue: '#2563EB', dark: '#111111' }, ocean: { 600: '#0d9488', 700: '#0f766e' }, emerald: { 600: '#16a34a' } } } } };</script>
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
      <section class="mb-8 rounded-[32px] border border-emerald-300/30 bg-white p-6 shadow-sm card-glow" data-aos="fade-up">
        <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-4">
            <div class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-emerald-300 bg-emerald-50">
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" alt="Profil siswa" class="h-full w-full object-cover" />
            </div>
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.2em] bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">Profile siswa</p>
              <h1 class="mt-2 text-3xl font-black text-slate-900"><?php echo htmlspecialchars($user['username']); ?></h1>
              <p class="text-sm text-slate-500"><?php echo htmlspecialchars($user['email']); ?></p>
            </div>
          </div>

          <div class="rounded-2xl bg-blue-50 px-5 py-4 text-left">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Waktu belajar minggu ini</p>
            <p class="mt-2 text-3xl font-black text-slate-900">4j 30m</p>
          </div>
        </div>
      </section>

      <section class="grid gap-6 md:grid-cols-3">
        <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up"><p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Kuis Diselesaikan</p><p class="mt-3 text-4xl font-black text-slate-900"><?php echo $quizzes_taken; ?></p><p class="mt-2 text-sm text-slate-600">Quiz yang telah dikerjakan</p></article>
        <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up" data-aos-delay="100"><p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Skor Rata-rata</p><p class="mt-3 text-4xl font-black text-slate-900"><?php echo $avg_score; ?>%</p><p class="mt-2 text-sm text-slate-600">Rata-rata hasil latihan</p></article>
        <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up" data-aos-delay="200"><p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Forum Threads</p><p class="mt-3 text-4xl font-black text-slate-900"><?php echo $forum_threads_count; ?></p><p class="mt-2 text-sm text-slate-600">Thread yang dibuat</p></article>
      </section>

      <section class="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-right">
          <div class="flex items-center justify-between gap-3"><h2 class="text-xl font-black text-slate-900">Statistik Pembelajaran</h2><span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Seumur Hidup</span></div>
          <div class="mt-6">
            <div class="mb-2 flex items-center justify-between text-sm text-slate-600"><span>Progress belajar</span><span><?php echo $avg_score; ?>%</span></div>
            <div class="h-3 w-full overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-blue-600" style="width: <?php echo $avg_score; ?>%"></div></div>
          </div>
          <div class="mt-8 rounded-2xl bg-slate-50 p-4">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Ringkasan Aktivitas</p>
            <ul class="mt-4 space-y-3 text-sm text-slate-700">
              <li class="flex items-center justify-between"><span>Quiz Diselesaikan</span><span class="font-semibold text-blue-600"><?php echo $quizzes_taken; ?> kuis</span></li>
              <li class="flex items-center justify-between"><span>Skor Tertinggi</span><span class="font-semibold text-blue-600"><?php echo !empty($results) ? max(array_column($results, 'percent')) : 0; ?>%</span></li>
              <li class="flex items-center justify-between"><span>Thread Forum</span><span class="font-semibold text-blue-600"><?php echo $forum_threads_count; ?> thread</span></li>
            </ul>
          </div>
        </div>

        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-left">
          <h2 class="text-xl font-black text-slate-900">Riwayat nilai</h2>
          <?php if (empty($results)): ?>
            <p class="mt-5 text-sm text-slate-500">Belum ada riwayat nilai.</p>
          <?php else: ?>
            <div class="mt-5 space-y-4">
              <?php foreach ($results as $item): ?>
                <div class="rounded-2xl border border-slate-200 bg-white p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-slate-800">Ujian Web Developer</p>
                      <p class="text-xs text-slate-500"><?php echo date('d M Y', strtotime($item['created_at'])); ?></p>
                    </div>
                    <span class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"><?php echo (int) $item['score']; ?>/<?php echo (int) $item['total']; ?></span>
                  </div>
                  <div class="mt-3 h-2.5 rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-blue-600" style="width: <?php echo (int) $item['percent']; ?>%"></div>
                  </div>
                </div>
              <?php endforeach; ?>
            </div>
          <?php endif; ?>
        </div>
      </section>

      <section class="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up">
        <div class="flex items-center justify-between gap-3 mb-6">
          <h2 class="text-xl font-black text-slate-900">Pertanyaan yang Sering Diajukan</h2>
          <a href="help-center.php" class="text-xs font-semibold text-blue-600 hover:text-blue-700 transition">Lihat Semua →</a>
        </div>
        
        <?php if (empty($faqs)): ?>
          <p class="text-sm text-slate-500 text-center py-8">Belum ada FAQ yang tersedia.</p>
        <?php else: ?>
          <div class="space-y-3">
            <?php foreach ($faqs as $faq): ?>
              <details class="group rounded-xl border border-slate-200 bg-slate-50 p-4 cursor-pointer transition hover:border-blue-300 hover:bg-blue-50">
                <summary class="flex items-center justify-between font-medium text-slate-700 marker:content-none">
                  <span class="flex items-center gap-3">
                    <span class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 group-open:bg-blue-600 group-open:text-white transition">?</span>
                    <span class="group-open:text-blue-600 transition"><?php echo htmlspecialchars($faq['question']); ?></span>
                  </span>
                  <svg class="h-5 w-5 text-slate-400 group-open:rotate-180 group-open:text-blue-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

