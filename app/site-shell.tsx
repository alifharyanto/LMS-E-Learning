"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import SiteFooter from "@/components/layout/footer";
import SiteHeader, { type SessionUser } from "@/components/layout/header";
import { apiRequest } from "@/lib/browser-api";

export default function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const authPage = pathname === "/login" || pathname === "/register";

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

  if (authPage) return <MotionConfig reducedMotion="user"><motion.div key={pathname} className="auth-route" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>{children}</motion.div></MotionConfig>;

  if (pathname === "/code" || pathname.startsWith("/code/live/local/")) return <MotionConfig reducedMotion="user"><div className="code-route-shell"><Suspense fallback={<div className="page-loading">Memuat editor...</div>}>{children}</Suspense></div></MotionConfig>;

  return <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 260, damping: 25 }}><div className="site-app">
    <SiteHeader user={user} onLogout={() => void logout()} />
    <AnimatePresence mode="wait"><motion.main key={pathname} className="page-wrap" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}><Suspense fallback={<div className="page-loading">Memuat halaman...</div>}>{children}</Suspense></motion.main></AnimatePresence>
    <SiteFooter />
  </div></MotionConfig>;
}
