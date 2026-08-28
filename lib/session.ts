import { SessionOptions } from "iron-session";

export interface SessionData {
  ghToken?: string;
  ghLogin?: string;
  aiSessionId?: string;
}

export interface UploadRecord {
  id: string;
  repo: string;
  owner: string;
  fileName: string;
  path: string;
  sizeBytes: number;
  sha: string;
  status: "uploaded" | "skipped-duplicate" | "replaced";
  finalPath: string;
  createdAt: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "ghm_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 4 // 4 hours
  }
};

declare module "iron-session" {
  interface IronSessionData extends SessionData {}
}
