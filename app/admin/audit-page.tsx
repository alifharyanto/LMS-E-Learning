"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/browser-api";

type AuditLog = { id: number; action: string; entity_type: string; entity_id: number | null; details: Record<string, unknown> | string | null; created_at: string; actor_username: string | null };

function describeDetails(value: AuditLog["details"]) {
  if (!value) return "";
  let details = value;
  if (typeof details === "string") {
    try { details = JSON.parse(details) as Record<string, unknown>; } catch { return ""; }
  }
  return Object.entries(details).map(([key, item]) => key === "password_reset" ? (item ? "password reset" : "") : `${key.replaceAll("_", " ")}: ${String(item)}`).filter(Boolean).join(" · ");
}

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ logs: AuditLog[] }>("/api/v1/admin/audit").then(({ logs: items }) => {
      if (active) setLogs(items);
    }).catch((requestError) => {
      if (!active) return;
      if ((requestError as { status?: number }).status === 401) router.replace("/login");
      else if ((requestError as { status?: number }).status === 403) router.replace("/dashboard");
      else setError(requestError instanceof Error ? requestError.message : "Riwayat aktivitas gagal dimuat.");
    });
    return () => { active = false; };
  }, [router]);

  return <div className="admin-page"><header className="page-heading admin-heading"><span className="eyebrow">AUDIT ADMIN</span><h1 className="page-title">Aktivitas</h1><p className="page-intro">Riwayat perubahan penting yang dilakukan administrator.</p></header>{error && <p className="status status-error" role="alert">{error}</p>}<section className="surface surface-pad admin-section"><div className="admin-section-heading"><div><span className="list-meta">LOG TERBARU</span><h2 className="surface-title">100 aktivitas terakhir</h2></div><span className="admin-count">{logs.length} catatan</span></div>{logs.length ? logs.map((log) => <article className="audit-row" key={log.id}><div className="audit-marker" /><div className="audit-copy"><strong>{log.action.replaceAll(".", " · ")}</strong><span>{log.actor_username ?? "Akun dihapus"} · {log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ""}</span>{describeDetails(log.details) && <small>{describeDetails(log.details)}</small>}</div><time dateTime={log.created_at}>{new Date(log.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</time></article>) : <p className="empty-state">Belum ada aktivitas admin tercatat.</p>}</section></div>;
}
