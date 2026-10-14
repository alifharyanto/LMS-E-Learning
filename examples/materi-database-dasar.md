# Dasar Database dan SQL

**Kategori:** Database  
**Tingkat:** Pemula

## Tujuan belajar

Setelah mempelajari materi ini, kamu dapat:

- Menjelaskan fungsi database.
- Mengenali tabel, kolom, baris, dan kunci.
- Menulis perintah SQL dasar untuk mengelola data.

## Apa itu database?

Database adalah kumpulan data yang disimpan secara teratur agar mudah dicari, ditambah, diubah, dan dihapus. Aplikasi kursus, misalnya, dapat menggunakan database untuk menyimpan akun siswa, materi, dan nilai quiz.

Database relasional menyimpan data dalam tabel yang saling terhubung. Contohnya, tabel `students` menyimpan data siswa dan tabel `materials` menyimpan materi belajar.

## Bagian-bagian tabel

| Istilah | Arti | Contoh |
| --- | --- | --- |
| Tabel | Kumpulan data sejenis | `students` |
| Kolom | Jenis informasi yang disimpan | `full_name` |
| Baris | Satu catatan data | Satu siswa |
| Primary key | Penanda unik untuk setiap baris | `id` |
| Foreign key | Kolom yang menghubungkan tabel | `student_id` |

Contoh tabel `students`:

| id | full_name | class_name |
| --- | --- | --- |
| 1 | Alya Putri | XI RPL |
| 2 | Bima Saputra | XI RPL |

Nilai `id` membedakan setiap siswa, meskipun ada siswa dengan nama yang sama.

## Membuat tabel

SQL adalah bahasa yang umum digunakan untuk berkomunikasi dengan database relasional.

```sql
CREATE TABLE students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  email VARCHAR(255) UNIQUE
);
```

`NOT NULL` berarti kolom wajib diisi. `UNIQUE` berarti nilainya tidak boleh sama dengan baris lain. `AUTO_INCREMENT` membuat database memberi nomor `id` secara otomatis.

## Menambahkan data

```sql
INSERT INTO students (full_name, class_name, email)
VALUES ('Alya Putri', 'XI RPL', 'alya@example.com');
```

Kolom `id` tidak perlu ditulis karena nilainya dibuat otomatis.

## Membaca data

Untuk melihat semua siswa:

```sql
SELECT id, full_name, class_name
FROM students;
```

Untuk mencari siswa di kelas tertentu:

```sql
SELECT full_name, email
FROM students
WHERE class_name = 'XI RPL';
```

Gunakan `WHERE` agar hanya baris yang sesuai kondisi yang ditampilkan.

## Mengubah data

```sql
UPDATE students
SET class_name = 'XII RPL'
WHERE id = 1;
```

Selalu periksa kondisi `WHERE` sebelum menjalankan `UPDATE`. Tanpa kondisi tersebut, semua baris dapat ikut berubah.

## Menghapus data

```sql
DELETE FROM students
WHERE id = 2;
```

Sama seperti `UPDATE`, perintah `DELETE` tanpa `WHERE` dapat menghapus semua baris dalam tabel. Pastikan kondisi dan data yang akan dihapus sudah benar.

## Menghubungkan dua tabel

Misalnya, setiap materi memiliki judul dan kategori. Kolom `student_id` pada tabel `enrollments` dapat merujuk ke siswa yang mengambil kursus.

```sql
CREATE TABLE enrollments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  course_name VARCHAR(100) NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id)
);
```

Foreign key membantu menjaga hubungan data. Pendaftaran tidak dapat merujuk ke siswa yang tidak tercatat pada tabel `students`.

## Latihan

1. Buat tabel `courses` dengan kolom `id`, `title`, dan `category`.
2. Tambahkan satu kursus ke tabel tersebut.
3. Tampilkan semua kursus dalam kategori `Database`.
4. Ubah judul kursus dengan `id` tertentu.
5. Jelaskan mengapa `UPDATE` dan `DELETE` sebaiknya menggunakan `WHERE`.

## Ringkasan

- Database menyimpan data agar teratur dan mudah dikelola.
- Tabel terdiri dari kolom dan baris.
- Primary key mengidentifikasi baris; foreign key menghubungkan tabel.
- SQL dasar mencakup `CREATE`, `INSERT`, `SELECT`, `UPDATE`, dan `DELETE`.
- Selalu gunakan dan periksa `WHERE` saat mengubah atau menghapus data.
