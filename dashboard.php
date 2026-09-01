<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dashboard | CourseUp</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              brand: {
                blue: '#2563EB',
                dark: '#111111'
              }
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
  <body data-page="dashboard" class="bg-slate-50 text-slate-900 antialiased">
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="index.php" class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white">C</div>
          <div>
            <span class="text-2xl font-black tracking-tight text-slate-900">Course</span><span class="text-2xl font-black tracking-tight text-blue-600">Up</span>
          </div>
        </a>

        <div class="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          <a href="index.php#home" class="transition hover:text-blue-600">Beranda</a>
          <a href="index.php#courses" class="transition hover:text-blue-600">Kursus Materi</a>
          <a href="index.php#quiz" class="transition hover:text-blue-600">Latihan Soal</a>
          <a href="index.php#forum" class="transition hover:text-blue-600">Forum</a>
          <a href="index.php#help" class="transition hover:text-blue-600">Help Center</a>
        </div>

        <div class="flex items-center gap-3">
          <a href="logout.php" class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-500 hover:text-red-600">Keluar</a>
          <a href="dashboard.php" class="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-blue-200 bg-slate-100">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" alt="Avatar pengguna" class="h-full w-full object-cover" />
          </a>
        </div>
      </nav>
    </header>

    <script>
      const currentUser = JSON.parse(localStorage.getItem('courseup_user') || 'null');
      if (!currentUser) {
        window.location.href = 'login.php';
      }
    </script>

    <main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section class="mb-8 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm" data-aos="fade-up">
        <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-4">
            <div class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-blue-200 bg-slate-100">
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" alt="Profil siswa" class="h-full w-full object-cover" />
            </div>
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Profile siswa</p>
              <h1 id="profileName" class="mt-2 text-3xl font-black text-slate-900">Memuat...</h1>
              <p id="profileEmail" class="text-sm text-slate-500">Memuat...</p>
            </div>
          </div>

          <div class="rounded-2xl bg-blue-50 px-5 py-4 text-left">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Waktu belajar minggu ini</p>
            <p id="studyProgressValue" class="mt-2 text-3xl font-black text-slate-900">4j 30m</p>
          </div>
        </div>
      </section>

      <div id="loginPrompt" class="hidden rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <h2 class="text-2xl font-black text-slate-900">Anda belum login</h2>
        <p class="mt-2 text-slate-600">Silakan masuk untuk melihat dashboard profil dan riwayat belajar.</p>
        <div class="mt-5 flex justify-center gap-3">
          <a href="login.php" class="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Masuk</a>
          <a href="register.php" class="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-600">Daftar</a>
        </div>
      </div>

      <section class="grid gap-6 md:grid-cols-3">
        <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up">
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Kursus selesai</p>
          <p class="mt-3 text-4xl font-black text-slate-900">12</p>
          <p class="mt-2 text-sm text-slate-600">Modul yang telah dipelajari</p>
        </article>

        <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up" data-aos-delay="100">
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Tingkat kemajuan</p>
          <p class="mt-3 text-4xl font-black text-slate-900">76%</p>
          <p class="mt-2 text-sm text-slate-600">Progress pembelajaran siswa</p>
        </article>

        <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up" data-aos-delay="200">
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Skor rata-rata</p>
          <p class="mt-3 text-4xl font-black text-slate-900">92%</p>
          <p class="mt-2 text-sm text-slate-600">Rata-rata hasil latihan</p>
        </article>
      </section>

      <section class="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-right">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-xl font-black text-slate-900">Statistik durasi belajar</h2>
            <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Minggu ini</span>
          </div>
          <div class="mt-6">
            <div class="mb-2 flex items-center justify-between text-sm text-slate-600">
              <span>Progress belajar</span>
              <span id="studyProgressText">72%</span>
            </div>
            <div class="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div id="studyProgressBar" class="h-full rounded-full bg-blue-600" style="width: 72%"></div>
            </div>
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
          <div id="scoreHistory" class="mt-5 space-y-4"></div>
        </div>
      </section>

      <section class="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-aos="fade-up">
        <div class="mb-5 flex items-center justify-between gap-4">
          <h2 class="text-xl font-black text-slate-900">Kelola soal kuis</h2>
          <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Admin CRUD</span>
        </div>

        <form id="quizForm" class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Pertanyaan</label>
            <textarea name="question" rows="3" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Masukkan pertanyaan"></textarea>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
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
          <button type="submit" class="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">Tambah Soal</button>
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
            <tbody id="quizTable"></tbody>
          </table>
        </div>
      </section>
    </main>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>
  </body>
</html>
