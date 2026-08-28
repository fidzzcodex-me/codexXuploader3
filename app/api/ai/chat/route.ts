import { NextRequest, NextResponse } from "next/server";
import { requireToken, AuthError, getSession } from "@/lib/requireAuth";
import { detectProposedAction } from "@/lib/aiActions";
import { buildGithubContext } from "@/lib/aiContext";
import {
  detectReadIntent,
  fetchFileContent,
  fetchFolderListing,
  fetchCodeSearchResults
} from "@/lib/aiReadContext";
import { getOctokit } from "@/lib/github";

const AI_ENDPOINT = "https://www.my-website.my.id/api/ai/gemini";
const AI_API_KEY = "codex";

export async function POST(req: NextRequest) {
  try {
    const { token, login } = await requireToken();
    const session = await getSession();
    const { message, history } = await req.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { ok: false, error: "Pesan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const sessionId = session.aiSessionId;
    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "Sesi AI belum siap. Silakan masuk kembali." },
        { status: 401 }
      );
    }

    const octokit = getOctokit(token);
    const context = await buildGithubContext(octokit, login);

    const readIntent = detectReadIntent(message);
    let readContext = "";
    if (readIntent.type === "read_file" && readIntent.repo && readIntent.path) {
      readContext = await fetchFileContent(
        octokit,
        login,
        readIntent.repo,
        readIntent.path
      );
    } else if (readIntent.type === "list_folder" && readIntent.repo) {
      readContext = await fetchFolderListing(octokit, login, readIntent.repo);
    } else if (readIntent.type === "code_search" && readIntent.query) {
      readContext = await fetchCodeSearchResults(
        octokit,
        login,
        readIntent.query,
        readIntent.repo
      );
    }

    let historyContext = "";
    if (Array.isArray(history) && history.length > 0) {
      const lines = history
        .filter((h: any) => h && typeof h.text === "string")
        .map((h: any) => `${h.role === "user" ? "Pengguna" : "Kamu"}: ${h.text}`)
        .join("\n");
      if (lines) {
        historyContext = `\nRingkasan percakapan sebelumnya di sesi ini (untuk konteks, jangan diulang):\n${lines}\n`;
      }
    }

    const promptToSend = [
      context,
      historyContext,
      readContext ? `\nData tambahan yang diminta pengguna:\n${readContext}` : "",
      `\nPesan pengguna saat ini: ${message.trim()}`
    ].join("");

    const url = new URL(AI_ENDPOINT);
    url.searchParams.set("prompt", promptToSend);
    url.searchParams.set("session_id", sessionId);
    url.searchParams.set("apikey", AI_API_KEY);

    const res = await fetch(url.toString(), { method: "GET" });
    const data = await res.json();

    if (!data?.status) {
      return NextResponse.json(
        { ok: false, error: "AI tidak dapat merespons saat ini." },
        { status: 502 }
      );
    }

    const reply: string = data.result?.message || "...";
    const proposedAction = detectProposedAction(message);

    return NextResponse.json({
      ok: true,
      reply,
      proposedAction
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "Gagal menghubungi AI agent." },
      { status: 500 }
    );
  }
}
