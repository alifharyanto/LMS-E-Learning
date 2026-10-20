"use client";

import { upload as uploadBlob } from "@vercel/blob/client";
import Image from "next/image";
import { CalendarDays, FileJson, Pencil, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MotionButton } from "@/components/ui/motion";
import { apiRequest } from "@/lib/browser-api";

type Account = { id: number; username: string; email: string; full_name: string; profile_photo: string; role: "admin" | "student"; account_status: "active" | "suspended"; last_active_at: string | null; created_at: string };
type AccountImportRecord = { fullName: string; email: string; password: string; role: "admin" | "student"; username: string; rowNumber: number; errors: string[] };

function generatedUsername(email: string) {
  const localPart = email.split("@")[0]?.toLowerCase() ?? "";
  return localPart.replace(/[^a-z0-9._-]+/g, "-").replace(/^[._-]+|[._-]+$/g, "").slice(0, 100);
}

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editing, setEditing] = useState<Account | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<AccountImportRecord[] | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  async function refresh() {
    const result = await apiRequest<{ accounts: Account[] }>("/api/v1/admin/accounts");
    setAccounts(result.accounts);
  }

  useEffect(() => {
    let active = true;
    apiRequest<{ accounts: Account[] }>("/api/v1/admin/accounts").then(({ accounts: loadedAccounts }) => {
      if (active) {
        setAccounts(loadedAccounts);
        setLoading(false);
      }
    }).catch((requestError) => {
      if (!active) return;
      if ((requestError as { status?: number }).status === 401) router.replace("/login");
      else if ((requestError as { status?: number }).status === 403) router.replace("/dashboard");
      else setError(requestError instanceof Error ? requestError.message : "Data akun gagal dimuat.");
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [router]);

  const visibleAccounts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("id-ID");
    return accounts.filter((account) => !term || `${account.username} ${account.email} ${account.full_name}`.toLocaleLowerCase("id-ID").includes(term));
  }, [accounts, search]);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/api/v1/admin/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(fields.entries())) });
      form.reset();
      setNotice("Akun berhasil dibuat.");
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Akun gagal dibuat.");
    } finally {
      setBusy(false);
    }
  }

  async function previewAccountImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("accounts_file");
    if (!(file instanceof File) || !file.size) {
      setError("Pilih file JSON terlebih dahulu.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".json") || file.size > 512 * 1024) {
      setError("Pilih file .json dengan ukuran maksimal 512 KB.");
      return;
    }

    setError("");
    setNotice("");
    setImportFile(file);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      if (!rows.length || rows.length > 100) throw new Error("File harus berisi 1 sampai 100 akun.");
      const seenEmails = new Set<string>();
      const seenUsernames = new Set<string>();
      const currentEmails = new Set(accounts.map((account) => account.email.toLowerCase()));
      const currentUsernames = new Set(accounts.map((account) => account.username.toLowerCase()));
      const preview = rows.map((row, index): AccountImportRecord => {
        const errors: string[] = [];
        if (!row || typeof row !== "object" || Array.isArray(row)) {
          return { fullName: "", email: "", password: "", role: "student", username: "", rowNumber: index + 1, errors: ["Data akun harus berbentuk object."] };
        }

        const values = row as Record<string, unknown>;
        const fullName = typeof values["nama-lengkap"] === "string" ? values["nama-lengkap"].trim() : "";
        const email = typeof values.email === "string" ? values.email.trim().toLowerCase() : "";
        const password = typeof values.password === "string" ? values.password : "";
        const roleValue = typeof values.role === "string" ? values.role.trim().toLowerCase() : "";
        const role = roleValue === "admin" ? "admin" : "student";
        const username = generatedUsername(email);

        if (!fullName || fullName.length > 150) errors.push("Nama lengkap wajib diisi (maksimal 150 karakter).");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) errors.push("Email tidak valid.");
        if (password.length < 8 || password.length > 256) errors.push("Password harus berisi 8 sampai 256 karakter.");
        if (!["student", "admin"].includes(roleValue)) errors.push("Role harus student atau admin.");
        if (!username) errors.push("Username tidak bisa dibuat dari bagian email sebelum @.");
        if (email && currentEmails.has(email)) errors.push("Email sudah digunakan akun yang ada.");
        if (username && currentUsernames.has(username)) errors.push(`Username otomatis "${username}" sudah digunakan.`);
        if (email && seenEmails.has(email)) errors.push("Email duplikat di dalam file.");
        if (username && seenUsernames.has(username)) errors.push(`Username otomatis "${username}" duplikat di dalam file.`);
        if (email) seenEmails.add(email);
        if (username) seenUsernames.add(username);

        return { fullName, email, password, role, username, rowNumber: index + 1, errors };
      });
      setImportPreview(preview);
    } catch (requestError) {
      setImportPreview(null);
      setImportFile(null);
      setError(requestError instanceof SyntaxError
        ? "File JSON tidak valid atau formatnya tidak sesuai."
        : requestError instanceof Error
          ? requestError.message
          : "File gagal dibaca.");
    }
  }

  async function importAccounts() {
    if (!importPreview || !importFile || importPreview.some((record) => record.errors.length)) return;
    const elevatedRoleCount = importPreview.filter((record) => record.role === "admin").length;
    const roleWarning = elevatedRoleCount ? `\n\nPerhatian: ${elevatedRoleCount} akun akan mendapat akses Admin.` : "";
    if (!window.confirm(`Import ${importPreview.length} akun? Username dibuat dari bagian email sebelum @.${roleWarning}`)) return;

    setImportBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await apiRequest<{ imported: number }>("/api/v1/admin/accounts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accounts: importPreview.map(({ fullName, email, password, role }) => ({
            "nama-lengkap": fullName,
            email,
            password,
            role,
          })),
        }),
      });
      setImportFile(null);
      setImportPreview(null);
      setNotice(`${response.imported} akun berhasil diimport.`);
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Import akun gagal.");
    } finally {
      setImportBusy(false);
    }
  }

  async function updateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let profilePhotoUrl = "";
      const photo = fields.get("profile_photo");
      if (photo instanceof File && photo.size > 0) {
        if (!/^image\/(jpeg|png|webp)$/.test(photo.type) || photo.size > 2 * 1024 * 1024) throw new Error("Foto harus JPG, PNG, atau WebP dengan ukuran maksimal 2 MB.");
        const filename = photo.name.replace(/[^a-zA-Z0-9._-]/g, "").slice(-100) || "profile-photo";
        const blob = await uploadBlob(`profiles/${editing.id}/${Date.now()}-${filename}`, photo, { access: "public", handleUploadUrl: "/api/v1/blob-upload", clientPayload: JSON.stringify({ purpose: "admin-profile", targetUserId: editing.id }) });
        profilePhotoUrl = blob.url;
      }
      const body = { username: fields.get("username"), email: fields.get("email"), full_name: fields.get("full_name"), role: fields.get("role"), account_status: fields.get("account_status"), password: fields.get("password"), ...(profilePhotoUrl ? { profile_photo_url: profilePhotoUrl } : {}) };
      await apiRequest(`/api/v1/admin/accounts/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setEditing(null);
      setNotice("Akun berhasil diperbarui.");
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Akun gagal diperbarui.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(account: Account) {
    if (!window.confirm(`Hapus akun ${account.username}? Akun yang memiliki riwayat belajar atau diskusi tidak dapat dihapus.`)) return;
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/v1/admin/accounts/${account.id}`, { method: "DELETE" });
      if (editing?.id === account.id) setEditing(null);
      setNotice("Akun berhasil dihapus.");
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Akun gagal dihapus.");
    }
  }

  return <div className="admin-page">
    <header className="page-heading admin-heading"><span className="eyebrow">MANAJEMEN PENGGUNA</span><h1 className="page-title">Akun</h1><p className="page-intro">Kelola identitas dan akses seluruh akun CourseUp.</p></header>
    {notice && <p className="status" role="status">{notice}</p>}{error && <p className="status status-error" role="alert">{error}</p>}
    {loading && <div className="empty-state" role="status">Sedang memuat data akun...</div>}
    <div className="grid-four admin-metrics" aria-label="Ringkasan akun"><div className="metric"><div className="metric-value">{accounts.length}</div><div className="metric-label">Semua akun</div></div><div className="metric"><div className="metric-value">{accounts.filter((account) => account.role === "student").length}</div><div className="metric-label">Student</div></div><div className="metric"><div className="metric-value">{accounts.filter((account) => account.role === "admin").length}</div><div className="metric-label">Admin</div></div><div className="metric"><div className="metric-value">{accounts.filter((account) => account.account_status === "suspended").length}</div><div className="metric-label">Dinonaktifkan</div></div></div>
    <section className="surface surface-pad admin-section"><div className="admin-section-heading"><div><span className="list-meta">AKUN BARU</span><h2 className="surface-title">Tambah akun</h2></div></div><form className="form-grid admin-form" onSubmit={(event) => void createAccount(event)}><label className="field"><span>Username</span><input className="input" name="username" required maxLength={100} /></label><label className="field"><span>Email</span><input className="input" name="email" type="email" required maxLength={150} /></label><label className="field"><span>Nama lengkap</span><input className="input" name="full_name" maxLength={150} /></label><label className="field"><span>Password awal</span><input className="input" name="password" type="password" minLength={8} autoComplete="new-password" required /></label><label className="field"><span>Role</span><select className="select" name="role" defaultValue="student"><option value="student">Student</option><option value="admin">Admin</option></select></label><div className="admin-form-action"><MotionButton className="button button-primary" disabled={busy}><Plus size={15} />Buat akun</MotionButton></div></form></section>
    <section className="surface surface-pad admin-section">
      <div className="admin-section-heading"><div><span className="list-meta">IMPORT JSON</span><h2 className="surface-title"><FileJson size={16} />Import akun dari file</h2></div></div>
      <p className="page-intro">File dapat berisi satu object akun atau array akun. Username otomatis dibuat dari bagian email sebelum tanda @.</p>
      <pre className="account-import-example">{`{
  "nama-lengkap": "NAMA",
  "email": "email@example.com",
  "password": "password-minimal-8-karakter",
  "role": "student"
}`}</pre>
      <form className="account-import-form" onSubmit={(event) => void previewAccountImport(event)}>
        <label className="field"><span>File JSON · maksimal 100 akun, 512 KB</span><input className="input" name="accounts_file" type="file" accept=".json,application/json" required onChange={() => { setImportPreview(null); setImportFile(null); }} /></label>
        <MotionButton className="button button-secondary" disabled={importBusy}><FileJson size={14} />Preview file</MotionButton>
      </form>
      {importPreview && <div className="account-import-preview" aria-live="polite">
        <div className="account-import-summary"><strong>{importPreview.filter((record) => !record.errors.length).length}/{importPreview.length} akun valid</strong><span>{importPreview.filter((record) => record.errors.length).length ? "Periksa data yang ditandai sebelum import." : "Semua data siap diimport."}</span></div>
        <div className="account-import-list">{importPreview.map((record) => <article className={`account-import-row${record.errors.length ? " is-invalid" : ""}`} key={record.rowNumber}>
          <div><strong>Baris {record.rowNumber} · {record.fullName || "Nama belum diisi"}</strong><span>{record.email || "Email belum diisi"} · Username: {record.username || "-"}</span><small>Role: {record.role === "admin" ? "Admin" : "Student"} · Password tidak ditampilkan</small></div>
          {record.errors.length > 0 && <ul>{record.errors.map((message) => <li key={message}>{message}</li>)}</ul>}
        </article>)}</div>
        {importPreview.some((record) => record.role === "admin" && !record.errors.length) && <p className="account-import-warning" role="note">Akun dengan role admin akan memiliki akses penuh ke panel admin.</p>}
        <MotionButton type="button" className="button button-primary" disabled={importBusy || !importFile || importPreview.some((record) => record.errors.length > 0)} onClick={() => void importAccounts()}>
          <Plus size={15} />{importBusy ? "Mengimport akun..." : `Import ${importPreview.length} akun`}
        </MotionButton>
      </div>}
    </section>
    <section className="surface surface-pad admin-section"><div className="admin-section-heading"><div><span className="list-meta">DIREKTORI</span><h2 className="surface-title">Semua akun</h2></div><span className="admin-count">{visibleAccounts.length} dari {accounts.length}</span></div><label className="account-search"><Search size={16} /><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, username, atau email" aria-label="Cari akun" /></label>
      {visibleAccounts.length ? <div className="account-list">{visibleAccounts.map((account) => <article className="account-row" key={account.id}><div className="account-identity">{account.profile_photo ? <Image className="account-avatar" src={account.profile_photo} alt="" width={40} height={40} unoptimized /> : <span className="account-avatar account-avatar-empty"><UserRound size={17} /></span>}<div className="account-copy"><strong>{account.full_name || account.username}</strong><span>@{account.username} · {account.email}</span><small><CalendarDays size={13} />Terdaftar {new Date(account.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}{account.last_active_at ? ` · Aktif ${new Date(account.last_active_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}` : " · Belum aktif"}</small></div></div><div className="account-tags"><span className={`account-role account-role-${account.role}`}>{account.role === "admin" ? "Admin" : "Student"}</span><span className={`account-state account-state-${account.account_status}`}>{account.account_status === "active" ? "Aktif" : "Dinonaktifkan"}</span></div><div className="admin-row-actions"><MotionButton type="button" className="button button-secondary button-small" onClick={() => setEditing(account)} aria-label={`Edit akun ${account.username}`}><Pencil size={14} />Edit</MotionButton><MotionButton type="button" className="button button-danger button-small" onClick={() => void deleteAccount(account)} aria-label={`Hapus akun ${account.username}`}><Trash2 size={14} />Hapus</MotionButton></div></article>)}</div> : <p className="empty-state">{accounts.length ? "Tidak ada akun yang cocok." : "Belum ada akun."}</p>}
    </section>
    {editing && <div className="account-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><section className="account-modal surface surface-pad" role="dialog" aria-modal="true" aria-labelledby="account-edit-title"><div className="admin-section-heading"><div><span className="list-meta">PERBARUI IDENTITAS</span><h2 className="surface-title" id="account-edit-title">Edit akun</h2></div><MotionButton type="button" className="button button-secondary button-small" onClick={() => setEditing(null)} aria-label="Tutup"><X size={16} /></MotionButton></div><form className="form-grid admin-form" onSubmit={(event) => void updateAccount(event)}><label className="field"><span>Username</span><input className="input" name="username" defaultValue={editing.username} required maxLength={100} /></label><label className="field"><span>Email</span><input className="input" name="email" type="email" defaultValue={editing.email} required maxLength={150} /></label><label className="field"><span>Nama lengkap</span><input className="input" name="full_name" defaultValue={editing.full_name} maxLength={150} /></label><label className="field"><span>Password baru · opsional</span><input className="input" name="password" type="password" minLength={8} autoComplete="new-password" /></label><label className="field"><span>Role</span><select className="select" name="role" defaultValue={editing.role}><option value="student">Student</option><option value="admin">Admin</option></select></label><label className="field"><span>Status akun</span><select className="select" name="account_status" defaultValue={editing.account_status}><option value="active">Aktif</option><option value="suspended">Nonaktifkan</option></select></label><label className="field form-span"><span>Foto profil · JPG, PNG, WebP · maks. 2 MB</span><input className="input" name="profile_photo" type="file" accept="image/jpeg,image/png,image/webp" /></label><div className="form-span account-modal-actions"><MotionButton className="button button-primary" disabled={busy}>Simpan perubahan</MotionButton><MotionButton type="button" className="button button-secondary" onClick={() => setEditing(null)}>Batal</MotionButton></div></form></section></div>}
  </div>;
}
