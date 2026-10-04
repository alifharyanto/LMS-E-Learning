"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, FileText, Search } from "lucide-react";
import { MotionLink, Reveal } from "@/components/ui/motion";
import { apiRequest, type ApiError } from "@/lib/browser-api";
import { createCourseSearchIndex, searchCourseMaterials } from "@/lib/course-search";
import { getCourseMaterialSlug, type CourseMaterial } from "@/lib/course-slug";

export default function KursusPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<CourseMaterial[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [indexingContent, setIndexingContent] = useState(false);

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
        {materials === null ? (
          <div className="course-catalog-empty" role={error ? "alert" : "status"}>
            {error ? "Daftar materi tidak dapat dimuat." : "Sedang memuat data materi..."}
          </div>
        ) : materials.length === 0 ? (
          <div className="course-catalog-empty">Belum ada materi yang tersedia.</div>
        ) : filteredMaterials.length ? (
          <div className="course-card-grid">
            {filteredMaterials.map((material, index) => (
              <Reveal className="course-card-reveal" key={material.id}>
                <MotionLink className="surface course-card" href={`/kursus/${getCourseMaterialSlug(material)}`}>
                  <div className="course-card-topline">
                    <span className="course-card-icon"><FileText size={18} /></span>
                    <span className="course-card-format">{material.file_type === "text/markdown" ? "Markdown" : "PDF"}</span>
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
