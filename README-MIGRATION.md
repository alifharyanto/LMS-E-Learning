# CourseUp Laravel + TiDB

This is the parallel Laravel migration of the legacy PHP LMS. The original PHP application remains in the parent folder.

## TiDB Cloud configuration

Copy `.env.example` to `.env` and set the values from TiDB Cloud Connect:

```env
DB_CONNECTION=mysql
DB_HOST=gateway01.<region>.prod.aws.tidbcloud.com
DB_PORT=4000
DB_DATABASE=db_learning
DB_USERNAME=<tidb-user>
DB_PASSWORD=<tidb-password>
DB_CHARSET=utf8mb4
DB_COLLATION=utf8mb4_unicode_ci
```

TiDB Cloud Serverless requires TLS. On local Laragon, enable `pdo_mysql` in the PHP used by Composer and Artisan. This project intentionally does not run `migrate:fresh`, `db:wipe`, or `CREATE DATABASE` because the existing TiDB database is the source of truth.

Before connecting, create a backup and verify that the legacy tables exist. Then run:

```powershell
php artisan config:clear
php artisan route:list
php artisan tinker
```

Inside Tinker, use a read-only check first:

```php
DB::select('SELECT 1 AS connected');
DB::table('users')->count();
```

## Local run

```powershell
php artisan serve
```

Open `http://127.0.0.1:8000`. The Laravel app is intentionally incomplete while feature parity is migrated; the legacy app remains available at its existing Laragon URL.
