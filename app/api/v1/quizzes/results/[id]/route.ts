import type { RowDataPacket } from "mysql2/promise";
import { getRequestUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { json, parseId } from "@/lib/http";

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
  question_type: "pilihan" | "essay";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function parseSnapshot(value: unknown): SnapshotQuestion[] | null {
  const snapshot = parseJson(value);
  if (!Array.isArray(snapshot) || !snapshot.length) return null;

  const questions: SnapshotQuestion[] = [];
  for (const item of snapshot) {
    if (!isRecord(item)
      || !Number.isSafeInteger(item.id)
      || typeof item.question !== "string"
      || (item.option_a !== null && typeof item.option_a !== "string")
      || (item.option_b !== null && typeof item.option_b !== "string")
      || (item.option_c !== null && typeof item.option_c !== "string")
      || (item.option_d !== null && typeof item.option_d !== "string")
      || (item.question_type !== undefined && item.question_type !== "pilihan" && item.question_type !== "essay")
      || (item.question_type !== "essay" && (!Number.isInteger(item.answer_index) || Number(item.answer_index) < 0 || Number(item.answer_index) > 3))
      || (item.explanation !== null && typeof item.explanation !== "string")) {
      return null;
    }
    questions.push({
      id: Number(item.id),
      question: item.question,
      option_a: item.option_a,
      option_b: item.option_b,
      option_c: item.option_c,
      option_d: item.option_d,
      answer_index: item.answer_index === null ? null : Number(item.answer_index),
      explanation: item.explanation,
      question_type: item.question_type === "essay" ? "essay" : "pilihan",
    });
  }
  return questions;
}

function parseAnswers(value: unknown, questions: SnapshotQuestion[]) {
  const answers = parseJson(value);
  if (!isRecord(answers)) return null;

  const questionIds = new Set(questions.map((question) => String(question.id)));
  const questionMap = new Map(questions.map((question) => [String(question.id), question]));
  const result: Record<string, number | string> = {};
  for (const [questionId, answer] of Object.entries(answers)) {
    const question = questionMap.get(questionId);
    if (!questionIds.has(questionId) || !question) return null;
    if (question.question_type === "essay") {
      if (typeof answer !== "string") return null;
      result[questionId] = answer;
    } else {
      if (!Number.isInteger(answer) || Number(answer) < 0 || Number(answer) > 3) return null;
      result[questionId] = Number(answer);
    }
  }
  return result;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request);
    if (!user) return json({ error: "Silakan masuk terlebih dahulu." }, 401);

    const { id } = await params;
    const resultId = parseId(id);
    if (!resultId) return json({ error: "Hasil quiz tidak ditemukan." }, 404);

    const rows = await queryRows<(RowDataPacket & {
      id: number;
      questions_snapshot: unknown;
      answers: unknown;
      category_name: string | null;
      question_type: string | null;
    })[]>(
      "SELECT r.id, r.questions_snapshot, r.answers, c.name AS category_name, c.question_type FROM quiz_results r LEFT JOIN quiz_categories c ON c.id = r.category_id WHERE r.id = ? AND r.user_id = ? LIMIT 1",
      [resultId, user.id],
    );
    const row = rows[0];
    if (!row) return json({ error: "Hasil quiz tidak ditemukan." }, 404);

    const questions = parseSnapshot(row.questions_snapshot);
    const answers = questions ? parseAnswers(row.answers, questions) : null;
    if (!questions || !answers) {
      return json({ error: "Detail jawaban untuk hasil quiz ini tidak tersedia." }, 409);
    }

    const gradingRows = await queryRows<(RowDataPacket & { question_id: number; is_correct: number | null })[]>(
      "SELECT question_id, is_correct FROM quiz_question_attempts WHERE result_id = ?",
      [resultId],
    );
    const reviewQuestions = questions.map((question) => {
      const answer = answers[String(question.id)];
      const selectedIndex = typeof answer === "number" ? answer : null;
      const selectedText = typeof answer === "string" ? answer : null;
      const gradingRow = gradingRows.find((entry) => Number(entry.question_id) === question.id);
      const teacherCheck = gradingRow?.is_correct == null ? null : Number(gradingRow.is_correct) === 1;
      const isEssay = row.question_type === "essay";
      const isAnswered = isEssay ? Boolean(selectedText?.trim()) : selectedIndex !== null;
      const isCorrect = isEssay ? teacherCheck === true : selectedIndex !== null && selectedIndex === question.answer_index;
      return {
        ...question,
        question_type: isEssay ? "essay" : "pilihan",
        selected_index: selectedIndex,
        selected_text: selectedText,
        teacher_check: teacherCheck,
        status: !isAnswered ? "unanswered" : isEssay && teacherCheck === null ? "pending" : isCorrect ? "correct" : "incorrect",
      };
    });
    const correctAnswers = reviewQuestions.filter((question) => question.status === "correct").length;
    const unansweredAnswers = reviewQuestions.filter((question) => question.status === "unanswered").length;
    const incorrectAnswers = reviewQuestions.filter((question) => question.status === "incorrect").length;
    const total = reviewQuestions.length;

    return json({
      result: {
        id: Number(row.id),
        category_name: row.category_name ?? "Kategori quiz",
        total,
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        unanswered_answers: unansweredAnswers,
      },
      questions: reviewQuestions,
    });
  } catch (error) {
    console.error("Quiz result review error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}
