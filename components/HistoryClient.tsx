"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faClone,
  faPenToSquare,
  faInbox,
  faMagnifyingGlass,
  faXmark,
  faArrowUpRightFromSquare,
  faDownload,
  faBroom
} from "@fortawesome/free-solid-svg-icons";
import "@/lib/fontawesome";
import {
  loadUploadHistory,
  clearUploadHistory,
  UploadHistoryItem
} from "@/lib/uploadHistoryClient";
import { useToast } from "@/components/ToastProvider";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function githubFileUrl(item: UploadHistoryItem) {
  const encodedPath = item.finalPath
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `https://github.com/${item.owner}/${item.repo}/blob/HEAD/${encodedPath}`;
}

const statusConfig = {
  uploaded: { icon: faCircleCheck, cls: "bg-primary-50 text-primary-600", label: "uploaded" },
  replaced: { icon: faPenToSquare, cls: "bg-amber-50 text-amber-600", label: "replaced" },
  "skipped-duplicate": { icon: faClone, cls: "bg-ink/5 text-ink/40", label: "identik · skip" }
};

export default function HistoryClient() {
  const { showToast } = useToast();
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setHistory(loadUploadHistory());
  }, []);

  function handleExport() {
    if (history.length === 0) return;
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `harbor-upload-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Riwayat berhasil diekspor.", "success");
  }

  function handleClear() {
    clearUploadHistory();
    setHistory([]);
    showToast("Riwayat berhasil dibersihkan.", "success");
  }

  const filteredHistory = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (item) =>
        item.finalPath.toLowerCase().includes(q) ||
        item.repo.toLowerCase().includes(q)
    );
  })();

  return (
    <div className="space-y-6">
      <div data-aos="fade-up" className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Riwayat Upload</h1>
          <p className="mt-1 text-sm text-ink/50">
            Catatan setiap file yang pernah kamu upload, tersimpan di perangkat ini.
          </p>
        </div>
        {history.length > 0 && (
          <div className="flex shrink-0 gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink/50 shadow-card transition-colors hover:border-primary-200 hover:text-primary-600"
              title="Ekspor riwayat ke JSON"
            >
              <FontAwesomeIcon icon={faDownload} className="h-3 w-3" />
              <span className="hidden sm:inline">Ekspor</span>
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink/50 shadow-card transition-colors hover:border-red-200 hover:text-red-500"
              title="Bersihkan riwayat"
            >
              <FontAwesomeIcon icon={faBroom} className="h-3 w-3" />
              <span className="hidden sm:inline">Bersihkan</span>
            </button>
          </div>
        )}
      </div>

      {history.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-white py-16 text-center">
          <FontAwesomeIcon icon={faInbox} className="h-8 w-8 text-ink/20" />
          <p className="text-sm text-ink/40">Belum ada riwayat upload.</p>
        </div>
      )}

      {history.length > 0 && (
        <div data-aos="fade-up" data-aos-delay="40" className="relative">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/30"
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari file atau repo..."
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

      {history.length > 0 && filteredHistory.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-white py-16 text-center">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="h-8 w-8 text-ink/20" />
          <p className="text-sm text-ink/40">
            Tidak ada riwayat yang cocok dengan &quot;{searchQuery}&quot;.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {filteredHistory.map((item, i) => {
          const cfg = statusConfig[item.status];
          return (
            <a
              key={item.id}
              href={githubFileUrl(item)}
              target="_blank"
              rel="noreferrer"
              data-aos="fade-up"
              data-aos-delay={Math.min(i * 30, 300)}
              className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.cls}`}>
                <FontAwesomeIcon icon={cfg.icon} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink group-hover:text-primary-600">
                  {item.finalPath}
                  <FontAwesomeIcon
                    icon={faArrowUpRightFromSquare}
                    className="h-2.5 w-2.5 shrink-0 text-ink/20 group-hover:text-primary-400"
                  />
                </p>
                <p className="mt-0.5 text-xs text-ink/40">
                  {item.repo} · {formatBytes(item.sizeBytes)} ·{" "}
                  {new Date(item.createdAt).toLocaleString("id-ID")}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${cfg.cls}`}>
                {cfg.label}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
