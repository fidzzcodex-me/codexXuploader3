"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTriangleExclamation,
  faLocationDot,
  faBuilding,
  faLink,
  faEnvelope,
  faUsers,
  faUserPlus,
  faFolderTree,
  faLock,
  faCalendar,
  faArrowUpRightFromSquare
} from "@fortawesome/free-solid-svg-icons";
import { faGithub, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import "@/lib/fontawesome";

interface Profile {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  twitterUsername: string | null;
  publicRepos: number;
  privateRepos: number | null;
  followers: number;
  following: number;
  createdAt: string;
  htmlUrl: string;
  plan: string | null;
  emails: string[];
}

export default function ProfileClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/github/profile");
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error || "Gagal memuat profil.");
          return;
        }
        setProfile(data.profile);
      } catch {
        setError("Koneksi ke server terputus.");
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
        <FontAwesomeIcon icon={faTriangleExclamation} className="h-3.5 w-3.5" />
        {error}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Profil</h1>
          <p className="mt-1 text-sm text-ink/50">Memuat data akun...</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-20 w-20 shrink-0 animate-pulse rounded-2xl bg-mist" />
            <div className="w-full space-y-2.5">
              <div className="mx-auto h-4 w-1/3 animate-pulse rounded-full bg-mist sm:mx-0" />
              <div className="mx-auto h-3 w-1/4 animate-pulse rounded-full bg-mist/70 sm:mx-0" />
              <div className="mx-auto h-3 w-2/3 animate-pulse rounded-full bg-mist/50 sm:mx-0" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-line bg-white p-4 text-center shadow-card"
            >
              <div className="mx-auto mb-2 h-9 w-9 animate-pulse rounded-xl bg-mist" />
              <div className="mx-auto h-5 w-8 animate-pulse rounded-full bg-mist" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Repo publik", value: profile.publicRepos, icon: faFolderTree },
    { label: "Repo privat", value: profile.privateRepos ?? "—", icon: faLock },
    { label: "Followers", value: profile.followers, icon: faUsers },
    { label: "Following", value: profile.following, icon: faUserPlus }
  ];

  return (
    <div className="space-y-6">
      <div data-aos="fade-up">
        <h1 className="font-display text-2xl font-bold text-ink">Profil</h1>
        <p className="mt-1 text-sm text-ink/50">
          Data diambil langsung dari token GitHub kamu.
        </p>
      </div>

      <div
        data-aos="fade-up"
        data-aos-delay="60"
        className="relative overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-card"
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-100/60 blur-2xl" />
        <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <img
            src={profile.avatarUrl}
            alt={profile.login}
            className="h-20 w-20 rounded-2xl shadow-soft ring-4 ring-white"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h2 className="font-display text-xl font-bold text-ink">
                {profile.name || profile.login}
              </h2>
              {profile.plan && (
                <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[10px] font-bold text-primary-600">
                  {profile.plan}
                </span>
              )}
            </div>
            <a
              href={profile.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 flex items-center justify-center gap-1.5 text-sm text-primary-600 hover:underline sm:justify-start"
            >
              <FontAwesomeIcon icon={faGithub} className="h-3.5 w-3.5" />
              @{profile.login}
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-2.5 w-2.5" />
            </a>
            {profile.bio && (
              <p className="mt-2 text-sm leading-relaxed text-ink/55">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-line pt-4 text-xs text-ink/50 sm:justify-start">
          {profile.company && (
            <span className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faBuilding} className="h-3 w-3" />
              {profile.company}
            </span>
          )}
          {profile.location && (
            <span className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faLocationDot} className="h-3 w-3" />
              {profile.location}
            </span>
          )}
          {profile.blog && (
            <a
              href={profile.blog.startsWith("http") ? profile.blog : `https://${profile.blog}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-primary-600"
            >
              <FontAwesomeIcon icon={faLink} className="h-3 w-3" />
              {profile.blog}
            </a>
          )}
          {profile.twitterUsername && (
            <span className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faXTwitter} className="h-3 w-3" />
              @{profile.twitterUsername}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faCalendar} className="h-3 w-3" />
            Bergabung {new Date(profile.createdAt).toLocaleDateString("id-ID", {
              year: "numeric",
              month: "long"
            })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            data-aos="fade-up"
            data-aos-delay={i * 60}
            className="rounded-2xl border border-line bg-white p-4 text-center shadow-card"
          >
            <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-mist text-primary-600">
              <FontAwesomeIcon icon={s.icon} className="h-3.5 w-3.5" />
            </div>
            <p className="font-display text-xl font-bold text-ink">{s.value}</p>
            <p className="mt-0.5 text-[11px] text-ink/45">{s.label}</p>
          </div>
        ))}
      </div>

      {profile.emails.length > 0 && (
        <div
          data-aos="fade-up"
          className="rounded-2xl border border-line bg-white p-5 shadow-card"
        >
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink/50">
            <FontAwesomeIcon icon={faEnvelope} className="h-3 w-3" />
            Email terhubung
          </h3>
          <div className="space-y-2">
            {profile.emails.map((e) => (
              <p key={e} className="rounded-lg bg-cloud px-3 py-2 text-sm text-ink/70">
                {e}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
