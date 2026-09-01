<?php
require __DIR__ . '/koneksi.php';

// Handle contact form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $subject = trim($_POST['subject'] ?? '');
    $message = trim($_POST['message'] ?? '');

    // Validation
    if (!$name || !$email || !$subject || !$message) {
        $response = [
            'success' => false,
            'message' => 'Semua field harus diisi (email dan telepon opsional).'
        ];
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $response = [
            'success' => false,
            'message' => 'Format email tidak valid.'
        ];
    } else {
        // Insert into database
        $stmt = mysqli_prepare($koneksi, 'INSERT INTO contacts (name, email, phone, subject, message, status) VALUES (?, ?, ?, ?, ?, ?)');
        $status = 'unread';
        mysqli_stmt_bind_param($stmt, 'ssssss', $name, $email, $phone, $subject, $message, $status);
        
        if (mysqli_stmt_execute($stmt)) {
            $response = [
                'success' => true,
                'message' => 'Kontak Anda berhasil dikirim! Admin akan segera membalas.'
            ];
        } else {
            $response = [
                'success' => false,
                'message' => 'Gagal mengirim kontak. Silakan coba lagi.'
            ];
        }
        mysqli_stmt_close($stmt);
    }
    
    // Return JSON response
    header('Content-Type: application/json');
    echo json_encode($response);
    exit;
}
?>
