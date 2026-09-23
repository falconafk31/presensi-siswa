# Supabase Dependencies

**Phases covered: 3 (dependency classification), 6 (application data access), 10 (realtime), 11 (Edge Functions / API).**

The repository was scanned for every Supabase coupling named in the brief. Negative results are
reported as **zero**, not omitted, because a dependency that is absent is as important to the plan
as one that is present.

---

## 1. Scan results — raw

| Token searched | Files | Occurrences | Where |
|---|---|---|---|
| `supabase` | **25** | — | files under `src/**` that reference the client |
| `createClient` | **2** | **4** (2 imports + 2 call sites) | `src/lib/supabase.js:1,12`, `src/views/GuruView.vue:8,19` |
| `.from(` → PostgREST query builder | **22** | **102** | see § 6 |
| `supabase.auth.*` | 2 | 6 | `src/stores/auth.js` (4), `src/views/LoginView.vue` (2) |
| `supabase.storage.*` | 1 | 2 | `src/views/PengaturanView.vue:121,123` |
| `.rpc(` | **0** | **0** | — |
| `supabase.functions.invoke` | **0** | **0** | — |
| `supabase/functions/` (Edge Functions dir) | **0** | — | directory does not exist |
| `channel(` | 1 | 1 | `src/views/DashboardView.vue:300` |
| `postgres_changes` | 1 | 1 | `src/views/DashboardView.vue:301` |
| `.on(` (realtime) | 1 | 1 | idem |
| `broadcast` | **0** | **0** | — |
| `presence` | **0** | **0** | — |
| `storage.from` | 1 | 2 | `src/views/PengaturanView.vue:121,123` |
| `getPublicUrl` | 1 | 1 | `src/views/PengaturanView.vue:123` |
| `createSignedUrl` | **0** | **0** | — |
| Generated Supabase types (`database.types.ts`) | **0** | — | no `types.ts`, no `supabase gen types` output in repo |
| `select(`, `insert(`, `update(`, `upsert(`, `delete(` | 22 | ~102 chains | § 6 |
| Raw SQL from the client | **0** | — | no `sql` template, no `.raw()`, no `pg` driver |

**No generated types exist.** `[REPO]` There is no `database.types.ts`, no `.ts` file anywhere in
`src/`, and no `supabase gen types` invocation in `package.json` or CI. Every query is untyped
JavaScript. This removes an entire class of migration work (no generated-type regeneration step to
schedule) but also means **there is no compile-time check that queries match the schema** — the
drift documented in [DATABASE_INVENTORY.md § 5](./DATABASE_INVENTORY.md#5-schema-drift--repo-sql--live-database)
went undetected precisely because nothing type-checks these queries.

---

## 2. Dependency classification (Phase 3)

Classification legend, as specified:

- **A** — PostgreSQL-compatible
- **B** — Supabase-specific (PostgREST / platform API surface)
- **C** — Supabase Auth-specific
- **D** — Supabase Storage-specific
- **E** — Supabase Realtime-specific
- **F** — Supabase Edge Function-specific
- **G** — Unknown / requires live inspection

### 2.1 Full classification table

| ID | File | Dependency | Class | Supabase feature | Replacement needed | Risk |
|---|---|---|---|---|---|---|
| SD-01 | `src/lib/supabase.js:12` | `createClient(url, anonKey)` | **B** | supabase-js client construction | New data-access module (API client, or direct `pg`-backed backend) | **HIGH** |
| SD-02 | `src/lib/supabase.js:4-10` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` build-time env | **B** | Project endpoint + anon key in the bundle | New env scheme; **anon key in a client bundle is only safe because of RLS** | **CRITICAL** |
| SD-03 | `src/views/GuruView.vue:19` | 2nd `createClient(..., persistSession:false)` | **B** | Secondary client to avoid session clobbering during `signUp` | Backend admin-scoped endpoint for user creation | **HIGH** |
| SD-04 | 22 files, 102 sites | `.from(table).select/insert/update/upsert/delete` | **B** | PostgREST HTTP query builder | Every call rewritten → § 6 | **CRITICAL** |
| SD-05 | `src/views/BukuView.vue:274` | `students!book_loans_student_nisn_fkey(...)` | **B** | PostgREST FK-hint embed by constraint name | Rewrite; ensure FK naming or drop the hint | **HIGH** |
| SD-06 | `DashboardView:145`, `PeminjamanView:125`, `BukuView:274,281`, `RekapPerpusView:65,66` | Nested embed `students(nama, kelas)` | **B** | PostgREST resource embedding (auto-join) | Explicit JOIN / backend endpoint | **HIGH** |
| SD-07 | `DashboardPerpusView:113-115`, `DashboardView:93,142` | `{ count: 'exact' }` / `{ head: true }` | **B** | PostgREST `Prefer: count=exact` header | `COUNT(*)` in SQL, or backend endpoint | MEDIUM |
| SD-08 | `auth.js:37`, `settings.js:18`, `period.js:25` | `.single()` / `.maybeSingle()` | **B** | PostgREST `Accept: application/vnd.pgrst.object+json` | Backend endpoint returning one row; **error semantics differ** — PostgREST raises `PGRST116` on 0 rows (used at `ScanQRView.vue:182`) | MEDIUM |
| SD-09 | `SiswaView:225`, `PengaturanView:101`, `InputPresensiView:218`, `PengaturanView:234` | `.upsert(rows, { onConflict: '…' })` | **B** | PostgREST `Prefer: resolution=merge-duplicates` | `INSERT … ON CONFLICT (…) DO UPDATE`; depends on U-3/U-5/U-1 | MEDIUM |
| SD-10 | `PengaturanView:276,293,308,323` | `.delete().neq('id','00000000-…')` — delete-all trick | **B** | PostgREST requires a filter on DELETE | `DELETE` without predicate, or `TRUNCATE` | MEDIUM |
| SD-11 | `RekapView:95`, `RekapSemesterView:82`, `DashboardView:117` | `.like('record_id', '%:kelas')` | **B** | PostgREST `like` operator | SQL `LIKE` — *works, but the pattern is not index-friendly* (§ 4 of inventory) | HIGH |
| SD-12 | `DashboardView:200` | `.gte('record_id', date)`, `.lte('record_id', date+'~')` | **B** | PostgREST range filters on a text column | SQL comparison; **semantics are lexicographic by design** — must be preserved | HIGH |
| SD-13 | `src/stores/auth.js:90` | `signInWithPassword({email, password})` | **C** | GoTrue password grant | **Auth service** (→ AUTH_MIGRATION.md) | **CRITICAL** |
| SD-14 | `src/stores/auth.js:107` | `signOut()` | **C** | GoTrue session revocation | Token/session invalidation in the new auth | **HIGH** |
| SD-15 | `src/views/LoginView.vue:117` | `signOut({ scope: 'local' })` | **C** | Device-scoped session revocation | May not exist in a replacement auth service | **HIGH** |
| SD-16 | `src/stores/auth.js:71` | `getSession()` | **C** | Local session read + token refresh | Session hydration | **HIGH** |
| SD-17 | `src/stores/auth.js:58` | `onAuthStateChange(cb)` | **C** | Cross-tab auth event stream | Auth state subscription; **fires `INITIAL_SESSION` / `TOKEN_REFRESHED`** which the code de-dupes against | **HIGH** |
| SD-18 | `src/views/LoginView.vue:137` | `supabase.auth.storageKey` | **C** | Reads the localStorage key naming convention | Must be replaced with the new auth's persistence key | MEDIUM |
| SD-19 | `src/views/GuruView.vue:202-207` | `signUp({email, password, options.data:{username,nama,role,kelas,nip}})` | **C** | GoTrue signup **+ user metadata** | Backend endpoint; metadata drives FN-3 | **CRITICAL** |
| SD-20 | `src/stores/auth.js:88` | virtual email `` `${username}@minblora.id` `` | **C** | Email-as-username mapping onto GoTrue | **Pure application convention** — can be replaced by real username auth | MEDIUM |
| SD-21 | `supabase/06_final_snapshot.sql:33` | FK `users.auth_id → auth.users(id)` | **C** | Foreign key into a managed schema | Column survives; **FK cannot** | **CRITICAL** |
| SD-22 | `supabase/06_final_snapshot.sql:75-77, 84-86` | Triggers on `auth.users` | **C** | DDL on a managed table | Reimplement in backend (§ SD-19) | **CRITICAL** |
| SD-23 | `supabase/02_rls.sql:27` | `auth.uid()` inside `get_my_role()` | **C** | Session-identity SQL function | Substitute the new session mechanism | **CRITICAL** |
| SD-24 | `supabase/02_rls.sql` throughout | DB roles `authenticated`, `anon` | **C** | Supabase PostgREST role switching | **Roles only exist if PostgREST-like layer is rebuilt** | **CRITICAL** |
| SD-25 | `src/views/PengaturanView.vue:121` | `storage.from('assets').upload(path,file,{upsert:true})` | **D** | Supabase Storage write | Object storage service | **HIGH** |
| SD-26 | `src/views/PengaturanView.vue:123` | `storage.from('assets').getPublicUrl(path)` | **D** | Public URL construction | Public object URL from the new store | MEDIUM |
| SD-27 | `supabase/03_storage.sql:7-9` | `insert into storage.buckets …` | **D** | Bucket provisioning in a managed schema | Bucket/container creation in the new store | MEDIUM |
| SD-28 | `supabase/03_storage.sql:12-31` | 4 policies on `storage.objects` | **D** | Access control on a managed table | Storage-level ACLs / signed URLs | **HIGH** |
| SD-29 | `src/views/DashboardView.vue:300-302` | `.channel().on('postgres_changes',…).subscribe()` | **E** | Realtime WAL streaming | Polling, SSE, or WebSocket fan-out | MEDIUM |
| SD-30 | `src/views/DashboardView.vue:308` | `supabase.removeChannel(channel)` | **E** | Realtime teardown | Equivalent unsubscription | LOW |
| SD-31 | `src/lib/lazyRealtime.js` (whole file) + `vite.config.js:22-33` | Vite alias shimming `@supabase/realtime-js` | **E** | Bundle-level coupling to realtime-js internals | **Deleted entirely** on migration | LOW |
| SD-32 | `src/lib/supabase.js:25-33` | `whenRealtimeReady()` swapping `supabase.realtime` | **E** | Relies on supabase-js internal field | Deleted | LOW |
| SD-33 | `supabase/01_schema.sql:138-149`, `185-188` | `set_updated_at()` + TG-1/TG-2 | **A** | — | **None — ports verbatim** | LOW |
| SD-34 | all of `supabase/01_schema.sql` (DDL) | Tables, PKs, FKs, CHECKs, indexes, `timestamptz`, `jsonb`, `uuid` | **A** | — | **None** — but see drift | MEDIUM |
| SD-35 | `supabase/01_schema.sql:7` | `create extension pgcrypto` | **A** | — | Built into PG ≥ 13 | LOW |
| SD-36 | `supabase/05_library_visits.sql:19-21` | `allow_all_library_visits` → `TO anon, authenticated` | **C/G** | PostgREST role names + a **permissive** policy | Must **not** be carried forward; live presence is **UNKNOWN** | **CRITICAL** |
| SD-37 | live `users.role` CHECK | 4th role `'Guru & Pustakawan'` | **G** | — | **UNKNOWN** | **CRITICAL** |
| SD-38 | live `users.nip`, `students.tanggal_lahir`, `students.tempat_lahir`, `app_settings.favicon_url` | Drifted columns | **G** | — | **UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION** | **HIGH** |
| SD-39 | `ActivityView` / realtime subscription RLS interaction | `postgres_changes` respects RLS in Supabase | **G** | Realtime authorization is RLS-mediated | A replacement fan-out must implement its own authorization | **HIGH** |

### 2.2 Class totals

| Class | Meaning | Count of distinct dependencies | Purely portable? |
|---|---|---|---|
| **A** | PostgreSQL-compatible | 3 (SD-33, SD-34, SD-35) | ✅ yes |
| **B** | Supabase-specific (PostgREST) | 9 (SD-01…SD-12 minus auth/storage) | ❌ no |
| **C** | Supabase Auth-specific | 12 (SD-13…SD-24, SD-36) | ❌ no |
| **D** | Supabase Storage-specific | 4 (SD-25…SD-28) | ❌ no |
| **E** | Supabase Realtime-specific | 4 (SD-29…SD-32) | ❌ no |
| **F** | Supabase Edge Function-specific | **0** | n/a — none exist |
| **G** | Unknown / requires live inspection | 3 (SD-37, SD-38, SD-39) | ❌ unknown |

`[INFERRED]` **The headline number: of 39 identified dependencies, 3 are portable.** The remaining
36 belong to Supabase platform capabilities that a PostgreSQL VPS does not provide.

---

## 3. PostgREST assumptions (Phase 3, continued)

PostgREST is the HTTP layer Supabase exposes over PostgreSQL. It is **not** part of PostgreSQL.
These specific behaviours are relied upon:

### 3.1 Filter-required DELETE (SD-10)

`src/views/PengaturanView.vue:276, 293, 308, 323` all use the same idiom:

```js
supabase.from('attendance_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
```

The comment at `:276` is explicit: *"Trick to delete all rows"*. PostgREST refuses an unfiltered
`DELETE` as a safety measure; the sentinel UUID passes that check while matching every real row.
`[INFERRED]` A backend replacement should implement these as **explicit admin operations**, not as
filter tricks — and should consider whether "delete every attendance row" belongs behind the
generic delete endpoint at all.

### 3.2 Object-vs-array response modes (SD-08)

`.single()` and `.maybeSingle()` change the HTTP `Accept` header, producing an object rather than
an array, and PostgREST returns error **`PGRST116`** ("JSON object requested, multiple (or no)
rows returned") when zero rows match.
`[REPO]` `src/views/ScanQRView.vue:182` calls `.single()` on a lookup that is *expected* to return
zero rows for a first-time visitor, and discards the error. A replacement that returns `null`
instead of an error, or throws instead of returning `null`, changes control flow here.

### 3.3 Resource embedding (SD-06)

`students(nama, kelas)`, `books(judul)` etc. are PostgREST's automatic foreign-key joins, computed
from FK metadata at request time. They have **no SQL equivalent in a query string** — the backend
must issue explicit `JOIN`s, and the response shape must be preserved (nested objects under the
relation name) or every consuming template breaks.

### 3.4 FK-hint embeds (SD-05)

Already detailed in
[DATABASE_INVENTORY.md § 4.2](./DATABASE_INVENTORY.md#42-a-hard-coded-auto-generated-fk-constraint-name-in-application-code).
The `!constraint_name` syntax depends on a Postgres **auto-generated** identifier.

### 3.5 Count headers (SD-07)

`{ count: 'exact', head: true }` issues a `HEAD` request with a `Prefer: count=exact` header and
reads the `Content-Range` response header. **No rows are transferred.** A naive replacement that
does `SELECT *` then `.length` would transfer every row — a serious regression for the dashboard
counters at `DashboardPerpusView.vue:113-115`.

---

## 4. Supabase Auth assumptions

Cross-referenced to [AUTH_MIGRATION.md](./AUTH_MIGRATION.md); summarised here for completeness.

| Assumption | Where | Consequence of removal |
|---|---|---|
| A user-session cookie/JWT identifies the caller | `supabase.auth.*` | Whole authorization model changes |
| `auth.uid()` resolves that identity inside SQL | `02_rls.sql:27` | Every RLS policy loses its subject |
| `auth.users` holds the credential | `06:24` FK | FK target vanishes |
| `auth.users.raw_user_meta_data` carries `nama`/`role`/`kelas` | `06:41-43` | Account provisioning logic vanishes |
| The JWT carries a role claim PostgREST maps to `authenticated` | PostgREST role switching | `TO authenticated` stops meaning anything |
| Session persists in `localStorage` and auto-refreshes | `src/lib/supabase.js:13-16` | Session lifetime semantics change |
| Email confirmation is disabled to allow virtual emails | `docs/database.md:105` | Password reset by email is impossible either way |

**Explicitly not used:** `auth.jwt()` appears zero times. `auth.role()` appears zero times.
Custom claims are read only indirectly, through `public.users.role` via FN-2 — the application
never inspects a JWT itself. `[INFERRED]` This is mildly favourable: the authorization decision is
centralised in one SQL function and one Pinia getter set (`auth.js:29-33`), rather than scattered
across claim parsing.

---

## 5. Application data access audit (Phase 6)

Trace from UI → store/composable → Supabase client → table/RPC. Every row below was verified
against the cited line.

| # | Feature | Component | Store / module | Query | Table / RPC | CRUD | Auth dependency |
|---|---|---|---|---|---|---|---|
| DA-01 | **Login** | `LoginView.vue:80` | `stores/auth.js:87-103` | `signInWithPassword({email,password})` | `auth` (RPC-equivalent) | — | **Auth-native** |
| DA-02 | **Profile load on login** | `LoginView.vue:80` | `stores/auth.js:37` | `.select('*').eq('auth_id',id).single()` | `users` | R | `auth_id = auth.uid()` |
| DA-03 | **Session recovery / boot** | `main.js:35` | `stores/auth.js:52-83` | `getSession()`, `onAuthStateChange` | `auth` | — | **Auth-native** |
| DA-04 | **Session recovery (manual)** | `LoginView.vue:117,137` | — | `signOut({scope:'local'})`, `auth.storageKey` | `auth` | — | **Auth-native** |
| DA-05 | **Logout** | `AppLayout` → `auth.logout()` | `stores/auth.js:106-111` | `signOut()` | `auth` | — | **Auth-native** |
| DA-06 | **Active period (global)** | `AppLayout.vue:254` | `stores/period.js:21-26` | `.select('*').eq('is_active',true).maybeSingle()` | `academic_periods` | R | `Authenticated_Select` |
| DA-07 | **School settings (global)** | `AppLayout`, `App.vue` | `stores/settings.js:14-19` | `.select('*').eq('id',1).maybeSingle()` | `app_settings` | R | `Authenticated_Select` |
| DA-08 | **Dashboard — today KPIs** | `DashboardView.vue:93-145` | — | `.select('kelas',{count:'exact'}).eq('active',true)`; `.select('status, students(nama, kelas)')`; `.select('kelas').eq('date',today)`; `.in('kelas',…)` | `students`, `attendance_logs`, `academic_calendar`, `activity_logs` | R | 4 policies + **embed** SD-06 |
| DA-09 | **Dashboard — trend** | `DashboardView.vue:199-215` | — | `.select('date, kelas, status').gte(lte)`; `.select('date')…eq('status','Libur')`; `.select('record_id')…gte/lte` | `attendance_logs`, `academic_calendar`, `activity_logs` | R | SD-12 lexicographic range |
| DA-10 | **Dashboard — realtime** | `DashboardView.vue:300-302` | — | `.channel().on('postgres_changes',{table:'attendance_logs'})` | `attendance_logs` | — | **Realtime + RLS** |
| DA-11 | **Data Guru — list** | `GuruView.vue:152-155` | — | `.select('id, username, nama, role, kelas, nip')` | `users` | R | `Authenticated_Select`; **`nip` = drift #1** |
| DA-12 | **Data Guru — update** | `GuruView.vue:197` | — | `.update(payload).eq('id',…)` | `users` | U | `Admin_All_users` |
| DA-13 | **Data Guru — create** | `GuruView.vue:202-207` | — | `signUp()` + `options.data` | `auth` → TG-3 → `users` | C | `auth` + **FN-3** |
| DA-14 | **Data Guru — Excel import** | `GuruView.vue:115-129` | — | per-row `signUp()` | `auth` | C | FK-1/FN-3; **N sequential round-trips** |
| DA-15 | **Data Siswa — list** | `SiswaView.vue:315` | — | `.select('*').order('kelas').order('nama')` | `students` | R | `Authenticated_Select` |
| DA-16 | **Data Siswa — create/update** | `SiswaView.vue:363, 381` | — | insert/update incl. `tanggal_lahir` | `students` | C/U | **drift #2** |
| DA-17 | **Data Siswa — bulk upsert (Excel)** | `SiswaView.vue:225-229` | — | `.upsert(toUpdate)` then `.insert(toInsert)` | `students` | U/C | SD-09 |
| DA-18 | **Data Siswa — match existing** | `SiswaView.vue:158` | — | `.select('id, nisn, nama, tanggal_lahir, kelas')` | `students` | R | **drift #2** |
| DA-19 | **Data Siswa — delete (single/bulk)** | `SiswaView.vue:297, 446` | — | `.delete().in('id',…)` / `.eq('id',…)` | `students` | D | **4-table cascade** |
| DA-20 | **Kelas — class list source** | `SiswaView`, `InputPresensi`, `Dashboard` | `stores/settings.js` | reads `app_settings.daftar_kelas` (jsonb) | `app_settings` | R | No `kelas` master table exists |
| DA-21 | **Kelas — promotion** | `PengaturanView.vue:175-266` | — | read active students; `.upsert(historyRows,{onConflict:'student_nisn,tahun_ajaran'})`; loop `.update({kelas})` per student; bulk `.in('id',lulusIds).update()` | `students`, `users`, `class_history` | R/U | **N+1 updates**; U-5; FK-4 |
| DA-22 | **Kelas — history view** | `RiwayatKelasView.vue:26,48` | — | `.select('*')` | `class_history`, `students` | R | `Authenticated_Select` |
| DA-23 | **Kalender — read** | `KalenderView.vue:41` | — | `.gte(lte)` range | `academic_calendar` | R | `Authenticated_Select` for Guru; write = Admin only (matches RLS) |
| DA-24 | **Kalender — write** | `KalenderView.vue:91` | — | `.upsert()` | `academic_calendar` | U | `Admin_All_*` |
| DA-25 | **Input Presensi — holiday gate** | `InputPresensiView.vue:143` | — | `.select('status').eq('date',d).maybeSingle()` | `academic_calendar` | R | — |
| DA-26 | **Input Presensi — roster** | `InputPresensiView.vue:152` | — | `.select(…).eq('kelas',…).eq('active',true)` | `students` | R | — |
| DA-27 | **Input Presensi — existing logs** | `InputPresensiView.vue:164` | — | `.select(…).eq('date').eq('kelas')` | `attendance_logs` | R | `Guru_Manage_Absensi` |
| DA-28 | **Input Presensi — submitted check** | `InputPresensiView.vue:173-174` | — | `.select('id')…eq('record_id',`&#124;`${date}:${kelas}`)` | `activity_logs` | R | **string-composite key** |
| DA-29 | **Input Presensi — save** | `InputPresensiView.vue:218-225` | — | `.upsert(rows)` | `attendance_logs` | U/C | U-3; **TG-1** sets `updated_at` |
| DA-30 | **Input Presensi — audit** | via `logActivity()` | `lib/activityLog.js:9-16` | `.insert({user_id, aksi, …})` | `activity_logs` | C | `Auth_Insert_ActivityLogs` (`WITH CHECK (true)`) |
| DA-31 | **Rekap Bulanan** | `RekapView.vue:92-95, 128` | — | 4 parallel selects + `.select('nama, nip')` | `students`, `attendance_logs`, `academic_calendar`, `activity_logs`, `users` | R | SD-11 `LIKE '%:kelas'`; **drift #1** |
| DA-32 | **Rekap Semester** | `RekapSemesterView.vue:79-82, 126` | — | same shape as DA-31 | same 5 tables | R | idem |
| DA-33 | **Statistik** | `StatistikView.vue:40, 60-61, 76` | — | `.in('student_nisn',nisnList).in('date',activeDays)`; `.select('record_id').eq('aksi',…)` then `.split(':')` | `students`, `attendance_logs`, `academic_calendar`, `activity_logs` | R | **80+ values in one `IN` list**; full log scan |
| DA-34 | **Aktivitas (log viewer)** | `AktivitasView.vue:19, 27` | — | `.select('id, nama')`; `.select(…).order(created_at desc)` | `users`, `activity_logs` | R | `Authenticated_Select` |
| DA-35 | **Library — dashboard KPIs** | `DashboardPerpusView.vue:91-123` | — | `.select('stok')`; `.select('tanggal_kembali_seharusnya').eq('status','dipinjam')`; 3× `count:'exact', head:true` | `books`, `book_loans`, `library_visits` | R | SD-07 |
| DA-36 | **Library — dashboard trend** | `DashboardPerpusView.vue:159-162` | — | `.select('tanggal, created_at').gte(lte)` ×2 | `library_visits`, `book_loans` | R | date range |
| DA-37 | **Buku — catalogue** | `BukuView.vue:111-112` | — | `.select('*').order(created_at desc)`; `.select('book_id').eq('status','dipinjam')` | `books`, `book_loans` | R | **full-table reads** |
| DA-38 | **Buku — CRUD** | `BukuView.vue:162,167,190,233` | — | update/insert/delete | `books` | C/U/D | `Perpus_Manage_Buku` |
| DA-39 | **Buku — loan history** | `BukuView.vue:274-283` | — | `.select('*, students!book_loans_student_nisn_fkey(…)')` with fallback | `book_loans` | R | **SD-05 FK hint** |
| DA-40 | **Peminjaman — pickers** | `PeminjamanView.vue:70, 89, 101` | — | `.select(…)` ×3 | `students`, `books`, `book_loans` | R | — |
| DA-41 | **Peminjaman — list** | `PeminjamanView.vue:125` | — | `.select('*, books(judul), students(nama, kelas)')` | `book_loans` | R | **2 embeds** |
| DA-42 | **Peminjaman — create loan** | `PeminjamanView.vue:184` | — | `.insert(payload)` | `book_loans` | C | FK-5, FK-6; **no `stok` decrement** |
| DA-43 | **Pengembalian** | `PeminjamanView.vue:236` | — | `.update({status, tanggal_kembali_aktual})` | `book_loans` | U | TG-2 |
| DA-44 | **Kunjungan — list/manual** | `KunjunganPerpusView.vue:52,60,100,126` | — | select/insert/delete | `students`, `library_visits` | R/C/D | `Perpus_Manage_Visits` **+ SD-36** |
| DA-45 | **Scan QR — visitor check** | `ScanQRView.vue:165,178,194` | — | `.select(…).single()` (**errors on 0 rows, discarded**); insert | `students`, `library_visits` | R/C | **SD-08 `PGRST116`** |
| DA-46 | **Cetak Kartu** | `CetakKartuView.vue:36-37` | — | `.select('*')` | `students` | R | includes `tempat_lahir` (**drift #3**) |
| DA-47 | **Settings — identity** | `PengaturanView.vue:100` | `stores/settings.js` | `.upsert({id:1, …form}, {onConflict:'id'})` | `app_settings` | U | `Admin_All_*`; **drift #4** |
| DA-48 | **Settings — periods** | `PengaturanView.vue:89,142,160,164` | `stores/period.js` | select/insert/update incl. `{is_active:true}` | `academic_periods` | R/C/U | **U-6 partial index** can reject a 2nd active period |
| DA-49 | **Settings — logo upload** | `PengaturanView.vue:121-123` | — | `storage.from('assets').upload()` + `getPublicUrl()` | **Storage** | C | **anon-writable** (§ STORAGE) |
| DA-50 | **Maintenance — class promotion** | `PengaturanView.vue:189, 234, 241, 248` | — | see DA-21 | `users`, `class_history`, `students` | R/U | `Admin_All_*` |
| DA-51 | **Maintenance — resets** | `PengaturanView.vue:276,293,308,323` | — | 4× delete-all trick | `attendance_logs`, `activity_logs`, `library_visits`, `book_loans` | D | **SD-10**; deletes the audit trail reports depend on |
| DA-52 | **Maintenance — backup** | `PengaturanView.vue:340-405` | — | 4× `.select('*')` | `students`, `users`, `books`, `activity_logs` | R | **produces .xlsx, not a DB dump** |
| DA-53 | **Panduan** | `PanduanView.vue` | — | *(no queries)* | — | — | static content |

### 5.1 Notes on the access matrix

**Indirect access (Phase 6, "do not only search for `.from()`").** Two indirections were traced
that a naive grep would miss:

1. **`logActivity()`** (`src/lib/activityLog.js:9`) is called from ~15 views. Every call is an
   `INSERT` into `activity_logs` that never appears as a literal `supabase.from` at the call site.
   The call sites are the `await logActivity({…})` statements.
2. **The Pinia stores** (`auth`, `settings`, `period`) each hold one query that is consumed by many
   components. `settings` is read by `App.vue`, `AppLayout.vue`, `SiswaView`, `PengaturanView`,
   `GuruView`, and the PDF generators; `period` is read by `AppLayout` and the period-aware views.

**Feature coverage check** against the brief's required list: Login (DA-01…05) ✅ · Dashboard
(DA-08…10) ✅ · Data Guru (DA-11…14) ✅ · Data Siswa (DA-15…19) ✅ · Kelas (DA-20…22) ✅ ·
Kalender (DA-23, 24) ✅ · Input Presensi (DA-25…30) ✅ · Rekap Bulanan (DA-31) ✅ · Rekap Semester
(DA-32) ✅ · Statistik (DA-33) ✅ · Library (DA-35, 36) ✅ · Buku (DA-37…39) ✅ · Peminjaman
(DA-40…42) ✅ · Pengembalian (DA-43) ✅ · Settings (DA-47…49) ✅ · Logout (DA-05) ✅ · Session
recovery (DA-03, 04) ✅.

**"Kelas" has no table.** `[INFERRED]` There is no `kelas` entity in the schema. A "class" is a
free-text `text` value stored on `students.kelas`, `users.kelas`, `attendance_logs.kelas`, and as a
jsonb array `app_settings.daftar_kelas` (`01:114`). The authoritative list of classes is a jsonb
array inside the singleton settings row. This is worth noting for migration because it means there
is nothing to normalise *away* — but also nothing enforcing that a class string in `students.kelas`
appears in `daftar_kelas`.

---

## 6. The missing seam

`[INFERRED]` — applying the `seam` / `adapter` vocabulary.

The codebase has **no data-access abstraction**. The dependency on Supabase is expressed at
**102 call sites in 22 files**:

| File | Query entry points |
|---|---|
| `src/views/PengaturanView.vue` | 18 |
| `src/views/DashboardView.vue` | 9 |
| `src/views/SiswaView.vue` | 9 |
| `src/views/DashboardPerpusView.vue` | 8 |
| `src/views/BukuView.vue` | 8 |
| `src/views/InputPresensiView.vue` | 7 |
| `src/views/PeminjamanView.vue` | 6 |
| `src/views/RekapView.vue` | 5 |
| `src/views/RekapSemesterView.vue` | 5 |
| `src/views/KunjunganPerpusView.vue` | 4 |
| `src/views/ScanQRView.vue` | 4 |
| `src/views/StatistikView.vue` | 4 |
| `src/views/AktivitasView.vue` | 2 |
| `src/views/GuruView.vue` | 2 |
| `src/views/KalenderView.vue` | 2 |
| `src/views/RekapPerpusView.vue` | 2 |
| `src/views/RiwayatKelasView.vue` | 2 |
| `src/lib/activityLog.js` | 1 |
| `src/stores/auth.js` | 1 |
| `src/stores/period.js` | 1 |
| `src/stores/settings.js` | 1 |
| `src/views/CetakKartuView.vue` | 1 |
| **Total** | **102** |

Counting method: occurrence counts of `supabase.from(` written inline plus `.from(` at the start of
a continuation line. **VERIFIED FROM REPOSITORY.** The two forms are mutually exclusive, so the sum
is the true call-site count. (`Array.from` is an unrelated built-in and is excluded.)

`docs/architecture.md:31` states the principle explicitly: *"Views fetch sendiri. Tidak ada lapisan
API/repository terpusat"* ("Views fetch for themselves. There is no centralised API/repository
layer").

**Why this matters for the plan.** A migration behind a seam is a bounded change. Here there is no
seam, so:

- every one of the 102 call sites must be revisited;
- PostgREST-specific semantics (§ 3) are embedded in *view* code, not in a client module, so each
  must be translated in context;
- there is no single place to add a compatibility layer, and therefore **no way to run the old and
  new data paths side by side** without touching every file.

`[INFERRED]` This is the strongest argument for the "introduce a data-access module first, migrate
behind it later" sequencing described in
[POSTGRES_ARCHITECTURE.md](./POSTGRES_ARCHITECTURE.md) option C — not because that option is
better, but because the absence of a seam makes any direct cutover touch essentially the whole
application at once.

---

## 7. Realtime (Phase 10)

**Repository evidence exists.** This is *not* a "no realtime" result.

### 7.1 The single subscription

`src/views/DashboardView.vue:296-308`:

```js
await whenRealtimeReady()
const channelName = `dashboard-attendance-${Date.now()}`
channel = supabase
  .channel(channelName)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, () => debouncedRefresh())
  .subscribe()
```

and teardown at `:307-309`:

```js
onUnmounted(() => {
  if (channel) supabase.removeChannel(channel)
})
```

| Property | Value |
|---|---|
| Subscriptions in the entire app | **1** |
| Table watched | `attendance_logs` |
| Event filter | `*` (all of INSERT/UPDATE/DELETE) |
| Handler | `debouncedRefresh()` — 1 s debounce (`:294-297`) |
| Channel name | `dashboard-attendance-<timestamp>` — unique per mount |
| Lifecycle | Created on `onMounted`, removed on `onUnmounted` |
| Consumed by | `DashboardView` only — `Pustakawan` and non-dashboard users never load it |

### 7.2 Bundle-level coupling

`src/lib/lazyRealtime.js` (~50 lines) is a **Vite alias target** replacing
`@supabase/realtime-js` so the real package is code-split. `vite.config.js:22-33` installs the
alias, and `src/lib/supabase.js:25-33` exports `whenRealtimeReady()` to swap the shim for the real
client. `docs/performance.md:31` measures the saving.

`[INFERRED]` This shim exists **only** because `supabase-js` constructs a `RealtimeClient`
synchronously. On migration, `lazyRealtime.js`, the two `vite.config.js` aliases, and
`whenRealtimeReady()` are **all deleted** — they are the one part of the migration that *removes*
complexity rather than adding it.

### 7.3 Replacement requirements

| Requirement | Detail |
|---|---|
| Server-push mechanism | Polling, SSE, or WebSocket — **not** provided by PostgreSQL |
| `LISTEN`/`NOTIFY` | Available in core PostgreSQL, but it is **not** a client-facing transport; it needs a server process to relay |
| **Authorization** | Supabase applies RLS to `postgres_changes` payloads. A replacement must implement its own filter, or every connected client receives every attendance change |
| Debounce + teardown | Already client-side; portable |
| Multi-instance servers | If more than one backend process runs, `LISTEN`/`NOTIFY` is per-connection — a broadcast bus (Redis, PostgreSQL `NOTIFY` fan-out) is needed |
| Degradation | `[INFERRED]` The dashboard already refreshes on mount and on tab switch; **realtime is an enhancement, not a correctness requirement.** Dropping it degrades freshness, not function. This is the cheapest capability to defer |

Full analysis: [POSTGRES_ARCHITECTURE.md](./POSTGRES_ARCHITECTURE.md).

---

## 8. Edge Functions and API layer (Phase 11)

### 8.1 Edge Functions

**None.** `[REPO]`:

- `supabase/functions/` does not exist (`ls` → *No such file or directory*).
- `supabase.functions.invoke` appears **0** times in `src/`.
- No `supabase.functions` reference anywhere.
- No `Deno` runtime markers, no `_shared/` directory, no `index.ts` entrypoints.

`supabase/README.md` documents only schema, RLS, and storage — no functions section.

**Conclusion: there is nothing to migrate in this category.** Phase 11's Edge Function mapping is
empty.

### 8.2 Serverless / platform functions

**None.** `[REPO]` `docs/deployment.md:20` states it directly: *"Tidak ada fungsi serverless"*
("There are no serverless functions"). Consistent with:

- `vercel.json` contains only `rewrites` and `headers` — no `functions` block.
- No `api/` directory.
- No `netlify.toml`, no Cloudflare Workers config, no `wrangler.toml`.

### 8.3 External services

| Service | Used? | Evidence |
|---|---|---|
| Google Fonts CDN | **No** — deliberately removed | `package.json:9` `@fontsource-variable/inter`; `main.js:5`; `docs/performance.md:19` |
| Sentry / error monitoring | **No** | `docs/performance.md:59` lists it as backlog |
| CDN for JS libraries | **No** | all via npm |
| Any analytics / telemetry | **No** | grep found none |
| QR/barcode decoding | **Local only** — `html5-qrcode` in-browser | `package.json:14`; `ScanQRView.vue` |
| PDF/Excel generation | **Local only** — `jspdf`, `xlsx` in-browser | `package.json:15-17, 25` |

### 8.4 The actual "API" today

```
Frontend (browser)
   │
   │  HTTPS + anon key + JWT   ──► Supabase PostgREST        (102 call sites)
   │  HTTPS                    ──► Supabase GoTrue Auth      (6 call sites)
   │  HTTPS                    ──► Supabase Storage API      (2 call sites)
   │  WSS                      ──► Supabase Realtime         (1 subscription)
   ▼
Supabase platform  ──►  PostgreSQL
```

**There is no first-party API layer of any kind.** The four arrows above *are* the backend.
`[INFERRED]` This is the crux of Phases 11 and 20: the migration is not "point the API at a
different database" — it is "build the API", because none exists.

### 8.5 Which APIs must be replaced

| Supabase API | Must be replaced by | Hardest part |
|---|---|---|
| PostgREST (query builder) | Backend HTTP endpoints **or** a PostgREST instance the project runs itself | Preserving embed/count/upsert/delete semantics (§ 3) |
| GoTrue (Auth) | Auth service or hand-rolled auth | Session lifecycle, password hashing, account provisioning (§ DA-13) |
| Storage API | S3-compatible object storage | Public URL stability — `logo_url` is **persisted in the database** (`app_settings.logo_url`) |
| Realtime | Polling / SSE / WebSocket | Authorization of the stream |
| RLS role switching | Whatever the new data path uses to set identity | **This is the security-critical one** — see [RLS_MIGRATION.md](./RLS_MIGRATION.md) |

> Note on Storage URL stability: `app_settings.logo_url` stores an **absolute public URL**
> (`PengaturanView.vue:123` assigns `data.publicUrl`). The same value is cached in
> `localStorage['app.logo_url']` and used by `index.html:90-95` for the boot splash. Changing the
> storage origin therefore requires either a URL-rewriting migration of that column and a cache
> invalidation, or a stable custom domain in front of the new store.
> → [STORAGE_MIGRATION.md](./STORAGE_MIGRATION.md)
