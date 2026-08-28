import { Octokit } from "@octokit/rest";

export interface ReadIntent {
  type: "read_file" | "list_folder" | "code_search" | "none";
  repo?: string;
  path?: string;
  query?: string;
}

export function detectReadIntent(userMessage: string): ReadIntent {
  const text = userMessage.toLowerCase();

  const readFileMatch =
    text.match(/(?:baca|lihat|buka|tampilkan)\s+(?:isi\s+)?file\s+([a-z0-9._\-/]+)\s+(?:di|dari)\s+repo\s+([a-z0-9._-]+)/i) ||
    text.match(/(?:apa\s+isi|isi\s+dari)\s+file\s+([a-z0-9._\-/]+)\s+(?:di|dari)\s+repo\s+([a-z0-9._-]+)/i);
  if (readFileMatch) {
    return { type: "read_file", path: readFileMatch[1], repo: readFileMatch[2] };
  }

  const codeSearchMatch =
    text.match(/cari\s+(?:kata\s+|kode\s+)?["']?([a-z0-9._\- ]+?)["']?\s+di\s+(?:semua\s+repo|repo\s+([a-z0-9._-]+))/i) ||
    text.match(/search\s+["']?([a-z0-9._\- ]+?)["']?\s+in\s+(?:all\s+repos|repo\s+([a-z0-9._-]+))/i);
  if (codeSearchMatch) {
    return {
      type: "code_search",
      query: codeSearchMatch[1].trim(),
      repo: codeSearchMatch[2] || undefined
    };
  }

  const listFolderMatch =
    text.match(/(?:lihat|tampilkan|apa)\s+(?:isi\s+|struktur\s+)?(?:folder|file)\s+(?:apa\s+saja\s+)?(?:di|dari)\s+repo\s+([a-z0-9._-]+)/i) ||
    text.match(/struktur\s+repo\s+([a-z0-9._-]+)/i) ||
    text.match(/isi\s+repo\s+([a-z0-9._-]+)/i);
  if (listFolderMatch) {
    return { type: "list_folder", repo: listFolderMatch[1] };
  }

  return { type: "none" };
}

const MAX_FILE_CHARS = 6000;
const TEXT_FILE_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "json", "md", "txt", "css", "scss", "html",
  "py", "go", "rs", "java", "c", "cpp", "h", "yml", "yaml", "toml", "env",
  "sh", "gitignore", "xml", "svg", "sql", "rb", "php", "swift", "kt"
]);

export async function fetchFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if (Array.isArray(data) || data.type !== "file") {
      return `Path "${path}" bukan file (kemungkinan folder).`;
    }

    const ext = path.split(".").pop()?.toLowerCase() || "";
    if (!TEXT_FILE_EXTENSIONS.has(ext)) {
      return `File "${path}" bukan file teks yang bisa dibaca (kemungkinan binary/gambar).`;
    }

    if (data.size > 200_000) {
      return `File "${path}" terlalu besar untuk dibaca langsung (${Math.round(data.size / 1024)}KB).`;
    }

    const content = Buffer.from(data.content, "base64").toString("utf-8");
    const truncated = content.length > MAX_FILE_CHARS;
    const shown = truncated ? content.slice(0, MAX_FILE_CHARS) : content;

    return [
      `Isi file "${path}" di repo "${repo}"${truncated ? " (dipotong, hanya sebagian awal)" : ""}:`,
      "```",
      shown,
      "```"
    ].join("\n");
  } catch (err: any) {
    if (err.status === 404) {
      return `File "${path}" tidak ditemukan di repo "${repo}".`;
    }
    return `Gagal membaca file "${path}": ${err.message || "error tidak diketahui"}.`;
  }
}

export async function fetchFolderListing(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string = ""
): Promise<string> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if (!Array.isArray(data)) {
      return `Path tersebut adalah file, bukan folder.`;
    }

    const entries = data
      .slice(0, 60)
      .map((item) => `- ${item.type === "dir" ? "[folder] " : ""}${item.path}`)
      .join("\n");

    return [
      `Struktur repo "${repo}"${path ? ` di folder "${path}"` : " (root)"}:`,
      entries || "(kosong)"
    ].join("\n");
  } catch (err: any) {
    if (err.status === 404) {
      return `Repo "${repo}" atau path tersebut tidak ditemukan.`;
    }
    return `Gagal membaca struktur repo "${repo}": ${err.message || "error tidak diketahui"}.`;
  }
}

export async function fetchCodeSearchResults(
  octokit: Octokit,
  owner: string,
  query: string,
  repo?: string
): Promise<string> {
  try {
    const scope = repo ? `repo:${owner}/${repo}` : `user:${owner}`;
    const { data } = await octokit.search.code({
      q: `${query} ${scope}`,
      per_page: 15
    });

    if (data.total_count === 0) {
      return `Tidak ada hasil untuk pencarian "${query}"${repo ? ` di repo "${repo}"` : ""}.`;
    }

    const entries = data.items
      .map((item) => `- ${item.repository.name}/${item.path}`)
      .join("\n");

    return [
      `Hasil pencarian "${query}"${repo ? ` di repo "${repo}"` : " di semua repo"} (${data.total_count} total, menampilkan ${data.items.length}):`,
      entries
    ].join("\n");
  } catch (err: any) {
    return `Gagal melakukan pencarian "${query}": ${err.message || "error tidak diketahui"}.`;
  }
}
