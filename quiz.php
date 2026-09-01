<?php
require __DIR__ . '/koneksi.php';

// Check login
if (!isset($_SESSION['user'])) {
    redirect('login.php');
}

$user = $_SESSION['user'];
$quiz_result = null;
$message = '';

// Handle quiz submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['csrf_token'])) {
    if (!validateCSRFToken($_POST['csrf_token'])) {
        $message = 'Token validasi gagal. Silakan coba lagi.';
    } else {
        // Get all questions
        $questions_result = mysqli_query($koneksi, 'SELECT id, answer_index FROM quiz_questions ORDER BY id');
        $questions = mysqli_fetch_all($questions_result, MYSQLI_ASSOC);
        
        if (!empty($questions)) {
            $score = 0;
            $total = count($questions);
            
            // Calculate score
            foreach ($questions as $q) {
                $answer_key = 'answer_' . $q['id'];
                if (isset($_POST[$answer_key]) && (int)$_POST[$answer_key] === (int)$q['answer_index']) {
                    $score++;
                }
            }
            
            $percent = (int)(($score / $total) * 100);
            
            // Save to database
            $stmt = mysqli_prepare($koneksi, 'INSERT INTO quiz_results (user_id, score, total, percent) VALUES (?, ?, ?, ?)');
            mysqli_stmt_bind_param($stmt, 'iiii', $user['id'], $score, $total, $percent);
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

// Fetch all quiz questions
$questions_result = mysqli_query($koneksi, 'SELECT id, question, option_a, option_b, option_c, option_d, answer_index, explanation FROM quiz_questions ORDER BY id');
$questions = mysqli_fetch_all($questions_result, MYSQLI_ASSOC);
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
        <h1 class="mt-4 text-4xl font-black text-slate-900">Quiz Web Developer</h1>
        <p class="mt-3 text-lg text-slate-600">Uji pemahaman Anda dengan kuis interaktif kami</p>
      </section>

      <?php if ($quiz_result): ?>
        <div class="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div data-aos="fade-right" class="rounded-3xl border border-emerald-300/30 bg-white/80 backdrop-blur-sm p-5 shadow-sm card-glow">
            <h2 class="text-xl font-black text-slate-900 mb-5">Hasil Quiz Anda</h2>
            <div class="space-y-4">
              <?php 
              $questions_result = mysqli_query($koneksi, 'SELECT id, question, option_a, option_b, option_c, option_d, answer_index, explanation FROM quiz_questions ORDER BY id');
              $all_questions = mysqli_fetch_all($questions_result, MYSQLI_ASSOC);
              foreach ($all_questions as $idx => $q): 
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
            <a href="quiz.php" class="mt-6 inline-block rounded-full bg-gradient-to-r from-ocean-700 to-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-emerald-500/30 transition">Coba Lagi</a>
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
              <p class="text-sm text-slate-500 text-center py-10">Belum ada soal quiz. Silakan hubungi admin.</p>
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
          </div>
        </div>
      <?php endif; ?>
    </main>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>
  </body>
</html>
