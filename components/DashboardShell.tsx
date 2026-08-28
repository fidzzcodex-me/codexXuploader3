"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloudArrowUp,
  faFolderTree,
  faClockRotateLeft,
  faRobot,
  faUserGear,
  faCodeBranch,
  faRightFromBracket
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState } from "react";
import ParticleField from "./ParticleField";
import AosInit from "./AosInit";
import { ToastProvider } from "./ToastProvider";
import { subscribeUploadState } from "@/lib/uploadRunner";
import { resetUploadFormState, setPickedFiles } from "@/lib/uploadFormState";
import "@/lib/fontawesome";

interface NavItem {
  href: string;
  icon: typeof faCloudArrowUp;
  label: string;
  isCenter?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard/upload", icon: faCloudArrowUp, label: "Upload" },
  { href: "/dashboard/repos", icon: faFolderTree, label: "Repo" },
  { href: "/dashboard/chat", icon: faRobot, label: "Chat AI", isCenter: true },
  { href: "/dashboard/history", icon: faClockRotateLeft, label: "Riwayat" },
  { href: "/dashboard/profile", icon: faUserGear, label: "Profil" }
];

export default function DashboardShell({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadInFlight, setUploadInFlight] = useState(false);

  useEffect(() => {
    return subscribeUploadState((state) => {
      setUploadInFlight(state.status === "loading");
    });
  }, []);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (uploadInFlight) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [uploadInFlight]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    try {
      window.sessionStorage.removeItem("harbor_chat_messages");
    } catch {
    }
    resetUploadFormState();
    setPickedFiles([]);
    router.push("/");
  }

  return (
    <ToastProvider>
      <div className="relative min-h-screen">
        <AosInit />
        <ParticleField />
        <div className="grain-overlay" />

          <header className="relative z-20 border-b border-line bg-white/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
            <Link href="/dashboard/upload" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-white shadow-soft">
                <FontAwesomeIcon icon={faCodeBranch} className="h-3.5 w-3.5" />
              </div>
              <span className="font-display text-base font-bold tracking-tight text-ink">
                Harbor
              </span>
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-ink/60 shadow-card transition-colors hover:border-red-200 hover:text-red-500 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="h-3 w-3" />
              Keluar
            </button>
          </div>
        </header>

        <main className="relative z-10 mx-auto max-w-5xl px-5 pb-28 pt-6 sm:pb-10">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/85 backdrop-blur-xl sm:sticky">
          <div className="mx-auto flex max-w-5xl items-end justify-between px-2 pb-1.5 pt-2 sm:justify-center sm:gap-3">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const isCenter = item.isCenter;

              if (isCenter) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group relative flex flex-1 flex-col items-center gap-1 sm:flex-none sm:px-2"
                  >
                    <span
                      className={`relative -mt-7 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-white shadow-glow ring-4 ring-cloud transition-transform duration-300 animate-fab-bob group-hover:scale-105 group-active:scale-95 ${
                        active ? "animate-pulse-soft" : ""
                      }`}
                    >
                      {active && (
                        <>
                          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary-400 opacity-40" />
                          <span
                            className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary-300 opacity-25"
                            style={{ animationDelay: "0.4s" }}
                          />
                        </>
                      )}
                      <FontAwesomeIcon
                        icon={item.icon}
                        className="h-7 w-7 transition-transform duration-300 group-hover:rotate-6"
                      />
                    </span>
                    <span
                      className={`text-[10px] font-bold transition-colors ${
                        active ? "text-primary-600" : "text-ink/40 group-hover:text-primary-500"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 transition-all sm:flex-none sm:px-5 ${
                    active ? "text-primary-600" : "text-ink/40 hover:text-primary-500"
                  }`}
                >
                  <span
                    className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 ${
                      active
                        ? "bg-primary-500 text-white shadow-soft scale-105"
                        : "group-hover:bg-mist group-hover:scale-110"
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={item.icon}
                      className={`h-3.5 w-3.5 transition-transform duration-300 ${
                        active ? "" : "group-hover:-translate-y-0.5"
                      }`}
                    />
                    {item.href === "/dashboard/upload" && uploadInFlight && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] font-semibold">{item.label}</span>
                  {active && (
                    <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary-500" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </ToastProvider>
  );
}
