import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "./session";

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

export class AuthError extends Error {}

export async function requireToken(): Promise<{
  token: string;
  login: string;
}> {
  const session = await getSession();
  if (!session.ghToken || !session.ghLogin) {
    throw new AuthError("Sesi tidak ditemukan. Silakan masuk kembali.");
  }
  return { token: session.ghToken, login: session.ghLogin };
}
