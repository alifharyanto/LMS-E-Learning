"use client";

import { Clock3, MessageCircle, Search, Send, SlidersHorizontal, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MotionButton, MotionLink, Reveal } from "@/components/ui/motion";
import { apiRequest } from "@/lib/browser-api";

type User = { id: number; username: string; role: "admin" | "student" };
type Comment = { id: number; user_id: number | null; author: string; message: string };
type Thread = { id: number; user_id: number | null; author: string; title: string; message: string; comment_count: number; comments: Comment[]; created_at: string };

export default function ForumPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadQuery, setThreadQuery] = useState("");
  const [threadOrder, setThreadOrder] = useState<"newest" | "popular">("newest");
  const [error, setError] = useState("");

  async function loadThreads() {
    const data = await apiRequest<{ threads: Thread[] }>("/api/v1/forum");
    setThreads(data.threads);
  }

  useEffect(() => {
    apiRequest<{ threads: Thread[] }>("/api/v1/forum").then((data) => setThreads(data.threads)).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Forum gagal dimuat."));
    apiRequest<{ user: User }>("/api/v1/auth/me").then((data) => setUser(data.user)).catch(() => setUser(null));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>, endpoint: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries());
    try {
      await apiRequest(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) });
      form.reset();
      await loadThreads();
      setError("");
    } catch (requestError) {
      if ((requestError as { status?: number }).status === 401) router.push("/login");
      setError(requestError instanceof Error ? requestError.message : "Diskusi gagal dikirim.");
    }
  }

  async function remove(endpoint: string) {
    if (!window.confirm("Yakin ingin menghapus data ini?")) return;
    try {
      await apiRequest(endpoint, { method: "DELETE" });
      await loadThreads();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Data gagal dihapus.");
    }
  }

  const normalizedQuery = threadQuery.trim().toLocaleLowerCase("id-ID");
  const visibleThreads = threads
    .filter((thread) => `${thread.title} ${thread.message} ${thread.author}`.toLocaleLowerCase("id-ID").includes(normalizedQuery))
    .sort((first, second) => threadOrder === "popular"
      ? second.comment_count - first.comment_count
      : new Date(second.created_at).getTime() - new Date(first.created_at).getTime());

  return <>
    <header className="page-heading"><span className="eyebrow"><MessageCircle size={14} /> Forum</span><h1 className="page-title">Belajar bersama dan berdiskusi</h1><p className="page-intro">Tanyakan pertanyaan dan berbagi pengetahuan.</p></header>
    {error && <p className="status status-error" role="alert">{error}</p>}
    <div className="split-layout forum-layout">
      <Reveal className="forum-compose-reveal"><section className="surface surface-pad forum-composer"><span className="eyebrow">RUANG DISKUSI</span><h2 className="surface-title">Mulai percakapan</h2><p className="page-intro">Punya ide atau pertanyaan? Buka diskusi baru untuk komunitas.</p>{user ? <form className="stack forum-compose-form" onSubmit={(event) => void submit(event, "/api/v1/forum")}><label className="field"><span>Judul topik</span><input className="input" name="title" placeholder="Apa yang ingin dibahas?" required maxLength={255} /></label><label className="field"><span>Pesan</span><textarea className="textarea" name="message" placeholder="Ceritakan lebih lanjut..." required /></label><MotionButton className="button button-primary"><Send size={15} />Kirim diskusi</MotionButton></form> : <div className="forum-login-prompt"><p className="page-intro">Masuk untuk ikut membuat thread dan memberi komentar.</p><MotionLink className="button button-primary" href="/login">Masuk ke forum <Send size={14} /></MotionLink></div>}</section></Reveal>
      <section className="forum-feed" aria-label="Daftar diskusi">
        <div className="forum-feed-toolbar">
          <div className="forum-feed-title"><span className="forum-thread-count">{visibleThreads.length}</span><div><strong>Diskusi komunitas</strong><small>{threads.length} thread tersedia</small></div></div>
          <label className="forum-search"><Search size={16} /><input value={threadQuery} onChange={(event) => setThreadQuery(event.target.value)} placeholder="Cari diskusi" aria-label="Cari diskusi" />{threadQuery && <button type="button" aria-label="Hapus pencarian" onClick={() => setThreadQuery("")}>×</button>}</label>
          <div className="forum-sort" role="group" aria-label="Urutkan diskusi"><SlidersHorizontal size={14} /><MotionButton type="button" className={threadOrder === "newest" ? "is-active" : ""} aria-pressed={threadOrder === "newest"} onClick={() => setThreadOrder("newest")}><Clock3 size={13} />Terbaru</MotionButton><MotionButton type="button" className={threadOrder === "popular" ? "is-active" : ""} aria-pressed={threadOrder === "popular"} onClick={() => setThreadOrder("popular")}>Populer</MotionButton></div>
        </div>
        <div className="stack">{visibleThreads.length ? visibleThreads.map((thread) => <Reveal className="thread-reveal" key={thread.id}><article className="thread-card"><div className="thread-card-heading"><div className="thread-author-mark" aria-hidden="true">{thread.author.slice(0, 1).toLocaleUpperCase("id-ID")}</div><div className="thread-heading-copy"><h2 className="surface-title">{thread.title}</h2><div className="list-meta">oleh {thread.author} · {thread.comment_count} komentar</div></div>{user && (user.role === "admin" || user.id === thread.user_id) && <MotionButton className="button button-danger button-small" onClick={() => void remove(`/api/v1/forum/threads/${thread.id}`)}><Trash2 size={14} />Hapus</MotionButton>}</div><p className="thread-message">{thread.message}</p>{thread.comments.length > 0 && <div className="thread-comments">{thread.comments.map((comment) => <div className="comment" key={comment.id}><div className="comment-heading"><strong>{comment.author}</strong>{user && (user.role === "admin" || user.id === comment.user_id) && <MotionButton className="text-button" onClick={() => void remove(`/api/v1/forum/comments/${comment.id}`)}><Trash2 size={13} />Hapus</MotionButton>}</div><p>{comment.message}</p></div>)}</div>}{user && <form className="forum-comment-form" onSubmit={(event) => void submit(event, `/api/v1/forum/threads/${thread.id}/comments`)}><input className="input" name="comment" placeholder="Tulis komentar..." aria-label={`Komentar untuk ${thread.title}`} required /><MotionButton className="button button-primary button-small"><Send size={14} />Kirim</MotionButton></form>}</article></Reveal>) : <div className="empty-state">{threads.length ? "Tidak ada diskusi yang cocok. Coba kata kunci lain." : "Belum ada thread. Jadilah yang pertama."}</div>}</div>
      </section>
    </div>
  </>;
}