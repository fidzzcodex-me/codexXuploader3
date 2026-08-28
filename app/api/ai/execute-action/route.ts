import { NextRequest, NextResponse } from "next/server";
import { requireToken, AuthError } from "@/lib/requireAuth";
import { getOctokit } from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const { token, login } = await requireToken();
    const octokit = getOctokit(token);
    const action = await req.json();

    if (action.type === "delete_repo") {
      await octokit.repos.delete({ owner: login, repo: action.repo });
      return NextResponse.json({
        ok: true,
        message: `Repo "${action.repo}" berhasil dihapus.`
      });
    }

    if (action.type === "create_repo") {
      const { data } = await octokit.repos.createForAuthenticatedUser({
        name: action.repo,
        private: action.visibility === "private",
        auto_init: true
      });
      return NextResponse.json({
        ok: true,
        message: `Repo "${data.full_name}" berhasil dibuat.`
      });
    }

    if (action.type === "delete_file") {
      const { data: fileData } = await octokit.repos.getContent({
        owner: login,
        repo: action.repo,
        path: action.path
      });
      if (Array.isArray(fileData) || fileData.type !== "file") {
        return NextResponse.json(
          { ok: false, error: "Path tersebut bukan file." },
          { status: 400 }
        );
      }
      await octokit.repos.deleteFile({
        owner: login,
        repo: action.repo,
        path: action.path,
        message: `Delete ${action.path} via AI agent`,
        sha: fileData.sha
      });
      return NextResponse.json({
        ok: true,
        message: `File "${action.path}" berhasil dihapus dari "${action.repo}".`
      });
    }

    if (action.type === "change_visibility") {
      await octokit.repos.update({
        owner: login,
        repo: action.repo,
        private: action.visibility === "private"
      });
      return NextResponse.json({
        ok: true,
        message: `Repo "${action.repo}" sekarang ${
          action.visibility === "private" ? "private" : "public"
        }.`
      });
    }

    if (action.type === "rename_repo") {
      const { data } = await octokit.repos.update({
        owner: login,
        repo: action.repo,
        name: action.newName
      });
      return NextResponse.json({
        ok: true,
        message: `Repo "${action.repo}" berhasil diganti nama jadi "${data.name}".`
      });
    }

    return NextResponse.json(
      { ok: false, error: "Jenis aksi tidak dikenali." },
      { status: 400 }
    );
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: err?.message || "Gagal menjalankan aksi." },
      { status: 500 }
    );
  }
}
