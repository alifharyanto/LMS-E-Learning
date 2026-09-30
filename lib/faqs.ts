export type FaqEntry = {
  id: number;
  question: string;
  answer: string;
};

export const FAQS: FaqEntry[] = [
  {
    id: 1,
    question: "Bagaimana cara mengakses materi kursus?",
    answer: "Masuk ke akun CourseUp, buka Kursus Materi, lalu pilih modul yang ingin dipelajari. Materi tersedia dalam format PDF.",
  },
  {
    id: 2,
    question: "Bagaimana cara mengikuti latihan soal?",
    answer: "Buka Latihan Soal, pilih kategori, jawab pertanyaan, lalu kirim quiz untuk melihat nilai dan penjelasan jawaban.",
  },
  {
    id: 3,
    question: "Di mana saya bisa melihat progres belajar?",
    answer: "Dashboard menampilkan riwayat quiz, nilai rata-rata, aktivitas forum, dan waktu belajar yang tercatat.",
  },
  {
    id: 4,
    question: "Apakah saya perlu masuk untuk menggunakan forum?",
    answer: "Thread dan komentar bisa dibaca tanpa masuk. Untuk membuat diskusi atau membalas, masuk ke akun CourseUp terlebih dahulu.",
  },
  {
    id: 5,
    question: "Bagaimana cara mengubah foto profil?",
    answer: "Buka Dashboard dan perbarui profil. Foto yang didukung adalah JPG, PNG, atau WebP dengan ukuran maksimal 2 MB.",
  },
  {
    id: 6,
    question: "Bagaimana jika saya lupa password?",
    answer: "Hubungi tim CourseUp melalui formulir kontak dengan email akun Anda agar kami dapat membantu proses pemulihan.",
  },
  {
    id: 7,
    question: "Bagaimana nilai persentase quiz dihitung?",
    answer: "Persentase dihitung dari jumlah jawaban benar dibandingkan jumlah seluruh soal dalam quiz.",
  },
  {
    id: 8,
    question: "Bagaimana cara menghubungi tim CourseUp?",
    answer: "Kirim pesan melalui Help Center atau halaman Hubungi Kami. Sertakan email yang aktif agar tim kami dapat membalas.",
  },
];