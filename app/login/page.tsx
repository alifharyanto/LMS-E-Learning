"use client";

import { ArrowLeft, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MotionButton, MotionLink, Reveal } from "@/components/ui/motion";
import { apiRequest } from "@/lib/browser-api";

type User = { role: "admin" | "student" };

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<{ user: User }>("/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, remember: fields.remember === "on" }) });
      router.push(result.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Gagal masuk.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <aside className="auth-brand">
        <MotionLink href="/" className="brand"><span className="brand-mark">C</span><span className="brand-name" style={{ color: "white" }}>Course<span>Up</span></span></MotionLink>
        <div className="auth-brand-copy"><h1>Ruang belajar untuk melangkah lebih jauh.</h1><p>Kelola materi, latihan, dan progres belajar dalam satu tempat.</p></div>
        <small>© {new Date().getFullYear()} CourseUp</small>
      </aside>
      <section className="auth-panel">
        <Reveal className="auth-card-reveal"><div className="auth-card">
          <h2>Selamat datang kembali</h2>
          <p>Masuk untuk melanjutkan perjalanan belajar Anda.</p>
          {error && <p className="status status-error" role="alert">{error}</p>}
          <form className="stack" onSubmit={login}>
            <label className="field"><span>Username atau email</span><input className="input" name="identity" autoComplete="username" required /></label>
            <label className="field"><span>Password</span><input className="input" name="password" type="password" autoComplete="current-password" required /></label>
            <label className="check-row"><input type="checkbox" name="remember" />Ingat saya</label>
            <MotionButton className="button button-primary" disabled={busy}>{busy ? "Memeriksa akun..." : <><LogIn size={15} />Masuk ke CourseUp</>}</MotionButton>
          </form>
          <p className="auth-footer">Belum punya akun? <MotionLink className="link-inline" href="/register">Daftar sekarang</MotionLink></p>
          <p className="auth-footer"><MotionLink className="link-inline" href="/"><ArrowLeft size={14} />Kembali ke beranda</MotionLink></p>
        </div></Reveal>
      </section>
    </main>
  );
}