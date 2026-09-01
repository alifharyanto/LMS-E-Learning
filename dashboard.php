<?php
session_start();

// Cek apakah user sudah login
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Dashboard</title>
</head>
<body>
    <h2>Selamat Datang, <?= htmlspecialchars($_SESSION['username']); ?>!</h2>
    <p>Anda berhasil masuk ke sistem.</p>
    <a href="logout.php">Logout</a>
</body>
</html>