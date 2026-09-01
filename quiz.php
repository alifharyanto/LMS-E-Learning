<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Latihan Soal | CourseUp</title>
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
  <body data-page="home" class="bg-slate-50 text-slate-900 antialiased">
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="index.php" class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white">C</div>
          <div><span class="text-2xl font-black tracking-tight text-slate-900">Course</span><span class="text-2xl font-black tracking-tight text-blue-600">Up</span></div>
        </a>

        <div class="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          <a href="index.php" class="transition hover:text-blue-600">Beranda</a>
          <a href="courses.php" class="transition hover:text-blue-600">Kursus Materi</a>
          <a href="quiz.php" class="font-semibold text-blue-600">Latihan Soal</a>
          <a href="forum.php" class="transition hover:text-blue-600">Forum</a>
          <a href="help-center.php" class="transition hover:text-blue-600">Help Center</a>
        </div>

        <div class="flex items-center gap-3">
          <a href="dashboard.php" class="ml-1 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-blue-200 bg-slate-100" aria-label="Dashboard pengguna">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" alt="Avatar pengguna" class="h-full w-full object-cover" />
          </a>
        </div>
      </nav>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section class="mb-8 text-center" data-aos="fade-up">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Latihan soal</p>
        <h1 class="mt-3 text-4xl font-black text-slate-900">Quiz Web Developer</h1>
      </section>

      <div class="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div data-aos="fade-right" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="mb-5 flex items-center justify-between gap-4">
            <h2 class="text-xl font-black text-slate-900">Soal latihan</h2>
            <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Live</span>
          </div>
          <div id="quizPlayer" class="quiz-scroll space-y-4"></div>
        </div>

        <div data-aos="fade-left" class="space-y-6">
          <div id="quizSummary" class="rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Ringkasan</p>
            <h3 class="mt-3 text-3xl font-black text-slate-900">0%</h3>
            <p class="mt-2 text-sm text-slate-700">Belum ada hasil. Mulai kuis untuk melihat skor Anda.</p>
          </div>

          <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 class="text-xl font-black text-slate-900">Tips belajar</h3>
            <ul class="mt-4 space-y-3 text-sm text-slate-600">
              <li>• Fokus memahami konsep sebelum menghafal jawaban.</li>
              <li>• Coba ulang soal hingga score stabil di atas 80%.</li>
              <li>• Gunakan materi di kursus sebagai referensi utama.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>
  </body>
</html>
