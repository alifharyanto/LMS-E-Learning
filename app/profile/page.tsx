"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenText, ChevronDown, FileText, House, LogOut, NotebookText, UserRound } from "lucide-react";

type ProfileForm = {
  namaLengkap: string;
  nisNisn: string;
  jenisKelamin: string;
  tempatLahir: string;
  tanggalLahir: string;
  email: string;
  alamatLengkap: string;
  noTelepon: string;
};

const defaultProfile: ProfileForm = {
  namaLengkap: "Cantika Aprilia Mulyanti",
  nisNisn: "2024091823",
  jenisKelamin: "Perempuan",
  tempatLahir: "Bandung",
  tanggalLahir: "2006-04-12",
  email: "cantika.mulyanti@student.courseup.id",
  alamatLengkap: "",
  noTelepon: "081234567890",
};

const navItems = [
  { label: "Beranda", href: "/", icon: House, active: false },
  { label: "My Profile", href: "/profile", icon: UserRound, active: true },
  { label: "Kursus Materi", href: "/kursus", icon: BookOpenText, active: false },
  { label: "Latihan Soal", href: "/latihan", icon: NotebookText, active: false },
  { label: "Code Editor", href: "/code", icon: FileText, active: false },
];

export default function MyProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>(defaultProfile);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("JPG, PNG, atau WebP (Maks 2MB)");
  const [error, setError] = useState("");
  const [submitState, setSubmitState] = useState("Simpan Profil");

  useEffect(() => {
    const savedName = window.localStorage.getItem("courseup_user_name");
    const savedEmail = window.localStorage.getItem("courseup_user_email");
    const savedNis = window.localStorage.getItem("courseup_user_nis");
    const savedJk = window.localStorage.getItem("courseup_user_jk");
    const savedTempatLahir = window.localStorage.getItem("courseup_user_tempat");
    const savedTanggalLahir = window.localStorage.getItem("courseup_user_tgl");
    const savedPhone = window.localStorage.getItem("courseup_user_phone");
    const savedPhoto = window.localStorage.getItem("courseup_user_photo");

    setForm((current) => ({
      ...current,
      namaLengkap: savedName || current.namaLengkap,
      email: savedEmail || current.email,
      nisNisn: savedNis || current.nisNisn,
      jenisKelamin: savedJk || current.jenisKelamin,
      tempatLahir: savedTempatLahir || current.tempatLahir,
      tanggalLahir: savedTanggalLahir || current.tanggalLahir,
      noTelepon: savedPhone || current.noTelepon,
    }));

    if (savedPhoto) {
      setPhotoData(savedPhoto);
      setSelectedFileName("Foto tersimpan");
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const button = document.getElementById("profileDropdownBtn");
      const menu = document.getElementById("profileDropdownMenu");
      if (!button?.contains(target) && !menu?.contains(target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const headerInitial = useMemo(() => {
    const name = (form.namaLengkap || "C").trim();
    return name ? name.charAt(0).toUpperCase() : "C";
  }, [form.namaLengkap]);

  const handleFieldChange = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Format file tidak didukung. Harap pilih file JPG, PNG, atau WebP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran file melebihi 2 MB. Silakan pilih foto dengan ukuran lebih kecil.");
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = String(loadEvent.target?.result || "");
      setPhotoData(dataUrl);
      setSelectedFileName(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      window.localStorage.setItem("courseup_user_photo", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = form.namaLengkap.trim();
    const normalizedEmail = form.email.trim();

    if (!normalizedName || !normalizedEmail) {
      setError("Nama lengkap dan email tidak boleh kosong.");
      return;
    }

    window.localStorage.setItem("courseup_user_name", normalizedName);
    window.localStorage.setItem("courseup_user_email", normalizedEmail);
    window.localStorage.setItem("courseup_user_nis", form.nisNisn.trim());
    window.localStorage.setItem("courseup_user_jk", form.jenisKelamin);
    window.localStorage.setItem("courseup_user_tempat", form.tempatLahir.trim());
    window.localStorage.setItem("courseup_user_tgl", form.tanggalLahir);
    window.localStorage.setItem("courseup_user_phone", form.noTelepon.trim());

    setError("");
    setSubmitState("✓ Profil Berhasil Disimpan!");
    setTimeout(() => setSubmitState("Simpan Profil"), 2500);
  };

  const handleCancel = () => {
    const savedName = window.localStorage.getItem("courseup_user_name") || defaultProfile.namaLengkap;
    const savedEmail = window.localStorage.getItem("courseup_user_email") || defaultProfile.email;
    const savedNis = window.localStorage.getItem("courseup_user_nis") || defaultProfile.nisNisn;
    const savedJk = window.localStorage.getItem("courseup_user_jk") || defaultProfile.jenisKelamin;
    const savedTempatLahir = window.localStorage.getItem("courseup_user_tempat") || defaultProfile.tempatLahir;
    const savedTanggalLahir = window.localStorage.getItem("courseup_user_tgl") || defaultProfile.tanggalLahir;
    const savedPhone = window.localStorage.getItem("courseup_user_phone") || defaultProfile.noTelepon;
    const savedPhoto = window.localStorage.getItem("courseup_user_photo");

    setForm({
      namaLengkap: savedName,
      email: savedEmail,
      nisNisn: savedNis,
      jenisKelamin: savedJk,
      tempatLahir: savedTempatLahir,
      tanggalLahir: savedTanggalLahir,
      alamatLengkap: form.alamatLengkap,
      noTelepon: savedPhone,
    });

    if (savedPhoto) {
      setPhotoData(savedPhoto);
    } else {
      setPhotoData(null);
    }
    setError("");
  };

  return (
    <div className="flex min-h-screen bg-[#f1f6f9] text-[#334155] antialiased">
      <aside className="flex min-h-screen w-64 min-w-[16rem] shrink-0 flex-col justify-between border-r border-[#e2e8f0] bg-white self-stretch">
        <div className="flex flex-col">
          <div className="flex items-center space-x-3 border-b border-[#f1f5f9] px-6 py-6">
            <div className="flex items-center gap-3">
              <img
                src="https://lh3.googleusercontent.com/aida/AEtjO1XGFMju0tupjhPtsV7igmxS524svBao7Ps5Z5W7jvwPhzW5CtN_DVUnBMXpE1qYPUBOTrIWLOz2eC7fe-48t0P209h9ZoNedNIS7jVD4-pU8AXYzin4fb5P9JnYaFaOOqrX3EE1TVvWxOqFIEoVTvQaIyDHiXn2VjcUWefYEzPhKfAZWob2TyrtxuFi3ZK9oGHuhiUBVOUAtymVsGByrVsSJ0FUSkgecw6suAFNaSk"
                alt="CourseUp Icon"
                className="h-10 w-10 shrink-0 object-contain"
              />
              <span className="flex select-none items-center text-[26px] font-extrabold leading-none tracking-tight">
                <span className="text-[#b2d7e6]">Course</span>
                <span className="text-[#437188]">Up</span>
              </span>
            </div>
          </div>

          <div className="px-4 py-6">
            <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">Menu Utama</p>
            <nav className="space-y-1.5">
              {navItems.map(({ label, href, icon: Icon, active }) => (
                <a
                  key={label}
                  href={href}
                  className={[
                    "flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150",
                    active ? "bg-[#def3f6] text-[#3b667a] shadow-sm" : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#334155]",
                  ].join(" ")}
                >
                  <Icon className={active ? "h-5 w-5 text-[#608da2]" : "h-5 w-5 text-[#94a3b8] transition-colors group-hover:text-[#608da2]"} />
                  <span>{label}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="border-t border-[#f1f5f9] px-4 pb-6 pt-3">
          <button type="button" className="flex w-full items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#ef4444] transition-colors duration-150 hover:bg-red-50">
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-[#f1f6f9]">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#e2e8f0] bg-white/70 px-8 backdrop-blur-md">
          <div className="flex items-center space-x-3 text-sm">
            <span className="rounded-full bg-[#def3f6] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#437188]">
              Ruang Belajar Anda
            </span>
            <span className="text-[#cbd5e1]">/</span>
            <span className="font-semibold text-[#64748b]">My Profile Siswa</span>
          </div>

          <div className="relative">
            <button
              id="profileDropdownBtn"
              type="button"
              onClick={() => setDropdownOpen((value) => !value)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#608da2] text-sm font-bold text-white shadow-sm transition-all hover:ring-2 hover:ring-[#94bfd0] hover:ring-offset-2"
            >
              {headerInitial}
            </button>

            <div
              id="profileDropdownMenu"
              className={[
                "absolute right-0 z-50 mt-2 w-48 rounded-xl border border-[#e2e8f0] bg-white py-1 shadow-lg transition-all duration-150",
                dropdownOpen ? "block" : "hidden",
              ].join(" ")}
            >
              <div className="border-b border-gray-100 px-4 py-2">
                <p className="truncate text-xs font-semibold text-gray-800">{form.namaLengkap || "user CourseUp"}</p>
                <p className="text-[10px] text-gray-500">Siswa Aktif</p>
              </div>
              <button type="button" className="flex w-full items-center px-4 py-2.5 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl space-y-6 p-8">
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-7 shadow-sm">
            <form className="space-y-8" onSubmit={handleSubmit}>
              <div className="flex flex-col items-center justify-center border-b border-[#f1f5f9] pb-6 text-center">
                <div className="relative group">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-tr from-[#608da2] to-[#94bfd0] text-3xl font-extrabold text-white shadow-md transition-all hover:ring-2 hover:ring-[#94bfd0]">
                    {photoData ? (
                      <img src={photoData} alt="Profile Preview" className="h-full w-full object-cover" />
                    ) : (
                      <span>{headerInitial}</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <h3 className="text-lg font-bold text-[#1e293b]">{form.namaLengkap || "Cantika Aprilia Mulyanti"}</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="namaLengkap" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#334155]">Nama Lengkap</label>
                  <input
                    id="namaLengkap"
                    type="text"
                    value={form.namaLengkap}
                    onChange={(event) => handleFieldChange("namaLengkap", event.target.value)}
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#1e293b] transition-all focus:border-[#608da2] focus:outline-none focus:ring-1 focus:ring-[#608da2]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="nisNisn" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#334155]">NIS / NISN</label>
                  <input
                    id="nisNisn"
                    type="text"
                    value={form.nisNisn}
                    onChange={(event) => handleFieldChange("nisNisn", event.target.value)}
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#1e293b] transition-all focus:border-[#608da2] focus:outline-none focus:ring-1 focus:ring-[#608da2]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="jenisKelamin" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#334155]">Jenis Kelamin</label>
                  <div className="relative">
                    <select
                      id="jenisKelamin"
                      value={form.jenisKelamin}
                      onChange={(event) => handleFieldChange("jenisKelamin", event.target.value)}
                      className="w-full appearance-none rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 pr-10 text-sm text-[#1e293b] transition-all focus:border-[#608da2] focus:outline-none focus:ring-1 focus:ring-[#608da2]"
                    >
                      <option value="Perempuan">Perempuan</option>
                      <option value="Laki-laki">Laki-laki</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                      <ChevronDown className="h-3 w-3 text-[#64748b]" />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="tempatLahir" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#334155]">Tempat Lahir</label>
                  <input
                    id="tempatLahir"
                    type="text"
                    value={form.tempatLahir}
                    onChange={(event) => handleFieldChange("tempatLahir", event.target.value)}
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#1e293b] transition-all focus:border-[#608da2] focus:outline-none focus:ring-1 focus:ring-[#608da2]"
                  />
                </div>

                <div>
                  <label htmlFor="tanggalLahir" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#334155]">Tanggal Lahir</label>
                  <input
                    id="tanggalLahir"
                    type="date"
                    value={form.tanggalLahir}
                    onChange={(event) => handleFieldChange("tanggalLahir", event.target.value)}
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#1e293b] transition-all focus:border-[#608da2] focus:outline-none focus:ring-1 focus:ring-[#608da2]"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#334155]">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => handleFieldChange("email", event.target.value)}
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#1e293b] transition-all focus:border-[#608da2] focus:outline-none focus:ring-1 focus:ring-[#608da2]"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="alamatLengkap" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#334155]">Alamat Lengkap</label>
                  <input
                    id="alamatLengkap"
                    type="text"
                    value={form.alamatLengkap}
                    onChange={(event) => handleFieldChange("alamatLengkap", event.target.value)}
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#1e293b] transition-all focus:border-[#608da2] focus:outline-none focus:ring-1 focus:ring-[#608da2]"
                    placeholder="Jl. Dago No. 120, Bandung"
                  />
                </div>

                <div>
                  <label htmlFor="fotoInput" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#334155]">Foto Profil</label>
                  <div className="flex items-center space-x-3">
                    <label htmlFor="fotoInput" className="flex shrink-0 cursor-pointer items-center space-x-2 rounded-xl border border-[#cbd5e1] bg-white px-4 py-2 text-xs font-semibold text-[#437188] transition-all hover:bg-[#def3f6]">
                      <ArrowRight className="h-4 w-4 rotate-[-45deg] text-[#608da2]" />
                      <span>Pilih Foto</span>
                    </label>
                    <input id="fotoInput" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoSelect} />
                    <span className="truncate text-xs text-[#94a3b8]">{selectedFileName}</span>
                  </div>
                  {error ? <p className="mt-2 text-xs text-[#ef4444]">{error}</p> : null}
                </div>

                <div>
                  <label htmlFor="noTelepon" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#334155]">Nomor Telepon</label>
                  <input
                    id="noTelepon"
                    type="tel"
                    value={form.noTelepon}
                    onChange={(event) => handleFieldChange("noTelepon", event.target.value)}
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#1e293b] transition-all focus:border-[#608da2] focus:outline-none focus:ring-1 focus:ring-[#608da2]"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>

              <div className="flex flex-col items-center justify-between gap-4 border-t border-[#f1f5f9] pt-3 sm:flex-row">
                <p className="text-xs text-[#64748b]">Pastikan seluruh data diri Anda telah sesuai dengan dokumen resmi kesiswaan.</p>
                <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-xl border border-[#cbd5e1] bg-white px-5 py-2.5 text-xs font-bold text-[#64748b] transition-all hover:bg-[#f8fafc] hover:text-[#334155]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    id="simpanProfilBtn"
                    className="flex items-center justify-center space-x-2 rounded-xl bg-[#608da2] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#437188]"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{submitState}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="flex items-center justify-between py-2 text-xs text-[#94a3b8]">
            <p>© 2026 CourseUp. Ruang belajar untuk melangkah lebih jauh.</p>
            <p className="font-medium text-[#608da2]">Hubungi kami</p>
          </div>
        </div>
      </main>
    </div>
  );
}
