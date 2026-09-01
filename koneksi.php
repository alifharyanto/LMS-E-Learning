<?php
$host     = "localhost";
$username = "root";
$password = "";
$database = "db_learning";
$koneksi = mysqli_connect($host, $username, $password, $database);
if (!$koneksi) {
    die("Koneksi gagal: " . mysqli_connect_error());
}
mysqli_set_charset($koneksi, "utf8mb4");
?>