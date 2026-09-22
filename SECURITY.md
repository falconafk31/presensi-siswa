# Security Policy

## Model keamanan (ringkas)

- **Auth**: Supabase Auth (JWT). Login username/password via email virtual internal; profil + role di `public.users`. Detail: [docs/authentication.md](docs/authentication.md).
- **Otorisasi data**: Row Level Security aktif di semua tabel; frontend hanya cerminan UX. Detail: [docs/database.md](docs/database.md#row-level-security).
- **Key publik**: anon key Supabase dibakar ke bundle frontend (wajar untuk arsitektur ini) — keamanannya berasal dari RLS, bukan dari kerahasiaan key.
- **Storage**: bucket `assets` publik untuk logo; policy tulis saat ini terbuka untuk anon ("OPSI A" di `03_storage.sql`) — risiko yang diterima sementara, direncanakan pengetatan (lihat [ROADMAP.md](ROADMAP.md)).

## Aturan untuk kontributor & agent

1. **Jangan commit `.env`** atau file `*.local` berisi secret (sudah di `.gitignore` — jangan bypass).
2. **Jangan expose service-role key** — tidak di kode, tidak di issue/PR, tidak di environment frontend. Operasi admin service-role hanya dari luar repo (dashboard Supabase / script lokal yang tidak di-commit).
3. **Jangan commit dump data** (SQL/JSON/CSV berisi data pengguna/siswa) — backup JSON dari menu Pemeliharaan hanya untuk operator, bukan untuk repo.
4. **Jangan mengubah RLS/policy/trigger/auth config tanpa instruksi eksplisit** (lihat [CONTRIBUTING.md](CONTRIBUTING.md)).
5. Jangan log/menampilkan password, token, atau key di console/toast/UI.
6. Penambahan fitur sensitif wajib mengulas dampak RLS (policy bersifat aditif — satu policy longgar membatalkan model ketat).

## Kredensial & akun

- Tidak ada kredensial default di repository ini. Akun dibuat Admin dari dalam aplikasi; admin pertama via Supabase Dashboard ([docs/database.md](docs/database.md#bootstrap-admin-pertama)).
- Password diurus 100% oleh Supabase Auth (hashing bawaan). Kolom `password` lama di `public.users` tidak dipakai untuk login — jangan mengandalkannya.
- Ganti password default/lemah segera setelah bootstrap; gunakan password kuat untuk akun Admin.

## Reporting vulnerabilities

Menemukan kerentanan keamanan (mis. bypass RLS, kebocoran data antar role, XSS, policy storage)?

- **Jangan** buka sebagai issue/PR publik.
- Laporkan privat ke maintainer via email yang tertera di profil GitHub pemilik repo, atau DM kontributor yang dikenal — sertakan: deskripsi, langkah reproduksi, dampak, dan (bila ada) saran perbaikan.
- Maintainer akan: mengonfirmasi → memperbaiki → merilis → mencatat di CHANGELOG (tanpa detail eksploitasi).

## Praktik operasional yang disarankan

- Project Supabase terpisah untuk dev vs produksi.
- "Confirm email" mati (wajib untuk email virtual), tapi aktifkan proteksi lain yang tersedia (rate limit auth, password policy kuat).
- Backup database berkala dari dashboard Supabase (terpisah dari backup JSON aplikasi).
- Tinjau ulang policy RLS & Storage setiap kali menambah tabel/fitur.
