# Testing

> Fakta: repo ini **belum memiliki automated test** (tidak ada Vitest/Vue Test Utils/Playwright di `package.json`). Klaim "test" di repo ini berarti: guard binding template + build produksi + CI + QA manual. Dokumen ini tidak mengklaim lebih dari itu.

## Lapisan verifikasi yang benar-benar ada

### 1. Guard binding template SFC

`scripts/check-template-bindings.mjs` — ditulis setelah insiden nyata (template memanggil helper yang tidak dideklarasikan → error runtime "x is not a function", CHANGELOG `0.2.5`).

- Cara kerja: compile setiap `.vue` dengan `@vue/compiler-sfc`, lalu cari referensi `_ctx.*` pada kode template hasil kompilasi produksi (tanda binding tak terdefinisi; `$slots/$emit/$props` dikecualikan).
- Dijalankan otomatis oleh `npm run build` **dan** CI. Menjalankan manual:

```bash
node scripts/check-template-bindings.mjs
```

### 2. Build produksi

```bash
npm run build
```

Build Vite adalah verifikasi integrasi utama: memastikan SFC ter-compile, import alias `@` valid, dan chunk lazy (chart/pdf/excel/realtime) terbentuk. CI selalu menjalankannya dengan `.env` dari `.env.example`.

### 3. CI (GitHub Actions)

`.github/workflows/ci.yml` — trigger setiap `push` (semua branch) dan `pull_request`:

1. `npm ci` (Node 20)
2. Guard binding template
3. `npm run build` (dengan `.env` salinan `.env.example`)

Tidak ada job test/lint/coverage — karena tool-nya memang belum ada di repo.

### 4. QA manual (wajib untuk perubahan perilaku/UI)

Checklist berbasis peran (jalankan di `npm run dev` atau URL preview):

**Auth & guard**

- [ ] Login salah → pesan "Username atau password salah", tanpa panel recovery.
- [ ] Login tiap role (Admin / Guru / Pustakawan / Guru & Pustakawan) → landing benar.
- [ ] Akses URL langsung di luar hak (mis. Guru buka `/guru`, Pustakawan buka `/presensi`) → di-redirect sesuai guard.
- [ ] Refresh di rute terautentikasi → sesi bertahan (persistSession).
- [ ] Logout → cache profil bersih, kembali ke `/login`.

**Presensi (Admin + Guru)**

- [ ] Input presensi: ubah status → badge "N perubahan belum disimpan" → simpan → toast sukses → tinggalkan halaman tanpa dialog.
- [ ] Input presensi: ubah status → navigasi pergi → dialog konfirmasi kustom → "Tinggalkan" tidak menyimpan.
- [ ] Tanggal libur (kalender / akhir pekan) → form terkunci + banner "Hari libur".
- [ ] Guru hanya melihat/mengisi kelas ampuannya.
- [ ] Rekap bulanan/semester: matriks benar, Total Hari Efektif/Libur tampil, ekspor PDF + Excel terunduh dan terbaca.
- [ ] Dashboard: tren, komposisi, strip monitoring benar; realtime (ubah di tab lain → refresh ±1 dtk).

**Perpustakaan (Admin + Pustakawan)**

- [ ] CRUD buku + impor/ekspor Excel.
- [ ] Pinjam → stok berkurang; kembali → status + tanggal aktual tercatat; keterlambatan terhitung.
- [ ] Kunjungan manual tercatat; Scan QR via kamera mencatat + bunyi feedback (butuh HTTPS/kamera).
- [ ] Laporan kunjungan/sirkulasi + ekspor PDF/Excel; kartu anggota ter-cetak dengan QR NISN.

**Admin**

- [ ] CRUD siswa + impor Excel (template & pratinjau); CRUD akun + penetapan wali kelas.
- [ ] Pengaturan: identitas, kop surat tampil di PDF, unggah logo tampil di sidebar/splash, periode aktif, kenaikan kelas (uji di data dev!), reset dengan konfirmasi ganda, backup JSON terunduh.
- [ ] Log aktivitas mencatat aksi penting.

**Browser & perangkat**

- [ ] Desktop 1366×768: dashboard muat tanpa scroll vertikal pada state normal (lihat `docs/layout-budget.md`).
- [ ] Mobile (±360–390px): bottom navigation tampil, konten tidak tertutup, tidak ada horizontal scroll (terutama filter tren dashboard & tabel).
- [ ] `prefers-reduced-motion`: animasi/transisi praktis mati.
- [ ] Keyboard: fokus terlihat, modal/dialog bisa di-ESC.

## Yang belum ada (rencana)

- Unit test (calon: Vitest + Vue Test Utils) untuk alur kritis: kalkulasi rekap, guard rute, helper tanggal — tercatat di [ROADMAP.md](../ROADMAP.md).
- E2E browser test (calon: Playwright mengikuti pola skill `webapp-testing` Anthropic: tunggu `networkidle`, reconnaissance-then-action, headless Chromium). Belum diimplementasikan — jangan mengklaim QA otomatis sebelum ada.
- Monitoring error runtime produksi (calon: Sentry/GlitchTip) — tercatat di roadmap.
