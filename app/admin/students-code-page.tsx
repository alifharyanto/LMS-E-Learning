"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/browser-api";

type Student = { no_absen: number; nama: string; jenis_kelamin: "L" | "P"; kelas: string };

export default function StudentsCodePage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ students: Student[] }>("/api/v1/admin/students").then(({ students: records }) => {
      if (!active) return;
      setStudents(records);
    }).catch((requestError) => {
      if (!active) return;
      if ((requestError as { status?: number }).status === 401) router.replace("/login");
      else if ((requestError as { status?: number }).status === 403) router.replace("/dashboard");
      else setError(requestError instanceof Error ? requestError.message : "Data siswa gagal dimuat.");
    });
    return () => { active = false; };
  }, [router]);

  const visibleStudents = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("id-ID");
    return students.filter((student) => `${student.no_absen} ${student.nama} ${student.kelas} ${student.jenis_kelamin}`.toLocaleLowerCase("id-ID").includes(term));
  }, [search, students]);
  const classCount = new Set(students.map((student) => student.kelas)).size;

  return <div className="admin-page">
    <header className="page-heading admin-heading"><span className="eyebrow">DATA SISWA</span><h1 className="page-title">Murid</h1><p className="page-intro">Daftar siswa sekolah dari file lokal CourseUp.</p></header>
    {error && <p className="status status-error" role="alert">{error}</p>}
    <div className="grid-two admin-metrics" aria-label="Ringkasan data murid"><div className="metric"><div className="metric-value">{students.length}</div><div className="metric-label">Murid terdaftar</div></div><div className="metric"><div className="metric-value">{classCount}</div><div className="metric-label">Kelas</div></div></div>
    <section className="surface surface-pad admin-section"><div className="admin-section-heading"><div><span className="list-meta">DAFTAR SEKOLAH</span><h2 className="surface-title">Siswa kelas</h2></div><span className="admin-count">{visibleStudents.length} dari {students.length}</span></div><label className="student-roster-search"><Search size={16} /><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, nomor absen, atau kelas" aria-label="Cari murid" /></label>{visibleStudents.length ? <div className="student-roster-list">{visibleStudents.map((student) => <article className="student-roster-row" key={`${student.kelas}-${student.no_absen}`}><div className="student-roster-number">{String(student.no_absen).padStart(2, "0")}</div><div className="student-roster-copy"><strong>{student.nama}</strong><span>{student.kelas} · {student.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}</span></div></article>)}</div> : <p className="empty-state">{students.length ? "Tidak ada murid yang cocok." : "Belum ada data siswa di data/siswa.json."}</p>}</section>
  </div>;
}
