"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, LogOut, Menu, ShieldCheck, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MotionButton, MotionLink } from "@/components/ui/motion";

export type SessionUser = {
  id: number;
  username: string;
  role: "admin" | "student";
};

type SiteHeaderProps = {
  user: SessionUser | null;
  onLogout: () => void;
};

export default function SiteHeader({ user, onLogout }: SiteHeaderProps) {
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = [["Beranda", "/"], ["Kursus Materi", "/kursus"], ["Latihan Soal", "/latihan"]];

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return <header className="site-header">
    <nav className="nav-inner" aria-label="Navigasi utama">
      <MotionLink href="/" className="brand"><span className="brand-mark">C</span><span className="brand-name"><span>Course</span>Up</span></MotionLink>
      <div className="nav-primary-nav">
        <div className="nav-links">{navLinks.map(([label, href]) => <MotionLink key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</MotionLink>)}</div>
      </div>
      {user ? <div className="account-menu desktop-only"><MotionButton type="button" className="account-menu-button" aria-label={`Profil ${user.username}`} aria-haspopup="true"><span className="account-menu-avatar"><UserRound size={17} /></span></MotionButton><div className="account-menu-panel"><MotionLink className="account-menu-item" href={user.role === "admin" ? "/admin" : "/dashboard"}>{user.role === "admin" ? <ShieldCheck size={14} /> : <LayoutDashboard size={14} />}<span>{user.role === "admin" ? "Panel Admin" : "Dashboard"}</span></MotionLink><MotionButton className="account-menu-item danger" onClick={onLogout}><LogOut size={14} /><span>Keluar</span></MotionButton></div></div> : <div className="nav-actions"><MotionLink className="button button-secondary button-small" href="/login">Masuk</MotionLink><MotionLink className="button button-primary button-small" href="/register">Daftar</MotionLink></div>}
      <div className="mobile-header-actions">
        <MotionLink
          className="mobile-profile-button"
          href={user?.role === "admin" ? "/admin" : "/dashboard"}
          aria-label={user?.role === "admin" ? "Panel Admin" : "Dashboard"}
        >
          <UserRound size={19} />
        </MotionLink>
        <MotionButton type="button" className="menu-button" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</MotionButton>
      </div>
      {typeof document !== "undefined" && createPortal(<AnimatePresence initial={false}>
        {menuOpen && <motion.div
          className="mobile-nav-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
          initial={{ opacity: 0, x: "8%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "8%" }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mobile-nav-header">
            <span className="mobile-nav-title">Menu</span>
            <MotionButton type="button" className="mobile-nav-close" aria-label="Tutup menu" onClick={() => setMenuOpen(false)}><X size={23} /></MotionButton>
          </div>
          <div className="mobile-nav-links">
            {navLinks.map(([label, href], index) => <MotionLink
              key={href}
              className="mobile-nav-link"
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              <span className="mobile-nav-emoji" aria-hidden="true">{["🏠", "📚", "📝"][index]}</span>
              <span>{label}</span>
            </MotionLink>)}
            {user ? <>
              <MotionLink className="mobile-nav-link" href={user.role === "admin" ? "/admin" : "/dashboard"} onClick={() => setMenuOpen(false)}>
                <span className="mobile-nav-emoji" aria-hidden="true">{user.role === "admin" ? <ShieldCheck size={22} /> : <LayoutDashboard size={22} />}</span>
                <span>{user.role === "admin" ? "Panel Admin" : "Dashboard"}</span>
              </MotionLink>
              <MotionButton className="mobile-nav-link mobile-nav-logout" onClick={() => { setMenuOpen(false); onLogout(); }}>
                <span className="mobile-nav-emoji" aria-hidden="true">🚪</span>
                <span>Keluar</span>
              </MotionButton>
            </> : <>
              <MotionLink className="mobile-nav-link" href="/login" onClick={() => setMenuOpen(false)}>Masuk</MotionLink>
              <MotionLink className="mobile-nav-link" href="/register" onClick={() => setMenuOpen(false)}>Daftar</MotionLink>
            </>}
          </div>
        </motion.div>}
      </AnimatePresence>, document.body)}
    </nav>
  </header>;
}