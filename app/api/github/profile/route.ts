import { NextResponse } from "next/server";
import { requireToken, AuthError } from "@/lib/requireAuth";
import { getOctokit } from "@/lib/github";

export async function GET() {
  try {
    const { token } = await requireToken();
    const octokit = getOctokit(token);

    const { data: user } = await octokit.users.getAuthenticated();
    const { data: emails } = await octokit.users
      .listEmailsForAuthenticatedUser()
      .catch(() => ({ data: [] as any[] }));

    return NextResponse.json({
      ok: true,
      profile: {
        login: user.login,
        name: user.name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        company: user.company,
        location: user.location,
        blog: user.blog,
        twitterUsername: user.twitter_username,
        publicRepos: user.public_repos,
        privateRepos: (user as any).total_private_repos ?? null,
        followers: user.followers,
        following: user.following,
        createdAt: user.created_at,
        htmlUrl: user.html_url,
        plan: (user as any).plan?.name ?? null,
        emails: emails.map((e: any) => e.email)
      }
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "Gagal mengambil profil GitHub." },
      { status: 500 }
    );
  }
}
