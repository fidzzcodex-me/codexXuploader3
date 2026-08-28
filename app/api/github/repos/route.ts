import { NextRequest, NextResponse } from "next/server";
import { requireToken, AuthError } from "@/lib/requireAuth";
import { getOctokit } from "@/lib/github";

const PER_PAGE = 30;

export async function GET(req: NextRequest) {
  try {
    const { token } = await requireToken();
    const octokit = getOctokit(token);

    const pageParam = req.nextUrl.searchParams.get("page");
    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);

    const { data, headers } = await octokit.repos.listForAuthenticatedUser({
      per_page: PER_PAGE,
      page,
      sort: "updated",
      visibility: "all"
    });

    const linkHeader = headers.link || "";
    const hasMore = linkHeader.includes('rel="next"');

    return NextResponse.json({
      ok: true,
      page,
      hasMore,
      repos: data.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        private: r.private,
        description: r.description,
        htmlUrl: r.html_url,
        defaultBranch: r.default_branch,
        updatedAt: r.updated_at,
        stargazersCount: r.stargazers_count,
        language: r.language,
        size: r.size
      }))
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "Gagal mengambil daftar repository." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await requireToken();
    const octokit = getOctokit(token);
    const { name, isPrivate, description } = await req.json();

    if (!name || typeof name !== "string" || !/^[a-zA-Z0-9._-]+$/.test(name)) {
      return NextResponse.json(
        { ok: false, error: "Nama repo tidak valid." },
        { status: 400 }
      );
    }

    const { data } = await octokit.repos.createForAuthenticatedUser({
      name,
      private: !!isPrivate,
      description: description || undefined,
      auto_init: true
    });

    return NextResponse.json({
      ok: true,
      repo: {
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        private: data.private,
        htmlUrl: data.html_url,
        defaultBranch: data.default_branch
      }
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    if (err?.status === 422) {
      return NextResponse.json(
        { ok: false, error: "Repo dengan nama itu sudah ada." },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Gagal membuat repository." },
      { status: 500 }
    );
  }
}
