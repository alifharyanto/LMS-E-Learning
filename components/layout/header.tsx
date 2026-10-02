"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, LogOut, Menu, ShieldCheck, UserRound, X } from "lucide-react";
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
  const navLinks = [["Beranda", "/"], ["Kursus Materi", "/kursus"], ["Latihan Soal", "/latihan"]];

  return <header className="site-header">
    <nav className="nav-inner" aria-label="Navigasi utama">
      <MotionLink href="/" className="brand"><span className="brand-mark">C</span><span className="brand-name"><span>Course</span>Up</span></MotionLink>
      <div className="nav-primary-nav">
        <div className="nav-links">{navLinks.map(([label, href]) => <MotionLink key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</MotionLink>)}</div>
      </div>
      {user ? <div className="account-menu desktop-only"><MotionButton type="button" className="account-menu-button" aria-label={`Profil ${user.username}`} aria-haspopup="true"><span className="account-menu-avatar"><UserRound size={17} /></span></MotionButton><div className="account-menu-panel"><MotionLink className="account-menu-item" href={user.role === "admin" ? "/admin" : "/dashboard"}>{user.role === "admin" ? <ShieldCheck size={14} /> : <LayoutDashboard size={14} />}<span>{user.role === "admin" ? "Panel Admin" : "Dashboard"}</span></MotionLink><MotionButton className="account-menu-item danger" onClick={onLogout}><LogOut size={14} /><span>Keluar</span></MotionButton></div></div> : <div className="nav-actions"><MotionLink className="button button-secondary button-small" href="/login">Masuk</MotionLink><MotionLink className="button button-primary button-small" href="/register">Daftar</MotionLink></div>}
      <MotionButton type="button" className="menu-button" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</MotionButton>
      <AnimatePresence initial={false}>{menuOpen && <motion.div className="mobile-nav" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>{navLinks.map(([label, href]) => <MotionLink key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</MotionLink>)}{user ? <><MotionLink href={user.role === "admin" ? "/admin" : "/dashboard"}>{user.role === "admin" ? "Panel Admin" : "Dashboard"}</MotionLink><MotionButton onClick={onLogout}>Keluar</MotionButton></> : <><MotionLink href="/login">Masuk</MotionLink><MotionLink href="/register">Daftar</MotionLink></>}</motion.div>}</AnimatePresence>
    </nav>
  </header>;
}