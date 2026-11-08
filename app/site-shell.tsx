"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpenText, FileText, House, LogOut, NotebookText, UserRound } from "lucide-react";
import SiteFooter from "@/components/layout/footer";
import SiteHeader, { type SessionUser } from "@/components/layout/header";
import MobileStudentNavigation from "@/components/layout/mobile-student-navigation";
import { apiRequest } from "@/lib/browser-api";

const studentNavigationItems = [
  { label: "Beranda", href: "/", icon: House },
  { label: "My Profile", href: "/profile", icon: UserRound },
  { label: "Kursus Materi", href: "/kursus", icon: BookOpenText },
  { label: "Latihan Soal", href: "/latihan", icon: NotebookText },
  { label: "Code Editor", href: "/code", icon: FileText },
];

export default function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const authPage = pathname === "/login" || pathname === "/register";
  const practicePage = pathname === "/latihan" || pathname.startsWith("/latihan/");

  useEffect(() => {
    let active = true;
    apiRequest<{ user: SessionUser }>("/api/v1/auth/me")
      .then(({ user: currentUser }) => { if (active) setUser(currentUser); })
      .catch(() => { if (active) setUser(null); });
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    document.documentElement.dataset.theme = "light";
  }, []);

  async function logout() {
    await apiRequest("/api/v1/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return children;

  if (authPage) return <MotionConfig reducedMotion="user"><motion.div key={pathname} className="auth-route" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>{children}</motion.div></MotionConfig>;

  if (pathname === "/code" || pathname.startsWith("/code/live/local/")) return <MotionConfig reducedMotion="user"><div className="code-route-shell"><Suspense fallback={<div className="page-loading">Memuat editor...</div>}>{children}</Suspense></div></MotionConfig>;

  if (practicePage) return <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 260, damping: 25 }}>
    <div className="practice-route-layout">
      <aside className="profile-sidebar practice-desktop-sidebar" aria-label="Navigasi siswa">
        <div>
          <div className="profile-sidebar-brand">
            <Image src="/course-up-logo.png" alt="CourseUp Logo" width={40} height={40} />
            <span><span>Course</span><strong>Up</strong></span>
          </div>
          <div className="profile-sidebar-navigation">
            <p>Menu Utama</p>
            <nav aria-label="Navigasi utama">
              {studentNavigationItems.map(({ label, href, icon: Icon }) => (
                <Link key={href} href={href} aria-current={href === "/latihan" ? "page" : undefined} className={`profile-nav-link${href === "/latihan" ? " is-active" : ""}`}>
                  <Icon />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <div className="profile-sidebar-logout">
          <button type="button" onClick={() => void logout()}><LogOut /><span>Logout</span></button>
        </div>
      </aside>
      <div className="practice-route-main">
        <MobileStudentNavigation activePage="practice" />
        <AnimatePresence mode="wait"><motion.main key={pathname} className="practice-route-content" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}><Suspense fallback={<div className="page-loading">Memuat halaman...</div>}>{children}</Suspense></motion.main></AnimatePresence>
      </div>
    </div>
  </MotionConfig>;

  if (pathname === "/" || pathname === "/profile" || pathname === "/kursus" || pathname.startsWith("/kursus/")) {
    return <MotionConfig reducedMotion="user"><div className="site-app"><AnimatePresence mode="wait"><motion.main key={pathname} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}><Suspense fallback={<div className="page-loading">Memuat halaman...</div>}>{children}</Suspense></motion.main></AnimatePresence></div></MotionConfig>;
  }

  return <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 260, damping: 25 }}><div className="site-app">
    <SiteHeader user={user} onLogout={() => void logout()} />
    <AnimatePresence mode="wait"><motion.main key={pathname} className="page-wrap" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}><Suspense fallback={<div className="page-loading">Memuat halaman...</div>}>{children}</Suspense></motion.main></AnimatePresence>
    <SiteFooter />
  </div></MotionConfig>;
}
