<?php
require __DIR__ . '/koneksi.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $subject = trim($_POST['subject'] ?? '');
    $message = trim($_POST['message'] ?? '');

    if (!$name || !$email || !$subject || !$message) {
        $response = ['success' => false, 'message' => 'Semua field harus diisi (email dan telepon opsional).'];
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $response = ['success' => false, 'message' => 'Format email tidak valid.'];
    } else {
        $emailKey = strtolower($email);
        $windowStart = date('Y-m-d H:i:s', strtotime('-5 minutes'));
        $attemptStmt = mysqli_prepare($koneksi, 'SELECT COUNT(*) AS total FROM contact_attempts WHERE email = ? AND created_at >= ?');
        mysqli_stmt_bind_param($attemptStmt, 'ss', $emailKey, $windowStart);
        mysqli_stmt_execute($attemptStmt);
        $attemptRes = mysqli_stmt_get_result($attemptStmt);
        $attemptRow = mysqli_fetch_assoc($attemptRes);
        mysqli_stmt_close($attemptStmt);

        if ((int) ($attemptRow['total'] ?? 0) >= 3) {
            $response = ['success' => false, 'message' => 'Anda sudah terlalu sering mengirim pesan. Coba lagi dalam beberapa menit ke depan.'];
        } else {
            $insertAttempt = mysqli_prepare($koneksi, 'INSERT INTO contact_attempts (email, created_at) VALUES (?, NOW())');
            mysqli_stmt_bind_param($insertAttempt, 's', $emailKey);
            mysqli_stmt_execute($insertAttempt);
            mysqli_stmt_close($insertAttempt);

            $stmt = mysqli_prepare($koneksi, 'INSERT INTO contacts (name, email, phone, subject, message, status) VALUES (?, ?, ?, ?, ?, ?)');
            $status = 'unread';
            mysqli_stmt_bind_param($stmt, 'ssssss', $name, $email, $phone, $subject, $message, $status);

            if (mysqli_stmt_execute($stmt)) {
                $response = ['success' => true, 'message' => 'Kontak Anda berhasil dikirim! Admin akan segera membalas.'];
            } else {
                $response = ['success' => false, 'message' => 'Gagal mengirim kontak. Silakan coba lagi.'];
            }
            mysqli_stmt_close($stmt);
        }
    }

    header('Content-Type: application/json');
    echo json_encode($response);
    exit;
}
?>
