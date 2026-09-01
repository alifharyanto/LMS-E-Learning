<?php
require __DIR__ . '/koneksi.php';

if (!empty($_SESSION['user'])) {
    redirect($_SESSION['user']['role'] === 'admin' ? 'admin.php' : 'dashboard.php');
}

$message = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($username === '' || $email === '' || $password === '') {
        $message = 'Semua field wajib diisi.';
    } else {
        $check = mysqli_prepare($koneksi, 'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1');
        mysqli_stmt_bind_param($check, 'ss', $username, $email);
        mysqli_stmt_execute($check);
        $result = mysqli_stmt_get_result($check);
        $exists = mysqli_fetch_assoc($result);

        if ($exists) {
            $message = 'Username atau email sudah terdaftar.';
        } else {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = mysqli_prepare($koneksi, 'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, "student")');
            mysqli_stmt_bind_param($stmt, 'sss', $username, $email, $hash);
            mysqli_stmt_execute($stmt);

            $_SESSION['user'] = [
                'id' => mysqli_insert_id($koneksi),
                'username' => $username,
                'email' => $email,
                'role' => 'student'
            ];
            redirect('dashboard.php');
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Daftar | CourseUp</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = { 
        theme: { 
          extend: { 
            colors: { 
              brand: { blue: '#2563EB', dark: '#111111' },
              ocean: {
                50: '#f0fdfa',
                100: '#ccfbf1',
                600: '#0d9488',
                700: '#0f766e',
              },
              emerald: {
                600: '#16a34a',
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
  <body data-page="auth" class="bg-gradient-to-br from-slate-50 to-emerald-50 text-slate-900 antialiased">
    <div class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.1),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(22,163,74,0.1),_transparent_30%)] px-4 py-12 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-emerald-200/50 bg-white shadow-2xl shadow-emerald-200/30">
        <div class="grid min-h-[760px] lg:grid-cols-2">
          <div class="hidden bg-gradient-to-br from-slate-900 to-ocean-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <a href="index.php" class="inline-flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-600 to-emerald-600 text-lg font-black text-white">C</div>
                <div><span class="text-2xl font-black tracking-tight">Course</span><span class="text-2xl font-black tracking-tight text-emerald-400">Up</span></div>
              </a>
            </div>
            <div>
              <p class="text-sm uppercase tracking-[0.25em] text-emerald-200">Bergabung sekarang</p>
              <h1 class="mt-6 text-4xl font-black leading-tight">Bangun kebiasaan belajar yang konsisten bersama CourseUp.</h1>
              <p class="mt-5 max-w-md text-base text-emerald-100">Daftarkan diri Anda untuk mulai belajar dengan materi yang terstruktur, kuis interaktif, dan ruang diskusi aktif.</p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="rounded-2xl bg-white/10 p-4"><p class="text-2xl font-black text-white">4.8/5</p><p class="text-sm text-emerald-200">Rating siswa</p></div>
              <div class="rounded-2xl bg-white/10 p-4"><p class="text-2xl font-black text-white">24/7</p><p class="text-sm text-emerald-200">Akses materi</p></div>
            </div>
          </div>

          <div class="flex items-center justify-center p-6 sm:p-10">
            <div class="w-full max-w-md">
              <div class="mb-8 text-center lg:text-left">
                <p class="text-sm font-semibold uppercase tracking-[0.2em] bg-gradient-to-r from-ocean-700 to-emerald-600 bg-clip-text text-transparent">Daftar akun</p>
                <h2 class="mt-3 text-3xl font-black text-slate-900">Buat akun baru</h2>
              </div>

              <form method="post" action="" class="space-y-5">
                <?php if ($message): ?>
                  <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><?php echo htmlspecialchars($message); ?></div>
                <?php endif; ?>
                <div>
                  <label for="username" class="mb-1.5 block text-sm font-medium text-slate-700">Username</label>
                  <input id="username" name="username" type="text" class="w-full rounded-2xl border border-emerald-300/30 bg-emerald-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-200" placeholder="Masukkan username" required />
                </div>
                <div>
                  <label for="email" class="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                  <input id="email" name="email" type="email" class="w-full rounded-2xl border border-emerald-300/30 bg-emerald-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-200" placeholder="contoh@email.com" required />
                </div>
                <div>
                  <label for="registerPassword" class="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                  <input id="registerPassword" name="password" type="password" class="w-full rounded-2xl border border-emerald-300/30 bg-emerald-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-200" placeholder="Buat password" required />
                </div>
                <button type="submit" class="w-full rounded-full bg-gradient-to-r from-ocean-700 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-ocean-800 hover:to-emerald-700 hover:shadow-emerald-500/50">Daftar sekarang</button>
              </form>

              <div class="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600">
                <span>Sudah punya akun?</span>
                <a href="login.php" class="font-semibold text-emerald-600 hover:text-emerald-700">Masuk di sini</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>
  </body>
</html>

