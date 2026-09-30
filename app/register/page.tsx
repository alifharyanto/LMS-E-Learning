"use client";

import { ArrowLeft, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MotionButton, MotionLink, Reveal } from "@/components/ui/motion";
import { apiRequest } from "@/lib/browser-api";

export default function RegisterPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    setError("");
    try {
      await apiRequest("/api/v1/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, terms: fields.terms === "on" }) });
      router.push("/dashboard");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Gagal membuat akun.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <aside className="auth-brand">
        <MotionLink href="/" className="brand"><span className="brand-mark">C</span><span className="brand-name" style={{ color: "white" }}>Course<span>Up</span></span></MotionLink>
        <div className="auth-brand-copy"><h1>Mulai kebiasaan belajar yang lebih terarah.</h1><p>Buat akun dan simpan progres belajar Anda di CourseUp.</p></div>
        <small>© {new Date().getFullYear()} CourseUp</small>
      </aside>
      <section className="auth-panel">
        <Reveal className="auth-card-reveal"><div className="auth-card">
          <h2>Buat akun baru</h2>
          <p>Lengkapi data berikut untuk memulai perjalanan belajar Anda.</p>
          {error && <p className="status status-error" role="alert">{error}</p>}
          <form className="stack" onSubmit={register}>
            <label className="field"><span>Username</span><input className="input" name="username" autoComplete="username" maxLength={100} required /></label>
            <label className="field"><span>Email</span><input className="input" name="email" type="email" autoComplete="email" maxLength={150} required /></label>
            <label className="field"><span>Password · minimal 8 karakter</span><input className="input" name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
            <label className="field"><span>Konfirmasi password</span><input className="input" name="password_confirmation" type="password" autoComplete="new-password" minLength={8} required /></label>
            <label className="check-row"><input name="terms" type="checkbox" required />Saya menyetujui penggunaan CourseUp untuk pembelajaran.</label>
            <MotionButton className="button button-primary" disabled={busy}>{busy ? "Membuat akun..." : <><UserPlus size={15} />Buat akun CourseUp</>}</MotionButton>
          </form>
          <p className="auth-footer">Sudah punya akun? <MotionLink className="link-inline" href="/login">Masuk sekarang</MotionLink></p>
          <p className="auth-footer"><MotionLink className="link-inline" href="/"><ArrowLeft size={14} />Kembali ke beranda</MotionLink></p>
        </div></Reveal>
      </section>
    </main>
  );
}