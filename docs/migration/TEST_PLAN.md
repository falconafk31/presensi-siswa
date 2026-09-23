# Test Plan

**Phase 23 — test matrix.**

> **PLAN ONLY. No test was executed. No database was queried. No frontend was run against a
> migrated backend.** The only command executed anywhere in this audit was the project's own
> `npm run build`, to record build status.

---

## 1. Starting position

`docs/testing.md:3` states the position without hedging:

> *"repo ini **belum memiliki automated test** (tidak ada Vitest/Vue Test Utils/Playwright di
> `package.json`). Klaim 'test' di repo ini berarti: guard binding template + build produksi + CI +
> QA manual."*

| Layer | Exists? | Detail |
|---|---|---|
| Template-binding guard | ✅ | `scripts/check-template-bindings.mjs`, runs in `npm run build` and CI |
| Production build | ✅ | `vite build` — verified passing during this audit (`✓ built in 12.08s`) |
| CI | ✅ | `.github/workflows/ci.yml` — `npm ci` → guard → build |
| Unit tests | ❌ | None |
| Component tests | ❌ | None |
| E2E tests | ❌ | None |
| **Manual QA checklist** | ✅ | `docs/testing.md:40-95`, role-based |

`[INFERRED]` **This matters more than it first appears.** Every other document in this set assumes
changes are *verifiable*. They are not. A migration validated only by "clicked through the app and
it seemed fine" cannot distinguish "the new backend is correct" from "the new backend is
plausibly correct until a teacher notices missing rows next month".

**Therefore the test plan is not an appendix to the migration — it is a prerequisite.** Building
the harness is stage-agnostic work that can start immediately and in parallel with S-1.

### 1.1 What to build, in order

| Priority | Artefact | Why first |
|---|---|---|
| **1** | **A database-level RLS assertion harness** | Security is the property most easily broken silently. § 5 |
| **2** | **Golden-file fixtures** — known inputs → known report outputs | Report correctness is arithmetic; arithmetic is testable |
| **3** | **An API-level contract suite** | Pins the response shapes the 22 view files depend on |
| **4** | **E2E smoke tests** (Playwright) | Follows the `webapp-testing` skill's recon-then-action pattern; catches wiring failures |
| **5** | **Load/performance baseline** | Establishes numbers before optimising ([VPS_REQUIREMENTS § 4](./VPS_REQUIREMENTS.md#4-verification-queries-for-the-live-database)) |

`[INFERRED]` Items 1 and 2 are cheap and give the most protection. Item 4 is the most expensive and
gives the least — E2E green does not prove that attendance arithmetic is unchanged.

---

## 2. Test matrix

Conventions: **ID** is stable and referenced from other documents. **Current implementation** cites
the repository. **Migration validation** states what must hold after the move.

### 2.1 Authentication

| ID | Scenario | Expected result | Current implementation | Migration validation |
|---|---|---|---|---|
| T-AUTH-01 | Valid username + password | Session established; profile loaded; redirect per role | `auth.js:87-103`; `LoginView.vue:80` | Same, against the new auth service |
| T-AUTH-02 | Wrong password | Message "Username atau password salah"; **no recovery panel** | `auth.js:96-98`; `docs/testing.md:44` | Same message; the panel must **not** appear (it signals a *timeout*, not a failure) |
| T-AUTH-03 | Non-existent username | Same message as T-AUTH-02 (**no user enumeration**) | `auth.js:96-98` treats all failures identically | Must be preserved. A backend that returns 404 for unknown users and 401 for bad passwords **leaks which accounts exist** |
| T-AUTH-04 | Login for each of 4 roles | Correct landing page each time | `router/index.js:145-152` | Same; `Pustakawan` → `dashboard-perpus`, others → `dashboard` |
| T-AUTH-05 | Session survives page refresh | Still authenticated | `persistSession: true` (`supabase.js:13-16`) | New session mechanism must persist equivalently |
| T-AUTH-06 | Session survives browser restart | Still authenticated | `localStorage` persistence | Equivalent persistence |
| T-AUTH-07 | Logout | Session cleared; profile cache removed; → `/login` | `auth.js:106-111` | Same |
| T-AUTH-08 | Session recovery ("Pulihkan Sesi") | Clears profile cache + session blob; reloads | `LoginView.vue:96-141` | 🔴 **Must be re-derived** — `supabase.auth.storageKey` (`:137`) does not exist. Removing this silently deletes the only escape hatch for the documented stale-session bug |
| T-AUTH-09 | Login timeout (>12 s) | Recovery panel appears | `LoginView.vue:99-101` | Preserve; a slower backend makes this path *more* likely |
| T-AUTH-10 | Late login result after recovery pressed | Ignored (anti-race) | `LoginView.vue:100-101` `loginAttempt` token | Preserve — this is a real race, not defensive padding |
| T-AUTH-11 | Cross-tab logout | Other tab reflects it | Implicit in `onAuthStateChange` (`auth.js:58`) | ⚠️ **Not portable.** Must be reimplemented or explicitly accepted as lost |
| T-AUTH-12 | Boot with an unreachable backend | App still mounts; guard redirects to login | `main.js:35-38` `BOOT_TIMEOUT_MS = 5000` | Preserve. A backend that hangs on boot must not white-screen the app |
| T-AUTH-13 | Profile cache hit on boot | Role available with **no network round-trip** | `auth.js:53-55`; `docs/performance.md:21` | Preserve — it is the anti-flicker mechanism |
| T-AUTH-14 | Admin creates a user | New account + profile appear; **admin stays logged in** | `GuruView.vue:202-207` via a secondary client (`:22`) | 🔴 **Critical.** A naive backend that logs the caller in as the new user is a privilege **escalation** |
| T-AUTH-15 | Create a user with the `'Guru & Pustakawan'` role | Accepted and stored | `GuruView.vue:256`; blocked by `01:17` CHECK **unless drift #5 is resolved** | 🔴 **Fails today** unless the CHECK is widened. Test this **first** — it proves the drift |
| T-AUTH-16 | Create a user with a duplicate username | Clear error | `GuruView.vue:216` maps `duplicate`/`already registered` | Preserve the message mapping |
| T-AUTH-17 | Excel bulk user import | Rows created; partial failures reported | `GuruView.vue:115-129`; error at `:135` | Preserve; note it is a **sequential** loop (PERF-14) |
| T-AUTH-18 | Password reset | **Not supported** — virtual email cannot receive mail | `docs/authentication.md:73`; admin deletes + recreates | 🔴 New backend must provide *something*. Today's workaround is destructive |

### 2.2 Authorization and routing

| ID | Scenario | Expected result | Current implementation | Migration validation |
|---|---|---|---|---|
| T-AUTHZ-01 | Unauthenticated access to a `requiresAuth` route | Redirect to `/login?redirect=<target>` | `router/index.js:143-145` | Same redirect, with the query preserved |
| T-AUTHZ-02 | `Guru` opens `/guru` (adminOnly) | Redirect to `/dashboard` | `router/index.js:153-155` | Same |
| T-AUTHZ-03 | `Pustakawan` opens `/presensi` (presensiOnly) | Redirect to `/dashboard-perpus` | `router/index.js:156-158` | Same |
| T-AUTHZ-04 | `Guru` opens `/buku` (perpusOnly) | Redirect to `/login` | `router/index.js:150-152` | Same |
| T-AUTHZ-05 | Already-authenticated user opens `/login` | Redirect by role | `router/index.js:147-152` | Same |
| T-AUTHZ-06 | Sidebar menu visibility per role | Only permitted items shown | `config/navigation.js` + `AppLayout.vue` filter | Same |
| T-AUTHZ-07 | **UI restriction is not the control** | Direct query bypassing the UI is **denied** | `docs/authentication.md:52` | 🔴 **The whole point.** Covered by § 5 |
| T-AUTHZ-08 | `Admin` reaches every route | All 21 routes accessible | `router/index.js` | Same |

### 2.3 CRUD

| ID | Scenario | Expected result | Current implementation | Migration validation |
|---|---|---|---|---|
| T-CRUD-01 | Student: create / read / update / delete | Persists | `SiswaView.vue:315, 363, 381, 446` | Same |
| T-CRUD-02 | Student: bulk delete | `.in('id', ids)` | `SiswaView.vue:297` | Same — **and verify the cascade scope** (§ 2.10) |
| T-CRUD-03 | Student: Excel import with template | Matched rows updated, new rows inserted | `SiswaView.vue:225-229` | Preserve the match key `${nama}_${tanggal_lahir}` (`:152, :168`) |
| T-CRUD-04 | Student: **`tanggal_lahir` round-trips** | Written and read back | `SiswaView.vue:158, 363, 381` | 🔴 Fails unless **drift #2** is resolved |
| T-CRUD-05 | Teacher: create / update / delete | Persists | `GuruView.vue:197, 203` | Same |
| T-CRUD-06 | Teacher: **`nip` round-trips** | Written and read back | `GuruView.vue:153, 193` | 🔴 Fails unless **drift #1** is resolved |
| T-CRUD-07 | Book: create / update / delete | Persists | `BukuView.vue:162, 167, 190, 233` | Same |
| T-CRUD-08 | Calendar: mark Masuk / Libur | Persists; upsert by date | `KalenderView.vue:91` | Same; `date` PK |
| T-CRUD-09 | Period: create / activate | Exactly one active | `PengaturanView.vue:142-164`; U-6 partial index `01:81-83` | ⚠️ Activating a second period must **not** silently leave two active rows |
| T-CRUD-10 | Settings: save identity + logo URL | `app_settings` upsert `id=1` | `PengaturanView.vue:101` | 🔴 Fails if **drift #4** (`favicon_url`) is unresolved |
| T-CRUD-11 | Settings: `daftar_kelas` jsonb round-trip | Array in, array out | `settings.js:23` | ⚠️ Must return a **JSON array**, not a string |
| T-CRUD-12 | Settings: `hari_libur_mingguan` round-trip | `[0,6]` semantics preserved | `settings.js:24`; `01:119` | ⚠️ JS day numbering (0=Sunday) |
| T-CRUD-13 | Delete-all maintenance functions ×4 | All rows removed | `PengaturanView.vue:276, 293, 308, 323` | Preserve, but see T-DATA-05 — **deleting `activity_logs` corrupts reports** |
| T-CRUD-14 | **`UNIQUE(date, student_nisn)` enforced** | Second insert for the same student/day is rejected or upserted | U-3 `01:54` | Constraint must survive |
| T-CRUD-15 | **`CHECK` constraints enforced** | Invalid `status`/`role`/`semester` rejected | C-1…C-8 | All 8 must survive, with C-1 widened |

### 2.4 Attendance (presensi)

| ID | Scenario | Expected result | Current implementation | Migration validation |
|---|---|---|---|---|
| T-ATT-01 | Load roster for the teacher's class | Correct students, active only | `InputPresensiView.vue:152` | Same |
| T-ATT-02 | Mark H / I / S / A and save | Upserted; `updated_at` set | `InputPresensiView.vue:218-225`; **TG-1** | TG-1 must be recreated, or `updated_at` stops advancing |
| T-ATT-03 | Re-save the same day | Updates, does not duplicate | U-3 + upsert | ⚠️ Depends on `ON CONFLICT (date, student_nisn)` being reproduced exactly |
| T-ATT-04 | Holiday date (calendar `Libur`) | Form locked; banner shown | `InputPresensiView.vue:143` | Same |
| T-ATT-05 | Weekend (`hari_libur_mingguan`) | Form locked | `settings.js:24` | Same |
| T-ATT-06 | Dirty guard: navigate away with unsaved changes | Custom confirm dialog | `InputPresensiView` `onBeforeRouteLeave` | Same |
| T-ATT-07 | Dirty guard: close the tab | Browser `beforeunload` | idem | Same |
| T-ATT-08 | Teacher sees only their own class | Roster filtered by `auth.kelas` | `InputPresensiView.vue:152` | ⚠️ UI only — the **database does not enforce this** (SEC-06). Decide and test the intended scope |
| T-ATT-09 | Submitted-state badge | Reflects whether the class was entered today | `InputPresensiView.vue:173-174` reads `activity_logs.record_id` | 🔴 **Must be preserved exactly** — this is the string-composite key ([inventory § 4.3](./DATABASE_INVENTORY.md#43-activity_logsrecord_id-is-a-string-encoded-composite-used-as-a-query-key)) |
| T-ATT-10 | `attendance_logs.kelas` snapshot semantics | Historical rows keep their original class after a student moves | `01:52` is denormalised with no FK | ⚠️ Preserve. Normalising it away would **rewrite history** |
| T-ATT-11 | `guru_input` recorded | Free-text name stored | `01:53` | Same (not FK'd) |

### 2.5 Reports

| ID | Scenario | Expected result | Current implementation | Migration validation |
|---|---|---|---|---|
| T-RPT-01 | **Rekap bulanan — matrix values** | Per-student H/I/S/A counts match a hand-computed fixture | `RekapView.vue:92-95` + post-processing | 🟡 **Golden-file test.** The arithmetic must be byte-identical |
| T-RPT-02 | Rekap bulanan — Total Hari Efektif / Libur | Correct | `RekapView.vue:94` + `submittedDates` logic | Same |
| T-RPT-03 | **Rekap semester — matrix values** | Correct over a semester range | `RekapSemesterView.vue:79-82` + post-processing | Golden-file test |
| T-RPT-04 | Rekap — wali kelas name and NIP in the header | Correct | `RekapView.vue:128`; `RekapSemesterView.vue:126` | 🔴 Fails unless **drift #1** is resolved |
| T-RPT-05 | Rekap PDF export | Downloads; letterhead, logo, and totals correct | `lib/pdfRekap.js` | ⚠️ **The logo is the most likely miss** — see [STORAGE § 4.3](./STORAGE_MIGRATION.md#43-migration-of-the-object-itself) |
| T-RPT-06 | Rekap Excel export | Downloads; values correct | `lib/excelExport.js` | Same |
| T-RPT-07 | **`LIKE '%:<kelas>'` filter correctness** | Correct subset selected | `RekapView.vue:95`; `RekapSemesterView.vue:82` | 🔴 Must return the same rows — and note it is a **full scan** (PERF-02) |
| T-RPT-08 | Library visit + circulation reports | Correct aggregation and filters | `RekapPerpusView.vue:65-66` | Golden-file test |
| T-RPT-09 | Library PDF/Excel export | Downloads; correct | `lib/pdfKunjungan.js`, `pdfSirkulasi.js` | Same |
| T-RPT-10 | Empty-range report | No crash; sensible empty state | view-level guards | Same |

### 2.6 Statistics

| ID | Scenario | Expected result | Current implementation | Migration validation |
|---|---|---|---|---|
| T-STAT-01 | Attendance statistics for the month | Percentages correct vs. a fixture | `StatistikView.vue:40-100` | Golden-file test |
| T-STAT-02 | Threshold highlighting | Correct rows flagged | `StatistikView.vue` + `presensi.threshold` | Same |
| T-STAT-03 | **Full-year `input_presensi` scan** | Correct, but bounded | `StatistikView.vue:61` — **no date filter** (PERF-01) | ⚠️ Correctness must hold; the unbounded scan is an opportunity to fix |
| T-STAT-04 | Pagination (25/page) | Correct slice | `StatistikView.vue:30-35` — client-side | Same result; consider server-side (PERF-17) |
| T-STAT-05 | Large `IN` list (600 students) | Works | `StatistikView.vue:76` | ⚠️ **May exceed URL length limits** — a real failure mode (PERF-05) |

### 2.7 Library

| ID | Scenario | Expected result | Current implementation | Migration validation |
|---|---|---|---|---|
| T-LIB-01 | Book catalogue CRUD + search + filter | Correct | `BukuView.vue:111, 162-190` | Same |
| T-LIB-02 | **Borrowed-count calculation** | Matches outstanding loans per book | `BukuView.vue:111-125` — two full-table reads joined in JS (PERF-07) | ⚠️ If rewritten as a JOIN, the result must be identical |
| T-LIB-03 | **Loan history embed** | Student name/class shown | `BukuView.vue:274` uses the **FK-hint** `students!book_loans_student_nisn_fkey` | 🔴 **Test the fallback path too** (`:280-283`). The fallback masks a broken hint — verify which path ran |
| T-LIB-04 | Create loan | Row created; status `dipinjam` | `PeminjamanView.vue:184` | Same |
| T-LIB-05 | Return loan | Status + `tanggal_kembali_aktual` set; `updated_at` via **TG-2** | `PeminjamanView.vue:236` | TG-2 must exist |
| T-LIB-06 | Overdue calculation | `tanggal_kembali_seharusnya < today` | `DashboardPerpusView.vue:100` | Same |
| T-LIB-07 | **Stock consistency** | `books.stok` reflects reality | ⚠️ **Nothing decrements `stok` on loan** (PERF-12) | 🔴 **Pre-existing correctness gap.** Reproduced faithfully by migration; decide whether to fix |
| T-LIB-08 | Manual visit entry | Row created | `KunjunganPerpusView.vue:100` | Same |
| T-LIB-09 | QR scan — first visit today | Recorded; success sound | `ScanQRView.vue:177-198` | ⚠️ `.single()` on a 0-row lookup returns an error, discarded (`:181`) — a backend returning `null` instead changes control flow (SD-08) |
| T-LIB-10 | QR scan — duplicate visit today | Rejected with warning | `ScanQRView.vue:184-190` | ⚠️ **The check is racy** — two concurrent scans can both pass. A UNIQUE index (IDX-F) would fix it |
| T-LIB-11 | QR scan — unknown student | Clear error | `ScanQRView.vue:170-172` | Same |
| T-LIB-12 | Member card print (bulk) | Correct QR + names + **TTL** | `CetakKartuView.vue:162, 376` | 🔴 Fails unless **drifts #2 and #3** are resolved |
| T-LIB-13 | Library dashboard KPI counts | Correct | `DashboardPerpusView.vue:113-115` — 3× `count:'exact', head:true` | ⚠️ Must remain **count-only** (no row transfer) |

### 2.8 Exports

| ID | Scenario | Expected result | Current implementation | Migration validation |
|---|---|---|---|---|
| T-EXP-01 | All PDF generators | Download; correct content | `lib/pdfRekap.js`, `pdfRekapSemester.js`, `pdfPerpus.js`, `pdfKunjungan.js`, `pdfSirkulasi.js` | Same |
| T-EXP-02 | Letterhead (`kop_baris2..5`) | Correct lines | `01:114-117` | Same |
| T-EXP-03 | Calendar Excel export | Correct | `lib/excelExport.js` | Same |
| T-EXP-04 | Large export | Completes without hanging | lazy-loaded `jspdf`/`xlsx` | Same; `[INFERRED]` unrelated to the backend |
| T-EXP-05 | **Logo in generated PDFs** | Present and correct | reads `app_settings.logo_url` | 🔴 **Most likely export regression.** A stale absolute URL yields a silently logo-less PDF — see [STORAGE § 4.3](./STORAGE_MIGRATION.md#43-migration-of-the-object-itself) |

### 2.9 Session recovery, mobile, desktop, concurrency

| ID | Scenario | Expected result | Current implementation | Migration validation |
|---|---|---|---|---|
| T-ENV-01 | Boot splash → content, no flicker | Single clean transition | `main.js:41-45`; `index.html` | Same |
| T-ENV-02 | Splash logo from `localStorage` cache | Shown on the very first frame | `index.html:86-95` | 🔴 **Breaks if the storage origin changes** — [CUTOVER: logo cache](./CUTOVER_PLAN.md#assets-and-the-logo-cache) |
| T-ENV-03 | Dynamic favicon from settings | Correct | `App.vue:14` | Same |
| T-ENV-04 | Stale chunk after deploy | Auto-reload to the target route | `router/index.js:186-191` | Unchanged by migration |
| T-ENV-05 | Desktop 1366×768 | Dashboard fits without vertical scroll | `docs/layout-budget.md` | UI-only; should be unaffected |
| T-ENV-06 | Mobile 360–390px | Bottom nav visible; content not occluded | `AppLayout.vue` | Same |
| T-ENV-07 | `prefers-reduced-motion` | Animations effectively off | `style.css` | Same |
| T-ENV-08 | Keyboard navigation and ESC | Focus visible; modals escape | UI components | Same |
| T-ENV-09 | **Concurrent attendance entry, 2 teachers, 2 classes** | Both saved; no lost update | `InputPresensiView` upsert | ⚠️ Upsert on disjoint rows should not conflict; verify no deadlock under the new backend |
| T-ENV-10 | **Two admins editing the same student** | Last write wins (or a conflict is surfaced) | no optimistic locking in code | ⚠️ `[INFERRED]` Last-write-wins is the current behaviour. If the backend adds locking, behaviour changes |
| T-ENV-11 | Concurrent QR scans of the same student | Currently racy (T-LIB-10) | `ScanQRView.vue:177-198` | Opportunity to fix with IDX-F |
| T-ENV-12 | Realtime dashboard refresh | ~1 s after another tab's change | `DashboardView.vue:294-308` | ⚠️ **Optional** — if realtime is dropped, the dashboard must still be correct on mount and tab switch |
| T-ENV-13 | 25 users entering attendance simultaneously | No errors; acceptable latency | `[UNKNOWN]` — no baseline exists | 🔴 **The load test that matters most** ([VPS_REQUIREMENTS § 2.4](./VPS_REQUIREMENTS.md#24-connections-are-the-real-constraint)) |

### 2.10 Database constraints and integrity

| ID | Scenario | Expected result | Current implementation | Migration validation |
|---|---|---|---|---|
| T-DATA-01 | All 11 tables have RLS enabled | `relrowsecurity = true` | `02:9-19` | All 11 |
| T-DATA-02 | **Cascade delete scope** | Deleting a student removes attendance, history, loans, visits | FK-3/4/6 `ON DELETE CASCADE` | ⚠️ **Test explicitly.** Omitting a cascade turns a silent success into a constraint error; adding one that was absent destroys data |
| T-DATA-03 | `activity_logs.user_id` → `SET NULL` on user delete | Log rows survive, anonymised | FK-2 `01:125` | Same |
| T-DATA-04 | Deleting a book cascades to its loans | Loans removed | FK-5 `01:171` | Same |
| T-DATA-05 | **Delete-all `activity_logs`, then view a report** | ⚠️ Every class appears "not submitted" | `PengaturanView.vue:293` + report reads of `record_id` | 🔴 **Pre-existing data-integrity defect.** Must survive testing so it is *known*, and fixed deliberately |
| T-DATA-06 | Only one active period | Partial unique index holds | U-6 `01:81-83` | 🔴 Must be recreated **as an index** |
| T-DATA-07 | Duplicate `auth_id` rejected | Unique constraint prevents it | ❌ **None exists** (SEC-08) | ➕ Add IDX-B and test |
| T-DATA-08 | `app_settings` singleton | `CHECK (id = 1)` | C-7 `01:104` | Same |
| T-DATA-09 | Orphan FK check after data load | Zero orphans | [DATA_MIGRATION § 9.1](./DATA_MIGRATION_PLAN.md#91-validation-queries-read-only-not-executed) | 🔴 Mandatory gate for S-6/S-11 |
| T-DATA-10 | Row-count parity, all 11 tables | Source == target | idem | 🔴 Mandatory |
| T-DATA-11 | **`users.password` handling** | Absent, or all `'***'` | SEC-03 | 🔴 **Must not carry plaintext** |

### 2.11 API security

| ID | Scenario | Expected result | Current implementation | Migration validation |
|---|---|---|---|---|
| T-SEC-01 | Unauthenticated request to any data endpoint | 401; **no data** | RLS fail-closed: all policies are `TO authenticated` | 🔴 Mandatory |
| T-SEC-02 | Authenticated but unauthorized (e.g. Guru → admin endpoint) | 403; no data | `Admin_All_*` policies | 🔴 Per role × table × operation |
| T-SEC-03 | **Anonymous read of every table** | Zero rows | Fail-closed RLS | 🔴 Verify, especially `library_visits` (SEC-04) |
| T-SEC-04 | **Anonymous storage upload / delete** | Rejected | ⚠️ **Currently permitted** (SEC-01) | 🔴 Must be closed in the new environment |
| T-SEC-05 | SQL injection via any input | No injection | Parameterised by PostgREST | 🔴 New backend must use parameterised queries; test string fields (names, NISN, search boxes) |
| T-SEC-06 | Error responses leak internals | No stack traces / SQL / connection strings | PostgREST returned opaque errors | 🔴 New backend must not leak |
| T-SEC-07 | **No secrets in the built bundle** | No DB host, credentials, or `postgres://` in `dist/` | anon key is public by design | 🔴 **Test the `VITE_*` trap** ([SECURITY § 4](./SECURITY_REVIEW.md#4-secrets-and-configuration)) |
| T-SEC-08 | Login rate limiting | Throttled/locked after N failures | Supabase platform `[UNKNOWN]` | 🔴 Must be rebuilt |
| T-SEC-09 | Forged `user_id` in an audit log insert | Rejected or ignored (server-set) | ⚠️ `WITH CHECK (true)` allows it (SEC-05) | 🔴 Fix |
| T-SEC-10 | TLS enforcement | Plaintext HTTP refused | Managed TLS | 🔴 Verify each leg |
| T-SEC-11 | Database not publicly reachable | Port 5432 filtered | N/A — not exposed today | 🔴 Verify from outside |

### 2.12 RLS replacement

Dedicated suite. RLS is the security boundary, and the migration replaces its supporting mechanism.

| ID | Scenario | Expected result | Current implementation | Migration validation |
|---|---|---|---|---|
| T-RLS-01 | `Admin`: full access, 11 tables × 4 operations | All allowed | `Admin_All_<table>` ×11 `02:76-84` | Identical |
| T-RLS-02 | `Guru`: `attendance_logs` read + write | Allowed | `Guru_Manage_Absensi` `02:88-92` | Identical |
| T-RLS-03 | `Guru`: `books` write | **Denied** | no policy permits it | Identical |
| T-RLS-04 | `Guru`: `book_loans` read | **Denied** | no `SELECT` policy | Identical |
| T-RLS-05 | `Guru`: `activity_logs` insert | Allowed | `Auth_Insert_ActivityLogs` `02:61-63` | Identical |
| T-RLS-06 | `Pustakawan`: `books` / `book_loans` / `library_visits` write | Allowed | `Perpus_Manage_*` `02:95-111` | Identical |
| T-RLS-07 | `Pustakawan`: `attendance_logs` write | **Denied** | no policy | Identical |
| T-RLS-08 | `Guru & Pustakawan`: both write sets | Both allowed | both policy sets | Identical — and requires **drift #5** resolved |
| T-RLS-09 | Any authenticated role: `Authenticated_Select` tables | Read allowed | `02:53-58` | Identical on 6 tables |
| T-RLS-10 | **`class_history` for a non-admin** | **Denied** | ⚠️ **no `SELECT` policy exists** (`class_history` is absent from `02:53-58`) | 🔴 Preserve the *denial*. An accidentally added policy would widen access |
| T-RLS-11 | `activity_logs` SELECT for non-admin | **Denied** | no policy | Identical |
| T-RLS-12 | **Anonymous (`anon`) access to every table** | **Denied everywhere** | fail-closed | 🔴 Must be denied. If `library_visits` (SEC-04) is live-permissive, this test **fails on the current system** — record that before cutover |
| T-RLS-13 | `get_my_role()` returns the correct role | Correct per user | `02:22-29` | 🔴 Requires the `auth.uid()` replacement |
| T-RLS-14 | `get_my_role()` with no session | `NULL` → **no policy matches** → denied | implicit | Verify it fails **closed**, never open |
| T-RLS-15 | **Policy additivity audit** | No `USING (true)` for a role that should not have one | `docs/database.md:96` states policies are OR-ed | 🔴 Enumerate `pg_policy` per table after the rebuild |
| T-RLS-16 | Table owner does **not** bypass RLS in normal operation | The runtime role is not the owner | N/A today | 🔴 Verify `relowner != current_user` ([SECURITY § 3.1](./SECURITY_REVIEW.md#31-recommended-role-separation)) |
| T-RLS-17 | Storage read policy equivalent | Public read works; **write requires admin** | ⚠️ anon-writable today (SEC-01) | 🔴 Must be closed |
| T-RLS-18 | Realtime authorization (if rebuilt) | Only permitted rows delivered | RLS-mediated in Supabase | 🔴 If realtime is rebuilt, an unauthorized subscriber must receive nothing |

### 2.13 Backup and restore

| ID | Scenario | Expected result | Current implementation | Migration validation |
|---|---|---|---|---|
| T-BAK-01 | Logical restore into a scratch DB | All 11 tables; row counts match | ✅ per [BACKUP_DR_PLAN T-R1](./BACKUP_DR_PLAN.md#84-restore-testing) | 🔴 Mandatory pre-cutover gate |
| T-BAK-02 | PITR restore to T-1h | Correct state at that instant | per T-R2 | 🔴 Mandatory if PITR is claimed |
| T-BAK-03 | Offsite-only restore | Succeeds without the primary host | per T-R3 | 🔴 |
| T-BAK-04 | Encryption round-trip | Decrypts and restores | per T-R4 | 🔴 |
| T-BAK-05 | **Restored DB + staging frontend** | Login, dashboard, presensi, rekap, library all work | per T-R6 | 🔴 **The test that proves the backup is usable** |
| T-BAK-06 | Restore timing | Meets RTO (≤ 4 h proposed) | per T-R5 | 🔴 |
| T-BAK-07 | Backup monitoring alerts on failure | Alert fires | ❌ no monitoring exists | 🔴 F-7 in [BACKUP_DR_PLAN § 9](./BACKUP_DR_PLAN.md#9-failure-scenarios-and-responses) |

---

## 3. Priority ordering

Not all tests are equal. If effort is limited, do them in this order.

| Tier | Tests | Why first |
|---|---|---|
| **P0 — blocking** | T-RLS-12, T-RLS-15, T-SEC-01…04, T-BAK-01, T-BAK-05, T-DATA-09, T-DATA-10, T-AUTH-15 | Security and recoverability. A system that leaks or cannot be restored must not go live |
| **P1 — correctness** | T-RPT-01, T-RPT-03, T-ATT-09, T-STAT-01, T-DATA-02, T-DATA-06, T-LIB-03, T-EXP-05 | Arithmetic and data integrity. Silent wrongness, not crashes |
| **P2 — functionality** | T-AUTH-01…17, T-AUTHZ-*, T-CRUD-*, T-ATT-01…11, T-LIB-* | The visible behaviour |
| **P3 — resilience** | T-ENV-09…13, T-AUTH-11, T-BACK-02/03/04/06/07 | Concurrency, cross-tab, PITR |
| **P4 — polish** | T-ENV-05…08, T-EXP-04 | Presentation; least migration-coupled |

`[INFERRED]` **P0 is deliberately front-loaded with security and restore tests, not functional
tests.** A migration that breaks a feature is visible and gets fixed. A migration that quietly
widens RLS, or produces a backup nobody can restore, is invisible until it matters.

---

## 4. Data-driven testing strategy

`[INFERRED]` Reports and statistics are **pure functions of table rows**. That makes them testable
without a database via golden files:

```
fixture/                       expected/
  students.json        ──►       rekap_2026-01.json
  attendance_logs.json           rekap_semester_2025-2026.json
  academic_calendar.json         statistik_2026-01.json
  activity_logs.json             dashboard_trend_2026.json
  users.json
```

Run the same aggregation code over the fixture, compare against the golden file, and the report
arithmetic is pinned for both the current implementation and the migrated one.

⚠️ `[INFERRED]` **Capture the golden files from the *current* system before migrating anything.**
Once the frontend is pointed at the new backend, there is no longer an authoritative source for
what "correct" was. This is a **pre-migration** step, and it is easy to skip.

| Fixture | Must include |
|---|---|
| `students` | At least one of each `status`; a student who changed class mid-year |
| `attendance_logs` | All 4 statuses; a holiday date; a date with no records |
| `academic_calendar` | Both `Masuk` and `Libur` |
| `activity_logs` | `input_presensi` entries with **both** `date:kelas` and `date:`-prefixed `record_id` shapes; a log row with `user_id = NULL` |
| `users` | All 4 roles, including `'Guru & Pustakawan'` |

---

## 5. Tooling

`[INFERRED]` No test framework exists. Recommendations, sequenced by value:

| Layer | Tool | Covers |
|---|---|---|
| Unit / golden-file | **Vitest** | Report arithmetic, date helpers, role getters |
| Component | Vue Test Utils | UI gates, guard behaviour |
| E2E | **Playwright** | Login → presensi → rekap smoke; mobile viewport |
| **RLS assertion harness** | SQL scripts + `pgTAP`, or a scripted matrix over `psql` | T-RLS-* — **highest value** |
| Load | `k6`, `autocannon`, or `pgbench` | T-ENV-13 |
| Restore | Scripted `pg_restore` + verification queries | T-BAK-* |

`[INFERRED]` `docs/testing.md:79-99` already names Vitest and Playwright as the intended choices and
notes the `webapp-testing` skill pattern for E2E. That plan is consistent with this one and needs
executing rather than inventing.

---

## 6. Exit criteria

The migration is testable enough to proceed when **all** of the following hold:

| # | Criterion |
|---|---|
| 1 | Golden files captured from the **current** system for every report and statistic |
| 2 | T-RLS-01…18 automated and passing against the **current** system (establishes a baseline) |
| 3 | The same RLS suite passes against the **migrated** system with identical outcomes |
| 4 | T-BAK-01 and T-BAK-05 pass — a proven restore, validated by the application |
| 5 | T-DATA-09 and T-DATA-10 pass after the production data load |
| 6 | T-SEC-07 passes — no credentials or hostnames in the built bundle |
| 7 | T-ENV-13 passes — 25 concurrent attendance entries without error |
| 8 | Every P0 and P1 test passes |

`[INFERRED]` Criteria 1 and 2 are the ones that must happen **before** the migration, because they
are impossible afterwards. Everything else can be validated during the staged roadmap
([CUTOVER_PLAN.md](./CUTOVER_PLAN.md#migration-roadmap)).
