import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { MotionLink, Reveal } from "@/components/ui/motion";

export default function HeroCard() {
  return (
    <Reveal className="hero-reveal">
      <section className="hero">
        <div className="hero-photo" role="img" aria-label="Mahasiswa belajar dan berdiskusi bersama" />
        <div className="hero-content">
          <span className="eyebrow"><Sparkles size={14} /> RUANG BELAJAR DIGITAL · 01</span>
          <h1>Belajar lebih jauh. <span>Tumbuh tanpa batas.</span></h1>
          <p>Satu tempat untuk memahami materi, menguji kemampuan, dan bertumbuh bersama komunitas.</p>
          <div className="hero-actions">
            <MotionLink href="/kursus" className="button button-primary">Jelajahi materi <ArrowRight size={16} /></MotionLink>
            <MotionLink href="/forum" className="button button-secondary button-quiet"><MessageCircle size={15} /> Ikut berdiskusi</MotionLink>
          </div>
          <div className="hero-signature"><span>COURSEUP / LEARN IN YOUR OWN RHYTHM</span><span>01 — 03</span></div>
        </div>
        <div className="hero-photo-label"><span>COMMUNITY</span><span>01 / 03</span></div>
      </section>
    </Reveal>
  );
}
