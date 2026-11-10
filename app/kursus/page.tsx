"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenText, FileText, House, LogOut, NotebookText, Play, Search, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import MobileStudentNavigation from "@/components/layout/mobile-student-navigation";
import { apiRequest, type ApiError } from "@/lib/browser-api";
import { readCourseProgress, type CourseProgress } from "@/lib/course-progress";
import { getCourseMaterialSlug, type CourseMaterial } from "@/lib/course-slug";

const navItems = [
  { label: "Beranda", href: "/", icon: House, active: false },
  { label: "My Profile", href: "/profile", icon: UserRound, active: false },
  { label: "Kursus Materi", href: "/kursus", icon: BookOpenText, active: true },
  { label: "Latihan Soal", href: "/latihan", icon: NotebookText, active: false },
  { label: "Code Editor", href: "/code", icon: FileText, active: false },
];

export default function KursusPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentUserName, setCurrentUserName] = useState("user CourseUp");
  const [materials, setMaterials] = useState<CourseMaterial[] | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<CourseProgress>({ completedIds: [], lastOpenedId: null });
  const [progressError, setProgressError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const savedName = window.localStorage.getItem("courseup_user_name");
        if (savedName) setCurrentUserName(savedName);
      } catch {
        setProgressError("Pengaturan profil tidak dapat dibaca di perangkat ini.");
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest<{ materials: CourseMaterial[] }>("/api/v1/courses")
      .then(({ materials: items }) => {
        if (active) setMaterials(items);
      })
      .catch((requestError: ApiError) => {
        if (!active) return;
        if (requestError.status === 401) router.replace("/login");
        else setError(requestError.message);
      });

    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        setProgress(readCourseProgress());
      } catch {
        setProgressError("Progress belajar tidak dapat dibaca di perangkat ini.");
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const button = document.getElementById("profileDropdownBtn");
      const menu = document.getElementById("profileDropdownMenu");
      if (!button?.contains(target) && !menu?.contains(target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const filteredMaterials = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return materials ?? [];

    return (materials ?? []).filter((item) => {
      return [item.title, item.category, item.description ?? ""].some((field) => field.toLowerCase().includes(value));
    });
  }, [materials, query]);

  const groups = useMemo(() => {
    const map = new Map<string, CourseMaterial[]>();
    for (const item of filteredMaterials) {
      const current = map.get(item.category) ?? [];
      current.push(item);
      map.set(item.category, current);
    }
    return Array.from(map.entries());
  }, [filteredMaterials]);

  const completedCount = materials?.filter((material) => progress.completedIds.includes(material.id)).length ?? 0;
  const progressPercent = materials?.length ? completedCount / materials.length * 100 : 0;
  const continueMaterial = materials?.find((material) => material.id === progress.lastOpenedId) ?? materials?.[0];
  const initial = currentUserName.trim().charAt(0).toUpperCase() || "C";

  return (
    <div className="course-library-page flex min-h-screen bg-[#F4F7FB] text-[#1E293B] antialiased">
      <MobileStudentNavigation activePage="courses" />
      <aside className="course-library-sidebar sticky top-0 flex h-screen w-64 min-w-[16rem] shrink-0 flex-col justify-between border-r border-[#e2e8f0] bg-white">
        <div className="flex flex-col">
          <div className="flex items-center space-x-3 border-b border-[#f1f5f9] px-6 py-6">
            <div className="flex items-center gap-3">
              <Image
                alt="CourseUp Icon"
                className="h-10 w-10 shrink-0 object-contain"
                src="/course-up-logo.png"
                height={40}
                width={40}
              />
              <span className="flex select-none items-center text-[26px] font-extrabold leading-none tracking-tight">
                <span className="text-[#b2d7e6]">Course</span>
                <span className="text-[#437188]">Up</span>
              </span>
            </div>
          </div>

          <div className="profile-sidebar-navigation">
            <p>Menu Utama</p>
            <nav aria-label="Navigasi utama">
              {navItems.map(({ label, href, icon: Icon, active }) => (
                <a
                  key={label}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`profile-nav-link${active ? " is-active" : ""}`}
                >
                  <Icon />
                  <span>{label}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="border-t border-[#f1f5f9] px-4 pb-6 pt-4">
          <a href="/login" className="flex w-full items-center space-x-3 rounded-xl px-3.5 py-1 text-sm font-semibold transition-colors duration-150 hover:bg-red-50" style={{ color: "#ef4444" }}>
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </a>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-[#F4F7FB]">
        <header className="course-library-header sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#e2e8f0] bg-white/70 px-8 backdrop-blur-md">
          <div className="flex items-center space-x-3 text-sm">
            <span className="rounded-full bg-[#def3f6] px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[#437188]" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              Ruang Belajar Anda
            </span>
            <span className="text-[#cbd5e1]">/</span>
            <span className="font-semibold text-[#64748b]">Kursus Materi</span>
          </div>

          <div className="relative">
            <button
              id="profileDropdownBtn"
              type="button"
              onClick={() => setDropdownOpen((value) => !value)}
              aria-label={`Profil ${currentUserName}`}
              aria-expanded={dropdownOpen}
              className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 p-0.5 shadow-sm transition-all hover:border-[#527F95] focus:outline-none focus:ring-2 focus:ring-[#527F95]/20"
            >
              <span className="flex h-full w-full items-center justify-center rounded-full bg-[#527F95] text-xs font-bold tracking-wider text-white" style={{ backgroundColor: "rgb(114, 158, 179)" }}>
                {initial}
              </span>
            </button>

            <div
              id="profileDropdownMenu"
              className={[
                "absolute right-0 z-50 mt-2 w-48 rounded-xl border border-[#e2e8f0] bg-white py-2 shadow-lg transition-all duration-150",
                dropdownOpen ? "block" : "hidden",
              ].join(" ")}
            >
              <div className="p-1.5">
                <a href="/login" className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50">
                  <LogOut className="h-4 w-4 text-rose-500" />
                  <span>Logout</span>
                </a>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl space-y-6 p-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-4 w-1.5 rounded-full bg-[#608da2]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">KURSUS MATERI</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1e293b] sm:text-4xl">Belajar dengan materi yang siap dipakai</h1>
            <p className="text-sm text-[#64748b] sm:text-base">Pilih materi untuk membaca Markdown atau membuka dokumen PDF.</p>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">PERPUSTAKAAN BELAJAR</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookOpenText className="h-6 w-6 text-[#1e293b]" />
                <h2 className="text-xl font-bold text-[#1e293b]">Semua materi</h2>
              </div>
              <span className="rounded-full bg-[#e2e8f0] px-3.5 py-1 text-xs font-semibold text-[#334155]">{filteredMaterials.length} dari {materials?.length ?? 0}</span>
            </div>
            <p className="text-xs text-[#64748b]">{completedCount} dari {materials?.length ?? 0} materi selesai</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
              <div className="h-full rounded-full bg-[#608da2]" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          {progressError && <p className="status status-error" role="alert">{progressError}</p>}

          <div className="relative w-full pt-1">
            <Search className="absolute left-3.5 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari judul, kategori, deskripsi, atau keyword"
              className="w-full rounded-xl border border-[#cbd5e1] bg-white px-10 py-3 text-xs text-[#1e293b] shadow-sm transition-all placeholder:text-[#94a3b8] focus:border-[#608da2] focus:outline-none focus:ring-1 focus:ring-[#608da2]"
            />
          </div>

          {continueMaterial && (
            <Link
              href={`/kursus/${getCourseMaterialSlug(continueMaterial)}`}
              className="flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm transition-all hover:border-[#cbd5e1]"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3b667a] text-white shadow-sm">
                  <Play className="ml-0.5 h-5 w-5 fill-current" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#64748b]">Lanjutkan belajar</p>
                  <h4 className="text-sm font-bold text-[#1e293b]">{continueMaterial.title}</h4>
                </div>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e293b] text-xs font-bold text-white shadow-sm">
                <ArrowRight aria-hidden="true" size={18} />
              </div>
            </Link>
          )}

          {materials === null ? (
            <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-8 text-center text-sm text-[#64748b]" role="status">
              {error || "Memuat materi..."}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-8 text-center text-sm text-[#64748b]" role="alert">
              Materi tidak dapat dimuat: {error}
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-8 text-center text-sm text-[#64748b]">
              {materials?.length ? "Tidak ada materi yang cocok dengan pencarian ini." : "Belum ada materi yang tersedia."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {groups.map(([category, items]) => (
                <div key={category} className="flex h-full flex-col space-y-3">
                  <div className="flex items-center justify-between px-0.5">
                    <h3 className="truncate text-base font-bold text-[#1e293b]">{category}</h3>
                    <span className="shrink-0 text-xs text-[#64748b]">{items.length} materi</span>
                  </div>

                  {items.map((item, index) => (
                    <div key={item.id} className="flex h-[280px] flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                      <div className="flex flex-1 flex-col">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#def3f6] text-[#437188]">
                            <FileText className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-semibold text-[#64748b]">{item.file_type === "text/markdown" ? "Markdown" : "PDF"}</span>
                        </div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">MATERI {String(index + 1).padStart(2, "0")}</p>
                        <h4 className="line-clamp-1 text-lg font-bold leading-snug text-[#1e293b] transition-colors hover:text-[#437188]">{item.title}</h4>
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#64748b]">{item.description}</p>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-[#f1f5f9] pt-5 text-xs">
                        <span className="max-w-[150px] truncate font-medium text-[#64748b]">{item.category}</span>
                        <Link href={`/kursus/${getCourseMaterialSlug(item)}`} className="inline-flex shrink-0 items-center gap-1 font-bold text-[#437188] transition-colors hover:text-[#335364]">
                          <span>Buka materi</span>
                          <span className="text-sm">→</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div className="mt-10 flex w-full items-center justify-between border-t border-[#cbd5e1]/40 pb-6 pt-12 text-xs text-[#64748b]">
            <p>© 2026 CourseUp. Ruang belajar untuk melangkah lebih jauh.</p>
            <a href="#" className="shrink-0 text-right font-medium text-[#437188] transition-colors hover:text-[#335364]">Hubungi kami</a>
          </div>
        </div>
      </main>
    </div>
  );
}
