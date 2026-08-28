import { NextRequest, NextResponse } from "next/server";
import { requireToken, AuthError } from "@/lib/requireAuth";
import { getOctokit } from "@/lib/github";
import { uploadFilesToRepo, FileToUpload } from "@/lib/uploadEngine";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { token, login } = await requireToken();
    const octokit = getOctokit(token);

    const formData = await req.formData();
    const repo = formData.get("repo") as string | null;
    const files = formData.getAll("files") as File[];

    if (!repo || !files.length) {
      return NextResponse.json(
        { ok: false, error: "Repo dan file wajib ada." },
        { status: 400 }
      );
    }

    try {
      await octokit.repos.get({ owner: login, repo });
    } catch (err: any) {
      if (err.status === 404) {
        return NextResponse.json(
          { ok: false, error: `Repo "${repo}" tidak ditemukan.` },
          { status: 404 }
        );
      }
      throw err;
    }

    const filesToUpload: FileToUpload[] = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      filesToUpload.push({ name: file.name, buffer: Buffer.from(arrayBuffer) });
    }

    const results = await uploadFilesToRepo(octokit, login, repo, filesToUpload);
    const uploaded = results.filter((r) => r.status !== "skipped-duplicate").length;

    return NextResponse.json({
      ok: true,
      message: `${uploaded} file berhasil diupload ke "${repo}".`,
      results,
      owner: login,
      repo
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: err?.message || "Gagal mengupload file." },
      { status: 500 }
    );
  }
}
