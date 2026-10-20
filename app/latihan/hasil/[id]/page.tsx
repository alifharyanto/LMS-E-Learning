"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Circle, Trophy, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MotionLink } from "@/components/ui/motion";
import { apiRequest, type ApiError } from "@/lib/browser-api";

type ReviewQuestion = {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer_index: number;
  selected_index: number | null;
  explanation: string | null;
  status: "correct" | "incorrect" | "unanswered";
};

type ReviewData = {
  result: {
    id: number;
    category_name: string;
    total: number;
    correct_answers: number;
    incorrect_answers: number;
    unanswered_answers: number;
  };
  questions: ReviewQuestion[];
};

const letters = ["A", "B", "C", "D"];

export default function QuizResultReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<ReviewData>(`/api/v1/quizzes/results/${encodeURIComponent(id)}`)
      .then((result) => { if (active) setData(result); })
      .catch((requestError: ApiError) => {
        if (!active) return;
        if (requestError.status === 401) router.replace("/login");
        else setError(requestError.message);
      });
    return () => { active = false; };
  }, [id, router]);

  if (error) return <div className="quiz-page">
    <header className="page-heading quiz-page-heading"><span className="eyebrow">ULASAN HASIL</span><h1 className="page-title">Hasil quiz tidak tersedia</h1><p className="page-intro" role="alert">{error}</p></header>
    <MotionLink className="button button-primary" href="/latihan"><ArrowRight size={16} />Kembali ke latihan</MotionLink>
  </div>;

  if (!data) return <div className="quiz-page">
    <header className="page-heading quiz-page-heading"><span className="eyebrow">ULASAN HASIL</span><h1 className="page-title">Memuat pembahasan</h1><p className="page-intro" role="status">Hasil dan jawaban Anda sedang disiapkan.</p></header>
    <div className="empty-state">Memuat detail jawaban...</div>
  </div>;

  const { result, questions } = data;
  return <div className="quiz-page">
    <header className="page-heading quiz-page-heading"><span className="eyebrow">ULASAN HASIL</span><h1 className="page-title">Pembahasan latihan</h1><p className="page-intro">{result.category_name} · {result.total} soal</p></header>
    <motion.div className="quiz-completed-review" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
      <section className="quiz-completed-review-heading" aria-labelledby="review-title">
        <span className="quiz-kicker"><Trophy size={15} /> HASIL LATIHAN</span>
        <h2 id="review-title">Selamat, Anda telah menyelesaikannya! Mainnya Hebat.</h2>
        <p>Periksa kembali jawaban yang dipilih dan pelajari alasan dari jawaban yang benar.</p>
      </section>
      <div className="quiz-review-summary" aria-label="Ringkasan jawaban">
        <div><span>Total soal</span><strong>{result.total}</strong></div>
        <div><span>Terjawab benar</span><strong className="is-correct">{result.correct_answers}</strong></div>
        <div><span>Terjawab salah</span><strong className="is-incorrect">{result.incorrect_answers}</strong></div>
        <div><span>Tidak dijawab</span><strong>{result.unanswered_answers}</strong></div>
      </div>
      <div className="quiz-review-list">
        {questions.map((question, questionIndex) => {
          const options = [question.option_a, question.option_b, question.option_c, question.option_d];
          const statusLabel = question.status === "correct" ? "Benar" : question.status === "incorrect" ? "Salah" : "Tidak dijawab";
          const StatusIcon = question.status === "correct" ? CheckCircle2 : question.status === "incorrect" ? XCircle : Circle;
          return <motion.article
            className={`quiz-review-card is-${question.status}`}
            key={question.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(questionIndex * 0.045, 0.36) }}
            aria-label={`Soal ${questionIndex + 1}: ${statusLabel}`}
          >
            <div className="quiz-review-card-heading"><span>SOAL {questionIndex + 1} / {questions.length}</span><strong><StatusIcon size={15} />{statusLabel}</strong></div>
            <h2>{question.question}</h2>
            <div className="quiz-review-options" role="list" aria-label={`Pilihan jawaban soal ${questionIndex + 1}`}>
              {options.map((option, optionIndex) => {
                const isSelected = question.selected_index === optionIndex;
                const isCorrect = question.answer_index === optionIndex;
                const tags = [isSelected ? "Jawaban Anda" : "", isCorrect ? "Jawaban benar" : ""].filter(Boolean).join(" · ");
                return <div className={`quiz-review-option${isSelected ? " is-selected" : ""}${isCorrect ? " is-correction" : ""}`} role="listitem" key={`${question.id}-${optionIndex}`}>
                  <span className="quiz-review-option-letter">{letters[optionIndex]}</span>
                  <span>{option}</span>
                  {tags && <small>{tags}</small>}
                </div>;
              })}
            </div>
            <div className={`quiz-review-feedback is-${question.status}`}>
              <span>{question.selected_index === null ? "Jawaban Anda: Tidak dijawab" : `Jawaban Anda: ${letters[question.selected_index]} — ${options[question.selected_index]}`}</span>
              <strong>Jawaban yang benar: {letters[question.answer_index]} — {options[question.answer_index]}</strong>
              <p>{question.explanation?.trim() || "Admin belum menambahkan alasan untuk jawaban ini."}</p>
            </div>
          </motion.article>;
        })}
      </div>
      <div className="quiz-review-footer">
        <MotionLink className="button button-primary" href="/latihan"><ArrowRight size={16} />Lanjut</MotionLink>
      </div>
    </motion.div>
  </div>;
}
