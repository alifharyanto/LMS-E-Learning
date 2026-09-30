import "server-only";

import bcrypt from "bcryptjs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RowDataPacket } from "mysql2";
import { createSession, getRequestUser, SESSION_COOKIE, type User } from "@/lib/auth";
import { execute, queryRows, transaction } from "@/lib/db";
import { FAQS } from "@/lib/faqs";
import { json, parseId, readJson, safeString } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DataRow = RowDataPacket & Record<string, unknown>;

async function requestUser(request: Request) {
  return getRequestUser(request);
}

async function roleGuard(request: Request, role?: User["role"]) {
  const user = await requestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (role && user.role !== role) return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

function cookieHeader(token: string, persistent: boolean) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAge = persistent ? "; Max-Age=2592000" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}${maxAge}`;
}

function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function textField(data: Record<string, unknown>, field: string, maxLength = 5000) {
  return safeString(data[field], maxLength);
}

function pdfTextToMarkdown(text: string, title: string) {
  const blocks: string[] = [];
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) blocks.push(paragraph.join(" "));
    paragraph = [];
  };

  for (const rawLine of text.replace(/\r/g, "\n").split("\n")) {
    const line = rawLine.replace(/[\t ]+/g, " ").trim();
    if (!line || /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) {
      flushParagraph();
      continue;
    }

    const isBullet = /^(?:[•●▪◦*-]|\d+[.)])\s+/.test(line);
    const letters = line.match(/[A-Za-zÀ-ÿ]/g) ?? [];
    const isUppercaseHeading = line.length <= 90 && letters.length > 3 && letters.every((letter) => letter === letter.toLocaleUpperCase("id-ID"));
    const isNamedHeading = line.length <= 90 && /^(?:chapter|bab|section|bagian|unit|modul|pendahuluan|kesimpulan)\b/i.test(line);

    if (isBullet) {
      flushParagraph();
      blocks.push(`- ${line.replace(/^(?:[•●▪◦*-]|\d+[.)])\s+/, "")}`);
    } else if (isUppercaseHeading || isNamedHeading) {
      flushParagraph();
      blocks.push(`## ${line}`);
    } else {
      paragraph.push(line);
    }
  }

  flushParagraph();
  return `# ${title}\n\n${blocks.join("\n\n")}`;
}

async function readMaterialPdf(filePath: string) {
  if (filePath.startsWith("https://")) {
    const remote = new URL(filePath);
    if (!remote.hostname.endsWith(".blob.vercel-storage.com")) throw new Error("Sumber PDF tidak diizinkan.");
    const response = await fetch(remote, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error("File PDF tidak dapat diunduh.");
    const size = Number(response.headers.get("content-length") ?? 0);
    if (size > 25 * 1024 * 1024) throw new Error("Ukuran PDF melebihi batas 25 MB.");
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 25 * 1024 * 1024) throw new Error("Ukuran PDF melebihi batas 25 MB.");
    return buffer;
  }

  const relativePath = filePath.replace(/^\/+/, "");
  if (!relativePath.startsWith("Materi/") || relativePath.split("/").some((part) => part === "..")) throw new Error("Path PDF tidak valid.");
  return readFile(join(process.cwd(), "public", relativePath));
}

async function routeRequest(request: Request, path: string[]) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (path[0] === "auth" && path[1] === "login" && method === "POST") {
    const body = await readJson(request);
    const identity = textField(body ?? {}, "identity", 150).toLowerCase();
    const password = safeString(body?.password, 256);
    if (!identity || !password) return json({ error: "Masukkan username/email dan password." }, 422);

    const users = await queryRows<DataRow[]>(
      "SELECT id, username, email, password, full_name, profile_photo, role FROM users WHERE username = ? OR email = ? LIMIT 1",
      [identity, identity],
    );
    const account = users[0];
    if (!account || typeof account.password !== "string" || !(await bcrypt.compare(password, account.password))) {
      return json({ error: "Username/email atau password salah." }, 422);
    }

    const user = {
      id: Number(account.id),
      username: String(account.username),
      email: String(account.email),
      full_name: String(account.full_name ?? ""),
      profile_photo: String(account.profile_photo ?? ""),
      role: account.role as User["role"],
    };
    const persistent = body?.remember === true;
    const token = await createSession(user.id, persistent);
    const response = json({ success: true, user });
    response.headers.append("Set-Cookie", cookieHeader(token, persistent));
    return response;
  }

  if (path[0] === "auth" && path[1] === "register" && method === "POST") {
    const body = await readJson(request);
    const username = textField(body ?? {}, "username", 100);
    const email = textField(body ?? {}, "email", 150).toLowerCase();
    const password = safeString(body?.password, 256);
    const confirmation = safeString(body?.password_confirmation, 256);
    if (username.length < 1 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Username dan email yang valid wajib diisi." }, 422);
    }
    if (password.length < 8 || password !== confirmation) {
      return json({ error: "Password minimal 8 karakter dan harus sama dengan konfirmasi." }, 422);
    }
    if (body?.terms !== true) return json({ error: "Persetujuan penggunaan wajib dicentang." }, 422);

    const existing = await queryRows<DataRow[]>(
      "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1",
      [username, email],
    );
    if (existing.length) return json({ error: "Username atau email sudah digunakan." }, 409);

    const result = await execute(
      "INSERT INTO users (username, email, password, full_name, profile_photo, role) VALUES (?, ?, ?, '', '', 'student')",
      [username, email, await bcrypt.hash(password, 12)],
    );
    const user: User = { id: result.insertId, username, email, full_name: "", profile_photo: "", role: "student" };
    const token = await createSession(user.id, false);
    const response = json({ success: true, user }, 201);
    response.headers.append("Set-Cookie", cookieHeader(token, false));
    return response;
  }

  if (path[0] === "auth" && path[1] === "logout" && method === "POST") {
    const response = json({ success: true });
    response.headers.append("Set-Cookie", clearSessionCookie());
    return response;
  }

  if (path[0] === "auth" && path[1] === "me" && method === "GET") {
    const { user, response } = await roleGuard(request);
    return response ?? json({ user });
  }

  if (path[0] === "faqs" && path.length === 1 && method === "GET") {
    return json({ faqs: FAQS });
  }

  if (path[0] === "courses" && path.length === 1 && method === "GET") {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;
    await execute("INSERT INTO study_sessions (user_id, page_name, minutes_spent) VALUES (?, 'courses', 1)", [guard.user.id]);
    return json({ materials: await queryRows<DataRow[]>("SELECT id, title, description, category, file_path, file_size, file_type, created_at FROM materials ORDER BY created_at DESC") });
  }

  if (path[0] === "courses" && path[1] && path[2] === "markdown" && method === "GET") {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;
    const materialId = parseId(path[1]);
    if (!materialId) return json({ error: "Materi tidak ditemukan." }, 404);
    const materials = await queryRows<DataRow[]>("SELECT title, file_path FROM materials WHERE id = ? LIMIT 1", [materialId]);
    const material = materials[0];
    const filePath = String(material?.file_path ?? "");
    if (!material || !filePath) return json({ error: "PDF materi tidak tersedia." }, 404);

    try {
      const pdfBuffer = await readMaterialPdf(filePath);
      if (pdfBuffer.subarray(0, 5).toString() !== "%PDF-") return json({ error: "File ini bukan PDF yang valid." }, 422);
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: pdfBuffer });
      let parsed: Awaited<ReturnType<typeof parser.getText>>;
      try {
        parsed = await parser.getText();
      } finally {
        await parser.destroy();
      }
      if (parsed.text.trim().length < 40) return json({ error: "PDF ini tidak memiliki lapisan teks. Silakan gunakan viewer PDF asli." }, 422);
      return json({ markdown: pdfTextToMarkdown(parsed.text, String(material.title)), pages: parsed.total });
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "PDF tidak dapat diproses.";
      return json({ error: message.includes("PDF") ? message : "PDF tidak valid atau gagal diekstrak." }, 422);
    }
  }

  if (path[0] === "courses" && path[1] && path[2] === "file" && method === "GET") {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;
    const materialId = parseId(path[1]);
    if (!materialId) return json({ error: "Materi tidak ditemukan." }, 404);
    const materials = await queryRows<DataRow[]>("SELECT file_path FROM materials WHERE id = ? LIMIT 1", [materialId]);
    const filePath = String(materials[0]?.file_path ?? "");
    if (!filePath) return json({ error: "File materi tidak tersedia." }, 404);
    if (filePath.startsWith("https://")) return Response.redirect(filePath, 302);
    const relativePath = filePath.replace(/^\/+/, "");
    if (!relativePath.startsWith("Materi/") || relativePath.includes("..")) return json({ error: "File materi tidak tersedia." }, 404);
    return Response.redirect(new URL(`/${relativePath.split("/").map(encodeURIComponent).join("/")}`, url.origin), 302);
  }

  if (path[0] === "dashboard" && path.length === 1 && method === "GET") {
    const guard = await roleGuard(request, "student");
    if (guard.response) return guard.response;
    const [results, averages, threads, study] = await Promise.all([
      queryRows<DataRow[]>("SELECT id, score, total, percent, note, created_at FROM quiz_results WHERE user_id = ? ORDER BY created_at DESC", [guard.user.id]),
      queryRows<DataRow[]>("SELECT COALESCE(ROUND(AVG(percent)), 0) AS average FROM quiz_results WHERE user_id = ?", [guard.user.id]),
      queryRows<DataRow[]>("SELECT COUNT(*) AS total FROM forum_threads WHERE user_id = ?", [guard.user.id]),
      queryRows<DataRow[]>("SELECT COALESCE(SUM(minutes_spent), 0) AS minutes FROM study_sessions WHERE user_id = ?", [guard.user.id]),
    ]);
    return json({ user: guard.user, results, average: Number(averages[0]?.average ?? 0), threads: Number(threads[0]?.total ?? 0), minutes: Number(study[0]?.minutes ?? 0) });
  }

  if (path[0] === "dashboard" && path[1] === "profile" && method === "PATCH") {
    const guard = await roleGuard(request, "student");
    if (guard.response) return guard.response;
    const body = request.headers.get("content-type")?.includes("application/json")
      ? await readJson(request)
      : null;
    const form = body ? null : await request.formData();
    const fullName = safeString(body?.full_name ?? form?.get("full_name"), 150);
    const email = safeString(body?.email ?? form?.get("email"), 150).toLowerCase();
    if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Nama lengkap dan email valid wajib diisi." }, 422);
    const duplicate = await queryRows<DataRow[]>("SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1", [email, guard.user.id]);
    if (duplicate.length) return json({ error: "Email sudah digunakan." }, 409);

    let photo = guard.user.profile_photo;
    const photoUrl = safeString(body?.profile_photo_url, 2000);
    const upload = form?.get("profile_photo");
    if (photoUrl) {
      let parsedPhoto: URL;
      try {
        parsedPhoto = new URL(photoUrl);
      } catch {
        return json({ error: "URL foto tidak valid." }, 422);
      }
      if (parsedPhoto.protocol !== "https:" || !parsedPhoto.hostname.endsWith(".blob.vercel-storage.com") || !parsedPhoto.pathname.startsWith(`/profiles/${guard.user.id}/`)) {
        return json({ error: "Foto profil harus berasal dari upload akun ini." }, 422);
      }
      photo = parsedPhoto.toString();
    } else if (upload instanceof File && upload.size > 0) {
      return json({ error: "Upload foto melalui endpoint Blob diperlukan." }, 422);
    }

    await execute("UPDATE users SET full_name = ?, email = ?, profile_photo = ? WHERE id = ?", [fullName, email, photo, guard.user.id]);
    return json({ success: true, user: { ...guard.user, full_name: fullName, email, profile_photo: photo } });
  }

  if (path[0] === "quizzes" && path.length === 1 && method === "GET") {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;
    const categoryId = parseId(url.searchParams.get("category_id") ?? "");
    if (!categoryId) {
      const categories = await queryRows<DataRow[]>("SELECT c.id, c.name, COUNT(q.id) AS questions_count FROM quiz_categories c LEFT JOIN quiz_questions q ON q.category_id = c.id WHERE c.parent_id IS NULL GROUP BY c.id, c.name ORDER BY c.name");
      return json({ categories });
    }
    const categories = await queryRows<DataRow[]>("SELECT id, name FROM quiz_categories WHERE id = ? LIMIT 1", [categoryId]);
    if (!categories[0]) return json({ error: "Kategori quiz tidak ditemukan." }, 404);
    const questions = await queryRows<DataRow[]>("SELECT id, question, option_a, option_b, option_c, option_d FROM quiz_questions WHERE category_id = ? ORDER BY id", [categoryId]);
    return json({ category: categories[0], questions });
  }

  if (path[0] === "quizzes" && path.length === 1 && method === "POST") {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;
    const body = await readJson(request);
    const categoryId = parseId(String(body?.category_id ?? ""));
    const answers = body?.answers;
    if (!categoryId || !answers || typeof answers !== "object" || Array.isArray(answers)) return json({ error: "Jawaban quiz tidak valid." }, 422);
    const questions = await queryRows<DataRow[]>("SELECT id, answer_index, explanation FROM quiz_questions WHERE category_id = ? ORDER BY id", [categoryId]);
    if (!questions.length) return json({ error: "Kategori ini belum memiliki soal." }, 422);
    if (questions.some((question) => !Object.hasOwn(answers, String(question.id)))) return json({ error: "Jawab semua pertanyaan sebelum mengirim quiz." }, 422);
    const score = questions.reduce((total, question) => total + (Number((answers as Record<string, unknown>)[String(question.id)]) === Number(question.answer_index) ? 1 : 0), 0);
    const total = questions.length;
    const percent = Math.floor(score / total * 100);
    const result = await execute("INSERT INTO quiz_results (user_id, category_id, score, total, percent, correct_answers) VALUES (?, ?, ?, ?, ?, ?)", [guard.user.id, categoryId, score, total, percent, score]);
    return json({ success: true, result: { id: result.insertId, score, total, percent, explanations: questions.map((question) => ({ id: question.id, text: question.explanation })) } }, 201);
  }

  if (path[0] === "forum" && path.length === 1 && method === "GET") {
    const threads = await queryRows<DataRow[]>("SELECT t.id, t.user_id, t.author, t.title, t.message, t.created_at, COUNT(c.id) AS comment_count FROM forum_threads t LEFT JOIN forum_comments c ON c.thread_id = t.id GROUP BY t.id ORDER BY t.created_at DESC");
    const comments = await queryRows<DataRow[]>("SELECT id, thread_id, user_id, author, message, created_at FROM forum_comments ORDER BY created_at ASC");
    return json({ threads: threads.map((thread) => ({ ...thread, comments: comments.filter((comment) => Number(comment.thread_id) === Number(thread.id)) })) });
  }

  if (path[0] === "forum" && path.length === 1 && method === "POST") {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;
    const body = await readJson(request);
    const title = textField(body ?? {}, "title", 255);
    const message = textField(body ?? {}, "message", 10_000);
    if (!title || !message) return json({ error: "Judul dan pesan wajib diisi." }, 422);
    const result = await execute("INSERT INTO forum_threads (user_id, author, title, message) VALUES (?, ?, ?, ?)", [guard.user.id, guard.user.username, title, message]);
    return json({ success: true, id: result.insertId }, 201);
  }

  if (path[0] === "forum" && path[1] === "threads" && path[2] && path[3] === "comments" && method === "POST") {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;
    const threadId = parseId(path[2]);
    const body = await readJson(request);
    const message = safeString(body?.comment, 5000);
    if (!threadId || !message) return json({ error: "Thread dan komentar wajib diisi." }, 422);
    const result = await execute("INSERT INTO forum_comments (thread_id, user_id, author, message) VALUES (?, ?, ?, ?)", [threadId, guard.user.id, guard.user.username, message]);
    return json({ success: true, id: result.insertId }, 201);
  }

  if (path[0] === "forum" && path[1] === "threads" && path[2] && path.length === 3 && method === "DELETE") {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;
    const threadId = parseId(path[2]);
    if (!threadId) return json({ error: "Thread tidak ditemukan." }, 404);
    const threads = await queryRows<DataRow[]>("SELECT user_id FROM forum_threads WHERE id = ? LIMIT 1", [threadId]);
    if (!threads[0]) return json({ error: "Thread tidak ditemukan." }, 404);
    if (guard.user.role !== "admin" && Number(threads[0].user_id) !== guard.user.id) return json({ error: "Akses tidak diizinkan." }, 403);
    await execute("DELETE FROM forum_threads WHERE id = ?", [threadId]);
    return json({ success: true });
  }

  if (path[0] === "forum" && path[1] === "comments" && path[2] && method === "DELETE") {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;
    const commentId = parseId(path[2]);
    if (!commentId) return json({ error: "Komentar tidak ditemukan." }, 404);
    const comments = await queryRows<DataRow[]>("SELECT user_id FROM forum_comments WHERE id = ? LIMIT 1", [commentId]);
    if (!comments[0]) return json({ error: "Komentar tidak ditemukan." }, 404);
    if (guard.user.role !== "admin" && Number(comments[0].user_id) !== guard.user.id) return json({ error: "Akses tidak diizinkan." }, 403);
    await execute("DELETE FROM forum_comments WHERE id = ?", [commentId]);
    return json({ success: true });
  }

  if (path[0] === "contact" && path.length === 1 && method === "POST") {
    const body = await readJson(request);
    const name = textField(body ?? {}, "name", 150);
    const email = textField(body ?? {}, "email", 150).toLowerCase();
    const phone = textField(body ?? {}, "phone", 20);
    const subject = textField(body ?? {}, "subject", 255);
    const message = textField(body ?? {}, "message", 10_000);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !subject || !message) return json({ success: false, message: "Lengkapi nama, email, subjek, dan pesan dengan benar." }, 422);
    const attempts = await queryRows<DataRow[]>("SELECT COUNT(*) AS total FROM contact_attempts WHERE email = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)", [email]);
    if (Number(attempts[0]?.total ?? 0) >= 3) return json({ success: false, message: "Anda terlalu sering mengirim pesan. Coba lagi beberapa menit." }, 429);
    await transaction(async (connection) => {
      await connection.execute("INSERT INTO contact_attempts (email) VALUES (?)", [email]);
      await connection.execute("INSERT INTO contacts (name, email, phone, subject, message, status) VALUES (?, ?, ?, ?, ?, 'unread')", [name, email, phone || null, subject, message]);
    });
    return json({ success: true, message: "Kontak Anda berhasil dikirim! Admin akan segera membalas." }, 201);
  }

  if (path[0] === "admin" && path.length === 1 && method === "GET") {
    const guard = await roleGuard(request, "admin");
    if (guard.response) return guard.response;
    const [materials, contacts, categories, questions, results] = await Promise.all([
      queryRows<DataRow[]>("SELECT id, title, description, category, file_path, file_size, file_type, created_at FROM materials ORDER BY created_at DESC"),
      queryRows<DataRow[]>("SELECT id, name, email, phone, subject, message, status, created_at FROM contacts ORDER BY created_at DESC"),
      queryRows<DataRow[]>("SELECT c.id, c.name, COUNT(q.id) AS questions_count FROM quiz_categories c LEFT JOIN quiz_questions q ON q.category_id = c.id GROUP BY c.id, c.name ORDER BY c.name"),
      queryRows<DataRow[]>("SELECT id, category_id, question, option_a, option_b, option_c, option_d, answer_index, explanation FROM quiz_questions ORDER BY created_at DESC"),
      queryRows<DataRow[]>("SELECT r.id, r.user_id, r.score, r.total, r.percent, r.created_at, u.username FROM quiz_results r LEFT JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC"),
    ]);
    return json({ materials, contacts, categories, questions, results });
  }

  if (path[0] === "admin" && path[1] === "materials" && path.length === 2 && method === "POST") {
    const guard = await roleGuard(request, "admin");
    if (guard.response) return guard.response;
    const body = await readJson(request);
    const title = textField(body ?? {}, "title", 255);
    const description = textField(body ?? {}, "description", 10_000);
    const category = textField(body ?? {}, "category", 100);
    const filePath = textField(body ?? {}, "file_path", 2000);
    const fileSize = Number(body?.file_size);
    let uploadedFile: URL;
    try {
      uploadedFile = new URL(filePath);
    } catch {
      return json({ error: "Upload PDF belum selesai atau URL tidak valid." }, 422);
    }
    if (!title || !category || uploadedFile.protocol !== "https:" || !uploadedFile.hostname.endsWith(".blob.vercel-storage.com") || !uploadedFile.pathname.startsWith(`/materials/${guard.user.id}/`) || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > 25 * 1024 * 1024) {
      return json({ error: "Judul, kategori, dan PDF valid maksimal 25 MB wajib diisi." }, 422);
    }
    const result = await execute("INSERT INTO materials (title, description, category, file_path, file_size, file_type) VALUES (?, ?, ?, ?, ?, 'application/pdf')", [title, description, category, uploadedFile.toString(), fileSize]);
    return json({ success: true, id: result.insertId }, 201);
  }

  if (path[0] === "admin" && path[1] === "materials" && path[2] && method === "PUT") {
    const guard = await roleGuard(request, "admin");
    if (guard.response) return guard.response;
    const id = parseId(path[2]);
    if (!id) return json({ error: "Materi tidak ditemukan." }, 404);
    const body = await readJson(request);
    const title = textField(body ?? {}, "title", 255);
    const description = textField(body ?? {}, "description", 10_000);
    const category = textField(body ?? {}, "category", 100);
    if (!title || !category) return json({ error: "Judul dan kategori wajib diisi." }, 422);

    const current = await queryRows<DataRow[]>("SELECT id FROM materials WHERE id = ? LIMIT 1", [id]);
    if (!current.length) return json({ error: "Materi tidak ditemukan." }, 404);

    const filePath = textField(body ?? {}, "file_path", 2000);
    if (filePath) {
      let uploadedFile: URL;
      try {
        uploadedFile = new URL(filePath);
      } catch {
        return json({ error: "URL PDF pengganti tidak valid." }, 422);
      }
      const fileSize = Number(body?.file_size);
      if (uploadedFile.protocol !== "https:" || !uploadedFile.hostname.endsWith(".blob.vercel-storage.com") || !uploadedFile.pathname.startsWith(`/materials/${guard.user.id}/`) || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > 25 * 1024 * 1024) {
        return json({ error: "PDF pengganti harus berupa file Blob milik admin ini, maksimal 25 MB." }, 422);
      }
      await execute("UPDATE materials SET title = ?, description = ?, category = ?, file_path = ?, file_size = ?, file_type = 'application/pdf' WHERE id = ?", [title, description, category, uploadedFile.toString(), fileSize, id]);
    } else {
      await execute("UPDATE materials SET title = ?, description = ?, category = ? WHERE id = ?", [title, description, category, id]);
    }
    return json({ success: true });
  }

  if (path[0] === "admin" && path[1] === "materials" && path[2] && method === "DELETE") {
    const guard = await roleGuard(request, "admin");
    if (guard.response) return guard.response;
    const id = parseId(path[2]);
    if (!id) return json({ error: "Materi tidak ditemukan." }, 404);
    await execute("DELETE FROM materials WHERE id = ?", [id]);
    return json({ success: true });
  }

  if (path[0] === "admin" && path[1] === "categories" && path.length === 2 && method === "POST") {
    const guard = await roleGuard(request, "admin");
    if (guard.response) return guard.response;
    const body = await readJson(request);
    const name = textField(body ?? {}, "category_name", 150);
    const parentId = body?.parent_id ? parseId(String(body.parent_id)) : null;
    if (!name) return json({ error: "Nama kategori wajib diisi." }, 422);
    const result = await execute("INSERT INTO quiz_categories (name, parent_id) VALUES (?, ?)", [name, parentId]);
    return json({ success: true, id: result.insertId }, 201);
  }

  if (path[0] === "admin" && path[1] === "categories" && path[2] && method === "DELETE") {
    const guard = await roleGuard(request, "admin");
    if (guard.response) return guard.response;
    const id = parseId(path[2]);
    if (!id) return json({ error: "Kategori tidak ditemukan." }, 404);
    await execute("DELETE FROM quiz_categories WHERE id = ?", [id]);
    return json({ success: true });
  }

  if (path[0] === "admin" && path[1] === "questions" && path.length === 2 && method === "POST") {
    const guard = await roleGuard(request, "admin");
    if (guard.response) return guard.response;
    const body = await readJson(request);
    const categoryId = parseId(String(body?.category_id ?? ""));
    const question = textField(body ?? {}, "question", 10_000);
    const options = ["option_a", "option_b", "option_c", "option_d"].map((field) => textField(body ?? {}, field, 255));
    const answerIndex = Number(body?.answer_index);
    if (!categoryId || !question || options.some((option) => !option) || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
      return json({ error: "Lengkapi kategori, pertanyaan, empat opsi, dan jawaban benar." }, 422);
    }
    const result = await execute("INSERT INTO quiz_questions (category_id, question, option_a, option_b, option_c, option_d, answer_index, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [categoryId, question, ...options, answerIndex, textField(body ?? {}, "explanation", 10_000)]);
    return json({ success: true, id: result.insertId }, 201);
  }

  if (path[0] === "admin" && path[1] === "questions" && path[2] && method === "DELETE") {
    const guard = await roleGuard(request, "admin");
    if (guard.response) return guard.response;
    const id = parseId(path[2]);
    if (!id) return json({ error: "Soal tidak ditemukan." }, 404);
    await execute("DELETE FROM quiz_questions WHERE id = ?", [id]);
    return json({ success: true });
  }

  if (path[0] === "admin" && path[1] === "results" && path[2] && method === "DELETE") {
    const guard = await roleGuard(request, "admin");
    if (guard.response) return guard.response;
    const id = parseId(path[2]);
    if (!id) return json({ error: "Hasil quiz tidak ditemukan." }, 404);
    await execute("DELETE FROM quiz_results WHERE id = ?", [id]);
    return json({ success: true });
  }

  if (path[0] === "admin" && path[1] === "contacts" && path[2] && (method === "PATCH" || method === "DELETE")) {
    const guard = await roleGuard(request, "admin");
    if (guard.response) return guard.response;
    const id = parseId(path[2]);
    if (!id) return json({ error: "Kontak tidak ditemukan." }, 404);
    if (method === "DELETE") await execute("DELETE FROM contacts WHERE id = ?", [id]);
    else await execute("UPDATE contacts SET status = 'read' WHERE id = ?", [id]);
    return json({ success: true });
  }

  return json({ error: "Endpoint API tidak ditemukan." }, 404);
}

export async function handleV1(request: Request, path: string[]) {
  try {
    return await routeRequest(request, path);
  } catch (error) {
    console.error("CourseUp API error:", error);
    return json({ error: "Permintaan gagal diproses. Periksa konfigurasi server atau coba lagi." }, 500);
  }
}
