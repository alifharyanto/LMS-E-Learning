"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Expand, FileText, FilterX, Search } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { apiRequest, type ApiError } from "@/lib/browser-api";
import { MotionButton, Reveal } from "@/components/ui/motion";

type Material = { id: number; title: string; description: string | null; category: string; file_path: string | null };

export default function KursusPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeMaterial, setActiveMaterial] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua kategori");
  const [readerMode, setReaderMode] = useState<"markdown" | "pdf">("markdown");
  const [markdown, setMarkdown] = useState<{ materialId: number; text: string; pages: number } | null>(null);
  const [markdownError, setMarkdownError] = useState<{ materialId: number; message: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<{ materials: Material[] }>("/api/v1/courses")
      .then(({ materials: items }) => {
        setMaterials(items);
        setActiveMaterial(items[0]?.id ?? null);
      })
      .catch((requestError: ApiError) => {
        if (requestError.status === 401) router.replace("/login");
        else setError(requestError.message);
      });
  }, [router]);

  useEffect(() => {
    if (activeMaterial === null) return;
    let active = true;
    apiRequest<{ markdown: string; pages: number }>(`/api/v1/courses/${activeMaterial}/markdown`)
      .then((result) => {
        if (!active) return;
        setMarkdown({ materialId: activeMaterial, text: result.markdown, pages: result.pages });
        setMarkdownError(null);
      })
      .catch((requestError: ApiError) => {
        if (!active) return;
        if (requestError.status === 401) router.replace("/login");
        setMarkdownError({ materialId: activeMaterial, message: requestError.message });
      });
    return () => { active = false; };
  }, [activeMaterial, router]);

  const selected = materials.find((material) => material.id === activeMaterial);
  const selectedMarkdown = markdown?.materialId === activeMaterial ? markdown : null;
  const selectedMarkdownError = markdownError?.materialId === activeMaterial ? markdownError.message : "";
  const markdownLoading = activeMaterial !== null && !selectedMarkdown && !selectedMarkdownError;
  const categories = [...new Set(materials.map((material) => material.category).filter(Boolean))].sort((first, second) => first.localeCompare(second, "id"));
  const normalizedSearch = search.trim().toLocaleLowerCase("id-ID");
  const filteredMaterials = materials.filter((material) => {
    const matchesSearch = `${material.title} ${material.category}`.toLocaleLowerCase("id-ID").includes(normalizedSearch);
    return matchesSearch && (categoryFilter === "Semua kategori" || material.category === categoryFilter);
  });

  return <>
    <header className="page-heading"><span className="eyebrow">Kursus Materi</span><h1 className="page-title">Belajar dengan materi yang siap dipakai</h1><p className="page-intro">Akses modul PDF langsung di platform.</p></header>
    {error && <p className="status status-error" role="alert">{error}</p>}
    <div className="split-layout">
      <Reveal className="course-reveal"><aside className="surface surface-pad course-library"><div className="course-library-heading"><h2 className="surface-title"><BookOpen size={16} /> Daftar Modul</h2><span className="list-meta">{filteredMaterials.length} / {materials.length}</span></div><label className="material-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari judul atau kategori" aria-label="Cari materi" /></label><div className="material-filter-row"><label className="sr-only" htmlFor="materialCategory">Kategori materi</label><select id="materialCategory" className="select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>Semua kategori</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>{(search || categoryFilter !== "Semua kategori") && <MotionButton type="button" className="material-clear" aria-label="Hapus filter" title="Hapus filter" onClick={() => { setSearch(""); setCategoryFilter("Semua kategori"); }}><FilterX size={16} /></MotionButton>}</div><div className="material-list">{materials.length ? filteredMaterials.length ? filteredMaterials.map((material) => <MotionButton type="button" className="material-item" aria-current={activeMaterial === material.id} key={material.id} onClick={() => { setActiveMaterial(material.id); setReaderMode("markdown"); }}><span className="list-title">{material.title}</span><span className="list-meta" style={{ display: "block" }}>{material.category} · {material.file_path ? "PDF" : "File belum ada"}</span></MotionButton>) : <p className="empty-state">Tidak ada modul yang cocok dengan filter ini.</p> : <p className="empty-state">Belum ada materi yang tersedia.</p>}</div></aside></Reveal>
      <Reveal className="course-reveal"><section className="surface surface-pad course-reader"><div className="course-reader-heading"><div><span className="list-meta">MODUL PILIHAN · {selected?.category ?? "KURSUS"}</span><h2 className="surface-title">{selected?.title ?? "Pilih modul untuk mulai membaca"}</h2>{selected?.description && <p className="page-intro">{selected.description}</p>}</div>{readerMode === "pdf" && activeMaterial && <MotionButton className="button button-secondary button-small" onClick={() => document.querySelector<HTMLIFrameElement>("#materialViewer")?.requestFullscreen()}><Expand size={14} />Fullscreen</MotionButton>}</div>
        {activeMaterial && <div className="material-reader-tabs" role="tablist" aria-label="Mode membaca"><MotionButton type="button" role="tab" aria-selected={readerMode === "markdown"} className={readerMode === "markdown" ? "reader-tab is-active" : "reader-tab"} onClick={() => setReaderMode("markdown")}><FileText size={15} />Teks rapi <span>Markdown</span></MotionButton><MotionButton type="button" role="tab" aria-selected={readerMode === "pdf"} className={readerMode === "pdf" ? "reader-tab is-active" : "reader-tab"} onClick={() => setReaderMode("pdf")}><BookOpen size={15} />PDF asli</MotionButton></div>}
        {!activeMaterial ? <div className="empty-state">Belum ada materi untuk ditampilkan.</div> : readerMode === "pdf" ? <iframe id="materialViewer" className="material-frame" src={`/api/v1/courses/${activeMaterial}/file`} title={`PDF ${selected?.title ?? "materi"}`} /> : markdownLoading ? <div className="markdown-status">Menyusun teks materi...</div> : selectedMarkdownError ? <div className="markdown-status markdown-error"><p>{selectedMarkdownError}</p><MotionButton type="button" className="button button-secondary button-small" onClick={() => setReaderMode("pdf")}>Buka PDF asli</MotionButton></div> : <article className="markdown-document"><div className="markdown-document-meta"><span><FileText size={14} />Versi teks yang dirapikan</span><span>{selectedMarkdown?.pages ?? 0} halaman</span></div><ReactMarkdown>{selectedMarkdown?.text ?? ""}</ReactMarkdown></article>}
      </section></Reveal>
    </div>
  </>;
}