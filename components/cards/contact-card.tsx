"use client";

import { ArrowRight } from "lucide-react";
import type { FormEvent } from "react";
import { MotionButton, Reveal } from "@/components/ui/motion";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`field ${className}`}><span>{label}</span>{children}</label>;
}

export default function ContactCard({ busy, onSubmit, withPhone = false }: { busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; withPhone?: boolean }) {
  return (
    <Reveal className="contact-reveal">
      <section className="surface surface-pad">
        <h2 className="surface-title">Hubungi Kami</h2>
        <form className="stack" style={{ marginTop: 17 }} onSubmit={onSubmit}>
          <div className="form-grid">
            <Field label="Nama"><input className="input" name="name" required maxLength={150} /></Field>
            <Field label="Email"><input className="input" name="email" type="email" required maxLength={150} /></Field>
            {withPhone && <Field label="Telepon · opsional"><input className="input" name="phone" maxLength={20} /></Field>}
            <Field label="Subjek" className="form-span"><input className="input" name="subject" required maxLength={255} /></Field>
            <div className="form-span"><Field label="Pesan"><textarea className="textarea" name="message" required maxLength={10000} /></Field></div>
          </div>
          <MotionButton className="button button-primary" type="submit" disabled={busy}>{busy ? "Mengirim..." : <>Kirim Pesan <ArrowRight size={15} /></>}</MotionButton>
        </form>
      </section>
    </Reveal>
  );
}
