<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kursus Materi | CourseUp</title>
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
  <body data-page="courses" class="bg-slate-50 text-slate-900 antialiased">
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="index.php" class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white">C</div>
          <div><span class="text-2xl font-black tracking-tight text-slate-900">Course</span><span class="text-2xl font-black tracking-tight text-blue-600">Up</span></div>
        </a>

        <div class="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          <a href="index.php" class="transition hover:text-blue-600">Beranda</a>
          <a href="courses.php" class="font-semibold text-blue-600">Kursus Materi</a>
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
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Kursus materi</p>
        <h1 class="mt-3 text-4xl font-black text-slate-900">Belajar Web Developer dengan materi yang siap dipakai</h1>
      </section>

      <div class="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside data-aos="fade-right" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-xl font-black text-slate-900">Daftar modul</h2>
          <div id="materialList" class="mt-5 space-y-3"></div>
        </aside>

        <div data-aos="fade-left" class="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div class="mb-3 flex items-center justify-between px-2 pt-2">
            <div>
              <p class="text-sm font-semibold text-slate-500">Preview materi</p>
              <h3 class="text-xl font-black text-slate-900">Viewer PDF</h3>
            </div>
            <span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Tanpa download</span>
          </div>
          <iframe id="materialViewer" class="material-frame w-full rounded-2xl border border-slate-200" src="" title="Preview PDF materi"></iframe>
        </div>
      </div>
    </main>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>
  </body>
</html>
