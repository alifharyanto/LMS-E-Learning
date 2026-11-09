"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Activity, BookOpen, Brain, ChartNoAxesColumn, ChevronLeft, ChevronRight, ContactRound, GraduationCap, History, LayoutDashboard, ListChecks, LogOut, Menu, UsersRound, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "@/lib/browser-api";

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
const adminSidebarStorageKey = "courseup-admin-sidebar-collapsed";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin/dashboard";
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    try { setCollapsed(window.localStorage.getItem(adminSidebarStorageKey) === "true"); } catch {}
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [drawerOpen]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try { window.localStorage.setItem(adminSidebarStorageKey, String(next)); } catch {}
      return next;
    });
  }

  async function logout() {
    setLogoutError("");
    try {
      await apiRequest("/api/v1/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Gagal keluar. Silakan coba lagi.");
    }
  }

  return <div className={`admin-layout${collapsed ? " is-collapsed" : ""}${drawerOpen ? " is-drawer-open" : ""}`}>
    <button className={`admin-drawer-backdrop${drawerOpen ? " is-open" : ""}`} type="button" aria-label="Tutup navigasi" tabIndex={drawerOpen ? 0 : -1} onClick={() => setDrawerOpen(false)} />
    <aside className="admin-sidebar" aria-label="Navigasi administrator">
      <div className="admin-sidebar-header">
        <Link className="admin-sidebar-brand" href="/admin/dashboard" aria-label="CourseUp Admin">
          <Image className="brand-logo" src="/course-up-logo.png" alt="" width={39} height={39} priority />
          <span className="admin-brand-copy"><span className="brand-name"><span>Course</span>Up</span></span>
        </Link>
        <button className="admin-drawer-close" type="button" aria-label="Tutup navigasi" onClick={() => setDrawerOpen(false)}><X size={20} /></button>
      </div>
      <span className="admin-sidebar-label">MENU UTAMA</span>
      <nav className="admin-nav" aria-label="Navigasi admin">
        {menu.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(`${href}/`)) || (href === "/admin/dashboard" && pathname === "/admin");
          return <Link
            href={href}
            key={href}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            title={collapsed ? label : undefined}
            className={active ? "is-active" : undefined}
            onClick={() => setDrawerOpen(false)}
          ><span className="admin-nav-link"><Icon size={18} strokeWidth={1.8} /><span className="admin-nav-text">{label}</span></span></Link>;
        })}
      </nav>
      <div className="admin-sidebar-foot"><Activity size={16} /><span>Panel administrasi</span></div>
      {logoutError && <p className="admin-logout-error" role="alert">{logoutError}</p>}
      <button className="admin-logout" type="button" aria-label="Logout" title={collapsed ? "Logout" : undefined} onClick={() => void logout()}>
        <LogOut size={18} aria-hidden="true" />
        <span>Logout</span>
      </button>
      <button className="admin-sidebar-collapse" type="button" aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"} aria-expanded={!collapsed} title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"} onClick={toggleCollapsed}>
        {collapsed ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}
      </button>
    </aside>
    <main className="admin-main">
      <header className="admin-topbar" aria-label="Header admin">
        <button className="admin-mobile-toggle" type="button" aria-label="Buka navigasi" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><Menu size={21} /></button>
        <div className="admin-topbar-context"><span>CourseUp</span><span aria-hidden="true">/</span><strong>Administrator</strong></div>
      </header>
      <div className="admin-content">{children}</div>
    </main>
  </div>;
}
