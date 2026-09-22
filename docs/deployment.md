# Deployment

Aplikasi adalah **static SPA** — hasil build (`dist/`) bisa di-host di layanan static hosting apa pun. Konfigurasi bawaan repo ditujukan untuk **Vercel**.

## Cara kerja build

```text
npm run build
  1. node scripts/check-template-bindings.mjs   (guard — build gagal bila binding template rusak)
  2. vite build                                  (NODE_OPTIONS=--max-old-space-size=4096)
  → dist/ (index.html + assets ber-hash konten)
```

## Konfigurasi Vercel (`vercel.json`)

| Aturan | Fungsi |
|---|---|
| Rewrite `/(.*)` → `/index.html` | Wajib untuk Vue Router `createWebHistory`: refresh/deep-link ke `/siswa`, `/rekap`, dll. tidak 404 |
| Header `/assets/*`: `Cache-Control: public, max-age=31536000, immutable` | Aset ber-hash konten di-cache browser 1 tahun → kunjungan ulang nyaris instan |

Tidak ada fungsi serverless, tidak ada build config khusus — Vercel otomatis mendeteksi Vite (`npm run build` → `dist`).

## Deploy (Vercel)

1. Hubungkan repository GitHub ke dashboard Vercel (Import Project).
2. Framework preset: Vite (otomatis). Build command `npm run build`, output `dist` (otomatis).
3. Tambahkan environment variables produksi:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Setiap push ke branch produksi men-trigger build + guard template otomatis.

> Catatan: variable `VITE_*` dibakar ke bundle saat build (client-side). Mengganti URL/key Supabase = wajib rebuild/redeploy.

## Environment produksi

- Gunakan Supabase project **produksi** (terpisah dari dev bila memungkinkan).
- Pastikan skema + RLS + storage + trigger sinkronisasi auth sudah dijalankan di project produksi (lihat [database.md](database.md)).
- Pastikan provider Email **mematikan "Confirm email"** (login memakai email virtual yang tak bisa menerima email).
- Pastikan tidak ada policy `allow_all_*` tersisa (lihat [database.md](database.md#row-level-security)).
- Jangan pernah menaruh service-role key di environment frontend.

## Verifikasi rilis

Checklist pasca-deploy (di URL produksi):

- [ ] Halaman login tampil tanpa flicker/blank (splash → form).
- [ ] Login tiap role berhasil dan mendarat di dashboard yang benar (Pustakawan murni → Beranda Perpustakaan).
- [ ] Refresh di rute anak (`/rekap`, `/buku`) tidak 404 (rewrite aktif).
- [ ] Dashboard presensi: grafik tampil, realtime refresh bekerja (ubah presensi di tab lain → dashboard ter-update ±1 detik).
- [ ] Ekspor PDF & Excel bisa diunduh (chunk lazy termuat).
- [ ] Scan QR bisa membuka kamera (butuh HTTPS — Vercel otomatis HTTPS).
- [ ] Mobile: bottom navigation tampil, konten tidak tertutup nav.
- [ ] Logo madrasah tampil di sidebar/splash (Storage publik terbaca).

## Rollback

- Vercel: gunakan fitur *Instant Rollback* / promote deployment sebelumnya dari dashboard.
- Database tidak ikut ter-deploy dari repo ini, jadi rollback frontend tidak menyentuh data. (Sebaliknya: perubahan skema/RLS manual di Supabase tidak bisa di-rollback via Vercel — alasan lain untuk memperlakukan perubahan DB secara hati-hati.)

## Hosting alternatif

Hosting static apa pun (Netlify, Cloudflare Pages, Nginx, …) bisa dipakai dengan dua syarat:

1. **SPA fallback**: semua path yang bukan file → serve `index.html`.
2. **Cache immutable** untuk aset ber-hash (`/assets/*`) — opsional tapi sangat disarankan.
