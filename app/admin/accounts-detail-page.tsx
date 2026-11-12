"use client";

import { upload as uploadBlob } from "@vercel/blob/client";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, Copy, Eye, EyeOff, KeyRound, Pencil, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { MotionButton } from "@/components/ui/motion";
import { apiRequest } from "@/lib/browser-api";

type Account = {
  id: number;
  uuid: string;
  username: string;
  email: string;
  full_name: string;
  profile_photo: string;
  role: "admin" | "student";
  account_status: "active" | "suspended";
  last_active_at: string | null;
  created_at: string;
};

function formatAccountDate(value: string | null, withTime = false) {
  if (!value) return "Belum pernah login";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanggal tidak tersedia";
  return date.toLocaleString("id-ID", withTime
    ? { dateStyle: "long", timeStyle: "short" }
    : { dateStyle: "long" });
}

export default function AccountDetailPage({ uuid, initiallyEditing }: { uuid: string; initiallyEditing: boolean }) {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(initiallyEditing);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recentlySetPassword, setRecentlySetPassword] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ account: Account }>(`/api/v1/admin/accounts/${encodeURIComponent(uuid)}`).then(({ account: loaded }) => {
      if (active) setAccount(loaded);
    }).catch((requestError) => {
      if (!active) return;
      if ((requestError as { status?: number }).status === 401) router.replace("/login");
      else if ((requestError as { status?: number }).status === 403) router.replace("/dashboard");
      else setError(requestError instanceof Error ? requestError.message : "Detail akun gagal dimuat.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [router, uuid]);

  function beginEditing() {
    setError("");
    setNotice("");
    setRecentlySetPassword(null);
    setEditing(true);
    router.push(`/admin/akun/detail/${encodeURIComponent(uuid)}?edit=account`);
  }

  function cancelEditing() {
    setEditing(false);
    setShowNewPassword(false);
    router.replace(`/admin/akun/detail/${encodeURIComponent(uuid)}`);
  }

  async function copyAccountField(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setError("");
      setNotice(`${label} berhasil disalin.`);
    } catch (copyError) {
      console.error(`Copy account ${label} failed:`, copyError);
      setError(`Gagal menyalin ${label}. Periksa izin clipboard browser.`);
    }
  }

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) return;
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get("password") ?? "").trim();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let profilePhotoUrl: string | undefined;
      const photo = fields.get("profile_photo");
      if (photo instanceof File && photo.size > 0) {
        if (!/^image\/(jpeg|png|webp)$/.test(photo.type) || photo.size > 2 * 1024 * 1024) {
          throw new Error("Foto harus JPG, PNG, atau WebP dengan ukuran maksimal 2 MB.");
        }
        const filename = photo.name.replace(/[^a-zA-Z0-9._-]/g, "").slice(-100) || "profile-photo";
        const blob = await uploadBlob(`profiles/${account.id}/${Date.now()}-${filename}`, photo, {
          access: "public",
          handleUploadUrl: "/api/v1/blob-upload",
          clientPayload: JSON.stringify({ purpose: "admin-profile", targetUserId: account.id }),
        });
        profilePhotoUrl = blob.url;
      }

      await apiRequest(`/api/v1/admin/accounts/${encodeURIComponent(uuid)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: fields.get("username"),
          email: fields.get("email"),
          full_name: fields.get("full_name"),
          role: fields.get("role"),
          account_status: account.account_status,
          password,
          ...(profilePhotoUrl ? { profile_photo_url: profilePhotoUrl } : {}),
        }),
      });

      const { account: updated } = await apiRequest<{ account: Account }>(`/api/v1/admin/accounts/${encodeURIComponent(uuid)}`);
      setAccount(updated);
      setEditing(false);
      setShowNewPassword(false);
      setRecentlySetPassword(password || null);
      setNotice("Perubahan akun berhasil disimpan.");
      router.replace(`/admin/akun/detail/${encodeURIComponent(uuid)}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Akun gagal diperbarui.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAccountStatus() {
    if (!account) return;
    const nextStatus = account.account_status === "active" ? "suspended" : "active";
    const verb = nextStatus === "suspended" ? "nonaktifkan" : "aktifkan kembali";
    if (!window.confirm(`Apakah Anda yakin ingin ${verb} akun ${account.username}?`)) return;

    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/v1/admin/accounts/${encodeURIComponent(uuid)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: account.username,
          email: account.email,
          full_name: account.full_name,
          role: account.role,
          account_status: nextStatus,
          password: "",
        }),
      });
      setAccount({ ...account, account_status: nextStatus });
      setRecentlySetPassword(null);
      setNotice(nextStatus === "suspended" ? "Akun dinonaktifkan dan sesi aktifnya dicabut." : "Akun berhasil diaktifkan kembali.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Status akun gagal diperbarui.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!account || !window.confirm(`Hapus akun ${account.username}? Tindakan ini permanen dan tidak bisa dibatalkan.`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/v1/admin/accounts/${encodeURIComponent(uuid)}`, { method: "DELETE" });
      router.replace("/admin/akun");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Akun gagal dihapus.");
      setBusy(false);
    }
  }

  if (loading) return <div className="page-loading" role="status">Memuat detail akun...</div>;
  if (!account) return <div className="admin-page"><p className="status status-error" role="alert">{error || "Akun tidak ditemukan."}</p><Link className="button button-secondary" href="/admin/akun"><ArrowLeft size={15} />Kembali ke akun</Link></div>;

  return <div className="admin-page">
    <header className="page-heading admin-heading account-detail-heading">
      <Link href="/admin/akun" className="button button-secondary button-small"><ArrowLeft size={14} />Semua akun</Link>
      <span className="eyebrow">MANAJEMEN PENGGUNA</span>
      <h1 className="page-title">Detail akun</h1>
      <p className="page-intro">Informasi, status akses, dan pengaturan akun pengguna.</p>
    </header>
    {notice && <p className="status" role="status">{notice}</p>}
    {error && <p className="status status-error" role="alert">{error}</p>}

    <section className="surface surface-pad account-detail-card">
      <div className="account-detail-profile">
        {account.profile_photo
          ? <Image className="account-detail-avatar" src={account.profile_photo} alt={`Foto profil ${account.full_name || account.username}`} width={100} height={100} unoptimized />
          : <span className="account-detail-avatar account-detail-avatar-empty"><UserRound size={38} /></span>}
        <div className="account-detail-identity">
          <span className="list-meta">{account.role === "admin" ? "ADMINISTRATOR" : "AKUN SISWA"}</span>
          <h2>{account.username}</h2>
          <span>@{account.username}</span>
          <div className="account-tags">
            <span className={`account-role account-role-${account.role}`}>{account.role === "admin" ? "Admin" : "Student"}</span>
            <span className={`account-state account-state-${account.account_status}`}>{account.account_status === "active" ? "Aktif" : "Dinonaktifkan"}</span>
          </div>
        </div>
        {!editing && <MotionButton type="button" className="button button-primary account-detail-edit" onClick={beginEditing}><Pencil size={15} />Edit akun</MotionButton>}
      </div>

      {editing ? <form className="form-grid admin-form account-detail-form" onSubmit={(event) => void saveAccount(event)}>
        <label className="field"><span>Nama lengkap</span><input className="input" name="full_name" defaultValue={account.full_name} maxLength={150} /></label>
        <label className="field"><span>Username</span><input className="input" name="username" defaultValue={account.username} required maxLength={100} /></label>
        <label className="field"><span>Email</span><input className="input" name="email" type="email" defaultValue={account.email} required maxLength={150} /></label>
        <label className="field"><span>Role akun</span><select className="select" name="role" defaultValue={account.role}><option value="student">Student</option><option value="admin">Admin</option></select></label>
        <label className="field account-detail-password-field"><span>Password baru</span><span className="account-detail-password-input"><input className="input" name="password" type={showNewPassword ? "text" : "password"} minLength={8} maxLength={256} autoComplete="new-password" placeholder="Kosongkan jika tidak ingin mengganti" /><button type="button" aria-label={showNewPassword ? "Sembunyikan password baru" : "Tampilkan password baru"} onClick={() => setShowNewPassword((shown) => !shown)}>{showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span><small>Password lama tidak dapat ditampilkan karena disimpan dalam bentuk hash. Isi password baru bila ingin meresetnya.</small></label>
        <label className="field form-span"><span>Foto profil · JPG, PNG, WebP · maks. 2 MB</span><input className="input" name="profile_photo" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        <div className="form-span account-detail-form-actions">
          <MotionButton className="button button-primary" disabled={busy}>{busy ? "Menyimpan..." : "Simpan perubahan"}</MotionButton>
          <MotionButton type="button" className="button button-secondary" disabled={busy} onClick={cancelEditing}><X size={14} />Batal</MotionButton>
        </div>
      </form> : <>
        <dl className="account-detail-facts">
          <div><dt>Email</dt><dd><span>{account.email}</span><button className="account-copy-action" type="button" onClick={() => void copyAccountField("Email", account.email)} aria-label="Salin email"><Copy size={14} />Salin</button></dd></div>
          <div><dt>Nama terdaftar</dt><dd><span>@{account.username}</span><button className="account-copy-action" type="button" onClick={() => void copyAccountField("Username", account.username)} aria-label="Salin username"><Copy size={14} />Salin</button></dd></div>
          <div><dt>Nama lengkap</dt><dd>{account.full_name || "Belum diisi"}</dd></div>
          <div><dt>Password</dt><dd><KeyRound size={15} />{recentlySetPassword ? <><code className="account-password-value">{recentlySetPassword}</code><button className="account-copy-action" type="button" onClick={() => void copyAccountField("Password baru", recentlySetPassword)} aria-label="Salin password baru"><Copy size={14} />Salin</button></> : <span>Password lama tersimpan sebagai hash dan tidak bisa dipulihkan. Reset melalui Edit akun.</span>}</dd></div>
          <div><dt>Terdaftar</dt><dd><CalendarDays size={15} />{formatAccountDate(account.created_at)}</dd></div>
          <div><dt>Login terakhir</dt><dd><Clock3 size={15} />{formatAccountDate(account.last_active_at, true)}</dd></div>
          <div><dt>Status</dt><dd><ShieldCheck size={15} />{account.account_status === "active" ? "Aktif" : "Dinonaktifkan"}</dd></div>
          <div><dt>UUID akun</dt><dd className="account-detail-uuid">{account.uuid}</dd></div>
        </dl>
        {recentlySetPassword && <p className="account-password-notice" role="status">Password baru ditampilkan sementara dan hanya tersimpan di halaman ini. Salin sekarang; nilainya hilang saat halaman dimuat ulang.</p>}
        <div className="account-detail-actions">
          <MotionButton type="button" className={`button ${account.account_status === "active" ? "button-secondary" : "button-primary"}`} disabled={busy} onClick={() => void toggleAccountStatus()}>
            <ShieldCheck size={15} />{account.account_status === "active" ? "Nonaktifkan akun" : "Aktifkan kembali"}
          </MotionButton>
          <MotionButton type="button" className="button button-danger" disabled={busy} onClick={() => void deleteAccount()}><Trash2 size={15} />Hapus akun</MotionButton>
        </div>
      </>}
    </section>
  </div>;
}
