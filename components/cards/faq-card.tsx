import { Reveal } from "@/components/ui/motion";

type Faq = { id: number; question: string; answer: string };

export default function FaqCard({ faqs }: { faqs: Faq[] }) {
  if (!faqs.length) return <div className="empty-state">Belum ada FAQ tersedia.</div>;

  return (
    <div className="faq-grid">
      {faqs.map((faq) => (
        <Reveal className="faq-reveal" key={faq.id}>
          <details id={`faq-${faq.id}`} className="faq-row">
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        </Reveal>
      ))}
    </div>
  );
}
