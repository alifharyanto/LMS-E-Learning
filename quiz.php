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
      tailwind.config = { theme: { extend: { colors: { brand: { blue: '#2563EB', dark: '#111111' } } } } };
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet" />
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body data-page="quiz" class="bg-slate-50 text-slate-900 antialiased">
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

      <?php if ($quiz_result): ?>
        <div class="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div data-aos="fade-right" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
                <div class="p-4 border-l-4 <?php echo $is_correct ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'; ?> rounded">
                  <p class="font-semibold text-sm text-slate-700">Soal <?php echo $idx + 1; ?>: <?php echo htmlspecialchars($q['question']); ?></p>
                  <p class="text-sm text-slate-600 mt-2">Jawaban Anda: <span class="font-semibold"><?php echo $user_answer >= 0 ? htmlspecialchars($options[$user_answer]) : 'Tidak dijawab'; ?></span></p>
                  <p class="text-sm text-slate-600">Jawaban Benar: <span class="font-semibold"><?php echo htmlspecialchars($options[$q['answer_index']]); ?></span></p>
                  <?php if ($q['explanation']): ?>
                    <p class="text-sm text-slate-600 mt-2"><strong>Penjelasan:</strong> <?php echo htmlspecialchars($q['explanation']); ?></p>
                  <?php endif; ?>
                </div>
              <?php endforeach; ?>
            </div>
            <a href="quiz.php" class="mt-6 inline-block rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">Coba Lagi</a>
          </div>

          <div data-aos="fade-left" class="space-y-6">
            <div class="rounded-3xl border border-green-200 bg-green-50 p-5">
              <p class="text-sm font-semibold uppercase tracking-[0.2em] text-green-700">Hasil</p>
              <h3 class="mt-3 text-3xl font-black text-slate-900"><?php echo $quiz_result['percent']; ?>%</h3>
              <p class="mt-2 text-sm text-slate-700">Skor: <?php echo $quiz_result['score']; ?>/<?php echo $quiz_result['total']; ?></p>
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
      <?php else: ?>
        <div class="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div data-aos="fade-right" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <?php if (!empty($questions)): ?>
              <form method="POST" class="space-y-5">
                <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                
                <?php foreach ($questions as $idx => $q): ?>
                  <div class="p-4 border border-slate-200 rounded-2xl">
                    <p class="font-semibold text-sm text-slate-900 mb-3">Soal <?php echo $idx + 1; ?>: <?php echo htmlspecialchars($q['question']); ?></p>
                    <div class="space-y-2">
                      <?php 
                      $options = ['A' => $q['option_a'], 'B' => $q['option_b'], 'C' => $q['option_c'], 'D' => $q['option_d']];
                      foreach ($options as $key => $option): 
                      ?>
                        <label class="flex items-center gap-3 cursor-pointer">
                          <input type="radio" name="answer_<?php echo (int)$q['id']; ?>" value="<?php echo ord($key) - ord('A'); ?>" class="w-4 h-4" required />
                          <span class="text-sm text-slate-700"><?php echo htmlspecialchars($option); ?></span>
                        </label>
                      <?php endforeach; ?>
                    </div>
                  </div>
                <?php endforeach; ?>
                
                <button type="submit" class="w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">Kirim Quiz</button>
              </form>
            <?php else: ?>
              <p class="text-sm text-slate-500 text-center py-10">Belum ada soal quiz. Silakan hubungi admin.</p>
            <?php endif; ?>
          </div>

          <div data-aos="fade-left" class="space-y-6">
            <div class="rounded-3xl border border-blue-200 bg-blue-50 p-5">
              <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Jumlah Soal</p>
              <h3 class="mt-3 text-3xl font-black text-slate-900"><?php echo count($questions); ?></h3>
              <p class="mt-2 text-sm text-slate-700">Silakan jawab semua pertanyaan dengan hati-hati.</p>
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
      <?php endif; ?>
    </main>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>
  </body>
</html>
