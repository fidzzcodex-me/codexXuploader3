export interface UploadHistoryItem {
  id: string;
  repo: string;
  owner: string;
  fileName: string;
  finalPath: string;
  sizeBytes: number;
  status: "uploaded" | "skipped-duplicate" | "replaced";
  createdAt: string;
}

const STORAGE_KEY = "harbor_upload_history";
const MAX_RECORDS = 500;

export function loadUploadHistory(): UploadHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendUploadHistory(items: UploadHistoryItem[]): UploadHistoryItem[] {
  if (typeof window === "undefined") return [];
  const existing = loadUploadHistory();
  const merged = [...items, ...existing].slice(0, MAX_RECORDS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
  }
  return merged;
}

export function clearUploadHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}
