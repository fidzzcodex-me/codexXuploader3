import { NextResponse } from "next/server";
import { getSession, requireToken, AuthError } from "@/lib/requireAuth";
import { getUploadHistory } from "@/lib/uploadHistoryStore";

export async function GET() {
  try {
    await requireToken();
    const session = await getSession();
    const history = session.aiSessionId
      ? getUploadHistory(session.aiSessionId)
      : [];
    return NextResponse.json({ ok: true, history });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "Gagal mengambil riwayat upload." },
      { status: 500 }
    );
  }
}
