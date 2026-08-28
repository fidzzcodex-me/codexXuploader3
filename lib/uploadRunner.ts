export interface ActiveUploadState {
  status: "idle" | "loading" | "done" | "error";
  progress: { index: number; total: number } | null;
  currentFileLabel: string;
  results: any[];
  errorMsg: string;
  repoName: string;
}

type Listener = (state: ActiveUploadState) => void;

let state: ActiveUploadState = {
  status: "idle",
  progress: null,
  currentFileLabel: "",
  results: [],
  errorMsg: "",
  repoName: ""
};

let lastUploadParams: RunUploadParams | null = null;

const listeners = new Set<Listener>();

export function getUploadState(): ActiveUploadState {
  return state;
}

export function subscribeUploadState(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function setUploadState(partial: Partial<ActiveUploadState>): void {
  state = { ...state, ...partial };
  listeners.forEach((l) => l(state));
}

export function resetUploadState(): void {
  setUploadState({
    status: "idle",
    progress: null,
    currentFileLabel: "",
    results: [],
    errorMsg: "",
    repoName: ""
  });
}

export function isUploadInFlight(): boolean {
  return state.status === "loading";
}

interface RunUploadParams {
  repo: string;
  isPrivate: boolean;
  createIfMissing: boolean;
  basePath: string;
  branch: string;
  files: { file: File; relativePath: string }[];
}

export async function runUploadInBackground(
  params: RunUploadParams,
  onDone: (payload: { results: any[]; owner: string; repo: string }) => void,
  onError: (message: string) => void
): Promise<void> {
  lastUploadParams = params;
  setUploadState({
    status: "loading",
    progress: null,
    currentFileLabel: "",
    results: [],
    errorMsg: "",
    repoName: params.repo
  });

  try {
    const formData = new FormData();
    formData.set("repo", params.repo);
    formData.set("isPrivate", String(params.isPrivate));
    formData.set("createIfMissing", String(params.createIfMissing));
    formData.set("basePath", params.basePath);
    formData.set("branch", params.branch);
    params.files.forEach((f) => {
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
      setUploadState({ status: "error", errorMsg: msg });
      onError(msg);
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
          setUploadState({ progress: { index: 0, total: data.total } });
        } else if (event === "progress") {
          setUploadState({
            progress: { index: data.index, total: data.total },
            currentFileLabel: data.result?.finalPath || ""
          });
        } else if (event === "done") {
          setUploadState({ status: "done", results: data.results });
          finished = true;
          onDone({ results: data.results, owner: data.owner, repo: data.repo });
        } else if (event === "error") {
          setUploadState({ status: "error", errorMsg: data.error || "Upload gagal." });
          finished = true;
          onError(data.error || "Upload gagal.");
        }
      }
    }
  } catch {
    const msg = "Koneksi ke server terputus.";
    setUploadState({ status: "error", errorMsg: msg });
    onError(msg);
  }
}

export async function retryFailedFiles(
  failedFinalPaths: string[],
  onDone: (payload: { results: any[]; owner: string; repo: string }) => void,
  onError: (message: string) => void
): Promise<void> {
  if (!lastUploadParams) {
    onError("Tidak ada informasi upload sebelumnya untuk dicoba ulang.");
    return;
  }
  const failedSet = new Set(failedFinalPaths);
  const filesToRetry = lastUploadParams.files.filter((f) =>
    failedSet.has(f.relativePath)
  );
  if (filesToRetry.length === 0) {
    onError("File yang gagal tidak dapat ditemukan lagi untuk dicoba ulang.");
    return;
  }
  await runUploadInBackground(
    { ...lastUploadParams, files: filesToRetry },
    onDone,
    onError
  );
}
