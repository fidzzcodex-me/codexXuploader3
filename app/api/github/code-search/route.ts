import { NextRequest, NextResponse } from "next/server";
import { requireToken, AuthError } from "@/lib/requireAuth";
import { getOctokit } from "@/lib/github";

export async function GET(req: NextRequest) {
  try {
    const { token, login } = await requireToken();
    const octokit = getOctokit(token);
    const query = req.nextUrl.searchParams.get("q");
    const repo = req.nextUrl.searchParams.get("repo");

    if (!query || !query.trim()) {
      return NextResponse.json(
        { ok: false, error: "Kata kunci pencarian diperlukan." },
        { status: 400 }
      );
    }

    const scope = repo ? `repo:${login}/${repo}` : `user:${login}`;
    const { data } = await octokit.search.code({
      q: `${query} ${scope}`,
      per_page: 20
    });

    return NextResponse.json({
      ok: true,
      totalCount: data.total_count,
      results: data.items.map((item) => ({
        repo: item.repository.name,
        path: item.path,
        htmlUrl: item.html_url
      }))
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    if (err?.status === 422) {
      return NextResponse.json(
        { ok: false, error: "Query pencarian tidak valid." },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Gagal melakukan pencarian." },
      { status: 500 }
    );
  }
}
