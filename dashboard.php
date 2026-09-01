<?php
require __DIR__ . '/koneksi.php';

if (!isset($_SESSION['user'])) {
    redirect('login.php');
}

$user = $_SESSION['user'];
if ($user['role'] !== 'student') {
    redirect('admin.php');
}

$resultQuery = mysqli_prepare($koneksi, 'SELECT score, total, percent, created_at FROM quiz_results WHERE user_id = ? ORDER BY created_at DESC');
mysqli_stmt_bind_param($resultQuery, 'i', $user['id']);
mysqli_stmt_execute($resultQuery);
$results = mysqli_stmt_get_result($resultQuery);
$results = mysqli_fetch_all($results, MYSQLI_ASSOC);
?>
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dashboard | CourseUp</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>tailwind.config = { theme: { extend: { colors: { brand: { blue: '#2563EB', dark: '#111111' } } } } };</script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet" />
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body data-page="dashboard" class="bg-slate-50 text-slate-900 antialiased">
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
          <a href="help-center.php" class="transition hover:text-blue-600">Help Center</a>
        </div>
        <div class="flex items-center gap-3">
          <a href="logout.php" class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-500 hover:text-red-600">Keluar</a>
          <a href="dashboard.php" class="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-blue-200 bg-slate-100">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" alt="Avatar pengguna" class="h-full w-full object-cover" />
          </a>
        </div>
      </nav>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section class="mb-8 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm" data-aos="fade-up">
        <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-4">
            <div class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-blue-200 bg-slate-100">
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" alt="Profil siswa" class="h-full w-full object-cover" />
            </div>
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Profile siswa</p>
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
        <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up"><p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Kursus selesai</p><p class="mt-3 text-4xl font-black text-slate-900">12</p><p class="mt-2 text-sm text-slate-600">Modul yang telah dipelajari</p></article>
        <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up" data-aos-delay="100"><p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Tingkat kemajuan</p><p class="mt-3 text-4xl font-black text-slate-900">76%</p><p class="mt-2 text-sm text-slate-600">Progress pembelajaran siswa</p></article>
        <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up" data-aos-delay="200"><p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Skor rata-rata</p><p class="mt-3 text-4xl font-black text-slate-900">92%</p><p class="mt-2 text-sm text-slate-600">Rata-rata hasil latihan</p></article>
      </section>

      <section class="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-right">
          <div class="flex items-center justify-between gap-3"><h2 class="text-xl font-black text-slate-900">Statistik durasi belajar</h2><span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Minggu ini</span></div>
          <div class="mt-6">
            <div class="mb-2 flex items-center justify-between text-sm text-slate-600"><span>Progress belajar</span><span>72%</span></div>
            <div class="h-3 w-full overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-blue-600" style="width: 72%"></div></div>
          </div>
          <div class="mt-8 rounded-2xl bg-slate-50 p-4">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Aktivitas terakhir</p>
            <ul class="mt-4 space-y-3 text-sm text-slate-700">
              <li class="flex items-center justify-between"><span>Matematika Dasar</span><span class="font-semibold text-blue-600">1h 20m</span></li>
              <li class="flex items-center justify-between"><span>Fisika Dasar</span><span class="font-semibold text-blue-600">55m</span></li>
              <li class="flex items-center justify-between"><span>Pemrograman Web</span><span class="font-semibold text-blue-600">1h 05m</span></li>
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
    </main>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>
  </body>
</html>

