
export type ProposedAction =
  | { type: "delete_repo"; repo: string }
  | { type: "create_repo"; repo: string; visibility: "public" | "private" }
  | { type: "delete_file"; repo: string; path: string }
  | { type: "change_visibility"; repo: string; visibility: "public" | "private" }
  | { type: "rename_repo"; repo: string; newName: string }
  | { type: "none" };

export function detectProposedAction(userMessage: string): ProposedAction {
  const text = userMessage.toLowerCase();

  const renameMatch =
    text.match(/rename\s+repo\s+([a-z0-9._-]+)\s+(?:jadi|ke|to)\s+([a-z0-9._-]+)/i) ||
    text.match(/ganti\s+nama\s+repo\s+([a-z0-9._-]+)\s+(?:jadi|ke)\s+([a-z0-9._-]+)/i);
  if (renameMatch) {
    return { type: "rename_repo", repo: renameMatch[1], newName: renameMatch[2] };
  }

  const visibilityMatch =
    text.match(/(?:ubah|jadikan|set)\s+(?:visibility\s+)?repo\s+([a-z0-9._-]+)\s+(?:jadi\s+|ke\s+)?(private|public|privat)/i);
  if (visibilityMatch) {
    const visibility = /privat/.test(visibilityMatch[2]) || visibilityMatch[2] === "private"
      ? "private"
      : "public";
    return { type: "change_visibility", repo: visibilityMatch[1], visibility };
  }

  const deleteFileMatch = text.match(
    /hapus\s+file\s+([a-z0-9._\-/]+)\s+(?:di|dari)\s+repo\s+([a-z0-9._-]+)/i
  );
  if (deleteFileMatch) {
    return { type: "delete_file", path: deleteFileMatch[1], repo: deleteFileMatch[2] };
  }

  const deleteMatch = text.match(/hapus\s+repo\s+([a-z0-9._-]+)/i) ||
    text.match(/delete\s+repo\s+([a-z0-9._-]+)/i);
  if (deleteMatch) {
    return { type: "delete_repo", repo: deleteMatch[1] };
  }

  const createMatch = text.match(/buat(?:kan)?\s+repo\s+([a-z0-9._-]+)/i) ||
    text.match(/create\s+repo\s+([a-z0-9._-]+)/i);
  if (createMatch) {
    const visibility = /privat|private/.test(text) ? "private" : "public";
    return { type: "create_repo", repo: createMatch[1], visibility };
  }

  return { type: "none" };
}
