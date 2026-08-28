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
- Riwayat upload disimpan di **memory server terpisah dari cookie session**
  (`lib/uploadHistoryStore.ts`), dikunci per sesi AI. Ini sengaja dipisah
  dari cookie karena cookie browser dibatasi ~4KB — menaruh riwayat upload
  di sana menyebabkan cookie gagal tersimpan ("session terlalu besar") begitu
  ada cukup banyak file. Konsekuensinya: di Vercel (serverless), riwayat bisa
  reset saat terjadi cold start / pindah instance. Untuk riwayat yang benar-
  benar persisten lintas deploy, ganti store ini dengan database eksternal
  (mis. Vercel KV/Postgres).
- Chat AI agent dipertahankan di `sessionStorage` browser (bukan React state
  biasa) supaya tidak hilang saat pindah antar tab dashboard — otomatis
  hilang saat tab ditutup atau logout.
- Setiap pesan chat menyertakan snapshot data GitHub terbaru (jumlah repo,
  daftar repo, visibility) sebagai context ke AI, supaya jawabannya akurat
  terhadap keadaan akun saat ini, bukan cuma sekali di awal sesi.
