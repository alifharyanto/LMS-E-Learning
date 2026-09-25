<?php

if (isset($_ENV['VERCEL']) || isset($_SERVER['VERCEL'])) {
    if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
        $_SERVER['HTTPS'] = 'on';
    }

    // Set path cache sementara
    putenv('VIEW_COMPILED_PATH=/tmp');
    putenv('APP_CONFIG_CACHE=/tmp/config.php');
    putenv('APP_SERVICES_CACHE=/tmp/services.php');
    putenv('APP_PACKAGES_CACHE=/tmp/packages.php');
    putenv('APP_ROUTES_CACHE=/tmp/routes.php');

    // Hapus file compiled view lama di /tmp jika ada perbaikan UI baru
    array_map('unlink', glob("/tmp/*.php"));
}

require __DIR__ . '/../public/index.php';