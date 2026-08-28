"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloudArrowUp,
  faFileZipper,
  faFileLines,
  faFileCode,
  faFileImage,
  faXmark,
  faLock,
  faGlobe,
  faCircleNotch,
  faCircleCheck,
  faTriangleExclamation,
  faClone,
  faFolderPlus,
  faFile,
  faFolderOpen,
  faPenToSquare,
  faCodeBranch,
  faEye
} from "@fortawesome/free-solid-svg-icons";
import "@/lib/fontawesome";
import { previewZipContents, ZipPreviewResult } from "@/lib/zipPreview";
import { useToast } from "@/components/ToastProvider";

interface PickedFile {
  file: File;
  id: string;
  relativePath: string;
}

interface UploadResultItem {
  fileName: string;
  finalPath: string;
  status: "uploaded" | "skipped-duplicate" | "renamed";
  sizeBytes: number;
}

function fileIcon(name: string) {
  if (name.endsWith(".zip")) return faFileZipper;
  if (/\.(png|jpe?g|gif|svg|webp)$/i.test(name)) return faFileImage;
  if (/\.(js|ts|tsx|jsx|py|go|rs|java|c|cpp|php|rb)$/i.test(name)) return faFileCode;
  return faFileLines;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readEntryRecursive(
  entry: any,
  path: string,
  out: { file: File; relativePath: string }[]
): Promise<void> {
  if (entry.isFile) {
    await new Promise<void>((resolve) => {
      entry.file((file: File) => {
        out.push({ file, relativePath: `${path}${entry.name}` });
        resolve();
      });
    });
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    const entries: any[] = await new Promise((resolve) => {
      reader.readEntries((res: any[]) => resolve(res));
    });
    for (const child of entries) {
      await readEntryRecursive(child, `${path}${entry.name}/`, out);
    }
  }
}

export default function UploadClient() {
  const { showToast } = useToast();
  const [repo, setRepo] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [createIfMissing, setCreateIfMissing] = useState(true);
  const [basePath, setBasePath] = useState("");
  const [branch, setBranch] = useState("");
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [defaultBranch, setDefaultBranch] = useState("");
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [results, setResults] = useState<UploadResultItem[]>([]);
  const [progress, setProgress] = useState<{ index: number; total: number } | null>(
    null
  );
  const [currentFileLabel, setCurrentFileLabel] = useState("");
  const [zipPreview, setZipPreview] = useState<ZipPreviewResult | null>(null);
  const [zipPreviewLoading, setZipPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const trimmed = repo.trim();
    if (!trimmed) {
      setAvailableBranches([]);
      setDefaultBranch("");
      setBranch("");
      return;
    }

    const timeout = setTimeout(async () => {
      setBranchesLoading(true);
      try {
        const res = await fetch(
          `/api/github/branches?repo=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();
        if (res.ok && data.ok) {
          setAvailableBranches(data.branches);
          setDefaultBranch(data.defaultBranch);
          setBranch(data.defaultBranch);
        } else {
          setAvailableBranches([]);
          setDefaultBranch("");
          setBranch("");
        }
      } catch {
        setAvailableBranches([]);
      } finally {
        setBranchesLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [repo]);

  const addFileList = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const picked: PickedFile[] = Array.from(fileList).map((f) => {
      const relPath = (f as any).webkitRelativePath || f.name;
      return {
        file: f,
        id: `${relPath}-${f.size}-${Math.random().toString(36).slice(2, 8)}`,
        relativePath: relPath
      };
    });
    setFiles((prev) => [...prev, ...picked]);
  }, []);

  const addEntries = useCallback(
    (entries: { file: File; relativePath: string }[]) => {
      const picked: PickedFile[] = entries.map((e) => ({
        file: e.file,
        id: `${e.relativePath}-${e.file.size}-${Math.random().toString(36).slice(2, 8)}`,
        relativePath: e.relativePath
      }));
      setFiles((prev) => [...prev, ...picked]);
    },
    []
  );

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0 && "webkitGetAsEntry" in items[0]) {
      const out: { file: File; relativePath: string }[] = [];
      const entries: any[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = (items[i] as any).webkitGetAsEntry?.();
        if (entry) entries.push(entry);
      }
      if (entries.length > 0) {
        for (const entry of entries) {
          await readEntryRecursive(entry, "", out);
        }
        addEntries(out);
        return;
      }
    }
    addFileList(e.dataTransfer.files);
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function handlePreviewZip(file: File) {
    setZipPreviewLoading(true);
    setZipPreview(null);
    try {
      const result = await previewZipContents(file);
      setZipPreview(result);
    } catch {
      setZipPreview({
        fileName: file.name,
        entries: [],
        strippedFolder: null
      });
    } finally {
      setZipPreviewLoading(false);
    }
  }

  async function handleUpload() {
    if (!repo.trim() || files.length === 0) return;
    setStatus("loading");
    setErrorMsg("");
    setResults([]);
    setProgress(null);
    setCurrentFileLabel("");

    try {
      const formData = new FormData();
      formData.set("repo", repo.trim());
      formData.set("isPrivate", String(isPrivate));
      formData.set("createIfMissing", String(createIfMissing));
      formData.set("basePath", basePath.trim());
      formData.set("branch", branch);
      files.forEach((f) => {
        formData.append("files", f.file);
        formData.append("relativePaths", f.relativePath);
      });

      const res = await fetch("/api/github/upload", {
        method: "POST",
        body: formData
      });

      if (!res.ok || !res.body) {
        let msg = "Upload gagal.";
        try {
          const data = await res.json();
          msg = data.error || msg;
        } catch {
        }
        setStatus("error");
        setErrorMsg(msg);
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

          if (event === "start") {
            setProgress({ index: 0, total: data.total });
          } else if (event === "progress") {
            setProgress({ index: data.index, total: data.total });
            setCurrentFileLabel(data.result?.finalPath || "");
          } else if (event === "done") {
            setResults(data.results);
            setStatus("done");
            setFiles([]);
            finished = true;
            const uploaded = data.results.filter(
              (r: UploadResultItem) => r.status !== "skipped-duplicate"
            ).length;
            showToast(
              `${uploaded} file berhasil diupload ke ${repo}`,
              "success"
            );
          } else if (event === "error") {
            setStatus("error");
            setErrorMsg(data.error || "Upload gagal.");
            finished = true;
            showToast(data.error || "Upload gagal.", "error");
          }
        }
      }
    } catch {
      setStatus("error");
      setErrorMsg("Koneksi ke server terputus.");
      showToast("Koneksi ke server terputus.", "error");
    }
  }

  const hasFolderFiles = files.some((f) => f.relativePath.includes("/"));

  return (
    <div className="space-y-6">
      <div data-aos="fade-up">
        <h1 className="font-display text-2xl font-bold text-ink">Upload</h1>
        <p className="mt-1 text-sm text-ink/50">
          Upload file tunggal, folder, banyak file, atau .zip — otomatis
          diekstrak dan diamankan dari duplikasi.
        </p>
      </div>

      <div
        data-aos="fade-up"
        data-aos-delay="60"
        className="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-card sm:grid-cols-2"
      >
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/50">
            Nama repository
          </label>
          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="contoh: my-project"
            className="w-full rounded-xl border border-line bg-cloud px-4 py-3 text-sm text-ink placeholder:text-ink/30 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/50">
            Folder tujuan (opsional)
          </label>
          <input
            value={basePath}
            onChange={(e) => setBasePath(e.target.value)}
            placeholder="contoh: src/assets"
            className="w-full rounded-xl border border-line bg-cloud px-4 py-3 text-sm text-ink placeholder:text-ink/30 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>

        {availableBranches.length > 0 && (
          <div className="sm:col-span-2">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink/50">
              <FontAwesomeIcon icon={faCodeBranch} className="h-3 w-3" />
              Branch
              {branchesLoading && (
                <FontAwesomeIcon
                  icon={faCircleNotch}
                  className="h-3 w-3 animate-spin text-primary-400"
                />
              )}
            </label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full rounded-xl border border-line bg-cloud px-4 py-3 text-sm text-ink focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {availableBranches.map((b) => (
                <option key={b} value={b}>
                  {b}
                  {b === defaultBranch ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/50">
            Visibility
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsPrivate(false)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                !isPrivate
                  ? "border-primary-400 bg-primary-50 text-primary-700"
                  : "border-line bg-cloud text-ink/50"
              }`}
            >
              <FontAwesomeIcon icon={faGlobe} className="h-3.5 w-3.5" />
              Public
            </button>
            <button
              type="button"
              onClick={() => setIsPrivate(true)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                isPrivate
                  ? "border-primary-400 bg-primary-50 text-primary-700"
                  : "border-line bg-cloud text-ink/50"
              }`}
            >
              <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5" />
              Private
            </button>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-ink/50">
            <input
              type="checkbox"
              checked={createIfMissing}
              onChange={(e) => setCreateIfMissing(e.target.checked)}
              className="h-4 w-4 rounded border-line text-primary-500 focus:ring-primary-200"
            />
            Buat repo otomatis jika belum ada
          </label>
        </div>
      </div>

      <div
        data-aos="fade-up"
        data-aos-delay="120"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all ${
          dragging
            ? "border-primary-400 bg-primary-50 scale-[1.01]"
            : "border-line bg-white"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFileList(e.target.files)}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFileList(e.target.files)}
          {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
        />

        <div
          className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-glow transition-transform ${
            dragging ? "scale-110" : "animate-float-slow"
          }`}
        >
          <FontAwesomeIcon icon={faCloudArrowUp} className="h-6 w-6" />
        </div>
        <p className="font-display text-sm font-bold text-ink">
          Tarik file atau folder ke sini
        </p>
        <p className="mt-1 text-xs text-ink/45">
          Mendukung semua tipe file, folder (struktur dipertahankan), dan
          .zip (otomatis diekstrak)
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-ink/70 shadow-card transition-colors hover:border-primary-300 hover:text-primary-600"
          >
            <FontAwesomeIcon icon={faFile} className="h-3.5 w-3.5" />
            Pilih file
          </button>
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-ink/70 shadow-card transition-colors hover:border-primary-300 hover:text-primary-600"
          >
            <FontAwesomeIcon icon={faFolderPlus} className="h-3.5 w-3.5" />
            Pilih folder
          </button>
        </div>
      </div>

      {files.length > 0 && (
        <div
          data-aos="fade-up"
          className="flex items-start gap-2.5 rounded-xl border border-line bg-cloud px-4 py-3"
        >
          <FontAwesomeIcon
            icon={hasFolderFiles ? faFolderOpen : faPenToSquare}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500"
          />
          <p className="text-xs leading-relaxed text-ink/55">
            {hasFolderFiles
              ? "Struktur folder yang kamu pilih akan dipertahankan apa adanya di repo."
              : "File lepas akan diupload langsung ke root repo, tanpa folder pembungkus."}
          </p>
        </div>
      )}

      {files.length > 0 && (
        <div
          data-aos="fade-up"
          className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-line bg-white p-4 shadow-card"
        >
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-cloud px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FontAwesomeIcon
                  icon={fileIcon(f.file.name)}
                  className="h-4 w-4 shrink-0 text-primary-500"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {f.relativePath}
                  </p>
                  <p className="text-xs text-ink/40">
                    {formatBytes(f.file.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {f.file.name.toLowerCase().endsWith(".zip") && (
                  <button
                    onClick={() => handlePreviewZip(f.file)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/30 transition-colors hover:bg-primary-50 hover:text-primary-600"
                    title="Preview isi zip"
                  >
                    <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => removeFile(f.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/30 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <FontAwesomeIcon icon={faTriangleExclamation} className="h-3.5 w-3.5" />
          {errorMsg}
        </div>
      )}

      {status === "loading" && progress && (
        <div
          data-aos="fade-up"
          className="rounded-2xl border border-line bg-white p-4 shadow-card"
        >
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-ink/60">
            <span>
              Mengupload {progress.index} dari {progress.total} file
            </span>
            <span className="text-primary-600">
              {progress.total > 0
                ? Math.round((progress.index / progress.total) * 100)
                : 0}
              %
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-mist">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-300 ease-out"
              style={{
                width: `${
                  progress.total > 0
                    ? (progress.index / progress.total) * 100
                    : 0
                }%`
              }}
            />
          </div>
          {currentFileLabel && (
            <p className="mt-2 truncate font-mono text-[11px] text-ink/40">
              {currentFileLabel}
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!repo.trim() || files.length === 0 || status === "loading"}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 py-4 text-sm font-bold text-white shadow-glow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {status === "loading" ? (
          <>
            <FontAwesomeIcon icon={faCircleNotch} className="h-4 w-4 animate-spin" />
            {progress ? `${progress.index}/${progress.total}` : "Memulai..."}
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faCloudArrowUp} className="h-4 w-4" />
            Upload
          </>
        )}
      </button>

      {status === "done" && results.length > 0 && (
        <div
          data-aos="fade-up"
          className="space-y-2 rounded-2xl border border-line bg-white p-4 shadow-card"
        >
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-600">
            <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4" />
            Selesai — {results.length} file diproses
          </p>
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-cloud px-4 py-2.5"
            >
              <span className="truncate text-sm text-ink/70">{r.finalPath}</span>
              <span
                className={`ml-2 flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  r.status === "uploaded"
                    ? "bg-primary-50 text-primary-600"
                    : r.status === "renamed"
                    ? "bg-amber-50 text-amber-600"
                    : "bg-ink/5 text-ink/40"
                }`}
              >
                {r.status === "skipped-duplicate" && (
                  <FontAwesomeIcon icon={faClone} className="h-2.5 w-2.5" />
                )}
                {r.status === "uploaded" && "uploaded"}
                {r.status === "renamed" && "renamed"}
                {r.status === "skipped-duplicate" && "identik · skip"}
              </span>
            </div>
          ))}
        </div>
      )}

      {(zipPreview || zipPreviewLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6 backdrop-blur-sm">
          <div
            data-aos="zoom-in"
            data-aos-duration="300"
            className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white p-6 shadow-soft"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-ink">
                Preview isi zip
              </h3>
              <button
                onClick={() => setZipPreview(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink/30 transition-colors hover:bg-cloud hover:text-ink"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            </div>

            {zipPreviewLoading && (
              <div className="flex flex-1 items-center justify-center py-16 text-ink/30">
                <FontAwesomeIcon icon={faCircleNotch} className="h-6 w-6 animate-spin" />
              </div>
            )}

            {zipPreview && !zipPreviewLoading && (
              <>
                {zipPreview.strippedFolder && (
                  <div className="mb-3 flex items-start gap-2 rounded-xl border border-line bg-cloud px-3 py-2.5">
                    <FontAwesomeIcon
                      icon={faFolderOpen}
                      className="mt-0.5 h-3 w-3 shrink-0 text-primary-500"
                    />
                    <p className="text-xs leading-relaxed text-ink/55">
                      Folder pembungkus{" "}
                      <span className="font-mono font-bold text-ink">
                        {zipPreview.strippedFolder}/
                      </span>{" "}
                      akan dibuang saat extract.
                    </p>
                  </div>
                )}
                <p className="mb-2 text-xs font-semibold text-ink/50">
                  {zipPreview.entries.length} file akan diupload sebagai:
                </p>
                <div className="flex-1 space-y-1 overflow-y-auto rounded-xl border border-line bg-cloud p-3">
                  {zipPreview.entries.map((entry) => (
                    <div
                      key={entry.path}
                      className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2"
                    >
                      <span className="truncate font-mono text-xs text-ink/70">
                        {entry.path}
                      </span>
                      <span className="shrink-0 text-[10px] text-ink/35">
                        {formatBytes(entry.sizeBytes)}
                      </span>
                    </div>
                  ))}
                  {zipPreview.entries.length === 0 && (
                    <p className="py-6 text-center text-xs text-ink/40">
                      Zip kosong atau tidak bisa dibaca.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
