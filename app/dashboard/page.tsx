"use client";

import { upload as uploadBlob } from "@vercel/blob/client";
import { ArrowRight, BookOpen, Clock3, MessageCircle, Sparkles, Target, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { MotionLink } from "@/components/ui/motion";
import { MotionButton, Reveal, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { apiRequest } from "@/lib/browser-api";

type User = { id: number; username: string; email: string; full_name: string; profile_photo: string };
type QuizResult = { id: number; score: number; total: number; percent: number; created_at: string };
type Dashboard = { user: User; results: QuizResult[]; average: number; threads: number; minutes: number };

export default function DashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Dashboard>("/api/v1/dashboard").then(setDashboard).catch((requestError) => {
      if ((requestError as { status?: number }).status === 401) router.replace("/login");
      else setError(requestError instanceof Error ? requestError.message : "Dashboard gagal dimuat.");
    });
  }, [router]);

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dashboard) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const photo = fields.get("profile_photo");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let photoUrl = "";
      if (photo instanceof File && photo.size > 0) {
        if (!/^image\/(jpeg|png|webp)$/.test(photo.type) || photo.size > 2 * 1024 * 1024) throw new Error("Foto harus JPG, PNG, atau WebP dengan ukuran maksimal 2 MB.");
        const filename = photo.name.replace(/[^a-zA-Z0-9._-]/g, "").slice(-100) || "profile-photo";
        const blob = await uploadBlob(`profiles/${dashboard.user.id}/${Date.now()}-${filename}`, photo, { access: "public", handleUploadUrl: "/api/v1/blob-upload", clientPayload: JSON.stringify({ purpose: "profile" }) });
        photoUrl = blob.url;
      }
      const result = await apiRequest<{ user: User }>("/api/v1/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ full_name: fields.get("full_name"), email: fields.get("email"), ...(photoUrl ? { profile_photo_url: photoUrl } : {}) }) });
      setDashboard({ ...dashboard, user: result.user });
      setMessage("Profil berhasil diperbarui.");
      form.reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Profil gagal diperbarui.");
    } finally {
      setBusy(false);
    }
  }

  if (!dashboard) return <div className="page-loading">Memuat dashboard...</div>;

  const recentResults = dashboard.results.slice(0, 7).reverse();
  const bestRecentScore = recentResults.length ? Math.max(...recentResults.map((result) => result.percent)) : 0;
  const recentAverage = recentResults.length ? Math.round(recentResults.reduce((total, result) => total + result.percent, 0) / recentResults.length) : 0;

  return <>
    <header className="page-heading"><span className="eyebrow">Ruang belajar Anda</span><h1 className="page-title">Halo, {dashboard.user.full_name || dashboard.user.username}</h1><p className="page-intro">Lihat progres dan kelola profil belajar Anda.</p></header>
    {message && <p className="status" role="status">{message}</p>}{error && <p className="status status-error" role="alert">{error}</p>}
    <StaggerGroup className="grid-four dashboard-metrics" aria-label="Ringkasan progres belajar">
      <StaggerItem className="dashboard-metric-item"><div className="metric"><div className="metric-value">{dashboard.results.length}</div><div className="metric-label"><BookOpen size={14} />Kuis diambil</div></div></StaggerItem>
      <StaggerItem className="dashboard-metric-item"><div className="metric"><div className="metric-value">{dashboard.average}%</div><div className="metric-label"><Target size={14} />Nilai rata-rata</div></div></StaggerItem>
      <StaggerItem className="dashboard-metric-item"><div className="metric"><div className="metric-value">{dashboard.threads}</div><div className="metric-label"><MessageCircle size={14} />Thread dibuat</div></div></StaggerItem>
      <StaggerItem className="dashboard-metric-item"><div className="metric"><div className="metric-value">{Math.floor(dashboard.minutes / 60)}j {dashboard.minutes % 60}m</div><div className="metric-label"><Clock3 size={14} />Waktu belajar</div></div></StaggerItem>
    </StaggerGroup>
    <div className="dashboard-insights">
      <Reveal className="dashboard-insight-reveal">
        <section className="surface surface-pad score-insight">
          <div className="insight-heading">
            <div><span className="list-meta">PERFORMA TERBARU</span><h2 className="surface-title">Nilai quiz Anda</h2></div>
            <span className="insight-average">Rata-rata {recentAverage}%</span>
          </div>
          {recentResults.length ? (
            <div className="score-chart" role="img" aria-label={`Grafik ${recentResults.length} nilai quiz terakhir. Rata-rata ${recentAverage} persen.`}>
              <div className="score-chart-bars">
                {recentResults.map((result, index) => <div className="score-chart-column" key={result.id}>
                  <span className="score-chart-value">{result.percent}%</span>
                  <div className="score-chart-track"><span style={{ height: `${Math.max(result.percent, 6)}%` }} /></div>
                  <small>{new Date(result.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</small>
                  <span className="sr-only">Quiz {index + 1}: {result.percent}%</span>
                </div>)}
              </div>
            </div>
          ) : <div className="empty-state score-empty">Selesaikan quiz pertama untuk melihat grafik performa Anda.</div>}
          <div className="score-insight-footer"><span><Sparkles size={14} />Nilai terbaik terakhir <strong>{bestRecentScore}%</strong></span><MotionLink className="link-inline" href="/latihan">Latihan lagi <ArrowRight size={14} /></MotionLink></div>
        </section>
      </Reveal>
      <Reveal className="dashboard-insight-reveal">
        <section className="learning-next">
          <span className="eyebrow">LANGKAH BERIKUTNYA</span>
          <h2>Progres dibangun dari satu langkah kecil.</h2>
          <p>Pilih modul untuk dipelajari atau uji pemahamanmu lewat latihan soal.</p>
          <div className="learning-next-actions"><MotionLink className="button button-primary" href="/kursus"><BookOpen size={15} />Buka materi</MotionLink><MotionLink className="button button-secondary" href="/latihan"><Target size={15} />Mulai latihan</MotionLink></div>
          <span className="learning-next-index">COURSEUP / KEEP GOING</span>
        </section>
      </Reveal>
    </div>
    <div className="grid-two" style={{ marginTop: 20 }}>
      <Reveal className="dashboard-reveal"><section className="surface surface-pad"><h2 className="surface-title"><UserRound size={16} /> Perbarui Profil</h2><form className="form-grid" style={{ marginTop: 17 }} onSubmit={updateProfile}><label className="field"><span>Nama lengkap</span><input className="input" name="full_name" defaultValue={dashboard.user.full_name} required /></label><label className="field"><span>Email</span><input className="input" name="email" type="email" defaultValue={dashboard.user.email} required /></label><label className="field"><span>Foto profil · JPG, PNG, WebP · maks. 2 MB</span><input className="input" name="profile_photo" type="file" accept="image/jpeg,image/png,image/webp" /></label><div className="form-span"><MotionButton className="button button-primary" disabled={busy}>{busy ? "Menyimpan..." : "Simpan Profil"}</MotionButton></div></form></section></Reveal>
      <Reveal className="dashboard-reveal"><section className="surface surface-pad"><h2 className="surface-title"><BookOpen size={16} /> Riwayat Quiz</h2>{dashboard.results.length ? dashboard.results.map((result) => <div className="list-row" key={result.id}><div><div className="list-title">{result.score}/{result.total} jawaban benar</div><div className="list-meta">{new Date(result.created_at).toLocaleString("id-ID")}</div></div><strong>{result.percent}%</strong></div>) : <p className="page-intro">Belum ada hasil quiz.</p>}</section></Reveal>
    </div>
  </>;
}