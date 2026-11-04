"use client";

import Image from "next/image";
import { ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MotionButton, MotionLink, Reveal } from "@/components/ui/motion";
import { apiRequest } from "@/lib/browser-api";

type User = { role: "admin" | "student" };

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<{ user: User }>("/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, remember: fields.remember === "on" }) });
      router.push(result.user.role === "admin" ? "/admin" : "/");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Gagal masuk.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell login-page">
      <aside className="auth-brand login-brand">
        <Link href="/" className="brand"><Image src="/course-up-logo.png" alt="Logo Course Up" className="brand-logo" width={39} height={39} /><span className="brand-name" style={{ color: "white" }}>Course<span>Up</span></span></Link>
        <div className="auth-brand-copy login-brand-copy">
          <span className="login-brand-badge"><span />Platform Edukasi Terpadu</span>
          <h1>Ruang belajar untuk melangkah lebih jauh.</h1>
          <p>Kelola materi, latihan, dan progres belajar dalam satu tempat dengan sistem terintegrasi yang memudahkan pengajar dan siswa.</p>
        </div>
        <small className="login-copyright">© {new Date().getFullYear()} CourseUp. All rights reserved.</small>
      </aside>
      <section className="auth-panel login-panel">
        <Reveal className="auth-card-reveal login-card-reveal"><div className="auth-card login-card">
          <Link href="/" className="brand login-mobile-brand">
            <Image src="/course-up-logo.png" alt="Logo Course Up" className="brand-logo" width={44} height={44} />
            <span className="brand-name">Course<span>Up</span></span>
          </Link>
          <header className="login-heading">
            <h2>Selamat datang kembali</h2>
            <p>Masuk ke akun Anda untuk melanjutkan perjalanan belajar.</p>
          </header>
          {error && <p className="status status-error login-error" role="alert">{error}</p>}
          <form className="stack login-form" onSubmit={login}>
            <label className="field login-field">
              <span>Username atau email</span>
              <input className="input" name="identity" autoComplete="username" placeholder="Masukkan username atau email" required />
            </label>
            <label className="field login-field">
              <span>Password</span>
              <div className="login-password-control">
                <input className="input" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Masukkan password" required />
                <button
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={showPassword}
                  className="login-password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <label className="check-row login-remember"><input type="checkbox" name="remember" />Ingat saya di perangkat ini</label>
            <MotionButton className="button button-primary login-submit" disabled={busy}>{busy ? "Memeriksa akun..." : <><LogIn size={16} />Masuk ke CourseUp</>}</MotionButton>
          </form>
          <p className="auth-footer login-register">Belum punya akun? <MotionLink className="link-inline" href="/register">Daftar sekarang</MotionLink></p>
          <p className="auth-footer login-home"><MotionLink className="link-inline" href="/"><ArrowLeft size={14} />Kembali ke beranda</MotionLink></p>
        </div></Reveal>
      </section>
    </main>
  );
}