import JSZip from "jszip";

export interface ZipPreviewEntry {
  path: string;
  sizeBytes: number;
}

export interface ZipPreviewResult {
  fileName: string;
  entries: ZipPreviewEntry[];
  strippedFolder: string | null;
}

export async function previewZipContents(file: File): Promise<ZipPreviewResult> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

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

  const entries: ZipPreviewEntry[] = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    let relativeName = entry.name;
    if (stripPrefix && relativeName.startsWith(stripPrefix)) {
      relativeName = relativeName.slice(stripPrefix.length);
    }
    if (!relativeName) continue;
    const sizeBytes = (entry as any)._data?.uncompressedSize ?? 0;
    entries.push({ path: relativeName, sizeBytes });
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));

  return {
    fileName: file.name,
    entries,
    strippedFolder: stripPrefix ? stripPrefix.slice(0, -1) : null
  };
}
