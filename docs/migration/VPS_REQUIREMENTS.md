# VPS Requirements & Performance Audit

**Phases covered: 14 (VPS resource analysis), 15 (performance audit).**

> ⚠️ **Every number in § 1 and § 2 is an assumption, not a measurement.**
> The brief forbids inventing traffic figures, and the repository provides **no** usage data. What
> follows is: (a) the *structure* of the workload, which **is** verified from code; (b) parameterised
> sizing arithmetic, so the operator can substitute real numbers; and (c) the queries that will
> dominate, which are verifiable from the repository.

**No PostgreSQL database was created. No query was executed. No index was created.**

---

## 1. The honest position on sizing

### 1.1 What cannot be known from this repository

| Quantity | Status |
|---|---|
| Production row counts | `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION` |
| Actual database size | `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION` |
| Number of registered users | `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION` |
| Peak concurrent users | `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION` |
| Storage bucket size | `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION` |
| Index usage statistics | `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION` |
| Actual query latency | `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION` |
| Growth rate per year | `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION` |

The single query that would resolve most of this:

```sql
-- READ-ONLY. Not executed during this audit.
SELECT relname,
       n_live_tup                                        AS approx_rows,
       pg_size_pretty(pg_total_relation_size(relid))     AS total_size
FROM   pg_stat_user_tables
ORDER  BY pg_total_relation_tablesize DESC;
```

### 1.2 What *is* knowable, from code

The application's **shape** is fully determined by the repository. These are facts:

| Fact | Value | Evidence |
|---|---|---|
| Tables | 11 | `01_schema.sql` |
| Largest expected table | `attendance_logs` | IT IS the per-student-per-day fact table |
| Second largest | `library_visits` | per-student-per-visit |
| Third | `activity_logs` | written on nearly every mutation |
| Classes per school | 12 default | `app_settings.daftar_kelas` default `01:114` — `["1A"…"6B"]` |
| Grade levels | 6 | same |
| Roles | 4 | `docs/authentication.md:14` |
| Typical class size | `UNKNOWN` — no evidence | — |
| School days per year | ~200–240 (Indonesian school calendar) `[INFERRED]` — not a repo fact | — |

---

## 2. Sizing arithmetic (parameterised)

### 2.1 The dominant table

`attendance_logs` grows as:

```
rows_per_year  =  students  ×  school_days_per_year
```

with one row per student per day, enforced by U-3 `UNIQUE(date, student_nisn)`
(`01_schema.sql:54`). `[INFERRED]` A school day is roughly 200 effective days after weekends and
holidays (`academic_calendar` + `hari_libur_mingguan` handle the exceptions — `01:119`).

Row size estimate for `attendance_logs` `[INFERRED]`:

| Column | Approx. bytes |
|---|---|
| `id` uuid | 16 |
| `date` date | 4 |
| `student_nisn` text (10 chars) | ~14 |
| `status` text (≤5 chars) | ~8 |
| `kelas` text | ~8 |
| `guru_input` text | ~30 |
| `created_at`, `updated_at` timestamptz | 16 |
| Row header + alignment | ~24 |
| **Subtotal** | **~120 bytes** |

Plus index overhead: U-3's b-tree on `(date, student_nisn)`, plus IX-3, IX-4, IX-5. `[INFERRED]`
Indexes on this table typically add 60–100% on top of heap size, giving **~200–240 bytes/row
all-in**.

### 2.2 Three scenarios

**All three are illustrative. The user should supply real numbers.**

| Parameter | **Small school** | **Medium school** | **Multi-school** |
|---|---|---|---|
| Enrollment | 150 students | 600 students | 2,500 students (across N schools) |
| Classes | 6 | 12 | 40+ |
| Staff accounts | 15 | 45 | 150 |
| School days/yr | 210 | 210 | 210 |
| **`attendance_logs` rows/yr** | **31,500** | **126,000** | **525,000** |
| 5-year rows | 157,500 | 630,000 | 2,625,000 |
| `attendance_logs` heap (5 yr) | ~19 MB | ~76 MB | ~315 MB |
| + indexes (5 yr) | ~33 MB | ~130 MB | ~540 MB |
| `library_visits`/yr `[assumed 0.3/student/day]` | ~9,000 | ~38,000 | ~158,000 |
| `activity_logs`/yr `[assumed 1.5× school days × classes]` | ~1,900 | ~3,800 | ~12,600 |
| `students` | 150 | 600 | 2,500 |
| `books` `[assumed 10× classes]` | 60 | 120 | 400 |
| **Estimated total DB size (5 yr)** | **~50–80 MB** | **~200–300 MB** | **~1–1.5 GB** |
| Logo + storage | < 1 MB | < 1 MB | < 1 MB |

`[INFERRED]` **Every scenario lands in the "small database" regime.** Even the multi-school case at
1 GB is unremarkable for PostgreSQL — the engine's practical working set is far larger.

### 2.3 What that implies for the VPS

`[INFERRED]` — reasoning from the arithmetic, not a recommendation.

| Resource | Why the shape of the workload drives it |
|---|---|
| **RAM** | The entire medium-school database fits in PostgreSQL's page cache. The binding constraint is **not** data volume — it is `shared_buffers` + `work_mem` for concurrent sorts (the reports in § 3 sort in the browser, but `ORDER BY` on `students`/`books` runs server-side) |
| **CPU** | 2 cores is the practical floor: one for PostgreSQL, one for the backend/PostgREST + TLS. Heavier `ORDER BY`/`COUNT(*)` work and concurrent report generation argue for 2–4 |
| **Disk** | Size is trivial (§ 2.2). **IOPS and durability are what matter** — WAL fsync on every commit. Avoid network-backed block storage with unpredictable IOPS |
| **Disk type** | SSD/NVMe. Not for capacity — for `fsync` latency on the many small writes the app produces (`logActivity` on nearly every action) |
| **Bandwidth** | Small. Responses are JSON rows and one logo. The heavy assets (PDF/Excel) are generated **client-side** and never traverse the server |
| **Connections** | **The most likely first bottleneck.** See § 2.4 |

### 2.4 Connections are the real constraint

`[INFERRED]` Not data volume — **connection count.**

The evidence:

| Pattern | Evidence | Consequence |
|---|---|---|
| Each view fetches independently | `docs/architecture.md:31` | No shared cache; N open pages ≈ N concurrent DB consumers |
| `Promise.all` fan-out | `DashboardView.vue:117-118` (2 queries), `:199-200` (2), `RekapView.vue:92-95` (4), `RekapSemesterView.vue:79-82` (4), `DashboardPerpusView.vue:113-115` (3) | A single dashboard render can hold **4 simultaneous connections** |
| Realtime subscription held open | `DashboardView.vue:300-302` | Under Supabase, Realtime holds its own connection. A replacement using `LISTEN` or WebSockets holds one **per connected client** |
| No client-side query cache | `docs/architecture.md:41` — no persist plugin | Every navigation refetches |

`[INFERRED]` Arithmetic for the medium-school scenario: 45 staff accounts, weekday morning peak
when teachers enter attendance. If 25 are active and 5 have the dashboard open, that is
`5 × 4 + 20 × 1 = 40` concurrent consumers. PostgreSQL's default `max_connections` is **100** —
already 40% consumed, with no headroom for reporting bursts or admin work.

**This is why connection pooling is not optional.** It also strongly favours a backend that owns
its own pool, because then the browser count is decoupled from the database count entirely.

### 2.5 Multi-school: a feature, not a scaling exercise

⚠️ `[REPO]` **There is no tenant column anywhere in the schema.** No `school_id`, no `tenant_id`.
Every policy is `TO authenticated` with no tenant predicate
([RLS_MIGRATION.md § 3](./RLS_MIGRATION.md#3-per-table-analysis), "Institution/school isolation:
absent").

`[INFERRED]` Consequently the multi-school scenario is **not** a VPS-sizing question. It requires:

1. adding a tenant column to (at minimum) `users`, `students`, `books`, `app_settings`,
   `academic_periods`, `academic_calendar`;
2. adding tenant scoping to **every** RLS policy;
3. adding tenant filtering to **every** query;
4. deciding cross-school role semantics.

That is a substantial **application feature**, and it should be scoped and planned separately from
the database migration. Combining them would entangle two difficult changes.

---

## 3. Performance audit (Phase 15) — bottlenecks that will appear after migration

### 3.1 Why migration changes performance at all

`[INFERRED]` Supabase's PostgREST is a mature, compiled HTTP layer with its own connection pool,
prepared-statement cache, and query optimiser hints. A hand-written backend that awaits each query
sequentially is very likely to be slower per request than PostgREST was. The queries below are the
ones where that difference will be felt, ordered by expected impact.

### 3.2 Bottleneck inventory

| # | Bottleneck | Location | Why it is slow | Severity |
|---|---|---|---|---|
| PERF-01 | **Unbounded full-table scan of `activity_logs`** | `StatistikView.vue:61` — `.select('record_id').eq('aksi','input_presensi')` **with no date filter** | Reads **every `input_presensi` log row ever written**, then filters in JS. Grows linearly with years of operation | 🔴 **HIGH** |
| PERF-02 | **`LIKE` with a leading wildcard** | `RekapView.vue:95`, `RekapSemesterView.vue:82` — `.like('record_id', '%:kelas')` | A leading `%` makes `idx_activity_date` unusable — **full scan every report render**. Report pages are opened frequently at month/semester end | 🔴 **HIGH** |
| PERF-03 | **Lexicographic range on a text column** | `DashboardView.vue:200` — `.gte('record_id', date).lte('record_id', date+'~')` | Index-usable (prefix range) but only because of a `'~'` sentinel. Fragile and non-obvious | 🟡 MEDIUM |
| PERF-04 | **Client-side aggregation over full result sets** | `StatistikView.vue:76-100`, `DashboardView.vue:215-260`, `RekapView`/`RekapSemesterView` post-processing | Every row crosses the wire, then `Set`/object aggregation runs in JS. `[INFERRED]` For a medium school this is ~126k rows/year for `attendance_logs` if the range is a full year | 🔴 **HIGH** |
| PERF-05 | **`IN` list proportional to student count** | `StatistikView.vue:76` — `.in('student_nisn', nisnList).in('date', activeDays)` | A 600-student school builds a **600-element `IN`** × ~22 dates. `[INFERRED]` May exceed URL-length limits at scale — a real failure mode, not just slowness | 🟡 MEDIUM |
| PERF-06 | **Full-table reads** | `BukuView.vue:111` `.select('*')` on `books`; `SiswaView.vue:315` `.select('*')` on `students`; `DashboardPerpusView.vue:91` `.select('stok')`; `:98` all outstanding loans; `CetakKartuView.vue:37` `.select('*')` on `students` | No server-side pagination anywhere. Fine at hundreds of rows; degrades at thousands. `[REPO]` `docs/performance.md:60` names virtualisation as an *unstarted* backlog item | 🟡 MEDIUM |
| PERF-07 | **Two full-table reads joined in JS** | `BukuView.vue:111-112` — reads **all** books and **all** outstanding loans, then builds `borrowedCounts` client-side | Stock-per-book is computed by transferring both tables. `[INFERRED]` A `LEFT JOIN … GROUP BY` would transfer ~1 row per book instead | 🟡 MEDIUM |
| PERF-08 | **Repeated identical queries per navigation** | `stores/settings.js:14`, `stores/period.js:21`, `stores/auth.js:37` | Mitigated: both stores de-duplicate in-flight requests (`settings.js:54-59`, `period.js:38-42`) and cache after first load. `[INFERRED]` Effective — but the cache is per-page-load; a full reload refetches | 🟢 LOW |
| PERF-09 | **No index on `book_loans.book_id`** | `BukuView.vue:277` — `.eq('book_id', book.id)` | A loan-history lookup per book. Only IX-10 (`status`) and IX-11 (`student_nisn`) exist, `01:182-183` | 🟡 MEDIUM |
| PERF-10 | **No index on `users.auth_id`** | `02_rls.sql:27` — `get_my_role()` does `WHERE auth_id = auth.uid()` | **Evaluated per row per policy check** under RLS. A sequential scan of `users` on every access check | 🔴 **HIGH** |
| PERF-11 | **`COUNT(*)` three times per library dashboard load** | `DashboardPerpusView.vue:113-115` | `[INFERRED]` `count: 'exact'` is inherently a scan; three exact counts across year/month/day ranges. Acceptable at this scale, worth measuring | 🟢 LOW |
| PERF-12 | **No `stok` decrement on loan** | `PeminjamanView.vue:184` inserts a loan; nothing updates `books.stok` | `[INFERRED]` Not a *performance* issue — an **integrity** issue: stock is derived client-side (PERF-07) and the stored `stok` column can drift from reality | 🔴 **HIGH (correctness)** |
| PERF-13 | **N+1 updates in class promotion** | `PengaturanView.vue:241-244` — one `UPDATE` **per student** inside a loop | A 600-student promotion issues ~500 sequential round-trips. `[INFERRED]` Runs once a year, so the impact is a slow admin action rather than sustained load — but it is the clearest N+1 in the codebase | 🟡 MEDIUM |
| PERF-14 | **N+1 auth calls in Excel user import** | `GuruView.vue:115-129` — `signUp()` per row | One auth round-trip per imported teacher. Bounded by staff count (tens), so tolerable — but it is a **sequential** loop | 🟢 LOW |
| PERF-15 | **Realtime refetch storm** | `DashboardView.vue:294-297` — `postgres_changes` → debounced `fetchToday() + fetchTrend()` | Inputting attendance for 12 classes fires 12 events → one debounced refetch (1 s). `[INFERRED]` Debounce is correct; the cost is a full trend re-fetch, not an incremental update | 🟡 MEDIUM |
| PERF-16 | **Full-year trend query** | `DashboardView.vue:195-215` — `mode === 'yearly'` reads a full year of `attendance_logs` for one chart | `[INFERRED]` ~126k rows for a medium school. Acceptable in PostgREST; a hand-written endpoint that buffers all rows would be worse | 🟡 MEDIUM |
| PERF-17 | **Client-side pagination only** | `StatistikView.vue:30-35` — `itemsPerPage = 25` slices an already-fully-loaded array | The `LIMIT` is applied in the browser. All rows crossed the wire first | 🟡 MEDIUM |

### 3.3 The two structural problems

**PERF-01/02 — `activity_logs` is a reporting table wearing an audit table's clothes.**

Both derive from the same root cause, documented in
[DATABASE_INVENTORY § 4.3](./DATABASE_INVENTORY.md#43-activity_logsrecord_id-is-a-string-encoded-composite-used-as-a-query-key):
the "was this class submitted?" question is answered by **scanning the audit log**, with the answer
encoded as a string in `record_id`.

| Consequence | Detail |
|---|---|
| Unbounded growth | `activity_logs` grows forever and is never pruned |
| Un-indexable predicates | `LIKE '%:kelas'` cannot use an index (PERF-02) |
| Whole-table scans | `StatistikView` reads all `input_presensi` rows with no date bound (PERF-01) |
| Fragile | The `'~'` sentinel at `DashboardView.vue:200` is load-bearing and undocumented |
| Coupled to a reset button | `PengaturanView.vue:293` deletes **all** activity logs — which would make every class appear "not yet submitted" |

`[INFERRED]` **This is the highest-value normalisation available**, and it is a *correctness and
performance* improvement available independently of the migration. Splitting `record_id` into typed
columns (or better, deriving submission state from `attendance_logs` itself) would eliminate PERF-01,
PERF-02, PERF-03, and a latent data-integrity bug. It is a behaviour change requiring the report
tests in [TEST_PLAN.md](./TEST_PLAN.md).

**PERF-10 — the RLS helper has no index.**

`get_my_role()` (`02_rls.sql:27`) runs `SELECT role FROM public.users WHERE auth_id = auth.uid()`.
No index on `auth_id` exists. Under PostgREST's role switching this executes **on every policy
evaluation**, and policies are evaluated per row.

`[INFERRED]` On Supabase this was likely masked by a small `users` table (tens of rows) that stays
in cache. On a self-hosted instance it will still be fast for the same reason — but it becomes a
real cost if the table grows, and it is a **two-line fix** that should not be deferred. Uniqueness
is also unenforced (RLS-OB-2), which matters more than the performance.

### 3.4 Indexes required

**None were created.** This is the recommendation set, with evidence.

| # | Index | Table | Definition | Justification | Priority |
|---|---|---|---|---|---|
| IDX-A | **`users(auth_id)`** | `users` | `CREATE INDEX … ON public.users (auth_id);` | `get_my_role()` `02:27` runs on every policy evaluation; no index exists today | 🔴 **High** |
| IDX-B | **`users(auth_id)` UNIQUE** | `users` | `CREATE UNIQUE INDEX … ON public.users (auth_id);` | Uniqueness unenforced (RLS-OB-2). `.single()` at `auth.js:37` **errors** on duplicates | 🔴 **High** |
| IDX-C | **`book_loans(book_id)`** | `book_loans` | `CREATE INDEX … ON public.book_loans (book_id);` | `BukuView.vue:277` filters by `book_id`; only `status`/`student_nisn` indexes exist (`01:182-183`) | 🟡 Medium |
| IDX-D | **`attendance_logs(date, kelas)`** | `attendance_logs` | `CREATE INDEX … ON public.attendance_logs (date, kelas);` | Composite matches the dominant access path: `.eq('date').eq('kelas')` (`InputPresensiView.vue:174`) and `.gte(lte)` + `.eq('kelas')` (`RekapView.vue:93`). Existing IX-3 is `(date)` alone, IX-5 is `(kelas)` alone | 🟡 Medium |
| IDX-E | **`attendance_logs(student_nisn, date)`** | `attendance_logs` | `CREATE INDEX … ON public.attendance_logs (student_nisn, date);` | `StatistikView.vue:76` filters by `student_nisn` **and** date. IX-4 `(student_nisn)` partly covers it; the composite is strictly better | 🟢 Low |
| IDX-F | **`library_visits(student_nisn, tanggal)`** | `library_visits` | `CREATE UNIQUE INDEX` **or** `CREATE INDEX … (student_nisn, tanggal);` | `ScanQRView.vue:177-182` does a select-then-insert duplicate check. ⚠️ **The check is racy** — two concurrent scans of the same student can both pass. A **UNIQUE index would make it correct** as well as fast | 🟡 Medium |
| IDX-G | **Verify/keep `idx_one_active_period`** | `academic_periods` | partial unique, `01:81-83` | Enforces the singleton-active invariant. Must survive the migration | 🔴 **High (correctness)** |
| IDX-H | **Reconsider `idx_students_status`** | `students` | existing `01:40` | `[INFERRED]` Low cardinality (`aktif`/`lulus`/`pindah`/`keluar`) — often not selective enough to be used. Verify with `pg_stat_user_indexes` before keeping | 🟢 Low |

⚠️ `[INFERRED]` **Do not create these blindly.** `pg_stat_user_indexes` against the live database
is the right input. IDX-A, IDX-B, IDX-G and IDX-F are correctness-motivated and should be added
regardless; IDX-C/D/E/H are performance-motivated and should be justified by measurement.

### 3.5 Query rewrites worth considering (not executed)

| # | Current | Better shape | Risk of change |
|---|---|---|---|
| QR-1 | `activity_logs` string-composite lookups (PERF-01/02/03) | Derive submission state from `attendance_logs`, or add typed columns | **Behaviour change** — requires the report tests |
| QR-2 | Client-side stock calculation (PERF-07) | `LEFT JOIN books… GROUP BY` or a view | Low — output shape preserved |
| QR-3 | Client-side aggregation (PERF-04) | Server-side `GROUP BY` returning one row per student | Medium — response shape changes; templates must adapt |
| QR-4 | `IN` lists proportional to students (PERF-05) | Join against a `kelas`/date filter server-side | Medium |
| QR-5 | Per-student `UPDATE` loops (PERF-13) | Single `UPDATE … FROM (VALUES …)` or a set-based statement | Low |
| QR-6 | Client-side pagination (PERF-17) | `LIMIT`/`OFFSET` or keyset pagination server-side | Low |

`[INFERRED]` **QR-1 is the one that pays for itself immediately** and removes a correctness bug.
The others are optimisations that should wait for measurement — `docs/testing.md` and
`docs/performance.md` both reflect a repo culture of measuring before optimising
(`docs/performance.md:33` warns against restoring custom `manualChunks` "without re-measuring").

---

## 4. Verification queries for the live database

Read-only. **Not executed during this audit.** These produce the numbers § 2 currently lacks.

| Purpose | Query |
|---|---|
| Database size | `SELECT pg_size_pretty(pg_database_size(current_database()));` |
| Per-table rows & size | `SELECT relname, n_live_tup, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC;` |
| Index usage | `SELECT relname, indexrelname, idx_scan, idx_tup_read FROM pg_stat_user_indexes ORDER BY idx_scan;` |
| Unused indexes | `SELECT indexrelname FROM pg_stat_user_indexes WHERE idx_scan = 0 AND relname NOT LIKE 'pg_%';` |
| Missing-FK-index check | `SELECT conrelid::regclass, conname FROM pg_constraint WHERE contype = 'f' AND conrelid::regclass::text IN ('public.book_loans','public.users','public.attendance_logs','public.class_history','public.library_visits');` |
| Table/index bloat | `SELECT relname, n_dead_tup, n_live_tup FROM pg_stat_user_tables ORDER BY n_dead_tup DESC;` |
| Slow queries | `SELECT query, calls, mean_exec_time, total_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;` ⚠️ *Requires the `pg_stat_statements` extension — `UNKNOWN` whether it is enabled* |
| Auth user count | `SELECT count(*) FROM auth.users;` |
| Storage object count/size | `SELECT count(*), pg_size_pretty(sum((metadata->>'size')::bigint)) FROM storage.objects WHERE bucket_id = 'assets';` |

---

## 5. Summary

| Question | Answer |
|---|---|
| Can VPS sizing be determined from the repository? | ❌ **No.** Every number in § 1.1 is `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION` |
| Is the data volume large? | ❌ **No.** All three scenarios (§ 2.2) land at 50 MB – 1.5 GB over five years. This is a small database |
| What will actually constrain the VPS? | **Connections, not data.** § 2.4: a single dashboard render holds 4 connections; ~40 concurrent consumers is plausible at medium-school scale against a default `max_connections` of 100 |
| What must exist before production traffic? | A **connection pooler**, and a backup strategy ([BACKUP_DR_PLAN.md](./BACKUP_DR_PLAN.md)) |
| Biggest query-level problem | **`activity_logs` used as a reporting table** (PERF-01/02) — unbounded scans with un-indexable predicates |
| Biggest correctness-adjacent problem | **PERF-12** — `books.stok` is never updated by a loan; stock is derived client-side, so stored and displayed stock can diverge |
| Two-line wins available immediately | **IDX-A** (index on `users.auth_id`) and **IDX-B** (unique constraint on it) |
| Is multi-school a sizing question? | ❌ **No.** It is a missing feature — there is no tenant column anywhere ([RLS_MIGRATION § 3](./RLS_MIGRATION.md#3-per-table-analysis)) |
| Can performance be verified before cutover? | ✅ Yes — stage S-9, using the read-only queries in § 4 and the tests in [TEST_PLAN.md](./TEST_PLAN.md) |
