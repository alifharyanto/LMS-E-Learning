import { getRequestUser } from "@/lib/auth";
import { queryRows, transaction } from "@/lib/db";
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
      essay_review_submitted: number;
      username: string | null;
      full_name: string | null;
      category_name: string | null;
      question_type: string | null;
    })[]>(
      "SELECT r.id, r.user_id, r.category_id, r.score, r.total, r.percent, r.correct_answers, r.unanswered_answers, r.essay_review_submitted, r.created_at, a.started_at, a.submitted_at, a.questions_snapshot, a.answers, u.username, u.full_name, c.name AS category_name, c.question_type FROM quiz_results r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN quiz_attempts a ON a.result_id = r.id LEFT JOIN quiz_categories c ON c.id = r.category_id WHERE r.id = ? LIMIT 1",
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
    const startedAt = row.started_at ? new Date(row.started_at).getTime() : null;
    const submittedAt = row.submitted_at ? new Date(row.submitted_at).getTime() : null;
    const completedAt = submittedAt ?? new Date(row.created_at).getTime();
    const reviewQuestions = questions.map((question) => {
      const questionType = row.question_type === "essay" ? "essay" : "pilihan";
      const selectedValue = answers[String(question.id)];
      const selectedIndex = typeof selectedValue === "number" ? selectedValue : null;
      const selectedText = typeof selectedValue === "string" ? selectedValue : normalizeEssayReviews(savedAnswers[String(question.id)]);
      const attemptRow = answerRows.find((entry) => Number(entry.question_id) === Number(question.id));
      const isEssay = questionType === "essay";
      const isLegacyEssayPlaceholder = isEssay && attemptRow !== undefined && attemptRow.selected_index !== null;
      const draftCheck = isEssay && attemptRow?.selected_index === null && attemptRow.is_correct !== null
        ? Number(attemptRow.is_correct) === 1
        : null;
      const teacherCheck = !Number(row.essay_review_submitted) || attemptRow?.is_correct == null || isLegacyEssayPlaceholder
        ? null
        : Number(attemptRow.is_correct) === 1;
      const isAnswered = isEssay ? Boolean(selectedText.trim()) : selectedIndex !== null;
      const isCorrect = isEssay ? teacherCheck === true : selectedIndex !== null && Number(question.answer_index) === selectedIndex;
      const status = !isAnswered ? "unanswered" : isEssay && teacherCheck === null ? "pending" : isCorrect ? "correct" : "incorrect";
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
        draft_check: draftCheck,
        status,
      };
    });
    const correctAnswers = reviewQuestions.filter((question) => question.status === "correct").length;
    const incorrectAnswers = reviewQuestions.filter((question) => question.status === "incorrect").length;
    const unansweredAnswers = reviewQuestions.filter((question) => question.status === "unanswered").length;
    const pendingAnswers = reviewQuestions.filter((question) => question.status === "pending").length;
    const isGraded = row.question_type !== "essay" || (Boolean(Number(row.essay_review_submitted)) && pendingAnswers === 0);

    return json({
      result: {
        id: Number(row.id),
        user_id: Number(row.user_id),
        username: row.username ?? null,
        full_name: row.full_name ?? null,
        score: Number(row.score),
        total: Number(row.total),
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        unanswered_answers: unansweredAnswers,
        pending_answers: pendingAnswers,
        is_graded: isGraded,
        percent: Number(row.percent),
        started_at: row.started_at,
        submitted_at: row.submitted_at,
        duration_seconds: startedAt && completedAt ? Math.max(0, Math.floor((completedAt - startedAt) / 1000)) : 0,
        category_name: row.category_name ?? "Kategori quiz",
        question_type: row.question_type ?? "pilihan",
      },
      questions: reviewQuestions,
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
    const percent = body?.percent;
    const rawGrades = body?.grades;
    if (!Number.isInteger(percent) || Number(percent) < 0 || Number(percent) > 100 || !Array.isArray(rawGrades)) {
      return json({ error: "Masukkan nilai akhir 0-100 dan periksa semua jawaban essay sebelum mengirim." }, 422);
    }

    const grades: { questionId: number; isCorrect: boolean }[] = [];
    for (const rawGrade of rawGrades) {
      if (!rawGrade || typeof rawGrade !== "object" || Array.isArray(rawGrade)) {
        return json({ error: "Data pemeriksaan jawaban essay tidak valid." }, 422);
      }
      const grade = rawGrade as Record<string, unknown>;
      const questionId = parseId(String(grade.question_id ?? ""));
      if (!questionId || typeof grade.is_correct !== "boolean") {
        return json({ error: "Data pemeriksaan jawaban essay tidak valid." }, 422);
      }
      grades.push({ questionId, isCorrect: grade.is_correct });
    }

    const submission = await transaction(async (connection) => {
      const [resultRows] = await connection.execute<(RowDataPacket & {
        total: number;
        answers: unknown;
        questions_snapshot: unknown;
        question_type: string | null;
      })[]>(
        "SELECT r.total, r.answers, r.questions_snapshot, c.question_type FROM quiz_results r LEFT JOIN quiz_categories c ON c.id = r.category_id WHERE r.id = ? LIMIT 1 FOR UPDATE",
        [resultId],
      );
      const result = resultRows[0];
      if (!result) return { error: "Hasil quiz tidak ditemukan.", status: 404 as const };
      if (result.question_type !== "essay") return { error: "Penilaian manual hanya tersedia untuk quiz essay.", status: 422 as const };

      const snapshot = parseJson<SnapshotQuestion[]>(result.questions_snapshot, []);
      const savedAnswers = parseJson<Record<string, unknown>>(result.answers, {});
      const answeredQuestionIds = snapshot
        .filter((question) => typeof savedAnswers[String(question.id)] === "string" && String(savedAnswers[String(question.id)]).trim())
        .map((question) => Number(question.id));

      const gradeMap = new Map<number, boolean>();
      for (const grade of grades) {
        if (!answeredQuestionIds.includes(grade.questionId) || gradeMap.has(grade.questionId)) {
          return { error: "Periksa setiap jawaban essay tepat satu kali sebelum mengirim nilai.", status: 422 as const };
        }
        gradeMap.set(grade.questionId, grade.isCorrect);
      }
      if (gradeMap.size !== answeredQuestionIds.length) {
        return { error: "Masih ada jawaban essay yang belum diperiksa.", status: 422 as const };
      }

      if (grades.length) {
        const values = grades.flatMap((grade) => [resultId, grade.questionId, grade.isCorrect ? 1 : 0]);
        const placeholders = grades.map(() => "(?, ?, NULL, ?)").join(", ");
        await connection.execute(
          `INSERT INTO quiz_question_attempts (result_id, question_id, selected_index, is_correct) VALUES ${placeholders} ON DUPLICATE KEY UPDATE selected_index = NULL, is_correct = VALUES(is_correct)`,
          values,
        );
      }

      const correctAnswers = grades.filter((grade) => grade.isCorrect).length;
      const incorrectAnswers = grades.length - correctAnswers;
      const unansweredAnswers = Math.max(0, Number(result.total) - answeredQuestionIds.length);
      await connection.execute(
        "UPDATE quiz_results SET score = ?, correct_answers = ?, unanswered_answers = ?, percent = ?, essay_review_submitted = 1 WHERE id = ?",
        [correctAnswers, correctAnswers, unansweredAnswers, Number(percent), resultId],
      );

      return {
        result: {
          score: correctAnswers,
          total: Number(result.total),
          percent: Number(percent),
          correct_answers: correctAnswers,
          incorrect_answers: incorrectAnswers,
          unanswered_answers: unansweredAnswers,
          pending_answers: 0,
          is_graded: true,
        },
      };
    });

    if ("error" in submission) return json({ error: submission.error }, submission.status);
    return json({ success: true, ...submission.result });
  } catch (error) {
    console.error("Admin essay grade update error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}
