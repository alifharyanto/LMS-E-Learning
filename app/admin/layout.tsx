"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, Brain, ChartNoAxesColumn, ContactRound, GraduationCap, History, LayoutDashboard, ListChecks, UsersRound } from "lucide-react";
import { useLayoutEffect, useRef, type ReactNode } from "react";

const menu = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/murid", label: "Murid", icon: GraduationCap },
  { href: "/admin/materi", label: "Materi", icon: BookOpen },
  { href: "/admin/quiz", label: "Kategori Quiz", icon: Brain },
  { href: "/admin/hasilbelajar", label: "Hasil belajar", icon: ChartNoAxesColumn },
  { href: "/admin/soal", label: "Quiz", icon: ListChecks },
  { href: "/admin/kontak", label: "Kontak", icon: ContactRound },
  { href: "/admin/akun", label: "Akun", icon: UsersRound },
  { href: "/admin/aktivitas", label: "Aktivitas", icon: History },
];
const adminNavScrollStorageKey = "courseup-admin-nav-scroll-left";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin/dashboard";
  const adminNavRef = useRef<HTMLElement>(null);
  const savedNavScrollLeft = useRef(0);
  const restoringNavScroll = useRef(false);

  useLayoutEffect(() => {
    const nav = adminNavRef.current;
    if (!nav) return;

    try {
      const storedScrollLeft = window.sessionStorage.getItem(adminNavScrollStorageKey);
      if (storedScrollLeft !== null) savedNavScrollLeft.current = Number(storedScrollLeft) || 0;
    } catch {}

    restoringNavScroll.current = true;
    nav.scrollLeft = savedNavScrollLeft.current;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      nav.scrollLeft = savedNavScrollLeft.current;
      secondFrame = window.requestAnimationFrame(() => {
        nav.scrollLeft = savedNavScrollLeft.current;
        restoringNavScroll.current = false;
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [pathname]);

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="admin-sidebar-brand" href="/admin/dashboard"><span className="admin-brand-mark">C</span><span><strong>CourseUp</strong><small>ADMIN WORKSPACE</small></span></Link>
      <span className="admin-sidebar-label">MENU UTAMA</span>
      <nav
        className="admin-nav"
        aria-label="Navigasi admin"
        ref={adminNavRef}
        onScroll={(event) => {
          if (!restoringNavScroll.current) {
            savedNavScrollLeft.current = event.currentTarget.scrollLeft;
            try { window.sessionStorage.setItem(adminNavScrollStorageKey, String(savedNavScrollLeft.current)); } catch {}
          }
        }}
      >
        {menu.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href === "/admin/dashboard" && pathname === "/admin");
          return <Link
            href={href}
            key={href}
            aria-current={active ? "page" : undefined}
            className={active ? "is-active" : undefined}
            onClick={() => {
              if (href !== pathname) {
                savedNavScrollLeft.current = adminNavRef.current?.scrollLeft ?? savedNavScrollLeft.current;
                try { window.sessionStorage.setItem(adminNavScrollStorageKey, String(savedNavScrollLeft.current)); } catch {}
                restoringNavScroll.current = true;
              }
            }}
          ><span className="admin-nav-link"><Icon size={17} />{label}</span></Link>;
        })}
      </nav>
      <div className="admin-sidebar-foot"><Activity size={15} /><span>Panel administrasi</span></div>
    </aside>
    <main className="admin-main">{children}</main>
  </div>;
}
