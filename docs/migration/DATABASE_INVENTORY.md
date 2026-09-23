# Database Inventory

**Phases covered: 1 (inventory), 2 (dependency graph), 7 (functions/triggers), 8 (extensions).**

Scope: every database object that the repository can evidence. Objects that the application uses
but the repository does not define are reported in
[§ 5 Schema drift](#5-schema-drift--repo-sql--live-database) — they are the most consequential
finding in this audit.

> The repository has **no migration runner and no migration history**. `supabase/` contains six
> loose SQL files intended to be pasted into the Supabase SQL Editor `[REPO]`
> (`supabase/01_schema.sql:2-3`, `docs/database.md:3`). There are therefore **no migration files**
> in this repository in the technical sense — only *setup scripts*, whose execution order and
> completeness against production are unverifiable from here.

---

## 1. Inventory

### 1.1 Tables

All 11 tables live in schema `public`. Every table has `ENABLE ROW LEVEL SECURITY` applied
(`supabase/02_rls.sql:9-19`).

| ID | Object | Type | File | Purpose | Dependencies | Migration Risk |
|---|---|---|---|---|---|---|
| DB-01 | `public.users` | table | `01_schema.sql:12-22` (+`06_final_snapshot.sql:33`) | Teacher/admin/librarian profile; authorization source of truth for `role` | `auth.users(id)` via `auth_id` (`06:24`) | **CRITICAL** — FK into Supabase Auth; also carries a live-drifted `nip` column (drift #1) |
| DB-02 | `public.students` | table | `01_schema.sql:25-40` | Student master data | — | **HIGH** — 3 further tables cascade from `nisn`; `tanggal_lahir`/`tempat_lahir` missing from repo SQL (drift #2, #3) |
| DB-03 | `public.attendance_logs` | table | `01_schema.sql:45-58` | One attendance row per student per day | `students(nisn)` FK cascade | **HIGH** — highest-volume table; target of the Realtime subscription |
| DB-04 | `public.academic_calendar` | table | `01_schema.sql:63-66` | Per-date Masuk/Libur marker | — | LOW |
| DB-05 | `public.academic_periods` | table | `01_schema.sql:71-83` | Academic year + semester; exactly one active | — | MEDIUM — partial unique index semantics must survive |
| DB-06 | `public.class_history` | table | `01_schema.sql:88-98` | Per-year snapshot of student class | `students(nisn)` FK cascade | MEDIUM |
| DB-07 | `public.app_settings` | table | `01_schema.sql:103-121` | Singleton config row (`id = 1`) | — | MEDIUM — `favicon_url` missing from repo SQL (drift #4) |
| DB-08 | `public.activity_logs` | table | `01_schema.sql:123-133` | Audit trail | `users(id)` FK `ON DELETE SET NULL` | HIGH — written on nearly every mutation; `record_id` is a *string-encoded composite* (see § 4.3) |
| DB-09 | `public.books` | table | `01_schema.sql:154-166` | Library catalogue + stock count | — | LOW |
| DB-10 | `public.book_loans` | table | `01_schema.sql:169-183` | Loan circulation | `books(id)` cascade, `students(nisn)` cascade | **HIGH** — application embeds it using a **hard-coded FK constraint name** (see § 4.2) |
| DB-11 | `public.library_visits` | table | `01_schema.sql:193-201`, re-declared `05_library_visits.sql:6-15` | Library visit log | `students(nisn)` FK cascade | **HIGH** — duplicate definition across two files, with a conflicting permissive RLS policy (see § 4.1) |

**Evidence for "duplicate definition":** `library_visits` is created by both
`supabase/01_schema.sql:193` and `supabase/05_library_visits.sql:6`. Both use
`create table if not exists`, so whichever runs first wins and the second is a silent no-op —
except `05_library_visits.sql:19-21` additionally attaches a permissive RLS policy. `[INFERRED]`
`docs/database.md:19` acknowledges this and warns the policy should not be used.

### 1.2 Columns

Complete column inventory for the three highest-risk tables. Full column lists for the remaining
eight tables are in `supabase/01_schema.sql` at the line ranges given above; they are reproduced
here only where they carry migration-relevant type or constraint semantics.

**DB-01 `public.users`** — `01_schema.sql:12-22` plus `06_final_snapshot.sql:33`

| Column | Type | Null | Default | Constraint | Note |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `username` | `text` | no | — | UNIQUE | Login handle; converted to virtual email at `src/stores/auth.js:88` |
| `password` | `text` | no | — | — | **Legacy plaintext column.** `06_final_snapshot.sql:56` writes `'***'`; `04_seed.sql:8-10` writes real plaintext (`admin123`) |
| `nama` | `text` | no | — | — | |
| `role` | `text` | no | `'Guru'` | CHECK `IN ('Admin','Guru','Pustakawan')` `01:17` | **Conflicts with live data** — see drift #5 |
| `kelas` | `text` | yes | — | — | Wali kelas assignment |
| `created_at` | `timestamptz` | no | `now()` | — | |
| `auth_id` | `uuid` | yes | — | → `auth.users(id)` `ON DELETE CASCADE` (`06:24`) | **Supabase-specific FK** |
| `nip` | `text` | — | — | — | ⚠️ **Used by app, absent from repo SQL** — drift #1 |

**DB-02 `public.students`** — `01_schema.sql:25-40`

| Column | Type | Null | Default | Constraint |
|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK |
| `nisn` | `text` | no | — | UNIQUE |
| `nama` | `text` | no | — | — |
| `jk` | `text` | yes | — | CHECK `IN ('L','P')` `01:29` |
| `kelas` | `text` | yes | — | — |
| `active` | `boolean` | no | `true` | — |
| `status` | `text` | no | `'aktif'` | CHECK `IN ('aktif','lulus','pindah','keluar')` `01:33` |
| `tanggal_masuk` | `date` | yes | — | — |
| `tanggal_keluar` | `date` | yes | — | — |
| `keterangan` | `text` | yes | — | — |
| `created_at` | `timestamptz` | no | `now()` | — |
| `tanggal_lahir` | — | — | — | ⚠️ **Used by app, absent from repo SQL** — drift #2 |
| `tempat_lahir` | — | — | — | ⚠️ **Used by app, absent from repo SQL** — drift #3 |

**DB-03 `public.attendance_logs`** — `01_schema.sql:45-58`

| Column | Type | Null | Default | Constraint |
|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK |
| `date` | `date` | no | — | part of UNIQUE `(date, student_nisn)` `01:54` |
| `student_nisn` | `text` | no | — | FK → `students(nisn)` `ON UPDATE CASCADE ON DELETE CASCADE` `01:48` |
| `status` | `text` | no | — | CHECK `IN ('Hadir','Izin','Sakit','Alfa')` `01:49` |
| `kelas` | `text` | yes | — | **Denormalised** — not FK'd to anything |
| `guru_input` | `text` | yes | — | **Free text, not FK→`users`** |
| `created_at` | `timestamptz` | no | `now()` | — |
| `updated_at` | `timestamptz` | no | `now()` | maintained by trigger (§ 1.7) |

### 1.3 Primary keys

All 11 tables have a primary key. Ten use a surrogate `uuid` from `gen_random_uuid()`. Two are
natural/composite and are the exception worth flagging:

| Table | PK | Note |
|---|---|---|
| `academic_calendar` | `date` (natural) `01:64` | The only natural PK. `date` is both PK and the business key |
| `app_settings` | `id int` with `CHECK (id = 1)` `01:104` | Singleton enforced by CHECK, not by a sequence |

`[INFERRED]` Because `academic_calendar.date` is a natural PK, and `attendance_logs.date` is *not*
FK'd to it, the two can diverge: attendance can exist on a date marked `Libur`. The application
tolerates this deliberately (`src/views/InputPresensiView.vue:143` gates input on calendar state,
but historical rows are untouched).

### 1.4 Foreign keys

| ID | Child → Parent | Columns | ON UPDATE | ON DELETE | Constraint name | File |
|---|---|---|---|---|---|---|
| FK-1 | `users.auth_id` → `auth.users(id)` | `auth_id` | — | CASCADE | *(auto)* | `06_final_snapshot.sql:33` |
| FK-2 | `activity_logs.user_id` → `users(id)` | `user_id` | — | **SET NULL** | *(auto)* | `01_schema.sql:125` |
| FK-3 | `attendance_logs.student_nisn` → `students(nisn)` | `student_nisn` | CASCADE | CASCADE | *(auto)* | `01_schema.sql:48` |
| FK-4 | `class_history.student_nisn` → `students(nisn)` | `student_nisn` | CASCADE | CASCADE | *(auto)* | `01_schema.sql:90` |
| FK-5 | `book_loans.book_id` → `books(id)` | `book_id` | — | CASCADE | *(auto)* | `01_schema.sql:171` |
| FK-6 | `book_loans.student_nisn` → `students(nisn)` | `student_nisn` | CASCADE | CASCADE | **`book_loans_student_nisn_fkey`** | `01_schema.sql:172` |

**FK-1 is the migration-critical one.** It is a foreign key from a `public` table into the
**Supabase-managed `auth` schema**. That schema does not exist in a plain PostgreSQL instance. The
constraint cannot be recreated as written, and it cannot simply be dropped without deciding what
guarantees `users.auth_id` integrity afterwards.
→ [AUTH_MIGRATION.md](./AUTH_MIGRATION.md)

**FK-6's constraint name is load-bearing in application code.** See § 4.2.

**Cascade analysis** — `[INFERRED]` from the table above:

- `DELETE FROM students WHERE …` silently cascades to `attendance_logs`, `class_history`,
  `book_loans`, and `library_visits`. This is reachable from the UI: `src/views/SiswaView.vue:297`
  and `:446` issue `students` deletes. Deleting one student destroys their entire attendance and
  library history with no confirmation of that scope in the UI.
- `ON UPDATE CASCADE` on `student_nisn` (FK-3/4/6) exists so that correcting a NISN propagates. It
  implies the application may update `students.nisn`; `[REPO]` no code path currently does.
- `activity_logs.user_id` uses `ON DELETE SET NULL` (FK-2), so deleting a `users` row preserves
  the audit trail but anonymises it. `[INFERRED]` Note the asymmetry: the app's own reset
  functions delete logs outright (`src/views/PengaturanView.vue:293`) rather than relying on this.
- **No `ON DELETE RESTRICT` anywhere.** Nothing prevents a cascading delete.

### 1.5 Unique constraints

| ID | Table | Columns | File |
|---|---|---|---|
| U-1 | `users` | `username` | `01:14` |
| U-2 | `students` | `nisn` | `01:27` |
| U-3 | `attendance_logs` | `(date, student_nisn)` | `01:54` |
| U-4 | `academic_periods` | `(tahun_ajaran, semester)` | `01:77` |
| U-5 | `class_history` | `(student_nisn, tahun_ajaran)` | `01:96` |
| U-6 | `academic_periods` | `(is_active) WHERE is_active` — **partial unique index** `idx_one_active_period` | `01:81-83` |

U-3 is the constraint the attendance upsert depends on: `src/views/InputPresensiView.vue:218-225`
upserts attendance, and `[INFERRED]` idempotency per student-day relies entirely on U-3 existing.

U-6 is a **partial unique index enforcing a singleton-by-predicate invariant**. It is the cleanest
way to express "only one active period" and it ports to plain PostgreSQL unchanged — but it must be
recreated as an *index*, not as a table constraint, or the guarantee is silently lost.

`06_final_snapshot.sql:35-36` drops and re-adds `users_username_key` (U-1). `[INFERRED]` This is a
repair step for a state where the constraint had been lost — evidence the live schema has been
manually altered at least once.

### 1.6 Check constraints

| ID | Table | Expression | File |
|---|---|---|---|
| C-1 | `users` | `role IN ('Admin','Guru','Pustakawan')` | `01:17` |
| C-2 | `students` | `jk IN ('L','P')` | `01:29` |
| C-3 | `students` | `status IN ('aktif','lulus','pindah','keluar')` | `01:33` |
| C-4 | `attendance_logs` | `status IN ('Hadir','Izin','Sakit','Alfa')` | `01:49` |
| C-5 | `academic_calendar` | `status IN ('Masuk','Libur')` | `01:65` |
| C-6 | `academic_periods` | `semester IN ('Ganjil','Genap')` | `01:74` |
| C-7 | `app_settings` | `id = 1` | `01:104` |
| C-8 | `book_loans` | `status IN ('dipinjam','dikembalikan','terlambat','hilang')` | `01:176` |

**No enum types.** Every enumerated value is a `text` column with a `CHECK` constraint.
`[INFERRED]` This is favourable for migration: there is no `CREATE TYPE … AS ENUM` to recreate, and
no enum-ordering or `ALTER TYPE ADD VALUE` transaction restrictions to navigate. Adding a role
value is an `ALTER TABLE … DROP CONSTRAINT / ADD CONSTRAINT`, which the drift finding shows has
evidently already happened in production.

**C-1 is contradicted by live data.** See drift #5.

### 1.7 Indexes

Beyond the unique constraints in § 1.5, which are backed by indexes:

| ID | Index | Table | Columns | File | Purpose |
|---|---|---|---|---|---|
| IX-1 | `idx_students_kelas` | `students` | `(kelas)` | `01:39` | Class filtering (rekap, presensi) |
| IX-2 | `idx_students_status` | `students` | `(status)` | `01:40` | Active/graduated filtering |
| IX-3 | `idx_attendance_date` | `attendance_logs` | `(date)` | `01:56` | Daily/date-range queries |
| IX-4 | `idx_attendance_nisn` | `attendance_logs` | `(student_nisn)` | `01:57` | Per-student history |
| IX-5 | `idx_attendance_kelas` | `attendance_logs` | `(kelas)` | `01:58` | Class reports |
| IX-6 | `idx_one_active_period` | `academic_periods` | `(is_active) WHERE is_active` | `01:81` | Singleton active period |
| IX-7 | `idx_class_history_nisn` | `class_history` | `(student_nisn)` | `01:98` | Student history lookup |
| IX-8 | `idx_activity_user` | `activity_logs` | `(user_id)` | `01:132` | Filter log by user |
| IX-9 | `idx_activity_date` | `activity_logs` | `(created_at)` | `01:133` | Recent-first log view |
| IX-10 | `idx_book_loans_status` | `book_loans` | `(status)` | `01:182` | Outstanding-loan queries |
| IX-11 | `idx_book_loans_student` | `book_loans` | `(student_nisn)` | `01:183` | Per-student loan history |
| IX-12 | `idx_library_visits_tanggal` | `library_visits` | `(tanggal)` | `01:200`, `05:14` | Visit counting by date |
| IX-13 | `idx_library_visits_student` | `library_visits` | `(student_nisn)` | `01:201`, `05:15` | Duplicate-visit check |

**No index is declared on `book_loans.book_id`** despite `src/views/BukuView.vue:277` filtering by
it. See [VPS_REQUIREMENTS.md § Indexes needed](./VPS_REQUIREMENTS.md#34-indexes-required).

### 1.8 Views and materialised views

**None.** `[REPO]` The token `create view` / `create materialized view` appears zero times in
`supabase/*.sql`. All aggregation is performed in the browser (see
[VPS_REQUIREMENTS.md § Query complexity](./VPS_REQUIREMENTS.md)).

### 1.9 Functions

| ID | Function | Language | Security | File | Purpose |
|---|---|---|---|---|---|
| FN-1 | `public.set_updated_at()` | `plpgsql` | default (invoker) | `01_schema.sql:138-144` | Trigger fn: `NEW.updated_at = now()` |
| FN-2 | `public.get_my_role()` | `sql` | **`SECURITY DEFINER`** | `02_rls.sql:22-29` | RLS helper: role lookup for `auth.uid()` |
| FN-3 | `public.handle_new_user()` | `plpgsql` | **`SECURITY DEFINER`** | `06_final_snapshot.sql:39-73` | Trigger fn: provision `public.users` from `auth.users` metadata |
| FN-4 | `public.handle_delete_user()` | `plpgsql` | **`SECURITY DEFINER`** | `06_final_snapshot.sql:76-82` | Trigger fn: delete profile on auth deletion |

**FN-2 is the pivot of the entire authorization model.** It is `SECURITY DEFINER` specifically to
bypass RLS on `public.users` and avoid infinite recursion when a `users` policy calls it
(`02_rls.sql:21`). It reads `auth.uid()`.

**FN-3 / FN-4 are the only functions that touch the `auth` schema.** `06_final_snapshot.sql`
explicitly *drops* four earlier sync functions/triggers before installing these
(`06:7-14`), which is further evidence of schema churn that the repository only partially records.

`[INFERRED]` **`SECURITY DEFINER` functions are a migration hazard independent of Supabase.**
`SECURITY DEFINER` executes with the privileges of the function *owner*. On a self-hosted
PostgreSQL the owner is whoever ran the DDL — likely a superuser or the migration user. That
silently turns FN-2 into a privilege-escalation surface if it is ever reachable by an
untrusted role. Supabase's managed setup gave every function the same owner, so this risk
currently exists but is not expressible; on a self-hosted VPS it becomes an explicit design
decision (`SECURITY DEFINER` + `search_path` pinning).

### 1.10 Triggers

| ID | Trigger | Table | Timing/Event | Calls | File |
|---|---|---|---|---|---|
| TG-1 | `trg_attendance_updated_at` | `public.attendance_logs` | BEFORE UPDATE, FOR EACH ROW | FN-1 | `01:146-149` |
| TG-2 | `trg_book_loans_updated_at` | `public.book_loans` | BEFORE UPDATE, FOR EACH ROW | FN-1 | `01:185-188` |
| TG-3 | `on_auth_user_created` | **`auth.users`** | AFTER INSERT, FOR EACH ROW | FN-3 | `06:62-64` |
| TG-4 | `on_auth_user_deleted` | **`auth.users`** | AFTER DELETE, FOR EACH ROW | FN-4 | `06:75-77` |

TG-1 and TG-2 port to plain PostgreSQL unchanged.

**TG-3 and TG-4 are attached to a Supabase-managed table in a Supabase-managed schema.** They
cannot be recreated on a self-hosted instance, because `auth.users` will not exist. The behaviour
they implement — "creating an account provisions a profile row" — is business logic that lives
*inside the database* today and has no home after migration unless it is reimplemented in the new
backend. This is the concrete reason the account-provisioning flow (S-5) cannot be a
configuration change.

Also note `[INFERRED]`: TG-3 is `SECURITY DEFINER` and inserts into `public.users` while that table
has RLS enabled. It works only because `SECURITY DEFINER` bypasses RLS. Any reimplementation must
preserve an equivalent privilege path, or account creation breaks.

### 1.11 Extensions

Phase 8. One extension is declared:

| Extension | Declared in | Used by | Required? | On standard PostgreSQL? | Alternative | VPS compatibility |
|---|---|---|---|---|---|---|
| `pgcrypto` | `01_schema.sql:7` | `gen_random_uuid()` as default on 9 PKs + `auth` plumbing | Functionally yes; **this extension specifically, no** | `gen_random_uuid()` is **built into core PostgreSQL ≥ 13** | Nothing needed — drop the extension if PG ≥ 13 | **CONFIRMED** available, but **likely unnecessary** |

`[INFERRED]` `gen_random_uuid()` was added to PostgreSQL core in version 13. Every target VPS
today runs ≥ 13, so `pgcrypto` is most likely vestigial — it originates from an era when
`gen_random_uuid()` required it. `pgcrypto` remains available on every mainstream distribution
(`postgresql-contrib` package), so declaring it is harmless either way.

**No other extension is declared.** In particular the repository uses **no** `uuid-ossp`,
`pg_stat_statements`, `pg_trgm`, `postgis`, `vector`, or `pg_cron`.

⚠️ `[UNKNOWN]` **The set of extensions actually installed in the live Supabase database cannot be
determined from the repository.** Supabase pre-installs a number of extensions by default, and the
live database may carry extensions that the repository never declares. This must be verified with
`SELECT * FROM pg_extension;` against the live database before the target environment is specified.
`UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION`

### 1.12 RLS policies

Summarised here for completeness; analysed in full in [RLS_MIGRATION.md](./RLS_MIGRATION.md).

| Scope | Policy | Tables | Operation | Predicate | File |
|---|---|---|---|---|---|
| Read | `Authenticated_Select` | `students`, `academic_calendar`, `academic_periods`, `app_settings`, `books`, `users` | SELECT | `USING (true)`, `TO authenticated` | `02:53-58` |
| Audit | `Auth_Insert_ActivityLogs` | `activity_logs` | INSERT | `WITH CHECK (true)`, `TO authenticated` | `02:61-63` |
| Admin | `Admin_All_<table>` × 11 | all 11 tables | ALL | `get_my_role() = 'Admin'` | `02:76-84` |
| Guru | `Guru_Manage_Absensi` | `attendance_logs` | ALL | `get_my_role() IN ('Guru','Guru & Pustakawan')` | `02:88-92` |
| Library | `Perpus_Manage_Buku` | `books` | ALL | `get_my_role() IN ('Pustakawan','Guru & Pustakawan')` | `02:95-99` |
| Library | `Perpus_Manage_Loans` | `book_loans` | ALL | idem | `02:102-105` |
| Library | `Perpus_Manage_Visits` | `library_visits` | ALL | idem | `02:108-111` |
| **Legacy** | `allow_all_library_visits` | `library_visits` | ALL | `USING (true) WITH CHECK (true)`, **`TO anon, authenticated`** | `05:19-21` |
| Storage | `assets_public_read` | `storage.objects` | SELECT | `bucket_id = 'assets'`, `TO public` | `03:12-15` |
| Storage | `assets_anon_write` | `storage.objects` | INSERT | `bucket_id = 'assets'`, `TO anon, authenticated` | `03:17-20` |
| Storage | `assets_anon_update` | `storage.objects` | UPDATE | idem | `03:22-26` |
| Storage | `assets_anon_delete` | `storage.objects` | DELETE | idem | `03:28-31` |

`[INFERRED]` Policies in PostgreSQL are **additive (OR-ed)**. `[REPO]` The repository's own
documentation states this twice (`docs/database.md:96`, `SECURITY.md:27`). It means the legacy
`allow_all_library_visits` policy at `05:19` — which grants `anon` full access — *completely
neutralises* the strict `Perpus_Manage_Visits` policy if both are present. Whether it is still
present in production is **`UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION`**.

### 1.13 Storage dependencies

Covered in [STORAGE_MIGRATION.md](./STORAGE_MIGRATION.md). Inventory entry:

| Object | Type | File | Purpose | Migration risk |
|---|---|---|---|---|
| bucket `assets` | PUBLIC bucket | `03_storage.sql:7-9` | School logo storage | **HIGH** — Supabase Storage API has no PostgreSQL equivalent |
| `storage.objects` policies ×4 | RLS policies (Supabase-managed table) | `03_storage.sql:12-31` | Access control for the bucket | **HIGH** — attached to a Supabase-managed table |

### 1.14 Auth dependencies

Covered in [AUTH_MIGRATION.md](./AUTH_MIGRATION.md). Inventory summary:

| Object | Type | File | Migration risk |
|---|---|---|---|
| `auth.users` (external schema) | Supabase-managed table | referenced `06:24`, `06:38`, `06:62`, `06:75` | **CRITICAL** |
| `auth.identities` (external schema) | Supabase-managed table | referenced `06:17`, `06:19` | **CRITICAL** |
| FK `users.auth_id → auth.users(id)` | FK into managed schema | `06:24` | **CRITICAL** |
| Trigger `on_auth_user_created` | Trigger on managed table | `06:62-64` | **CRITICAL** |
| Trigger `on_auth_user_deleted` | Trigger on managed table | `06:75-77` | **CRITICAL** |
| `auth.uid()` | Supabase-provided SQL function | `02:27` | **CRITICAL** |
| Database roles `anon`, `authenticated` | Supabase-managed roles | `02` (throughout), `03:18-31` | **CRITICAL** |

---

## 2. Dependency graph (Phase 2)

Built from FK definitions in § 1.4 and the `auth_id` link at `06_final_snapshot.sql:33`.

### 2.1 Authentication domain

```
        ┌─────────────────────────────────┐
        │  auth.users      (MANAGED)      │  ← does not exist off Supabase
        │  auth.identities (MANAGED)      │
        └───────────────┬─────────────────┘
                        │ FK-1  users.auth_id → auth.users(id)  ON DELETE CASCADE
                        │ TG-3  AFTER INSERT  → provisions profile
                        │ TG-4  AFTER DELETE  → removes profile
                        ▼
                 ┌─────────────┐
                 │ public.users│◀─── FN-2 get_my_role() reads users.role
                 └──────┬──────┘     (SECURITY DEFINER, uses auth.uid())
                        │ FK-2  ON DELETE SET NULL
                        ▼
               ┌─────────────────┐
               │ activity_logs   │  ← written by nearly every mutation
               └─────────────────┘
```

### 2.2 Attendance domain

```
                 ┌────────────────┐
                 │ public.students│  nisn (UNIQUE) is the real business key
                 └───┬────┬───┬───┘
      FK-3 cascade   │    │   │   FK-4 cascade
   ┌─────────────────┘    │   └──────────────────┐
   ▼                      │ FK-6 cascade         ▼
┌──────────────────┐      │            ┌───────────────────┐
│ attendance_logs  │      │            │  class_history    │
│ UNIQUE(date,nisn)│      │            │ UNIQUE(nisn,tahun)│
└────────┬─────────┘      │            └───────────────────┘
         │                │ FK-6 cascade
         │                ▼
         │        ┌────────────────┐        FK-5 cascade
         │        │  book_loans    │◀──────────────────────┐
         │        └────────────────┘                       │
         │                ▲ FK-3 cascade                  │
         │                │                               │
         │        ┌────────────────┐              ┌──────────────┐
         │        │ library_visits │              │ public.books │
         │        └────────────────┘              └──────────────┘
         │
         │  (no FK — joined by string convention)
         ▼
┌────────────────────┐
│  academic_calendar │  date PK — attendance.date NOT constrained against it
└────────────────────┘

Standalone:  app_settings (singleton)   academic_periods (singleton-active)
```

### 2.3 The derived-statistics layer

The application has no `rekap`/`statistik` tables and no views. `[REPO]` Aggregation is computed
in the browser from base tables, which creates this *implicit* dependency graph — the one that
determines query load:

```
DashboardView       ← students, attendance_logs, academic_calendar, activity_logs
RekapView           ← students, attendance_logs, academic_calendar, activity_logs, users
RekapSemesterView   ← students, attendance_logs, academic_calendar, activity_logs, users
StatistikView       ← students, attendance_logs, academic_calendar, activity_logs
DashboardPerpusView ← books, book_loans, library_visits
RekapPerpusView     ← book_loans, library_visits, books, students
```

`activity_logs` participating in **statistics** rather than only in auditing is the single most
surprising dependency in the schema — see § 4.3.

### 2.4 Order-sensitive relationships

| # | Relationship | Why order matters | Risk |
|---|---|---|---|
| O-1 | `auth.users` → `users` | FK-1 requires the referenced table to exist *before* `ALTER TABLE … ADD COLUMN auth_id`. TG-3/TG-4 attach *after* the table exists | **CRITICAL** |
| O-2 | `students` → `attendance_logs` / `class_history` / `book_loans` / `library_visits` | `students(nisn)` must be UNIQUE and populated before any child FK is satisfiable. Data must load parent-first | **HIGH** |
| O-3 | `books` → `book_loans` | Same, for FK-5 | MEDIUM |
| O-4 | `users` → `activity_logs` | FK-2 is nullable (`SET NULL`), so children can load first — but then `user_id` is permanently null and audit identity is lost | MEDIUM |
| O-5 | `academic_periods` partial unique index | Installing the index while two rows have `is_active = true` **fails**. Data must be normalised before the index | HIGH |
| O-6 | `library_visits` duplicate definition | If `01_schema.sql` runs before `05_library_visits.sql`, the RLS policy from `05` is *added*; if reversed, `05`'s table wins and `01`'s indexes are added to it | **HIGH** |
| O-7 | `handle_new_user()` depends on `users.username` UNIQUE | Its `ON CONFLICT (username) DO UPDATE` (`06:55`) requires U-1 to exist first (`06:25-26` re-adds it) | HIGH |
| O-8 | `get_my_role()` before any policy using it | `02:53-58` policies do not call it, but `02:76-84` do; the function is created at `02:22` | MEDIUM |

### 2.5 Circular dependencies

**None.** `[REPO]` The FK graph in § 1.4 is a DAG. `[INFERRED]` The one *apparent* cycle is
`users ↔ users`-via-RLS: a policy on `users` that reads `users.role` would recurse. That is
precisely why FN-2 is `SECURITY DEFINER` (`02:21` comment: *"Bypass RLS — tanpa memicu Infinite
Recursion"*). It is a self-reference resolved by privilege escalation, not by schema structure.

### 2.6 Cascade-delete map

`[INFERRED]` There is **one** entry point for the widest blast radius:

```
DELETE FROM students WHERE id = ?
   ├── attendance_logs   (all historical attendance for that student)
   ├── class_history     (all yearly snapshots)
   ├── book_loans        (all loan records, incl. outstanding)
   └── library_visits    (all visit history)
```

Reachable from the UI without warning about the dependent scope:
`src/views/SiswaView.vue:297` (bulk `.in('id', selectedIds)`) and `:446` (single delete).

`[INFERRED]` Notably, `book_loans` deletion via cascade does **not** restore `books.stok`. Stock is
a manually maintained integer (`01:161`) with no trigger linking it to loans. Deleting a student
therefore permanently loses the record that N copies were outstanding while leaving `stok`
unchanged — a pre-existing data-integrity gap that a migration would faithfully reproduce.

---

## 3. Functions, triggers, and views — migration assessment (Phase 7)

| ID | Name | Type | Called by | Tables touched | Supabase dependency | Runs on plain PostgreSQL? | Migration risk |
|---|---|---|---|---|---|---|---|
| FN-1 | `set_updated_at()` | trigger fn | TG-1, TG-2 | `attendance_logs`, `book_loans` | **None** | ✅ **Yes, verbatim** | LOW |
| FN-2 | `get_my_role()` | SQL fn, `SECURITY DEFINER` | every write policy | `users` | **`auth.uid()`** `02:27` | ⚠️ Body must be rewritten | **CRITICAL** |
| FN-3 | `handle_new_user()` | trigger fn, `SECURITY DEFINER` | TG-3 | `users` | **`NEW.email`, `NEW.raw_user_meta_data`** (Supabase `auth.users` shape) `06:41-43` | ❌ **No** — trigger cannot exist | **CRITICAL** |
| FN-4 | `handle_delete_user()` | trigger fn, `SECURITY DEFINER` | TG-4 | `users` | trigger target is `auth.users` | ❌ **No** | HIGH |
| — | **views** | — | — | — | — | *(none exist)* | — |
| — | **materialised views** | — | — | — | — | *(none exist)* | — |

### 3.1 Function-by-function notes

**FN-1 `set_updated_at()`** — `plpgsql`, default security, no schema qualification issues, no
Supabase dependency. Copies over unchanged. `[INFERRED]` Recommend pinning `search_path` when
recreating for hygiene, though the function body references nothing schema-local.

**FN-2 `get_my_role()`** — The body is one line:
`SELECT role FROM public.users WHERE auth_id = auth.uid();` (`02:27`). It ports only if `auth.uid()`
has a replacement. Under any of the three architecture options this becomes a re-expression of
"who is the current user" in whatever the new session model is.
**Not portable as-is.** → [RLS_MIGRATION.md](./RLS_MIGRATION.md)

**FN-3 `handle_new_user()`** — Reads `NEW.email` and `NEW.raw_user_meta_data->>'nama' | 'role' |
'kelas' | 'nip'` (`06:41-43`). `raw_user_meta_data` is a **Supabase-specific column** on
`auth.users`; its contents are populated from the `options.data` payload sent by
`src/views/GuruView.vue:205-206`, and it carries `nip` — a column the repository SQL never declares
(see drift #1). This function is therefore both Supabase-coupled *and* a live witness to the schema
drift. Its `ON CONFLICT (username) DO UPDATE` branch (`06:55-58`) is an *upsert-by-username*
reconciliation that the new backend must reproduce deliberately, because dropping it changes
behaviour on username reuse.
**Cannot be migrated. Must be reimplemented in the backend.**

**FN-4 `handle_delete_user()`** — Deletes `public.users WHERE auth_id = OLD.id` (`06:70`).
Same verdict as FN-3. `[INFERRED]` Under FK-1's `ON DELETE CASCADE` (`06:24`) this function is
arguably **redundant** — deleting `auth.users` cascades to `public.users` already. It may be
defensive residue. Worth confirming before reimplementing it at all.

### 3.2 Trigger assessment

| Trigger | Verdict | Note |
|---|---|---|
| TG-1, TG-2 | ✅ Port verbatim | Pure `updated_at` maintenance |
| TG-3, TG-4 | ❌ Cannot exist | Attached to Supabase-managed `auth.users` |

`[INFERRED]` The loss of TG-3 has a concrete user-visible consequence: today, creating an account
in `GuruView` triggers an `INSERT` into `auth.users`, which fires TG-3, which writes
`public.users`. Remove TG-3 and **account creation silently stops producing a usable profile** —
the auth user would exist but could not log in, because `auth.js:37` resolves the profile by
`auth_id`. Nothing in the UI would report an error. This must be an explicit step in the new
backend, not an afterthought.

---

## 4. Structural hazards found

### 4.1 Duplicate `library_visits` definition with a conflicting policy

| Aspect | `01_schema.sql:193-201` | `05_library_visits.sql:6-15` |
|---|---|---|
| Table DDL | identical (`if not exists`) | identical (`if not exists`) |
| Indexes | identical | identical |
| `ENABLE RLS` | via `02_rls.sql:19` | `05:17` |
| Policy | — | `allow_all_library_visits` → `TO anon, authenticated USING (true)` `05:19-21` |

`[REPO]` The repository documents this as historical and states the permissive policy should not
be present (`docs/database.md:19`, `supabase/README.md`). Because policies are additive, **if
`05_library_visits.sql` was ever executed and the policy never dropped, `library_visits` is
currently readable and writable by anyone holding the public anon key** — regardless of the strict
RLS in `02_rls.sql`.

> **Status: `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION.`**
> Verify with:
> `SELECT polname, polroles::regrole[], pg_get_expr(polqual, polrelid), pg_get_expr(polwithcheck, polrelid)`
> `FROM pg_policy WHERE polrelid = 'public.library_visits'::regclass;`

This is a **pre-migration security finding**, not a migration blocker, but the migration plan must
not carry the policy forward, and the live state must be recorded before cutover so the new
environment can be proven *no more* permissive.

### 4.2 A hard-coded, auto-generated FK constraint name in application code

`src/views/BukuView.vue:274`:

```js
.select('*, students!book_loans_student_nisn_fkey(nama, kelas)')
```

PostgREST's `!<constraint_name>` syntax disambiguates an embedded resource by naming the FK
constraint explicitly. `book_loans_student_nisn_fkey` is Postgres's **auto-generated** name for
FK-6 (table `book_loans`, column `student_nisn`). It is not written anywhere in `supabase/*.sql`.

`[INFERRED]` Consequences for migration:

1. If the target schema creates FK-6 with a different name, this query fails.
2. There is a **fallback** at `BukuView.vue:280-283`: on error it retries with a plain
   `students(nama, kelas)` embed. So the failure is *non-fatal* — it degrades silently to the
   ambiguous form, which works only while exactly one FK path exists between the two tables.
3. The existence of the fallback means this bug would **not surface in testing** unless the
   fallback path is also broken.

`[INFERRED]` This is a small but exemplary instance of the general problem: the application
depends on **PostgREST semantics and Postgres auto-generated identifiers**, not just on SQL data.

### 4.3 `activity_logs.record_id` is a string-encoded composite used as a query key

Where the schema declares `record_id text` (`01_schema.sql:128`), the application encodes **two
values** into it:

| Writer | Value written | Evidence |
|---|---|---|
| `InputPresensiView` | `` `${tanggal}:${kelas}` `` | `src/views/InputPresensiView.vue:173`, `:200` |
| `DashboardView` (read) | `like('record_id', `${today}:%`)` | `src/views/DashboardView.vue:117` |
| `DashboardView` (read) | `gte('record_id', startDate)`, `lte('record_id', endDate + '~')` | `src/views/DashboardView.vue:200` |
| `RekapView` (read) | `like('record_id', `%:${kelas}`)` | `src/views/RekapView.vue:95` |
| `RekapSemesterView` (read) | `like('record_id', `%:${kelas}`)` | `src/views/RekapSemesterView.vue:82` |
| `StatistikView` (read) | `a.record_id.split(':')` | `src/views/StatistikView.vue:67` |

`[INFERRED]` Three implications:

1. **`activity_logs` is on the reporting critical path.** Attendance "was this class submitted
   today?" is answered by reading the *audit log*, not `attendance_logs`. This contradicts the
   natural reading of `activity_logs` as a passive audit trail and means the audit table cannot be
   archived, pruned, or reset without corrupting reports. The app's own reset function
   (`PengaturanView.vue:293`) deletes these rows wholesale — which would make every class appear
   "not yet submitted".
2. **`LIKE '%:kelas'` cannot use the `idx_activity_date` index** (`01:133`) and is not
   index-friendly in general. See [VPS_REQUIREMENTS.md](./VPS_REQUIREMENTS.md).
3. **Date-range-by-string comparison** (`endDate + '~'`, where `~` = 0x7E sorts after all digits)
   is a lexicographic hack that happens to work for ISO-8601 and would break for any other date
   format. It is a **behaviour a reimplementation must preserve exactly**, or report counts change.

`[INFERRED]` This is the clearest candidate for schema normalisation *during* migration (splitting
`record_id` into typed columns). Doing so is a behaviour change and must be paired with the
report-level tests in [TEST_PLAN.md](./TEST_PLAN.md).

### 4.4 Denormalised columns with no referential integrity

| Column | Table | What it duplicates | Guarded by |
|---|---|---|---|
| `kelas` | `attendance_logs` `01:52` | `students.kelas` at time of entry | nothing |
| `guru_input` | `attendance_logs` `01:53` | `users.nama` | nothing (free text) |
| `guru_input` | `book_loans` `01:178` | `users.nama` | nothing (free text) |
| `wali_kelas` | `class_history` `01:93` | `users.nama` | nothing (snapshot, intentionally) |
| `kelas` | `attendance_logs` | — | **no FK, no CHECK, no index beyond IX-5** |

`[INFERRED]` `attendance_logs.kelas` is a deliberate historical snapshot: a student moving from
class 3 to 4 must not rewrite history. That is defensible. But it means `attendance_logs.kelas`
and `students.kelas` **legitimately disagree** for historical rows — which is why
`RekapView.vue:92-95` filters *both* by `kelas` directly on `attendance_logs` rather than joining
through `students`. A migration that "normalises" this would silently change historical reports.

### 4.5 No timestamp normalisation guarantee

All timestamps are `timestamptz` (`users.created_at`, `students.created_at`,
`attendance_logs.created_at/updated_at`, `activity_logs.created_at`, `books.created_at`,
`book_loans.created_at/updated_at`, `academic_periods.created_at`, `app_settings.updated_at`).

`[INFERRED]` `timestamptz` stores an absolute instant, so it is timezone-safe by construction and
ports without conversion. **However** `src/views/PengaturanView.vue:396` renders timestamps via
`new Date(l.created_at).toLocaleString('id-ID')` — presentation depends on the *browser's* locale
and timezone, not the database's. The VPS timezone setting therefore does not affect display, but
it **does** affect `now()` for any server-side default computed after migration, and it affects
WAL/backup timestamping. Recommend `UTC` on the VPS and no conversion of stored data.

---

## 5. Schema drift — repo SQL ≠ live database

**This is the most important finding in this audit.**

The repository's SQL **cannot** produce a database the application can run against. Four columns
that application code reads are absent from every SQL file in `supabase/`, and one value that code
writes violates a `CHECK` constraint the repository declares. Because the live database evidently
has all of these, the live schema has drifted from the repository, and **the drift is recorded
nowhere**.

### Drift #1 — `public.users.nip`

| Evidence | Detail |
|---|---|
| Read by app | `src/views/GuruView.vue:153` — `.select('id, username, nama, role, kelas, nip')` |
| Read by app | `src/views/RekapView.vue:128` — `.select('nama, nip')` |
| Read by app | `src/views/RekapSemesterView.vue:126` — `.select('nama, nip')` |
| Written by app | `src/views/GuruView.vue:193` — `nip: form.value.nip \|\| null` |
| Sent to auth metadata | `src/views/GuruView.vue:206` — `data: { …, nip: payload.nip }` |
| Consumed in SQL | `supabase/06_final_snapshot.sql:46` — `NEW.raw_user_meta_data->>'nip'`… actually reads `'kelas'` at `:46`; `nip` is in the metadata payload but **FN-3's INSERT column list at `06:46-53` omits it** |
| Declared in repo SQL | ❌ **NO** — absent from `01_schema.sql` and every other file |
| Documented | ✅ `docs/database.md:26` lists `nip` as a `users` column |

`[INFERRED]` `nip` exists in the live `public.users` table. It also reveals a **second-order
inconsistency**: FN-3 accepts `nip` in the metadata payload but does not insert it, so
account creation via `GuruView` would produce a `users` row with `nip = NULL` regardless of what
was entered — unless the live `handle_new_user()` differs from `06_final_snapshot.sql`, which is
`[UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION]`.

### Drift #2 — `public.students.tanggal_lahir`

| Evidence | Detail |
|---|---|
| Read by app | `src/views/SiswaView.vue:158` — `.select('id, nisn, nama, tanggal_lahir, kelas')` |
| Written by app | `src/views/SiswaView.vue:363`, `:381` — `tanggal_lahir: form.value.tanggal_lahir \|\| null` |
| Exported | `src/views/SiswaView.vue:93` |
| Used on printed cards | `src/views/CetakKartuView.vue:162`, `:376` |
| Declared in repo SQL | ❌ **NO** |

### Drift #3 — `public.students.tempat_lahir`

| Evidence | Detail |
|---|---|
| Used on printed cards | `src/views/CetakKartuView.vue:162`, `:376` — `getTTL(s.tempat_lahir, s.tanggal_lahir)` |
| Declared in repo SQL | ❌ **NO** |
| Note | `SiswaView.vue` does **not** read or write this column — inconsistency between the student editor and the card printer |

### Drift #4 — `public.app_settings.favicon_url`

| Evidence | Detail |
|---|---|
| Read by app | `src/stores/settings.js:29` — `favicon_url: defaultData.favicon_url \|\| ''` |
| Declared in repo SQL | ❌ **NO** — `01_schema.sql:103-121` declares 12 columns, not this one |
| Note | `[INFERRED]` The settings UI writes the whole form via `upsert({ id: 1, ...form.value })` (`PengaturanView.vue:101`), so if `favicon_url` is in `form`, it *is* written. `[UNKNOWN]` whether the live column exists — if it does not, the upsert would error, so it almost certainly does |

### Drift #5 — role value `'Guru & Pustakawan'` violates declared CHECK constraint

| Evidence | Detail |
|---|---|
| Declared constraint | `01_schema.sql:17` — `check (role in ('Admin', 'Guru', 'Pustakawan'))` — **three** values |
| Handled by app | `src/stores/auth.js:30` — `role === 'Pustakawan' \|\| role === 'Guru & Pustakawan'` |
| Handled by app | `src/stores/auth.js:32` — `role === 'Guru' \|\| role === 'Guru & Pustakawan'` |
| Offered in UI | `src/views/GuruView.vue:58` — `roleTone = { …, 'Guru & Pustakawan': 'primary' }` |
| Offered in UI | `src/views/GuruView.vue:256` — `<option value="Guru & Pustakawan">` |
| Used in RLS | `supabase/02_rls.sql:92, 99, 105, 111` — `get_my_role() IN ('Guru', 'Guru & Pustakawan')` etc. |
| Used in queries | `src/views/PengaturanView.vue:189` — `.in('role', ['Guru', 'Guru & Pustakawan'])` |
| Documented | ✅ `docs/authentication.md:14` — *"Role yang ada: Admin, Guru, Pustakawan, Guru & Pustakawan"*; `README.md` role matrix |

**This is conclusive.** The application and the RLS policies treat `'Guru & Pustakawan'` as a
valid role, and the repository's own documentation lists it as one of four roles — yet
`01_schema.sql:17` permits only three. Therefore the live `users` CHECK constraint **must differ**
from the repository, or every write of that role would have failed.

Consequence: **the repository's SQL is not a faithful description of production**, and the true
constraint set is `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION`.

### Drift #6 — `library_visits` defined twice

See § 4.1. Table structure agrees; RLS policy does not.

### Drift #7 — dropped functions nothing in the repository accounts for

`06_final_snapshot.sql:4-13` drops `trg_sync_user_to_auth`, `sync_user_to_auth()`,
`trg_delete_user_from_auth`, `delete_user_from_auth()`, `handle_new_user()`,
`handle_delete_user()`, `on_auth_user_created`, `on_auth_user_deleted`.

`[INFERRED]` `sync_user_to_auth()` and `delete_user_from_auth()` were **reverse**-direction
synchronisers (public → auth) that no longer exist. They are not defined in any repository file —
they existed only in the live database. This is direct evidence that SQL was executed against
production that was never committed here.

### Drift #8 — `06_final_snapshot.sql` performs destructive operations

Rewriting this file to describe a clean environment is impossible, because it **is not** a schema
script — it is a one-off repair script containing:

| Statement | Line | Effect |
|---|---|---|
| `DELETE FROM auth.identities WHERE … @minblora.com` | `06:17` | Destroys auth identities |
| `DELETE FROM auth.users WHERE email LIKE '%@minblora.com'` | `06:18` | Destroys auth accounts |
| `DELETE FROM auth.identities WHERE … @minblora.local` | `06:19` | idem, older virtual domain |
| `DELETE FROM auth.users WHERE email LIKE '%@minblora.local'` | `06:20` | idem |
| `TRUNCATE TABLE public.users CASCADE` | `06:21` | **Deletes every profile row** |
| `ALTER TABLE public.users DROP CONSTRAINT users_username_key` | `06:25` | Drops then re-adds UNIQUE |
| `ALTER TABLE public.users ADD CONSTRAINT users_username_key UNIQUE (username)` | `06:26` | |

`[INFERRED]` **Do not run `06_final_snapshot.sql` against anything.** It is retained as a record of
what was done, not as a deployable script. Any attempt to reconstruct the schema by running the
`supabase/` directory in order would **truncate the `users` table** and delete auth accounts.

**This is the single most dangerous instruction in the repository** for anyone approaching the
migration task naively. It must be called out explicitly in any handover.

### Drift summary and required action

| # | Item | Repo SQL | Live (inferred) | Verify with |
|---|---|---|---|---|
| 1 | `users.nip` | absent | present | `\d public.users` |
| 2 | `students.tanggal_lahir` | absent | present | `\d public.students` |
| 3 | `students.tempat_lahir` | absent | present | `\d public.students` |
| 4 | `app_settings.favicon_url` | absent | present | `\d public.app_settings` |
| 5 | `users.role` CHECK | 3 values | ≥ 4 values | `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public.users'::regclass` |
| 6 | `library_visits` policy | conflicting | unknown | `SELECT * FROM pg_policy WHERE polrelid='public.library_visits'::regclass` |
| 7 | historical functions | undefined | dropped | `SELECT proname FROM pg_proc WHERE pronamespace='public'::regnamespace` |
| 8 | `06_final_snapshot.sql` | destructive | — | *(do not run)* |

> **Action required before any design work:** take a full schema-only dump of the live database and
> reconcile it against `supabase/*.sql`. The output of that reconciliation — not this repository —
> becomes the input to stage S-2. See
> [DATA_MIGRATION_PLAN.md § 0](./DATA_MIGRATION_PLAN.md#0-prerequisite-close-the-schema-drift).

---

## Appendix A — Object count summary

| Category | Count | Source |
|---|---|---|
| Tables | 11 | `grep -c "create table" supabase/01_schema.sql` |
| Schemas referenced | 3 (`public`, `auth`, `storage`) | `01`, `02`, `03`, `06` |
| Columns declared (repo SQL only) | 88 | derived from `01_schema.sql` + `06:24` |
| Columns used but undeclared | **4** | § 5, drift #1–#4 |
| Primary keys | 11 | § 1.3 |
| Foreign keys | 6 | § 1.4 |
| Foreign keys into Supabase-managed schemas | **1** (`FK-1`) | `06:24` |
| Unique constraints / indexes | 6 | § 1.5 |
| Non-unique secondary indexes | 13 | § 1.7 |
| Check constraints | 8 | § 1.6 |
| Views / materialised views | **0** | § 1.8 |
| Functions | 4 | § 1.9 |
| …of which `SECURITY DEFINER` | **3** (FN-2, FN-3, FN-4) | § 1.9 |
| Triggers | 4 | § 1.10 |
| …of which on Supabase-managed tables | **2** (TG-3, TG-4) | § 1.10 |
| Extensions declared | 1 (`pgcrypto`) | `01:7` |
| RLS-enabled tables | 11 of 11 | `02:9-19` |
| RLS policies (application tables) | **22** | `02`: 6 explicit `Authenticated_Select` + 1 `Auth_Insert_ActivityLogs` + **11 loop-generated** `Admin_All_<table>` (one per table) + `Guru_Manage_Absensi` + 3 `Perpus_*` |
| RLS policies (storage) | 4 | `03:12-31` |
| RPC calls from the app | **0** | § 3, grep |
| Storage buckets | 1 (`assets`) | `03:7-9` |
| Realtime subscriptions | 1 | `DashboardView.vue:300-302` |
| Edge Functions | **0** | no `supabase/functions/` |

## Appendix B — Domain glossary (EN/ID)

Terms are the **actual identifiers** used in schema and code; they are not translated anywhere in
the migration, because renaming would touch every query.

| Term | Meaning | Where |
|---|---|---|
| `presensi` | Attendance | table `attendance_logs`, views `InputPresensiView`, `RekapView` |
| `siswa` | Student / pupil | table `students` |
| `guru` | Teacher | `users` where `role = 'Guru'` |
| `pustakawan` | Librarian | `users` where `role = 'Pustakawan'` |
| `kelas` | Class / homeroom group | `students.kelas`, `users.kelas`, `attendance_logs.kelas` |
| `wali kelas` | Homeroom teacher | `users.kelas` assignment; `class_history.wali_kelas` |
| `nisn` | National student ID number | `students.nisn` — **the real business key**, referenced by 3 FKs |
| `nip` | Teacher employee ID number | `users.nip` — **not in repo SQL** (drift #1) |
| `rekap` | Recapitulation / summary report | `RekapView`, `RekapSemesterView`, `RekapPerpusView` |
| `Hadir` / `Izin` / `Sakit` / `Alfa` | Present / excused / sick / absent-without-notice | `attendance_logs.status` CHECK `01:49` |
| `Masuk` / `Libur` | School day / holiday | `academic_calendar.status` CHECK `01:65` |
| `tahun ajaran` | Academic year, e.g. `2025/2026` | `academic_periods.tahun_ajaran` |
| `semester` | `Ganjil` (odd) / `Genap` (even) | `academic_periods.semester` CHECK `01:74` |
| `sirkulasi` | Library circulation | `book_loans`, `PeminjamanView` |
| `kunjungan` | Library visit | `library_visits`, `KunjunganPerpusView`, `ScanQRView` |
| `madrasah` | Islamic school | `app_settings.nama_sekolah` |
| `kop` | Letterhead (PDF header) | `app_settings.kop_baris2`…`kop_baris5` `01:114-117` |
| `kenaikan kelas` | Year-end class promotion | `PengaturanView.jalankanKenaikan()` `:175` |
