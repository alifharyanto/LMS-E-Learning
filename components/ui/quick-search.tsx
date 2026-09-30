"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, BookOpen, Brain, Command, HelpCircle, Home, MessageSquare, Search, UserRound, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MotionButton } from "@/components/ui/motion";
import { FAQS } from "@/lib/faqs";

type SearchEntry = {
  label: string;
  description: string;
  href: string;
  keywords: string;
  icon: LucideIcon;
  group: "Halaman" | "Pertanyaan";
};

const pages: SearchEntry[] = [
  { label: "Beranda", description: "Kembali ke halaman utama", href: "/", keywords: "home utama", icon: Home, group: "Halaman" },
  { label: "Kursus Materi", description: "Cari dan baca modul belajar", href: "/kursus", keywords: "modul pdf pelajaran materi", icon: BookOpen, group: "Halaman" },
  { label: "Latihan Soal", description: "Pilih kategori dan mulai quiz", href: "/latihan", keywords: "quiz latihan ujian skor", icon: Brain, group: "Halaman" },
  { label: "Forum", description: "Diskusi dan berbagi pengetahuan", href: "/forum", keywords: "komunitas diskusi thread komentar", icon: MessageSquare, group: "Halaman" },
  { label: "Dashboard", description: "Lihat progres dan profil belajar", href: "/dashboard", keywords: "nilai progres profil siswa", icon: UserRound, group: "Halaman" },
  { label: "Help Center", description: "Temukan jawaban atau hubungi kami", href: "/help-center", keywords: "bantuan support kontak", icon: HelpCircle, group: "Halaman" },
];

const questions: SearchEntry[] = FAQS.map((faq) => ({
  label: faq.question,
  description: faq.answer,
  href: `/help-center#faq-${faq.id}`,
  keywords: `${faq.question} ${faq.answer}`,
  icon: HelpCircle,
  group: "Pertanyaan",
}));

const entries = [...pages, ...questions];

export default function QuickSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
  const results = normalizedQuery
    ? entries.filter((entry) => `${entry.label} ${entry.description} ${entry.keywords}`.toLocaleLowerCase("id-ID").includes(normalizedQuery))
    : pages;

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  function navigate(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onOpenChange(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => results.length ? (index + 1) % results.length : 0);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => results.length ? (index - 1 + results.length) % results.length : 0);
    }
    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      navigate(results[activeIndex].href);
    }
  }

  return <>
    <MotionButton ref={triggerRef} type="button" className="quick-search-trigger" aria-label="Cari halaman dan bantuan" aria-expanded={open} title="Cari (Ctrl/⌘ K)" onClick={() => { setQuery(""); setActiveIndex(0); onOpenChange(true); }}>
      <Search size={17} />
      <span>Cari</span>
      <kbd><Command size={11} /> K</kbd>
    </MotionButton>
    {open && typeof document !== "undefined" && createPortal(
        <motion.div className="quick-search-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onOpenChange(false); }}>
          <motion.section className="quick-search-dialog" role="dialog" aria-modal="true" aria-label="Pencarian CourseUp" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onOpenChange(false); } }} initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 25 }}>
            <div className="quick-search-input-row"><Search size={19} /><input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={handleInputKeyDown} placeholder="Cari materi, halaman, atau jawaban..." aria-label="Kata pencarian" aria-controls="quick-search-results" aria-activedescendant={results[activeIndex] ? `quick-search-option-${activeIndex}` : undefined} /><button type="button" className="quick-search-close" aria-label="Tutup pencarian" onClick={() => onOpenChange(false)}><X size={16} /></button></div>
            <div className="quick-search-caption">{normalizedQuery ? `${results.length} hasil ditemukan` : "JALUR CEPAT"}</div>
            <div id="quick-search-results" className="quick-search-results" role="listbox">
              {results.length ? results.map((entry, index) => {
                const Icon = entry.icon;
                return <MotionButton id={`quick-search-option-${index}`} key={`${entry.group}-${entry.href}`} type="button" role="option" aria-selected={index === activeIndex} className="quick-search-result" onMouseEnter={() => setActiveIndex(index)} onClick={() => navigate(entry.href)}><span className="quick-search-icon"><Icon size={17} /></span><span className="quick-search-copy"><strong>{entry.label}</strong><small>{entry.description}</small></span><ArrowUpRight size={15} /></MotionButton>;
              }) : <div className="quick-search-empty">Tidak ada hasil. Coba kata kunci lain.</div>}
            </div>
            <footer className="quick-search-footer"><span><kbd>↑</kbd><kbd>↓</kbd> navigasi</span><span><kbd>↵</kbd> buka</span><span><kbd>esc</kbd> tutup</span></footer>
          </motion.section>
        </motion.div>,
      document.body,
    )}
  </>;
}
