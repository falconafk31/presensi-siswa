# Architecture

Arsitektur **aktual** aplikasi, diverifikasi dari source code. Semua path relatif ke root repository.

## Application Architecture

Pure **Single Page Application** (SPA): tidak ada backend milik sendiri, tidak ada SSR, tidak ada PWA (service worker lama justru di-unregister paksa saat boot — `src/main.js`).

```text
┌─────────────┐   HTTPS (anon key + JWT)   ┌──────────────────────┐
│  Browser    │ ──────────────────────────▶ │  Supabase            │
│  Vue 3 SPA  │ ◀────────────────────────── │  Auth · PostgreSQL   │
│  (static)   │   postgres_changes (ws)     │  Storage · Realtime  │
└─────────────┘                             └──────────────────────┘
```

- Semua query database dilakukan langsung dari browser via `supabase-js` dengan **anon key**.
- Otorisasi ditegakkan di dua lapis: guard/penyaringan UI di frontend + **Row Level Security** di database (lihat [database.md](database.md)).
- Satu-satunya koneksi realtime adalah subscription `postgres_changes` pada tabel `attendance_logs` di dashboard presensi.

## Frontend Architecture

```text
src/
├── main.js            # boot: auth.initialize() (race 5 dtk) → router.isReady() → mount
├── App.vue            # RouterView + Toaster global + favicon dinamis dari settings
├── router/index.js    # 21 rute (lazy) + beforeEach guard + afterEach title + onError chunk reload
├── layouts/
│   └── AppLayout.vue  # shell terautentikasi: sidebar/drawer, header, bottom-nav mobile
├── views/             # 20 halaman route-level (masing-masing fetch data sendiri)
├── components/ui/     # 19 komponen presentasional (App*) — tanpa akses Supabase langsung
├── stores/            # auth, settings, period (Pinia)
├── lib/               # supabase client, ekspor PDF/Excel, dates, chart, activityLog, lazyRealtime
└── config/            # constants, designSystem tokens, navigation
```

Prinsip yang dipakai kode:

- **Views fetch sendiri.** Tidak ada lapisan API/repository terpusat; setiap view memanggil `supabase.from(...)` dan memakai `logActivity()` untuk audit trail.
- **Stores hanya untuk state global**: sesi+profil (`auth`), identitas madrasah (`settings`), periode aktif (`period`). Keduanya terakhir memakai deduplikasi *in-flight request*.
- **Komponen UI murni presentasional**: menerima props/events, tidak tahu soal Supabase/auth.
- **Lazy everything**: semua rute di-`import()` dinamis; library berat (`jspdf`, `xlsx`, `chart.js`, `realtime-js`) hanya dimuat saat fitur pemakainya dibuka (lihat [performance.md](performance.md)).

## State Management (Pinia)

| Store | State | Sumber & caching |
|---|---|---|
| `auth` | `user` (profil `users`), getters role: `isAdmin`, `isGuru`, `isPustakawan`, `canManagePresensi`, `canManagePerpus`, `kelas` | `auth.initialize()`: hidrasi sinkron dari `localStorage['presensi.user']`, lalu refresh profil di background; `onAuthStateChange` menjaga sinkronisasi sesi |
| `settings` | `settings` (baris `app_settings id=1` + default) | `fetchSettings()` sekali, deduplikasi request bersamaan; logo di-cache ke `localStorage['app.logo_url']` untuk splash |
| `period` | `activePeriod` | `fetchActivePeriod()` sekali, deduplikasi request bersamaan |

Tidak ada persist plugin Pinia — persistensi manual via `localStorage` hanya untuk dua key: `presensi.user` dan `app.logo_url` (+ `sidebar.collapsed`, `presensi.threshold` milik UI).

## Routing

Didefinisikan di `src/router/index.js`, mode `createWebHistory` (butuh SPA rewrite di hosting — lihat [deployment.md](deployment.md)).

| Meta | Arti | Dipakai oleh |
|---|---|---|
| `public: true` | Bisa diakses tanpa login | `/login` |
| `requiresAuth: true` | Wajib login | `AppLayout` + seluruh anak, `/panduan` |
| `adminOnly: true` | Khusus Admin | siswa, guru, riwayat-kelas, aktivitas, pengaturan |
| `presensiOnly: true` | Admin + Guru (+ Guru & Pustakawan) | dashboard, presensi, rekap, rekap-semester, statistik, kalender |
| `perpusOnly: true` | Admin + Pustakawan (+ Guru & Pustakawan) | dashboard-perpus, buku, peminjaman, kunjungan, cetak-kartu, rekap-perpus, scan-qr |

Guard `beforeEach`:

1. Belum login + `requiresAuth` → `/login?redirect=...`.
2. Sudah login + buka `/login` → Pustakawan murni ke `dashboard-perpus`, lainnya ke `dashboard`.
3. `adminOnly` tanpa `isAdmin` → `dashboard`.
4. `perpusOnly` tanpa `canManagePerpus` → `dashboard` (admin) / `login`.
5. `presensiOnly` tanpa `canManagePresensi` → `dashboard-perpus`.

Tambahan: `afterEach` mengatur `document.title` per rute; `router.onError` me-reload halaman saat chunk lazy gagal dimuat (deploy baru saat sesi lama terbuka).

## Authentication Flow

```text
LoginView.handleLogin()
  │ username + password
  ▼
auth.login() ── email virtual "<username>@minblora.id"
  │ supabase.auth.signInWithPassword()
  ▼
fetchProfile(auth_id) ── SELECT * FROM users WHERE auth_id = ?
  │ simpan ke user.value + localStorage['presensi.user']
  ▼
router.replace(redirect || dashboard) ── guard memilih landing per role
```

- Sesi Supabase dipersist (`persistSession: true`, `autoRefreshToken: true` — `src/lib/supabase.js`).
- Boot (`src/main.js`): `auth.initialize()` hidrasi profil dari cache lokal (instan di kunjungan ulang), daftar `onAuthStateChange` **sebelum** `await` apa pun, lalu verifikasi sesi. Keseluruhan dibatasi `BOOT_TIMEOUT_MS = 5000` agar splash tidak menggantung.
- Logout: `supabase.auth.signOut()` + hapus `user` + hapus cache lokal.

Detail lengkap + recovery: [authentication.md](authentication.md).

## Supabase Integration

- Satu client tunggal (`src/lib/supabase.js`), dibuat dari `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; aplikasi melempar error jelas saat env belum diset.
- Query: `supabase-js` query builder langsung dari views/stores (`select/insert/update/delete`, termasuk join `students(nama, kelas)`).
- Storage: upload logo ke bucket `assets` dari Pengaturan; URL publik dipakai sidebar/splash/PDF/favicon.
- Auth admin: pembuatan akun oleh Admin memakai **secondary client** (`GuruView.vue`) agar `signUp` tidak me-logout sesi Admin yang sedang aktif; trigger DB (`06_final_snapshot.sql`) menyinkronkan `auth.users` → `public.users`.

## Data Flow (contoh: input presensi)

```text
InputPresensiView
  ├── cekKalender() ── academic_calendar + hari_libur_mingguan → kunci form bila libur
  ├── load students (kelas wali) + attendance_logs hari itu
  ├── user mengubah status → isDirty (bandingkan dengan baseline)
  └── simpan → upsert attendance_logs → logActivity('input_presensi', …)
        └── DashboardView menerima postgres_changes → debounce 1 dtk → fetchToday()+fetchTrend()
```

Pola umum: view → Supabase langsung → toast sukses/gagal → `logActivity()` untuk aksi penting (kegagalan log tidak memblokir aksi utama).

## Lazy Loading

| Aset | Mekanisme | Pemicu |
|---|---|---|
| Semua views + layout | `() => import()` di router | Navigasi pertama ke rute |
| Chart presensi | `defineAsyncComponent(() => import('@/lib/chartSetup'))` | Dashboard presensi dibuka |
| Chart perpus | `import` statis di route chunk perpus | Rute perpus dibuka |
| jsPDF / autotable | `await import()` di `lib/pdf*.js` | Klik ekspor PDF |
| xlsx | `await import('xlsx')` di `lib/excelExport.js`, BukuView, SiswaView | Klik ekspor/impor Excel |
| realtime-js | Shim `lib/lazyRealtime.js` + alias Vite, `whenRealtimeReady()` | Dashboard presensi mount |
| html5-qrcode | `import` statis di route chunk ScanQR | Rute `/scan-qr` dibuka |

## Realtime Architecture

- Hanya **satu** subscription di seluruh aplikasi (`DashboardView.vue`): channel `dashboard-attendance-<timestamp>` → `postgres_changes(event: '*', table: 'attendance_logs')` → refresh debounce 1 detik → `removeChannel` saat unmount.
- Paket `@supabase/realtime-js` (± puluhan kB) dipisah dari bundle boot via shim + alias Vite (`vite.config.js`), sehingga halaman login dan pengguna non-dashboard tidak mengunduhnya. Shim membangun `RealtimeClient` **asli** via `new` biasa (pendekatan prototype-swap lama terbukti merusak inisialisasi field internal — lihat CHANGELOG `0.2.3`).

## Error & Recovery Behavior

| Mekanisme | Lokasi | Perilaku |
|---|---|---|
| Boot timeout 5 dtk | `main.js` | Mount tetap jalan walau Supabase lambat; guard mengarahkan ke login bila sesi invalid |
| Global error handler | `main.js` `app.config.errorHandler` | Toast error + cegah white screen |
| Chunk load error | `router.onError` | Reload ke URL tujuan (menangani deploy baru) |
| Service worker cleanup | `main.js` + AppLayout + Login recovery | Unregister SW lama (sisa PWA yang sudah dilepas) |
| Login timeout 12 dtk + "Pulihkan Sesi" | `LoginView.vue` | Bersihkan cache profil + `signOut({scope:'local'})` + unregister SW + reload; attempt token mencegah race |
| Boot splash | `index.html` inline | HTML/CSS murni, hilang tepat saat rute pertama ter-render (`router.isReady()` + mount) |
| Cache clear manual | Menu profil → Refresh | Unregister SW + hapus Cache Storage + reload |
| Dirty guard presensi | `InputPresensiView` | `onBeforeRouteLeave` (dialog kustom) + `beforeunload` browser |

## Deployment Architecture

```text
Git push → Vercel build (npm run build → dist/) → static hosting + CDN
  ├── /(.*) → /index.html        (SPA rewrite utk history mode)
  └── /assets/* → immutable 1 th (nama file ber-hash konten)
```

Database/auth/storage tetap di Supabase (tidak ikut di-deploy). Detail: [deployment.md](deployment.md).
