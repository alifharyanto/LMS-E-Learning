"use client";

import { useState, type FormEvent } from "react";
import ContactCard from "@/components/cards/contact-card";
import { apiRequest } from "@/lib/browser-api";

export default function ContactPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function sendContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const fields = Object.fromEntries(new FormData(form).entries());
      const result = await apiRequest<{ message: string }>("/api/v1/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) });
      setMessage(result.message);
      form.reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Pesan gagal dikirim.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <header className="page-heading"><span className="eyebrow">Support CourseUp</span><h1 className="page-title">Hubungi Kami</h1><p className="page-intro">Punya pertanyaan atau saran? Kami siap membantu.</p></header>
    {message && <p className="status" role="status">{message}</p>}{error && <p className="status status-error" role="alert">{error}</p>}
    <div style={{ maxWidth: 700 }}><ContactCard busy={busy} onSubmit={sendContact} withPhone /></div>
  </>;
}