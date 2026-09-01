<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Forum | CourseUp</title>
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
  <body data-page="forum" class="bg-slate-50 text-slate-900 antialiased">
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="index.php" class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white">C</div>
          <div><span class="text-2xl font-black tracking-tight text-slate-900">Course</span><span class="text-2xl font-black tracking-tight text-blue-600">Up</span></div>
        </a>

        <div class="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          <a href="index.php" class="transition hover:text-blue-600">Beranda</a>
          <a href="courses.php" class="transition hover:text-blue-600">Kursus Materi</a>
          <a href="forum.php" class="font-semibold text-blue-600">Forum</a>
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
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Forum</p>
        <h1 class="mt-3 text-4xl font-black text-slate-900">Belajar bersama, sharing, dan berdiskusi</h1>
      </section>

      <div class="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div data-aos="fade-right" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-xl font-black text-slate-900">Mulai thread baru</h2>
          <form id="threadForm" class="mt-5 space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Nama</label>
              <input name="author" type="text" value="Siswa" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Judul topik</label>
              <input name="title" type="text" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Misal: Tips belajar CSS" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Pesan</label>
              <textarea name="message" rows="5" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Tulis pertanyaan atau sharing Anda..."></textarea>
            </div>
            <button type="submit" class="w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">Kirim diskusi</button>
          </form>
        </div>

        <div id="forumThreads" data-aos="fade-left" class="space-y-5"></div>
      </div>
    </main>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>
  </body>
</html>
