<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CourseUp | LMS Modern</title>
    <meta name="description" content="CourseUp adalah platform LMS modern untuk belajar mandiri dengan materi PDF, kuis, forum, dan dashboard siswa." />
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              brand: {
                blue: '#2563EB',
                dark: '#111111',
                soft: '#F8FAFC'
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
  <body data-page="home" class="bg-white text-slate-900 antialiased">
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="#home" class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-500/30">C</div>
          <div>
            <span class="text-2xl font-black tracking-tight text-slate-900">Course</span><span class="text-2xl font-black tracking-tight text-blue-600">Up</span>
          </div>
        </a>

        <div class="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          <a href="index.php" class="transition hover:text-blue-600">Beranda</a>
          <a href="courses.php" class="transition hover:text-blue-600">Kursus Materi</a>
          <a href="quiz.php" class="transition hover:text-blue-600">Latihan Soal</a>
          <a href="forum.php" class="transition hover:text-blue-600">Forum</a>
          <a href="help-center.php" class="transition hover:text-blue-600">Help Center</a>
        </div>

        <div class="flex items-center gap-3">
          <a href="login.php" class="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-600 sm:inline-flex">Masuk</a>
          <a href="register.php" class="inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700">Daftar</a>
          <a href="dashboard.php" class="ml-1 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-blue-200 bg-slate-100 transition hover:scale-105 hover:border-blue-400" aria-label="Dashboard pengguna">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" alt="Avatar pengguna" class="h-full w-full object-cover" />
          </a>
        </div>
      </nav>
    </header>

    <main id="home">
      <section class="hero-pattern relative overflow-hidden">
        <div class="mx-auto grid max-w-7xl items-center gap-10 px-4 py-18 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div data-aos="fade-right">
            <span class="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Platform Belajar Modern</span>
            <h1 class="mt-6 text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Tingkatkan <span class="text-blue-600">potensi belajar</span> Anda dengan CourseUp.
            </h1>
            <p class="mt-6 max-w-xl text-lg text-slate-600">
              CourseUp adalah LMS modern untuk siswa yang ingin belajar lebih fokus, terstruktur, dan menyenangkan melalui materi PDF, kuis, forum, dan progress dashboard.
            </p>
            <div class="mt-8 flex flex-wrap items-center gap-4">
              <a href="courses.php" class="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700">Mulai Belajar</a>
              <a href="register.php" class="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-blue-500 hover:text-blue-600">Buat Akun</a>
            </div>
            <div class="mt-10 flex flex-wrap gap-8 text-left">
              <div>
                <p class="text-3xl font-black text-slate-900">12K+</p>
                <p class="text-sm text-slate-600">Siswa Terdaftar</p>
              </div>
              <div>
                <p class="text-3xl font-black text-slate-900">150+</p>
                <p class="text-sm text-slate-600">Materi PDF</p>
              </div>
              <div>
                <p class="text-3xl font-black text-slate-900">98%</p>
                <p class="text-sm text-slate-600">Kepuasan</p>
              </div>
            </div>
          </div>

          <div data-aos="fade-left" class="relative">
            <div class="card-shadow relative rounded-[32px] border border-slate-200 bg-white p-5">
              <div class="rounded-[28px] bg-slate-900 p-5 text-white">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-slate-300">Progress belajar</p>
                    <h2 class="mt-2 text-3xl font-black">76%</h2>
                  </div>
                  <div class="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">On Track</div>
                </div>
                <div class="mt-6 h-3 w-full rounded-full bg-slate-700">
                  <div class="h-full w-[76%] rounded-full bg-blue-500"></div>
                </div>
                <div class="mt-8 grid gap-4 sm:grid-cols-2">
                  <div class="rounded-2xl bg-white/10 p-4">
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-300">Modul</p>
                    <p class="mt-2 text-2xl font-bold">18</p>
                  </div>
                  <div class="rounded-2xl bg-white/10 p-4">
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-300">Kuis</p>
                    <p class="mt-2 text-2xl font-bold">24</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="absolute -left-6 top-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              <p class="text-xs text-slate-500">Minggu ini</p>
              <p class="mt-1 text-xl font-black text-slate-900">4h 30m</p>
            </div>
            <div class="absolute -bottom-4 right-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              <p class="text-xs text-slate-500">Nilai rata-rata</p>
              <p class="mt-1 text-xl font-black text-blue-600">92%</p>
            </div>
          </div>
        </div>
      </section>

      <section class="bg-white py-20">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="max-w-2xl mx-auto text-center" data-aos="fade-up">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Kenapa CourseUp?</p>
            <h2 class="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Belajar yang fokus, cepat, dan terarah</h2>
          </div>

          <div class="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <article data-aos="fade-up" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-xl text-blue-600">📚</div>
              <h3 class="mt-5 text-xl font-bold text-slate-900">Materi Interaktif</h3>
              <p class="mt-3 text-sm leading-6 text-slate-600">Akses modul PDF lengkap langsung di platform, tidak perlu mengunduh dulu.</p>
            </article>

            <article data-aos="fade-up" data-aos-delay="100" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-xl text-white">🧠</div>
              <h3 class="mt-5 text-xl font-bold text-slate-900">Latihan Soal</h3>
              <p class="mt-3 text-sm leading-6 text-slate-600">Uji pemahaman Anda dengan kuis interaktif dan hasil yang langsung terekam.</p>
            </article>

            <article data-aos="fade-up" data-aos-delay="200" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-xl text-blue-600">💬</div>
              <h3 class="mt-5 text-xl font-bold text-slate-900">Forum Diskusi</h3>
              <p class="mt-3 text-sm leading-6 text-slate-600">Siswa dapat bertanya, berbagi ilmu, dan menyelesaikan masalah bersama.</p>
            </article>

            <article data-aos="fade-up" data-aos-delay="300" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-900">📈</div>
              <h3 class="mt-5 text-xl font-bold text-slate-900">Progress Dashboard</h3>
              <p class="mt-3 text-sm leading-6 text-slate-600">Pantau waktu belajar, nilai, dan perkembangan Anda secara real time.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="bg-slate-50 py-20">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="mx-auto max-w-2xl text-center" data-aos="fade-up">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Mata pelajaran populer</p>
            <h2 class="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Jelajahi materi favorit siswa</h2>
          </div>

          <div class="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div data-aos="zoom-in" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-2xl">📐</div>
              <h3 class="mt-5 text-xl font-bold text-slate-900">Matematika</h3>
              <p class="mt-2 text-sm text-slate-600">Aljabar, geometri, dan logika.</p>
            </div>
            <div data-aos="zoom-in" data-aos-delay="100" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-2xl">⚛️</div>
              <h3 class="mt-5 text-xl font-bold text-slate-900">Fisika</h3>
              <p class="mt-2 text-sm text-slate-600">Gerak, energi, dan eksperimen ilmiah.</p>
            </div>
            <div data-aos="zoom-in" data-aos-delay="200" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-2xl">💻</div>
              <h3 class="mt-5 text-xl font-bold text-slate-900">Pemrograman Web</h3>
              <p class="mt-2 text-sm text-slate-600">HTML, CSS, JavaScript, dan UX.</p>
            </div>
            <div data-aos="zoom-in" data-aos-delay="300" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-2xl">🗣️</div>
              <h3 class="mt-5 text-xl font-bold text-slate-900">Bahasa Inggris</h3>
              <p class="mt-2 text-sm text-slate-600">Speaking, grammar, dan reading skill.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="courses" class="bg-white py-20">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="mb-10 max-w-2xl" data-aos="fade-up">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Kursus materi</p>
            <h2 class="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Materi belajar yang siap dipelajari</h2>
          </div>

          <div class="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside data-aos="fade-right" class="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h3 class="text-lg font-bold text-slate-900">Daftar modul</h3>
              <div id="materialList" class="space-y-3"></div>
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
        </div>
      </section>

      <section id="quiz" class="bg-slate-50 py-20">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="mb-10 max-w-2xl" data-aos="fade-up">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Latihan soal</p>
            <h2 class="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Uji kemampuan kamu dengan kuis interaktif</h2>
          </div>

          <div class="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
            <div data-aos="fade-right" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-5 flex items-center justify-between gap-4">
                <h3 class="text-xl font-black text-slate-900">Soal latihan</h3>
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
                <h3 class="text-xl font-black text-slate-900">Kelola soal admin</h3>
                <form id="quizForm" class="mt-5 space-y-4">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-slate-700">Pertanyaan</label>
                    <textarea name="question" rows="3" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Masukkan pertanyaan"></textarea>
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
                    <tbody id="quizTable"></tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="forum" class="bg-white py-20">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="mb-10 max-w-2xl" data-aos="fade-up">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Forum</p>
            <h2 class="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Diskusikan materi bersama teman belajar</h2>
          </div>

          <div class="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div data-aos="fade-right" class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h3 class="text-xl font-black text-slate-900">Mulai thread baru</h3>
              <form id="forumForm" class="mt-5 space-y-4">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">Nama</label>
                  <input name="author" type="text" placeholder="Nama kamu" class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">Judul topik</label>
                  <input name="title" type="text" placeholder="Judul diskusi" class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">Pesan</label>
                  <textarea name="message" rows="4" placeholder="Tulis pertanyaan atau pendapat Anda..." class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"></textarea>
                </div>
                <button type="submit" class="w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">Kirim Diskusi</button>
              </form>
            </div>

            <div id="forumThreads" data-aos="fade-left" class="space-y-4"></div>
          </div>
        </div>
      </section>

      <section id="help" class="bg-slate-50 py-20">
        <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div class="mb-10 text-center" data-aos="fade-up">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Help center</p>
            <h2 class="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Pertanyaan yang sering diajukan</h2>
          </div>
          <div id="faqList" class="space-y-4"></div>
        </div>
      </section>
    </main>

    <footer class="border-t border-slate-200 bg-white">
      <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
        <p>© 2026 CourseUp. All rights reserved.</p>
        <div class="flex items-center gap-6">
          <a href="#home" class="hover:text-blue-600">Beranda</a>
          <a href="courses.php" class="hover:text-blue-600">Materi</a>
          <a href="quiz.php" class="hover:text-blue-600">Kuis</a>
        </div>
      </div>
    </footer>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>
  </body>
</html>
