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
import { appendUploadHistory } from "@/lib/uploadHistoryClient";
import {
  ActiveUploadState,
  getUploadState,
  subscribeUploadState,
  runUploadInBackground,
  retryFailedFiles
} from "@/lib/uploadRunner";
import {
  UploadFormState,
  getUploadFormState,
  subscribeUploadFormState,
  setUploadFormState,
  getPickedFiles,
  subscribePickedFiles,
  setPickedFiles,
  PickedFileRef
} from "@/lib/uploadFormState";

type PickedFile = PickedFileRef;

interface UploadResultItem {
  fileName: string;
  finalPath: string;
  status: "uploaded" | "skipped-duplicate" | "replaced" | "failed";
  sizeBytes: number;
  errorMessage?: string;
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
  const [formState, setFormStateLocal] = useState<UploadFormState>(
    getUploadFormState()
  );
  const { repo, isPrivate, createIfMissing, basePath, branch } = formState;
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [defaultBranch, setDefaultBranch] = useState("");
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [files, setFilesLocal] = useState<PickedFile[]>(() => getPickedFiles());
  const [dragging, setDragging] = useState(false);
  const [uploadState, setUploadStateLocal] = useState<ActiveUploadState>(
    getUploadState()
  );
  const [zipPreview, setZipPreview] = useState<ZipPreviewResult | null>(null);
  const [zipPreviewLoading, setZipPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const { status, progress, currentFileLabel, results, errorMsg } = uploadState;

  function setRepo(v: string) {
    setUploadFormState({ repo: v });
  }
  function setIsPrivate(v: boolean) {
    setUploadFormState({ isPrivate: v });
  }
  function setCreateIfMissing(v: boolean) {
    setUploadFormState({ createIfMissing: v });
  }
  function setBasePath(v: string) {
    setUploadFormState({ basePath: v });
  }
  function setBranch(v: string) {
    setUploadFormState({ branch: v });
  }
  function setFiles(updater: PickedFile[] | ((prev: PickedFile[]) => PickedFile[])) {
    const next =
      typeof updater === "function"
        ? (updater as (prev: PickedFile[]) => PickedFile[])(getPickedFiles())
        : updater;
    setPickedFiles(next);
  }

  useEffect(() => {
    return subscribeUploadFormState(setFormStateLocal);
  }, []);

  useEffect(() => {
    return subscribePickedFiles(setFilesLocal);
  }, []);

  useEffect(() => {
    return subscribeUploadState(setUploadStateLocal);
  }, []);

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

  const MAX_FILE_SIZE = 75 * 1024 * 1024;

  const addFileList = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const tooLarge: string[] = [];
      const picked: PickedFile[] = [];

      Array.from(fileList).forEach((f) => {
        if (f.size > MAX_FILE_SIZE) {
          tooLarge.push(f.name);
          return;
        }
        const relPath = (f as any).webkitRelativePath || f.name;
        picked.push({
          file: f,
          id: `${relPath}-${f.size}-${Math.random().toString(36).slice(2, 8)}`,
          relativePath: relPath
        });
      });

      if (tooLarge.length > 0) {
        showToast(
          `${tooLarge.length} file dilewati karena lebih dari 75MB: ${tooLarge.slice(0, 3).join(", ")}${tooLarge.length > 3 ? ", ..." : ""}`,
          "error"
        );
      }

      setFiles((prev) => [...prev, ...picked]);
    },
    [showToast]
  );

  const addEntries = useCallback(
    (entries: { file: File; relativePath: string }[]) => {
      const tooLarge: string[] = [];
      const picked: PickedFile[] = [];

      entries.forEach((e) => {
        if (e.file.size > MAX_FILE_SIZE) {
          tooLarge.push(e.relativePath);
          return;
        }
        picked.push({
          file: e.file,
          id: `${e.relativePath}-${e.file.size}-${Math.random().toString(36).slice(2, 8)}`,
          relativePath: e.relativePath
        });
      });

      if (tooLarge.length > 0) {
        showToast(
          `${tooLarge.length} file dilewati karena lebih dari 75MB: ${tooLarge.slice(0, 3).join(", ")}${tooLarge.length > 3 ? ", ..." : ""}`,
          "error"
        );
      }

      setFiles((prev) => [...prev, ...picked]);
    },
    [showToast]
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
    const repoNameForToast = repo.trim();
    const filesSnapshot = files;
    setFiles([]);

    await runUploadInBackground(
      {
        repo: repoNameForToast,
        isPrivate,
        createIfMissing,
        basePath: basePath.trim(),
        branch,
        files: filesSnapshot.map((f) => ({
          file: f.file,
          relativePath: f.relativePath
        }))
      },
      (payload) => {
        const succeeded = payload.results.filter(
          (r: UploadResultItem) => r.status !== "skipped-duplicate" && r.status !== "failed"
        ).length;
        const failed = payload.results.filter(
          (r: UploadResultItem) => r.status === "failed"
        ).length;
        const now = new Date().toISOString();
        appendUploadHistory(
          payload.results
            .filter((r: UploadResultItem) => r.status !== "failed")
            .map((r: UploadResultItem) => ({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              repo: payload.repo,
              owner: payload.owner,
              fileName: r.fileName,
              finalPath: r.finalPath,
              sizeBytes: r.sizeBytes,
              status: r.status as "uploaded" | "skipped-duplicate" | "replaced",
              createdAt: now
            }))
        );
        if (failed > 0) {
          showToast(
            `${succeeded} file berhasil diupload, ${failed} gagal. Coba upload ulang file yang gagal.`,
            "error"
          );
        } else {
          showToast(
            `${succeeded} file berhasil diupload ke ${repoNameForToast}`,
            "success"
          );
        }
      },
      (message) => {
        showToast(message, "error");
      }
    );
  }

  const hasFolderFiles = files.some((f) => f.relativePath.includes("/"));

  async function handleRetryFailed() {
    const failedPaths = results
      .filter((r) => r.status === "failed")
      .map((r) => r.finalPath);
    if (failedPaths.length === 0) return;

    await retryFailedFiles(
      failedPaths,
      (payload) => {
        const succeeded = payload.results.filter(
          (r: UploadResultItem) => r.status !== "skipped-duplicate" && r.status !== "failed"
        ).length;
        const failed = payload.results.filter(
          (r: UploadResultItem) => r.status === "failed"
        ).length;
        const now = new Date().toISOString();
        appendUploadHistory(
          payload.results
            .filter((r: UploadResultItem) => r.status !== "failed")
            .map((r: UploadResultItem) => ({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              repo: payload.repo,
              owner: payload.owner,
              fileName: r.fileName,
              finalPath: r.finalPath,
              sizeBytes: r.sizeBytes,
              status: r.status as "uploaded" | "skipped-duplicate" | "replaced",
              createdAt: now
            }))
        );
        if (failed > 0) {
          showToast(`${succeeded} berhasil, ${failed} masih gagal.`, "error");
        } else {
          showToast(`${succeeded} file berhasil diupload ulang.`, "success");
        }
      },
      (message) => showToast(message, "error")
    );
  }

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
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-600">
              <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4" />
              Selesai — {results.length} file diproses
            </p>
            {results.some((r) => r.status === "failed") && (
              <button
                onClick={handleRetryFailed}
                className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100"
              >
                <FontAwesomeIcon icon={faCircleNotch} className="h-3 w-3" />
                Coba lagi yang gagal
              </button>
            )}
          </div>
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-cloud px-4 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-ink/70">
                {r.finalPath}
                {r.status === "failed" && r.errorMessage && (
                  <span className="block truncate text-xs text-red-500">
                    {r.errorMessage}
                  </span>
                )}
              </span>
              <span
                className={`ml-2 flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  r.status === "uploaded"
                    ? "bg-primary-50 text-primary-600"
                    : r.status === "replaced"
                    ? "bg-amber-50 text-amber-600"
                    : r.status === "failed"
                    ? "bg-red-50 text-red-600"
                    : "bg-ink/5 text-ink/40"
                }`}
              >
                {r.status === "skipped-duplicate" && (
                  <FontAwesomeIcon icon={faClone} className="h-2.5 w-2.5" />
                )}
                {r.status === "failed" && (
                  <FontAwesomeIcon icon={faTriangleExclamation} className="h-2.5 w-2.5" />
                )}
                {r.status === "uploaded" && "uploaded"}
                {r.status === "replaced" && "replaced"}
                {r.status === "skipped-duplicate" && "identik · skip"}
                {r.status === "failed" && "gagal"}
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
