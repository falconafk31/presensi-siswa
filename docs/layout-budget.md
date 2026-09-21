# 📐 Layout Budget Dashboard — Verifikasi "Muat 1 Layar"

> Dokumen verifikasi untuk kriteria **dashboard tanpa scroll vertikal pada state normal**
> di layar **1366×720**. Karena pengukuran headless-browser tidak tersedia di lingkungan
> sandbox (CDN browser diblokir), verifikasi dilakukan lewat **aritmetika layout budget**
> berdasarkan nilai CSS terkompilasi yang sebenarnya (bukan perkiraan kasar).

## Asumsi Viewport

| Kondisi | Tinggi viewport |
|---|---|
| Layar 1366×720, Chrome maksimized (tab + address bar) | ±630–641 px |
| + bookmarks bar tampil | ±610 px |
| **Budget aman yang dipakai** | **≥ 610 px** |

## Komponen (nilai dari CSS terkompilasi)

| Komponen | Kelas | Tinggi |
|---|---|---|
| Padding atas konten | `main p-5` | 20 px |
| Page header (judul + subtitle inline) | `page-title` 28px + `mb-1` | 32 px |
| Chip filter kelas (13 kelas, 1 baris) | `.chip-tab` min-h 28px | 28 px |
| KPI bar (1 kartu, 5 sel) | `py-2` + konten 36px | 52 px |
| Baris pill aksi cepat | `h-8` | 32 px |
| Strip status (libur/belum absen/perlu perhatian) | `py-2` + 1–2 baris teks | 36–56 px |
| Kartu tren (chart adaptif) | `clamp(140px, 24vh, 220px)` | 14+30+154+14 = **212 px** @640vh |
| Kartu komposisi (donut + list tidak hadir) | donut `clamp(120,20vh,180)` + list `max-h-14` | 14+30+128+94+14 = **280 px** (worst) |
| Jarak antar-seksi | `.page-stack` gap 16px × 5 | 80 px |
| Padding bawah konten | `pb-4` | 16 px |

## Dashboard Presensi — Total

| Skenario | Total | vs viewport 610 px |
|---|---|---|
| **Worst case** (strip 2 baris + ada siswa tidak hadir) | **±596 px** | ✓ muat (margin 14 px) |
| Skenario umum (strip 1 baris, semua kelas sudah presensi) | **±508 px** | ✓ muat (margin 102 px) |

## Dashboard Perpustakaan — Total

| Komponen | Tinggi |
|---|---|
| Padding atas + header | 20 + 32 |
| KPI bar (4 sel) | 52 |
| Baris pill | 32 |
| Kartu tren (`clamp(104px,20vh,150px)` → 128 @640vh) | 14+30+128+14 = 186 |
| Baris bawah: max(Kunjungan 166, Peminjaman Terakhir 116) | 166 |
| Gap × 4 + padding bawah | 64 + 16 |
| **Total** | **±568 px** ✓ (margin 42 px @610) |

## Cara Verifikasi Manual

1. Buka aplikasi di layar 1366×720, browser maximized.
2. Login sebagai Admin → **Dashboard Presensi** → halaman tidak boleh men-scroll.
3. Cek skenario: (a) semua kelas sudah presensi, (b) ada kelas belum presensi, (c) hari libur.
4. Login sebagai Pustakawan → **Beranda Perpustakaan** → tidak boleh men-scroll.
5. Mode sidebar collapsed & expanded — keduanya tidak boleh mengubah ketinggian konten.

## Panduan Menjaga Budget (untuk kontributor)

- **Setiap section baru di dashboard harus masuk tabel di atas** dan menggantikan/memangkas yang lain.
- Jangan menambah tinggi tetap baru > 60 px di dalam viewport; gunakan scroll internal kartu (`max-h` + `overflow-y-auto`).
- Gunakan `clamp()` berbasis `vh` untuk elemen tinggi (grafik/list) agar menyesuaikan layar pendek.
- Jalankan `node scripts/check-template-bindings.mjs` (otomatis di `npm run build`) — mencegah error binding sekaligus memastikan tidak ada markup yatim.
