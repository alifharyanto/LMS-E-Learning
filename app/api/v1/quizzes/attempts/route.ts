import type { RowDataPacket } from "mysql2/promise";
import { getRequestUser } from "@/lib/auth";
import { execute, queryRows, transaction } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SnapshotQuestion = {
  id: number;
  question: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  answer_index: number | null;
  explanation: string | null;
  question_type?: "pilihan" | "essay";
};

type AttemptRow = RowDataPacket & {
  id: number;
  user_id: number;
  category_id: number;
  time_limit_minutes: number;
  questions_snapshot: unknown;
  answers: unknown;
  status: "in_progress" | "submitted" | "expired";
  result_id: number | null;
  remaining_seconds: number;
};

type QuizResult = {
  id: number;
  score: number;
  total: number;
  percent: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered_answers: number;
  explanations: { id: number; text: string | null; answer_index: number | null }[];
};

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return (value as T) ?? fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function publicQuestions(snapshot: SnapshotQuestion[], fallbackType: "pilihan" | "essay" = "pilihan") {
  return snapshot.map((question) => ({
    id: question.id,
    question: question.question,
    option_a: question.option_a,
    option_b: question.option_b,
    option_c: question.option_c,
    option_d: question.option_d,
    question_type: question.question_type ?? fallbackType,
  }));
}

function normalizeSnapshot(snapshot: SnapshotQuestion[], fallbackType: "pilihan" | "essay") {
  return snapshot.map((question) => ({ ...question, question_type: fallbackType }));
}

function parseAnswers(value: unknown, snapshot: SnapshotQuestion[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const questions = new Map(snapshot.map((question) => [String(question.id), question]));
  const answers: Record<string, number | string> = {};
  for (const [questionId, submittedAnswer] of Object.entries(value)) {
    const question = questions.get(questionId);
    if (!question) return null;
    if (question.question_type === "essay") {
      if (typeof submittedAnswer !== "string" || submittedAnswer.length > 20_000) return null;
      answers[questionId] = submittedAnswer;
    } else {
      if (!Number.isInteger(submittedAnswer) || Number(submittedAnswer) < 0 || Number(submittedAnswer) > 3) return null;
      answers[questionId] = Number(submittedAnswer);
    }
  }
  return answers;
}

async function getResult(resultId: number, snapshot: SnapshotQuestion[]): Promise<QuizResult | null> {
  const rows = await queryRows<(RowDataPacket & { id: number; score: number; total: number; percent: number; unanswered_answers: number })[]>(
    "SELECT id, score, total, percent, unanswered_answers FROM quiz_results WHERE id = ? LIMIT 1",
    [resultId],
  );
  const row = rows[0];
  if (!row) return null;
  const answerRows = await queryRows<(RowDataPacket & { is_correct: number | null })[]>(
    "SELECT is_correct FROM quiz_question_attempts WHERE result_id = ?",
    [resultId],
  );
  return {
    id: Number(row.id),
    score: Number(row.score),
    total: Number(row.total),
    percent: Number(row.percent),
    correct_answers: Number(row.score),
    incorrect_answers: answerRows.filter((answer) => answer.is_correct !== null && Number(answer.is_correct) === 0).length,
    unanswered_answers: Number(row.unanswered_answers),
    explanations: snapshot.map((question) => ({ id: question.id, text: question.explanation, answer_index: question.answer_index })),
  };
}

async function completeAttempt(attemptId: number, userId: number, submittedAnswers: unknown) {
  return transaction(async (connection) => {
    const [attemptRows] = await connection.execute<AttemptRow[]>(
      "SELECT id, user_id, category_id, time_limit_minutes, questions_snapshot, answers, status, result_id, GREATEST(TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at), 0) AS remaining_seconds FROM quiz_attempts WHERE id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
      [attemptId, userId],
    );
    const attempt = attemptRows[0];
    if (!attempt) return { error: "Attempt quiz tidak ditemukan.", status: 404 as const };

    const rawSnapshot = parseJson<SnapshotQuestion[]>(attempt.questions_snapshot, []);
    const [categoryRows] = await connection.execute<(RowDataPacket & { question_type: string | null })[]>(
      "SELECT question_type FROM quiz_categories WHERE id = ? LIMIT 1",
      [attempt.category_id],
    );
    const fallbackType = categoryRows[0]?.question_type === "essay" ? "essay" : "pilihan";
    const snapshot = normalizeSnapshot(rawSnapshot, fallbackType);
    if (!snapshot.length) {
      return { error: "Data soal attempt tidak tersedia.", status: 422 as const };
    }

    const savedAnswers = parseAnswers(parseJson<unknown>(attempt.answers, {}), snapshot);
    if (!savedAnswers) return { error: "Data jawaban attempt tidak valid.", status: 422 as const };

    if (attempt.status !== "in_progress" && attempt.result_id) {
      const existingResult = await getResult(attempt.result_id, snapshot);
      if (existingResult) return { result: existingResult, status: 200 as const };
    }

    let answers = savedAnswers;
    let expired = attempt.status === "expired";
    if (attempt.status === "in_progress") {
      const [clockRows] = await connection.execute<(RowDataPacket & { expired: number })[]>(
        "SELECT expires_at <= UTC_TIMESTAMP() AS expired FROM quiz_attempts WHERE id = ?",
        [attemptId],
      );
      expired = Boolean(clockRows[0]?.expired);
      const incomingAnswers = expired ? null : parseAnswers(submittedAnswers, snapshot);
      if (!expired && incomingAnswers === null) return { error: "Jawaban quiz tidak valid.", status: 422 as const };
      answers = incomingAnswers === null ? savedAnswers : { ...savedAnswers, ...incomingAnswers };
    }

    const score = snapshot.reduce((total, question) => total + (question.question_type !== "essay" && answers[String(question.id)] === question.answer_index ? 1 : 0), 0);
    const total = snapshot.length;
    const percent = total ? Math.floor((score / total) * 100) : 0;
    const answeredQuestions = snapshot.filter((question) => {
      const answer = answers[String(question.id)];
      return typeof answer === "number" || (typeof answer === "string" && answer.trim().length > 0);
    });
    const [result] = await connection.execute(
      "INSERT INTO quiz_results (user_id, category_id, score, total, percent, correct_answers, unanswered_answers, questions_snapshot, answers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, attempt.category_id, score, total, percent, score, total - answeredQuestions.length, JSON.stringify(snapshot), JSON.stringify(answers)],
    );
    const resultId = Number((result as { insertId: number }).insertId);
    if (answeredQuestions.length) {
      const placeholders = answeredQuestions.map(() => "(?, ?, ?, ?)").join(", ");
      const values = answeredQuestions.flatMap((question) => [
        resultId,
        question.id,
        question.question_type === "essay" ? null : answers[String(question.id)],
        question.question_type === "essay" ? null : answers[String(question.id)] === question.answer_index ? 1 : 0,
      ]);
      await connection.execute(
        `INSERT INTO quiz_question_attempts (result_id, question_id, selected_index, is_correct) VALUES ${placeholders}`,
        values,
      );
    }
    await connection.execute(
      "UPDATE quiz_attempts SET answers = ?, status = ?, submitted_at = COALESCE(submitted_at, UTC_TIMESTAMP()), result_id = ? WHERE id = ?",
      [JSON.stringify(answers), expired || attempt.status === "expired" ? "expired" : "submitted", resultId, attemptId],
    );

    return {
      result: {
        id: resultId,
        score,
        total,
        percent,
        correct_answers: score,
        incorrect_answers: answeredQuestions.filter((question) => question.question_type !== "essay").length - score,
        unanswered_answers: total - answeredQuestions.length,
        explanations: snapshot.map((question) => ({ id: question.id, text: question.explanation, answer_index: question.answer_index })),
      } satisfies QuizResult,
      status: 200 as const,
    };
  });
}

async function findAttempt(userId: number, categoryId: number) {
  let rows = await queryRows<AttemptRow[]>(
    "SELECT id, user_id, category_id, time_limit_minutes, questions_snapshot, answers, status, result_id, GREATEST(TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at), 0) AS remaining_seconds FROM quiz_attempts WHERE user_id = ? AND category_id = ? AND status = 'in_progress' ORDER BY id DESC LIMIT 1",
    [userId, categoryId],
  );
  let attempt = rows[0];
  if (attempt?.status === "in_progress" && Number(attempt.remaining_seconds) <= 0) {
    await completeAttempt(Number(attempt.id), userId, {});
    const refreshed = await queryRows<AttemptRow[]>(
      "SELECT id, user_id, category_id, time_limit_minutes, questions_snapshot, answers, status, result_id, GREATEST(TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at), 0) AS remaining_seconds FROM quiz_attempts WHERE id = ? AND user_id = ? LIMIT 1",
      [attempt.id, userId],
    );
    attempt = refreshed[0];
  }
  if (!attempt) {
    const categories = await queryRows<(RowDataPacket & { time_limit_minutes: number | null })[]>(
      "SELECT time_limit_minutes FROM quiz_categories WHERE id = ? LIMIT 1",
      [categoryId],
    );
    if (Number(categories[0]?.time_limit_minutes) > 0) {
      rows = await queryRows<AttemptRow[]>(
        "SELECT id, user_id, category_id, time_limit_minutes, questions_snapshot, answers, status, result_id, 0 AS remaining_seconds FROM quiz_attempts WHERE user_id = ? AND category_id = ? AND status <> 'in_progress' ORDER BY id DESC LIMIT 1",
        [userId, categoryId],
      );
      attempt = rows[0];
    }
  }
  if (!attempt) return null;

  const rawSnapshot = parseJson<SnapshotQuestion[]>(attempt.questions_snapshot, []);
  const categories = await queryRows<(RowDataPacket & { question_type: string | null })[]>(
    "SELECT question_type FROM quiz_categories WHERE id = ? LIMIT 1",
    [categoryId],
  );
  const fallbackType = categories[0]?.question_type === "essay" ? "essay" : "pilihan";
  const snapshot = normalizeSnapshot(rawSnapshot, fallbackType);
  const answers = parseJson<Record<string, number | string>>(attempt.answers, {});
  let result: QuizResult | null = null;
  if (attempt.status !== "in_progress") {
    const completed = await completeAttempt(Number(attempt.id), userId, {});
    if ("error" in completed) throw new Error(completed.error);
    result = completed.result;
  } else if (attempt.result_id) {
    result = await getResult(Number(attempt.result_id), snapshot);
  }
  return {
    id: Number(attempt.id),
    status: attempt.status,
    questions: publicQuestions(snapshot, fallbackType),
    answers,
    remaining_seconds: Number(attempt.remaining_seconds),
    result,
  };
}

async function findAttemptById(attemptId: number, userId: number) {
  const rows = await queryRows<AttemptRow[]>(
    "SELECT id, user_id, category_id, time_limit_minutes, questions_snapshot, answers, status, result_id, GREATEST(TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at), 0) AS remaining_seconds FROM quiz_attempts WHERE id = ? AND user_id = ? LIMIT 1",
    [attemptId, userId],
  );
  const attempt = rows[0];
  if (!attempt) return null;
  const rawSnapshot = parseJson<SnapshotQuestion[]>(attempt.questions_snapshot, []);
  const categories = await queryRows<(RowDataPacket & { question_type: string | null })[]>(
    "SELECT question_type FROM quiz_categories WHERE id = ? LIMIT 1",
    [attempt.category_id],
  );
  const fallbackType = categories[0]?.question_type === "essay" ? "essay" : "pilihan";
  const snapshot = normalizeSnapshot(rawSnapshot, fallbackType);
  return {
    id: Number(attempt.id),
    status: attempt.status,
    questions: publicQuestions(snapshot, fallbackType),
    answers: parseJson<Record<string, number | string>>(attempt.answers, {}),
    remaining_seconds: Number(attempt.remaining_seconds),
    result: null,
  };
}

async function roleGuard(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  return { user };
}

export async function GET(request: Request) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;
    const categoryId = parseId(new URL(request.url).searchParams.get("category_id") ?? "");
    if (!categoryId) return json({ error: "Kategori quiz tidak valid." }, 422);
    return json({ attempt: await findAttempt(guard.user.id, categoryId) });
  } catch (error) {
    console.error("Quiz attempt read error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;
    const body = await readJson(request);
    if (!body) return json({ error: "Permintaan quiz tidak valid." }, 422);

    if (body.action === "start") {
      const categoryId = parseId(String(body.category_id ?? ""));
      if (!categoryId) return json({ error: "Kategori quiz tidak valid." }, 422);
      const existing = await findAttempt(guard.user.id, categoryId);
      if (existing?.status === "in_progress") return json({ attempt: existing });

      const started = await transaction(async (connection) => {
        const [categories] = await connection.execute<(RowDataPacket & { id: number; time_limit_minutes: number | null; question_type: string | null })[]>(
          "SELECT id, time_limit_minutes, question_type FROM quiz_categories WHERE id = ? LIMIT 1 FOR UPDATE",
          [categoryId],
        );
        if (!categories[0]) return { error: "Kategori quiz tidak ditemukan.", status: 404 as const };

        const [activeRows] = await connection.execute<(RowDataPacket & { id: number })[]>(
          "SELECT id FROM quiz_attempts WHERE user_id = ? AND category_id = ? AND status = 'in_progress' AND expires_at > UTC_TIMESTAMP() ORDER BY id DESC LIMIT 1 FOR UPDATE",
          [guard.user.id, categoryId],
        );
        if (activeRows[0]) return { id: Number(activeRows[0].id), created: false };

        const timeLimit = Number(categories[0].time_limit_minutes);
        if (!Number.isInteger(timeLimit) || timeLimit < 1) return { error: "Timer belum diatur untuk kategori ini.", status: 422 as const };
        const [questions] = await connection.execute<(RowDataPacket & SnapshotQuestion)[]>(
          "SELECT id, question, option_a, option_b, option_c, option_d, answer_index, explanation, question_type FROM quiz_questions WHERE category_id = ? ORDER BY id",
          [categoryId],
        );
        if (!questions.length) return { error: "Kategori ini belum memiliki soal.", status: 422 as const };
        const snapshot = questions.map((question) => ({
          id: Number(question.id),
          question: question.question,
          option_a: question.option_a,
          option_b: question.option_b,
          option_c: question.option_c,
          option_d: question.option_d,
          answer_index: question.answer_index === null ? null : Number(question.answer_index),
          explanation: question.explanation,
          question_type: categories[0].question_type === "essay" ? "essay" : "pilihan",
        }));
        const [insertResult] = await connection.execute(
          "INSERT INTO quiz_attempts (user_id, category_id, time_limit_minutes, questions_snapshot, answers, expires_at) VALUES (?, ?, ?, ?, ?, TIMESTAMPADD(MINUTE, ?, UTC_TIMESTAMP()))",
          [guard.user.id, categoryId, timeLimit, JSON.stringify(snapshot), "{}", timeLimit],
        );
        return { id: Number((insertResult as { insertId: number }).insertId), created: true };
      });
      if ("error" in started) return json({ error: started.error }, started.status);
      return json({ attempt: await findAttemptById(started.id, guard.user.id) }, started.created ? 201 : 200);
    }

    const attemptId = parseId(String(body.attempt_id ?? ""));
    if (!attemptId) return json({ error: "Attempt quiz tidak valid." }, 422);

    if (body.action === "save") {
      const attempts = await queryRows<AttemptRow[]>(
        "SELECT id, user_id, category_id, time_limit_minutes, questions_snapshot, answers, status, result_id, GREATEST(TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at), 0) AS remaining_seconds FROM quiz_attempts WHERE id = ? AND user_id = ? LIMIT 1",
        [attemptId, guard.user.id],
      );
      const attempt = attempts[0];
      if (!attempt) return json({ error: "Attempt quiz tidak ditemukan." }, 404);
      if (attempt.status !== "in_progress" || Number(attempt.remaining_seconds) <= 0) {
        const completed = await completeAttempt(attemptId, guard.user.id, {});
        return json({ expired: true, result: completed.result }, completed.status);
      }
      const snapshot = parseJson<SnapshotQuestion[]>(attempt.questions_snapshot, []);
      const answers = parseAnswers(body.answers, snapshot);
      if (!answers) return json({ error: "Jawaban quiz tidak valid." }, 422);
      const questionId = parseId(String(body.question_id ?? ""));
      const question = snapshot.find((item) => item.id === questionId);
      if (!question || answers[String(question.id)] === undefined) return json({ error: "Jawaban quiz tidak valid." }, 422);
      const update = await execute(
        "UPDATE quiz_attempts SET answers = ? WHERE id = ? AND user_id = ? AND status = 'in_progress' AND expires_at > UTC_TIMESTAMP()",
        [JSON.stringify(answers), attemptId, guard.user.id],
      );
      if (!update.affectedRows) {
        const completed = await completeAttempt(attemptId, guard.user.id, {});
        return json({ expired: true, result: completed.result }, completed.status);
      }
      return question.question_type === "essay"
        ? json({ success: true })
        : json({ success: true, answer_check: { correct: answers[String(question.id)] === question.answer_index, answer_index: question.answer_index } });
    }

    if (body.action === "submit") {
      if (body.timed_out === true) {
        const attempts = await queryRows<(RowDataPacket & { expired: number; remaining_seconds: number })[]>(
          "SELECT expires_at <= UTC_TIMESTAMP() AS expired, GREATEST(TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at), 0) AS remaining_seconds FROM quiz_attempts WHERE id = ? AND user_id = ? LIMIT 1",
          [attemptId, guard.user.id],
        );
        if (!attempts[0]) return json({ error: "Attempt quiz tidak ditemukan." }, 404);
        if (!attempts[0].expired) return json({ error: "Waktu quiz masih berjalan." , remaining_seconds: Math.max(1, Number(attempts[0].remaining_seconds)) }, 409);
      }
      const completed = await completeAttempt(attemptId, guard.user.id, body.answers);
      if ("error" in completed) return json({ error: completed.error }, completed.status);
      return json({ success: true, result: completed.result });
    }

    return json({ error: "Aksi quiz tidak dikenal." }, 422);
  } catch (error) {
    console.error("Quiz attempt mutation error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}