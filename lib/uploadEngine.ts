import { Octokit } from "@octokit/rest";
import JSZip from "jszip";
import { gitBlobSha1 } from "./github";

export interface FileToUpload {
  name: string;
  buffer: Buffer;
}

export interface UploadResultItem {
  fileName: string;
  finalPath: string;
  status: "uploaded" | "skipped-duplicate" | "renamed";
  sha: string;
  sizeBytes: number;
}

interface ExistingFileInfo {
  sha: string;
}

async function getExistingFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch?: string
): Promise<ExistingFileInfo | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ...(branch ? { ref: branch } : {})
    });
    if (!Array.isArray(data) && data.type === "file") {
      return { sha: data.sha };
    }
    return null;
  } catch (err: any) {
    if (err.status === 404) return null;
    throw err;
  }
}

function splitNameExt(fileName: string): { base: string; ext: string } {
  const idx = fileName.lastIndexOf(".");
  if (idx <= 0) return { base: fileName, ext: "" };
  return { base: fileName.slice(0, idx), ext: fileName.slice(idx) };
}

async function uploadOneFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  targetPath: string,
  buffer: Buffer,
  commitMessagePrefix: string,
  branch?: string
): Promise<UploadResultItem> {
  const localSha = gitBlobSha1(buffer);
  const { base, ext } = splitNameExt(targetPath);
  const dir = base.includes("/") ? base.slice(0, base.lastIndexOf("/") + 1) : "";
  const baseName = base.includes("/") ? base.slice(base.lastIndexOf("/") + 1) : base;

  let candidatePath = targetPath;
  let attempt = 0;
  let status: "uploaded" | "skipped-duplicate" | "renamed" = "uploaded";

  while (true) {
    const existing = await getExistingFile(octokit, owner, repo, candidatePath, branch);

    if (!existing) {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: candidatePath,
        message: `${commitMessagePrefix}: add ${candidatePath}`,
        content: buffer.toString("base64"),
        ...(branch ? { branch } : {})
      });
      return {
        fileName: targetPath,
        finalPath: candidatePath,
        status,
        sha: localSha,
        sizeBytes: buffer.length
      };
    }

    if (existing.sha === localSha) {
      return {
        fileName: targetPath,
        finalPath: candidatePath,
        status: "skipped-duplicate",
        sha: localSha,
        sizeBytes: buffer.length
      };
    }

    attempt += 1;
    status = "renamed";
    candidatePath = `${dir}${baseName} (${attempt})${ext}`;
  }
}

export interface FlatFileEntry {
  targetPath: string;
  buffer: Buffer;
  sourceLabel: string; // original file/zip-entry name, for progress display
}

export async function flattenFilesForUpload(
  files: FileToUpload[],
  basePath: string = ""
): Promise<FlatFileEntry[]> {
  const normalizedBase = basePath ? basePath.replace(/^\/+|\/+$/g, "") + "/" : "";
  const flat: FlatFileEntry[] = [];

  for (const file of files) {
    const zip = await tryParseZip(file.buffer);
    if (zip) {
      const zipDir = file.name.includes("/")
        ? file.name.slice(0, file.name.lastIndexOf("/") + 1)
        : "";
      const extracted = await extractZipEntries(zip);
      for (const entry of extracted) {
        flat.push({
          targetPath: `${normalizedBase}${zipDir}${entry.name}`,
          buffer: entry.buffer,
          sourceLabel: entry.name
        });
      }
    } else {
      flat.push({
        targetPath: `${normalizedBase}${file.name}`,
        buffer: file.buffer,
        sourceLabel: file.name
      });
    }
  }

  return flat;
}

export async function uploadFlatFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  flatFiles: FlatFileEntry[],
  onProgress?: (
    index: number,
    total: number,
    result: UploadResultItem
  ) => void | Promise<void>,
  branch?: string
): Promise<UploadResultItem[]> {
  const results: UploadResultItem[] = [];
  for (let i = 0; i < flatFiles.length; i++) {
    const entry = flatFiles[i];
    const result = await uploadOneFile(
      octokit,
      owner,
      repo,
      entry.targetPath,
      entry.buffer,
      "Upload",
      branch
    );
    results.push(result);
    if (onProgress) await onProgress(i + 1, flatFiles.length, result);
  }
  return results;
}

export async function uploadFilesToRepo(
  octokit: Octokit,
  owner: string,
  repo: string,
  files: FileToUpload[],
  basePath: string = "",
  branch?: string
): Promise<UploadResultItem[]> {
  const flat = await flattenFilesForUpload(files, basePath);
  return uploadFlatFiles(octokit, owner, repo, flat, undefined, branch);
}

async function tryParseZip(buffer: Buffer): Promise<JSZip | null> {
  if (
    buffer.length < 4 ||
    buffer[0] !== 0x50 ||
    buffer[1] !== 0x4b ||
    !(buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  ) {
    return null;
  }
  try {
    return await JSZip.loadAsync(buffer);
  } catch {
    return null;
  }
}

async function extractZipEntries(zip: JSZip): Promise<FileToUpload[]> {
  const allPaths = Object.keys(zip.files);
  const topLevelNames = new Set(allPaths.map((p) => p.split("/")[0]));

  let stripPrefix = "";
  if (topLevelNames.size === 1) {
    const onlyTop = [...topLevelNames][0];
    const asDirEntry = zip.files[`${onlyTop}/`];
    if (asDirEntry && asDirEntry.dir) {
      stripPrefix = `${onlyTop}/`;
    }
  }

  const files: FileToUpload[] = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    let relativeName = entry.name;
    if (stripPrefix && relativeName.startsWith(stripPrefix)) {
      relativeName = relativeName.slice(stripPrefix.length);
    }
    if (!relativeName) continue;
    const content = await entry.async("nodebuffer");
    files.push({ name: relativeName, buffer: content });
  }
  return files;
}
