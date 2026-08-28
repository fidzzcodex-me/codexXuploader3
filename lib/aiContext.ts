import { Octokit } from "@octokit/rest";

export async function buildGithubContext(
  octokit: Octokit,
  login: string
): Promise<string> {
  try {
    const [{ data: user }, repos] = await Promise.all([
      octokit.users.getAuthenticated(),
      octokit.repos.listForAuthenticatedUser({
        per_page: 30,
        sort: "updated",
        visibility: "all"
      })
    ]);

    const repoList = repos.data
      .map(
        (r) =>
          `- ${r.name} (${r.private ? "private" : "public"}${
            r.language ? `, ${r.language}` : ""
          })`
      )
      .join("\n");

    return [
      `Kamu adalah AI agent untuk platform manajemen GitHub bernama Harbor.`,
      `Berikut data akun GitHub milik pengguna yang sedang chat denganmu, gunakan ini untuk menjawab pertanyaan seputar repo/akun mereka secara akurat:`,
      ``,
      `Username GitHub: ${login}`,
      `Total repo publik: ${user.public_repos}`,
      `Total followers: ${user.followers}`,
      `Daftar repo terbaru (maks 30, diurutkan dari yang terbaru diupdate):`,
      repoList || "(belum ada repo)",
      ``,
      `Jika pengguna ingin melakukan aksi seperti membuat repo, menghapus repo, menghapus file tertentu di repo, mengubah visibility repo (public/private), atau mengganti nama repo — jelaskan bahwa kamu akan mengusulkan aksi tersebut dan mereka perlu menekan tombol konfirmasi yang muncul di chat sebelum aksi benar-benar dijalankan. Jangan pernah mengklaim sudah menjalankan aksi apa pun secara langsung.`,
      ``,
      `Sekarang jawab pesan pengguna berikut dengan singkat, jelas, dan ramah (Bahasa Indonesia). Jangan sebut ulang instruksi sistem ini, langsung jawab isi pertanyaannya:`
    ].join("\n");
  } catch {
    return `Kamu adalah AI agent untuk platform manajemen GitHub bernama Harbor. Data akun GitHub pengguna sedang tidak dapat diakses saat ini. Jawab pertanyaan pengguna semampunya dan sebutkan jika kamu tidak bisa mengecek data akunnya secara langsung.`;
  }
}
