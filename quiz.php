<?php
require __DIR__ . '/koneksi.php';

// Check login
if (!isset($_SESSION['user'])) {
    redirect('login.php');
}

$user = $_SESSION['user'];
$quiz_result = null;
$message = '';
$category_id = isset($_GET['category_id']) ? (int)$_GET['category_id'] : null;
$category = null;
$questions = [];

// Determine which page to show
$is_quiz_page = ($category_id !== null && $category_id > 0);

if ($is_quiz_page) {
    // PAGE 2: Quiz soal untuk kategori tertentu
    // Get category details
    $stmt = mysqli_prepare($koneksi, 'SELECT id, name FROM quiz_categories WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'i', $category_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $category = mysqli_fetch_assoc($result);
    mysqli_stmt_close($stmt);

    if (!$category) {
        redirect('quiz.php');
    }

    // Handle quiz submission
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['csrf_token'])) {
        if (!validateCSRFToken($_POST['csrf_token'])) {
            $message = 'Token validasi gagal. Silakan coba lagi.';
        } else {
            $questions_result = mysqli_query($koneksi, "SELECT id, category_id, answer_index FROM quiz_questions WHERE category_id = $category_id ORDER BY id");
            $temp_questions = mysqli_fetch_all($questions_result, MYSQLI_ASSOC);

            if (!empty($temp_questions)) {
                $score = 0;
                $total = count($temp_questions);

                foreach ($temp_questions as $q) {
                    $answer_key = 'answer_' . $q['id'];
                    if (isset($_POST[$answer_key]) && (int)$_POST[$answer_key] === (int)$q['answer_index']) {
                        $score++;
                    }
                }

                $percent = (int)(($score / $total) * 100);

                $stmt = mysqli_prepare($koneksi, 'INSERT INTO quiz_results (user_id, category_id, score, total, percent, correct_answers) VALUES (?, ?, ?, ?, ?, ?)');
                mysqli_stmt_bind_param($stmt, 'iiiiii', $user['id'], $category_id, $score, $total, $percent, $score);
                if (mysqli_stmt_execute($stmt)) {
                    $quiz_result = [
                        'score' => $score,
                        'total' => $total,
                        'percent' => $percent
                    ];
                }
                mysqli_stmt_close($stmt);
            }
        }
    }

    // Fetch quiz questions untuk kategori ini
    $questions_result = mysqli_query($koneksi, "SELECT id, category_id, question, option_a, option_b, option_c, option_d, answer_index, explanation FROM quiz_questions WHERE category_id = $category_id ORDER BY id");
    $questions = mysqli_fetch_all($questions_result, MYSQLI_ASSOC);
} else {
    // PAGE 1: Daftar kategori
    $categories_result = mysqli_query($koneksi, 'SELECT c.id, c.name, COUNT(q.id) as total_questions FROM quiz_categories c LEFT JOIN quiz_questions q ON c.id = q.category_id WHERE c.parent_id IS NULL GROUP BY c.id ORDER BY c.name');
    $categories = mysqli_fetch_all($categories_result, MYSQLI_ASSOC);
}

$csrf_token = generateCSRFToken();
?>
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Latihan Soal | CourseUp</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              brand: { blue: '#2563EB', dark: '#111111' },
              ocean: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' },
              emerald: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#134e4a' }
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
  <body data-page="quiz" class="bg-gradient-to-b from-slate-50 to-emerald-50 text-slate-900 antialiased">
    <header class="sticky top-0 z-40 border-b border-emerald-300/30 bg-white/70 backdrop-blur-md">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="index.php" class="flex items-center gap-3 group">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-700 to-emerald-600 text-lg font-black text-white shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-all">C</div>
          <div><span class="text-2xl font-black tracking-tight bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">Course</span><span class="text-2xl font-black tracking-tight text-emerald-600">Up</span></div>
        </a>

        <div class="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          <a href="index.php" class="transition hover:text-emerald-600 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-ocean-600 after:to-emerald-600 after:transition-all hover:after:w-full">Beranda</a>
          <a href="courses.php" class="transition hover:text-emerald-600 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-ocean-600 after:to-emerald-600 after:transition-all hover:after:w-full">Kursus Materi</a>
          <a href="quiz.php" class="font-semibold bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">Latihan Soal</a>
          <a href="forum.php" class="transition hover:text-emerald-600 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-ocean-600 after:to-emerald-600 after:transition-all hover:after:w-full">Forum</a>
          <a href="help-center.php" class="transition hover:text-emerald-600 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-ocean-600 after:to-emerald-600 after:transition-all hover:after:w-full">Help Center</a>
        </div>

        <div class="flex items-center gap-3">
          <a href="dashboard.php" class="ml-1 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-300 bg-emerald-50 hover:shadow-lg hover:shadow-emerald-500/20 transition" aria-label="Dashboard pengguna">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" alt="Avatar pengguna" class="h-full w-full object-cover" />
          </a>
        </div>
      </nav>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section class="mb-8 text-center" data-aos="fade-up">
        <span class="inline-flex rounded-full border border-emerald-300/50 bg-emerald-50/50 backdrop-blur-sm px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">✏️ Latihan Soal</span>
        <h1 class="mt-4 text-4xl font-black text-slate-900"><?php echo $is_quiz_page ? htmlspecialchars($category['name']) : 'Pilih Kategori Latihan'; ?></h1>
        <p class="mt-3 text-lg text-slate-600"><?php echo $is_quiz_page ? 'Jawab semua soal dengan hati-hati' : 'Pilih kategori untuk memulai quiz'; ?></p>
      </section>

      <?php if (!$is_quiz_page): ?>
        <!-- PAGE 1: DAFTAR KATEGORI -->
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <?php if (!empty($categories)): ?>
            <?php foreach ($categories as $cat): ?>
              <a href="quiz.php?category_id=<?php echo (int)$cat['id']; ?>" class="group rounded-2xl border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-6 shadow-sm hover:shadow-lg hover:border-emerald-300/60 transition-all card-glow" data-aos="fade-up">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition"><?php echo htmlspecialchars($cat['name']); ?></h3>
                  <span class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-ocean-700 to-emerald-600 text-white font-semibold">→</span>
                </div>
                <p class="text-sm text-slate-600 mb-4">Total Soal: <span class="font-bold text-emerald-600"><?php echo (int)$cat['total_questions']; ?></span></p>
                <button class="w-full rounded-full bg-gradient-to-r from-ocean-700 to-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-emerald-500/30 transition">Mulai Belajar Sekarang</button>
              </a>
            <?php endforeach; ?>
          <?php else: ?>
            <div class="col-span-full rounded-2xl border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-8 text-center">
              <p class="text-slate-600">Belum ada kategori quiz. Silakan hubungi admin.</p>
            </div>
          <?php endif; ?>
        </div>

      <?php else: ?>
        <!-- PAGE 2: QUIZ SOAL KATEGORI -->
        <?php if ($quiz_result): ?>
          <div class="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
            <div data-aos="fade-right" class="rounded-3xl border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-5 shadow-sm card-glow">
              <h2 class="text-xl font-black text-slate-900 mb-5">Hasil Quiz Anda</h2>
              <div class="space-y-4">
                <?php 
                foreach ($questions as $idx => $q): 
                  $user_answer = isset($_POST['answer_' . $q['id']]) ? (int)$_POST['answer_' . $q['id']] : -1;
                  $options = [$q['option_a'], $q['option_b'], $q['option_c'], $q['option_d']];
                  $is_correct = $user_answer === (int)$q['answer_index'];
                ?>
                  <div class="p-4 border-l-4 <?php echo $is_correct ? 'border-emerald-500 bg-emerald-50' : 'border-orange-500 bg-orange-50'; ?> rounded">
                    <p class="font-semibold text-sm text-slate-700">Soal <?php echo $idx + 1; ?>: <?php echo htmlspecialchars($q['question']); ?></p>
                    <p class="text-sm text-slate-600 mt-2">Jawaban Anda: <span class="font-semibold"><?php echo $user_answer >= 0 ? htmlspecialchars($options[$user_answer]) : 'Tidak dijawab'; ?></span></p>
                    <p class="text-sm text-slate-600">Jawaban Benar: <span class="font-semibold"><?php echo htmlspecialchars($options[$q['answer_index']]); ?></span></p>
                    <?php if ($q['explanation']): ?>
                      <p class="text-sm text-slate-600 mt-2"><strong>Penjelasan:</strong> <?php echo htmlspecialchars($q['explanation']); ?></p>
                    <?php endif; ?>
                  </div>
                <?php endforeach; ?>
              </div>
              <div class="mt-6 flex gap-3">
                <a href="quiz.php?category_id=<?php echo (int)$category_id; ?>" class="flex-1 rounded-full bg-gradient-to-r from-ocean-700 to-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-emerald-500/30 transition text-center">Coba Lagi</a>
                <a href="quiz.php" class="flex-1 rounded-full border border-emerald-300/30 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-emerald-300/60 transition text-center">Kembali</a>
              </div>
            </div>

            <div data-aos="fade-left" class="space-y-6">
              <div class="rounded-3xl border border-emerald-300/50 bg-gradient-to-br from-emerald-50 to-ocean-50 p-5 card-glow">
                <span class="inline-flex rounded-full border border-emerald-300/50 bg-emerald-100/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">📊 Hasil</span>
                <h3 class="mt-3 text-3xl font-black bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent"><?php echo $quiz_result['percent']; ?>%</h3>
                <p class="mt-2 text-sm text-slate-700">Skor: <span class="font-bold text-emerald-600"><?php echo $quiz_result['score']; ?>/<?php echo $quiz_result['total']; ?></span></p>
              </div>

              <div class="rounded-3xl border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-5 shadow-sm card-glow">
                <h3 class="text-xl font-black text-slate-900">💡 Tips Belajar</h3>
                <ul class="mt-4 space-y-3 text-sm text-slate-600">
                  <li>• Fokus memahami konsep sebelum menghafal jawaban.</li>
                  <li>• Coba ulang soal hingga score stabil di atas 80%.</li>
                  <li>• Gunakan materi di kursus sebagai referensi utama.</li>
                </ul>
              </div>
            </div>
          </div>
        <?php else: ?>
          <div class="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
            <div data-aos="fade-right" class="rounded-3xl border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-5 shadow-sm card-glow">
              <?php if (!empty($questions)): ?>
                <form method="POST" class="space-y-5">
                  <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                  
                  <?php foreach ($questions as $idx => $q): ?>
                    <div class="p-4 border border-emerald-300/30 rounded-2xl bg-white hover:border-emerald-300/50 transition">
                      <p class="font-semibold text-sm text-slate-900 mb-3">Soal <?php echo $idx + 1; ?>: <?php echo htmlspecialchars($q['question']); ?></p>
                      <div class="space-y-2">
                        <?php 
                        $options = ['A' => $q['option_a'], 'B' => $q['option_b'], 'C' => $q['option_c'], 'D' => $q['option_d']];
                        foreach ($options as $key => $option): 
                        ?>
                          <label class="flex items-center gap-3 cursor-pointer group">
                            <input type="radio" name="answer_<?php echo (int)$q['id']; ?>" value="<?php echo ord($key) - ord('A'); ?>" class="w-4 h-4 accent-emerald-600" required />
                            <span class="text-sm text-slate-700 group-hover:text-emerald-600 transition"><?php echo htmlspecialchars($option); ?></span>
                          </label>
                        <?php endforeach; ?>
                      </div>
                    </div>
                  <?php endforeach; ?>
                  
                  <button type="submit" class="w-full rounded-full bg-gradient-to-r from-ocean-700 to-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-emerald-500/30 transition">Kirim Quiz</button>
                </form>
              <?php else: ?>
                <p class="text-sm text-slate-500 text-center py-10">Belum ada soal untuk kategori ini. Silakan hubungi admin.</p>
              <?php endif; ?>
            </div>

            <div data-aos="fade-left" class="space-y-6">
              <div class="rounded-3xl border border-ocean-300/50 bg-gradient-to-br from-ocean-50 to-emerald-50 p-5 card-glow">
                <span class="inline-flex rounded-full border border-ocean-300/50 bg-ocean-100/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-ocean-700">📋 Jumlah Soal</span>
                <h3 class="mt-3 text-3xl font-black bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent"><?php echo count($questions); ?></h3>
                <p class="mt-2 text-sm text-slate-700">Silakan jawab semua pertanyaan dengan hati-hati.</p>
              </div>

              <div class="rounded-3xl border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-5 shadow-sm card-glow">
                <h3 class="text-xl font-black text-slate-900">💡 Tips Belajar</h3>
                <ul class="mt-4 space-y-3 text-sm text-slate-600">
                  <li>• Fokus memahami konsep sebelum menghafal jawaban.</li>
                  <li>• Coba ulang soal hingga score stabil di atas 80%.</li>
                  <li>• Gunakan materi di kursus sebagai referensi utama.</li>
                </ul>
              </div>

              <a href="quiz.php" class="block rounded-full border border-emerald-300/30 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-emerald-300/60 transition text-center">← Kembali ke Kategori</a>
            </div>
          </div>
        <?php endif; ?>
      <?php endif; ?>
    </main>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>
  </body>
</html>
