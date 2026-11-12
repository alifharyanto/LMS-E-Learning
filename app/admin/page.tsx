"use client";

import { upload as uploadBlob } from "@vercel/blob/client";
import { Activity, CalendarDays, ChartNoAxesColumn, Check, CheckCircle2, Clock3, Eye, FileSpreadsheet, Pencil, Save, Trash2, UsersRound, X, XCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import MarkdownEditor from "@/components/admin/markdown-editor";
import { MotionButton, Reveal, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { apiRequest } from "@/lib/browser-api";

type Category = { id: number; name: string; material_category: string | null; description: string | null; questions_count: number; time_limit_minutes: number | null; question_type?: "pilihan" | "essay" };
type Material = { id: number; title: string; description: string | null; category: string; file_path: string | null; file_size: number | null; file_type: string | null; content?: string | null; content_format?: "html" | "markdown"; is_editor_content?: boolean | number; youtube_embed_url: string | null };
type MaterialFormat = "application/pdf" | "text/markdown" | "markdown-editor";
type Question = { id: number; question: string; answer_index: number | null; explanation: string | null; question_type?: "pilihan" | "essay"; category_id: number; quiz_title: string; material_category: string | null };
type Contact = { id: number; name: string; email: string; subject: string; message: string; status: string; created_at: string };
type ResultQuestion = { id: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string; answer_index: number; selected_index: number | null; selected_text?: string | null; is_correct: boolean; question_type?: "pilihan" | "essay"; teacher_check?: boolean | null; draft_check?: boolean | null; status?: "correct" | "incorrect" | "unanswered" | "pending" };
type Result = {
  id: number;
  user_id: number;
  category_id: number;
  category_name: string | null;
  username: string | null;
  full_name: string | null;
  score: number;
  total: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered_answers: number;
  pending_answers: number;
  is_graded: boolean;
  percent: number;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
  result_date: string;
  duration_seconds: number;
};
type ResultDetail = { result: { id: number; user_id: number; username: string | null; full_name: string | null; score: number; total: number; correct_answers: number; incorrect_answers: number; unanswered_answers: number; pending_answers: number; is_graded: boolean; percent: number; started_at: string | null; submitted_at: string | null; duration_seconds: number }; questions: ResultQuestion[] };
type RegistrationDay = { date: string; total: number };
type ActiveStudent = { id: number; username: string; full_name: string; last_active: string };
type AdminOverview = { total_students: number; joined_today: number; active_today: number; registrations: RegistrationDay[]; active_students: ActiveStudent[]; quiz_30d: { attempts: number; average_percent: number; passed: number } };
type AdminData = { materials: Material[]; categories: Category[]; questions: Question[]; contacts: Contact[]; results: Result[]; overview: AdminOverview };
type User = { id: number };
type ImportError = { rowNumber: number; message: string };
type ImportRow = { rowNumber: number; category: string; question: string; option_a: string; option_b: string; option_c: string; option_d: string; answer_index: number; explanation: string };
type ImportPreview = { totalRows: number; validRows: number; errors: ImportError[]; rows: ImportRow[] };

function getMaterialFormat(value: string): MaterialFormat {
  if (value === "text/markdown" || value === "markdown-editor") return value;
  return "application/pdf";
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

function resultDate(result: Pick<Result, "result_date">) {
  const date = new Date(`${result.result_date}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatRouteDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}${month}${date.getFullYear()}`;
}

function parseRouteDate(value: string | null) {
  if (!value || !/^\d{8}$/.test(value)) return null;
  const day = Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const year = Number(value.slice(4, 8));
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateSegment(value: string) {
  return `${value.slice(8, 10)}${value.slice(5, 7)}${value.slice(0, 4)}`;
}

export default function AdminPage() {
  const pathname = usePathname() || "/admin/dashboard";
  const router = useRouter();
  const searchParams = useSearchParams();
  const isResultsSection = pathname === "/admin/hasilbelajar" || pathname.startsWith("/admin/hasilbelajar/");
  const resultDateSegment = isResultsSection ? pathname.slice("/admin/hasilbelajar".length).split("/").filter(Boolean)[0] ?? null : null;
  const selectedResultDate = parseRouteDate(resultDateSegment);
  const section = pathname === "/admin/materi" ? "materi" : pathname === "/admin/quiz" ? "quiz" : pathname === "/admin/soal" ? "soal" : isResultsSection ? "hasilbelajar" : pathname === "/admin/kontak" ? "kontak" : "dashboard";
  const adminDataEndpoint = section === "hasilbelajar" && selectedResultDate
    ? `/api/v1/admin?results_date=${selectedResultDate}`
    : "/api/v1/admin";
  const headings = {
    dashboard: { title: "Dashboard", eyebrow: "ANALISIS ADMIN", description: "Pantau pendaftaran, aktivitas belajar, dan hasil quiz." },
    materi: { title: "Materi", eyebrow: "KONTEN BELAJAR", description: "Kelola materi yang tersedia untuk siswa." },
    quiz: { title: "Kelola Quiz", eyebrow: "PENGELOMPOKAN", description: "Kelola quiz di dalam kategori Materi Belajar." },
    soal: { title: "Quiz", eyebrow: "LATIHAN SOAL", description: "Buat, import, dan kelola soal quiz." },
    hasilbelajar: { title: "Hasil Belajar", eyebrow: "AKTIVITAS BELAJAR", description: "Tinjau hasil quiz siswa." },
    kontak: { title: "Kontak", eyebrow: "KOMUNIKASI", description: "Kelola pesan yang masuk." },
  } as const;
  const heading = headings[section];
  const [data, setData] = useState<AdminData | null>(null);
  const [loadedDataEndpoint, setLoadedDataEndpoint] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingExplanationId, setEditingExplanationId] = useState<number | null>(null);
  const [questionSearch, setQuestionSearch] = useState("");
  const [selectedQuestionCategory, setSelectedQuestionCategory] = useState<string | null>(null);
  const [selectedQuestionQuiz, setSelectedQuestionQuiz] = useState<string | null>(null);
  const [materialFormat, setMaterialFormat] = useState<MaterialFormat>("markdown-editor");
  const [materialContent, setMaterialContent] = useState("");
  const [editingMaterialFormat, setEditingMaterialFormat] = useState<MaterialFormat>("application/pdf");
  const [editingMaterialContent, setEditingMaterialContent] = useState("");
  const [editingContentFormat, setEditingContentFormat] = useState<"html" | "markdown">("html");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [resultDetail, setResultDetail] = useState<ResultDetail | null>(null);
  const [essayGrades, setEssayGrades] = useState<Record<number, boolean>>({});
  const [teacherScore, setTeacherScore] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [essayQuestionType, setEssayQuestionType] = useState<"pilihan" | "essay">("pilihan");
  const [selectedResultIds, setSelectedResultIds] = useState<Set<number>>(new Set());
  const [deletingSelectedResults, setDeletingSelectedResults] = useState(false);

  async function refresh() {
    const refreshedData = await apiRequest<AdminData>(adminDataEndpoint);
    setData(refreshedData);
    setLoadedDataEndpoint(adminDataEndpoint);
    setSelectedResultIds(new Set());
  }

  async function editMaterial(item: Material) {
    if (editingMaterialId === item.id) {
      setEditingMaterialId(null);
      return;
    }

    setError("");
    try {
      const { material } = await apiRequest<{ material: Material }>(`/api/v1/admin/materials/${item.id}`);
      setEditingMaterialId(item.id);
      setEditingMaterialFormat(material.content !== null && material.content !== undefined
        ? "markdown-editor"
        : material.file_type === "text/markdown" ? "text/markdown" : "application/pdf");
      setEditingMaterialContent(material.content ?? "");
      setEditingContentFormat(material.content_format ?? "markdown");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Materi gagal dimuat untuk diedit.");
    }
  }

  async function openResultDetail(result: Result) {
    setSelectedResult(result);
    setResultDetail(null);
    setEssayGrades({});
    setTeacherScore("");
    setDetailLoading(true);
    try {
      const detail = await apiRequest<ResultDetail>(`/api/v1/admin/results/${result.id}/detail`);
      setResultDetail(detail);
      setTeacherScore(detail.result.is_graded ? String(detail.result.percent) : "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Detail hasil quiz gagal dimuat.");
    } finally {
      setDetailLoading(false);
    }
  }

  function getEssayGrade(question: ResultQuestion) {
    return essayGrades[question.id] ?? question.draft_check ?? question.teacher_check ?? null;
  }

  async function submitEssayReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedResult || !resultDetail) return;
    const answeredEssayQuestions = resultDetail.questions.filter(
      (question) => question.question_type === "essay" && Boolean(question.selected_text?.trim()),
    );
    if (answeredEssayQuestions.some((question) => getEssayGrade(question) === null)) {
      setError("Periksa semua jawaban essay dengan memilih Benar atau Salah.");
      return;
    }
    const score = Number(teacherScore);
    if (!teacherScore.trim() || !Number.isInteger(score) || score < 0 || score > 100) {
      setError("Masukkan nilai akhir berupa bilangan bulat dari 0 sampai 100.");
      return;
    }
    const grades = answeredEssayQuestions.map((question) => ({
      question_id: question.id,
      is_correct: getEssayGrade(question) === true,
    }));
    const submittedGrades = new Map(grades.map((grade) => [grade.question_id, grade.is_correct]));

    setBusy(true);
    setError("");
    try {
      const response = await apiRequest<{ success: boolean; score: number; total: number; percent: number; correct_answers: number; incorrect_answers: number; unanswered_answers: number; pending_answers: number; is_graded: boolean }>(`/api/v1/admin/results/${selectedResult.id}/detail`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percent: score,
          grades,
        }),
      });
      setData((current) => current ? {
        ...current,
        results: current.results.map((result) => result.id === selectedResult.id ? {
          ...result,
          score: response.score,
          percent: response.percent,
          correct_answers: response.correct_answers,
          incorrect_answers: response.incorrect_answers,
          unanswered_answers: response.unanswered_answers,
          pending_answers: response.pending_answers,
          is_graded: response.is_graded,
        } : result),
      } : current);
      setResultDetail((current) => current ? {
        ...current,
        result: {
          ...current.result,
          score: Number(response.score),
          correct_answers: Number(response.correct_answers),
          incorrect_answers: Number(response.incorrect_answers),
          unanswered_answers: Number(response.unanswered_answers),
          pending_answers: Number(response.pending_answers),
          is_graded: response.is_graded,
          percent: Number(response.percent),
        },
        questions: current.questions.map((question) => {
          const submittedGrade = submittedGrades.get(question.id);
          return question.question_type === "essay" && submittedGrade !== undefined
            ? { ...question, teacher_check: submittedGrade, draft_check: submittedGrade, is_correct: submittedGrade, status: submittedGrade ? "correct" : "incorrect" }
            : question;
        }),
      } : current);
      setTeacherScore(String(response.percent));
      setEssayGrades({});
      setNotice("Nilai dan hasil pemeriksaan essay berhasil dikirim ke akun siswa.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Penilaian essay gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!isResultsSection) return;
    const todaySegment = formatRouteDate(new Date());
    if (!resultDateSegment) {
      router.replace(`/admin/hasilbelajar/${todaySegment}`);
      return;
    }
    if (!selectedResultDate) {
      router.replace(`/admin/hasilbelajar/${todaySegment}`);
      return;
    }
    const redirectDate = searchParams.get("redirect");
    if (redirectDate !== null) {
      if (parseRouteDate(redirectDate)) router.replace(`/admin/hasilbelajar/${redirectDate}`);
      else {
        router.replace(`/admin/hasilbelajar/${resultDateSegment}`);
      }
    }
  }, [isResultsSection, pathname, resultDateSegment, router, searchParams, selectedResultDate]);

  useEffect(() => {
    if (isResultsSection && !selectedResultDate) return;
    let active = true;
    Promise.all([apiRequest<AdminData>(adminDataEndpoint), apiRequest<{ user: User }>("/api/v1/auth/me")]).then(([adminData, session]) => {
      if (!active) return;
      setData(adminData);
      setLoadedDataEndpoint(adminDataEndpoint);
      setUserId(session.user.id);
    }).catch((requestError) => {
      if (!active) return;
      if ((requestError as { status?: number }).status === 401) router.replace("/login");
      else if ((requestError as { status?: number }).status === 403) router.replace("/dashboard");
      else setError(requestError instanceof Error ? requestError.message : "Panel admin gagal dimuat.");
    });
    return () => {
      active = false;
    };
  }, [adminDataEndpoint, isResultsSection, router, selectedResultDate]);

  async function submit(event: FormEvent<HTMLFormElement>, endpoint: string, method = "POST") {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let body: Record<string, unknown> = Object.fromEntries(fields.entries());
      const isMaterialMutation = endpoint === "/api/v1/admin/materials" || endpoint.startsWith("/api/v1/admin/materials/");
      if (isMaterialMutation) {
        const file = fields.get("material_file");
        const hasReplacementFile = file instanceof File && file.size > 0;
        const isCreate = endpoint === "/api/v1/admin/materials";
        const format = fields.get("material_format");
        const isEditor = format === "markdown-editor";
        const fileType = format === "text/markdown" || isEditor ? "text/markdown" : "application/pdf";
        const maximumSize = fileType === "application/pdf" ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
        body = {
          title: fields.get("title"),
          category: fields.get("category"),
          description: fields.get("description"),
          youtube_url: fields.get("youtube_url"),
          file_type: fileType,
          material_source: isEditor ? "editor" : "file",
        };
        if (isEditor) {
          const content = fields.get("material_content");
          if (typeof content !== "string" || !content.trim()) throw new Error("Isi materi Markdown wajib diisi.");
          if (new TextEncoder().encode(content).byteLength > maximumSize) throw new Error("Isi materi Markdown maksimal 5 MB.");
          body = { ...body, content };
        } else {
          if (!hasReplacementFile && isCreate) throw new Error("Pilih file materi terlebih dahulu.");
          if (hasReplacementFile) {
            const validFile = fileType === "application/pdf"
              ? file.type === "application/pdf" && file.name.toLowerCase().endsWith(".pdf")
              : file.name.toLowerCase().endsWith(".md");
            if (!validFile || file.size > maximumSize) throw new Error(fileType === "application/pdf" ? "Pilih PDF valid dengan ukuran maksimal 25 MB." : "Pilih file Markdown .md dengan ukuran maksimal 5 MB.");
            const name = file.name.replace(/[^a-zA-Z0-9._-]/g, "").slice(-100) || (fileType === "application/pdf" ? "material.pdf" : "material.md");
            if (!userId) throw new Error("Sesi admin tidak ditemukan. Silakan masuk kembali.");
            const uploadFile = fileType === "text/markdown" ? new File([file], name, { type: "text/markdown" }) : file;
            const blob = await uploadBlob(`materials/${userId}/${Date.now()}-${name}`, uploadFile, { access: "public", handleUploadUrl: "/api/v1/blob-upload", clientPayload: JSON.stringify({ purpose: "material" }), multipart: fileType === "application/pdf" && file.size > 10 * 1024 * 1024 });
            body = { ...body, file_path: blob.url, file_size: file.size };
          }
        }
      }
      await apiRequest(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setNotice("Perubahan berhasil disimpan.");
      form.reset();
      if (endpoint.startsWith("/api/v1/admin/categories/")) setEditingCategoryId(null);
      if (endpoint.startsWith("/api/v1/admin/questions/")) setEditingExplanationId(null);
      if (endpoint === "/api/v1/admin/materials") { setMaterialFormat("markdown-editor"); setMaterialContent(""); }
      if (endpoint.startsWith("/api/v1/admin/materials/")) { setEditingMaterialId(null); setEditingMaterialFormat("application/pdf"); setEditingMaterialContent(""); setEditingContentFormat("html"); }
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Perubahan gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(endpoint: string) {
    if (!window.confirm("Yakin ingin menghapus data ini?")) return;
    try {
      await apiRequest(endpoint, { method: "DELETE" });
      setNotice("Data berhasil dihapus.");
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Data gagal dihapus.");
    }
  }

  async function deleteSelectedResults() {
    const resultIds = Array.from(selectedResultIds);
    if (!resultIds.length) return;
    const confirmed = window.confirm(`Yakin ingin menghapus ${resultIds.length} hasil belajar beserta detail jawabannya? Data yang dihapus tidak dapat dipulihkan.`);
    if (!confirmed) return;

    setDeletingSelectedResults(true);
    setError("");
    setNotice("");
    try {
      const response = await apiRequest<{ deleted: number }>("/api/v1/admin/results/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: resultIds }),
      });
      await refresh();
      setNotice(`${response.deleted} hasil belajar berhasil dihapus.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Hasil belajar yang dipilih gagal dihapus.");
    } finally {
      setDeletingSelectedResults(false);
    }
  }

  async function markRead(id: number) {
    try {
      await apiRequest(`/api/v1/admin/contacts/${id}`, { method: "PATCH" });
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Kontak gagal diperbarui.");
    }
  }

  async function previewImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("quiz_file");
    if (!(file instanceof File) || !file.size) {
      setError("Pilih file CSV, JSON, atau XLSX terlebih dahulu.");
      return;
    }
    setImportBusy(true);
    setError("");
    setNotice("");
    setImportFile(file);
    try {
      const body = new FormData();
      body.append("file", file);
      setImportPreview(await apiRequest<ImportPreview>("/api/v1/admin/questions/import/preview", { method: "POST", body }));
    } catch (requestError) {
      setImportPreview(null);
      setError(requestError instanceof Error ? requestError.message : "File import gagal dibaca.");
    } finally {
      setImportBusy(false);
    }
  }

  async function confirmImport() {
    if (!importFile || !importPreview || importPreview.errors.length) return;
    setImportBusy(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.append("file", importFile);
      const result = await apiRequest<{ imported: number }>("/api/v1/admin/questions/import", { method: "POST", body });
      setNotice(`${result.imported} soal berhasil diimport.`);
      setImportFile(null);
      setImportPreview(null);
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Import soal gagal.");
    } finally {
      setImportBusy(false);
    }
  }

  if (!data || loadedDataEndpoint !== adminDataEndpoint) return <div className="page-loading">Memuat panel admin...</div>;

  const unreadContacts = data.contacts.filter((contact) => contact.status === "unread").length;
  const registrationDays = data.overview.registrations;
  const maxRegistrations = Math.max(1, ...registrationDays.map((day) => Number(day.total)));
  const datedResults = data.results.flatMap((result) => {
    const date = resultDate(result);
    return date ? [{ result, date }] : [];
  });
  const materialCategories = [...new Set(data.materials.map((material) => material.category.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id"));
  const quizGroups = [...new Set(data.categories.map((category) => category.material_category || category.name))];
  const slugify = (value: string) => value.toLocaleLowerCase("id-ID").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
  const quizSlug = (category: Category) => `${slugify(category.material_category || category.name)}/${slugify(category.name)}`;
  const selectedQuiz = selectedQuestionQuiz === null ? null : data.categories.find((category) => quizSlug(category) === selectedQuestionQuiz) ?? null;
  const filteredQuestions = data.questions.filter((question) =>
    question.question.toLocaleLowerCase("id-ID").includes(questionSearch.trim().toLocaleLowerCase("id-ID")),
  );
  const filteredResults = datedResults
    .filter(({ date }) => selectedResultDate !== null && dateKey(date) === selectedResultDate)
    .map(({ result }) => result);
  const allVisibleResultsSelected = filteredResults.length > 0 && filteredResults.every((result) => selectedResultIds.has(result.id));
  const resultsByDate = new Map<string, Result[]>();
  for (const result of filteredResults) {
    const date = resultDate(result);
    if (!date) continue;
    const key = dateKey(date);
    const dateResults = resultsByDate.get(key) ?? [];
    dateResults.push(result);
    resultsByDate.set(key, dateResults);
  }
  const detailQuestions = resultDetail?.questions ?? [];
  const answeredEssayQuestions = detailQuestions.filter(
    (question) => question.question_type === "essay" && Boolean(question.selected_text?.trim()),
  );
  const pendingEssayCount = answeredEssayQuestions.filter((question) => getEssayGrade(question) === null).length;
  const detailCorrectCount = detailQuestions.filter((question) =>
    question.question_type === "essay" ? getEssayGrade(question) === true : question.selected_index !== null && question.is_correct,
  ).length;
  const detailIncorrectCount = detailQuestions.filter((question) =>
    question.question_type === "essay" ? getEssayGrade(question) === false : question.selected_index !== null && !question.is_correct,
  ).length;
  const detailUnansweredCount = detailQuestions.filter((question) =>
    question.question_type === "essay" ? !question.selected_text?.trim() : question.selected_index === null,
  ).length;

  return <div className="admin-page">
    <header className="page-heading admin-heading">
      <span className="eyebrow">{heading.eyebrow}</span>
      <h1 className="page-title">{heading.title}</h1>
      <p className="page-intro">{heading.description}</p>
    </header>
    {notice && <p className="status" role="status">{notice}</p>}
    {error && <p className="status status-error" role="alert">{error}</p>}

    {section === "dashboard" && <>
      <StaggerGroup className="grid-four admin-metrics" aria-label="Ringkasan analisis CourseUp">
        <StaggerItem className="admin-metric-item"><div className="metric"><div className="metric-value">{data.overview.total_students}</div><div className="metric-label"><UsersRound size={14} />Total siswa</div></div></StaggerItem>
        <StaggerItem className="admin-metric-item"><div className="metric"><div className="metric-value">{data.overview.joined_today}</div><div className="metric-label">Pendaftar hari ini</div></div></StaggerItem>
        <StaggerItem className="admin-metric-item"><div className="metric"><div className="metric-value">{data.overview.active_today}</div><div className="metric-label"><Activity size={14} />Akses materi hari ini</div></div></StaggerItem>
        <StaggerItem className="admin-metric-item"><div className="metric"><div className="metric-value">{data.overview.quiz_30d.attempts}</div><div className="metric-label"><ChartNoAxesColumn size={14} />Percobaan quiz · 30 hari</div></div></StaggerItem>
      </StaggerGroup>
      <div className="admin-analytics-grid">
        <section className="surface surface-pad admin-section"><div className="admin-section-heading"><div><span className="list-meta">PERTUMBUHAN SISWA</span><h2 className="surface-title">Pendaftar · 7 hari terakhir</h2></div><span className="admin-count">{registrationDays.reduce((total, day) => total + Number(day.total), 0)} siswa</span></div>{registrationDays.length ? <div className="admin-trend-chart" role="img" aria-label="Grafik pendaftar selama tujuh hari terakhir">{registrationDays.map((day) => <div className="admin-trend-day" key={day.date}><strong>{day.total}</strong><span className="admin-trend-track"><i style={{ height: `${Math.max(6, Math.round((Number(day.total) / maxRegistrations) * 100))}%` }} /></span><small>{day.date.slice(5)}</small></div>)}</div> : <p className="empty-state">Belum ada pendaftar dalam tujuh hari terakhir.</p>}</section>
        <section className="surface surface-pad admin-section"><div className="admin-section-heading"><div><span className="list-meta">AKTIVITAS BELAJAR</span><h2 className="surface-title">Siswa hari ini</h2></div><span className="admin-count">{data.overview.active_students.length} nama</span></div>{data.overview.active_students.length ? data.overview.active_students.map((student) => <div className="list-row admin-active-row" key={student.id}><div><div className="list-title">{student.full_name || student.username}</div><div className="list-meta">@{student.username}</div></div><span className="admin-count">{new Date(student.last_active).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span></div>) : <p className="empty-state">Belum ada siswa yang membuka materi hari ini.</p>}<div className="admin-quiz-summary"><strong>Analisis quiz · 30 hari</strong><span>Rata-rata nilai: {data.overview.quiz_30d.average_percent}%</span><span>Nilai ≥ 70%: {data.overview.quiz_30d.passed}</span></div></section>
      </div>
    </>}

    <Reveal className="admin-layout-reveal"><div className="admin-sections">
        <section className="surface surface-pad admin-section" id="materials" hidden={section !== "materi"}>
          <div className="admin-section-heading"><div><span className="list-meta">KONTEN</span><h2 className="surface-title">Materi belajar</h2></div><span className="admin-count">{data.materials.length} materi</span></div>
          <form className="form-grid admin-form" onSubmit={(event) => void submit(event, "/api/v1/admin/materials")}>
            <label className="field"><span>Judul</span><input className="input" name="title" required /></label>
            <label className="field"><span>Kategori</span><input className="input" name="category" required /></label>
            <label className="field form-span"><span>Format materi</span><select className="select" name="material_format" value={materialFormat} onChange={(event) => setMaterialFormat(getMaterialFormat(event.target.value))}><option value="markdown-editor">Editor teks</option><option value="application/pdf">Unggah PDF</option><option value="text/markdown">Unggah Markdown (.md)</option></select></label>
            <label className="field form-span"><span>Deskripsi</span><textarea className="textarea" name="description" /></label>
            {materialFormat === "markdown-editor" ? (
              <div className="field form-span"><span>Isi materi</span><MarkdownEditor name="material_content" value={materialContent} onChange={setMaterialContent} /></div>
            ) : (
              <label className="field form-span"><span>File materi · {materialFormat === "application/pdf" ? "maksimal 25 MB" : "maksimal 5 MB"}</span><input className="input" name="material_file" type="file" accept={materialFormat === "application/pdf" ? ".pdf,application/pdf" : ".md,text/markdown,text/plain"} required /></label>
            )}
            <label className="field form-span"><span>URL video YouTube · opsional</span><input className="input" name="youtube_url" type="url" placeholder="https://youtu.be/..." /></label>
            <div className="admin-form-action"><MotionButton className="button button-primary" disabled={busy}>Tambah Materi</MotionButton></div>
          </form>
          {data.materials.length ? <div className="admin-material-list">{data.materials.map((item) => <article className="admin-material-item" key={item.id}>
            <div className="admin-material-summary"><div className="admin-material-info"><div className="list-title">{item.title}</div><div className="list-meta">{item.category} · {item.is_editor_content ? "Editor teks" : item.file_type === "text/markdown" ? "Markdown (.md)" : "PDF"} · {item.file_size ? `${(item.file_size / (1024 * 1024)).toFixed(1)} MB` : "-"}{item.youtube_embed_url ? " · Video YouTube" : ""}</div></div><div className="admin-row-actions"><MotionButton type="button" className="button button-secondary button-small" aria-expanded={editingMaterialId === item.id} onClick={() => void editMaterial(item)}><Pencil size={14} />Edit</MotionButton><MotionButton type="button" className="button button-danger button-small" onClick={() => void remove(`/api/v1/admin/materials/${item.id}`)}><Trash2 size={14} />Hapus</MotionButton></div></div>
            {editingMaterialId === item.id && <form className="admin-material-editor" onSubmit={(event) => void submit(event, `/api/v1/admin/materials/${item.id}`, "PUT")}>
              <label className="field"><span>Judul materi</span><input className="input" name="title" defaultValue={item.title} required maxLength={255} /></label>
              <label className="field"><span>Kategori</span><input className="input" name="category" defaultValue={item.category} required maxLength={100} /></label>
              <label className="field form-span"><span>Format materi</span><select className="select" name="material_format" value={editingMaterialFormat} onChange={(event) => setEditingMaterialFormat(getMaterialFormat(event.target.value))}><option value="markdown-editor">Editor teks</option><option value="application/pdf">Unggah PDF</option><option value="text/markdown">Unggah Markdown (.md)</option></select></label>
              <label className="field form-span"><span>Deskripsi</span><textarea className="textarea" name="description" defaultValue={item.description ?? ""} maxLength={10000} /></label>
              {editingMaterialFormat === "markdown-editor" ? (
                <div className="field form-span"><span>Isi materi</span><MarkdownEditor name="material_content" value={editingMaterialContent} contentFormat={editingContentFormat} onChange={setEditingMaterialContent} /></div>
              ) : (
                <label className="field form-span"><span>Ganti file · opsional · {editingMaterialFormat === "application/pdf" ? "maksimal 25 MB" : "maksimal 5 MB"}</span><input className="input" name="material_file" type="file" accept={editingMaterialFormat === "application/pdf" ? ".pdf,application/pdf" : ".md,text/markdown,text/plain"} /></label>
              )}
              <label className="field form-span"><span>URL video YouTube · opsional</span><input className="input" name="youtube_url" type="url" defaultValue={item.youtube_embed_url ?? ""} placeholder="https://youtu.be/..." /></label>
              <div className="admin-material-editor-actions"><MotionButton className="button button-primary" disabled={busy}><Save size={14} />Simpan perubahan</MotionButton><MotionButton type="button" className="button button-secondary" onClick={() => setEditingMaterialId(null)}><X size={14} />Batal</MotionButton></div>
            </form>}
          </article>)}</div> : <p className="empty-state">Belum ada materi yang ditambahkan.</p>}
        </section>

        <div className={`grid-two admin-grid ${section === "quiz" || section === "soal" ? "admin-grid-single" : ""}`} id="quiz" hidden={section !== "quiz" && section !== "soal"}>
          <section className="surface surface-pad admin-section" hidden={section !== "quiz"}>
            <div className="admin-section-heading"><div><span className="list-meta">PENGELOMPOKAN</span><h2 className="surface-title">Quiz berdasarkan kategori materi</h2></div><span className="admin-count">{data.categories.length} quiz</span></div>
            <form className="admin-category-form admin-inline-form" onSubmit={(event) => void submit(event, "/api/v1/admin/categories")}>
              <label className="field"><span>Kategori Materi Belajar</span><select className="select" name="material_category" required defaultValue=""><option value="" disabled>Pilih kategori materi</option>{materialCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
              <label className="field"><span>Judul quiz</span><input className="input" name="category_name" placeholder="Contoh: Web Frontend" maxLength={150} required /></label>
              <label className="field form-span"><span>Deskripsi quiz</span><textarea className="textarea" name="description" maxLength={10000} placeholder="Jelaskan materi yang akan dilatih." /></label>
              <label className="field"><span>Menit</span><input className="input" name="time_limit_minutes" type="number" min="1" max="1440" defaultValue="30" required /></label>
              <label className="field"><span>Jenis soal</span><select className="select" name="question_type" defaultValue="pilihan"><option value="pilihan">Pilihan ganda</option><option value="essay">Essay</option></select></label>
              <MotionButton className="button button-primary button-small" disabled={busy || materialCategories.length === 0}>Tambah quiz</MotionButton>
            </form>
            {!materialCategories.length && <p className="empty-state">Tambahkan kategori pada Materi Belajar terlebih dahulu untuk membuat quiz.</p>}
            {data.categories.length ? quizGroups.map((group) => <div className="admin-quiz-group" key={group}>
              <h3 className="surface-title">{group}</h3>
              {data.categories.filter((category) => (category.material_category || category.name) === group).map((category) => <article className="admin-question-item" key={category.id}>
                <div className="list-row"><div><div className="list-title">{category.name}</div><div className="list-meta">{category.questions_count} soal · {category.question_type === "essay" ? "Essay" : "Pilihan ganda"} · {category.time_limit_minutes ? `${category.time_limit_minutes} menit` : "Tanpa timer"}</div>{category.description && <p className="page-intro">{category.description}</p>}</div><div className="admin-row-actions"><MotionButton type="button" className="button button-secondary button-small" aria-expanded={editingCategoryId === category.id} onClick={() => setEditingCategoryId(editingCategoryId === category.id ? null : category.id)}><Pencil size={14} />Edit quiz</MotionButton><MotionButton type="button" className="button button-danger button-small" onClick={() => void remove(`/api/v1/admin/categories/${category.id}`)}><Trash2 size={14} />Hapus</MotionButton></div></div>
                {editingCategoryId === category.id && <form className="admin-inline-form" onSubmit={(event) => void submit(event, `/api/v1/admin/categories/${category.id}`, "PUT")}>
                  <label className="field"><span>Kategori Materi Belajar</span><select className="select" name="material_category" defaultValue={category.material_category ?? ""}><option value="">Quiz lama · belum dikelompokkan</option>{materialCategories.map((materialCategory) => <option key={materialCategory} value={materialCategory}>{materialCategory}</option>)}</select></label>
                  <label className="field"><span>Judul quiz</span><input className="input" name="category_name" defaultValue={category.name} maxLength={150} required /></label>
                  <label className="field form-span"><span>Deskripsi quiz</span><textarea className="textarea" name="description" defaultValue={category.description ?? ""} maxLength={10000} /></label>
                  <label className="field"><span>Durasi dalam menit · kosongkan untuk tanpa timer</span><input className="input" name="time_limit_minutes" type="number" min="1" max="1440" defaultValue={category.time_limit_minutes ?? ""} /></label>
                  <label className="field"><span>Jenis soal</span><select className="select" name="question_type" defaultValue={category.question_type ?? "pilihan"}><option value="pilihan">Pilihan ganda</option><option value="essay">Essay</option></select></label>
                  <MotionButton className="button button-primary button-small" disabled={busy}><Save size={14} />Simpan</MotionButton>
                </form>}
              </article>)}
            </div>) : <p className="empty-state">Belum ada quiz. Buat quiz di atas, lalu tambahkan soal melalui halaman Quiz.</p>}
          </section>
          <section className="surface surface-pad admin-section" hidden={section !== "soal"}>
            <div className="admin-section-heading"><div><span className="list-meta">KONTEN BARU</span><h2 className="surface-title">Buat soal</h2></div></div>
            <form className="stack admin-form" onSubmit={(event) => void submit(event, "/api/v1/admin/questions")}>
              <label className="field"><span>Quiz</span><select className="select" name="category_id" required defaultValue=""><option value="" disabled>Pilih quiz</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.material_category ? `${category.material_category} — ` : "Quiz lama — "}{category.name}</option>)}</select></label>
              <label className="field"><span>Jenis soal</span><select className="select" name="question_type" value={essayQuestionType} onChange={(event) => setEssayQuestionType(event.target.value === "essay" ? "essay" : "pilihan")}><option value="pilihan">Pilihan ganda</option><option value="essay">Essay</option></select></label>
              <label className="field"><span>Pertanyaan</span><textarea className="textarea" name="question" required /></label>
              {essayQuestionType === "pilihan" ? <>
                <div className="form-grid">{(["a", "b", "c", "d"] as const).map((letter) => <label className="field" key={letter}><span>Opsi {letter.toUpperCase()}</span><input className="input" name={`option_${letter}`} required /></label>)}</div>
                <label className="field"><span>Jawaban benar</span><select className="select" name="answer_index"><option value="0">Jawaban A</option><option value="1">Jawaban B</option><option value="2">Jawaban C</option><option value="3">Jawaban D</option></select></label>
              </> : <div className="surface surface-pad" style={{ padding: "0.75rem 1rem" }}><p className="page-intro">Soal essay tidak memerlukan opsi jawaban. Guru akan menilai jawaban siswa di detail hasil belajar.</p></div>}
              <label className="field"><span>Alasan jawaban yang benar</span><textarea className="textarea" name="explanation" maxLength={10000} /></label>
              <MotionButton className="button button-primary" disabled={busy}>Simpan Soal</MotionButton>
            </form>
          </section>
        </div>

        <section className="surface surface-pad admin-section" id="quiz-import" hidden={section !== "soal"}>
          <div className="admin-section-heading"><div><span className="list-meta">IMPORT MASSAL</span><h2 className="surface-title"><FileSpreadsheet size={16} /> Import soal dari file</h2></div><span className="admin-count">CSV · JSON · XLSX</span></div>
          <p className="page-intro">Kolom category pada CSV/XLSX berisi judul quiz, bukan kategori materi. Tambahkan kolom material_category bila ada judul quiz yang sama di beberapa kategori. Untuk JSON, objek pertama dapat berisi category (judul quiz), material_category, description, time, dan jenis-soal; quiz dibuat atau diperbarui untuk semua soal berikutnya. Jawaban dapat ditulis A-D atau 0-3. Maksimal 1.000 soal.</p>
          <form className="admin-import-form" onSubmit={(event) => void previewImport(event)}>
            <label className="field"><span>File bank soal</span><input className="input" name="quiz_file" type="file" accept=".csv,.json,.xlsx,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /></label>
            <MotionButton className="button button-secondary" disabled={importBusy}><FileSpreadsheet size={14} />{importBusy ? "Membaca file..." : "Preview file"}</MotionButton>
          </form>
          {importPreview && <div className="admin-import-preview" aria-live="polite">
            <div className="admin-import-summary"><strong>{importPreview.validRows}/{importPreview.totalRows} baris siap diimport</strong><span>{importPreview.errors.length ? `${importPreview.errors.length} error ditemukan` : "Semua baris valid"}</span></div>
            {importPreview.errors.length > 0 && <div className="admin-import-errors" role="alert">{importPreview.errors.map((item, index) => <p key={`${item.rowNumber}-${index}`}>Baris {item.rowNumber || "file"}: {item.message}</p>)}</div>}
            {importPreview.rows.length > 0 && <div className="admin-import-sample"><span className="list-meta">CONTOH BARIS VALID</span>{importPreview.rows.map((row) => <div className="list-row" key={row.rowNumber}><div><div className="list-title">Baris {row.rowNumber} · {row.category}</div><div className="list-meta">{row.question}</div></div><strong>{String.fromCharCode(65 + row.answer_index)}</strong></div>)}</div>}
            <MotionButton type="button" className="button button-primary" disabled={importBusy || importPreview.errors.length > 0 || !importFile} onClick={() => void confirmImport()}>Import {importPreview.validRows} soal</MotionButton>
          </div>}
        </section>

        <section className="surface surface-pad admin-section" id="questions" hidden={section !== "soal"}>
          <div className="admin-section-heading"><div><span className="list-meta">BANK KONTEN</span><h2 className="surface-title">Soal quiz</h2></div><span className="admin-count">{filteredQuestions.length} dari {data.questions.length} soal</span></div>
          <div className="quiz-question-filters"><label className="field"><span>Cari judul soal</span><input className="input" value={questionSearch} onChange={(event) => setQuestionSearch(event.target.value)} placeholder="Ketik kata pada pertanyaan..." /></label></div>
          {selectedQuestionCategory === null ? <div className="admin-quiz-card-grid">{quizGroups.map((group) => {
            const groupQuizzes = data.categories.filter((category) => (category.material_category || category.name) === group);
            return <button className="admin-quiz-category-card admin-quiz-category-button" type="button" key={group} onClick={() => { setSelectedQuestionCategory(group); setSelectedQuestionQuiz(null); }}><span className="list-meta">KATEGORI</span><strong>{group}</strong><span>{groupQuizzes.length} quiz <span aria-hidden="true">→</span></span></button>;
          })}</div> : (() => {
            const groupQuizzes = data.categories.filter((category) => (category.material_category || category.name) === selectedQuestionCategory);
            return <div className="admin-quiz-question-panel"><div className="admin-quiz-question-toolbar"><div><button className="admin-quiz-back" type="button" onClick={() => { setSelectedQuestionCategory(null); setSelectedQuestionQuiz(null); }}>← Semua kategori</button><div className="list-meta">KATEGORI · {selectedQuestionCategory}</div></div>{selectedQuestionQuiz !== null && <label className="field"><span>Quiz</span><select className="select" value={selectedQuestionQuiz} onChange={(event) => setSelectedQuestionQuiz(event.target.value || null)}><option value="">Semua quiz kategori ini</option>{groupQuizzes.map((category) => <option key={category.id} value={quizSlug(category)}>{quizSlug(category)} · {category.name}</option>)}</select></label>}</div>
            {selectedQuestionQuiz === null ? <div className="admin-quiz-card-grid">{groupQuizzes.map((category) => <button className="admin-quiz-card" type="button" key={category.id} onClick={() => router.push(`/admin/soal/${quizSlug(category)}/edit`)}><span><strong>{category.name}</strong><small>{category.description || "Atur konfigurasi dan soal quiz"}</small></span><span className="admin-quiz-card-count">{data.questions.filter((question) => question.category_id === category.id).length} soal · Edit →</span></button>)}</div> : <><div className="list-meta admin-selected-quiz-title">{selectedQuiz?.material_category || selectedQuestionCategory} · {selectedQuiz?.name}</div>
          {filteredQuestions.filter((question) => question.category_id === selectedQuiz?.id).map((question) => <article className="admin-question-item" key={question.id}>
            <div className="list-row"><div className="admin-question-copy"><div className="list-meta">{question.material_category || "Quiz lama"} · {question.quiz_title}</div><span className="list-title">{question.question}</span></div><div className="admin-row-actions">
              <MotionButton type="button" className="button button-secondary button-small" aria-expanded={editingExplanationId === question.id} onClick={() => setEditingExplanationId(editingExplanationId === question.id ? null : question.id)}><Pencil size={14} />{question.explanation ? "Edit alasan" : "Tambah alasan"}</MotionButton>
              <MotionButton type="button" className="button button-danger button-small" onClick={() => void remove(`/api/v1/admin/questions/${question.id}`)}><Trash2 size={14} />Hapus</MotionButton>
            </div></div>
            {editingExplanationId === question.id && <form className="admin-inline-form" onSubmit={(event) => void submit(event, `/api/v1/admin/questions/${question.id}`, "PATCH")}>
              <label className="field"><span>Alasan jawaban{question.answer_index === null ? "" : ` ${String.fromCharCode(65 + question.answer_index)}`} yang benar</span><textarea className="textarea" name="explanation" defaultValue={question.explanation ?? ""} maxLength={10000} /></label>
              <div className="admin-row-actions"><MotionButton className="button button-primary button-small" disabled={busy}><Save size={14} />Simpan alasan</MotionButton><MotionButton type="button" className="button button-secondary button-small" onClick={() => setEditingExplanationId(null)}>Batal</MotionButton></div>
            </form>}
          </article>)}{!filteredQuestions.some((question) => question.category_id === selectedQuiz?.id) && <p className="empty-state">Belum ada soal pada quiz ini.</p>}</>}</div>;
          })()}
        </section>

        <section className="surface surface-pad admin-section" id="results" hidden={section !== "hasilbelajar"}>
          <div className="admin-section-heading"><div><span className="list-meta">AKTIVITAS</span><h2 className="surface-title">Hasil belajar{selectedResultDate ? ` · ${new Date(`${selectedResultDate}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}` : ""}</h2></div><span className="admin-count">{filteredResults.length} hasil</span></div>
          <div className="result-date-filters" aria-label="Filter tanggal hasil belajar">
            <label><span>Pilih tanggal hasil belajar</span><input className="input" aria-label="Pilih tanggal hasil belajar" type="date" value={selectedResultDate ?? ""} onChange={(event) => {
              const nextDate = event.target.value;
              if (!nextDate) return;
              const currentSegment = resultDateSegment ?? formatRouteDate(new Date());
              setSelectedResultIds(new Set());
              router.push(`/admin/hasilbelajar/${currentSegment}?redirect=${formatDateSegment(nextDate)}`);
            }} /></label>
            <p className="result-date-help">Pilih satu tanggal untuk melihat hasil belajar pada hari tersebut.</p>
          </div>
          {filteredResults.length > 0 && <div className="result-selection-toolbar">
            <label className="result-select-all"><input type="checkbox" checked={allVisibleResultsSelected} onChange={(event) => {
              const visibleIds = filteredResults.map((result) => result.id);
              setSelectedResultIds((current) => {
                const next = new Set(current);
                if (event.target.checked) visibleIds.forEach((id) => next.add(id));
                else visibleIds.forEach((id) => next.delete(id));
                return next;
              });
            }} /><span>Pilih semua hasil yang tampil</span></label>
            {selectedResultIds.size > 0 && <div className="result-selection-actions">
              <span>{selectedResultIds.size} dipilih</span>
              <MotionButton type="button" className="button button-danger button-small" onClick={() => void deleteSelectedResults()} disabled={deletingSelectedResults}>
                <Trash2 size={14} />{deletingSelectedResults ? "Menghapus..." : `Hapus yang dipilih (${selectedResultIds.size})`}
              </MotionButton>
            </div>}
          </div>}
          {filteredResults.length ? Array.from(resultsByDate, ([key, results]) => {
            const [year, month, day] = key.split("-").map(Number);
            const heading = new Date(year, month - 1, day).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
            return <div className="result-month-group" key={key}>
            <h3 className="result-month-heading"><CalendarDays size={15} />{heading}<span>{results.length} hasil</span></h3>
            {results.map((result) => <article className="result-card" key={result.id}>
              <label className="result-card-select"><input type="checkbox" checked={selectedResultIds.has(result.id)} onChange={(event) => setSelectedResultIds((current) => {
                const next = new Set(current);
                if (event.target.checked) next.add(result.id);
                else next.delete(result.id);
                return next;
              })} /><span>Pilih hasil ini</span></label>
              <div className="result-card-category"><span>Kategori quiz</span><strong>{result.category_name || "Kategori tidak tersedia"}</strong></div>
              <div className="result-card-main">
                <div className="result-card-user"><strong>{result.full_name || result.username || "Pengguna"}</strong><span>@{result.username || "pengguna"}</span></div>
                <div className="result-card-metric"><span>Nilai</span><strong>{result.is_graded ? `${result.percent}%` : "Menunggu"}</strong></div>
                <div className="result-card-metric"><span>Benar</span><strong className="result-correct">{result.correct_answers}</strong></div>
                <div className="result-card-metric"><span>Salah</span><strong className="result-incorrect">{result.incorrect_answers}</strong></div>
                <div className="result-card-metric"><span>Belum diperiksa</span><strong>{result.pending_answers}</strong></div>
                <div className="result-card-metric"><span>Kosong</span><strong>{result.unanswered_answers}</strong></div>
                <div className="result-card-time"><span><Clock3 size={13} /> {formatDuration(result.duration_seconds)}</span><span><CalendarDays size={13} /> {formatDate(result.submitted_at || result.created_at)}</span></div>
              </div>
              <div className="result-card-actions">
                <span className="result-time-label"><Clock3 size={13} /> Mulai: {formatTime(result.started_at)}</span>
                <span className="result-time-label"><CheckCircle2 size={13} /> Selesai: {formatTime(result.submitted_at)}</span>
                <MotionButton type="button" className="button button-secondary button-small" onClick={() => void openResultDetail(result)}><Eye size={14} />Detail jawaban</MotionButton>
                <MotionButton type="button" className="button button-danger button-small" onClick={() => void remove(`/api/v1/admin/results/${result.id}`)}><Trash2 size={14} />Hapus</MotionButton>
              </div>
            </article>)}
          </div>;
          }) : <p className="empty-state">{selectedResultDate ? `Belum ada hasil quiz pada tanggal ${new Date(`${selectedResultDate}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.` : "Memuat hasil belajar..."}</p>}
        </section>

        {selectedResult && <div className="result-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedResult(null); }}>
          <section className="result-modal" role="dialog" aria-modal="true" aria-labelledby="result-detail-title">
            <header className="result-modal-header">
              <div><span className="list-meta">DETAIL HASIL BELAJAR</span><h2 id="result-detail-title">{selectedResult.full_name || selectedResult.username || "Pengguna"}</h2></div>
              <MotionButton type="button" className="button button-secondary button-small" onClick={() => setSelectedResult(null)}><X size={14} />Tutup</MotionButton>
            </header>
            {detailLoading ? <div className="result-detail-loading">Memuat detail jawaban...</div> : resultDetail ? <>
              <div className="result-detail-summary">
                <div><span>Nilai akhir</span><strong>{!resultDetail.questions.some((question) => question.question_type === "essay") || resultDetail.result.is_graded ? `${teacherScore || resultDetail.result.percent}%` : "Belum dikirim"}</strong></div>
                <div><span>Benar</span><strong className="result-correct">{detailCorrectCount}</strong></div>
                <div><span>Salah</span><strong className="result-incorrect">{detailIncorrectCount}</strong></div>
                <div><span>Belum diperiksa</span><strong>{pendingEssayCount}</strong></div>
                <div><span>Tidak dijawab</span><strong>{detailUnansweredCount}</strong></div>
                <div><span>Durasi</span><strong>{formatDuration(resultDetail.result.duration_seconds)}</strong></div>
              </div>
              <div className="result-detail-list">
                {resultDetail.questions.map((question, index) => {
                  if (question.question_type === "essay") {
                    const selectedGrade = getEssayGrade(question);
                    const hasAnswer = Boolean(question.selected_text?.trim());
                    const statusClass = !hasAnswer ? "is-unanswered" : selectedGrade === null ? "is-unanswered" : selectedGrade ? "is-correct" : "is-incorrect";
                    return <article className={`result-question ${statusClass}`} key={question.id}>
                      <div className="result-question-head"><span>Soal {index + 1}</span><strong>{!hasAnswer ? "Tidak dijawab" : selectedGrade === null ? "Belum diperiksa" : selectedGrade ? "Benar" : "Salah"}</strong></div>
                      <h3>{question.question}</h3>
                      <div className="result-essay-answer">
                        <span>Jawaban siswa</span>
                        <p>{question.selected_text || "Siswa belum mengisi jawaban essay."}</p>
                      </div>
                      <div className="result-essay-grade-actions" aria-label={`Periksa jawaban soal ${index + 1}`}>
                        <MotionButton type="button" className={`button button-small result-grade-button is-correct${selectedGrade === true ? " is-selected" : ""}`} aria-pressed={selectedGrade === true} disabled={!hasAnswer || busy} onClick={() => setEssayGrades((current) => ({ ...current, [question.id]: true }))}><CheckCircle2 size={15} />Benar</MotionButton>
                        <MotionButton type="button" className={`button button-small result-grade-button is-incorrect${selectedGrade === false ? " is-selected" : ""}`} aria-pressed={selectedGrade === false} disabled={!hasAnswer || busy} onClick={() => setEssayGrades((current) => ({ ...current, [question.id]: false }))}><XCircle size={15} />Salah</MotionButton>
                      </div>
                    </article>;
                  }

                  const selectedLabel = question.selected_index === null ? "Belum dijawab" : `Jawaban ${String.fromCharCode(65 + question.selected_index)}`;
                  const correctLabel = `Jawaban benar ${String.fromCharCode(65 + question.answer_index)}`;
                  return <article className={`result-question ${question.selected_index === null ? "is-unanswered" : question.is_correct ? "is-correct" : "is-incorrect"}`} key={question.id}>
                    <div className="result-question-head"><span>Soal {index + 1}</span><strong>{question.selected_index === null ? "Tidak dijawab" : question.is_correct ? "Benar" : "Salah"}</strong></div>
                    <h3>{question.question}</h3>
                    <div className="result-options">
                      {([question.option_a, question.option_b, question.option_c, question.option_d] as const).map((option, optionIndex) => {
                        const optionIsSelected = optionIndex === question.selected_index;
                        const optionIsCorrect = optionIndex === question.answer_index;
                        return <div className={`result-option ${optionIsCorrect ? "is-correct" : ""} ${optionIsSelected && !optionIsCorrect ? "is-incorrect" : ""}`} key={optionIndex}><span>{String.fromCharCode(65 + optionIndex)}</span><p>{option}</p>{optionIsCorrect && <CheckCircle2 size={15} />}{optionIsSelected && !optionIsCorrect && <XCircle size={15} />}</div>;
                      })}
                    </div>
                    <div className="result-answer-row"><span><CheckCircle2 size={14} /> {selectedLabel}</span><span><XCircle size={14} /> {correctLabel}</span></div>
                  </article>;
                })}
              </div>
              {resultDetail.questions.some((question) => question.question_type === "essay") && <form className="result-essay-submit" onSubmit={(event) => void submitEssayReview(event)}>
                <p>{pendingEssayCount > 0 ? `${pendingEssayCount} jawaban masih belum diperiksa. Pilih Benar atau Salah untuk setiap jawaban yang terisi.` : answeredEssayQuestions.length ? "Periksa kembali jumlah benar dan salah, lalu kirim nilai akhir ke akun siswa." : "Tidak ada jawaban essay yang terisi. Masukkan nilai akhir untuk mengirim hasil ke akun siswa."}</p>
                <div className="result-essay-submit-controls">
                  <label className="result-essay-score"><span>Nilai akhir siswa (0-100)</span><input className="input" type="number" min="0" max="100" step="1" value={teacherScore} onChange={(event) => setTeacherScore(event.target.value)} required /></label>
                  <MotionButton type="submit" className="button button-primary" disabled={busy || pendingEssayCount > 0}>{busy ? "Mengirim nilai..." : "Kirim nilai ke siswa"}</MotionButton>
                </div>
                {error && <p className="result-essay-submit-error" role="alert">{error}</p>}
              </form>}
            </> : <p className="empty-state">Tidak ada detail jawaban tersedia.</p>}
          </section>
        </div>}

        <section className="surface surface-pad admin-section" id="contacts" hidden={section !== "kontak"}>
          <div className="admin-section-heading"><div><span className="list-meta">KOMUNIKASI</span><h2 className="surface-title">Pesan masuk</h2></div><span className="admin-count">{unreadContacts} belum dibaca</span></div>
          {data.contacts.length ? data.contacts.map((contact) => <div className="list-row admin-contact-row" key={contact.id}><div className="admin-contact-copy"><div className="list-title">{contact.name} · {contact.subject}</div><div className="list-meta">{contact.email} · {new Date(contact.created_at).toLocaleString("id-ID")}</div><p className="page-intro">{contact.message}</p><span className={`admin-contact-status ${contact.status === "unread" ? "is-unread" : ""}`}>{contact.status === "unread" ? "Belum dibaca" : "Sudah dibaca"}</span></div><div className="admin-row-actions">{contact.status === "unread" && <MotionButton type="button" className="button button-secondary button-small" onClick={() => void markRead(contact.id)}><Check size={14} />Tandai dibaca</MotionButton>}<MotionButton type="button" className="button button-danger button-small" onClick={() => void remove(`/api/v1/admin/contacts/${contact.id}`)}><Trash2 size={14} />Hapus</MotionButton></div></div>) : <p className="empty-state">Belum ada pesan masuk.</p>}
        </section>
    </div></Reveal>
  </div>;
}