"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, BookOpenText, CheckCircle2, Clock3, FileText, House, LogOut, MessageSquareText, NotebookText, PlayCircle, UserRound } from "lucide-react";
import MobileStudentNavigation from "@/components/layout/mobile-student-navigation";
import { apiRequest, type ApiError } from "@/lib/browser-api";
import { readCourseProgress, type CourseProgress } from "@/lib/course-progress";
import { getCourseMaterialSlug, type CourseMaterial } from "@/lib/course-slug";

const navItems = [
  { label: "Beranda", active: true, icon: House },
  { label: "My Profile", active: false, icon: UserRound },
  { label: "Kursus Materi", active: false, icon: BookOpenText },
  { label: "Latihan Soal", active: false, icon: NotebookText },
  { label: "Code Editor", active: false, icon: FileText },
];

const stats = [
  { name: "KUIS DIAMBIL", value: "5", icon: BookOpen },
  { name: "NILAI RATA-RATA", value: "68%", icon: BarChart3 },
  { name: "THREAD DIBUAT", value: "1", icon: MessageSquareText },
  { name: "WAKTU BELAJAR", value: "5j 24m", icon: Clock3 },
];

const quizHistory = [
  { title: "Design • 1/1 benar", meta: "0 salah • 0 tidak dijawab • 25/10/2026, 20.26.03", score: "100%", strong: true },
  { title: "Basis Data • 14/15 benar", meta: "1 salah • 0 tidak dijawab • 25/10/2026, 19.52.16", score: "93%", strong: true },
  { title: "Design • 0/1 benar", meta: "1 salah • 0 tidak dijawab • 24/10/2026, 04.30.33", score: "0%", strong: false },
  { title: "Pemrograman perangkat bergerak • 17/20 benar", meta: "3 salah • 0 tidak dijawab • 22/10/2026, 12.07.39", score: "85%", strong: true },
  { title: "Pemrograman perangkat bergerak • 12/20 benar", meta: "8 salah • 0 tidak dijawab • 22/10/2026, 12.05.06", score: "60%", strong: false },
];

export default function HomePage() {
  const profileButtonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullName, setFullName] = useState("user CourseUp");
  const [courseMaterials, setCourseMaterials] = useState<CourseMaterial[] | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress>({ completedIds: [], lastOpenedId: null });
  const [courseProgressReady, setCourseProgressReady] = useState(false);
  const [courseError, setCourseError] = useState("");
  const [courseRequiresLogin, setCourseRequiresLogin] = useState(false);

  useEffect(() => {
    const storedName = window.localStorage.getItem("courseup_username");
    if (storedName) {
      setFullName(storedName);
    }
  }, []);

  useEffect(() => {
    let active = true;
    try {
      setCourseProgress(readCourseProgress());
    } catch {
      setCourseError("Progress kursus tidak dapat dibaca di perangkat ini.");
    } finally {
      setCourseProgressReady(true);
    }

    apiRequest<{ materials: CourseMaterial[] }>("/api/v1/courses")
      .then(({ materials }) => {
        if (active) setCourseMaterials(materials);
      })
      .catch((requestError: ApiError) => {
        if (!active) return;
        setCourseMaterials([]);
        if (requestError.status === 401) {
          setCourseRequiresLogin(true);
          setCourseError("Masuk untuk melihat riwayat kursus.");
        } else {
          setCourseError(requestError.message);
        }
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!profileButtonRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  const greetingName = fullName || "user CourseUp";
  const initials = greetingName.trim().charAt(0).toUpperCase() || "C";
  const recentCourseMaterials = (courseMaterials ?? [])
    .filter((material) => material.id === courseProgress.lastOpenedId || courseProgress.completedIds.includes(material.id))
    .sort((first, second) => Number(second.id === courseProgress.lastOpenedId) - Number(first.id === courseProgress.lastOpenedId))
    .slice(0, 5);

  return (
    <>
    <MobileStudentNavigation activePage="home" />
    <div className="flex min-h-[calc(100vh_-_64px)] bg-[#F4F7FB] text-slate-800 antialiased lg:min-h-screen">
      <aside className="z-30 hidden min-h-screen w-64 shrink-0 flex-col border-r border-slate-200/90 bg-white lg:flex" data-purpose="main-sidebar">
        <div className="profile-sidebar-brand" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
          <Image src="/course-up-logo.png" alt="CourseUp Logo" width={40} height={40} />
          <span><span>Course</span><strong>Up</strong></span>
        </div>

        <div className="profile-sidebar-navigation">
          <p>Menu Utama</p>
          <nav aria-label="Navigasi utama">
            {navItems.map(({ label, active, icon: Icon }) => {
              const href = label === "Beranda" ? "/" : label === "My Profile" ? "/profile" : label === "Kursus Materi" ? "/kursus" : label === "Latihan Soal" ? "/latihan" : "/code";
              return (
                <Link key={label} href={href} aria-current={active ? "page" : undefined} className={`profile-nav-link${active ? " is-active" : ""}`}>
                  <Icon />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-slate-100 p-4 pb-8">
          <a href="/login" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-rose-50/80" style={{ color: "#ef4444" }}>
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-[#F4F7FB]">
        <header className="sticky top-0 z-20 hidden h-20 items-center justify-between border-b border-slate-200/90 bg-white px-8 lg:flex" data-purpose="top-navbar">
          <div className="flex items-center space-x-3 text-sm">
            <span className="rounded-full bg-[#def3f6] px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[#437188]" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              Ruang Belajar Anda
            </span>
            <span className="text-[#cbd5e1]">/</span>
            <span className="font-semibold text-[#64748b]">Dashboard Siswa</span>
          </div>

          <div className="relative" data-purpose="profile-menu-container">
            <button
              ref={profileButtonRef}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 p-0.5 shadow-sm transition-all hover:border-[#527F95] focus:outline-none focus:ring-2 focus:ring-[#527F95]/20"
              id="profileButton"
              title="Buka menu profil"
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#527F95] text-xs font-bold tracking-wider text-white" id="userAvatarInitials" style={{ backgroundColor: "rgb(114, 158, 179)" }}>
                {initials}
              </div>
            </button>

            <div
              ref={dropdownRef}
              className={[
                "absolute right-0 z-50 mt-2.5 w-48 rounded-2xl border border-slate-100 bg-white py-2 shadow-xl shadow-slate-900/10 transition-all",
                menuOpen ? "block" : "hidden",
              ].join(" ")}
              id="profileDropdown"
            >
              <div className="p-1.5">
                <a className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50" href="/login">
                  <LogOut className="h-4 w-4 text-rose-500" />
                  <span>Logout</span>
                </a>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col space-y-4 p-4 lg:max-w-7xl lg:space-y-6 lg:p-8">
          <section className="relative overflow-hidden rounded-2xl bg-[#527F95] p-5 text-white shadow-sm lg:p-6" style={{ background: "linear-gradient(135deg, rgb(83, 125, 146) 0%, rgb(124, 168, 189) 100%)" }} data-purpose="welcome-banner">
            <div className="relative z-10 space-y-1">
              <h2 className="flex items-center gap-2.5 text-xl font-black tracking-tight lg:text-2xl">
                Halo, <span id="greeting-username">{greetingName}</span> ! <span className="inline-block">👋</span>
              </h2>
              <p className="text-xs font-medium lg:text-sm" style={{ color: "rgb(235, 248, 250)" }}>Semangat belajar hari ini, raih prestasi terbaikmu!</p>
            </div>
            <div className="pointer-events-none absolute -bottom-16 -right-12 h-56 w-56 rounded-full" style={{ backgroundColor: "rgba(235, 248, 250, 0.2)" }} />
            <div className="pointer-events-none absolute -top-12 right-16 h-40 w-40 rounded-full bg-white/5" />
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" data-purpose="stats-cards">
            {stats.map(({ name, value, icon: Icon }) => (
              <div key={name} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-shadow hover:shadow lg:gap-3.5 lg:p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl lg:h-12 lg:w-12" style={{ backgroundColor: "rgb(235, 248, 250)", color: "rgb(82, 128, 149)" }}>
                  <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-[9px] font-bold uppercase leading-tight tracking-wider text-slate-400 lg:text-[10px]">{name}</span>
                  <div className="mt-0.5 text-xl font-black leading-tight text-slate-900 lg:text-2xl">{value}</div>
                </div>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6" data-purpose="charts-and-action-grid">
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm lg:col-span-8 lg:p-6">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PERFORMA TERBARU</span>
                    <h3 className="text-lg font-bold text-slate-900">Nilai quiz Anda</h3>
                  </div>
                  <span className="rounded-full border border-[#B2D7E6] bg-[#EBF8FA] px-2.5 py-1 text-[11px] font-semibold text-[#437188] lg:px-3 lg:text-xs" style={{ backgroundColor: "rgb(235, 248, 250)", color: "rgb(82, 128, 149)", borderColor: "rgb(178, 215, 230)" }}>
                    Rata-rata 68%
                  </span>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 lg:mt-8 lg:p-5">
                  <div className="flex h-40 items-end justify-around gap-1.5 border-b border-slate-200 px-2 pb-2 lg:h-48 lg:gap-2 lg:px-4">
                    {[
                      { percent: 60, label: "22 Okt" },
                      { percent: 85, label: "22 Okt" },
                      { percent: 0, label: "24 Okt" },
                      { percent: 93, label: "25 Okt" },
                      { percent: 100, label: "25 Okt" },
                    ].map((bar, index) => (
                      <div key={`${bar.label}-${index}`} className="group flex h-full max-w-[56px] flex-1 flex-col items-center justify-end">
                        <span className="mb-1 text-[10px] font-bold text-slate-600 lg:text-[11px]">{bar.percent}%</span>
                        <div className="relative flex h-28 w-full items-end overflow-hidden rounded border border-slate-200 bg-slate-100 lg:h-36">
                          <div
                            className="w-full rounded-b bg-[#86EFAC] transition-all duration-500"
                            style={{
                              height: `${bar.percent}%`,
                              backgroundColor: index % 2 === 0 ? "rgb(168, 207, 223)" : "rgb(114, 158, 179)",
                            }}
                          />
                        </div>
                        <span className="mt-1.5 text-[9px] font-medium text-slate-500 lg:mt-2 lg:text-[11px]">{bar.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 lg:text-xs">
                  <span className="text-amber-500">✨</span>
                  <span><span className="lg:hidden">Terbaik:</span><span className="hidden lg:inline">Nilai terbaik terakhir:</span> <strong className="text-slate-900">100%</strong></span>
                </div>
                <a className="flex items-center gap-1 text-xs font-bold hover:underline" href="/latihan" style={{ color: "rgb(82, 128, 149)" }}>
                  <span>Latihan lagi</span>
                  <span>→</span>
                </a>
              </div>
            </div>

            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#527F95] p-5 text-white shadow-sm lg:col-span-4 lg:p-6" style={{ background: "linear-gradient(135deg, rgb(83, 125, 146) 0%, rgb(124, 168, 189) 100%)" }}>
              <div className="pointer-events-none absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/5" />
              <div className="pointer-events-none absolute -top-10 -left-10 h-32 w-32 rounded-full bg-emerald-500/10" />
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider lg:text-[10px]" style={{ color: "rgb(235, 248, 250)" }}>LANGKAH BERIKUTNYA</span>
                <h3 className="mt-1 text-lg font-bold leading-snug lg:mt-2 lg:text-xl">Progres dibangun dari satu langkah kecil.</h3>
                <p className="mt-2 text-xs leading-relaxed lg:mt-3" style={{ color: "rgba(235, 248, 250, 0.9)" }}>
                  Pilih modul untuk dipelajari atau uji pemahamanmu lewat latihan soal.
                </p>
              </div>
              <div className="my-4 grid grid-cols-2 gap-2.5 lg:my-6 lg:flex lg:flex-col lg:space-y-2.5">
                <Link className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/20" href="/kursus">
                  <span>📖</span>
                  <span>Buka materi</span>
                </Link>
                <a className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all" href="/latihan" style={{ backgroundColor: "rgb(61, 96, 112)", borderColor: "rgb(178, 215, 230)" }}>
                  <span>🎯</span>
                  <span>Mulai latihan</span>
                </a>
              </div>
              <div className="hidden border-t border-white/10 pt-3 text-[10px] font-mono uppercase tracking-widest lg:block" style={{ color: "rgb(235, 248, 250)" }}>
                COURSEUP / KEEP GOING
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6" data-purpose="course-and-quiz-history-grid">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm lg:col-span-6 lg:p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpenText className="h-4 w-4 shrink-0" style={{ color: "rgb(114, 158, 179)" }} />
                  <h3 className="text-base font-bold text-slate-900">Riwayat Kursus</h3>
                </div>
                <Link className="inline-flex items-center gap-1 text-xs font-bold hover:underline" href="/kursus" style={{ color: "rgb(82, 128, 149)" }}>
                  Semua materi <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {!courseRequiresLogin && <p className="mb-2 text-[11px] text-slate-500">
                {courseProgress.completedIds.length} materi selesai
                {courseProgress.lastOpenedId !== null ? " · terakhir dibuka" : ""}
              </p>}

              {courseMaterials === null || !courseProgressReady ? (
                <p className="py-8 text-center text-xs text-slate-500" role="status">{courseError || "Memuat riwayat kursus..."}</p>
              ) : recentCourseMaterials.length ? (
                <div className="divide-y divide-slate-100" data-purpose="course-history-list">
                  {recentCourseMaterials.map((material) => {
                    const isLastOpened = material.id === courseProgress.lastOpenedId;
                    const isCompleted = courseProgress.completedIds.includes(material.id);
                    return (
                      <Link
                        key={material.id}
                        className="-mx-1 flex min-w-0 items-center justify-between gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-slate-50/70 sm:-mx-2 sm:px-2"
                        href={`/kursus/${getCourseMaterialSlug(material)}`}
                      >
                        <span className="flex min-w-0 items-start gap-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EBF8FA] text-[#527F95]">
                            {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-bold text-slate-800">{material.title}</span>
                            <span className="mt-1 block truncate text-[11px] text-slate-400">{material.category}</span>
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-[10px] font-semibold text-[#527F95]">
                          {isLastOpened ? "Terakhir dibuka" : "Selesai"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="py-7 text-center">
                  <p className="text-xs font-semibold text-slate-700">{courseRequiresLogin ? "Masuk untuk melihat riwayat kursus" : "Belum ada kursus di riwayat"}</p>
                  {!courseRequiresLogin && <p className="mt-1 text-[11px] text-slate-500">Materi yang dibuka atau diselesaikan akan muncul di sini.</p>}
                  {courseError && !courseRequiresLogin && <p className="mt-2 text-[11px] text-rose-600">{courseError}</p>}
                  <Link className="mt-3 inline-flex items-center gap-1 text-xs font-bold hover:underline" href={courseRequiresLogin ? "/login" : "/kursus"} style={{ color: "rgb(82, 128, 149)" }}>
                    {courseRequiresLogin ? "Masuk" : "Jelajahi materi"} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm lg:col-span-6 lg:p-6">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4" style={{ color: "rgb(114, 158, 179)" }} />
                <h3 className="text-base font-bold text-slate-900">Riwayat Quiz</h3>
              </div>

              <div className="divide-y divide-slate-100" data-purpose="quiz-history-list">
                {quizHistory.map(({ title, meta, score, strong }) => (
                  <div key={`${title}-${score}`} className="-mx-1 flex items-center justify-between rounded-lg px-1 py-2.5 transition-colors hover:bg-slate-50/50 lg:-mx-2 lg:px-2 lg:py-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800">{title}</p>
                      <p className="text-[11px] text-slate-400">{meta}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={[
                          "inline-block w-16 rounded-md border px-0 py-1 text-center text-xs font-extrabold",
                          strong ? "border-[#B2D7E6] bg-[#EBF8FA] text-[#437188]" : "border-slate-200 bg-slate-100 text-slate-600",
                        ].join(" ")}
                        style={strong ? { backgroundColor: "rgb(235, 248, 250)", color: "rgb(82, 128, 149)", borderColor: "rgb(178, 215, 230)" } : undefined}
                      >
                        {score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <footer className="flex w-full flex-col items-center justify-center gap-1.5 border-t border-[#608da2]/15 pt-4 text-center text-[11px] font-medium text-[#608da2] lg:mt-12 lg:flex-row lg:justify-between lg:pt-6 lg:text-left lg:text-xs">
            <span>© 2026 CourseUp. Ruang belajar siswa.</span>
            <a href="#" className="transition hover:underline">Hubungi kami</a>
          </footer>
        </main>
      </div>
    </div>
    </>
  );
}
