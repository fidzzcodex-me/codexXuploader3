"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloudArrowUp,
  faCodeBranch,
  faRobot,
  faShieldHalved,
  faArrowRight,
  faFolderTree,
  faTrashCan,
  faClockRotateLeft,
  faUserGear,
  faFileZipper,
  faBolt
} from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { useEffect } from "react";
import ParticleField from "@/components/ParticleField";
import AosInit from "@/components/AosInit";
import "@/lib/fontawesome";

const steps = [
  {
    icon: faCloudArrowUp,
    title: "Upload file apa saja",
    desc: "Drag file tunggal, banyak file sekaligus, atau .zip — otomatis diekstrak dan disusun ke struktur repo."
  },
  {
    icon: faFolderTree,
    title: "Repo diatur otomatis",
    desc: "Pilih repo tujuan, visibility public atau private, sistem menangani commit dan path secara rapi."
  },
  {
    icon: faShieldHalved,
    title: "Anti tumpang tindih",
    desc: "File yang isinya identik tidak pernah ditimpa dua kali. File berbeda dengan nama sama otomatis di-replace, bukan disimpan berdampingan."
  },
  {
    icon: faRobot,
    title: "Ditemani AI agent",
    desc: "Minta AI membaca, menyusun, atau membersihkan repo — setiap aksi nyata tetap menunggu konfirmasi kamu."
  }
];

const navFeatures = [
  { icon: faCloudArrowUp, label: "Upload" },
  { icon: faFolderTree, label: "Repo" },
  { icon: faClockRotateLeft, label: "Riwayat" },
  { icon: faRobot, label: "Chat AI" },
  { icon: faUserGear, label: "Profil" }
];

export default function LandingClient() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <AosInit />
      <ParticleField />
      <div className="grain-overlay" />

      <header className="relative z-20">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-white shadow-soft">
              <FontAwesomeIcon icon={faCodeBranch} className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-ink">
              Harbor
            </span>
          </div>
          <Link
            href="/setup"
            className="group flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 shadow-card ring-1 ring-line transition-all hover:shadow-soft hover:ring-primary-200"
          >
            Masuk
            <FontAwesomeIcon
              icon={faArrowRight}
              className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-28 pt-16 sm:pt-24">
        <div
          data-aos="fade-up"
          className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-line bg-white/70 px-4 py-1.5 text-xs font-semibold text-primary-700 shadow-card backdrop-blur"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
          </span>
          Satu tempat untuk mengelola repository GitHub kamu
        </div>

        <h1
          data-aos="fade-up"
          data-aos-delay="80"
          className="mx-auto max-w-4xl text-center font-display text-[2.5rem] font-bold leading-[1.08] tracking-tight text-ink sm:text-6xl"
        >
          Upload file ke GitHub{" "}
          <span className="gradient-text">tanpa buka terminal.</span>
        </h1>

        <p
          data-aos="fade-up"
          data-aos-delay="160"
          className="mx-auto mt-6 max-w-xl text-center text-base leading-relaxed text-ink/60 sm:text-lg"
        >
          Harbor menghubungkan token GitHub kamu ke satu dashboard: upload
          file atau .zip, kelola repository, pantau riwayat, dan minta
          bantuan AI agent — semua dengan konfirmasi jelas sebelum aksi apa
          pun berjalan.
        </p>

        <div
          data-aos="fade-up"
          data-aos-delay="240"
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/setup"
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary-500 px-8 py-4 text-sm font-bold text-white shadow-glow transition-transform hover:-translate-y-0.5 sm:w-auto"
          >
            <span className="relative z-10 flex items-center gap-2">
              Go, mulai sekarang
              <FontAwesomeIcon
                icon={faArrowRight}
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
              />
            </span>
            <span className="absolute inset-0 -z-0 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-[length:200%_100%] transition-[background-position] duration-700 group-hover:bg-[position:100%_0]" />
          </Link>
          <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white/60 px-6 py-4 text-sm text-ink/50 backdrop-blur sm:w-auto">
            <FontAwesomeIcon icon={faGithub} className="h-4 w-4" />
            Perlu Personal Access Token GitHub
          </div>
        </div>

        <div
          data-aos="zoom-in"
          data-aos-delay="120"
          className="relative mx-auto mt-24 flex h-[340px] max-w-2xl items-center justify-center sm:h-[420px]"
        >
          <div className="absolute h-[280px] w-[280px] animate-[spin_28s_linear_infinite] rounded-full border border-dashed border-primary-200 sm:h-[360px] sm:w-[360px]" />
          <div className="absolute h-[200px] w-[200px] animate-[spin_20s_linear_infinite_reverse] rounded-full border border-line sm:h-[260px] sm:w-[260px]" />

          <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-glow ring-1 ring-primary-100 sm:h-28 sm:w-28">
            <FontAwesomeIcon
              icon={faGithub}
              className="h-9 w-9 text-ink sm:h-11 sm:w-11"
            />
          </div>

          {[
            { icon: faCloudArrowUp, pos: "top-0 left-1/2 -translate-x-1/2" },
            { icon: faFileZipper, pos: "bottom-0 left-1/2 -translate-x-1/2" },
            { icon: faRobot, pos: "top-1/2 left-0 -translate-y-1/2" },
            { icon: faFolderTree, pos: "top-1/2 right-0 -translate-y-1/2" }
          ].map((item, i) => (
            <div
              key={i}
              className={`absolute ${item.pos} flex h-14 w-14 animate-float-slow items-center justify-center rounded-2xl bg-white/90 shadow-soft ring-1 ring-line backdrop-blur`}
              style={{ animationDelay: `${i * 0.6}s` }}
            >
              <FontAwesomeIcon
                icon={item.icon}
                className="h-5 w-5 text-primary-500"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-28">
        <div data-aos="fade-up" className="mx-auto mb-16 max-w-xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary-500">
            Cara kerja
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Empat langkah, tanpa rasa asing
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div
              key={step.title}
              data-aos="fade-up"
              data-aos-delay={i * 90}
              className="animated-border group relative rounded-2xl bg-white p-6 shadow-card ring-1 ring-line transition-all hover:-translate-y-1 hover:shadow-soft"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-mist text-primary-600 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary-500 group-hover:text-white">
                <FontAwesomeIcon icon={step.icon} className="h-4.5 w-4.5" />
              </div>
              <h3 className="mb-1.5 font-display text-base font-bold text-ink">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-ink/55">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-28">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div data-aos="fade-right">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary-500">
              Sistemnya
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Lima ruang kerja dalam satu dashboard
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/55 sm:text-base">
              Setelah token terverifikasi, semua yang kamu butuhkan untuk
              mengelola repo ada di satu tempat, dipisah rapi lewat navigasi
              bawah.
            </p>

            <ul className="mt-8 space-y-4">
              {navFeatures.map((f, i) => (
                <li
                  key={f.label}
                  data-aos="fade-up"
                  data-aos-delay={i * 70}
                  className="flex items-center gap-4 rounded-xl border border-line bg-white/70 px-4 py-3.5 backdrop-blur transition-colors hover:bg-white"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <FontAwesomeIcon icon={f.icon} className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-ink">
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div data-aos="fade-left" className="relative">
            <div className="relative rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-300" />
                  <span className="h-3 w-3 rounded-full bg-amber-300" />
                  <span className="h-3 w-3 rounded-full bg-emerald-300" />
                </div>
                <span className="text-xs font-medium text-ink/40">
                  upload.zip
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-mist px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon
                      icon={faFileZipper}
                      className="h-4 w-4 text-primary-500"
                    />
                    <span className="text-sm font-medium text-ink">
                      project-src.zip
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    extracted
                  </span>
                </div>
                {[
                  ["index.js", "uploaded"],
                  ["style.css", "uploaded"],
                  ["readme.md", "skip · identical"]
                ].map(([name, tag]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg border border-line px-4 py-3"
                  >
                    <span className="text-sm text-ink/70">{name}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        tag.startsWith("skip")
                          ? "bg-amber-50 text-amber-600"
                          : "bg-primary-50 text-primary-600"
                      }`}
                    >
                      {tag}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-2 rounded-lg bg-ink px-4 py-3 text-white">
                <FontAwesomeIcon icon={faBolt} className="h-3.5 w-3.5 text-primary-300" />
                <span className="text-xs font-medium">
                  Tidak ada file yang tertimpa — otomatis dijaga.
                </span>
              </div>
            </div>

            <div className="absolute -right-6 -top-6 -z-10 h-full w-full rounded-3xl bg-primary-100/50 blur-2xl" />
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-28">
        <div
          data-aos="fade-up"
          className="flex flex-col items-center gap-6 rounded-3xl bg-ink px-8 py-12 text-center shadow-soft sm:px-16"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <FontAwesomeIcon icon={faShieldHalved} className="h-5 w-5 text-primary-300" />
          </div>
          <h2 className="max-w-lg font-display text-2xl font-bold text-white sm:text-3xl">
            Token kamu disimpan di sesi browser terenkripsi, bukan di database.
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-white/50">
            Session terenkripsi, httpOnly, dan otomatis kedaluwarsa. Keluar
            kapan saja untuk menghapusnya seketika.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24 text-center">
        <div data-aos="fade-up">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Siap kelola repo kamu?
          </h2>
          <Link
            href="/setup"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary-500 px-8 py-4 text-sm font-bold text-white shadow-glow transition-transform hover:-translate-y-0.5"
          >
            Go
            <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-line py-8 text-center text-xs text-ink/40">
        Harbor — dibuat untuk mengelola repository GitHub dengan lebih tenang.
      </footer>
    </main>
  );
}
