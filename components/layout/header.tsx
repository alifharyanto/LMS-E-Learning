"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, LogOut, Menu, Moon, ShieldCheck, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { MotionButton, MotionLink } from "@/components/ui/motion";
import QuickSearch from "@/components/ui/quick-search";

export type SessionUser = {
  id: number;
  username: string;
  role: "admin" | "student";
};

type SiteHeaderProps = {
  user: SessionUser | null;
  darkMode: boolean;
  onLogout: () => void;
  onToggleTheme: () => void;
};

export default function SiteHeader({ user, darkMode, onLogout, onToggleTheme }: SiteHeaderProps) {
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const navLinks = [["Beranda", "/"], ["Kursus Materi", "/kursus"], ["Latihan Soal", "/latihan"], ["Forum", "/forum"], ["Help Center", "/help-center"]];

  useEffect(() => {
    function handleSearchKeys(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setQuickSearchOpen((current) => !current);
      } else if (event.key === "Escape") {
        setQuickSearchOpen(false);
      }
    }

    document.addEventListener("keydown", handleSearchKeys);
    return () => document.removeEventListener("keydown", handleSearchKeys);
  }, []);

  return <header className="site-header">
    <nav className="nav-inner" aria-label="Navigasi utama">
      <MotionLink href="/" className="brand"><span className="brand-mark">C</span><span className="brand-name"><span>Course</span>Up</span></MotionLink>
      <div className="nav-links">{navLinks.map(([label, href]) => <MotionLink key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</MotionLink>)}</div>
      <div className="nav-actions">{user ? <><MotionLink className="button button-secondary button-small" href={user.role === "admin" ? "/admin" : "/dashboard"}>{user.role === "admin" ? <ShieldCheck size={14} /> : <LayoutDashboard size={14} />}{user.role === "admin" ? "Panel Admin" : "Dashboard"}</MotionLink><MotionButton className="button button-danger button-small" onClick={onLogout}><LogOut size={14} />Keluar</MotionButton></> : <><MotionLink className="button button-secondary button-small" href="/login">Masuk</MotionLink><MotionLink className="button button-primary button-small" href="/register">Daftar</MotionLink></>}</div>
      <QuickSearch open={quickSearchOpen} onOpenChange={setQuickSearchOpen} />
      <MotionButton type="button" className="theme-toggle" aria-label={darkMode ? "Aktifkan light mode" : "Aktifkan dark mode"} title={darkMode ? "Light mode" : "Dark mode"} onClick={onToggleTheme}>{darkMode ? <Sun size={17} /> : <Moon size={17} />}</MotionButton>
      <MotionButton type="button" className="menu-button" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</MotionButton>
      <AnimatePresence initial={false}>{menuOpen && <motion.div className="mobile-nav" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>{navLinks.map(([label, href]) => <MotionLink key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</MotionLink>)}{user ? <><MotionLink href={user.role === "admin" ? "/admin" : "/dashboard"}>{user.role === "admin" ? "Panel Admin" : "Dashboard"}</MotionLink><MotionButton onClick={onLogout}>Keluar</MotionButton></> : <><MotionLink href="/login">Masuk</MotionLink><MotionLink href="/register">Daftar</MotionLink></>}</motion.div>}</AnimatePresence>
    </nav>
  </header>;
}