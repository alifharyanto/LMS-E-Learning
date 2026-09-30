import type { Metadata } from "next";
import SiteShell from "@/app/site-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "CourseUp | Ruang Belajar Modern",
  description: "Materi, latihan soal, forum diskusi, dan progres belajar CourseUp.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body><SiteShell>{children}</SiteShell></body>
    </html>
  );
}
