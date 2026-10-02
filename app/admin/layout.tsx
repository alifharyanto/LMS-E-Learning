"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, Brain, ChartNoAxesColumn, ContactRound, GraduationCap, History, LayoutDashboard, ListChecks, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

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

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin/dashboard";

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="admin-sidebar-brand" href="/admin/dashboard"><span className="admin-brand-mark">C</span><span><strong>CourseUp</strong><small>ADMIN WORKSPACE</small></span></Link>
      <span className="admin-sidebar-label">MENU UTAMA</span>
      <nav className="admin-nav" aria-label="Navigasi admin">
        {menu.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href === "/admin/dashboard" && pathname === "/admin");
          return <Link href={href} key={href} aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined}><span className="admin-nav-link"><Icon size={17} />{label}</span></Link>;
        })}
      </nav>
      <div className="admin-sidebar-foot"><Activity size={15} /><span>Panel administrasi</span></div>
    </aside>
    <main className="admin-main">{children}</main>
  </div>;
}
