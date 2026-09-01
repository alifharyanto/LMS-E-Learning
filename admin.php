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
            <h1 class="mt-2 text-3xl font-black text-slate-900">Selamat datang, <span id="adminIdentity">Admin</span></h1>
          </div>
          <a href="index.php" class="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Lihat website</a>
        </div>
      </section>

      <section class="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up">
          <h2 class="text-xl font-black text-slate-900">Kelola Quiz Web Developer</h2>
          <form id="adminQuizForm" class="mt-5 space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Pertanyaan</label>
              <textarea name="question" rows="3" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Masukkan pertanyaan quiz"></textarea>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Pilihan A</label>
                <input name="option1" type="text" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Pilihan B</label>
                <input name="option2" type="text" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Pilihan C</label>
                <input name="option3" type="text" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Pilihan D</label>
                <input name="option4" type="text" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Jawaban benar</label>
              <select name="answer" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="0">A</option>
                <option value="1">B</option>
                <option value="2">C</option>
                <option value="3">D</option>
              </select>
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
              <tbody id="adminQuizTable"></tbody>
            </table>
          </div>
        </div>

        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up" data-aos-delay="100">
          <h2 class="text-xl font-black text-slate-900">Kelola FAQ</h2>
          <form id="adminFaqForm" class="mt-5 space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Judul FAQ</label>
              <input name="question" type="text" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Contoh: Bagaimana cara login?" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Jawaban</label>
              <textarea name="answer" rows="4" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Jawaban untuk FAQ..."></textarea>
            </div>
            <button type="submit" class="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Tambah FAQ</button>
          </form>

          <div class="mt-6 overflow-x-auto">
            <table class="min-w-full border-collapse text-left">
              <thead>
                <tr class="border-b border-slate-200 text-sm text-slate-600">
                  <th class="px-3 py-3 font-semibold">No</th>
                  <th class="px-3 py-3 font-semibold">Judul</th>
                  <th class="px-3 py-3 font-semibold">Jawaban</th>
                  <th class="px-3 py-3 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody id="adminFaqTable"></tbody>
            </table>
          </div>
        </div>
      </section>
    </main>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>
  </body>
</html>
