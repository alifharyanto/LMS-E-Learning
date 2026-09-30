import { MotionLink } from "@/components/ui/motion";

export default function SiteFooter() {
  return <footer className="site-footer"><div className="footer-inner"><span>© {new Date().getFullYear()} CourseUp. Ruang belajar untuk melangkah lebih jauh.</span><MotionLink href="/contact">Hubungi kami</MotionLink></div></footer>;
}