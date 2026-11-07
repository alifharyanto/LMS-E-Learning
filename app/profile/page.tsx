"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpenText, ChevronDown, FileText, House, LogOut, NotebookText, Upload, UserRound } from "lucide-react";
import { apiRequest } from "@/lib/browser-api";
import MobileStudentNavigation from "@/components/layout/mobile-student-navigation";

type ProfileIdentity = {
  username: string;
  full_name: string;
};

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
  namaLengkap: "",
  nisNisn: "",
  jenisKelamin: "",
  tempatLahir: "",
  tanggalLahir: "",
  email: "",
  alamatLengkap: "",
  noTelepon: "",
};

export default function MyProfilePage() {
  const [form, setForm] = useState<ProfileForm>(defaultProfile);
  const [accountName, setAccountName] = useState("user CourseUp");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("JPG, PNG, atau WebP (Maks 2MB)");
  const [error, setError] = useState("");
  const [submitState, setSubmitState] = useState("Simpan Profil");
  const [saveSucceeded, setSaveSucceeded] = useState(false);

  useEffect(() => {
    const storedAccountName = window.localStorage.getItem("courseup_username");
    if (storedAccountName?.trim()) setAccountName(storedAccountName.trim());

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

    apiRequest<{ user: ProfileIdentity }>("/api/v1/auth/me")
      .then(({ user }) => {
        const identityName = user.full_name.trim() || user.username.trim();
        if (identityName) setAccountName(identityName);
      })
      .catch((requestError: unknown) => {
        if (!(requestError instanceof Error) || !("status" in requestError) || requestError.status !== 401) {
          console.error("Gagal memuat identitas pengguna:", requestError);
        }
      });
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
    const name = form.namaLengkap.trim() || accountName.trim();
    return name ? name.charAt(0).toUpperCase() : "U";
  }, [accountName, form.namaLengkap]);

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
    setSaveSucceeded(true);
    setSubmitState("✓ Profil Berhasil Disimpan!");
    window.setTimeout(() => {
      setSaveSucceeded(false);
      setSubmitState("Simpan Profil");
    }, 2500);
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
    <main className="profile-page">
      <aside className="profile-sidebar">
        <div>
          <div className="profile-sidebar-brand">
            <Image src="/course-up-logo.png" alt="CourseUp Logo" width={40} height={40} />
            <span><span>Course</span><strong>Up</strong></span>
          </div>
          <div className="profile-sidebar-navigation">
            <p>Menu Utama</p>
            <nav aria-label="Navigasi profil">
              <Link href="/" className="profile-nav-link"><House /><span>Beranda</span></Link>
              <Link href="/profile" aria-current="page" className="profile-nav-link is-active"><UserRound /><span>My Profile</span></Link>
              <Link href="/kursus" className="profile-nav-link"><BookOpenText /><span>Kursus Materi</span></Link>
              <Link href="/latihan" className="profile-nav-link"><NotebookText /><span>Latihan Soal</span></Link>
              <Link href="/code" className="profile-nav-link"><FileText /><span>Code Editor</span></Link>
            </nav>
          </div>
        </div>
        <div className="profile-sidebar-logout">
          <button type="button"><LogOut /><span>Logout</span></button>
        </div>
      </aside>

      <div className="profile-main">
        <MobileStudentNavigation activePage="profile" />

        <header className="profile-topbar">
          <div className="profile-breadcrumb">
            <span>
                Ruang Belajar Anda
            </span>
            <span className="profile-breadcrumb-separator">/</span>
            <span className="profile-breadcrumb-current">My Profile Siswa</span>
          </div>

          <div className="profile-menu-anchor">
              <button
                id="profileDropdownBtn"
                type="button"
                onClick={() => setDropdownOpen((value) => !value)}
                aria-label={`Profil ${form.namaLengkap || "siswa"}`}
                aria-expanded={dropdownOpen}
                aria-controls="profileDropdownMenu"
                className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 p-0.5 shadow-sm transition-all hover:border-[#527F95] focus:outline-none focus:ring-2 focus:ring-[#527F95]/20"
              >
                <span className="flex h-full w-full items-center justify-center rounded-full bg-[#527F95] text-xs font-bold tracking-wider text-white" style={{ backgroundColor: "rgb(114, 158, 179)" }}>
                  {headerInitial}
                </span>
              </button>

              <div
                id="profileDropdownMenu"
                className={[
                  "profile-dropdown",
                  dropdownOpen ? "is-open" : "",
                ].join(" ")}
                aria-hidden={!dropdownOpen}
              >
                <div className="p-1.5">
                  <Link href="/login" className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50">
                    <LogOut className="h-4 w-4 text-rose-500" />
                    <span>Logout</span>
                  </Link>
                </div>
              </div>
          </div>
        </header>

        <div className="profile-content">
          <section className="profile-card">
            <form className="profile-form" onSubmit={handleSubmit}>
              <div className="profile-intro">
                <div className="profile-avatar">
                  {photoData ? (
                    <Image src={photoData} alt="Foto profil" width={80} height={80} unoptimized className="profile-avatar-photo" />
                  ) : (
                    <span>{headerInitial}</span>
                  )}
                </div>
                <h1>{form.namaLengkap || "Nama Pengguna"}</h1>
              </div>

              <div className="profile-fields">
                <div className="profile-field">
                  <label htmlFor="namaLengkap" className="profile-label">Nama Lengkap</label>
                  <input
                    id="namaLengkap"
                    type="text"
                    value={form.namaLengkap}
                    onChange={(event) => handleFieldChange("namaLengkap", event.target.value)}
                    className="profile-input"
                    placeholder="Masukkan Nama Lengkap...."
                    required
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="nisNisn" className="profile-label">NIS / NISN</label>
                  <input
                    id="nisNisn"
                    type="text"
                    value={form.nisNisn}
                    onChange={(event) => handleFieldChange("nisNisn", event.target.value)}
                    className="profile-input"
                    placeholder="Masukkan NIS / NISN...."
                    required
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="jenisKelamin" className="profile-label">Jenis Kelamin</label>
                  <div className="profile-select-wrap">
                    <select
                      id="jenisKelamin"
                      value={form.jenisKelamin}
                      onChange={(event) => handleFieldChange("jenisKelamin", event.target.value)}
                      className="profile-input profile-select"
                    >
                      <option value="" disabled>Pilih Jenis Kelamin</option>
                      <option value="Perempuan">Perempuan</option>
                      <option value="Laki-laki">Laki-laki</option>
                    </select>
                    <ChevronDown className="profile-select-icon" />
                  </div>
                </div>

                <div className="profile-field">
                  <label htmlFor="tempatLahir" className="profile-label">Tempat Lahir</label>
                  <input
                    id="tempatLahir"
                    type="text"
                    value={form.tempatLahir}
                    onChange={(event) => handleFieldChange("tempatLahir", event.target.value)}
                    className="profile-input"
                    placeholder="Masukkan Tempat Lahir..."
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="tanggalLahir" className="profile-label">Tanggal Lahir</label>
                  <input
                    id="tanggalLahir"
                    type="date"
                    value={form.tanggalLahir}
                    onChange={(event) => handleFieldChange("tanggalLahir", event.target.value)}
                    className="profile-input"
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="email" className="profile-label">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => handleFieldChange("email", event.target.value)}
                    className="profile-input"
                    placeholder="Masukkan Email..."
                    required
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="alamatLengkap" className="profile-label">Alamat Lengkap</label>
                  <input
                    id="alamatLengkap"
                    type="text"
                    value={form.alamatLengkap}
                    onChange={(event) => handleFieldChange("alamatLengkap", event.target.value)}
                    className="profile-input"
                    placeholder="Masukkan Alamat Lengkap..."
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="fotoInput" className="profile-label">Foto Profil</label>
                  <div className="profile-upload-row">
                    <label htmlFor="fotoInput" className="profile-upload-button">
                      <Upload className="profile-upload-icon" />
                      <span>Pilih Foto</span>
                    </label>
                    <input id="fotoInput" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoSelect} />
                    <span className="profile-file-name">{selectedFileName}</span>
                  </div>
                  {error ? <p className="profile-error">{error}</p> : null}
                </div>

                <div className="profile-field">
                  <label htmlFor="noTelepon" className="profile-label">Nomor Telepon</label>
                  <input
                    id="noTelepon"
                    type="tel"
                    value={form.noTelepon}
                    onChange={(event) => handleFieldChange("noTelepon", event.target.value)}
                    className="profile-input"
                    placeholder="Masukkan Nomor Telepon..."
                  />
                </div>
              </div>

              <div className="profile-form-footer">
                <p>Pastikan seluruh data diri Anda telah sesuai dengan dokumen resmi kesiswaan.</p>
                <div className="profile-form-actions">
                  <button type="button" onClick={handleCancel} className="profile-cancel-button">Batal</button>
                  <button type="submit" id="simpanProfilBtn" className={`profile-save-button${saveSucceeded ? " is-saved" : ""}`}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{submitState}</span>
                  </button>
                </div>
              </div>
            </form>
          </section>

          <footer className="profile-footer">
            <p>© 2026 CourseUp. Ruang belajar untuk melangkah lebih jauh.</p>
            <p>Hubungi kami</p>
          </footer>
        </div>
      </div>
    </main>
  );
}
