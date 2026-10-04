"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, CheckCircle2, FileText, Play, Search } from "lucide-react";
import { MotionLink, Reveal } from "@/components/ui/motion";
import { apiRequest, type ApiError } from "@/lib/browser-api";
import { readCourseProgress, type CourseProgress } from "@/lib/course-progress";
import { createCourseSearchIndex, searchCourseMaterials } from "@/lib/course-search";
import { getCourseMaterialSlug, type CourseMaterial } from "@/lib/course-slug";

export default function KursusPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<CourseMaterial[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [indexingContent, setIndexingContent] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      try {
        const savedProgress = readCourseProgress();
        if (active) setProgress(savedProgress);
      } catch {
        if (!active) return;
        setProgress({ completedIds: [], lastOpenedId: null });
        setError("Progress belajar tidak dapat dibaca dari perangkat ini.");
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    apiRequest<{ materials: CourseMaterial[] }>("/api/v1/courses")
      .then(async ({ materials: items }) => {
        if (!active) return;
        setMaterials(items);
        setIndexingContent(items.length > 0);

        let nextIndex = 0;
        let failedCount = 0;
        let authenticationRequired = false;
        const workers = Array.from({ length: Math.min(4, items.length) }, async () => {
          while (active) {
            const index = nextIndex;
            nextIndex += 1;
            const material = items[index];
            if (!material) return;

            try {
              const { markdown } = await apiRequest<{ markdown: string }>(
                `/api/v1/courses/${material.id}/markdown`,
                { signal: controller.signal },
              );
              setMaterials((current) => current?.map((item) => (
                item.id === material.id ? { ...item, search_content: markdown } : item
              )) ?? current);
            } catch (requestError) {
              if (!active) return;
              if (
                requestError instanceof Error &&
                "status" in requestError &&
                requestError.status === 401
              ) {
                authenticationRequired = true;
              }
              else {
                failedCount += 1;
              }
            }
          }
        });

        await Promise.all(workers);
        if (!active) return;
        setIndexingContent(false);
        if (authenticationRequired) router.replace("/login");
        else if (failedCount > 0) {
          setError(`Isi ${failedCount} materi tidak dapat dianalisis; pencarian tetap mencakup judul, kategori, dan deskripsi.`);
        }
      })
      .catch((requestError: ApiError) => {
        if (!active) return;
        if (requestError.status === 401) router.replace("/login");
        else setError(requestError.message);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [router]);

  const availableMaterials = useMemo(() => materials ?? [], [materials]);
  const searchIndex = useMemo(() => createCourseSearchIndex(availableMaterials), [availableMaterials]);
  const filteredMaterials = searchCourseMaterials(searchIndex, search);
  const categories = useMemo(() => {
    const grouped = new Map<string, CourseMaterial[]>();
    for (const material of filteredMaterials) {
      grouped.set(material.category, [...(grouped.get(material.category) ?? []), material]);
    }
    return Array.from(grouped.entries());
  }, [filteredMaterials]);
  const completedIds = progress?.completedIds ?? [];
  const completedCount = availableMaterials.filter((material) => completedIds.includes(material.id)).length;
  const continueMaterial = availableMaterials.find((material) => material.id === progress?.lastOpenedId);

  return (
    <>
      <header className="page-heading">
        <span className="eyebrow">Kursus Materi</span>
        <h1 className="page-title">Belajar dengan materi yang siap dipakai</h1>
        <p className="page-intro">Pilih materi untuk membaca Markdown atau membuka dokumen PDF.</p>
      </header>
      {error && <p className="status status-error" role="alert">{error}</p>}
      <section className="course-catalog" aria-label="Daftar materi kursus">
        <div className="course-catalog-toolbar">
          <div>
            <span className="course-library-label">Perpustakaan belajar</span>
            <h2 className="surface-title"><BookOpen size={17} />Semua materi</h2>
            <p className="course-progress-summary">
              <span>{completedCount} dari {availableMaterials.length} materi selesai</span>
              <span
                className="course-progress-track"
                role="progressbar"
                aria-label="Progress belajar"
                aria-valuemin={0}
                aria-valuemax={availableMaterials.length}
                aria-valuenow={completedCount}
              >
                <span style={{ width: `${availableMaterials.length ? completedCount / availableMaterials.length * 100 : 0}%` }} />
              </span>
            </p>
          </div>
          <span className="course-count" aria-label={`${filteredMaterials.length} dari ${availableMaterials.length} materi ditampilkan`}>
            {filteredMaterials.length} dari {availableMaterials.length}
          </span>
        </div>
        <div className="course-catalog-filters">
          <label className="material-search">
            <Search size={16} aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari judul, kategori, deskripsi, atau keyword" aria-label="Cari judul, kategori, deskripsi, atau keyword materi" />
          </label>
        </div>
        {continueMaterial && (
          <MotionLink className="course-continue" href={`/kursus/${getCourseMaterialSlug(continueMaterial)}`}>
            <span className="course-continue-icon"><Play size={15} fill="currentColor" /></span>
            <span><small>Lanjutkan belajar</small><strong>{continueMaterial.title}</strong></span>
            <ArrowRight className="course-continue-arrow" size={17} />
          </MotionLink>
        )}
        {materials === null ? (
          <div className="course-catalog-empty" role={error ? "alert" : "status"}>
            {error ? "Daftar materi tidak dapat dimuat." : "Sedang memuat data materi..."}
          </div>
        ) : materials.length === 0 ? (
          <div className="course-catalog-empty">Belum ada materi yang tersedia.</div>
        ) : filteredMaterials.length ? (
          <div className="course-category-list">
            {categories.map(([category, categoryMaterials]) => (
              <section className="course-category" key={category} aria-label={`Materi ${category}`}>
                <div className="course-category-heading">
                  <h3>{category}</h3>
                  <span>{categoryMaterials.length} materi</span>
                </div>
                <div className="course-card-grid">
                  {categoryMaterials.map((material, index) => {
                    const isComplete = completedIds.includes(material.id);
                    return (
                      <Reveal className="course-card-reveal" key={material.id}>
                        <MotionLink className="surface course-card" href={`/kursus/${getCourseMaterialSlug(material)}`}>
                          <div className="course-card-topline">
                            <span className="course-card-icon"><FileText size={18} /></span>
                            <span className={`course-card-format${isComplete ? " is-complete" : ""}`}>
                              {isComplete ? <><CheckCircle2 size={13} />Selesai</> : material.file_type === "text/markdown" ? "Markdown" : "PDF"}
                            </span>
                          </div>
                          <span className="course-card-index">MATERI {String(index + 1).padStart(2, "0")}</span>
                          <h3>{material.title}</h3>
                          {material.description && <p>{material.description}</p>}
                          <div className="course-card-footer">
                            <span>{material.category}</span>
                            <span className="course-card-open">Buka materi <ArrowRight size={15} /></span>
                          </div>
                        </MotionLink>
                      </Reveal>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="course-catalog-empty">
            {indexingContent ? "Menganalisis isi materi untuk mencari hasil yang relevan..." : "Tidak ada materi yang cocok dengan pencarian ini."}
          </div>
        )}
      </section>
    </>
  );
}
