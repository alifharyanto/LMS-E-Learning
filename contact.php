<?php
require __DIR__ . '/koneksi.php';

$user = $_SESSION['user'] ?? null;
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hubungi Kami | CourseUp E-Learning</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="styles.css" />
</head>
<body class="bg-slate-50 text-slate-900 antialiased">
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <a href="index.php" class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-ocean-700 to-emerald-600 text-lg font-black text-white">C</div>
                <div><span class="text-2xl font-black tracking-tight text-slate-900">Course</span><span class="text-2xl font-black tracking-tight text-emerald-600">Up</span></div>
            </a>
            <div class="flex items-center gap-4">
                <a href="help-center.php" class="text-sm font-semibold text-slate-700 hover:text-emerald-600">Pusat Bantuan</a>
                <a href="forum.php" class="text-sm font-semibold text-slate-700 hover:text-emerald-600">Forum</a>
                <?php if ($user && $user['role'] === 'admin'): ?>
                    <a href="admin.php" class="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Panel Admin</a>
                <?php elseif ($user): ?>
                    <a href="dashboard.php" class="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Dashboard</a>
                <?php else: ?>
                    <a href="login.php" class="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Login</a>
                <?php endif; ?>
            </div>
        </nav>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <section class="mb-16 text-center">
            <h1 class="text-4xl font-black text-slate-900 sm:text-5xl">Hubungi Kami</h1>
            <p class="mt-4 text-lg text-slate-600">Punya pertanyaan atau saran? Kami siap membantu!</p>
        </section>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="rounded-lg bg-blue-50 p-3 w-fit mb-4"><svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></div>
                <h3 class="text-lg font-bold text-slate-900">Email</h3>
                <p class="text-slate-600 mt-2">admin@courseup.com</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="rounded-lg bg-green-50 p-3 w-fit mb-4"><svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg></div>
                <h3 class="text-lg font-bold text-slate-900">Telepon</h3>
                <p class="text-slate-600 mt-2">+62 (021) 1234-5678</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="rounded-lg bg-purple-50 p-3 w-fit mb-4"><svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>
                <h3 class="text-lg font-bold text-slate-900">Alamat</h3>
                <p class="text-slate-600 mt-2">Jakarta, Indonesia</p>
            </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm max-w-2xl mx-auto">
            <h2 class="text-2xl font-black text-slate-900 mb-2">Kirim Pesan</h2>
            <p class="text-slate-600 mb-6">Isi formulir di bawah dan tim kami akan segera menghubungi Anda.</p>

            <form id="contactForm" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label class="block text-sm font-semibold text-slate-900 mb-2">Nama Lengkap *</label><input type="text" name="name" required class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Nama Anda"></div>
                    <div><label class="block text-sm font-semibold text-slate-900 mb-2">Email *</label><input type="email" name="email" required class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="email@example.com"></div>
                </div>
                <div><label class="block text-sm font-semibold text-slate-900 mb-2">Telepon (Opsional)</label><input type="tel" name="phone" class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="+62 8123456789"></div>
                <div><label class="block text-sm font-semibold text-slate-900 mb-2">Subjek *</label><input type="text" name="subject" required class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Topik pesan Anda"></div>
                <div><label class="block text-sm font-semibold text-slate-900 mb-2">Pesan *</label><textarea name="message" rows="6" required class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Tuliskan pesan Anda di sini..."></textarea></div>
                <div class="pt-4"><button type="submit" class="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed" id="submitBtn">Kirim Pesan</button></div>
            </form>
            <div id="successMessage" class="hidden mt-6 p-4 rounded-lg bg-green-50 border border-green-200"><p class="text-green-800 font-semibold">✓ Pesan Anda berhasil dikirim!</p><p class="text-green-700 text-sm mt-1">Admin akan segera memproses dan menghubungi Anda kembali.</p></div>
            <div id="errorMessage" class="hidden mt-6 p-4 rounded-lg bg-red-50 border border-red-200"><p class="text-red-800 font-semibold" id="errorText">Terjadi kesalahan!</p></div>
        </div>
    </main>

    <footer class="mt-20 border-t border-slate-200 bg-slate-900 py-10">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                <div><div class="flex items-center gap-2 mb-4"><div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-black text-white">C</div><span class="font-black text-white">CourseUp</span></div><p class="text-sm text-slate-400">Platform e-learning terpercaya untuk pembelajaran web development.</p></div>
                <div><h4 class="text-sm font-bold text-white mb-4">Platform</h4><ul class="space-y-2 text-sm text-slate-400"><li><a href="courses.php" class="hover:text-white">Kursus</a></li><li><a href="quiz.php" class="hover:text-white">Quiz</a></li><li><a href="forum.php" class="hover:text-white">Forum</a></li></ul></div>
                <div><h4 class="text-sm font-bold text-white mb-4">Dukungan</h4><ul class="space-y-2 text-sm text-slate-400"><li><a href="help-center.php" class="hover:text-white">Pusat Bantuan</a></li><li><a href="contact.php" class="hover:text-white">Hubungi Kami</a></li></ul></div>
                <div><h4 class="text-sm font-bold text-white mb-4">Legal</h4><ul class="space-y-2 text-sm text-slate-400"><li><a href="#" class="hover:text-white">Privasi</a></li><li><a href="#" class="hover:text-white">Syarat & Kondisi</a></li></ul></div>
            </div>
            <div class="border-t border-slate-800 pt-8 text-center text-sm text-slate-400"><p>&copy; 2026 CourseUp. Semua hak cipta dilindungi.</p></div>
        </div>
    </footer>

    <script>
        const form = document.getElementById('contactForm');
        const submitBtn = document.getElementById('submitBtn');
        const successMessage = document.getElementById('successMessage');
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            successMessage.classList.add('hidden');
            errorMessage.classList.add('hidden');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Mengirim...';

            try {
                const formData = new FormData(form);
                const response = await fetch('process_contact.php', { method: 'POST', body: formData });
                const data = await response.json();

                if (data.success) {
                    form.reset();
                    successMessage.classList.remove('hidden');
                } else {
                    errorText.textContent = data.message || 'Terjadi kesalahan!';
                    errorMessage.classList.remove('hidden');
                }
            } catch (error) {
                errorText.textContent = 'Gagal mengirim pesan. Silakan coba lagi.';
                errorMessage.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Kirim Pesan';
            }
        });
    </script>
</body>
</html>

