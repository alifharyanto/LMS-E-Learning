import type { RowDataPacket } from "mysql2/promise";
import { getRequestUser } from "@/lib/auth";
import { execute, queryRows, transaction } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SnapshotQuestion = {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer_index: number;
  explanation: string | null;
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
  explanations: { id: number; text: string | null }[];
};

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return (value as T) ?? fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function publicQuestions(snapshot: SnapshotQuestion[]) {
  return snapshot.map((question) => ({
    id: question.id,
    question: question.question,
    option_a: question.option_a,
    option_b: question.option_b,
    option_c: question.option_c,
    option_d: question.option_d,
  }));
}

function parseAnswers(value: unknown, snapshot: SnapshotQuestion[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const validIds = new Set(snapshot.map((question) => String(question.id)));
  const answers: Record<string, number> = {};
  for (const [questionId, selectedIndex] of Object.entries(value)) {
    if (!validIds.has(questionId) || !Number.isInteger(selectedIndex) || Number(selectedIndex) < 0 || Number(selectedIndex) > 3) return null;
    answers[questionId] = Number(selectedIndex);
  }
  return answers;
}

async function getResult(resultId: number, snapshot: SnapshotQuestion[]): Promise<QuizResult | null> {
  const rows = await queryRows<(RowDataPacket & { id: number; score: number; total: number; percent: number })[]>(
    "SELECT id, score, total, percent FROM quiz_results WHERE id = ? LIMIT 1",
    [resultId],
  );
  const row = rows[0];
  return row ? {
    id: Number(row.id),
    score: Number(row.score),
    total: Number(row.total),
    percent: Number(row.percent),
    explanations: snapshot.map((question) => ({ id: question.id, text: question.explanation })),
  } : null;
}

async function completeAttempt(attemptId: number, userId: number, submittedAnswers: unknown) {
  return transaction(async (connection) => {
    const [attemptRows] = await connection.execute<AttemptRow[]>(
      "SELECT *, GREATEST(TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at), 0) AS remaining_seconds FROM quiz_attempts WHERE id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
      [attemptId, userId],
    );
    const attempt = attemptRows[0];
    if (!attempt) return { error: "Attempt quiz tidak ditemukan.", status: 404 as const };

    const snapshot = parseJson<SnapshotQuestion[]>(attempt.questions_snapshot, []);
    if (attempt.status !== "in_progress") {
      return { result: attempt.result_id ? await getResult(attempt.result_id, snapshot) : null, status: 200 as const };
    }

    const [clockRows] = await connection.execute<(RowDataPacket & { expired: number })[]>(
      "SELECT expires_at <= UTC_TIMESTAMP() AS expired FROM quiz_attempts WHERE id = ?",
      [attemptId],
    );
    const expired = Boolean(clockRows[0]?.expired);
    const savedAnswers = parseJson<Record<string, number>>(attempt.answers, {});
    const incomingAnswers = expired ? {} : parseAnswers(submittedAnswers, snapshot);
    if (!expired && incomingAnswers === null) return { error: "Jawaban quiz tidak valid.", status: 422 as const };
    const answers = incomingAnswers === null ? savedAnswers : { ...savedAnswers, ...incomingAnswers };
    const score = snapshot.reduce((total, question) => total + (answers[String(question.id)] === question.answer_index ? 1 : 0), 0);
    const total = snapshot.length;
    const percent = total ? Math.floor((score / total) * 100) : 0;
    const [result] = await connection.execute(
      "INSERT INTO quiz_results (user_id, category_id, score, total, percent, correct_answers) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, attempt.category_id, score, total, percent, score],
    );
    const resultId = Number((result as { insertId: number }).insertId);
    await connection.execute(
      "UPDATE quiz_attempts SET answers = ?, status = ?, submitted_at = UTC_TIMESTAMP(), result_id = ? WHERE id = ? AND status = 'in_progress'",
      [JSON.stringify(answers), expired ? "expired" : "submitted", resultId, attemptId],
    );

    return {
      result: {
        id: resultId,
        score,
        total,
        percent,
        explanations: snapshot.map((question) => ({ id: question.id, text: question.explanation })),
      } satisfies QuizResult,
      status: 200 as const,
    };
  });
}

async function findAttempt(userId: number, categoryId: number) {
  let rows = await queryRows<AttemptRow[]>(
    "SELECT *, GREATEST(TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at), 0) AS remaining_seconds FROM quiz_attempts WHERE user_id = ? AND category_id = ? AND status = 'in_progress' ORDER BY id DESC LIMIT 1",
    [userId, categoryId],
  );
  let attempt = rows[0];
  if (attempt?.status === "in_progress" && Number(attempt.remaining_seconds) <= 0) {
    await completeAttempt(Number(attempt.id), userId, {});
    const refreshed = await queryRows<AttemptRow[]>(
      "SELECT *, GREATEST(TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at), 0) AS remaining_seconds FROM quiz_attempts WHERE id = ? AND user_id = ? LIMIT 1",
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
        "SELECT *, 0 AS remaining_seconds FROM quiz_attempts WHERE user_id = ? AND category_id = ? AND status <> 'in_progress' ORDER BY id DESC LIMIT 1",
        [userId, categoryId],
      );
      attempt = rows[0];
    }
  }
  if (!attempt) return null;

  const snapshot = parseJson<SnapshotQuestion[]>(attempt.questions_snapshot, []);
  const result = attempt.result_id ? await getResult(Number(attempt.result_id), snapshot) : null;
  return {
    id: Number(attempt.id),
    status: attempt.status,
    questions: publicQuestions(snapshot),
    answers: parseJson<Record<string, number>>(attempt.answers, {}),
    remaining_seconds: Number(attempt.remaining_seconds),
    result,
  };
}

async function findAttemptById(attemptId: number, userId: number) {
  const rows = await queryRows<AttemptRow[]>(
    "SELECT *, GREATEST(TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at), 0) AS remaining_seconds FROM quiz_attempts WHERE id = ? AND user_id = ? LIMIT 1",
    [attemptId, userId],
  );
  const attempt = rows[0];
  if (!attempt) return null;
  const snapshot = parseJson<SnapshotQuestion[]>(attempt.questions_snapshot, []);
  return {
    id: Number(attempt.id),
    status: attempt.status,
    questions: publicQuestions(snapshot),
    answers: parseJson<Record<string, number>>(attempt.answers, {}),
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
        const [categories] = await connection.execute<(RowDataPacket & { id: number; time_limit_minutes: number | null })[]>(
          "SELECT id, time_limit_minutes FROM quiz_categories WHERE id = ? LIMIT 1 FOR UPDATE",
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
          "SELECT id, question, option_a, option_b, option_c, option_d, answer_index, explanation FROM quiz_questions WHERE category_id = ? ORDER BY id",
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
          answer_index: Number(question.answer_index),
          explanation: question.explanation,
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
        "SELECT *, GREATEST(TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at), 0) AS remaining_seconds FROM quiz_attempts WHERE id = ? AND user_id = ? LIMIT 1",
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
      const update = await execute(
        "UPDATE quiz_attempts SET answers = ? WHERE id = ? AND user_id = ? AND status = 'in_progress' AND expires_at > UTC_TIMESTAMP()",
        [JSON.stringify(answers), attemptId, guard.user.id],
      );
      if (!update.affectedRows) {
        const completed = await completeAttempt(attemptId, guard.user.id, {});
        return json({ expired: true, result: completed.result }, completed.status);
      }
      return json({ success: true });
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