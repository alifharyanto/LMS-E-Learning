<?php

if (isset($_ENV['VERCEL']) || isset($_SERVER['VERCEL'])) {
    if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
        $_SERVER['HTTPS'] = 'on';
    }

    // Path cache & view sementara Vercel
    putenv('VIEW_COMPILED_PATH=/tmp');
    putenv('APP_CONFIG_CACHE=/tmp/config.php');
    putenv('APP_SERVICES_CACHE=/tmp/services.php');
    putenv('APP_PACKAGES_CACHE=/tmp/packages.php');
    putenv('APP_ROUTES_CACHE=/tmp/routes.php');

    // Alihkan log ke errorlog (stdout) agar tidak menulis file laravel.log
    putenv('LOG_CHANNEL=stderr');

    // Alihkan session dan cache ke driver cookie / array
    putenv('SESSION_DRIVER=cookie');
    putenv('CACHE_STORE=array');
}

require __DIR__ . '/../public/index.php';