import { UploadRecord } from "./session";

const MAX_RECORDS_PER_KEY = 300;
const store = new Map<string, UploadRecord[]>();

export function appendUploadHistory(
  key: string,
  records: UploadRecord[]
): void {
  const existing = store.get(key) || [];
  const merged = [...records, ...existing].slice(0, MAX_RECORDS_PER_KEY);
  store.set(key, merged);
}

export function getUploadHistory(key: string): UploadRecord[] {
  return store.get(key) || [];
}
