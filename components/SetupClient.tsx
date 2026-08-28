"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faKey,
  faArrowLeft,
  faShieldHalved,
  faCircleNotch,
  faTriangleExclamation,
  faCircleCheck
} from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import ParticleField from "@/components/ParticleField";
import AosInit from "@/components/AosInit";
import "@/lib/fontawesome";

export default function SetupClient() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() })
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Token tidak valid. Periksa kembali.");
        return;
      }

      setStatus("success");
      setTimeout(() => router.push("/dashboard/upload"), 500);
    } catch {
      setStatus("error");
      setErrorMsg("Gagal terhubung ke server. Coba lagi.");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <AosInit />
      <ParticleField />
      <div className="grain-overlay" />

      <Link
        href="/"
        className="absolute left-6 top-6 z-20 flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold text-ink/60 shadow-card ring-1 ring-line backdrop-blur transition-colors hover:text-primary-600"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" />
        Kembali
      </Link>

      <div
        data-aos="fade-up"
        className="glass-panel relative z-10 w-full max-w-md rounded-3xl p-8 shadow-soft sm:p-10"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-glow animate-pulse-soft">
            <FontAwesomeIcon icon={faGithub} className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Hubungkan akun GitHub
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink/55">
            Masukkan Personal Access Token (classic atau fine-grained) untuk
            masuk ke dashboard management.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="ghp-token"
              className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink/50"
            >
              GitHub Token
            </label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faKey}
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30"
              />
              <input
                id="ghp-token"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-xl border border-line bg-white py-3.5 pl-11 pr-4 font-mono text-sm text-ink placeholder:text-ink/30 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          {status === "error" && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              <FontAwesomeIcon
                icon={faTriangleExclamation}
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
              />
              <span>{errorMsg}</span>
            </div>
          )}

          {status === "success" && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
              <FontAwesomeIcon icon={faCircleCheck} className="h-3.5 w-3.5" />
              <span>Token terverifikasi. Membuka dashboard...</span>
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading" || status === "success" || !token.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-3.5 text-sm font-bold text-white shadow-glow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {status === "loading" ? (
              <>
                <FontAwesomeIcon icon={faCircleNotch} className="h-4 w-4 animate-spin" />
                Memverifikasi...
              </>
            ) : (
              "Lanjutkan"
            )}
          </button>
        </form>

        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-line bg-cloud px-4 py-3.5">
          <FontAwesomeIcon
            icon={faShieldHalved}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500"
          />
          <p className="text-xs leading-relaxed text-ink/50">
            Token disimpan terenkripsi di cookie session (httpOnly, hanya
            dapat dibaca server) dan otomatis kedaluwarsa. Tidak pernah
            disimpan di database.
          </p>
        </div>
      </div>
    </main>
  );
}
