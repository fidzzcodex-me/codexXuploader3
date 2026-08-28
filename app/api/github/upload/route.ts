import { NextRequest } from "next/server";
import { requireToken, AuthError, getSession } from "@/lib/requireAuth";
import { getOctokit } from "@/lib/github";
import {
  flattenFilesForUpload,
  uploadFlatFiles,
  FileToUpload
} from "@/lib/uploadEngine";
import { appendUploadHistory } from "@/lib/uploadHistoryStore";

export const runtime = "nodejs";
export const maxDuration = 60;

function sseLine(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  let auth: { token: string; login: string };
  try {
    auth = await requireToken();
  } catch (err) {
    if (err instanceof AuthError) {
      return new Response(
        JSON.stringify({ ok: false, error: err.message }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ ok: false, error: "Gagal memverifikasi sesi." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { token, login } = auth;
  const session = await getSession();

  const formData = await req.formData();
  const repo = formData.get("repo") as string | null;
  const isPrivate = formData.get("isPrivate") === "true";
  const createIfMissing = formData.get("createIfMissing") === "true";
  const basePath = (formData.get("basePath") as string | null) || "";
  const requestedBranch = (formData.get("branch") as string | null) || "";
  const files = formData.getAll("files") as File[];
  const relativePaths = formData.getAll("relativePaths") as string[];

  if (!repo || typeof repo !== "string" || !repo.trim()) {
    return new Response(
      JSON.stringify({ ok: false, error: "Nama repo diperlukan." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!files.length) {
    return new Response(
      JSON.stringify({ ok: false, error: "Tidak ada file yang diupload." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sseLine(event, data)));

      try {
        const octokit = getOctokit(token);

        let repoExists = true;
        let defaultBranch = "main";
        try {
          const { data: repoInfo } = await octokit.repos.get({ owner: login, repo });
          defaultBranch = repoInfo.default_branch;
        } catch (err: any) {
          if (err.status === 404) {
            repoExists = false;
          } else {
            throw err;
          }
        }

        if (!repoExists) {
          if (!createIfMissing) {
            send("error", { error: "Repo tidak ditemukan." });
            controller.close();
            return;
          }
          const { data: created } = await octokit.repos.createForAuthenticatedUser({
            name: repo,
            private: isPrivate,
            auto_init: true
          });
          defaultBranch = created.default_branch;
        }

        const branchToUse =
          requestedBranch && requestedBranch !== defaultBranch
            ? requestedBranch
            : undefined;

        const filesToUpload: FileToUpload[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const arrayBuffer = await file.arrayBuffer();
          const uploadName = relativePaths[i] || file.name;
          filesToUpload.push({
            name: uploadName,
            buffer: Buffer.from(arrayBuffer)
          });
        }

        const flat = await flattenFilesForUpload(filesToUpload, basePath);
        send("start", { total: flat.length });

        const results = await uploadFlatFiles(
          octokit,
          login,
          repo,
          flat,
          (index, total, result) => {
            send("progress", { index, total, result });
          },
          branchToUse
        );

        const now = new Date().toISOString();
        const records = results.map((r) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          repo,
          owner: login,
          fileName: r.fileName,
          path: r.finalPath,
          sizeBytes: r.sizeBytes,
          sha: r.sha,
          status: r.status,
          finalPath: r.finalPath,
          createdAt: now
        }));
        if (session.aiSessionId) {
          appendUploadHistory(session.aiSessionId, records);
        }

        send("done", { results });
      } catch (err: any) {
        send("error", { error: err?.message || "Gagal mengupload file." });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}
