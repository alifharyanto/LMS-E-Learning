import { ArrowRight, BookOpen, Brain, MessageSquare } from "lucide-react";
import FaqCard from "@/components/cards/faq-card";
import HeroCard from "@/components/cards/hero-card";
import { MotionLink } from "@/components/ui/motion";
import { FAQS } from "@/lib/faqs";

export default function HomePage() {
  return <>
    <HeroCard />
    <section className="home-paths" aria-label="Jelajahi CourseUp">
      <div className="home-paths-heading"><span className="eyebrow">PILIH JALURMU</span><span className="home-paths-note">BELAJAR / BERLATIH / TERHUBUNG</span></div>
      <div className="home-paths-grid">
        <MotionLink className="home-path" href="/kursus"><span className="home-path-number">01</span><span className="home-path-icon"><BookOpen size={20} /></span><span className="home-path-copy"><strong>Materi terarah</strong><small>Pelajari modul yang siap dipakai</small></span><ArrowRight className="home-path-arrow" size={18} /></MotionLink>
        <MotionLink className="home-path" href="/latihan"><span className="home-path-number">02</span><span className="home-path-icon"><Brain size={20} /></span><span className="home-path-copy"><strong>Uji pemahaman</strong><small>Latihan soal dengan pembahasan</small></span><ArrowRight className="home-path-arrow" size={18} /></MotionLink>
        <MotionLink className="home-path" href="/forum"><span className="home-path-number">03</span><span className="home-path-icon"><MessageSquare size={20} /></span><span className="home-path-copy"><strong>Ruang diskusi</strong><small>Belajar bersama komunitas</small></span><ArrowRight className="home-path-arrow" size={18} /></MotionLink>
      </div>
    </section>
    <section>
      <div className="section-heading">
        <div><h2>Pertanyaan yang sering ditanyakan</h2><p>Informasi singkat untuk memulai belajar di CourseUp.</p></div>
        <MotionLink className="link-inline" href="/help-center">Semua bantuan <ArrowRight size={15} /></MotionLink>
      </div>
      <FaqCard faqs={FAQS.slice(0, 4)} />
    </section>
  </>;
}