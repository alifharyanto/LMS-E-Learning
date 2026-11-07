"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpenText, FileText, House, LogOut, Menu, NotebookText, UserRound, X } from "lucide-react";

const navigationItems = [
  { label: "Beranda", href: "/", icon: House, activePage: "home" },
  { label: "My Profile", href: "/profile", icon: UserRound, activePage: "profile" },
  { label: "Kursus Materi", href: "/kursus", icon: BookOpenText, activePage: "courses" },
  { label: "Latihan Soal", href: "/latihan", icon: NotebookText, activePage: null },
  { label: "Code Editor", href: "/code", icon: FileText, activePage: null },
] as const;

type MobileStudentNavigationProps = {
  activePage: "home" | "profile" | "courses";
};

export default function MobileStudentNavigation({ activePage }: MobileStudentNavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="student-mobile-header">
        <Link href="/" aria-label="CourseUp Beranda" className="student-mobile-brand">
          <Image src="/course-up-logo.png" alt="" width={32} height={32} />
          <span>Course<strong>Up</strong></span>
        </Link>
        <div className="student-mobile-actions">
          <Link href="/profile" aria-label="Profil" title="Profil" className="student-mobile-action">
            <UserRound />
          </Link>
          <button
            type="button"
            aria-label={menuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-controls="student-mobile-navigation"
            aria-expanded={menuOpen}
            className="student-mobile-action"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <button
        type="button"
        aria-label="Tutup menu navigasi"
        tabIndex={menuOpen ? 0 : -1}
        className={`student-mobile-backdrop${menuOpen ? " is-open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />
      <aside
        id="student-mobile-navigation"
        role="dialog"
        aria-label="Menu navigasi"
        aria-modal={menuOpen}
        aria-hidden={!menuOpen}
        className={`student-mobile-drawer${menuOpen ? " is-open" : ""}`}
      >
        <div className="student-mobile-drawer-header">
          <button type="button" aria-label="Tutup menu navigasi" onClick={() => setMenuOpen(false)}>
            <X />
          </button>
        </div>
        <nav aria-label="Navigasi utama" className="student-mobile-drawer-links">
          {navigationItems.map(({ label, href, icon: Icon, activePage: itemPage }) => (
            <Link
              key={href}
              href={href}
              aria-current={itemPage === activePage ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="student-mobile-drawer-footer">
          <Link href="/login" onClick={() => setMenuOpen(false)}><LogOut /><span>Logout</span></Link>
        </div>
      </aside>
    </>
  );
}
