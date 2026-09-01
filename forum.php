<?php
require __DIR__ . '/koneksi.php';

// Check login
if (!isset($_SESSION['user'])) {
    $login_required = true;
}

$user = $_SESSION['user'] ?? null;
$message = '';
$message_type = '';

// Handle thread creation
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['csrf_token'])) {
    if (!$user) {
        $message = 'Silakan login untuk membuat thread.';
        $message_type = 'error';
    } elseif (!validateCSRFToken($_POST['csrf_token'])) {
        $message = 'Token validasi gagal.';
        $message_type = 'error';
    } else {
        if (isset($_POST['action']) && $_POST['action'] === 'add_thread') {
            $title = trim($_POST['title'] ?? '');
            $message_text = trim($_POST['message'] ?? '');

            if ($title && $message_text) {
                $author = $user['username'];
                $user_id = $user['id'];
                $stmt = mysqli_prepare($koneksi, 'INSERT INTO forum_threads (user_id, author, title, message) VALUES (?, ?, ?, ?)');
                mysqli_stmt_bind_param($stmt, 'isss', $user_id, $author, $title, $message_text);
                if (mysqli_stmt_execute($stmt)) {
                    $message = 'Thread berhasil dibuat!';
                    $message_type = 'success';
                } else {
                    $message = 'Gagal membuat thread.';
                    $message_type = 'error';
                }
                mysqli_stmt_close($stmt);
            } else {
                $message = 'Judul dan pesan harus diisi.';
                $message_type = 'error';
            }
        } elseif (isset($_POST['action']) && $_POST['action'] === 'add_comment') {
            $thread_id = (int)($_POST['thread_id'] ?? 0);
            $comment_text = trim($_POST['comment'] ?? '');

            if ($thread_id > 0 && $comment_text) {
                $author = $user['username'];
                $user_id = $user['id'];
                $stmt = mysqli_prepare($koneksi, 'INSERT INTO forum_comments (thread_id, user_id, author, message) VALUES (?, ?, ?, ?)');
                mysqli_stmt_bind_param($stmt, 'iiss', $thread_id, $user_id, $author, $comment_text);
                if (mysqli_stmt_execute($stmt)) {
                    $message = 'Komentar berhasil ditambahkan!';
                    $message_type = 'success';
                } else {
                    $message = 'Gagal menambahkan komentar.';
                    $message_type = 'error';
                }
                mysqli_stmt_close($stmt);
            } else {
                $message = 'Komentar tidak boleh kosong.';
                $message_type = 'error';
            }
        } elseif (isset($_POST['action']) && $_POST['action'] === 'delete_thread') {
            $thread_id = (int)($_POST['thread_id'] ?? 0);
            if ($thread_id > 0 && ($user['role'] === 'admin' || (isset($_POST['user_id']) && (int)$_POST['user_id'] === $user['id']))) {
                $stmt = mysqli_prepare($koneksi, 'DELETE FROM forum_threads WHERE id = ?');
                mysqli_stmt_bind_param($stmt, 'i', $thread_id);
                if (mysqli_stmt_execute($stmt)) {
                    $message = 'Thread berhasil dihapus!';
                    $message_type = 'success';
                } else {
                    $message = 'Gagal menghapus thread.';
                    $message_type = 'error';
                }
                mysqli_stmt_close($stmt);
            }
        } elseif (isset($_POST['action']) && $_POST['action'] === 'delete_comment') {
            $comment_id = (int)($_POST['comment_id'] ?? 0);
            if ($comment_id > 0 && ($user['role'] === 'admin' || (isset($_POST['user_id']) && (int)$_POST['user_id'] === $user['id']))) {
                $stmt = mysqli_prepare($koneksi, 'DELETE FROM forum_comments WHERE id = ?');
                mysqli_stmt_bind_param($stmt, 'i', $comment_id);
                if (mysqli_stmt_execute($stmt)) {
                    $message = 'Komentar berhasil dihapus!';
                    $message_type = 'success';
                } else {
                    $message = 'Gagal menghapus komentar.';
                    $message_type = 'error';
                }
                mysqli_stmt_close($stmt);
            }
        }
    }
}

// Fetch all threads with comment count
$threads_result = mysqli_query($koneksi, 'SELECT t.id, t.user_id, t.author, t.title, t.message, t.created_at, COUNT(c.id) as comment_count FROM forum_threads t LEFT JOIN forum_comments c ON t.id = c.thread_id GROUP BY t.id ORDER BY t.created_at DESC');
$threads = mysqli_fetch_all($threads_result, MYSQLI_ASSOC);

$csrf_token = generateCSRFToken();
?>
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
          <a href="quiz.php" class="transition hover:text-blue-600">Latihan Soal</a>
          <a href="forum.php" class="font-semibold text-blue-600">Forum</a>
          <a href="help-center.php" class="transition hover:text-blue-600">Help Center</a>
        </div>

        <div class="flex items-center gap-3">
          <?php if ($user): ?>
            <a href="dashboard.php" class="ml-1 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-blue-200 bg-slate-100" aria-label="Dashboard pengguna">
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" alt="Avatar pengguna" class="h-full w-full object-cover" />
            </a>
          <?php else: ?>
            <a href="login.php" class="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Login</a>
          <?php endif; ?>
        </div>
      </nav>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section class="mb-8 text-center" data-aos="fade-up">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Forum</p>
        <h1 class="mt-3 text-4xl font-black text-slate-900">Belajar bersama, sharing, dan berdiskusi</h1>
      </section>

      <?php if ($message): ?>
        <div class="mb-6 rounded-3xl border <?php echo $message_type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'; ?> p-4">
          <p class="text-sm font-semibold <?php echo $message_type === 'success' ? 'text-green-700' : 'text-red-700'; ?>"><?php echo htmlspecialchars($message); ?></p>
        </div>
      <?php endif; ?>

      <div class="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div data-aos="fade-right" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <?php if ($user): ?>
            <h2 class="text-xl font-black text-slate-900">Mulai thread baru</h2>
            <form method="POST" class="mt-5 space-y-4">
              <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
              <input type="hidden" name="action" value="add_thread">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Judul topik</label>
                <input name="title" type="text" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Misal: Tips belajar CSS" required />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Pesan</label>
                <textarea name="message" rows="5" class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Tulis pertanyaan atau sharing Anda..." required></textarea>
              </div>
              <button type="submit" class="w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">Kirim diskusi</button>
            </form>
          <?php else: ?>
            <p class="text-sm text-slate-500">
              <a href="login.php" class="text-blue-600 hover:text-blue-700 font-semibold">Silakan login</a> untuk membuat thread baru.
            </p>
          <?php endif; ?>
        </div>

        <div data-aos="fade-left" class="space-y-5">
          <?php if (empty($threads)): ?>
            <p class="text-center text-sm text-slate-500 py-10">Belum ada thread. Jadilah yang pertama membuat diskusi!</p>
          <?php else: ?>
            <?php foreach ($threads as $thread): ?>
              <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-start justify-between gap-3 mb-3">
                  <div class="flex-1">
                    <h3 class="text-lg font-black text-slate-900"><?php echo htmlspecialchars($thread['title']); ?></h3>
                    <p class="text-sm text-slate-500">oleh <span class="font-semibold"><?php echo htmlspecialchars($thread['author']); ?></span> • <?php echo date('d M Y H:i', strtotime($thread['created_at'])); ?></p>
                  </div>
                  <?php if ($user && ($user['role'] === 'admin' || $user['id'] === (int)$thread['user_id'])): ?>
                    <form method="POST" style="display:inline;">
                      <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                      <input type="hidden" name="action" value="delete_thread">
                      <input type="hidden" name="thread_id" value="<?php echo (int)$thread['id']; ?>">
                      <input type="hidden" name="user_id" value="<?php echo (int)$thread['user_id']; ?>">
                      <button type="submit" class="text-xs font-semibold text-red-600 hover:text-red-700" onclick="return confirm('Hapus thread ini?')">Hapus</button>
                    </form>
                  <?php endif; ?>
                </div>
                <p class="text-sm text-slate-700 mb-4"><?php echo htmlspecialchars(substr($thread['message'], 0, 200)); ?><?php echo strlen($thread['message']) > 200 ? '...' : ''; ?></p>
                <div class="flex items-center gap-2 text-xs text-slate-600 mb-4">
                  <span>💬 <?php echo (int)$thread['comment_count']; ?> komentar</span>
                </div>

                <!-- Comments Section -->
                <?php 
                $comments_result = mysqli_prepare($koneksi, 'SELECT id, user_id, author, message, created_at FROM forum_comments WHERE thread_id = ? ORDER BY created_at ASC');
                mysqli_stmt_bind_param($comments_result, 'i', $thread['id']);
                mysqli_stmt_execute($comments_result);
                $comments = mysqli_stmt_get_result($comments_result);
                $all_comments = mysqli_fetch_all($comments, MYSQLI_ASSOC);
                ?>

                <?php if (!empty($all_comments)): ?>
                  <div class="mb-4 space-y-3 border-t border-slate-200 pt-4">
                    <?php foreach ($all_comments as $comment): ?>
                      <div class="text-sm bg-slate-50 p-3 rounded-xl">
                        <div class="flex items-center justify-between gap-2 mb-1">
                          <span class="font-semibold text-slate-900"><?php echo htmlspecialchars($comment['author']); ?></span>
                          <?php if ($user && ($user['role'] === 'admin' || $user['id'] === (int)$comment['user_id'])): ?>
                            <form method="POST" style="display:inline;">
                              <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                              <input type="hidden" name="action" value="delete_comment">
                              <input type="hidden" name="comment_id" value="<?php echo (int)$comment['id']; ?>">
                              <input type="hidden" name="user_id" value="<?php echo (int)$comment['user_id']; ?>">
                              <button type="submit" class="text-xs text-red-600 hover:text-red-700" onclick="return confirm('Hapus komentar?')">Hapus</button>
                            </form>
                          <?php endif; ?>
                        </div>
                        <p class="text-slate-600"><?php echo htmlspecialchars($comment['message']); ?></p>
                        <p class="text-xs text-slate-500 mt-1"><?php echo date('d M Y H:i', strtotime($comment['created_at'])); ?></p>
                      </div>
                    <?php endforeach; ?>
                  </div>
                <?php endif; ?>

                <!-- Add Comment Form -->
                <?php if ($user): ?>
                  <form method="POST" class="border-t border-slate-200 pt-4">
                    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                    <input type="hidden" name="action" value="add_comment">
                    <input type="hidden" name="thread_id" value="<?php echo (int)$thread['id']; ?>">
                    <div class="flex gap-2">
                      <input name="comment" type="text" class="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Tambahkan komentar..." required />
                      <button type="submit" class="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Kirim</button>
                    </div>
                  </form>
                <?php endif; ?>
              </div>
            <?php endforeach; ?>
          <?php endif; ?>
        </div>
      </div>
    </main>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>
  </body>
</html>
