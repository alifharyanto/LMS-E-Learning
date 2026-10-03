"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Expand, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { MotionButton, MotionLink, Reveal } from "@/components/ui/motion";
import { apiRequest, type ApiError } from "@/lib/browser-api";
import { getCourseMaterialSlug, type CourseMaterial } from "@/lib/course-slug";

export default function CourseMaterialPage({ slug }: { slug: string }) {
  const router = useRouter();
  const [materials, setMaterials] = useState<CourseMaterial[] | null>(null);
  const [markdown, setMarkdown] = useState<{ materialId: number; text: string } | null>(null);
  const [markdownError, setMarkdownError] = useState<{ materialId: number; message: string } | null>(null);
  const [error, setError] = useState("");

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
          <div className="course-detail-breadcrumb">
            <span>Kursus Materi</span><span aria-hidden="true">/</span><span>{selected.category}</span>
          </div>
        )}
      </header>
      {error && <p className="status status-error" role="alert">{error}</p>}
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
        <Reveal className="course-detail-reveal">
          <article className="surface surface-pad course-detail">
            <header className="course-reader-heading">
              <div>
                <span className="course-reader-category">MATERI · {selected.category}</span>
                <h1 className="surface-title">{selected.title}</h1>
                {selected.description && <p className="page-intro">{selected.description}</p>}
              </div>
              {!selectedIsMarkdown && (
                <MotionButton type="button" className="button button-secondary button-small" onClick={() => document.querySelector<HTMLIFrameElement>("#materialViewer")?.requestFullscreen()}>
                  <Expand size={14} />Buka fullscreen
                </MotionButton>
              )}
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
      )}
    </>
  );
}
