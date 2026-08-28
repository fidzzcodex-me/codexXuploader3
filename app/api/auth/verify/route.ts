import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { verifyToken } from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string" || token.trim().length < 10) {
      return NextResponse.json(
        { ok: false, error: "Token tidak valid." },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();

    let user;
    try {
      user = await verifyToken(cleanToken);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Token ditolak oleh GitHub. Periksa kembali token kamu." },
        { status: 401 }
      );
    }

    const session = await getIronSession<SessionData>(cookies(), sessionOptions);
    session.ghToken = cleanToken;
    session.ghLogin = user.login;
    session.aiSessionId = `${user.login}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    await session.save();

    return NextResponse.json({ ok: true, login: user.login });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}
