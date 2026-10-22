import { getRequestUser } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SnapshotQuestion = {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer_index: number | null;
  explanation: string | null;
  question_type?: "pilihan" | "essay";
};

function parseJson<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "string") return (value as T) ?? fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function roleGuard(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (user.role !== "admin") return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

function normalizeEssayReviews(answerValue: unknown) {
  if (typeof answerValue === "string") return answerValue;
  if (answerValue == null) return "";
  return String(answerValue);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const resultId = parseId(id);
    if (!resultId) return json({ error: "Hasil quiz tidak ditemukan." }, 404);

    const rows = await queryRows<(RowDataPacket & {
      id: number;
      user_id: number;
      category_id: number;
      score: number;
      total: number;
      percent: number;
      correct_answers: number;
      unanswered_answers: number;
      created_at: string;
      started_at: string | null;
      submitted_at: string | null;
      questions_snapshot: unknown;
      answers: unknown;
      username: string | null;
      full_name: string | null;
      category_name: string | null;
      question_type: string | null;
    })[]>(
      "SELECT r.id, r.user_id, r.category_id, r.score, r.total, r.percent, r.correct_answers, r.unanswered_answers, r.created_at, a.started_at, a.submitted_at, a.questions_snapshot, a.answers, u.username, u.full_name, c.name AS category_name, c.question_type FROM quiz_results r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN quiz_attempts a ON a.result_id = r.id LEFT JOIN quiz_categories c ON c.id = r.category_id WHERE r.id = ? LIMIT 1",
      [resultId],
    );
    const row = rows[0];
    if (!row) return json({ error: "Hasil quiz tidak ditemukan." }, 404);

    const snapshot = parseJson<SnapshotQuestion[]>(row.questions_snapshot, []);
    const answerRows = await queryRows<(RowDataPacket & { question_id: number; selected_index: number | null; is_correct: number | null })[]>(
      "SELECT question_id, selected_index, is_correct FROM quiz_question_attempts WHERE result_id = ?",
      [resultId],
    );
    const questions = snapshot.length ? snapshot : await queryRows<(RowDataPacket & SnapshotQuestion)[]>(
      "SELECT id, question, option_a, option_b, option_c, option_d, answer_index, explanation, question_type FROM quiz_questions WHERE category_id = ? ORDER BY id",
      [row.category_id],
    );
    const savedAnswers = parseJson<Record<string, unknown>>(row.answers, {});
    const answers = snapshot.length ? savedAnswers : Object.fromEntries(
      answerRows.map((answer) => [String(answer.question_id), answer.selected_index ?? null]),
    );
    const correctAnswers = Number(row.correct_answers ?? row.score);
    const unansweredAnswers = Number(row.unanswered_answers ?? 0);
    const startedAt = row.started_at ? new Date(row.started_at).getTime() : null;
    const submittedAt = row.submitted_at ? new Date(row.submitted_at).getTime() : null;
    const completedAt = submittedAt ?? new Date(row.created_at).getTime();

    return json({
      result: {
        id: Number(row.id),
        user_id: Number(row.user_id),
        username: row.username ?? null,
        full_name: row.full_name ?? null,
        score: Number(row.score),
        total: Number(row.total),
        correct_answers: correctAnswers,
        incorrect_answers: Math.max(0, Number(row.total) - correctAnswers - unansweredAnswers),
        unanswered_answers: unansweredAnswers,
        percent: Number(row.percent),
        started_at: row.started_at,
        submitted_at: row.submitted_at,
        duration_seconds: startedAt && completedAt ? Math.max(0, Math.floor((completedAt - startedAt) / 1000)) : 0,
        category_name: row.category_name ?? "Kategori quiz",
        question_type: row.question_type ?? "pilihan",
      },
      questions: questions.map((question) => {
        const questionType = row.question_type === "essay" ? "essay" : "pilihan";
        const selectedValue = answers[String(question.id)];
        const selectedIndex = typeof selectedValue === "number" ? selectedValue : null;
        const selectedText = typeof selectedValue === "string" ? selectedValue : normalizeEssayReviews(savedAnswers[String(question.id)]);
        const attemptRow = answerRows.find((entry) => Number(entry.question_id) === Number(question.id));
        const teacherCheck = attemptRow?.is_correct == null ? null : Number(attemptRow.is_correct) === 1;
        const isCorrect = questionType === "essay"
          ? teacherCheck === true
          : selectedIndex !== null && Number(question.answer_index) === selectedIndex;
        return {
          id: Number(question.id),
          question: question.question,
          option_a: question.option_a ?? "",
          option_b: question.option_b ?? "",
          option_c: question.option_c ?? "",
          option_d: question.option_d ?? "",
          answer_index: typeof question.answer_index === "number" ? question.answer_index : 0,
          selected_index: selectedIndex,
          selected_text: selectedText,
          is_correct: isCorrect,
          question_type: questionType,
          teacher_check: teacherCheck,
        };
      }),
    });
  } catch (error) {
    console.error("Admin result detail error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const resultId = parseId(id);
    if (!resultId) return json({ error: "Hasil quiz tidak ditemukan." }, 404);

    const body = await readJson(request);
    const questionId = parseId(String(body?.question_id ?? ""));
    const isCorrect = body?.is_correct === true || body?.is_correct === 1 || body?.is_correct === "true";
    if (!questionId || typeof isCorrect !== "boolean") {
      return json({ error: "Grading soal essay tidak valid." }, 422);
    }

    const resultRows = await queryRows<(RowDataPacket & { answers: unknown; questions_snapshot: unknown; question_type: string | null })[]>(
      "SELECT r.answers, r.questions_snapshot, c.question_type FROM quiz_results r LEFT JOIN quiz_categories c ON c.id = r.category_id WHERE r.id = ? LIMIT 1",
      [resultId],
    );
    const targetQuestion = parseJson<SnapshotQuestion[]>(resultRows[0]?.questions_snapshot, [])
      .find((question) => Number(question.id) === questionId);
    const savedAnswers = parseJson<Record<string, unknown>>(resultRows[0]?.answers, {});
    if (!targetQuestion || resultRows[0]?.question_type !== "essay" || typeof savedAnswers[String(questionId)] !== "string" || !String(savedAnswers[String(questionId)]).trim()) {
      return json({ error: "Jawaban essay tidak ditemukan atau belum dijawab." }, 422);
    }

    await execute(
      "INSERT INTO quiz_question_attempts (result_id, question_id, selected_index, is_correct) VALUES (?, ?, NULL, ?) ON DUPLICATE KEY UPDATE is_correct = VALUES(is_correct), selected_index = COALESCE(selected_index, NULL)",
      [resultId, questionId, isCorrect ? 1 : 0],
    );

    const rows = await queryRows<(RowDataPacket & { total: number; score: number; unanswered_answers: number })[]>(
      "SELECT total, score, unanswered_answers FROM quiz_results WHERE id = ? LIMIT 1",
      [resultId],
    );
    const result = rows[0];
    if (!result) return json({ error: "Hasil quiz tidak ditemukan." }, 404);

    const gradingRows = await queryRows<(RowDataPacket & { is_correct: number | null })[]>(
      "SELECT is_correct FROM quiz_question_attempts WHERE result_id = ?",
      [resultId],
    );
    const score = gradingRows.filter((entry) => entry.is_correct !== null && Number(entry.is_correct) === 1).length;
    const total = Number(result.total);
    const percent = total ? Math.floor((score / total) * 100) : 0;
    const unansweredAnswers = Math.max(0, total - gradingRows.length);
    const incorrectAnswers = gradingRows.filter((entry) => entry.is_correct !== null && Number(entry.is_correct) === 0).length;

    await execute(
      "UPDATE quiz_results SET score = ?, correct_answers = ?, incorrect_answers = ?, unanswered_answers = ?, percent = ? WHERE id = ?",
      [score, score, incorrectAnswers, unansweredAnswers, percent, resultId],
    );

    return json({ success: true, score, total, percent, correct_answers: score, incorrect_answers: incorrectAnswers, unanswered_answers: unansweredAnswers });
  } catch (error) {
    console.error("Admin essay grade update error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}
