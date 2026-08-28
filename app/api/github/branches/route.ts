import { NextRequest, NextResponse } from "next/server";
import { requireToken, AuthError } from "@/lib/requireAuth";
import { getOctokit } from "@/lib/github";

export async function GET(req: NextRequest) {
  try {
    const { token, login } = await requireToken();
    const octokit = getOctokit(token);
    const repo = req.nextUrl.searchParams.get("repo");

    if (!repo) {
      return NextResponse.json(
        { ok: false, error: "Nama repo diperlukan." },
        { status: 400 }
      );
    }

    const [{ data: repoInfo }, { data: branches }] = await Promise.all([
      octokit.repos.get({ owner: login, repo }),
      octokit.repos.listBranches({ owner: login, repo, per_page: 100 })
    ]);

    return NextResponse.json({
      ok: true,
      defaultBranch: repoInfo.default_branch,
      branches: branches.map((b) => b.name)
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    if (err?.status === 404) {
      return NextResponse.json(
        { ok: false, error: "Repo tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Gagal mengambil daftar branch." },
      { status: 500 }
    );
  }
}
