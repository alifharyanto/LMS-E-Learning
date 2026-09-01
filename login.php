<?php
session_start();
require_once 'koneksi.php';

// Jika sudah login, lempar ke dashboard
if (isset($_SESSION['user_id'])) {
    header("Location: dashboard.php");
    exit();
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username_email = trim($_POST['username_email']);
    $password       = $_POST['password'];

    if (empty($username_email) || empty($password)) {
        $error = "Semua kolom wajib diisi!";
    } else {
        // Cari user berdasarkan username ATAU email
        $stmt = mysqli_prepare($koneksi, "SELECT id, username, password FROM users WHERE username = ? OR email = ?");
        mysqli_stmt_bind_param($stmt, "ss", $username_email, $username_email);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);

        if ($user = mysqli_fetch_assoc($result)) {
            // Verifikasi password hash
            if (password_verify($password, $user['password'])) {
                // Simpan data user ke Session
                $_SESSION['user_id']  = $user['id'];
                $_SESSION['username'] = $user['username'];

                header("Location: dashboard.php");
                exit();
            } else {
                $error = "Password salah!";
            }
        } else {
            $error = "Username atau Email tidak ditemukan!";
        }
        mysqli_stmt_close($stmt);
    }
}
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Login</title>
</head>
<body>
    <h2>Form Login</h2>
    <?php if ($error): ?>
        <p style="color: red;"><?= $error; ?></p>
    <?php endif; ?>

    <form action="" method="POST">
        <div>
            <label>Username atau Email:</label><br>
            <input type="text" name="username_email" required>
        </div>
        <br>
        <div>
            <label>Password:</label><br>
            <input type="password" name="password" required>
        </div>
        <br>
        <button type="submit">Login</button>
    </form>
    <p>Belum punya akun? <a href="register.php">Daftar di sini</a></p>
</body>
</html>