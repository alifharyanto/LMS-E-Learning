"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ArrowDown, ArrowRight, Brain, Check, Clock3, Flag, RotateCcw, Trophy, X } from "lucide-react";
import { apiRequest, type ApiError } from "@/lib/browser-api";
import { MotionButton, StaggerGroup, StaggerItem } from "@/components/ui/motion";

type Category = { id: number; name: string; questions_count: number; time_limit_minutes: number | null };
type Question = { id: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string };
type QuizResult = { id: number; score: number; total: number; percent: number; correct_answers?: number; incorrect_answers?: number; unanswered_answers?: number; explanations: { id: number; text: string | null; answer_index: number }[] };
type QuizAttempt = { id: number; status: "in_progress" | "submitted" | "expired"; questions: Question[]; answers: Record<string, number>; remaining_seconds: number; result: QuizResult | null };
type AnswerCheck = { correct: boolean; answer_index: number };
const QUESTION_SECONDS = 30;
const ANSWER_REVEAL_MS = 1500;

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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const submittingAttemptRef = useRef(false);
  const attemptIdRef = useRef<number | null>(null);
  const remainingSecondsRef = useRef<number | null>(null);
  const currentIndexRef = useRef(0);
  const answerProcessingRef = useRef(new Set<number>());
  const answerAdvanceTimeoutRef = useRef<number | null>(null);
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
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    answerProcessingRef.current.clear();
    if (answerAdvanceTimeoutRef.current !== null) window.clearTimeout(answerAdvanceTimeoutRef.current);
    answerAdvanceTimeoutRef.current = null;
    setFlaggedIds(new Set());
    setSkippedIds(new Set());
    setQuestionSeconds(QUESTION_SECONDS);
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
        attemptIdRef.current = null;
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
              attemptIdRef.current = attempt.id;
              setRemainingSeconds(attempt.remaining_seconds);
            } else if (attempt.result) {
              setResult(attempt.result);
            } else {
              setError("Quiz sudah selesai tetapi hasilnya belum tersedia. Silakan muat ulang halaman.");
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

  async function submitTimedQuiz(timedOut = false, submittedAnswers = answers) {
    if (submittingAttemptRef.current) return;
    submittingAttemptRef.current = true;
    setBusy(true);
    setError("");
    try {
      await saveQueueRef.current;
      let currentAttemptId = attemptIdRef.current ?? attemptId;
      let currentAttempt: QuizAttempt | null = null;

      if (currentAttemptId === null && categoryId) {
        const existing = await apiRequest<{ attempt: QuizAttempt | null }>(`/api/v1/quizzes/attempts?category_id=${encodeURIComponent(categoryId)}`);
        currentAttempt = existing.attempt;
        if (!currentAttempt) {
          const started = await apiRequest<{ attempt: QuizAttempt }>("/api/v1/quizzes/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "start", category_id: categoryId }),
          });
          currentAttempt = started.attempt;
        }
        currentAttemptId = currentAttempt.id;
        attemptIdRef.current = currentAttemptId;
      }

      if (currentAttempt && currentAttempt.status !== "in_progress") {
        if (!currentAttempt.result) throw new Error("Quiz sudah selesai, tetapi hasilnya belum tersedia. Muat ulang halaman untuk melihat hasil.");
        setResult(currentAttempt.result);
        setAttemptId(null);
        attemptIdRef.current = null;
        setRemainingSeconds(null);
        return;
      }
      if (currentAttemptId === null) throw new Error("Attempt quiz tidak tersedia. Muat ulang halaman dan coba kembali.");

      const response = await apiRequest<{ result: QuizResult | null }>("/api/v1/quizzes/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", attempt_id: currentAttemptId, answers: submittedAnswers, timed_out: timedOut }),
      });
      if (!response.result) throw new Error("Hasil quiz belum diterima. Silakan coba selesaikan kembali.");
      setResult(response.result);
      setAttemptId(null);
      attemptIdRef.current = null;
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

  useEffect(() => () => {
    if (answerAdvanceTimeoutRef.current !== null) window.clearTimeout(answerAdvanceTimeoutRef.current);
  }, []);

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
    if (answers[String(questionId)] !== undefined || skippedIds.has(questionId) || answerProcessingRef.current.size > 0) return;
    if (!categoryId) return;
    answerProcessingRef.current.add(questionId);
    const nextAnswers = { ...answers, [String(questionId)]: optionIndex };
    setAnswers(nextAnswers);
    const answeredIndex = currentIndexRef.current;
    const revealAndAdvance = (answerCheck: AnswerCheck) => {
      setAnswerChecks((previous) => ({ ...previous, [String(questionId)]: answerCheck }));
      answerAdvanceTimeoutRef.current = window.setTimeout(() => {
        answerProcessingRef.current.delete(questionId);
        answerAdvanceTimeoutRef.current = null;
        const nextIndex = answeredIndex + 1;
        if (answeredCount + skippedIds.size + 1 >= questions.length) {
          void finishQuiz(nextAnswers);
          return;
        }
        if (currentIndexRef.current !== answeredIndex || nextIndex >= questions.length) return;
        currentIndexRef.current = nextIndex;
        setQuestionSeconds(QUESTION_SECONDS);
        setCurrentIndex(nextIndex);
      }, ANSWER_REVEAL_MS);
    };
    if (attemptId === null) {
      void apiRequest<{ answer_check: AnswerCheck }>("/api/v1/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", category_id: categoryId, question_id: questionId, answer_index: optionIndex }),
      }).then(({ answer_check }) => {
        revealAndAdvance(answer_check);
      }).catch((requestError) => {
        answerProcessingRef.current.delete(questionId);
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
      if (answerCheck) revealAndAdvance(answerCheck);
      if (response.result) {
        setResult(response.result);
        setAttemptId(null);
        setRemainingSeconds(null);
      }
    }).catch((requestError) => {
      answerProcessingRef.current.delete(questionId);
      setError(requestError instanceof Error ? requestError.message : "Jawaban gagal disimpan.");
    });
  }

  async function finishQuiz(submittedAnswers = answers) {
    if (!categoryId) return;
    if (timeLimitMinutes !== null || attemptIdRef.current !== null || attemptId !== null) {
      await submitTimedQuiz(false, submittedAnswers);
      return;
    }
    if (submittingAttemptRef.current) return;
    submittingAttemptRef.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest<{ result: QuizResult }>("/api/v1/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: categoryId, answers: submittedAnswers }),
      });
      if (!response.result) throw new Error("Hasil quiz belum diterima. Silakan coba selesaikan kembali.");
      setResult(response.result);
    } catch (requestError) {
      submittingAttemptRef.current = false;
      setError(requestError instanceof Error ? requestError.message : "Quiz gagal dikirim.");
    } finally {
      setBusy(false);
    }
  }

  async function repeatQuiz() {
    if (!categoryId) return;
    setBusy(true);
    setError("");
    try {
      let nextQuestions: Question[];
      if (timeLimitMinutes !== null) {
        const response = await apiRequest<{ attempt: QuizAttempt }>("/api/v1/quizzes/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start", category_id: categoryId }),
        });
        nextQuestions = response.attempt.questions;
        setAttemptId(response.attempt.id);
        attemptIdRef.current = response.attempt.id;
        setRemainingSeconds(response.attempt.remaining_seconds);
        remainingSecondsRef.current = response.attempt.remaining_seconds;
      } else {
        const response = await apiRequest<{ questions?: Question[] }>(`/api/v1/quizzes?category_id=${encodeURIComponent(categoryId)}`);
        nextQuestions = response.questions ?? [];
        setAttemptId(null);
        attemptIdRef.current = null;
        setRemainingSeconds(null);
        remainingSecondsRef.current = null;
      }
      if (!nextQuestions.length) throw new Error("Soal untuk kategori ini belum tersedia.");
      setResult(null);
      setAnswers({});
      setAnswerChecks({});
      submittingAttemptRef.current = false;
      saveQueueRef.current = Promise.resolve();
      prepareQuestions(nextQuestions);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Quiz gagal diulangi.");
    } finally {
      setBusy(false);
    }
  }

  function jumpToFirstUnanswered() {
    if (firstUnansweredIndex < 0) return;
    currentIndexRef.current = firstUnansweredIndex;
    setCurrentIndex(firstUnansweredIndex);
  }

  function goToQuestion(index: number) {
    if (index < 0 || index >= questions.length || index === currentIndex) return;
    currentIndexRef.current = index;
    setQuestionSeconds(QUESTION_SECONDS);
    setCurrentIndex(index);
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
    const allQuestionsComplete = answeredCount + skippedIds.size + 1 >= questions.length;
    setQuestionSeconds(QUESTION_SECONDS);
    if (allQuestionsComplete) {
      void finishQuiz();
      return;
    }
    const nextIndex = Math.min(currentIndexRef.current + 1, questions.length - 1);
    currentIndexRef.current = nextIndex;
    setCurrentIndex(nextIndex);
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

  const correctCount = result?.correct_answers ?? result?.score ?? 0;
  const skippedCount = result ? result.unanswered_answers ?? Math.max(0, result.total - answeredCount) : skippedIds.size;
  const wrongCount = result ? result.incorrect_answers ?? Math.max(0, result.total - correctCount - skippedCount) : 0;
  const currentAnswerCheck = currentQuestion ? answerChecks[String(currentQuestion.id)] : undefined;
  const currentCorrectAnswerIndex = currentAnswerCheck?.answer_index;
  const liveScore = Object.values(answerChecks).filter((check) => check.correct).length;
  const questionTimerColor = questionSeconds <= 8 ? "is-low" : "";
  return <div className="quiz-page">
    <header className="page-heading quiz-page-heading"><span className="eyebrow">LATIHAN SOAL</span><h1 className="page-title">{categoryName || "Latihan"}</h1><p className="page-intro">Jawab semua soal dengan hati-hati.</p></header>
    {error && <p className="status status-error" role="alert">{error}</p>}
    {loading && <div className="empty-state" role="status">Sedang memuat soal...</div>}
    {!loading && (questions.length ? result ? <>
      <section className="quiz-result-panel" aria-labelledby="quiz-result-title">
        <div className="quiz-result-icon" aria-hidden="true"><Trophy size={24} /></div>
        <span className="quiz-kicker">LATIHAN SELESAI</span>
        <h2 id="quiz-result-title">Selamat, Anda telah Selesai!</h2>
        <p className="quiz-result-caption">{categoryName ? `Ringkasan hasil latihan ${categoryName}` : "Berikut ringkasan hasil latihan Anda."}</p>
        <div className="quiz-result-stats">
          <div className="is-correct"><span className="quiz-result-stat-icon"><Check size={17} /></span><strong>{correctCount}</strong><span>Benar</span></div>
          <div className="is-incorrect"><span className="quiz-result-stat-icon"><X size={17} /></span><strong>{wrongCount}</strong><span>Salah</span></div>
          <div className="is-unanswered"><span className="quiz-result-stat-icon"><Clock3 size={17} /></span><strong>{skippedCount}</strong><span>Tidak dijawab</span></div>
        </div>
        <div className="quiz-result-actions">
          <MotionButton type="button" className="button button-primary" onClick={() => void repeatQuiz()} disabled={busy}>
            <RotateCcw size={16} /> {busy ? "Memulai ulang..." : "Ulangi Soal"}
          </MotionButton>
        </div>
      </section>
    </> : <div className="quiz-session">
      <section className="quiz-progress-panel" aria-label="Navigasi quiz">
        <div className="quiz-progress-heading"><div><span className="list-meta">PROGRES QUIZ</span><strong>{answeredCount} dari {questions.length} soal</strong></div><div className="quiz-progress-status">{attemptId !== null && remainingSeconds !== null && <span className="quiz-timer" role="timer" aria-label={`Sisa waktu ${Math.floor(remainingSeconds / 60)} menit ${remainingSeconds % 60} detik`}><Clock3 size={15} />{String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")}</span>}<span className="quiz-progress-percent">{completion}%</span></div></div>
        <div className="quiz-progress-track" role="progressbar" aria-label="Progres jawaban" aria-valuenow={answeredCount} aria-valuemin={0} aria-valuemax={questions.length}><span style={{ width: `${completion}%` }} /></div>
        <div className="quiz-question-jump" role="list" aria-label="Status soal">{questions.map((question, index) => {
          const isAnswered = answers[String(question.id)] !== undefined;
          const isSkipped = skippedIds.has(question.id);
          if (showUnansweredOnly && (isAnswered || isSkipped)) return null;
          return <span role="listitem" key={question.id} className={`quiz-jump${isAnswered ? " is-answered" : ""}${index === currentIndex ? " is-current" : ""}${flaggedIds.has(question.id) ? " is-flagged" : ""}${isSkipped ? " is-skipped" : ""}`} aria-current={index === currentIndex ? "step" : undefined}>{index + 1}</span>;
        })}</div>
        <div className="quiz-progress-footer"><div className="quiz-legend"><span><i className="is-legend-unanswered" />Belum dijawab</span><span><i className="is-legend-answered" />Sudah dijawab</span><span><i className="is-legend-current" />Sedang dibuka</span><span><i className="is-legend-flagged" />Ditandai</span></div><label className="quiz-filter"><input type="checkbox" checked={showUnansweredOnly} onChange={(event) => setShowUnansweredOnly(event.target.checked)} />Tampilkan belum dijawab saja</label></div>
        {unansweredCount > 0 && <MotionButton type="button" className="quiz-next-unanswered" onClick={jumpToFirstUnanswered}><ArrowDown size={14} />Ke soal belum dijawab</MotionButton>}
        {busy && <p className="quiz-auto-submit-status" role="status">Quiz selesai. Sedang menyimpan hasil...</p>}
        {error && unansweredCount === 0 && !busy && <MotionButton type="button" className="button button-secondary quiz-retry-submit" onClick={() => void finishQuiz()}>Coba simpan hasil lagi</MotionButton>}
      </section>
      {currentQuestion && <section className="quiz-question-card" aria-labelledby={`quiz-question-${currentQuestion.id}`}>
        <div className="quiz-question-heading"><span>SOAL {currentIndex + 1} <span>/ {questions.length}</span></span><MotionButton type="button" className={`quiz-flag-button${flaggedIds.has(currentQuestion.id) ? " is-active" : ""}`} aria-pressed={flaggedIds.has(currentQuestion.id)} onClick={() => toggleFlag(currentQuestion.id)}><Flag size={15} />{flaggedIds.has(currentQuestion.id) ? "Ditandai" : "Tandai soal"}</MotionButton></div>
        <div className="quiz-question-metrics"><div className={`quiz-question-clock ${questionTimerColor}`} role="timer" aria-label={`${questionSeconds} detik untuk soal ini`} style={{ background: `conic-gradient(${questionSeconds <= 8 ? "var(--wrong)" : "var(--accent)"} ${questionSeconds / QUESTION_SECONDS * 360}deg, var(--border) 0deg)` }}><span>{questionSeconds}</span></div><div className="quiz-live-score"><span>SKOR</span><strong>{liveScore * 10}</strong><small>poin</small></div></div>
        <div className="quiz-question-prompt" id={`quiz-question-${currentQuestion.id}`}><p>{currentQuestion.question}</p></div>
        <div className="quiz-options" role="group" aria-label="Pilihan jawaban">{currentOptionOrder.map((originalIndex, displayIndex) => {
          const option = currentOptions[originalIndex];
          const isChosen = currentAnswer === originalIndex;
          const isCorrect = currentCorrectAnswerIndex === originalIndex;
          const isWrong = isChosen && currentCorrectAnswerIndex !== undefined && !isCorrect;
          return <MotionButton type="button" key={`${currentQuestion.id}-${originalIndex}`} className={`quiz-answer-option${isChosen ? " is-chosen" : ""}${isCorrect ? " is-correct" : ""}${isWrong ? " is-wrong" : ""}`} aria-pressed={isChosen} disabled={currentAnswer !== undefined || skippedIds.has(currentQuestion.id)} onClick={() => selectAnswer(currentQuestion.id, originalIndex)}><span className="quiz-answer-letter">{String.fromCharCode(65 + displayIndex)}</span><span>{option}</span>{isCorrect && <Check className="quiz-answer-mark" size={17} />}{isWrong && <X className="quiz-answer-mark" size={17} />}</MotionButton>;
        })}</div>
        {currentAnswerCheck && <div className="quiz-answer-feedback" role="status">{currentCorrectAnswerIndex === currentAnswer ? <strong>Benar! Jawabanmu tepat.</strong> : <><strong>Belum tepat.</strong> Jawaban benar ditandai hijau.</>}</div>}
        {skippedIds.has(currentQuestion.id) && <p className="quiz-skipped-note">Waktu soal habis. Soal ini ditandai terlewat.</p>}
      </section>}
    </div> : <div className="empty-state">Belum ada soal dalam kategori ini.</div>)}
  </div>;
}