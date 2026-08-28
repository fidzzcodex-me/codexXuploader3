import { Octokit } from "@octokit/rest";

export function getOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

export async function verifyToken(token: string) {
  const octokit = getOctokit(token);
  const { data } = await octokit.users.getAuthenticated();
  return data;
}

export function sha256Hex(buffer: Buffer): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function gitBlobSha1(buffer: Buffer): string {
  const crypto = require("crypto");
  const header = Buffer.from(`blob ${buffer.length}\0`);
  const store = Buffer.concat([header, buffer]);
  return crypto.createHash("sha1").update(store).digest("hex");
}
