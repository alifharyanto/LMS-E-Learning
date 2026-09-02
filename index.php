<?php
require __DIR__ . '/koneksi.php';

$user = $_SESSION['user'] ?? null;
$faqs_result = mysqli_query($koneksi, 'SELECT id, question, answer FROM faqs ORDER BY created_at DESC LIMIT 6');
$faqs = mysqli_fetch_all($faqs_result, MYSQLI_ASSOC);
?>
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
              },
              ocean: {
                50: '#f0fdfa',
                100: '#ccfbf1',
                200: '#99f6e4',
                300: '#5eead4',
                400: '#2dd4bf',
                500: '#14b8a6',
                600: '#0d9488',
                700: '#0f766e',
                800: '#115e59',
                900: '#134e4a',
              },
              emerald: {
                50: '#f0fdf4',
                600: '#16a34a',
                700: '#15803d',
                800: '#166534',
              }
            },
            animation: {
              'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
              float: {
                '0%, 100%': { transform: 'translateY(0px)' },
                '50%': { transform: 'translateY(-20px)' },
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
    <header id="navbar" class="sticky top-0 z-40 bg-white/70 backdrop-blur-md border-b border-emerald-200/30 transition-all duration-300">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="#home" class="flex items-center gap-3 group">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-700 to-emerald-700 text-lg font-black text-white shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-all">C</div>
          <div>
            <span class="text-2xl font-black tracking-tight bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">Course</span><span class="text-2xl font-black tracking-tight text-emerald-600">Up</span>
          </div>
        </a>

        <div class="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          <a href="index.php" class="transition hover:text-emerald-600 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-ocean-600 after:to-emerald-600 after:transition-all hover:after:w-full">Beranda</a>
          <a href="courses.php" class="transition hover:text-emerald-600 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-ocean-600 after:to-emerald-600 after:transition-all hover:after:w-full">Kursus Materi</a>
          <a href="quiz.php" class="transition hover:text-emerald-600 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-ocean-600 after:to-emerald-600 after:transition-all hover:after:w-full">Latihan Soal</a>
          <a href="forum.php" class="transition hover:text-emerald-600 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-ocean-600 after:to-emerald-600 after:transition-all hover:after:w-full">Forum</a>
          <a href="help-center.php" class="transition hover:text-emerald-600 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-ocean-600 after:to-emerald-600 after:transition-all hover:after:w-full">Help Center</a>
        </div>

        <div class="flex items-center gap-3">
          <?php if ($user): ?>
            <a href="<?php echo $user['role'] === 'admin' ? 'admin.php' : 'dashboard.php'; ?>" class="ml-1 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-ocean-50 transition hover:scale-110 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20" aria-label="Dashboard pengguna">
              <img src="<?php echo !empty($user['profile_photo']) ? htmlspecialchars($user['profile_photo']) : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'; ?>" alt="Avatar pengguna" class="h-full w-full object-cover" />
            </a>
          <?php else: ?>
            <a href="login.php" class="hidden rounded-full border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 hover:border-emerald-500 sm:inline-flex">Masuk</a>
            <a href="register.php" class="inline-flex rounded-full bg-gradient-to-r from-ocean-700 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:shadow-emerald-500/50 hover:scale-105">Daftar</a>
          <?php endif; ?>
        </div>
      </nav>
    </header>

    <main id="home">
      <section class="hero-pattern relative overflow-hidden min-h-screen flex items-center">
        <!-- Animated Glow Elements -->
        <div class="hero-glow hero-glow-1"></div>
        <div class="hero-glow hero-glow-2"></div>
        
        <div class="mx-auto grid max-w-7xl items-center gap-10 px-4 py-18 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20 relative z-10">
          <div data-aos="fade-right" class="fade-in-up">
            <span class="inline-flex rounded-full border border-emerald-300/50 bg-emerald-50/50 backdrop-blur-sm px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">✨ Platform Belajar Modern</span>
            <h1 class="mt-6 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Tingkatkan <span class="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">potensi belajar</span> Anda dengan CourseUp.
            </h1>
            <p class="mt-6 max-w-xl text-lg text-emerald-100">
              CourseUp adalah LMS modern untuk siswa yang ingin belajar lebih fokus, terstruktur, dan menyenangkan melalui materi PDF, kuis, forum, dan progress dashboard.
            </p>
            <div class="mt-8 flex flex-wrap items-center gap-4">
              <a href="courses.php" class="btn-pulse btn-ocean rounded-full px-6 py-3 text-sm font-semibold text-white transition">Mulai Belajar</a>
              <?php if (!$user): ?>
                <a href="register.php" class="micro-lift rounded-full border border-emerald-300/50 bg-white/10 backdrop-blur-sm px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition">Buat Akun</a>
              <?php else: ?>
                <a href="<?php echo $user['role'] === 'admin' ? 'admin.php' : 'dashboard.php'; ?>" class="micro-lift rounded-full border border-emerald-300/50 bg-white/10 backdrop-blur-sm px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition">Masuk Dashboard</a>
              <?php endif; ?>
            </div>
            <div class="mt-10 flex flex-wrap gap-8 text-left">
              <div class="fade-in-up" style="animation-delay: 0.1s">
                <p class="text-3xl font-black text-emerald-300">12K+</p>
                <p class="text-sm text-emerald-100">Siswa Terdaftar</p>
              </div>
              <div class="fade-in-up" style="animation-delay: 0.2s">
                <p class="text-3xl font-black text-emerald-300">150+</p>
                <p class="text-sm text-emerald-100">Materi PDF</p>
              </div>
              <div class="fade-in-up" style="animation-delay: 0.3s">
                <p class="text-3xl font-black text-emerald-300">98%</p>
                <p class="text-sm text-emerald-100">Kepuasan</p>
              </div>
            </div>
          </div>

          <div data-aos="fade-left" class="relative">
            <div class="card-glow card-shadow micro-lift relative rounded-[32px] border border-emerald-400/30 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-5">
              <div class="rounded-[28px] bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white border border-emerald-400/20">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-emerald-200">Progress belajar</p>
                    <h2 class="mt-2 text-3xl font-black">76%</h2>
                  </div>
                  <div class="rounded-full bg-gradient-to-r from-ocean-600 to-emerald-600 px-3 py-1 text-xs font-semibold text-white">On Track</div>
                </div>
                <div class="mt-6 h-3 w-full rounded-full bg-slate-700">
                  <div class="h-full w-[76%] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"></div>
                </div>
                <div class="mt-8 grid gap-4 sm:grid-cols-2">
                  <div class="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-ocean-500/10 border border-emerald-300/20 p-4">
                    <p class="text-xs uppercase tracking-[0.2em] text-emerald-300">Modul</p>
                    <p class="mt-2 text-2xl font-bold text-emerald-300">18</p>
                  </div>
                  <div class="rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-300/20 p-4">
                    <p class="text-xs uppercase tracking-[0.2em] text-cyan-300">Kuis</p>
                    <p class="mt-2 text-2xl font-bold text-cyan-300">24</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="absolute -left-6 top-8 rounded-2xl border border-emerald-300/50 bg-gradient-to-br from-white to-emerald-50/50 backdrop-blur-sm p-4 card-shadow micro-lift">
              <p class="text-xs text-emerald-700">Minggu ini</p>
              <p class="mt-1 text-xl font-black bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">4h 30m</p>
            </div>
            <div class="absolute -bottom-4 right-4 rounded-2xl border border-emerald-300/50 bg-gradient-to-br from-white to-emerald-50/50 backdrop-blur-sm p-4 card-shadow micro-lift">
              <p class="text-xs text-emerald-700">Nilai rata-rata</p>
              <p class="mt-1 text-xl font-black text-emerald-600">92%</p>
            </div>
          </div>
        </div>
      </section>

      <section class="bg-gradient-to-b from-white via-emerald-50/30 to-white py-20">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="max-w-2xl mx-auto text-center" data-aos="fade-up">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">Kenapa CourseUp?</p>
            <h2 class="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Belajar yang fokus, cepat, dan terarah</h2>
          </div>

          <div class="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <article data-aos="fade-up" class="card-glow card-hover-glow micro-lift rounded-3xl border border-emerald-300/30 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-sm">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-ocean-100 text-xl text-emerald-700">📚</div>
              <h3 class="mt-5 text-xl font-bold text-slate-900">Materi Interaktif</h3>
              <p class="mt-3 text-sm leading-6 text-slate-600">Akses modul PDF lengkap langsung di platform, tidak perlu mengunduh dulu.</p>
            </article>

            <article data-aos="fade-up" data-aos-delay="100" class="card-glow card-hover-glow micro-lift rounded-3xl border border-ocean-300/30 bg-gradient-to-br from-white to-ocean-50/30 p-6 shadow-sm">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-ocean-900 text-xl text-white">🧠</div>
              <h3 class="mt-5 text-xl font-bold text-slate-900">Latihan Soal</h3>
              <p class="mt-3 text-sm leading-6 text-slate-600">Uji pemahaman Anda dengan kuis interaktif dan hasil yang langsung terekam.</p>
            </article>

            <article data-aos="fade-up" data-aos-delay="200" class="card-glow card-hover-glow micro-lift rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-white to-cyan-50/30 p-6 shadow-sm">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-ocean-100 text-xl text-ocean-700">💬</div>
              <h3 class="mt-5 text-xl font-bold text-slate-900">Forum Diskusi</h3>
              <p class="mt-3 text-sm leading-6 text-slate-600">Siswa dapat bertanya, berbagi ilmu, dan menyelesaikan masalah bersama.</p>
            </article>

            <article data-aos="fade-up" data-aos-delay="300" class="card-glow card-hover-glow micro-lift rounded-3xl border border-emerald-200/30 bg-gradient-to-br from-white to-emerald-50/50 p-6 shadow-sm">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-slate-100 text-xl text-emerald-700">📈</div>
              <h3 class="mt-5 text-xl font-bold text-slate-900">Progress Dashboard</h3>
              <p class="mt-3 text-sm leading-6 text-slate-600">Pantau waktu belajar, nilai, dan perkembangan Anda secara real time.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="bg-gradient-to-b from-emerald-50 to-white py-20">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="mx-auto max-w-2xl text-center" data-aos="fade-up">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">Mata pelajaran populer</p>
            <h2 class="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Jelajahi materi favorit siswa</h2>
          </div>

          <div class="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div data-aos="zoom-in" class="card-glow card-hover-glow micro-lift rounded-3xl border border-emerald-300/30 bg-gradient-to-br from-white to-emerald-50/50 p-6 shadow-sm">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100 text-2xl">📐</div>
              <h3 class="mt-5 text-xl font-bold text-slate-900">Matematika</h3>
              <p class="mt-2 text-sm text-slate-600">Aljabar, geometri, dan logika.</p>
            </div>
            <div data-aos="zoom-in" data-aos-delay="100" class="card-glow card-hover-glow micro-lift rounded-3xl border border-ocean-300/30 bg-gradient-to-br from-white to-ocean-50/50 p-6 shadow-sm">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-ocean-100 to-slate-100 text-2xl">⚛️</div>
              <h3 class="mt-5 text-xl font-bold text-slate-900">Fisika</h3>
              <p class="mt-2 text-sm text-slate-600">Gerak, energi, dan eksperimen ilmiah.</p>
            </div>
            <div data-aos="zoom-in" data-aos-delay="200" class="card-glow card-hover-glow micro-lift rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-white to-cyan-50/50 p-6 shadow-sm">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-ocean-100 text-2xl">💻</div>
              <h3 class="mt-5 text-xl font-bold text-slate-900">Pemrograman Web</h3>
              <p class="mt-2 text-sm text-slate-600">HTML, CSS, JavaScript, dan UX.</p>
            </div>
            <div data-aos="zoom-in" data-aos-delay="300" class="card-glow card-hover-glow micro-lift rounded-3xl border border-emerald-200/30 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-sm">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-green-100 text-2xl">🗣️</div>
              <h3 class="mt-5 text-xl font-bold text-slate-900">Bahasa Inggris</h3>
              <p class="mt-2 text-sm text-slate-600">Speaking, grammar, dan reading skill.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="courses" class="bg-white py-20">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="mb-10 max-w-2xl" data-aos="fade-up">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">Kursus materi</p>
            <h2 class="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Materi belajar yang siap dipelajari</h2>
          </div>

          <div class="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside data-aos="fade-right" class="space-y-4 rounded-3xl border border-emerald-300/30 bg-gradient-to-br from-emerald-50 to-ocean-50/30 p-5">
              <h3 class="text-lg font-bold text-slate-900">Daftar modul</h3>
              <div id="materialList" class="space-y-3"></div>
            </aside>

            <div data-aos="fade-left" class="rounded-3xl border border-emerald-300/30 bg-white p-3 shadow-sm card-glow">
              <div class="mb-3 flex items-center justify-between px-2 pt-2">
                <div>
                  <p class="text-sm font-semibold text-emerald-600">Preview materi</p>
                  <h3 class="text-xl font-black bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">Viewer PDF</h3>
                </div>
                <span class="rounded-full bg-gradient-to-r from-emerald-100 to-ocean-100 px-3 py-1 text-xs font-semibold text-emerald-700">Tanpa download</span>
              </div>
              <iframe id="materialViewer" class="material-frame w-full rounded-2xl border border-emerald-300/30" src="" title="Preview PDF materi"></iframe>
            </div>
          </div>
        </div>
      </section>

      <section id="quiz" class="bg-gradient-to-b from-emerald-50 to-white py-20">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="mb-10 max-w-2xl" data-aos="fade-up">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">Latihan soal</p>
            <h2 class="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Uji kemampuan kamu dengan kuis interaktif</h2>
          </div>

          <div class="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
            <div data-aos="fade-right" class="rounded-3xl border border-emerald-300/30 bg-white p-5 shadow-sm card-glow">
              <div class="mb-5 flex items-center justify-between gap-4">
                <h3 class="text-xl font-black text-slate-900">Soal latihan</h3>
                <span class="rounded-full bg-gradient-to-r from-emerald-100 to-ocean-100 px-3 py-1 text-xs font-semibold text-emerald-700">Live</span>
              </div>
              <div id="quizPlayer" class="quiz-scroll space-y-4"></div>
            </div>

            <div data-aos="fade-left" class="space-y-6">
              <div id="quizSummary" class="rounded-3xl border border-emerald-300/50 bg-gradient-to-br from-emerald-50/50 to-ocean-50/50 p-5">
                <p class="text-sm font-semibold uppercase tracking-[0.2em] bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">Ringkasan</p>
                <h3 class="mt-3 text-3xl font-black text-emerald-600">0%</h3>
                <p class="mt-2 text-sm text-slate-700">Belum ada hasil. Mulai kuis untuk melihat skor Anda.</p>
              </div>

              <div class="rounded-3xl border border-emerald-300/30 bg-white p-5 shadow-sm card-glow">
                <h3 class="text-xl font-black text-slate-900">Kelola soal admin</h3>
                <form id="quizForm" class="mt-5 space-y-4">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-slate-700">Pertanyaan</label>
                    <textarea name="question" rows="3" class="w-full rounded-2xl border border-emerald-300/30 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 bg-emerald-50/30" placeholder="Masukkan pertanyaan"></textarea>
                  </div>
                  <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label class="mb-1 block text-sm font-medium text-slate-700">Pilihan A</label>
                      <input name="option1" type="text" class="w-full rounded-2xl border border-emerald-300/30 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 bg-emerald-50/30" />
                    </div>
                    <div>
                      <label class="mb-1 block text-sm font-medium text-slate-700">Pilihan B</label>
                      <input name="option2" type="text" class="w-full rounded-2xl border border-emerald-300/30 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 bg-emerald-50/30" />
                    </div>
                    <div>
                      <label class="mb-1 block text-sm font-medium text-slate-700">Pilihan C</label>
                      <input name="option3" type="text" class="w-full rounded-2xl border border-emerald-300/30 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 bg-emerald-50/30" />
                    </div>
                    <div>
                      <label class="mb-1 block text-sm font-medium text-slate-700">Pilihan D</label>
                      <input name="option4" type="text" class="w-full rounded-2xl border border-emerald-300/30 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 bg-emerald-50/30" />
                    </div>
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-slate-700">Jawaban benar</label>
                    <select name="answer" class="w-full rounded-2xl border border-emerald-300/30 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 bg-emerald-50/30">
                      <option value="0">A</option>
                      <option value="1">B</option>
                      <option value="2">C</option>
                      <option value="3">D</option>
                    </select>
                  </div>
                  <button type="submit" class="w-full rounded-full bg-gradient-to-r from-ocean-700 to-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-ocean-800 hover:to-emerald-700 hover:shadow-lg hover:shadow-emerald-500/30">Tambah Soal</button>
                </form>

                <div class="mt-6 overflow-x-auto">
                  <table class="min-w-full border-collapse text-left">
                    <thead>
                      <tr class="border-b border-emerald-300/30 text-sm text-emerald-700">
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
            <p class="text-sm font-semibold uppercase tracking-[0.2em] bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">Forum</p>
            <h2 class="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Diskusikan materi bersama teman belajar</h2>
          </div>

          <div class="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div data-aos="fade-right" class="rounded-3xl border border-emerald-300/30 bg-gradient-to-br from-emerald-50 to-ocean-50/30 p-5 card-glow">
              <h3 class="text-xl font-black text-slate-900">Mulai thread baru</h3>
              <form id="forumForm" class="mt-5 space-y-4">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">Nama</label>
                  <input name="author" type="text" placeholder="Nama kamu" class="w-full rounded-2xl border border-emerald-300/30 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">Judul topik</label>
                  <input name="title" type="text" placeholder="Judul diskusi" class="w-full rounded-2xl border border-emerald-300/30 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">Pesan</label>
                  <textarea name="message" rows="4" placeholder="Tulis pertanyaan atau pendapat Anda..." class="w-full rounded-2xl border border-emerald-300/30 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"></textarea>
                </div>
                <button type="submit" class="w-full rounded-full bg-gradient-to-r from-ocean-700 to-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-ocean-800 hover:to-emerald-700 hover:shadow-lg hover:shadow-emerald-500/30">Kirim Diskusi</button>
              </form>
            </div>

            <div id="forumThreads" data-aos="fade-left" class="space-y-4"></div>
          </div>
        </div>
      </section>

      <section id="help" class="bg-gradient-to-b from-emerald-50 to-white py-20">
        <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div class="mb-10 text-center" data-aos="fade-up">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">Help center</p>
            <h2 class="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Pertanyaan yang sering diajukan</h2>
          </div>
          <div id="faqList" class="space-y-4"></div>
        </div>
      </section>
    </main>

    <footer class="border-t border-emerald-300/30 bg-gradient-to-b from-white to-emerald-50">
      <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
        <p>© 2026 CourseUp. All rights reserved.</p>
        <div class="flex items-center gap-6">
          <a href="#home" class="transition hover:text-emerald-600">Beranda</a>
          <a href="courses.php" class="transition hover:text-emerald-600">Materi</a>
          <a href="quiz.php" class="transition hover:text-emerald-600">Kuis</a>
        </div>
      </div>
    </footer>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>
  </body>
</html>
