# Database

Database adalah **Supabase PostgreSQL**. Skema didefinisikan sebagai file SQL berurutan di `supabase/` — dijalankan manual di Supabase SQL Editor (tidak ada migration runner/CLI di repo ini).

> Dokumen ini merangkum skema; bukan salinan SQL. Source of truth tetap file `supabase/*.sql`.

## Menjalankan skema

Urutan eksekusi di SQL Editor:

1. `01_schema.sql` — tabel + indeks + trigger
2. `02_rls.sql` — Row Level Security
3. `03_storage.sql` — bucket `assets`
4. `06_final_snapshot.sql` — trigger sinkronisasi auth → profil
5. Bootstrap admin pertama (di bawah)

Catatan berkas:

- `04_seed.sql` berisi data contoh (settings "MIN Blora", periode, siswa, kalender). ⚠️ Bagian "akun login"-nya memakai format lama (kolom `password` plaintext di `public.users`) yang **tidak berlaku** lagi setelah migrasi Supabase Auth — password kini 100% diurus `auth.users`. Jalankan seed ini selektif (data master saja), atau sesuaikan.
- `05_library_visits.sql` adalah migrasi tambahan bersejarah untuk tabel `library_visits` yang isinya sudah tercakup `01_schema.sql`; policy `allow_all_library_visits`-nya (anon full access) **jangan dipakai** bila `02_rls.sql` sudah dijalankan belakangan (policy ketat menimpa secara aditif — pastikan policy longgar ini di-drop; lihat tabel policy di bawah).

## Tabel & domain

### Identitas & auth

| Tabel | Fungsi | Kunci relasi |
|---|---|---|
| `users` | Profil akun: `username` (unik), `nama`, `role`, `kelas` (wali kelas), `nip`, `auth_id` → `auth.users` | `auth_id` UNIQUE-ish via trigger upsert |

### Presensi & akademik

| Tabel | Fungsi | Kunci relasi |
|---|---|---|
| `students` | Master siswa: `nisn` (unik), `nama`, `jk`, `kelas`, `active`, `status` (`aktif/lulus/pindah/keluar`) | `nisn` |
| `attendance_logs` | Satu baris per siswa per tanggal: `date`, `student_nisn`, `status` (Hadir/Izin/Sakit/Alfa), `kelas`, `guru_input` | `UNIQUE(date, student_nisn)`; FK → `students(nisn)` cascade |
| `academic_calendar` | Penanda per tanggal: `date` PK, `status` (Masuk/Libur) | — |
| `academic_periods` | Tahun ajaran + semester, tepat satu `is_active = true` (partial unique index) | — |
| `class_history` | Snapshot kelas per tahun ajaran: `student_nisn`, `tahun_ajaran`, `kelas`, `wali_kelas`, `status` | `UNIQUE(student_nisn, tahun_ajaran)`; FK → `students(nisn)` cascade |

### Perpustakaan

| Tabel | Fungsi | Kunci relasi |
|---|---|---|
| `books` | Katalog: `judul`, `pengarang`, `penerbit`, `tahun_terbit`, `isbn`, `stok`, `kategori` | — |
| `book_loans` | Sirkulasi: `book_id`, `student_nisn`, `tanggal_pinjam`, `tanggal_kembali_seharusnya`, `tanggal_kembali_aktual`, `status` (`dipinjam/dikembalikan/terlambat/hilang`), `guru_input` | FK → `books(id)` cascade, → `students(nisn)` cascade |
| `library_visits` | Kunjungan: `student_nisn`, `tanggal`, `created_at` | FK → `students(nisn)` cascade |

### Sistem

| Tabel | Fungsi | Kunci relasi |
|---|---|---|
| `app_settings` | Satu baris (`id = 1`, check constraint): identitas madrasah, kop surat (baris 2–5), `daftar_kelas` (jsonb), `hari_libur_mingguan` (jsonb, default `[0,6]`), `nama_perpustakaan`, `logo_url` | — |
| `activity_logs` | Audit trail: `user_id` → `users(id)` set null, `aksi`, `tabel_terkait`, `record_id`, `detail` (jsonb) | FK → `users(id)` |

### Diagram relasi (ringkas)

```text
auth.users 1──1 users ──< activity_logs
                              │
students ──< attendance_logs   │  (user_id set null)
   │  ▲                        │
   │  ├──< book_loans >── books │
   │  └──< library_visits       │
   └──< class_history
```

Trigger: `set_updated_at()` untuk `attendance_logs` dan `book_loans`; `handle_new_user()` / `handle_delete_user()` untuk sinkronisasi auth ↔ `users`.

## Row Level Security

RLS **aktif di semua 11 tabel** (`02_rls.sql`, mode strict). Pola akses dibaca tanpa rekursi via fungsi `SECURITY DEFINER` `get_my_role()` (membaca `users.role` milik `auth.uid()`).

| Policy | Tabel | Siapa |
|---|---|---|
| `Authenticated_Select` (SELECT) | `students`, `academic_calendar`, `academic_periods`, `app_settings`, `books`, `users` | Semua user login boleh baca master |
| `Auth_Insert_ActivityLogs` (INSERT) | `activity_logs` | Semua user login boleh mencatat log |
| `Admin_All_<tabel>` (ALL) | Semua 11 tabel | `role = 'Admin'` — akses penuh |
| `Guru_Manage_Absensi` (ALL) | `attendance_logs` | `Guru`, `Guru & Pustakawan` — kelola absensi |
| `Perpus_Manage_Buku/Loans/Visits` (ALL) | `books`, `book_loans`, `library_visits` | `Pustakawan`, `Guru & Pustakawan` — kelola perpus |

Prinsip: semua yang tidak diizinkan policy = ditolak. Akses tulis kalender/periode/settings/siswa/akun = Admin saja (Guru hanya *membaca* kalender — konsistensi antara `KalenderView` read-only non-admin dan RLS).

⚠️ Pastikan tidak ada policy `allow_all_*` tersisa dari migrasi lama (`05_library_visits.sql`) — policy di Postgres bersifat aditif (OR), satu policy longgar membatalkan seluruh model ketat.

## Storage

- Bucket **`assets`**, publik (`03_storage.sql`): menyimpan file logo madrasah dari menu Pengaturan.
- Policy: baca publik; insert/update/delete terbuka untuk `anon` + `authenticated` (disebut "OPSI A" di SQL). Logo diakses via URL publik di splash/sidebar/PDF/favicon.
- Implikasi keamanan: siapa pun yang tahu endpoint bisa menulis ke bucket ini — dibahas di [SECURITY.md](../SECURITY.md) sebagai risiko yang diterima + rencana pengetatan.

## Bootstrap admin pertama

Karena login memakai Supabase Auth (bukan kolom `password` lama), akun admin pertama dibuat manual (`06_final_snapshot.sql`):

1. Supabase Dashboard → Authentication → Providers → Email → **matikan "Confirm email"**.
2. Authentication → Users → Add User → buat user (mis. `admin@minblora.id` + password kuat).
3. Trigger `on_auth_user_created` otomatis membuat baris `public.users`; peran default dari metadata = `Guru`, jadi **ubah `role` menjadi `Admin`** (via SQL atau setelah login lewat menu Guru & Wali Kelas dari akun admin lain).
4. Login ke aplikasi dengan username `admin` + password tersebut.
5. Akun-akun berikutnya dibuat dari dalam aplikasi (menu **Guru & Wali Kelas** → Tambah Akun / impor Excel).

Domain email virtual konsisten `@minblora.id` di `auth.js` dan `GuruView.vue`. (File `06_final_snapshot.sql` menyebut contoh `@minblora.com`/`.local` di komentar & cleanup — itu artefak historis; yang berlaku adalah `@minblora.id`.)

## Aturan untuk kontributor & agent

- **Jangan mengubah skema/RLS/trigger/policy/bucket tanpa instruksi eksplisit.** Perubahan database adalah aksi destruktif & lintas-lingkungan.
- Setiap perubahan DB harus berupa file SQL baru yang berurutan + diulas policy RLS-nya + dicatat di CHANGELOG.
- Jangan pernah commit kredensial database, service-role key, atau dump data ke repo.
