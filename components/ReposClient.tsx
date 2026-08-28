"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrashCan,
  faLock,
  faGlobe,
  faStar,
  faArrowUpRightFromSquare,
  faCircleNotch,
  faTriangleExclamation,
  faFolderOpen,
  faChevronDown,
  faCloudArrowUp,
  faCircleCheck,
  faMagnifyingGlass,
  faXmark
} from "@fortawesome/free-solid-svg-icons";
import "@/lib/fontawesome";
import { useToast } from "@/components/ToastProvider";

interface Repo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  htmlUrl: string;
  updatedAt: string;
  stargazersCount: number;
  language: string | null;
}

function RepoSkeletonRow({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-card"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-mist" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-2/5 animate-pulse rounded-full bg-mist" />
        <div className="h-2.5 w-3/5 animate-pulse rounded-full bg-mist/70" />
      </div>
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-mist" />
    </div>
  );
}

export default function ReposClient() {
  const { showToast } = useToast();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Repo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [dragOverRepoId, setDragOverRepoId] = useState<number | null>(null);
  const [quickUpload, setQuickUpload] = useState<{
    repoName: string;
    status: "uploading" | "done" | "error";
    message: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadPage(1, true);
  }, []);

  async function loadPage(pageNum: number, isInitial: boolean) {
    setError("");
    if (isInitial) setInitialLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(`/api/github/repos?page=${pageNum}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Gagal memuat repository.");
        return;
      }
      setRepos((prev) => (isInitial ? data.repos : [...prev, ...data.repos]));
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch {
      setError("Koneksi ke server terputus.");
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }

  async function handleQuickUpload(repoName: string, fileList: FileList) {
    setQuickUpload({ repoName, status: "uploading", message: "Mengupload..." });

    try {
      const formData = new FormData();
      formData.set("repo", repoName);
      formData.set("isPrivate", "false");
      formData.set("createIfMissing", "false");
      formData.set("basePath", "");
      formData.set("branch", "");
      Array.from(fileList).forEach((f) => {
        formData.append("files", f);
        formData.append("relativePaths", f.name);
      });

      const res = await fetch("/api/github/upload", {
        method: "POST",
        body: formData
      });

      if (!res.ok || !res.body) {
        setQuickUpload({
          repoName,
          status: "error",
          message: "Upload gagal."
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const eventMatch = chunk.match(/^event: (.+)$/m);
          const dataMatch = chunk.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;
          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);

          if (event === "done") {
            const count = data.results?.length || 0;
            setQuickUpload({
              repoName,
              status: "done",
              message: `${count} file berhasil diupload.`
            });
            finished = true;
          } else if (event === "error") {
            setQuickUpload({
              repoName,
              status: "error",
              message: data.error || "Upload gagal."
            });
            finished = true;
          }
        }
      }
    } catch {
      setQuickUpload({
        repoName,
        status: "error",
        message: "Koneksi ke server terputus."
      });
    } finally {
      setTimeout(() => setQuickUpload(null), 3500);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    const repoName = pendingDelete.name;
    try {
      const res = await fetch("/api/github/delete-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repoName })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Gagal menghapus repo.");
        showToast(data.error || "Gagal menghapus repo.", "error");
      } else {
        setRepos((prev) => prev.filter((r) => r.id !== pendingDelete.id));
        showToast(`Repo "${repoName}" berhasil dihapus.`, "success");
      }
    } catch {
      setError("Koneksi ke server terputus.");
      showToast("Koneksi ke server terputus.", "error");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
      setConfirmText("");
    }
  }

  const filteredRepos = searchQuery.trim()
    ? repos.filter((r) =>
        r.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : repos;

  return (
    <div className="space-y-6">
      <div data-aos="fade-up" className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Repository
          </h1>
          <p className="mt-1 text-sm text-ink/50">
            {initialLoading
              ? "Memuat repository kamu..."
              : `${repos.length} repository dimuat${hasMore ? " · masih ada lagi" : ""} · tarik file ke repo untuk upload cepat`}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <FontAwesomeIcon icon={faTriangleExclamation} className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {!initialLoading && repos.length > 0 && (
        <div data-aos="fade-up" data-aos-delay="40" className="relative">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/30"
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari repository..."
            className="w-full rounded-xl border border-line bg-white py-3 pl-11 pr-10 text-sm text-ink placeholder:text-ink/30 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink/30 transition-colors hover:bg-cloud hover:text-ink"
            >
              <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {initialLoading && (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <RepoSkeletonRow key={i} delay={i * 70} />
          ))}
        </div>
      )}

      {!initialLoading && repos.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-white py-16 text-center">
          <FontAwesomeIcon icon={faFolderOpen} className="h-8 w-8 text-ink/20" />
          <p className="text-sm text-ink/40">Belum ada repository.</p>
        </div>
      )}

      {!initialLoading && repos.length > 0 && filteredRepos.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-white py-16 text-center">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="h-8 w-8 text-ink/20" />
          <p className="text-sm text-ink/40">
            Tidak ada repo yang cocok dengan &quot;{searchQuery}&quot;.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filteredRepos.map((repo, i) => {
          const isDragOver = dragOverRepoId === repo.id;
          const isQuickUploading =
            quickUpload?.repoName === repo.name && quickUpload.status === "uploading";
          const quickResult =
            quickUpload?.repoName === repo.name && quickUpload.status !== "uploading"
              ? quickUpload
              : null;

          return (
            <div
              key={repo.id}
              data-aos="fade-up"
              data-aos-delay={Math.min(i * 30, 240)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverRepoId(repo.id);
              }}
              onDragLeave={() => setDragOverRepoId((cur) => (cur === repo.id ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverRepoId(null);
                if (e.dataTransfer.files.length > 0) {
                  handleQuickUpload(repo.name, e.dataTransfer.files);
                }
              }}
              className={`group relative flex items-center gap-4 rounded-2xl border p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft ${
                isDragOver
                  ? "border-primary-400 bg-primary-50 scale-[1.01]"
                  : "border-line bg-white"
              }`}
            >
              {isDragOver && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-primary-500/90 backdrop-blur-sm">
                  <p className="flex items-center gap-2 text-sm font-bold text-white">
                    <FontAwesomeIcon icon={faCloudArrowUp} className="h-4 w-4" />
                    Lepas untuk upload ke {repo.name}
                  </p>
                </div>
              )}

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mist text-primary-600 transition-transform duration-300 group-hover:scale-110">
                <FontAwesomeIcon
                  icon={
                    isQuickUploading
                      ? faCircleNotch
                      : repo.private
                      ? faLock
                      : faGlobe
                  }
                  className={`h-4 w-4 ${isQuickUploading ? "animate-spin" : ""}`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <a
                    href={repo.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm font-bold text-ink hover:text-primary-600"
                  >
                    {repo.name}
                  </a>
                  <FontAwesomeIcon
                    icon={faArrowUpRightFromSquare}
                    className="h-2.5 w-2.5 shrink-0 text-ink/20"
                  />
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      repo.private
                        ? "bg-amber-50 text-amber-600"
                        : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    {repo.private ? "private" : "public"}
                  </span>
                </div>

                {quickResult ? (
                  <p
                    className={`mt-0.5 flex items-center gap-1.5 text-xs font-semibold ${
                      quickResult.status === "done"
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={
                        quickResult.status === "done"
                          ? faCircleCheck
                          : faTriangleExclamation
                      }
                      className="h-3 w-3"
                    />
                    {quickResult.message}
                  </p>
                ) : isQuickUploading ? (
                  <p className="mt-0.5 text-xs font-semibold text-primary-600">
                    Mengupload...
                  </p>
                ) : (
                  <>
                    {repo.description && (
                      <p className="mt-0.5 truncate text-xs text-ink/45">
                        {repo.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-ink/35">
                      {repo.language && <span>{repo.language}</span>}
                      <span className="flex items-center gap-1">
                        <FontAwesomeIcon icon={faStar} className="h-2.5 w-2.5" />
                        {repo.stargazersCount}
                      </span>
                      <span>
                        Diperbarui{" "}
                        {new Date(repo.updatedAt).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setPendingDelete(repo)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink/25 transition-all hover:scale-110 hover:bg-red-50 hover:text-red-500"
                aria-label={`Hapus repo ${repo.name}`}
              >
                <FontAwesomeIcon icon={faTrashCan} className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {!initialLoading && hasMore && (
        <div className="space-y-2">
          <button
            onClick={() => loadPage(page + 1, false)}
            disabled={loadingMore}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white py-3.5 text-sm font-semibold text-ink/60 shadow-card transition-colors hover:border-primary-200 hover:text-primary-600 disabled:opacity-60"
          >
            {loadingMore ? (
              <FontAwesomeIcon icon={faCircleNotch} className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faChevronDown} className="h-3.5 w-3.5" />
            )}
            {loadingMore ? "Memuat..." : "Muat repository lainnya"}
          </button>
          {searchQuery && (
            <p className="text-center text-xs text-ink/35">
              Pencarian hanya mencakup repo yang sudah dimuat — muat lebih
              banyak kalau repo yang dicari belum muncul.
            </p>
          )}
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6 backdrop-blur-sm">
          <div
            data-aos="zoom-in"
            data-aos-duration="300"
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-soft"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <FontAwesomeIcon icon={faTrashCan} className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink">
              Hapus repository ini?
            </h3>
            <p className="mt-2 text-sm text-ink/55">
              Aksi ini tidak dapat dibatalkan. Ketik{" "}
              <span className="font-mono font-bold text-ink">
                {pendingDelete.name}
              </span>{" "}
              untuk konfirmasi.
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={pendingDelete.name}
              className="mt-4 w-full rounded-xl border border-line bg-cloud px-4 py-3 font-mono text-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setPendingDelete(null);
                  setConfirmText("");
                }}
                className="flex-1 rounded-xl border border-line py-3 text-sm font-semibold text-ink/60 transition-colors hover:bg-cloud"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={confirmText !== pendingDelete.name || deleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? (
                  <FontAwesomeIcon icon={faCircleNotch} className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Hapus"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
