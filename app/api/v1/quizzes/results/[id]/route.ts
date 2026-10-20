import type { RowDataPacket } from "mysql2/promise";
import { getRequestUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { json, parseId } from "@/lib/http";

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
      || typeof item.option_a !== "string"
      || typeof item.option_b !== "string"
      || typeof item.option_c !== "string"
      || typeof item.option_d !== "string"
      || !Number.isInteger(item.answer_index)
      || Number(item.answer_index) < 0
      || Number(item.answer_index) > 3
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
      answer_index: Number(item.answer_index),
      explanation: item.explanation,
    });
  }
  return questions;
}

function parseAnswers(value: unknown, questions: SnapshotQuestion[]) {
  const answers = parseJson(value);
  if (!isRecord(answers)) return null;

  const questionIds = new Set(questions.map((question) => String(question.id)));
  const result: Record<string, number> = {};
  for (const [questionId, selectedIndex] of Object.entries(answers)) {
    if (!questionIds.has(questionId)
      || !Number.isInteger(selectedIndex)
      || Number(selectedIndex) < 0
      || Number(selectedIndex) > 3) {
      return null;
    }
    result[questionId] = Number(selectedIndex);
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
    })[]>(
      "SELECT r.id, r.questions_snapshot, r.answers, c.name AS category_name FROM quiz_results r LEFT JOIN quiz_categories c ON c.id = r.category_id WHERE r.id = ? AND r.user_id = ? LIMIT 1",
      [resultId, user.id],
    );
    const row = rows[0];
    if (!row) return json({ error: "Hasil quiz tidak ditemukan." }, 404);

    const questions = parseSnapshot(row.questions_snapshot);
    const answers = questions ? parseAnswers(row.answers, questions) : null;
    if (!questions || !answers) {
      return json({ error: "Detail jawaban untuk hasil quiz ini tidak tersedia." }, 409);
    }

    const reviewQuestions = questions.map((question) => {
      const selectedIndex = answers[String(question.id)] ?? null;
      const isCorrect = selectedIndex !== null && selectedIndex === question.answer_index;
      return {
        ...question,
        selected_index: selectedIndex,
        status: selectedIndex === null ? "unanswered" : isCorrect ? "correct" : "incorrect",
      } as const;
    });
    const correctAnswers = reviewQuestions.filter((question) => question.status === "correct").length;
    const unansweredAnswers = reviewQuestions.filter((question) => question.status === "unanswered").length;
    const total = reviewQuestions.length;

    return json({
      result: {
        id: Number(row.id),
        category_name: row.category_name ?? "Kategori quiz",
        total,
        correct_answers: correctAnswers,
        incorrect_answers: total - correctAnswers - unansweredAnswers,
        unanswered_answers: unansweredAnswers,
      },
      questions: reviewQuestions,
    });
  } catch (error) {
    console.error("Quiz result review error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}
