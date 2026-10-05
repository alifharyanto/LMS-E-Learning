"use client";

import { upload as uploadBlob } from "@vercel/blob/client";
import { Activity, ChartNoAxesColumn, Check, FileSpreadsheet, Pencil, Save, Trash2, UsersRound, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { MotionButton, Reveal, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { apiRequest } from "@/lib/browser-api";

type Category = { id: number; name: string; questions_count: number; time_limit_minutes: number | null };
type Material = { id: number; title: string; description: string | null; category: string; file_path: string | null; file_size: number | null; file_type: string | null };
type Question = { id: number; question: string };
type Contact = { id: number; name: string; email: string; subject: string; message: string; status: string; created_at: string };
type Result = { id: number; username: string | null; score: number; total: number; percent: number };
type RegistrationDay = { date: string; total: number };
type ActiveStudent = { id: number; username: string; full_name: string; last_active: string };
type AdminOverview = { total_students: number; joined_today: number; active_today: number; registrations: RegistrationDay[]; active_students: ActiveStudent[]; quiz_30d: { attempts: number; average_percent: number; passed: number } };
type AdminData = { materials: Material[]; categories: Category[]; questions: Question[]; contacts: Contact[]; results: Result[]; overview: AdminOverview };
type User = { id: number };
type ImportError = { rowNumber: number; message: string };
type ImportRow = { rowNumber: number; category: string; question: string; option_a: string; option_b: string; option_c: string; option_d: string; answer_index: number; explanation: string };
type ImportPreview = { totalRows: number; validRows: number; errors: ImportError[]; rows: ImportRow[] };

export default function AdminPage() {
  const pathname = usePathname() || "/admin/dashboard";
  const router = useRouter();
  const section = pathname === "/admin/materi" ? "materi" : pathname === "/admin/quiz" ? "quiz" : pathname === "/admin/soal" ? "soal" : pathname === "/admin/hasilbelajar" ? "hasilbelajar" : pathname === "/admin/kontak" ? "kontak" : "dashboard";
  const headings = {
    dashboard: { title: "Dashboard", eyebrow: "ANALISIS ADMIN", description: "Pantau pendaftaran, aktivitas belajar, dan hasil quiz." },
    materi: { title: "Materi", eyebrow: "KONTEN BELAJAR", description: "Kelola materi yang tersedia untuk siswa." },
    quiz: { title: "Kategori Quiz", eyebrow: "PENGELOMPOKAN", description: "Kelola kategori untuk latihan quiz." },
    soal: { title: "Quiz", eyebrow: "LATIHAN SOAL", description: "Buat, import, dan kelola soal quiz." },
    hasilbelajar: { title: "Hasil Belajar", eyebrow: "AKTIVITAS BELAJAR", description: "Tinjau hasil quiz siswa." },
    kontak: { title: "Kontak", eyebrow: "KOMUNIKASI", description: "Kelola pesan yang masuk." },
  } as const;
  const heading = headings[section];
  const [data, setData] = useState<AdminData | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [materialFormat, setMaterialFormat] = useState<"application/pdf" | "text/markdown">("application/pdf");
  const [editingMaterialFormat, setEditingMaterialFormat] = useState<"application/pdf" | "text/markdown">("application/pdf");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  async function refresh() {
    setData(await apiRequest<AdminData>("/api/v1/admin"));
  }

  useEffect(() => {
    Promise.all([apiRequest<AdminData>("/api/v1/admin"), apiRequest<{ user: User }>("/api/v1/auth/me")]).then(([adminData, session]) => {
      setData(adminData);
      setUserId(session.user.id);
    }).catch((requestError) => {
      if ((requestError as { status?: number }).status === 401) router.replace("/login");
      else if ((requestError as { status?: number }).status === 403) router.replace("/dashboard");
      else setError(requestError instanceof Error ? requestError.message : "Panel admin gagal dimuat.");
    });
  }, [router]);

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
        const fileType = fields.get("material_format") === "text/markdown" ? "text/markdown" : "application/pdf";
        const maximumSize = fileType === "application/pdf" ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
        if (!hasReplacementFile && isCreate) throw new Error("Pilih file materi terlebih dahulu.");
        if (!hasReplacementFile && !isCreate && fileType !== editingMaterialFormat) throw new Error("Pilih file baru saat mengganti format materi.");
        body = { title: fields.get("title"), category: fields.get("category"), description: fields.get("description"), file_type: fileType };
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
      await apiRequest(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setNotice("Perubahan berhasil disimpan.");
      form.reset();
      if (endpoint.startsWith("/api/v1/admin/categories/")) setEditingCategoryId(null);
      if (endpoint === "/api/v1/admin/materials") setMaterialFormat("application/pdf");
      if (endpoint.startsWith("/api/v1/admin/materials/")) { setEditingMaterialId(null); setEditingMaterialFormat("application/pdf"); }
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

  if (!data) return <div className="page-loading">Memuat panel admin...</div>;

  const unreadContacts = data.contacts.filter((contact) => contact.status === "unread").length;
  const registrationDays = data.overview.registrations;
  const maxRegistrations = Math.max(1, ...registrationDays.map((day) => Number(day.total)));

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
            <label className="field form-span"><span>Deskripsi</span><textarea className="textarea" name="description" /></label>
            <label className="field"><span>Format materi</span><select className="select" name="material_format" value={materialFormat} onChange={(event) => setMaterialFormat(event.target.value === "text/markdown" ? "text/markdown" : "application/pdf")}><option value="application/pdf">PDF</option><option value="text/markdown">Markdown (.md)</option></select></label>
            <label className="field"><span>File materi · {materialFormat === "application/pdf" ? "maksimal 25 MB" : "maksimal 5 MB"}</span><input className="input" name="material_file" type="file" accept={materialFormat === "application/pdf" ? ".pdf,application/pdf" : ".md,text/markdown,text/plain"} required /></label>
            <div className="admin-form-action"><MotionButton className="button button-primary" disabled={busy}>Tambah Materi</MotionButton></div>
          </form>
          {data.materials.length ? <div className="admin-material-list">{data.materials.map((item) => <article className="admin-material-item" key={item.id}>
            <div className="admin-material-summary"><div className="admin-material-info"><div className="list-title">{item.title}</div><div className="list-meta">{item.category} · {item.file_type === "text/markdown" ? "Markdown" : "PDF"} · {item.file_size ? `${(item.file_size / (1024 * 1024)).toFixed(1)} MB` : "-"}</div></div><div className="admin-row-actions"><MotionButton type="button" className="button button-secondary button-small" aria-expanded={editingMaterialId === item.id} onClick={() => { if (editingMaterialId === item.id) setEditingMaterialId(null); else { setEditingMaterialId(item.id); setEditingMaterialFormat(item.file_type === "text/markdown" ? "text/markdown" : "application/pdf"); } }}><Pencil size={14} />Edit</MotionButton><MotionButton type="button" className="button button-danger button-small" onClick={() => void remove(`/api/v1/admin/materials/${item.id}`)}><Trash2 size={14} />Hapus</MotionButton></div></div>
            {editingMaterialId === item.id && <form className="admin-material-editor" onSubmit={(event) => void submit(event, `/api/v1/admin/materials/${item.id}`, "PUT")}>
              <label className="field"><span>Judul materi</span><input className="input" name="title" defaultValue={item.title} required maxLength={255} /></label>
              <label className="field"><span>Kategori</span><input className="input" name="category" defaultValue={item.category} required maxLength={100} /></label>
              <label className="field form-span"><span>Deskripsi</span><textarea className="textarea" name="description" defaultValue={item.description ?? ""} maxLength={10000} /></label>
              <label className="field"><span>Format materi</span><select className="select" name="material_format" value={editingMaterialFormat} onChange={(event) => setEditingMaterialFormat(event.target.value === "text/markdown" ? "text/markdown" : "application/pdf")}><option value="application/pdf">PDF</option><option value="text/markdown">Markdown (.md)</option></select></label>
              <label className="field form-span"><span>Ganti file · opsional · {editingMaterialFormat === "application/pdf" ? "maksimal 25 MB" : "maksimal 5 MB"}</span><input className="input" name="material_file" type="file" accept={editingMaterialFormat === "application/pdf" ? ".pdf,application/pdf" : ".md,text/markdown,text/plain"} /></label>
              <div className="admin-material-editor-actions"><MotionButton className="button button-primary" disabled={busy}><Save size={14} />Simpan perubahan</MotionButton><MotionButton type="button" className="button button-secondary" onClick={() => setEditingMaterialId(null)}><X size={14} />Batal</MotionButton></div>
            </form>}
          </article>)}</div> : <p className="empty-state">Belum ada materi yang ditambahkan.</p>}
        </section>

        <div className={`grid-two admin-grid ${section === "quiz" || section === "soal" ? "admin-grid-single" : ""}`} id="quiz" hidden={section !== "quiz" && section !== "soal"}>
          <section className="surface surface-pad admin-section" hidden={section !== "quiz"}>
            <div className="admin-section-heading"><div><span className="list-meta">PENGELOMPOKAN</span><h2 className="surface-title">Kategori quiz</h2></div><span className="admin-count">{data.categories.length} kategori</span></div>
            <form className="list-row admin-inline-form" onSubmit={(event) => void submit(event, "/api/v1/admin/categories")}>
              <input className="input" name="category_name" placeholder="Nama kategori" required />
              <label className="field"><span>Menit</span><input className="input" name="time_limit_minutes" type="number" min="1" max="1440" defaultValue="30" required /></label>
              <MotionButton className="button button-primary button-small">Tambah</MotionButton>
            </form>
            {data.categories.length ? data.categories.map((category) => <div key={category.id}>
              <div className="list-row"><div><div className="list-title">{category.name}</div><div className="list-meta">{category.questions_count} soal · {category.time_limit_minutes ? `${category.time_limit_minutes} menit` : "Timer belum diatur"}</div></div><div className="admin-row-actions"><MotionButton type="button" className="button button-secondary button-small" aria-expanded={editingCategoryId === category.id} onClick={() => setEditingCategoryId(editingCategoryId === category.id ? null : category.id)}><Pencil size={14} />Waktu</MotionButton><MotionButton type="button" className="button button-danger button-small" onClick={() => void remove(`/api/v1/admin/categories/${category.id}`)}><Trash2 size={14} />Hapus</MotionButton></div></div>
              {editingCategoryId === category.id && <form className="admin-inline-form" onSubmit={(event) => void submit(event, `/api/v1/admin/categories/${category.id}`, "PUT")}><label className="field"><span>Durasi dalam menit · kosongkan untuk tanpa timer</span><input className="input" name="time_limit_minutes" type="number" min="1" max="1440" defaultValue={category.time_limit_minutes ?? ""} /></label><MotionButton className="button button-primary button-small" disabled={busy}><Save size={14} />Simpan</MotionButton></form>}
            </div>) : <p className="empty-state">Belum ada kategori quiz.</p>}
          </section>
          <section className="surface surface-pad admin-section" hidden={section !== "soal"}>
            <div className="admin-section-heading"><div><span className="list-meta">KONTEN BARU</span><h2 className="surface-title">Buat soal</h2></div></div>
            <form className="stack admin-form" onSubmit={(event) => void submit(event, "/api/v1/admin/questions")}>
              <label className="field"><span>Kategori</span><select className="select" name="category_id" required defaultValue=""><option value="" disabled>Pilih kategori</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label className="field"><span>Pertanyaan</span><textarea className="textarea" name="question" required /></label>
              <div className="form-grid">{(["a", "b", "c", "d"] as const).map((letter) => <label className="field" key={letter}><span>Opsi {letter.toUpperCase()}</span><input className="input" name={`option_${letter}`} required /></label>)}</div>
              <label className="field"><span>Jawaban benar</span><select className="select" name="answer_index"><option value="0">Jawaban A</option><option value="1">Jawaban B</option><option value="2">Jawaban C</option><option value="3">Jawaban D</option></select></label>
              <label className="field"><span>Penjelasan</span><textarea className="textarea" name="explanation" /></label>
              <MotionButton className="button button-primary" disabled={busy}>Simpan Soal</MotionButton>
            </form>
          </section>
        </div>

        <section className="surface surface-pad admin-section" id="quiz-import" hidden={section !== "soal"}>
          <div className="admin-section-heading"><div><span className="list-meta">IMPORT MASSAL</span><h2 className="surface-title"><FileSpreadsheet size={16} /> Import soal dari file</h2></div><span className="admin-count">CSV · JSON · XLSX</span></div>
          <p className="page-intro">Gunakan kolom category, question, option_a, option_b, option_c, option_d, answer_index, dan explanation. Jawaban dapat ditulis A-D atau 0-3. Maksimal 1.000 soal.</p>
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
          <div className="admin-section-heading"><div><span className="list-meta">BANK KONTEN</span><h2 className="surface-title">Soal quiz</h2></div><span className="admin-count">{data.questions.length} soal</span></div>
          {data.questions.length ? data.questions.map((question) => <div className="list-row" key={question.id}><span className="list-title">{question.question}</span><MotionButton type="button" className="button button-danger button-small" onClick={() => void remove(`/api/v1/admin/questions/${question.id}`)}><Trash2 size={14} />Hapus</MotionButton></div>) : <p className="empty-state">Belum ada soal quiz.</p>}
        </section>

        <section className="surface surface-pad admin-section" id="results" hidden={section !== "hasilbelajar"}>
          <div className="admin-section-heading"><div><span className="list-meta">AKTIVITAS</span><h2 className="surface-title">Hasil belajar</h2></div><span className="admin-count">{data.results.length} hasil</span></div>
          {data.results.length ? data.results.map((result) => <div className="list-row" key={result.id}><span>{result.username ?? "Pengguna"}: {result.score}/{result.total} ({result.percent}%)</span><MotionButton type="button" className="button button-danger button-small" onClick={() => void remove(`/api/v1/admin/results/${result.id}`)}><Trash2 size={14} />Hapus</MotionButton></div>) : <p className="empty-state">Belum ada hasil quiz.</p>}
        </section>

        <section className="surface surface-pad admin-section" id="contacts" hidden={section !== "kontak"}>
          <div className="admin-section-heading"><div><span className="list-meta">KOMUNIKASI</span><h2 className="surface-title">Pesan masuk</h2></div><span className="admin-count">{unreadContacts} belum dibaca</span></div>
          {data.contacts.length ? data.contacts.map((contact) => <div className="list-row admin-contact-row" key={contact.id}><div className="admin-contact-copy"><div className="list-title">{contact.name} · {contact.subject}</div><div className="list-meta">{contact.email} · {new Date(contact.created_at).toLocaleString("id-ID")}</div><p className="page-intro">{contact.message}</p><span className={`admin-contact-status ${contact.status === "unread" ? "is-unread" : ""}`}>{contact.status === "unread" ? "Belum dibaca" : "Sudah dibaca"}</span></div><div className="admin-row-actions">{contact.status === "unread" && <MotionButton type="button" className="button button-secondary button-small" onClick={() => void markRead(contact.id)}><Check size={14} />Tandai dibaca</MotionButton>}<MotionButton type="button" className="button button-danger button-small" onClick={() => void remove(`/api/v1/admin/contacts/${contact.id}`)}><Trash2 size={14} />Hapus</MotionButton></div></div>) : <p className="empty-state">Belum ada pesan masuk.</p>}
        </section>
    </div></Reveal>
  </div>;
}