<?php
session_start();
require_once 'koneksi.php';

// Jika sudah login, lempar ke dashboard
if (isset($_SESSION['user_id'])) {
    header("Location: dashboard.php");
    exit();
}

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $email    = trim($_POST['email']);
    $password = $_POST['password'];

    if (empty($username) || empty($email) || empty($password)) {
        $error = "Semua kolom wajib diisi!";
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = "Format email tidak valid!";
    } else {
        // Cek apakah username atau email sudah terdaftar
        $stmt = mysqli_prepare($koneksi, "SELECT id FROM users WHERE username = ? OR email = ?");
        mysqli_stmt_bind_param($stmt, "ss", $username, $email);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_store_result($stmt);

        if (mysqli_stmt_num_rows($stmt) > 0) {
            $error = "Username atau Email sudah terdaftar!";
        } else {
            // Hash password untuk keamanan
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);

            // Simpan data user baru
            $insert_stmt = mysqli_prepare($koneksi, "INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
            mysqli_stmt_bind_param($insert_stmt, "sss", $username, $email, $hashed_password);

            if (mysqli_stmt_execute($insert_stmt)) {
                $success = "Pendaftaran berhasil! Silakan <a href='login.php'>Login</a>.";
            } else {
                $error = "Terjadi kesalahan saat menyimpan data.";
            }
            mysqli_stmt_close($insert_stmt);
        }
        mysqli_stmt_close($stmt);
    }
}
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Register</title>
</head>
<body>
    <h2>Form Register</h2>
    <?php if ($error): ?>
        <p style="color: red;"><?= $error; ?></p>
    <?php endif; ?>
    <?php if ($success): ?>
        <p style="color: green;"><?= $success; ?></p>
    <?php endif; ?>

    <form action="" method="POST">
        <div>
            <label>Username:</label><br>
            <input type="text" name="username" required>
        </div>
        <br>
        <div>
            <label>Email:</label><br>
            <input type="email" name="email" required>
        </div>
        <br>
        <div>
            <label>Password:</label><br>
            <input type="password" name="password" required>
        </div>
        <br>
        <button type="submit">Daftar</button>
    </form>
    <p>Sudah punya akun? <a href="login.php">Login di sini</a></p>
</body>
</html>