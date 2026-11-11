import "server-only";

import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";

export const maxQuizImportRows = 1000;
export const maxQuizImportBytes = 5 * 1024 * 1024;

export type QuizQuestionType = "pilihan" | "essay";

export type QuizImportRow = {
  rowNumber: number;
  category: string;
  material_category: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer_index: number | null;
  explanation: string;
  question_type: QuizQuestionType;
};

export type QuizImportError = {
  rowNumber: number;
  message: string;
};

export type QuizImportCategory = {
  name: string;
  materialCategory: string;
  description: string;
  timeLimitMinutes: number | null;
  questionType: QuizQuestionType;
};

export type ParsedQuizImport = {
  rows: QuizImportRow[];
  errors: QuizImportError[];
  totalRows: number;
  category: QuizImportCategory | null;
};

const requiredColumns = ["category", "namasoal", "option_a", "option_b", "option_c", "option_d", "answer_index"] as const;

type QuizImportSource = {
  rows: Record<string, unknown>[];
  category: QuizImportCategory | null;
  firstRowNumber: number;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function normalizeColumn(value: unknown) {
  return stringValue(value).toLowerCase().replace(/[\s-]+/g, "_");
}

function questionType(value: unknown): QuizQuestionType {
  const normalized = stringValue(value).toLowerCase();
  if (normalized === "essay" || normalized === "esai") return "essay";
  return "pilihan";
}

function answerIndex(value: unknown) {
  const normalized = stringValue(value).toUpperCase();
  if (/^[A-D]$/.test(normalized)) return normalized.charCodeAt(0) - 65;
  if (/^[0-3]$/.test(normalized)) return Number(normalized);
  return null;
}

async function rowsFromFile(file: File): Promise<QuizImportSource> {
  const filename = file.name.toLowerCase();
  if (filename.endsWith(".json")) {
    const parsed: unknown = JSON.parse(await file.text());
    if (!Array.isArray(parsed)) throw new Error("File JSON harus berisi array soal.");
    const records = parsed.map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return {};
      return row as Record<string, unknown>;
    });
    const first = records[0];
    const hasCategoryConfig = first && ("namasoal" in first || "nama_soal" in first) && !("question" in first) && !("soal" in first);
    if (!hasCategoryConfig) return { rows: records, category: null, firstRowNumber: 2 };

    const name = stringValue(first.NamaSoal ?? first.namasoal ?? first.nama_soal);
    if (!name || name.length > 150) throw new Error("Judul quiz pada konfigurasi JSON wajib diisi dan maksimal 150 karakter.");
    const materialCategory = stringValue(first.Kategori ?? first.kategori ?? first.material_category ?? first.category);
    if (materialCategory.length > 100) throw new Error("Kategori Materi Belajar maksimal 100 karakter.");
    const description = stringValue(first.description);
    if (description.length > 10_000) throw new Error("Deskripsi quiz maksimal 10.000 karakter.");
    const rawTime = stringValue(first.time);
    const timeLimitMinutes = rawTime ? Number(rawTime) : null;
    if (timeLimitMinutes !== null && (!Number.isInteger(timeLimitMinutes) || timeLimitMinutes < 1 || timeLimitMinutes > 1440)) {
      throw new Error("Durasi pada konfigurasi JSON harus antara 1-1440 menit atau dikosongkan.");
    }
    const questionTypeValue = questionType(first["jenis-soal"] ?? first.jenis_soal ?? first.question_type ?? "pilihan");

    return {
      rows: records.slice(1).map((row) => ({ ...row, category: name, namasoal: row.namasoal ?? row.nama_soal ?? row.question ?? row.soal, material_category: materialCategory, question_type: questionTypeValue })),
      category: { name, materialCategory, description, timeLimitMinutes, questionType: questionTypeValue },
      firstRowNumber: 3,
    };
  }

  if (filename.endsWith(".csv")) {
    const rows = parse(await file.text(), {
      bom: true,
      columns: (headers: string[]) => headers.map(normalizeColumn),
      skip_empty_lines: true,
      trim: true,
      max_record_size: 64 * 1024,
    }) as Record<string, unknown>[];
    return { rows, category: null, firstRowNumber: 2 };
  }

  const workbook = new ExcelJS.Workbook();
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await workbook.xlsx.load(fileBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("File tidak memiliki sheet yang bisa dibaca.");

  const headers = (sheet.getRow(1).values as unknown[]).slice(1).map(normalizeColumn);
  const lastRow = Math.min(sheet.rowCount, maxQuizImportRows + 2);
  const rows: Record<string, unknown>[] = [];
  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber += 1) {
    const values = sheet.getRow(rowNumber).values as unknown[];
    rows.push(Object.fromEntries(headers.map((header, index) => {
      const value = values[index + 1];
      if (value && typeof value === "object") {
        if ("text" in value) return [header, value.text];
        if ("result" in value) return [header, value.result];
        return [header, ""];
      }
      return [header, value ?? ""];
    })));
  }
  return { rows, category: null, firstRowNumber: 2 };
}

export async function parseQuizImport(file: File): Promise<ParsedQuizImport> {
  const filename = file.name.toLowerCase();
  if (!filename.endsWith(".csv") && !filename.endsWith(".json") && !filename.endsWith(".xlsx")) {
    throw new Error("Format file harus CSV, JSON, atau XLSX.");
  }
  if (file.size > maxQuizImportBytes) throw new Error("Ukuran file maksimal 5 MB.");

  const source = await rowsFromFile(file);
  const sourceRows = source.rows;
  const rows: QuizImportRow[] = [];
  const errors: QuizImportError[] = [];

  if (!sourceRows.length) return { rows, errors: [{ rowNumber: source.firstRowNumber, message: "File tidak berisi data soal." }], totalRows: 0, category: source.category };
  if (sourceRows.length > maxQuizImportRows) {
    return { rows, errors: [{ rowNumber: 0, message: `Maksimal ${maxQuizImportRows} soal per file.` }], totalRows: sourceRows.length, category: source.category };
  }

  for (const [index, sourceRow] of sourceRows.entries()) {
    const normalized = Object.fromEntries(Object.entries(sourceRow).map(([key, value]) => [normalizeColumn(key), value]));
    const rowNumber = source.firstRowNumber + index;
    const rowQuestionType = questionType(normalized["jenis-soal"] ?? normalized.jenis_soal ?? normalized.question_type ?? source.category?.questionType ?? "pilihan");
    const questionText = stringValue(normalized.namasoal ?? normalized.nama_soal ?? normalized.question ?? normalized.soal);
    const missing = rowQuestionType === "essay"
      ? ["soal"].filter(() => !questionText)
      : requiredColumns.filter((column) => !stringValue(normalized[column] ?? (column === "category" ? normalized.kategori : column === "namasoal" ? normalized.nama_soal ?? normalized.question ?? normalized.soal : undefined)));
    const answer = rowQuestionType === "essay" ? null : answerIndex(normalized.answer_index);
    if (missing.length || (rowQuestionType === "pilihan" && answer === null)) {
      errors.push({ rowNumber, message: [missing.length ? `Kolom kosong: ${missing.join(", ")}.` : "", rowQuestionType === "pilihan" && answer === null ? "answer_index harus A-D atau 0-3." : ""].filter(Boolean).join(" ") });
      continue;
    }

    rows.push({
      rowNumber,
      category: stringValue(normalized.category ?? normalized.kategori ?? source.category?.materialCategory ?? ""),
      material_category: stringValue(normalized.material_category ?? normalized.kategori ?? source.category?.materialCategory ?? ""),
      question: questionText,
      option_a: stringValue(normalized.option_a),
      option_b: stringValue(normalized.option_b),
      option_c: stringValue(normalized.option_c),
      option_d: stringValue(normalized.option_d),
      answer_index: rowQuestionType === "essay" ? null : answer,
      explanation: stringValue(normalized.explanation),
      question_type: rowQuestionType,
    });
  }

  return { rows, errors, totalRows: sourceRows.length, category: source.category };
}

export function findQuizImportCategory<T extends { name: string; material_category: string | null }>(
  categories: T[],
  name: string,
  materialCategory: string,
) {
  const normalizedName = name.trim().toLocaleLowerCase("id-ID");
  const matches = categories.filter((category) => category.name.trim().toLocaleLowerCase("id-ID") === normalizedName);
  if (materialCategory) {
    const normalizedMaterialCategory = materialCategory.trim().toLocaleLowerCase("id-ID");
    return matches.find((category) => category.material_category?.trim().toLocaleLowerCase("id-ID") === normalizedMaterialCategory) ?? null;
  }
  return matches.length === 1 ? matches[0] : null;
}