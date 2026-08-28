# Harbor — GitHub Upload & Management

Dashboard untuk mengelola repository GitHub: upload file/.zip, kelola repo,
riwayat upload, chat dengan AI agent, dan lihat profil — semua lewat token
GitHub pribadi, tanpa buka terminal.

## Struktur Halaman

1. **Landing (`/`)** — penjelasan produk & sistem, tombol "Go".
2. **Setup (`/setup`)** — input Personal Access Token GitHub.
3. **Dashboard (`/dashboard/*`)** — 5 halaman dengan bottom navbar:
   - `upload` — upload file/.zip ke repo (dedup otomatis, tanpa overwrite).
   - `repos` — daftar repo + hapus repo (dengan konfirmasi).
   - `history` — riwayat upload sesi ini.
   - `chat` — AI agent chat, bisa mengusulkan aksi GitHub (butuh konfirmasi
     tombol sebelum benar-benar dijalankan).
   - `profile` — data akun dari token GitHub.

## Setup Lokal

```bash
npm install
cp .env.example .env.local
# isi SESSION_SECRET dengan string acak (openssl rand -base64 32)
npm run dev
```

Buka `http://localhost:3000`.

## Environment Variables

| Variable         | Wajib | Keterangan                                             |
|-------------------|-------|---------------------------------------------------------|
| `SESSION_SECRET`  | Ya    | String acak ≥32 karakter untuk enkripsi session cookie. |

Token GitHub pengguna **tidak** disimpan sebagai environment variable —
token dimasukkan oleh masing-masing pengguna lewat halaman `/setup` dan
disimpan di cookie session terenkripsi (httpOnly, `iron-session`), bukan di
database.

## Deploy ke Vercel

1. Push project ini ke repository GitHub kamu.
2. Buka [vercel.com/new](https://vercel.com/new), import repo tersebut.
3. Framework preset: **Next.js** (otomatis terdeteksi).
4. Tambahkan environment variable `SESSION_SECRET` di project settings
   Vercel (Settings → Environment Variables).
5. Deploy.

## Token GitHub yang Dibutuhkan

Buat Personal Access Token di GitHub (classic atau fine-grained) dengan
scope minimal:

- `repo` (full control) — untuk membaca/membuat/menghapus repo & file.
- `delete_repo` — khusus classic token, wajib untuk fitur hapus repo.
- `user` — untuk membaca data profil.

## Catatan Keamanan

- Token disimpan di cookie `httpOnly`, `secure` (production), `sameSite=lax`,
  dan otomatis kedaluwarsa (4 jam).
- Tidak pernah ditulis ke database atau log.
- Setiap aksi destruktif (hapus repo, aksi dari AI agent) meminta konfirmasi
  eksplisit dari pengguna sebelum dieksekusi ke backend.
- Endpoint AI agent hanya *mengusulkan* aksi; eksekusi nyata selalu lewat
  endpoint terpisah (`/api/ai/execute-action`) yang hanya dipanggil dari
  tombol konfirmasi di UI.

## Catatan Teknis

- Upload mendukung file tunggal, folder (drag-drop atau tombol "Pilih
  folder"), banyak file sekaligus, dan `.zip`. Zip otomatis diekstrak: kalau
  seluruh isinya terbungkus dalam satu folder root (mis. `my-project/index.js`,
  `my-project/style.css`), folder pembungkus itu dibuang saat extract
  (jadi langsung `index.js`, `style.css`). Kalau isinya sudah flat atau
  berisi beberapa folder/file di root, strukturnya dipertahankan apa adanya.
- File lepas (dipilih satu-satu, bukan dari folder) diupload langsung ke
  root repo tanpa folder pembungkus apa pun. File yang berasal dari folder
  (drag-drop atau tombol "Pilih folder") mempertahankan struktur aslinya.
- File dengan konten identik pada path yang sama **tidak pernah** ditimpa
  (dibandingkan lewat git blob SHA1) — otomatis di-skip, tidak ada commit
  percuma.
- File berbeda dengan nama sama di-**replace**: file lama dihapus dan
  digantikan file baru pada commit yang sama (bukan disimpan berdampingan
  sebagai `nama (1).ext`).
- Riwayat upload disimpan di **`localStorage` browser** (`lib/uploadHistoryClient.ts`),
  ditulis langsung oleh client setelah setiap upload sukses — bukan di server.
  Awalnya riwayat ini disimpan di memory server, tapi itu tidak andal di
  Vercel (serverless): request bisa dilayani instance berbeda-beda yang
  tidak saling berbagi memory, jadi riwayat sering "hilang" padahal upload
  berhasil. `localStorage` per-perangkat jauh lebih besar dari batas cookie
  (~4KB) dan tidak bergantung pada instance server mana yang melayani.
  Konsekuensinya: riwayat spesifik per browser/perangkat, bukan per akun
  GitHub — beda browser/HP tidak akan saling melihat riwayat yang sama.
  Ada tombol ekspor ke JSON dan bersihkan riwayat di halaman Riwayat.
- Form input di halaman Upload (nama repo, folder tujuan, branch, file yang
  sudah dipilih) dan progres upload yang sedang berjalan disimpan di
  module-level state (`lib/uploadFormState.ts`, `lib/uploadRunner.ts`) yang
  hidup di luar siklus komponen React — jadi tidak hilang saat pindah antar
  tab dashboard, dan upload tetap lanjut di background walau kamu pindah
  tab atau minimize app. Upload akan berhenti jika browser/tab benar-benar
  ditutup atau proses browser dimatikan — itu batasan platform web tanpa
  instalasi PWA, bukan sesuatu yang bisa diakali dari sisi kode.
- Chat AI agent dipertahankan di `sessionStorage` browser (bukan React state
  biasa) supaya tidak hilang saat pindah antar tab dashboard — otomatis
  hilang saat tab ditutup atau logout.
- Setiap pesan chat menyertakan snapshot data GitHub terbaru (jumlah repo,
  daftar repo, visibility) sebagai context ke AI, supaya jawabannya akurat
  terhadap keadaan akun saat ini, bukan cuma sekali di awal sesi.
- File yang gagal diupload (misal karena rate limit sesaat) ditandai
  `"failed"` tanpa menghentikan file lain dalam batch yang sama, dan bisa
  dicoba ulang lewat tombol "Coba lagi yang gagal" tanpa perlu upload ulang
  semuanya.
- File di atas 75MB ditolak sebelum diupload (validasi di frontend dan
  backend), karena GitHub Contents API punya batas praktis di sekitar itu
  untuk konten yang di-base64-encode.
