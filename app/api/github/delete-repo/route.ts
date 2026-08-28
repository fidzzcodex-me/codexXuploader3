import { NextRequest, NextResponse } from "next/server";
import { requireToken, AuthError } from "@/lib/requireAuth";
import { getOctokit } from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const { token, login } = await requireToken();
    const octokit = getOctokit(token);
    const { repo } = await req.json();

    if (!repo || typeof repo !== "string") {
      return NextResponse.json(
        { ok: false, error: "Nama repo diperlukan." },
        { status: 400 }
      );
    }

    await octokit.repos.delete({ owner: login, repo });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    if (err?.status === 403) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Token tidak memiliki izin 'delete_repo'. Buat token baru dengan scope tersebut."
        },
        { status: 403 }
      );
    }
    if (err?.status === 404) {
      return NextResponse.json(
        { ok: false, error: "Repo tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Gagal menghapus repository." },
      { status: 500 }
    );
  }
}
