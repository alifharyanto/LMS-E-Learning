import "server-only";

import * as XLSX from "xlsx";

export const maxQuizImportRows = 1000;
export const maxQuizImportBytes = 5 * 1024 * 1024;

export type QuizImportRow = {
  rowNumber: number;
  category: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer_index: number;
  explanation: string;
};

export type QuizImportError = {
  rowNumber: number;
  message: string;
};

export type ParsedQuizImport = {
  rows: QuizImportRow[];
  errors: QuizImportError[];
  totalRows: number;
};

const requiredColumns = ["category", "question", "option_a", "option_b", "option_c", "option_d", "answer_index"] as const;

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function normalizeColumn(value: unknown) {
  return stringValue(value).toLowerCase().replace(/[\s-]+/g, "_");
}

function answerIndex(value: unknown) {
  const normalized = stringValue(value).toUpperCase();
  if (/^[A-D]$/.test(normalized)) return normalized.charCodeAt(0) - 65;
  if (/^[0-3]$/.test(normalized)) return Number(normalized);
  return null;
}

async function rowsFromFile(file: File) {
  const filename = file.name.toLowerCase();
  if (filename.endsWith(".json")) {
    const parsed: unknown = JSON.parse(await file.text());
    if (!Array.isArray(parsed)) throw new Error("File JSON harus berisi array soal.");
    return parsed.map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return {};
      return row as Record<string, unknown>;
    });
  }

  const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer", raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("File tidak memiliki sheet yang bisa dibaca.");
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
}

export async function parseQuizImport(file: File): Promise<ParsedQuizImport> {
  const filename = file.name.toLowerCase();
  if (!filename.endsWith(".csv") && !filename.endsWith(".json") && !filename.endsWith(".xlsx")) {
    throw new Error("Format file harus CSV, JSON, atau XLSX.");
  }
  if (file.size > maxQuizImportBytes) throw new Error("Ukuran file maksimal 5 MB.");

  const sourceRows = await rowsFromFile(file);
  const rows: QuizImportRow[] = [];
  const errors: QuizImportError[] = [];

  if (!sourceRows.length) return { rows, errors: [{ rowNumber: 2, message: "File tidak berisi data soal." }], totalRows: 0 };
  if (sourceRows.length > maxQuizImportRows) {
    return { rows, errors: [{ rowNumber: 0, message: `Maksimal ${maxQuizImportRows} soal per file.` }], totalRows: sourceRows.length };
  }

  for (const [index, source] of sourceRows.entries()) {
    const normalized = Object.fromEntries(Object.entries(source).map(([key, value]) => [normalizeColumn(key), value]));
    const rowNumber = index + 2;
    const missing = requiredColumns.filter((column) => !stringValue(normalized[column]));
    const answer = answerIndex(normalized.answer_index);
    if (missing.length || answer === null) {
      errors.push({ rowNumber, message: [missing.length ? `Kolom kosong: ${missing.join(", ")}.` : "", answer === null ? "answer_index harus A-D atau 0-3." : ""].filter(Boolean).join(" ") });
      continue;
    }

    rows.push({
      rowNumber,
      category: stringValue(normalized.category),
      question: stringValue(normalized.question),
      option_a: stringValue(normalized.option_a),
      option_b: stringValue(normalized.option_b),
      option_c: stringValue(normalized.option_c),
      option_d: stringValue(normalized.option_d),
      answer_index: answer,
      explanation: stringValue(normalized.explanation),
    });
  }

  return { rows, errors, totalRows: sourceRows.length };
}