# Langkah Awal — Scaffold Sistem Presensi MIN Blora

Folder ini berisi semua file fondasi (Langkah 1 dari build plan). Ikuti urutan berikut.

## 1. Buat folder project & salin file scaffold
```bash
mkdir min-blora-presensi
cd min-blora-presensi
# salin seluruh isi folder scaffold/ ini ke sini (termasuk file tersembunyi .env.example & .gitignore)
```

## 2. Install dependensi
```bash
npm install
```

## 3. Siapkan environment Supabase
```bash
cp .env.example .env
# lalu isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY dari
# Supabase Dashboard > Project Settings > API
```

## 4. Jalankan dev server
```bash
npm run dev
# buka http://localhost:5173
```

> Catatan: halaman (LoginView, DashboardView, dst.) di-lazy-load dan belum dibuat —
> itu dibangun di langkah berikutnya. Scaffold ini memastikan app boot, routing,
> Pinia, Tailwind (design system Kemenag), Supabase client, dan toast sudah siap.

## Struktur yang dihasilkan
```
min-blora-presensi/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js        # warna #064e3b, gold #FBBF24, font Inter, rounded-xl
├── postcss.config.js
├── .env.example
├── .gitignore
└── src/
    ├── main.js
    ├── App.vue               # RouterView + Toaster (vue-sonner)
    ├── style.css             # @tailwind + komponen .btn-primary / .card / .input-field
    ├── lib/supabase.js       # client supabase-js
    ├── router/index.js       # lazy routes + navigation guard
    └── stores/auth.js        # Pinia auth store (login ke tabel users)
```

## Berikutnya (Langkah 2)
Setup database Supabase: 8 tabel, RLS, bucket Storage untuk logo, dan seed data.
Bilang "lanjut langkah 2" untuk aku siapkan SQL schema-nya.
