"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Expand, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { MotionButton, MotionLink, Reveal } from "@/components/ui/motion";
import { apiRequest, type ApiError } from "@/lib/browser-api";
import { readCourseProgress, saveCourseProgress, type CourseProgress } from "@/lib/course-progress";
import { getCourseMaterialSlug, type CourseMaterial } from "@/lib/course-slug";

export default function CourseMaterialPage({ slug }: { slug: string }) {
  const router = useRouter();
  const [materials, setMaterials] = useState<CourseMaterial[] | null>(null);
  const [markdown, setMarkdown] = useState<{ materialId: number; text: string } | null>(null);
  const [markdownError, setMarkdownError] = useState<{ materialId: number; message: string } | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<CourseProgress>({ completedIds: [], lastOpenedId: null });
  const [progressReady, setProgressReady] = useState(false);
  const [progressError, setProgressError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      try {
        const savedProgress = readCourseProgress();
        if (active) setProgress(savedProgress);
      } catch {
        if (active) setProgressError("Progress belajar tidak dapat dibaca atau disimpan di perangkat ini.");
      } finally {
        if (active) setProgressReady(true);
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

  const selected = materials?.find((material) => getCourseMaterialSlug(material) === slug);
  const selectedIsMarkdown = selected?.file_type === "text/markdown";
  const selectedIndex = selected ? materials?.findIndex((material) => material.id === selected.id) ?? -1 : -1;
  const previousMaterial = selectedIndex > 0 ? materials?.[selectedIndex - 1] : undefined;
  const nextMaterial = selectedIndex >= 0 ? materials?.[selectedIndex + 1] : undefined;
  const categoryMaterials = materials?.filter((material) => material.category === selected?.category) ?? [];
  const completedCount = materials?.filter((material) => progress.completedIds.includes(material.id)).length ?? 0;
  const isComplete = selected ? progress.completedIds.includes(selected.id) : false;

  useEffect(() => {
    if (!selected || !progressReady || progress.lastOpenedId === selected.id) return;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      const nextProgress = { ...progress, lastOpenedId: selected.id };
      try {
        saveCourseProgress(nextProgress);
        setProgress(nextProgress);
        setProgressError("");
      } catch {
        setProgressError("Materi terbuka, tetapi progress terakhir tidak dapat disimpan.");
      }
    });
    return () => { active = false; };
  }, [progress, progressReady, selected]);

  function toggleComplete() {
    if (!selected) return;
    const completedIds = isComplete
      ? progress.completedIds.filter((id) => id !== selected.id)
      : [...progress.completedIds, selected.id];
    const nextProgress = { ...progress, completedIds };
    try {
      saveCourseProgress(nextProgress);
      setProgress(nextProgress);
      setProgressError("");
    } catch {
      setProgressError("Status selesai tidak dapat disimpan. Periksa pengaturan penyimpanan browser.");
    }
  }

  useEffect(() => {
    if (!selected || !selectedIsMarkdown) return;
    let active = true;
    apiRequest<{ markdown: string }>(`/api/v1/courses/${selected.id}/markdown`)
      .then((result) => {
        if (!active) return;
        setMarkdown({ materialId: selected.id, text: result.markdown });
        setMarkdownError(null);
      })
      .catch((requestError: ApiError) => {
        if (!active) return;
        if (requestError.status === 401) router.replace("/login");
        setMarkdownError({ materialId: selected.id, message: requestError.message });
      });

    return () => { active = false; };
  }, [router, selected, selectedIsMarkdown]);

  const selectedMarkdown = selected && markdown?.materialId === selected.id ? markdown.text : null;
  const selectedMarkdownError = selected && markdownError?.materialId === selected.id ? markdownError.message : "";

  return (
    <>
      <header className="course-detail-top">
        <MotionLink className="course-back-link" href="/kursus"><ArrowLeft size={16} />Kembali ke daftar materi</MotionLink>
        {selected && (
          <nav className="course-detail-breadcrumb" aria-label="Breadcrumb">
            <MotionLink href="/kursus">Kursus Materi</MotionLink><span aria-hidden="true">/</span>
            <span>{selected.category}</span><span aria-hidden="true">/</span><span aria-current="page">{selected.title}</span>
          </nav>
        )}
      </header>
      {error && <p className="status status-error" role="alert">{error}</p>}
      {progressError && <p className="status status-error" role="alert">{progressError}</p>}
      {materials === null ? error ? (
        <section className="surface surface-pad course-not-found">
          <h1 className="surface-title">Materi tidak dapat dimuat</h1>
          <p className="page-intro">Periksa koneksi Anda, lalu coba buka kembali daftar materi.</p>
          <MotionLink className="button button-primary" href="/kursus"><ArrowLeft size={15} />Kembali ke daftar materi</MotionLink>
        </section>
      ) : (
        <div className="page-loading" role="status">Memuat materi...</div>
      ) : !selected ? (
        <section className="surface surface-pad course-not-found">
          <h1 className="surface-title">Materi tidak ditemukan</h1>
          <p className="page-intro">Materi ini mungkin telah dihapus atau tautannya sudah tidak berlaku.</p>
          <MotionLink className="button button-primary" href="/kursus"><ArrowLeft size={15} />Kembali ke daftar materi</MotionLink>
        </section>
      ) : (
        <div className="course-learning-layout">
          <aside className="course-learning-sidebar" aria-label="Navigasi materi">
            <div className="course-learning-progress">
              <div><strong>Progress belajar</strong><span>{completedCount} / {materials?.length ?? 0} selesai</span></div>
              <div className="course-progress-track" role="progressbar" aria-label="Progress belajar" aria-valuemin={0} aria-valuemax={materials?.length ?? 0} aria-valuenow={completedCount}>
                <span style={{ width: `${materials?.length ? completedCount / materials.length * 100 : 0}%` }} />
              </div>
            </div>
            <nav className="course-lesson-nav" aria-label="Daftar materi">
              <h2>{selected.category}</h2>
              <ol>
                {categoryMaterials.map((material) => {
                  const active = material.id === selected.id;
                  const complete = progress.completedIds.includes(material.id);
                  return (
                    <li key={material.id}>
                      <MotionLink
                        className={`course-lesson-link${active ? " is-active" : ""}${complete ? " is-complete" : ""}`}
                        href={`/kursus/${getCourseMaterialSlug(material)}`}
                        aria-current={active ? "page" : undefined}
                      >
                        {complete ? <CheckCircle2 size={16} aria-label="Selesai" /> : <Circle size={16} aria-hidden="true" />}
                        <span>{material.title}</span>
                      </MotionLink>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </aside>
          <div className="course-learning-main">
            <Reveal className="course-detail-reveal">
              <article className="surface surface-pad course-detail">
                <header className="course-reader-heading">
                  <div>
                    <span className="course-reader-category">MATERI {selectedIndex + 1} DARI {materials?.length ?? 0} · {selected.category}</span>
                    <h1 className="surface-title">{selected.title}</h1>
                    {selected.description && <p className="page-intro">{selected.description}</p>}
                  </div>
                  <div className="course-reader-actions">
                    {!selectedIsMarkdown && (
                      <MotionButton type="button" className="button button-secondary button-small" onClick={() => document.querySelector<HTMLIFrameElement>("#materialViewer")?.requestFullscreen()}>
                        <Expand size={14} />Buka fullscreen
                      </MotionButton>
                    )}
                    <MotionButton
                      type="button"
                      className={`button ${isComplete ? "button-secondary" : "button-primary"} button-small`}
                      aria-pressed={isComplete}
                      onClick={toggleComplete}
                    >
                      {isComplete ? <CheckCircle2 size={15} /> : <Check size={15} />}
                      {isComplete ? "Tandai belum selesai" : "Tandai selesai"}
                    </MotionButton>
                  </div>
                </header>
                {selectedIsMarkdown ? selectedMarkdownError ? (
                  <div className="markdown-status markdown-error" role="alert"><p>{selectedMarkdownError}</p></div>
                ) : selectedMarkdown === null ? (
                  <div className="markdown-status" role="status">Memuat materi Markdown...</div>
                ) : (
                  <section className="markdown-document" aria-label={`Isi materi ${selected.title}`}>
                    <div className="markdown-document-meta"><span><FileText size={14} />Materi Markdown</span></div>
                    <ReactMarkdown>{selectedMarkdown}</ReactMarkdown>
                  </section>
                ) : (
                  <iframe id="materialViewer" className="material-frame" src={`/api/v1/courses/${selected.id}/file`} title={`PDF ${selected.title}`} />
                )}
              </article>
            </Reveal>
            <nav className="course-lesson-pager" aria-label="Navigasi materi sebelumnya dan berikutnya">
              {previousMaterial ? (
                <MotionLink className="course-pager-link is-previous" href={`/kursus/${getCourseMaterialSlug(previousMaterial)}`}>
                  <ArrowLeft size={16} /><span><small>Sebelumnya</small><strong>{previousMaterial.title}</strong></span>
                </MotionLink>
              ) : <span />}
              {nextMaterial ? (
                <MotionLink className="course-pager-link is-next" href={`/kursus/${getCourseMaterialSlug(nextMaterial)}`}>
                  <span><small>Selanjutnya</small><strong>{nextMaterial.title}</strong></span><ArrowRight size={16} />
                </MotionLink>
              ) : <MotionLink className="course-pager-link is-next" href="/kursus">
                <span><small>Berikutnya</small><strong>Kembali ke semua materi</strong></span><ArrowRight size={16} />
              </MotionLink>}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
