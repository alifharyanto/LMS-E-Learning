"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { LayoutDashboard, LogOut, Menu, Moon, ShieldCheck, Sun, X } from "lucide-react";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { MotionButton, MotionLink } from "@/components/ui/motion";
import QuickSearch from "@/components/ui/quick-search";
import { apiRequest } from "@/lib/browser-api";

export type SessionUser = {
  id: number;
  username: string;
  role: "admin" | "student";
};

export default function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const authPage = pathname === "/login" || pathname === "/register";
  const navLinks = [["Beranda", "/"], ["Kursus Materi", "/kursus"], ["Latihan Soal", "/latihan"], ["Forum", "/forum"], ["Help Center", "/help-center"]];

  useEffect(() => {
    let active = true;
    apiRequest<{ user: SessionUser }>("/api/v1/auth/me")
      .then(({ user: currentUser }) => { if (active) setUser(currentUser); })
      .catch(() => { if (active) setUser(null); });
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    const storedTheme = localStorage.getItem("courseup-theme");
    const enabled = storedTheme ? storedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = enabled ? "dark" : "light";
    const frame = window.requestAnimationFrame(() => setDarkMode(enabled));
    return () => window.cancelAnimationFrame(frame);
  }, []);

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

  async function logout() {
    await apiRequest("/api/v1/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }

  function toggleTheme() {
    const enabled = !darkMode;
    setDarkMode(enabled);
    document.documentElement.dataset.theme = enabled ? "dark" : "light";
    localStorage.setItem("courseup-theme", enabled ? "dark" : "light");
  }

  if (authPage) return <MotionConfig reducedMotion="user"><motion.div key={pathname} className="auth-route" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>{children}</motion.div></MotionConfig>;

  return <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 260, damping: 25 }}><div className="site-app">
    <header className="site-header">
      <nav className="nav-inner" aria-label="Navigasi utama">
        <MotionLink href="/" className="brand"><span className="brand-mark">C</span><span className="brand-name"><span>Course</span>Up</span></MotionLink>
        <div className="nav-links">{navLinks.map(([label, href]) => <MotionLink key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</MotionLink>)}</div>
        <div className="nav-actions">{user ? <><MotionLink className="button button-secondary button-small" href={user.role === "admin" ? "/admin" : "/dashboard"}>{user.role === "admin" ? <ShieldCheck size={14} /> : <LayoutDashboard size={14} />}{user.role === "admin" ? "Panel Admin" : "Dashboard"}</MotionLink><MotionButton className="button button-danger button-small" onClick={() => void logout()}><LogOut size={14} />Keluar</MotionButton></> : <><MotionLink className="button button-secondary button-small" href="/login">Masuk</MotionLink><MotionLink className="button button-primary button-small" href="/register">Daftar</MotionLink></>}</div>
        <QuickSearch open={quickSearchOpen} onOpenChange={setQuickSearchOpen} />
        <MotionButton type="button" className="theme-toggle" aria-label={darkMode ? "Aktifkan light mode" : "Aktifkan dark mode"} title={darkMode ? "Light mode" : "Dark mode"} onClick={toggleTheme}>{darkMode ? <Sun size={17} /> : <Moon size={17} />}</MotionButton>
        <MotionButton type="button" className="menu-button" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</MotionButton>
        <AnimatePresence initial={false}>{menuOpen && <motion.div className="mobile-nav" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>{navLinks.map(([label, href]) => <MotionLink key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</MotionLink>)}{user ? <><MotionLink href={user.role === "admin" ? "/admin" : "/dashboard"}>{user.role === "admin" ? "Panel Admin" : "Dashboard"}</MotionLink><MotionButton onClick={() => void logout()}>Keluar</MotionButton></> : <><MotionLink href="/login">Masuk</MotionLink><MotionLink href="/register">Daftar</MotionLink></>}</motion.div>}</AnimatePresence>
      </nav>
    </header>
    <AnimatePresence mode="wait"><motion.main key={pathname} className="page-wrap" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}><Suspense fallback={<div className="page-loading">Memuat halaman...</div>}>{children}</Suspense></motion.main></AnimatePresence>
    <footer className="site-footer"><div className="footer-inner"><span>© {new Date().getFullYear()} CourseUp. Ruang belajar untuk melangkah lebih jauh.</span><MotionLink href="/contact">Hubungi kami</MotionLink></div></footer>
  </div></MotionConfig>;
}
