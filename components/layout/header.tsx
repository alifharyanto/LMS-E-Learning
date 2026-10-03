"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, UserRound, X } from "lucide-react";
import { useState } from "react";
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
  const navLinks = [["Beranda", "/"], ["Kursus Materi", "/kursus"], ["Latihan Soal", "/latihan"], ["Code Editor", "/code"]];

  return <header className="site-header">
    <nav className="nav-inner" aria-label="Navigasi utama">
      <MotionLink href="/" className="brand"><span className="brand-mark">C</span><span className="brand-name"><span>Course</span>Up</span></MotionLink>
      <div className="nav-primary-nav">
        <div className="nav-links">{navLinks.map(([label, href]) => <MotionLink key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</MotionLink>)}</div>
      </div>
      {user ? <>
        <div className="account-actions desktop-only">
          <MotionLink className="account-action account-profile-action" href={user.role === "admin" ? "/admin" : "/dashboard"} aria-label={user.role === "admin" ? "Panel Admin" : "Dashboard"}>
            <UserRound size={17} aria-hidden="true" />
          </MotionLink>
          <MotionButton type="button" className="account-action account-logout-action" aria-label="Keluar" title="Keluar" onClick={onLogout}>
            <LogOut size={17} aria-hidden="true" />
          </MotionButton>
        </div>
        <MotionLink className="mobile-profile-action" href={user.role === "admin" ? "/admin" : "/dashboard"} aria-label={user.role === "admin" ? "Panel Admin" : "Dashboard"} title={user.role === "admin" ? "Panel Admin" : "Dashboard"}>
          <UserRound size={19} aria-hidden="true" />
        </MotionLink>
      </> : <div className="nav-actions"><MotionLink className="button button-secondary button-small" href="/login">Masuk</MotionLink><MotionLink className="button button-primary button-small" href="/register">Daftar</MotionLink></div>}
      <MotionButton type="button" className="menu-button" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</MotionButton>
      <AnimatePresence initial={false}>{menuOpen && <motion.div className="mobile-nav" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>{navLinks.map(([label, href]) => <MotionLink key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</MotionLink>)}{user ? <><MotionLink href={user.role === "admin" ? "/admin" : "/dashboard"}>{user.role === "admin" ? "Panel Admin" : "Dashboard"}</MotionLink><MotionButton onClick={onLogout}>Keluar</MotionButton></> : <><MotionLink href="/login">Masuk</MotionLink><MotionLink href="/register">Daftar</MotionLink></>}</motion.div>}</AnimatePresence>
    </nav>
  </header>;
}