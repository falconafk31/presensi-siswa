# Performance

Strategi loading aplikasi — semuanya sudah terimplementasi dan terverifikasi di source. Angka ukuran chunk di bawah adalah **perkiraan wajar dari komentar kode & konfigurasi**, bukan hasil benchmark yang diukur ulang di dokumen ini (jalankan `npm run build` dan periksa `dist/` untuk angka pasti di versi dependensi Anda).

## Prinsip

Jalur kritis boot hanya memuat: **1 file JS entry + CSS + 1 file font**. Semua yang berat dimuat on-demand.

## Urutan boot anti-kedip

1. **Boot splash instan** (`index.html`) — HTML/CSS inline murni, digambar browser tanpa menunggu JavaScript. Latar disamakan dengan latar aplikasi (`#f8fafc`) agar transisi mulus satu frame. Logo madrasah dari `localStorage['app.logo_url']` di-inject oleh script inline (tampil sejak frame pertama pada kunjungan berikutnya).
2. **Mount setelah rute siap** (`main.js`) — `app.mount()` menunggu `router.isReady()`, sehingga chunk halaman pertama sudah termuat saat splash hilang (tidak ada urutan "kosong → skeleton → konten").
3. **Profil dari cache lokal** (`stores/auth.js`) — boot tidak menunggu round-trip Supabase di kunjungan ulang; refresh profil di background. Fallback **boot timeout 5 detik** memastikan splash tak pernah menggantung.
4. **Font self-host** (`@fontsource-variable/inter`) — tanpa CDN Google Fonts: tanpa DNS lookup dan stylesheet render-blocking eksternal; satu file variable font, `font-display: swap`, subset latin via `unicode-range`.

## Lazy loading

| Aset | Ukuran terukur (gzip) | Mekanisme | Kapan dimuat |
|---|---|---|---|
| Chart.js (+ wrapper) | ±65 kB | `defineAsyncComponent(() => import('@/lib/chartSetup'))` (dashboard presensi); route chunk (dashboard perpus) | Dashboard dibuka |
| `xlsx` | ±143 kB | `await import('xlsx')` di `lib/excelExport.js` + view impor | Ekspor/impor Excel diklik |
| `jspdf` + autotable | ±118 kB + ±13 kB | `await import()` di `lib/pdf*.js` + `CetakKartuView` | Ekspor PDF diklik |
| `@supabase/realtime-js` | ± puluhan kB | Shim `lib/lazyRealtime.js` + alias Vite, `whenRealtimeReady()` | Dashboard presensi mount |
| `html5-qrcode` | ±114 kB (route `/scan-qr`) | Route chunk (`ScanQRView` mengimpor statis di modul rutenya) | Rute `/scan-qr` dibuka |
| Semua views | ±1–13 kB gzip per view | `() => import()` di router | Navigasi pertama per rute |

Catatan historis (CHANGELOG `0.2.1`): `manualChunks` object-form lama pernah meng-hoist runtime Vue ke chunk chart sehingga Chart.js ikut termuat di semua halaman — sudah diperbaiki dengan menyerahkan chunking ke default Rollup. **Jangan mengembalikan `manualChunks` kustom tanpa mengukur ulang.**

## Realtime yang hemat

- Satu-satunya subscription (`DashboardView`) memakai channel sekali-pakai per mount, handler debounce 1 detik, dan `removeChannel` saat unmount — tidak ada listener bocor antar navigasi.
- Pengguna yang tidak membuka dashboard presensi (mis. Pustakawan murni, halaman login) tidak mengunduh chunk realtime sama sekali.

## Asset caching

`vercel.json` mengirim `Cache-Control: public, max-age=31536000, immutable` untuk `/assets/*` (nama file ber-hash konten) — kunjungan ulang memuat dari cache browser. Lihat [deployment.md](deployment.md).

## Rendering & densitas

- Daftar panjang memakai **scroll internal kartu** (`max-h` + `overflow-y-auto`), bukan menambah tinggi halaman.
- Statistik memakai **client-side pagination 25 baris/halaman** agar render tabel ringan.
- Tinggi grafik **adaptif viewport** (`clamp()` berbasis `vh`) — menyusut di layar pendek, membesar di layar tinggi.
- Target desain: dashboard muat **tanpa scroll vertikal pada state normal** di desktop 1366×768 — diverifikasi aritmetika di [`layout-budget.md`](layout-budget.md). Setiap section dashboard baru wajib masuk budget tersebut.

## Responsive behavior

- Sidebar: expanded/collapsed (desktop) → drawer + overlay (mobile), ESC menutup.
- Bottom navigation mobile dengan `safe-area-inset-bottom`; padding bawah konten global dihitung dari tinggi nav (`AppLayout`) agar konten tak tertutup — termasuk rentang 640–1023px dan perangkat ber-inset.
- Filter tren dashboard: horizontal compact di desktop, grid 2 kolom full-width di mobile (tanpa horizontal scroll).
- Touch target ≥ 44px di perangkat layar sentuh; lihat [design-system.md](design-system.md).

## Backlog optimasi (opsional, belum dikerjakan)

Disalin dari catatan repo — **bukan** klaim yang sudah dikerjakan:

1. `html5-qrcode` → pertimbangkan `BarcodeDetector` native dengan fallback untuk browser lama.
2. Kompresi logo saat unggah (resize klien, mis. maks 256×256 WebP) agar splash/sidebar ringan.
3. Lepas shim `lazyRealtime.js` bila `supabase-js` baru menyediakan lazy realtime bawaan.
4. Monitoring error runtime (Sentry/GlitchTip).
5. Virtualisasi tabel (`@tanstack/vue-virtual`) hanya bila data tumbuh sangat besar.

Status tiap item dilacak di [ROADMAP.md](../ROADMAP.md).
