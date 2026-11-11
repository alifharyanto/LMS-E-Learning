"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Play, Save } from "lucide-react";
import { MotionButton } from "@/components/ui/motion";
import { apiRequest } from "@/lib/browser-api";

type Quiz = { id: number; name: string; material_category: string | null; description: string | null; time_limit_minutes: number | null; question_type: "pilihan" | "essay"; countdown_enabled: number | boolean; countdown_seconds: number };
type AdminData = { categories: Quiz[] };
type Question = { id: number; question_type: "pilihan" | "essay"; question: string; option_a: string | null; option_b: string | null; option_c: string | null; option_d: string | null; answer_index: number | null; explanation: string | null };

function slug(value: string) {
  return value.toLocaleLowerCase("id-ID").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
}

export default function EditQuizPage() {
  const params = useParams<{ categorySlug: string; quizSlug: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [questionBusy, setQuestionBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startNotice, setStartNotice] = useState("");
  const [customCountdownEnabled, setCustomCountdownEnabled] = useState(false);
  const configFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let active = true;
    apiRequest<AdminData>("/api/v1/admin").then(async ({ categories }) => {
      const match = categories.find((item) => slug(item.material_category || item.name) === params.categorySlug && slug(item.name) === params.quizSlug);
      if (!match) throw new Error("Quiz tidak ditemukan.");
      const { questions: quizQuestions } = await apiRequest<{ questions: Question[] }>(`/api/v1/admin/questions?category_id=${match.id}`);
      if (!active) return;
      setQuiz(match);
      setCustomCountdownEnabled(Boolean(Number(match.countdown_enabled)));
      setQuestions(quizQuestions);
    }).catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Quiz gagal dimuat."); });
    return () => { active = false; };
  }, [params.categorySlug, params.quizSlug]);

  async function saveQuestion(event: FormEvent<HTMLFormElement>, questionId: number) {
    event.preventDefault();
    setQuestionBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await apiRequest(`/api/v1/admin/questions/${questionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, answer_index: values.question_type === "essay" ? null : Number(values.answer_index) }) });
      setQuestions((current) => current.map((item) => item.id === questionId ? { ...item, question_type: values.question_type as Question["question_type"], question: String(values.question), option_a: String(values.option_a || ""), option_b: String(values.option_b || ""), option_c: String(values.option_c || ""), option_d: String(values.option_d || ""), answer_index: values.question_type === "essay" ? null : Number(values.answer_index), explanation: String(values.explanation) } : item));
      setEditingQuestion(null);
      setNotice("Soal berhasil diperbarui.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Soal gagal disimpan.");
    } finally {
      setQuestionBusy(false);
    }
  }

  async function deleteQuestion(questionId: number) {
    if (!window.confirm("Hapus soal ini?")) return;
    try {
      await apiRequest(`/api/v1/admin/questions/${questionId}`, { method: "DELETE" });
      setQuestions((current) => current.filter((question) => question.id !== questionId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Soal gagal dihapus.");
    }
  }

  function downloadQuestions() {
    if (!quiz) return;
    const exportData = [
      { Kategori: quiz.material_category || quiz.name, NamaSoal: quiz.name, description: quiz.description ?? "", time: quiz.time_limit_minutes ?? "", "jenis-soal": quiz.question_type },
      ...questions.map((question) => ({
        Soal: question.question,
        "jenis-soal": question.question_type,
        option_a: question.option_a ?? "",
        option_b: question.option_b ?? "",
        option_c: question.option_c ?? "",
        option_d: question.option_d ?? "",
        answer_index: question.answer_index ?? "",
        explanation: question.explanation ?? "",
      })),
    ];
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug(quiz.material_category || quiz.name)}-${slug(quiz.name)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quiz) return;
    setBusy(true);
    setError("");
    setNotice("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await apiRequest(`/api/v1/admin/categories/${quiz.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      setNotice("Konfigurasi quiz berhasil disimpan.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Konfigurasi quiz gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function startQuiz() {
    if (!quiz) return;
    const form = configFormRef.current;
    if (!form?.reportValidity()) return;
    setStarting(true);
    setError("");
    setStartNotice("");
    try {
      const values = Object.fromEntries(new FormData(form).entries());
      await apiRequest(`/api/v1/admin/categories/${quiz.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const response = await apiRequest<{ starts_in_seconds: number }>("/api/v1/admin/categories/" + quiz.id + "/start", { method: "POST" });
      setStartNotice(`Quiz dimulai untuk semua siswa dalam ${response.starts_in_seconds} detik.`);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Quiz gagal dimulai.");
    } finally {
      setStarting(false);
    }
  }

  if (!quiz) return <main className="page-shell"><div className="surface surface-pad">{error || "Memuat konfigurasi quiz..."}</div></main>;
  return <main className="page-shell">
    <section className="surface surface-pad admin-section">
      <button className="admin-quiz-back" type="button" onClick={() => router.push("/admin/soal") }><ArrowLeft size={15} /> Semua kategori quiz</button>
      <div className="admin-section-heading"><div><span className="list-meta">{quiz.material_category || quiz.name}</span><h1 className="surface-title">Edit quiz · {quiz.name}</h1></div></div>
      {error && <p className="status status-error" role="alert">{error}</p>}
      {notice && <p className="status status-success" role="status">{notice}</p>}
      <form ref={configFormRef} className="form-grid admin-form" onSubmit={(event) => void save(event)}>
        <label className="field"><span>Kategori</span><input className="input" name="material_category" defaultValue={quiz.material_category ?? quiz.name} required /></label>
        <label className="field"><span>NamaSoal</span><input className="input" name="category_name" defaultValue={quiz.name} maxLength={150} required /></label>
        <label className="field form-span"><span>Deskripsi</span><textarea className="textarea" name="description" defaultValue={quiz.description ?? ""} maxLength={10000} /></label>
        <label className="field"><span>Durasi menit</span><input className="input" name="time_limit_minutes" type="number" min="1" max="1440" defaultValue={quiz.time_limit_minutes ?? ""} /></label>
        <label className="field"><span>Jenis soal</span><select className="select" name="question_type" defaultValue={quiz.question_type}><option value="pilihan">Pilihan ganda</option><option value="essay">Essay</option></select></label>
        <label className="field"><span>Countdown kustom</span><select className="select" name="countdown_enabled" value={String(customCountdownEnabled)} onChange={(event) => setCustomCountdownEnabled(event.target.value === "true")}><option value="false">Nonaktif · gunakan default 5 detik</option><option value="true">Aktif · atur durasi</option></select></label>
        <label className="field"><span>Durasi countdown (detik)</span><input className="input" name="countdown_seconds" type="number" min="1" max="300" defaultValue={quiz.countdown_seconds || 5} disabled={!customCountdownEnabled} /></label>
        <MotionButton className="button button-primary" disabled={busy}><Save size={15} />{busy ? "Menyimpan..." : "Simpan konfigurasi"}</MotionButton>
        <MotionButton type="button" className="button button-secondary" onClick={downloadQuestions}><Download size={15} />Download soal (.json)</MotionButton>
      </form>
      <div className="quiz-admin-start">
        <div><strong>Mulai quiz untuk semua siswa</strong><p>Countdown dimulai serentak setelah tombol ini ditekan. Perubahan konfigurasi akan disimpan otomatis.</p></div>
        <MotionButton type="button" className="button button-primary" onClick={() => void startQuiz()} disabled={starting || !questions.length}>
          <Play size={15} />{starting ? "Menjadwalkan..." : "Mulai quiz sekarang"}
        </MotionButton>
      </div>
      {startNotice && <p className="status status-success" role="status">{startNotice}</p>}
    </section>
    <section className="surface surface-pad admin-section">
      <div className="admin-section-heading"><div><span className="list-meta">BANK SOAL</span><h2 className="surface-title">Daftar soal · {quiz.name}</h2></div><span className="admin-count">{questions.length} soal</span></div>
      {questions.length ? questions.map((question, index) => <article className="admin-question-item" key={question.id}>
        {editingQuestion === question.id ? <form className="stack admin-form" onSubmit={(event) => void saveQuestion(event, question.id)}>
          <label className="field"><span>Pertanyaan {index + 1}</span><textarea className="textarea" name="question" defaultValue={question.question} required maxLength={10000} /></label>
          <label className="field"><span>Jenis soal</span><select className="select" name="question_type" defaultValue={question.question_type}><option value="pilihan">Pilihan ganda</option><option value="essay">Essay</option></select></label>
          {question.question_type !== "essay" && <><div className="form-grid">{(["a", "b", "c", "d"] as const).map((letter) => <label className="field" key={letter}><span>Opsi {letter.toUpperCase()}</span><input className="input" name={`option_${letter}`} defaultValue={question[`option_${letter}`] ?? ""} required maxLength={255} /></label>)}</div><label className="field"><span>Jawaban benar</span><select className="select" name="answer_index" defaultValue={question.answer_index ?? 0}><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></label></>}
          <label className="field"><span>Alasan jawaban</span><textarea className="textarea" name="explanation" defaultValue={question.explanation ?? ""} maxLength={10000} /></label>
          <div className="admin-row-actions"><MotionButton className="button button-primary button-small" disabled={questionBusy}><Save size={14} />Simpan soal</MotionButton><MotionButton type="button" className="button button-secondary button-small" onClick={() => setEditingQuestion(null)}>Batal</MotionButton></div>
        </form> : <div className="list-row"><div className="admin-question-copy"><div className="list-meta">SOAL {index + 1} · {question.question_type === "essay" ? "Essay" : "Pilihan ganda"}</div><span className="list-title">{question.question}</span></div><div className="admin-row-actions"><MotionButton type="button" className="button button-secondary button-small" onClick={() => setEditingQuestion(question.id)}>Edit soal</MotionButton><MotionButton type="button" className="button button-danger button-small" onClick={() => void deleteQuestion(question.id)}>Hapus</MotionButton></div></div>}
      </article>) : <p className="empty-state">Belum ada soal untuk quiz ini.</p>}
    </section>
  </main>;
}
