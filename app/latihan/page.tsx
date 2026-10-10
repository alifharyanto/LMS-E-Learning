"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Brain, Check, Clock3, Flag, RotateCcw, Trophy, X } from "lucide-react";
import { apiRequest, type ApiError } from "@/lib/browser-api";
import { MotionButton, MotionLink, StaggerGroup, StaggerItem } from "@/components/ui/motion";

type Category = { id: number; name: string; questions_count: number; time_limit_minutes: number | null };
type Question = { id: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string };
type QuizResult = { score: number; total: number; percent: number; explanations: { id: number; text: string | null; answer_index: number }[] };
type QuizAttempt = { id: number; status: "in_progress" | "submitted" | "expired"; questions: Question[]; answers: Record<string, number>; remaining_seconds: number; result: QuizResult | null };
type AnswerCheck = { correct: boolean; answer_index: number };
const QUESTION_SECONDS = 30;

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export default function LatihanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("category_id");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [answerChecks, setAnswerChecks] = useState<Record<string, AnswerCheck>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [optionOrders, setOptionOrders] = useState<Record<string, number[]>>({});
  const [flaggedIds, setFlaggedIds] = useState<Set<number>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<number>>(new Set());
  const [showUnansweredOnly, setShowUnansweredOnly] = useState(false);
  const [questionSeconds, setQuestionSeconds] = useState(QUESTION_SECONDS);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const submittingAttemptRef = useRef(false);
  const remainingSecondsRef = useRef<number | null>(null);
  const [loadedCategoryId, setLoadedCategoryId] = useState<string | null | undefined>(undefined);
  const loading = loadedCategoryId !== categoryId;
  const answeredCount = questions.filter((question) => answers[String(question.id)] !== undefined).length;
  const completion = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const firstUnansweredIndex = questions.findIndex((question) => answers[String(question.id)] === undefined && !skippedIds.has(question.id));
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[String(currentQuestion.id)] : undefined;
  const currentOptions = currentQuestion ? [currentQuestion.option_a, currentQuestion.option_b, currentQuestion.option_c, currentQuestion.option_d] : [];
  const currentOptionOrder = currentQuestion ? optionOrders[String(currentQuestion.id)] ?? [0, 1, 2, 3] : [];
  const unansweredCount = questions.length - answeredCount - skippedIds.size;

  function prepareQuestions(items: Question[]) {
    const shuffledQuestions = shuffle(items);
    setQuestions(shuffledQuestions);
    setOptionOrders(Object.fromEntries(shuffledQuestions.map((question) => [String(question.id), shuffle([0, 1, 2, 3])])));
    setCurrentIndex(0);
    setFlaggedIds(new Set());
    setSkippedIds(new Set());
    setQuestionSeconds(QUESTION_SECONDS);
    setReviewing(false);
  }

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
        setAnswerChecks({});
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
        prepareQuestions(nextQuestions);
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
    if (answers[String(questionId)] !== undefined || skippedIds.has(questionId)) return;
    if (!categoryId) return;
    const nextAnswers = { ...answers, [String(questionId)]: optionIndex };
    setAnswers(nextAnswers);
    if (attemptId === null) {
      void apiRequest<{ answer_check: AnswerCheck }>("/api/v1/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", category_id: categoryId, question_id: questionId, answer_index: optionIndex }),
      }).then(({ answer_check }) => {
        setAnswerChecks((previous) => ({ ...previous, [String(questionId)]: answer_check }));
      }).catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Jawaban gagal diperiksa.");
      });
      return;
    }
    const currentAttemptId = attemptId;
    saveQueueRef.current = saveQueueRef.current.catch(() => undefined).then(async () => {
      const response = await apiRequest<{ answer_check?: AnswerCheck; result?: QuizResult }>("/api/v1/quizzes/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", attempt_id: currentAttemptId, question_id: questionId, answers: nextAnswers }),
      });
      const answerCheck = response.answer_check;
      if (answerCheck) setAnswerChecks((previous) => ({ ...previous, [String(questionId)]: answerCheck }));
      if (response.result) {
        setResult(response.result);
        setAttemptId(null);
        setRemainingSeconds(null);
      }
    }).catch((requestError) => {
      setError(requestError instanceof Error ? requestError.message : "Jawaban gagal disimpan.");
    });
  }

  async function retryQuiz() {
    setError("");
    if (!categoryId || !timeLimitMinutes) {
      setResult(null);
      setAnswers({});
      setAnswerChecks({});
      prepareQuestions(questions);
      return;
    }
    setBusy(true);
    try {
      const response = await apiRequest<{ attempt: QuizAttempt }>("/api/v1/quizzes/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", category_id: categoryId }),
      });
      prepareQuestions(response.attempt.questions);
      setAnswers(response.attempt.answers);
      setAnswerChecks({});
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
    if (firstUnansweredIndex < 0) return;
    setCurrentIndex(firstUnansweredIndex);
  }

  function goToQuestion(index: number) {
    if (index < 0 || index >= questions.length || index === currentIndex) return;
    setQuestionSeconds(QUESTION_SECONDS);
    setCurrentIndex(index);
  }

  function goNext() {
    if (currentIndex < questions.length - 1) goToQuestion(currentIndex + 1);
  }

  function toggleFlag(questionId: number) {
    setFlaggedIds((previous) => {
      const next = new Set(previous);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  const skipCurrentQuestion = useEffectEvent(() => {
    if (!currentQuestion || answers[String(currentQuestion.id)] !== undefined || skippedIds.has(currentQuestion.id)) return;
    setSkippedIds((previous) => new Set(previous).add(currentQuestion.id));
    setQuestionSeconds(QUESTION_SECONDS);
    setCurrentIndex((index) => Math.min(index + 1, questions.length - 1));
  });

  useEffect(() => {
    if (!categoryId || loading || result || !currentQuestion || currentAnswer !== undefined || skippedIds.has(currentQuestion.id)) return;
    let seconds = QUESTION_SECONDS;
    const interval = window.setInterval(() => {
      seconds -= 1;
      setQuestionSeconds(seconds);
      if (seconds <= 0) {
        window.clearInterval(interval);
        skipCurrentQuestion();
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [categoryId, currentAnswer, currentIndex, currentQuestion, loading, result, skippedIds]);

  const handleQuizKeydown = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToQuestion(currentIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goToQuestion(currentIndex + 1);
    } else {
      const key = event.key.toLowerCase();
      const displayIndex = /^[1-4]$/.test(key) ? Number(key) - 1 : ["a", "b", "c", "d"].indexOf(key);
      if (displayIndex >= 0 && displayIndex < 4 && currentQuestion) {
        const originalIndex = currentOptionOrder[displayIndex];
        if (originalIndex !== undefined) selectAnswer(currentQuestion.id, originalIndex);
      }
    }
  });

  useEffect(() => {
    if (!categoryId || loading || result) return;
    window.addEventListener("keydown", handleQuizKeydown);
    return () => window.removeEventListener("keydown", handleQuizKeydown);
  }, [categoryId, loading, result]);

  if (!categoryId) return <div className="quiz-page">
    <header className="page-heading quiz-page-heading"><span className="eyebrow">LATIHAN SOAL</span><h1 className="page-title">Pilih Kategori Latihan</h1><p className="page-intro">Pilih kategori untuk memulai quiz.</p></header>
    {error && <p className="status status-error" role="alert">{error}</p>}
    {loading && <div className="empty-state" role="status">Sedang memuat data latihan...</div>}
    {!loading && (categories.length ? <StaggerGroup className="grid-three quiz-categories" aria-label="Pilih kategori quiz">{categories.map((category) => <StaggerItem className="quiz-category-item" key={category.id}><MotionButton type="button" className="surface surface-pad quiz-category" onClick={() => router.push(`/latihan?category_id=${category.id}`)}><span className="list-meta"><Brain size={14} /> KATEGORI</span><h2 className="surface-title">{category.name}</h2><p className="page-intro">Total soal: <strong>{category.questions_count}</strong></p><span className="link-inline">Mulai latihan <ArrowRight className="quiz-arrow" size={15} /></span></MotionButton></StaggerItem>)}</StaggerGroup> : <div className="empty-state">{error || "Belum ada kategori quiz. Silakan hubungi admin."}</div>)}
  </div>;

  const correctCount = result?.score ?? 0;
  const skippedCount = result ? Math.max(0, result.total - answeredCount) : skippedIds.size;
  const wrongCount = result ? Math.max(0, result.total - correctCount - skippedCount) : 0;
  const currentExplanation = currentQuestion ? result?.explanations.find((item) => item.id === currentQuestion.id) : undefined;
  const currentAnswerCheck = currentQuestion ? answerChecks[String(currentQuestion.id)] : undefined;
  const currentCorrectAnswerIndex = currentExplanation?.answer_index ?? currentAnswerCheck?.answer_index;
  const liveScore = result?.score ?? Object.values(answerChecks).filter((check) => check.correct).length;
  const questionTimerColor = questionSeconds <= 8 ? "is-low" : "";

  return <div className="quiz-page">
    <header className="page-heading quiz-page-heading"><span className="eyebrow">LATIHAN SOAL</span><h1 className="page-title">{categoryName || "Latihan"}</h1><p className="page-intro">Jawab semua soal dengan hati-hati.</p></header>
    {error && <p className="status status-error" role="alert">{error}</p>}
    {loading && <div className="empty-state" role="status">Sedang memuat soal...</div>}
    {!loading && (questions.length ? result && !reviewing ? <section className="quiz-result-panel" aria-labelledby="quiz-result-title"><span className="quiz-kicker"><Trophy size={15} /> HASIL LATIHAN</span><h2 id="quiz-result-title">Latihan selesai!</h2><p>Hasil latihan {categoryName} sudah tersimpan.</p><div className="quiz-result-score"><strong>{result.percent}%</strong><span>Skor akhir · {result.score * 10} dari {result.total * 10} poin ({result.score} benar)</span></div><div className="quiz-result-stats"><div><Check size={17} /><strong>{correctCount}</strong><span>Benar</span></div><div><X size={17} /><strong>{wrongCount}</strong><span>Salah</span></div><div><Clock3 size={17} /><strong>{skippedCount}</strong><span>Terlewat</span></div></div><div className="quiz-result-actions"><MotionButton type="button" className="button button-primary" onClick={() => void retryQuiz()} disabled={busy}><RotateCcw size={15} />Ulangi Latihan</MotionButton><MotionButton type="button" className="button button-secondary" onClick={() => { setReviewing(true); setCurrentIndex(0); }}>Review Jawaban</MotionButton><MotionLink className="button button-secondary" href="/latihan"><ArrowLeft size={15} />Kategori</MotionLink></div></section> : <form className="quiz-session" onSubmit={(event) => void submitQuiz(event)}>
      <section className="quiz-progress-panel" aria-label="Navigasi quiz">
        <div className="quiz-progress-heading"><div><span className="list-meta">PROGRES QUIZ</span><strong>{answeredCount} dari {questions.length} soal</strong></div><div className="quiz-progress-status">{attemptId !== null && remainingSeconds !== null && <span className="quiz-timer" role="timer" aria-label={`Sisa waktu ${Math.floor(remainingSeconds / 60)} menit ${remainingSeconds % 60} detik`}><Clock3 size={15} />{String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")}</span>}<span className="quiz-progress-percent">{completion}%</span></div></div>
        <div className="quiz-progress-track" role="progressbar" aria-label="Progres jawaban" aria-valuenow={answeredCount} aria-valuemin={0} aria-valuemax={questions.length}><span style={{ width: `${completion}%` }} /></div>
        <div className="quiz-question-jump" aria-label="Navigasi soal">{questions.map((question, index) => {
          const isAnswered = answers[String(question.id)] !== undefined;
          const isSkipped = skippedIds.has(question.id);
          if (showUnansweredOnly && (isAnswered || isSkipped)) return null;
          return <MotionButton type="button" key={question.id} className={`quiz-jump${isAnswered ? " is-answered" : ""}${index === currentIndex ? " is-current" : ""}${flaggedIds.has(question.id) ? " is-flagged" : ""}${isSkipped ? " is-skipped" : ""}`} aria-current={index === currentIndex ? "step" : undefined} aria-label={`Lompat ke soal ${index + 1}${isAnswered ? ", sudah dijawab" : isSkipped ? ", terlewat" : ", belum dijawab"}${flaggedIds.has(question.id) ? ", ditandai" : ""}`} onClick={() => goToQuestion(index)}>{index + 1}</MotionButton>;
        })}</div>
        <div className="quiz-progress-footer"><div className="quiz-legend"><span><i className="is-legend-unanswered" />Belum dijawab</span><span><i className="is-legend-answered" />Sudah dijawab</span><span><i className="is-legend-current" />Sedang dibuka</span><span><i className="is-legend-flagged" />Ditandai</span></div><label className="quiz-filter"><input type="checkbox" checked={showUnansweredOnly} onChange={(event) => setShowUnansweredOnly(event.target.checked)} />Tampilkan belum dijawab saja</label></div>
        {unansweredCount > 0 && <MotionButton type="button" className="quiz-next-unanswered" onClick={jumpToFirstUnanswered}><ArrowDown size={14} />Ke soal belum dijawab</MotionButton>}
      </section>
      {currentQuestion && <section className="quiz-question-card" aria-labelledby={`quiz-question-${currentQuestion.id}`}>
        <div className="quiz-question-heading"><span>SOAL {currentIndex + 1} <span>/ {questions.length}</span></span><MotionButton type="button" className={`quiz-flag-button${flaggedIds.has(currentQuestion.id) ? " is-active" : ""}`} aria-pressed={flaggedIds.has(currentQuestion.id)} onClick={() => toggleFlag(currentQuestion.id)}><Flag size={15} />{flaggedIds.has(currentQuestion.id) ? "Ditandai" : "Tandai soal"}</MotionButton></div>
        <div className="quiz-question-metrics"><div className={`quiz-question-clock ${questionTimerColor}`} role="timer" aria-label={`${questionSeconds} detik untuk soal ini`} style={{ background: `conic-gradient(${questionSeconds <= 8 ? "var(--wrong)" : "var(--accent)"} ${questionSeconds / QUESTION_SECONDS * 360}deg, var(--border) 0deg)` }}><span>{questionSeconds}</span></div><div className="quiz-live-score"><span>SKOR</span><strong>{result ? result.score * 10 : liveScore * 10}</strong><small>{result ? `dari ${result.total * 10} poin` : "poin"}</small></div></div>
        <div className="quiz-question-prompt" id={`quiz-question-${currentQuestion.id}`}><p>{currentQuestion.question}</p></div>
        <div className="quiz-options" role="group" aria-label="Pilihan jawaban">{currentOptionOrder.map((originalIndex, displayIndex) => {
          const option = currentOptions[originalIndex];
          const isChosen = currentAnswer === originalIndex;
          const isCorrect = currentCorrectAnswerIndex === originalIndex;
          const isWrong = isChosen && currentCorrectAnswerIndex !== undefined && !isCorrect;
          return <MotionButton type="button" key={`${currentQuestion.id}-${originalIndex}`} className={`quiz-answer-option${isChosen ? " is-chosen" : ""}${isCorrect ? " is-correct" : ""}${isWrong ? " is-wrong" : ""}`} aria-pressed={isChosen} disabled={currentAnswer !== undefined || skippedIds.has(currentQuestion.id) || result !== null} onClick={() => selectAnswer(currentQuestion.id, originalIndex)}><span className="quiz-answer-letter">{String.fromCharCode(65 + displayIndex)}</span><span>{option}</span>{isCorrect && <Check className="quiz-answer-mark" size={17} />}{isWrong && <X className="quiz-answer-mark" size={17} />}</MotionButton>;
        })}</div>
        {(result && currentExplanation || currentAnswerCheck) && <div className="quiz-answer-feedback" role="status">{currentAnswer === undefined ? <><strong>Soal ini terlewat.</strong> Jawaban benar ditandai hijau.</> : currentCorrectAnswerIndex === currentAnswer ? <strong>Benar! Jawabanmu tepat.</strong> : <><strong>Belum tepat.</strong> Jawaban benar ditandai hijau.</>}{currentExplanation?.text && <p>{currentExplanation.text}</p>}</div>}
        {skippedIds.has(currentQuestion.id) && !result && <p className="quiz-skipped-note">Waktu soal habis. Soal ini ditandai terlewat.</p>}
        <div className="quiz-question-navigation"><MotionButton type="button" className="button button-secondary" disabled={currentIndex === 0} onClick={() => goToQuestion(currentIndex - 1)}><ArrowLeft size={15} />Sebelumnya</MotionButton>{result ? <MotionButton type="button" className="button button-primary" disabled={currentIndex === questions.length - 1} onClick={() => goToQuestion(currentIndex + 1)}>Berikutnya<ArrowRight size={15} /></MotionButton> : <MotionButton type={currentIndex === questions.length - 1 ? "submit" : "button"} className="button button-primary" disabled={busy} onClick={currentIndex === questions.length - 1 ? undefined : goNext}>{currentIndex === questions.length - 1 ? busy ? "Menyimpan..." : "Selesai" : <>Selanjutnya<ArrowRight size={15} /></>}</MotionButton>}</div>
      </section>}
      {reviewing && <MotionButton type="button" className="button button-secondary" onClick={() => setReviewing(false)}>Tutup review</MotionButton>}
    </form> : <div className="empty-state">Belum ada soal dalam kategori ini.</div>)}
  </div>;
}