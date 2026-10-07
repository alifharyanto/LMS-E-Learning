"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Brain, Clock3, ListChecks, RotateCcw, Send, Trophy } from "lucide-react";
import { apiRequest, type ApiError } from "@/lib/browser-api";
import { MotionButton, MotionLink, Reveal, StaggerGroup, StaggerItem } from "@/components/ui/motion";

type Category = { id: number; name: string; questions_count: number; time_limit_minutes: number | null };
type Question = { id: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string };
type QuizResult = { score: number; total: number; percent: number; explanations: { id: number; text: string | null }[] };
type QuizAttempt = { id: number; status: "in_progress" | "submitted" | "expired"; questions: Question[]; answers: Record<string, number>; remaining_seconds: number; result: QuizResult | null };

export default function LatihanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("category_id");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const submittingAttemptRef = useRef(false);
  const remainingSecondsRef = useRef<number | null>(null);
  const [loadedCategoryId, setLoadedCategoryId] = useState<string | null | undefined>(undefined);
  const loading = loadedCategoryId !== categoryId;
  const answeredCount = questions.filter((question) => answers[String(question.id)] !== undefined).length;
  const completion = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const firstUnanswered = questions.find((question) => answers[String(question.id)] === undefined);

  useEffect(() => {
    let active = true;
    const endpoint = categoryId ? `/api/v1/quizzes?category_id=${encodeURIComponent(categoryId)}` : "/api/v1/quizzes";
    apiRequest<{ categories?: Category[]; category?: { name: string; time_limit_minutes: number | null }; questions?: Question[] }>(endpoint)
      .then(async (data) => {
        if (!active) return;
        setCategories(data.categories ?? []);
        setCategoryName(data.category?.name ?? "");
        setResult(null);
        setAttemptId(null);
        setRemainingSeconds(null);
        setTimeLimitMinutes(null);
        setAnswers({});
        setError("");
        let nextQuestions = data.questions ?? [];
        const configuredTimeLimit = Number(data.category?.time_limit_minutes);
        if (categoryId) {
          setTimeLimitMinutes(configuredTimeLimit > 0 ? configuredTimeLimit : null);
          const existing = await apiRequest<{ attempt: QuizAttempt | null }>(`/api/v1/quizzes/attempts?category_id=${encodeURIComponent(categoryId)}`);
          if (!active) return;
          let attempt = existing.attempt;
          if (!attempt && configuredTimeLimit > 0) {
            const started = await apiRequest<{ attempt: QuizAttempt }>("/api/v1/quizzes/attempts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "start", category_id: categoryId }),
            });
            attempt = started.attempt;
          }
          if (!active) return;
          if (attempt) {
            nextQuestions = attempt.questions;
            setAnswers(attempt.answers);
            if (attempt.status === "in_progress") {
              setAttemptId(attempt.id);
              setRemainingSeconds(attempt.remaining_seconds);
            } else {
              setResult(attempt.result);
            }
          }
          submittingAttemptRef.current = false;
          saveQueueRef.current = Promise.resolve();
        }
        setQuestions(nextQuestions);
        setLoadedCategoryId(categoryId);
      })
      .catch((requestError: ApiError) => {
        if (requestError.status === 401) router.replace("/login");
        else if (active) setError(requestError.message);
        if (active) setLoadedCategoryId(categoryId);
      });
    return () => { active = false; };
  }, [categoryId, router]);

  async function submitTimedQuiz(timedOut = false) {
    if (attemptId === null || submittingAttemptRef.current) return;
    submittingAttemptRef.current = true;
    setBusy(true);
    setError("");
    try {
      await saveQueueRef.current;
      const response = await apiRequest<{ result: QuizResult }>("/api/v1/quizzes/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", attempt_id: attemptId, answers, timed_out: timedOut }),
      });
      setResult(response.result);
      setAttemptId(null);
      setRemainingSeconds(null);
    } catch (requestError) {
      submittingAttemptRef.current = false;
      if (timedOut) {
        remainingSecondsRef.current = 1;
        setRemainingSeconds(1);
      } else {
        setError(requestError instanceof Error ? requestError.message : "Quiz gagal dikirim.");
      }
    } finally {
      setBusy(false);
    }
  }

  const submitWhenTimeRunsOut = useEffectEvent(() => {
    void submitTimedQuiz(true);
  });

  useEffect(() => {
    remainingSecondsRef.current = remainingSeconds;
  }, [remainingSeconds]);

  useEffect(() => {
    if (attemptId === null || result) return;
    const interval = window.setInterval(() => {
      const seconds = remainingSecondsRef.current;
      if (seconds === null) return;
      if (seconds <= 1) {
        remainingSecondsRef.current = 0;
        setRemainingSeconds(0);
        window.clearInterval(interval);
        submitWhenTimeRunsOut();
        return;
      }
      remainingSecondsRef.current = seconds - 1;
      setRemainingSeconds(seconds - 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [attemptId, remainingSeconds, result]);

  function selectAnswer(questionId: number, optionIndex: number) {
    const nextAnswers = { ...answers, [String(questionId)]: optionIndex };
    setAnswers(nextAnswers);
    if (attemptId === null) return;
    const currentAttemptId = attemptId;
    saveQueueRef.current = saveQueueRef.current.catch(() => undefined).then(async () => {
      await apiRequest("/api/v1/quizzes/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", attempt_id: currentAttemptId, answers: nextAnswers }),
      });
    }).catch((requestError) => {
      setError(requestError instanceof Error ? requestError.message : "Jawaban gagal disimpan.");
    });
  }

  async function retryQuiz() {
    setError("");
    if (!categoryId || !timeLimitMinutes) {
      setResult(null);
      setAnswers({});
      return;
    }
    setBusy(true);
    try {
      const response = await apiRequest<{ attempt: QuizAttempt }>("/api/v1/quizzes/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", category_id: categoryId }),
      });
      setQuestions(response.attempt.questions);
      setAnswers(response.attempt.answers);
      setResult(null);
      setAttemptId(response.attempt.id);
      setRemainingSeconds(response.attempt.remaining_seconds);
      remainingSecondsRef.current = response.attempt.remaining_seconds;
      submittingAttemptRef.current = false;
      saveQueueRef.current = Promise.resolve();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Quiz gagal dimulai kembali.");
    } finally {
      setBusy(false);
    }
  }

  async function submitQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryId) return;
    if (attemptId !== null) {
      await submitTimedQuiz();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest<{ result: QuizResult }>("/api/v1/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: categoryId, answers }),
      });
      setResult(response.result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Quiz gagal dikirim.");
    } finally {
      setBusy(false);
    }
  }

  function jumpToFirstUnanswered() {
    if (!firstUnanswered) return;
    document.getElementById(`quiz-question-${firstUnanswered.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (!categoryId) return <>
    <header className="page-heading"><span className="eyebrow">Latihan Soal</span><h1 className="page-title">Pilih Kategori Latihan</h1><p className="page-intro">Pilih kategori untuk memulai quiz.</p></header>
    {error && <p className="status status-error" role="alert">{error}</p>}
    {loading && <div className="empty-state" role="status">Sedang memuat data latihan...</div>}
    {!loading && (categories.length ? <StaggerGroup className="grid-three quiz-categories" aria-label="Pilih kategori quiz">{categories.map((category) => <StaggerItem className="quiz-category-item" key={category.id}><MotionButton type="button" className="surface surface-pad quiz-category" onClick={() => router.push(`/latihan?category_id=${category.id}`)}><span className="list-meta"><Brain size={14} /> KATEGORI</span><h2 className="surface-title">{category.name}</h2><p className="page-intro">Total soal: <strong>{category.questions_count}</strong></p><span className="link-inline">Mulai latihan <ArrowRight className="quiz-arrow" size={15} /></span></MotionButton></StaggerItem>)}</StaggerGroup> : <div className="empty-state">{error || "Belum ada kategori quiz. Silakan hubungi admin."}</div>)}
  </>;

  return <>
    <header className="page-heading"><span className="eyebrow">Latihan Soal</span><h1 className="page-title">{categoryName || "Latihan"}</h1><p className="page-intro">Jawab semua soal dengan hati-hati.</p></header>
    {error && <p className="status status-error" role="alert">{error}</p>}
    {loading && <div className="empty-state" role="status">Sedang memuat soal...</div>}
    <div className="quiz-layout"><section className={`surface surface-pad ${result ? "quiz-completed" : ""}`}>
      {result && !loading && <div className="status quiz-result quiz-result-student" role="status"><span className="list-meta"><Trophy size={14} /> SELAMAT, ANDA TELAH MELAKUKAN QUIZ</span><p className="page-intro">Hasil akhir anda telah disimpan.</p><div className="metric-value">{result.percent}%</div><strong>Skor: {result.score}/{result.total}</strong><MotionButton type="button" className="button button-secondary" onClick={() => void retryQuiz()} disabled={busy}><RotateCcw size={14} />Coba Lagi</MotionButton></div>}
      {!loading && (questions.length ? <form className="stack" onSubmit={submitQuiz}>
        <div className="quiz-progress-panel">
          <div className="quiz-progress-heading"><div><span className="list-meta">PROGRES QUIZ</span><strong>{answeredCount} dari {questions.length} soal</strong></div><div className="quiz-progress-status">{attemptId !== null && remainingSeconds !== null && <span className="quiz-timer" role="timer" aria-label={`Sisa waktu ${Math.floor(remainingSeconds / 60)} menit ${remainingSeconds % 60} detik`}><Clock3 size={15} />{String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")}</span>}<span className="quiz-progress-percent">{completion}%</span></div></div>
          <div className="quiz-progress-track" role="progressbar" aria-label="Progres jawaban" aria-valuenow={answeredCount} aria-valuemin={0} aria-valuemax={questions.length}><span style={{ width: `${completion}%` }} /></div>
          <div className="quiz-question-jump" aria-label="Navigasi soal">{questions.map((question, index) => <MotionButton type="button" key={question.id} className={`quiz-jump ${answers[String(question.id)] !== undefined ? "is-answered" : ""}`} aria-label={`Lompat ke soal ${index + 1}${answers[String(question.id)] !== undefined ? ", sudah dijawab" : ", belum dijawab"}`} onClick={() => document.getElementById(`quiz-question-${question.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>{answers[String(question.id)] !== undefined ? <ListChecks size={13} /> : index + 1}</MotionButton>)}</div>
          {firstUnanswered && <MotionButton type="button" className="quiz-next-unanswered" onClick={jumpToFirstUnanswered}><ArrowDown size={14} />Ke soal belum dijawab</MotionButton>}
        </div>
        {questions.map((question, index) => <Reveal className="quiz-question-reveal" key={question.id}><fieldset id={`quiz-question-${question.id}`} className="quiz-question"><legend className="list-title">Soal {index + 1}: {question.question}</legend>{[question.option_a, question.option_b, question.option_c, question.option_d].map((option, optionIndex) => <label className="check-row quiz-option" key={optionIndex}><input type="radio" name={`question-${question.id}`} checked={answers[String(question.id)] === optionIndex} onChange={() => selectAnswer(question.id, optionIndex)} required /><span>{option}</span></label>)}{result?.explanations.find((item) => item.id === question.id)?.text && <p className="page-intro"><strong>Penjelasan:</strong> {result.explanations.find((item) => item.id === question.id)?.text}</p>}</fieldset></Reveal>)}
        {result ? <MotionButton type="button" className="button button-primary" onClick={() => void retryQuiz()} disabled={busy}><RotateCcw size={15} />Coba Lagi</MotionButton> : <MotionButton className="button button-primary" disabled={busy}>{busy ? "Mengirim..." : <><Send size={15} />Kirim Quiz</>}</MotionButton>}
      </form> : <div className="empty-state">Belum ada soal dalam kategori ini.</div>)}
    </section><aside className="stack"><Reveal><section className="surface surface-pad"><span className="eyebrow">Jumlah Soal</span><div className="metric-value" style={{ marginTop: 12 }}>{questions.length}</div><p className="page-intro">Jawab setiap pertanyaan, lalu kirim untuk melihat nilai.</p></section></Reveal><Reveal><section className="surface surface-pad"><h2 className="surface-title">Tips Belajar</h2><ul className="page-intro" style={{ paddingLeft: 18, lineHeight: 2 }}><li>Pahami konsep sebelum menghafal.</li><li>Ulangi soal hingga skor stabil.</li><li>Gunakan materi kursus sebagai referensi.</li></ul></section></Reveal><MotionLink className="button button-secondary" href="/latihan"><ArrowLeft size={15} />Kembali ke kategori</MotionLink></aside></div>
  </>;
}