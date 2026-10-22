import { getRequestUser, type User } from "@/lib/auth";
import type { RowDataPacket } from "mysql2/promise";
import { queryRows, transaction } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function roleGuard(request: Request, role?: User["role"]) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (role && user.role !== role) return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

export async function GET(request: Request) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const url = new URL(request.url);
    const categoryId = parseId(url.searchParams.get("category_id") ?? "");
    if (!categoryId) {
      const categories = await queryRows<RowDataPacket[]>("SELECT c.id, c.name, c.time_limit_minutes, c.question_type, COUNT(q.id) AS questions_count FROM quiz_categories c LEFT JOIN quiz_questions q ON q.category_id = c.id WHERE c.parent_id IS NULL GROUP BY c.id, c.name, c.time_limit_minutes, c.question_type ORDER BY c.name");
      return json({ categories, student: { username: guard.user.username, full_name: guard.user.full_name } });
    }

    const categories = await queryRows<RowDataPacket[]>("SELECT id, name, time_limit_minutes, question_type FROM quiz_categories WHERE id = ? LIMIT 1", [categoryId]);
    if (!categories[0]) return json({ error: "Kategori quiz tidak ditemukan." }, 404);

    const questions = await queryRows<RowDataPacket[]>("SELECT id, question, option_a, option_b, option_c, option_d FROM quiz_questions WHERE category_id = ? ORDER BY id", [categoryId]);
    const questionType = categories[0].question_type === "essay" ? "essay" : "pilihan";
    const typedQuestions = questions.map((question) => ({ ...question, question_type: questionType }));
    return json({ category: categories[0], questions: typedQuestions, student: { username: guard.user.username, full_name: guard.user.full_name } });
  } catch (error) {
    console.error("Quiz list API error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const body = await readJson(request);
    if (body?.action === "check") {
      const categoryId = parseId(String(body.category_id ?? ""));
      const questionId = parseId(String(body.question_id ?? ""));
      const answerIndex = body.answer_index;
      if (!categoryId || !questionId || !Number.isInteger(answerIndex) || Number(answerIndex) < 0 || Number(answerIndex) > 3) {
        return json({ error: "Jawaban quiz tidak valid." }, 422);
      }
      const questions = await queryRows<(RowDataPacket & { answer_index: number })[]>(
        "SELECT answer_index FROM quiz_questions WHERE id = ? AND category_id = ? LIMIT 1",
        [questionId, categoryId],
      );
      if (!questions[0]) return json({ error: "Soal quiz tidak ditemukan." }, 404);
      const correctAnswerIndex = Number(questions[0].answer_index);
      return json({ answer_check: { correct: Number(answerIndex) === correctAnswerIndex, answer_index: correctAnswerIndex } });
    }
    const categoryId = parseId(String(body?.category_id ?? ""));
    const answers = body?.answers;
    if (!categoryId || !answers || typeof answers !== "object" || Array.isArray(answers)) {
      return json({ error: "Jawaban quiz tidak valid." }, 422);
    }

    const categories = await queryRows<RowDataPacket[]>("SELECT time_limit_minutes, question_type FROM quiz_categories WHERE id = ? LIMIT 1", [categoryId]);
    const category = categories[0];
    if (Number(category?.time_limit_minutes) > 0) {
      return json({ error: "Quiz bertimer harus dikirim melalui attempt quiz." }, 409);
    }

    const questions = await queryRows<(RowDataPacket & { id: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string; answer_index: number | null; explanation: string | null; question_type: string | null })[]>("SELECT id, question, option_a, option_b, option_c, option_d, answer_index, explanation, question_type FROM quiz_questions WHERE category_id = ? ORDER BY id", [categoryId]);
    if (!questions.length) return json({ error: "Kategori ini belum memiliki soal." }, 422);
    const questionIds = new Set(questions.map((question) => String(question.id)));
    const submittedAnswers = answers as Record<string, unknown>;
    const isEssayCategory = String(category?.question_type ?? "pilihan") === "essay";

    for (const [questionId, value] of Object.entries(submittedAnswers)) {
      if (!questionIds.has(questionId)) {
        return json({ error: "Jawaban quiz tidak valid." }, 422);
      }
      if (isEssayCategory) {
        if (typeof value !== "string" || value.length > 20_000) return json({ error: "Jawaban essay tidak valid." }, 422);
        continue;
      }
      if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 3) {
        return json({ error: "Jawaban quiz tidak valid." }, 422);
      }
    }

    const answeredQuestions = questions.filter((question) => {
      const answer = submittedAnswers[String(question.id)];
      return typeof answer === "number" || (typeof answer === "string" && answer.trim().length > 0);
    });
    const score = isEssayCategory ? 0 : questions.reduce((total, question) => {
      return total + (submittedAnswers[String(question.id)] === undefined ? 0 : Number(submittedAnswers[String(question.id)]) === Number(question.answer_index) ? 1 : 0);
    }, 0);
    const total = questions.length;
    const percent = isEssayCategory ? 0 : Math.floor((score / total) * 100);
    const result = await transaction(async (connection) => {
      const [insertResult] = await connection.execute(
        "INSERT INTO quiz_results (user_id, category_id, score, total, percent, correct_answers, unanswered_answers, questions_snapshot, answers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [guard.user.id, categoryId, score, total, percent, score, total - answeredQuestions.length, JSON.stringify(questions), JSON.stringify(submittedAnswers)],
      );
      const resultId = Number((insertResult as { insertId: number }).insertId);
      if (answeredQuestions.length) {
        const placeholders = answeredQuestions.map(() => "(?, ?, ?, ?)").join(", ");
        const values = answeredQuestions.flatMap((question) => [
          resultId,
          question.id,
          isEssayCategory ? null : Number(submittedAnswers[String(question.id)]),
          isEssayCategory ? null : Number(submittedAnswers[String(question.id)]) === Number(question.answer_index) ? 1 : 0,
        ]);
        await connection.execute(
          `INSERT INTO quiz_question_attempts (result_id, question_id, selected_index, is_correct) VALUES ${placeholders}`,
          values,
        );
      }
      return { insertId: resultId };
    });

    return json({ success: true, result: { id: result.insertId, score, total, percent, correct_answers: score, incorrect_answers: isEssayCategory ? 0 : answeredQuestions.length - score, unanswered_answers: total - answeredQuestions.length, explanations: questions.map((question) => ({ id: Number(question.id), text: question.explanation, answer_index: Number(question.answer_index ?? 0) })) } }, 201);
  } catch (error) {
    console.error("Quiz submit API error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}