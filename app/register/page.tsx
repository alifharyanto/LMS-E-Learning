"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MotionButton, MotionLink } from "@/components/ui/motion";
import { apiRequest } from "@/lib/browser-api";

export default function RegisterPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (fields.password !== fields.password_confirmation) {
      setError("Konfirmasi password tidak cocok dengan password yang dimasukkan.");
      return;
    }

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
    <main className="auth-shell register-page">
      <aside className="auth-brand register-brand">
        <Link href="/" className="brand register-desktop-brand" aria-label="CourseUp Beranda">
          <Image src="/course-up-logo.png" alt="Logo Course Up" className="brand-logo" width={40} height={40} />
          <span className="brand-name"><span>Course</span><span>Up</span></span>
        </Link>
        <div className="auth-brand-copy register-brand-copy">
          <span className="register-brand-badge"><span aria-hidden="true">✦</span>Platform Edukasi Terpadu</span>
          <h1>Mulai kebiasaan belajar yang lebih terarah.</h1>
        </div>
        <small className="register-copyright">© {new Date().getFullYear()} CourseUp. All rights reserved.</small>
      </aside>
      <section className="auth-panel register-panel">
        <div className="register-card">
          <Link href="/" className="brand register-mobile-brand" aria-label="CourseUp Beranda">
            <Image src="/course-up-logo.png" alt="Logo Course Up" className="brand-logo" width={40} height={40} />
            <span className="brand-name"><span>Course</span><span>Up</span></span>
          </Link>
          <header className="register-heading">
            <span className="register-eyebrow">Registrasi Akun</span>
            <h2>Buat akun baru</h2>
            <p>Lengkapi data berikut untuk memulai perjalanan belajar Anda.</p>
          </header>
          {error && <p className="status status-error register-error" role="alert">{error}</p>}
          <form className="register-form" onSubmit={register}>
            <div className="register-field">
              <label htmlFor="register-username">Username</label>
              <input className="register-input" id="register-username" name="username" autoComplete="username" maxLength={100} placeholder="Contoh: bima_pratama" required />
            </div>
            <div className="register-field">
              <label htmlFor="register-email">Email</label>
              <input className="register-input" id="register-email" name="email" type="email" autoComplete="email" maxLength={150} placeholder="nama@domain.com" required />
            </div>
            <div className="register-field">
              <div className="register-password-label">
                <label htmlFor="register-password">Password</label>
                <small>Minimal 8 karakter</small>
              </div>
              <div className="register-password-control">
                <input className="register-input" id="register-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={256} placeholder="Buat kata sandi yang aman" required />
                <button className="register-password-toggle" type="button" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="register-field">
              <label htmlFor="register-confirm-password">Konfirmasi password</label>
              <div className="register-password-control">
                <input className="register-input" id="register-confirm-password" name="password_confirmation" type={showConfirmation ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={256} placeholder="Ulangi kata sandi Anda" required />
                <button className="register-password-toggle" type="button" aria-label={showConfirmation ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"} aria-pressed={showConfirmation} onClick={() => setShowConfirmation((visible) => !visible)}>
                  {showConfirmation ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <label className="register-terms">
              <input name="terms" type="checkbox" required />
              <span>Saya menyetujui <a href="#terms" onClick={(event) => event.preventDefault()}>Syarat Layanan</a> dan <a href="#privacy" onClick={(event) => event.preventDefault()}>Kebijakan Privasi</a> CourseUp.</span>
            </label>
            <MotionButton className="button button-primary register-submit" disabled={busy}>
              {busy ? "Membuat akun..." : <><UserPlus size={16} />Buat akun CourseUp</>}
            </MotionButton>
          </form>
          <footer className="register-footer">
            <p>Sudah punya akun? <MotionLink href="/login">Masuk sekarang</MotionLink></p>
            <MotionLink className="register-home-link" href="/"><ArrowLeft size={14} />Kembali ke beranda</MotionLink>
          </footer>
        </div>
        <small className="register-mobile-copyright">© {new Date().getFullYear()} CourseUp. Seluruh hak cipta dilindungi.</small>
      </section>
    </main>
  );
}