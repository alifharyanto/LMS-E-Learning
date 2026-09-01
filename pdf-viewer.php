<?php
require __DIR__ . '/koneksi.php';

if (empty($_SESSION['user'])) {
        http_response_code(403);
        exit('Akses ditolak. Silakan login terlebih dahulu.');
}

$materialId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$materialId || $materialId < 1) {
        http_response_code(404);
        exit('Materi tidak ditemukan.');
}

$stmt = mysqli_prepare($koneksi, 'SELECT title, file_path FROM materials WHERE id = ? LIMIT 1');
mysqli_stmt_bind_param($stmt, 'i', $materialId);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$material = mysqli_fetch_assoc($result);
mysqli_stmt_close($stmt);

if (!$material || empty($material['file_path'])) {
        http_response_code(404);
        exit('File materi tidak ditemukan.');
}

$materialRoot = realpath(__DIR__ . '/Materi');
$filePath = realpath(__DIR__ . '/' . $material['file_path']);

if (!$materialRoot || !$filePath || strpos($filePath, $materialRoot . DIRECTORY_SEPARATOR) !== 0 || !is_file($filePath)) {
        http_response_code(404);
        exit('File materi tidak tersedia.');
}

if (strtolower(pathinfo($filePath, PATHINFO_EXTENSION)) !== 'pdf') {
        http_response_code(415);
        exit('File materi bukan PDF.');
}

$pdfBase64 = base64_encode(file_get_contents($filePath));
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview PDF | CourseUp</title>
    <style>
        html, body { margin: 0; min-height: 100%; background: #f8fafc; font-family: Arial, sans-serif; }
        body { padding: 16px; box-sizing: border-box; }
        .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 auto 16px; max-width: 900px; color: #0f172a; }
        .title { font-weight: 700; overflow-wrap: anywhere; }
        .pages { display: grid; gap: 16px; justify-items: center; }
        canvas { display: block; max-width: 100%; height: auto; background: white; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.12); }
        .status { padding: 48px 16px; text-align: center; color: #64748b; }
    </style>
</head>
<body>
    <div class="toolbar"><span class="title"><?php echo htmlspecialchars($material['title']); ?></span><span id="status">Memuat preview...</span></div>
    <div id="pages" class="pages"><div class="status">Memuat halaman PDF...</div></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <script>
        const pdfBase64 = <?php echo json_encode($pdfBase64); ?>;
        const pages = document.getElementById('pages');
        const status = document.getElementById('status');
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const binaryPdf = Uint8Array.from(atob(pdfBase64), (character) => character.charCodeAt(0));
        pdfjsLib.getDocument({ data: binaryPdf }).promise
            .then(async (pdf) => {
            pages.innerHTML = '';
            status.textContent = `${pdf.numPages} halaman`;
            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
                const page = await pdf.getPage(pageNumber);
                const viewport = page.getViewport({ scale: 1.35 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                pages.appendChild(canvas);
                await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            }
        })
        .catch(() => {
            status.textContent = 'Gagal memuat';
            pages.innerHTML = '<div class="status">Preview PDF gagal dimuat. Pastikan file PDF masih tersedia.</div>';
        });
    </script>
</body>
</html>
