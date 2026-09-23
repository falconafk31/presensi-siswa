# Migration Risks

**Phase 18 — risk matrix, blocking issues, and consolidated unknowns.**

> No overall score is given, deliberately. A single number would hide which risks are *gates*
> (§ 2) versus which are *work* (§ 1). The two behave differently: one stops the project, the other
> just costs effort.
>
> Risk levels used: **LOW** · **MEDIUM** · **HIGH** · **CRITICAL**.

---

## 1. Risk matrix

| # | Area | Risk | Reason | Evidence | Mitigation |
|---|---|---|---|---|---|
| R-01 | **Schema fidelity** | **CRITICAL** | The repository SQL cannot recreate production. Four columns the app reads are undeclared; one role value violates a declared CHECK | `users.nip` (`GuruView.vue:153`), `students.tanggal_lahir` (`SiswaView.vue:158`), `students.tempat_lahir` (`CetakKartuView.vue:162`), `app_settings.favicon_url` (`settings.js:29`); role `'Guru & Pustakawan'` vs `01_schema.sql:17` | Dump the live schema; reconcile object-by-object; make the **reviewed result** the migration input ([DATA_MIGRATION § 0](./DATA_MIGRATION_PLAN.md#0-prerequisite-close-the-schema-drift)) |
| R-02 | **Auth** | **CRITICAL** | Supabase Auth is mandatory and total. Every route guard, every RLS policy, and profile loading depend on it. There is **no** credential-verification code in the repository | `auth.js:90-107`; `02_rls.sql:27`; `06_final_snapshot.sql:33, 75-86` | Treat auth as a **rebuild**; fix the identity model before designing the API ([AUTH_MIGRATION § 9](./AUTH_MIGRATION.md#9-the-database-vs-platform-split)) |
| R-03 | **RLS** | **CRITICAL** | Policies are written `TO authenticated` and call `auth.uid()`. Neither exists off Supabase. RLS with no applicable policy denies everything, so the failure is a total outage — or, if misconfigured, a silent widening | `02_rls.sql:9-19, 22-29, 53-111` | Choose an identity mechanism; port 22 policies; verify by **outcome parity** per role × table × operation (T-RLS-*) |
| R-04 | **Data integrity on cutover** | **HIGH** | A consistent final copy requires a write-freeze. Without one the copy is a moving target | [CUTOVER_PLAN § Where downtime is unavoidable](./CUTOVER_PLAN.md#where-downtime-is-unavoidable) | Planned window during a low-activity period; freeze writes; verify counts |
| R-05 | **Rollback** | **HIGH** | Once the new system accepts writes, two divergent datasets exist with **no reconciliation tooling** anywhere in the repository | [CUTOVER_PLAN § Rollback](./CUTOVER_PLAN.md#rollback) | Cut over when no writes are expected for hours; keep Supabase read-only ≤ 30 days; rehearse rollback before T-0 |
| R-06 | **Backup / restore** | **CRITICAL** | There is **no complete backup and no restore path**. The app's "Backup" button exports 4 of 11 tables as `.xlsx` with no import path | `PengaturanView.vue:340-405`, `.limit(1000)` at `:354`; [BACKUP_DR_PLAN § 1.1](./BACKUP_DR_PLAN.md#11--the-applications-backup-button-is-not-a-backup) | Full logical backup + **perform a restore** + monitoring, all before S-11 ([BACKUP_DR_PLAN § 10](./BACKUP_DR_PLAN.md#10-what-must-be-true-before-cutover)) |
| R-07 | **Permissions / grants** | **HIGH** | The repository contains **zero** `GRANT` statements. Supabase issued them automatically. An omitted grant yields `permission denied`; an omitted policy yields zero rows — both look like "the migration is broken" | grep of `supabase/*.sql`; [DATA_MIGRATION § 5.5](./DATA_MIGRATION_PLAN.md#55-grants) | Add an explicit grants step; test each role's access explicitly |
| R-08 | **Connection exhaustion** | **HIGH** | No pooling today (Supabase provided it). A single dashboard render holds 4 concurrent queries; `max_connections` defaults to 100 | `DashboardView.vue:117-118, 199-200`; `RekapView.vue:92-95`; `RekapSemesterView.vue:79-82`; [VPS_REQUIREMENTS § 2.4](./VPS_REQUIREMENTS.md#24-connections-are-the-real-constraint) | Deploy a pooler; load-test 25 concurrent entries (T-ENV-13) |
| R-09 | **Data exposure via dangling RLS** | **CRITICAL** | `allow_all_library_visits` grants `anon` full access to `library_visits`, which contains student PII. Policies are additive, so it **silently overrides** the strict policy. Live state unknown | `05_library_visits.sql:19-21`; `docs/database.md:96` states policies are OR-ed; [SECURITY SEC-04](./SECURITY_REVIEW.md#sec-04--a-permissive-anon-policy-may-still-grant-full-access-to-library_visits) | Enumerate `pg_policy` **before** cutover; record the result as evidence; never reproduce the policy; prove the new env is no more permissive |
| R-10 | **Storage** | **HIGH** | The logo is anon-writable; `logo_url` is an absolute URL stored in the DB **and** cached in `localStorage` **and** read by an inline splash script before JS runs | `03_storage.sql:17-31`; `PengaturanView.vue:121-123`; `settings.js:41-45`; `index.html:86-95` | Public-read / admin-write object store; stable URL or coordinated cache-key change; verify all 5 PDF generators ([CUTOVER: logo cache](./CUTOVER_PLAN.md#assets-and-the-logo-cache)) |
| R-11 | **No data-access seam** | **HIGH** | `supabase.from()` is called at **102 sites across 22 files** — including in views. No repository layer exists, so nothing can be migrated behind a boundary, and old/new paths cannot run side by side | `docs/architecture.md:31`; [SUPABASE_DEPENDENCIES § 6](./SUPABASE_DEPENDENCIES.md#6-the-missing-seam) | Introduce a data-access module first (option C1), or accept a whole-application change at once |
| R-12 | **PostgREST semantics** | **HIGH** | Embeds, `count: 'exact'`, `.single()`'s `PGRST116`, upsert-on-conflict, and the filter-required DELETE trick are all PostgREST behaviours embedded in view code | `DashboardView.vue:145`; `DashboardPerpusView.vue:113-115`; `ScanQRView.vue:182`; `PengaturanView.vue:276` | Reimplement each deliberately; pin with contract tests before swapping the backend |
| R-13 | **FK constraint name dependency** | **MEDIUM** | Code embeds the **auto-generated** name `book_loans_student_nisn_fkey`. A differently-named FK breaks the query — **and a silent fallback masks it** | `BukuView.vue:274`, fallback `:280-283` | Name the FK explicitly, or drop the hint. Test **which path** runs, not just that data appears |
| R-14 | **`activity_logs` dual role** | **HIGH** | It is an audit trail *and* a reporting input. "Was attendance submitted?" is answered by scanning it, keyed by a string composite. Only PITR can undo a bad reset | `InputPresensiView.vue:173`; `RekapView.vue:95`; `StatistikView.vue:61`; `StatistikView.vue:67`; `PengaturanView.vue:293`; [inventory § 4.3](./DATABASE_INVENTORY.md#43-activity_logsrecord_id-is-a-string-encoded-composite-used-as-a-query-key) | Preserve semantics exactly; golden-file tests. Consider normalising — but only with report tests in place |
| R-15 | **Secrets in the bundle** | **CRITICAL** | The repo's convention is a `VITE_*` env file exposed to the browser by design. Appending `VITE_` to a DB connection string would publish hostname, user, and password to every visitor | `docs/deployment.md:33`; `SECURITY.md:25`; [SECURITY § 4](./SECURITY_REVIEW.md#4-secrets-and-configuration) | All new secrets server-side only. **Grep the built bundle** for hostnames/`postgres://` (T-SEC-07) |
| R-16 | **Database exposure** | **CRITICAL** | A self-hosted VPS makes port 5432 a candidate for exposure. RLS does **not** protect a direct connection — table owners bypass it | today: not exposed (`docs/architecture.md:9`); [SECURITY SEC-09](./SECURITY_REVIEW.md#sec-09--the-database-is-not-currently-exposed-keeping-it-that-way-is-the-operators-job) | Bind to loopback/private interface; firewall 5432; prefer a private network or unix socket; never publish |
| R-17 | **Passwords change** | **HIGH** | Virtual emails cannot receive mail → no self-service reset, no bulk email path. `auth` schema holds GoTrue-specific hashes and must not be copied | `auth.js:88`; `docs/authentication.md:73`; `06:84`; [DATA_MIGRATION § 3.4](./DATA_MIGRATION_PLAN.md#34-do-not-dump-the-auth-schema) | Accept credential recreation; distribute out-of-band; **notify users at T-7 days** |
| R-18 | **`auth_id` mapping** | **HIGH** | `auth_id` referenced `auth.users`, which will not exist. Nulling it makes `get_my_role()` return null and **locks out every user** | `06:24`; `02:27`; [DATA_MIGRATION § 2.1](./DATA_MIGRATION_PLAN.md#21-the-one-row-that-cannot-be-migrated-honestly) | Create new identities **first**, then map old→new so `WHERE auth_id = ?` keeps working unchanged |
| R-19 | **Realtime** | **MEDIUM** | One `postgres_changes` subscription with no PostgreSQL equivalent. Supabase also filtered payloads by RLS; a naive replacement notifies everyone | `DashboardView.vue:300-302`; [SUPABASE_DEPENDENCIES § 7.3](./SUPABASE_DEPENDENCIES.md#73-replacement-requirements) | Optional — the dashboard already refreshes on mount and tab switch. Defer or drop; if rebuilt, authorize the stream |
| R-20 | **Realtime bundle coupling** | **LOW** | A Vite alias + shim replaces `@supabase/realtime-js` to code-split it; `whenRealtimeReady()` swaps a js object's internal field | `vite.config.js:22-33`; `lib/lazyRealtime.js`; `supabase.js:25-33` | Delete all three on migration. This is the one place migration **removes** complexity |
| R-21 | **No automated tests** | **HIGH** | No Vitest, no Playwright, no test script. Report arithmetic is verified only by clicking | `docs/testing.md:3`; `package.json` scripts | Build the harness and capture golden files **before** migrating ([TEST_PLAN § 6](./TEST_PLAN.md#6-exit-criteria)) |
| R-22 | **Query performance** | **MEDIUM** | Full scans with un-indexable predicates; unbounded `activity_logs` scans; client-side aggregation; a 600-element `IN` list | `StatistikView.vue:61, 76`; `RekapView.vue:95`; `DashboardView.vue:195-215`; [VPS_REQUIREMENTS § 3.2](./VPS_REQUIREMENTS.md#32-bottleneck-inventory) | Measure first (S-9); add IDX-A/B (correctness) and the measured set |
| R-23 | **Missing index on `users.auth_id`** | **MEDIUM** | `get_my_role()` runs `WHERE auth_id = …` on **every policy evaluation**, and `auth_id` is not indexed or unique | `02:27`; `06:24` has no index; `docs/database.md:26` calls it *"UNIQUE-ish"* | Add `CREATE UNIQUE INDEX` (IDX-A/B) — two lines, highest value-per-effort item in the audit |
| R-24 | **Vestigial `pgcrypto`** | **LOW** | Declared but unnecessary on PG ≥ 13; `gen_random_uuid()` is core | `01_schema.sql:7` | Keep it (harmless) or drop it. Either is fine |
| R-25 | **Extensions actually installed** | **MEDIUM** | Supabase pre-installs extensions; the repo declares only `pgcrypto`. Others may exist and be relied upon by the live database | `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION` | `SELECT * FROM pg_extension;` before specifying the target |
| R-26 | **`06_final_snapshot.sql` is destructive** | **HIGH** | It contains `TRUNCATE public.users CASCADE` and four `DELETE`s against `auth.*`. Its filename invites sequential execution; `docs/database.md:11` lists it in the run order | `06:17-21`; [inventory § Drift #8](./DATABASE_INVENTORY.md#drift-8--06_final_snapshotsql-performs-destructive-operations) | Treat as historical documentation. **Never execute.** Extract only FK-1's definition and the trigger logic |
| R-27 | **`SECURITY DEFINER` without `search_path`** | **MEDIUM** | Three functions run as their owner. Self-hosted, the owner may be a superuser; unqualified references become hijackable | `02:22-29`, `06:29-60`, `06:67-73`; [SECURITY SEC-07](./SECURITY_REVIEW.md#sec-07--security-definer-functions-do-not-pin-search_path) | `SET search_path = public, pg_temp`; run DDL as a non-superuser owner |
| R-28 | **Cascade-delete ambiguity** | **MEDIUM** | 4 tables cascade from `students`. Recreating an FK without its cascade changes a silent success into an error; adding one that was absent destroys data | FK-3/4/5/6 `01:48, 90, 171, 172`; [inventory § 2.6](./DATABASE_INVENTORY.md#26-cascade-delete-map) | Decide each cascade explicitly; test with T-DATA-02 |
| R-29 | **Multi-school is not a migration** | **MEDIUM** | No tenant column exists anywhere; no policy has a tenant predicate | all of `01_schema.sql`; [RLS § 3](./RLS_MIGRATION.md#3-per-table-analysis) | Scope as a separate feature. Do not entangle with the migration |
| R-30 | **Frontend/backend contract drift** | **MEDIUM** | 100 untranslated call sites consume PostgREST response shapes; no generated types exist to catch mismatch | 22 files; no `*.ts`, no `database.types.ts` | Contract tests per endpoint; migrate view-by-view with tests, not big-bang |
| R-31 | **Deferred-failure storage breakage** | **MEDIUM** | If the old bucket stays live during the rollback window, everything looks correct; breakage appears weeks later when it is decommissioned | `index.html:86-95`; [CUTOVER: logo cache](./CUTOVER_PLAN.md#assets-and-the-logo-cache) | Use a stable domain, or change the cache key; **re-verify the splash after decommissioning** |
| R-32 | **Vendor lock-in to Supabase *software*** | **MEDIUM** | Option B replaces the hosted service but keeps PostgREST/GoTrue/`storage` schema — Supabase-specific software that the operator must then version and upgrade | `src/lib/supabase.js:12`; [POSTGRES_ARCHITECTURE § 4](./POSTGRES_ARCHITECTURE.md#option-b--frontend--self-hosted-supabase-compatible-backend--postgresql) | Accept explicitly, or choose option A/C5 for a full exit |
| R-33 | **Existing latent bugs** | **MEDIUM** | Several pre-existing defects will be encountered during testing and may be misattributed to the migration | `books.stok` never decremented on loan (PERF-12); delete-all `activity_logs` corrupts reports (T-DATA-05); `toISOString()` date bug (UTC day boundary); `.single()` on an expected-empty lookup (`ScanQRView.vue:182`) | Catalogue them **before** cutover so they are not mistaken for regressions |
| R-34 | **`hari_libur_mingguan` semantics** | **LOW** | A `jsonb` number array using **JavaScript** `getDay()` numbering (0 = Sunday), consumed by `stores/settings.js:24` | `01:119`; `settings.js:24` | Preserve the array shape and numbering; document it. Do not "improve" it into SQL `DOW` semantics |
| R-35 | **No monitoring today** | **MEDIUM** | Nothing watches availability, connections, disk, slow queries, or backup success. `docs/performance.md:59` lists runtime monitoring as unstarted backlog | `docs/performance.md:59` | New operational responsibility; must exist **before** S-12, not after |
| R-36 | **CI unaffected but insufficient** | **LOW** | CI runs `npm ci` → guard → build. It will keep passing through the entire migration regardless of backend correctness | `.github/workflows/ci.yml` | Add contract/RLS tests to CI. Do not mistake a green CI for a validated migration |

### 1.1 Distribution

| Level | Count | IDs |
|---|---|---|
| **CRITICAL** | **7** | R-01, R-02, R-03, R-06, R-09, R-15, R-16 |
| **HIGH** | **11** | R-04, R-05, R-07, R-08, R-10, R-11, R-12, R-14, R-17, R-18, R-21, R-26 (see note) |
| **MEDIUM** | **13** | R-13, R-19, R-22, R-23, R-25, R-27, R-28, R-29, R-30, R-31, R-32, R-33, R-35 |
| **LOW** | **4** | R-20, R-24, R-34, R-36 |

*(The counts are indicative; several risks sit on a boundary and their level is a judgement about
impact, not a measurement.)*

`[INFERRED]` **Read the distribution, not a total.** The CRITICAL set is narrow and thematically
consistent: *schema fidelity, identity, authorization, recoverability, and secrets.* Four of the
seven are about the same underlying fact — **Supabase supplied mechanisms that the repository never
contained and that nothing local can be copied from.**

---

## 2. Blocking issues

Gates. Each must clear before its dependent work starts. Distinct from § 1: risks cost effort,
blockers stop progress.

| ID | Blocking issue | Blocks | Why it blocks | Cleared by |
|---|---|---|---|---|
| **BLK-1** | **Schema drift unresolved** | S-2 and everything downstream | The target schema is unknown. Any schema written now would be a guess, and the guess is provably wrong (`users.role` CHECK) | Schema-only dump + reconciliation ([DATA_MIGRATION § 0](./DATA_MIGRATION_PLAN.md#0-prerequisite-close-the-schema-drift)) |
| **BLK-2** | **Identity model undecided** | S-4 (API design), S-5, S-7 | Every endpoint's authorization depends on how identity reaches the database. Choosing after building means rewriting every endpoint | Choose one of the three approaches ([RLS § 2.1](./RLS_MIGRATION.md#21-what-role-switching-means-and-why-its-loss-matters-most)) |
| **BLK-3** | **No proven restore path** | S-11, S-12, S-14 | Cutover cannot be offered a rollback window without a tested restore. Today the only "backup" is a 4-of-11-table `.xlsx` with no import path | Full backup + **perform and validate** a restore ([BACKUP_DR_PLAN § 10](./BACKUP_DR_PLAN.md#10-what-must-be-true-before-cutover)) |
| **BLK-4** | **Live RLS state unknown** | S-2, S-10 | `allow_all_library_visits` may still grant `anon` full access to student PII. Building on an unknown baseline means the security comparison cannot be made | Enumerate `pg_policy` for all tables; record as evidence ([SECURITY SEC-04](./SECURITY_REVIEW.md#sec-04--a-permissive-anon-policy-may-still-grant-full-access-to-library_visits)) |
| **BLK-5** | **No test harness, no golden files** | S-8, S-11 | Once the frontend points at the new backend, there is no authoritative record of what "correct" output was. Golden files **cannot be captured retroactively** | Build the harness; capture golden files from the current system ([TEST_PLAN § 6](./TEST_PLAN.md#6-exit-criteria)) |
| **BLK-6** | **No connection-pooling plan** | S-9, S-12 | The likeliest saturation failure ([VPS_REQUIREMENTS § 2.4](./VPS_REQUIREMENTS.md#24-connections-are-the-real-constraint)) | Specify a pooler; load-test 25 concurrent entries |

### 2.1 Blocking issue dependency graph

```
BLK-1 (schema drift) ──────► S-2 ──► S-3 ──► S-6 ──┐
                                                    │
BLK-4 (RLS state) ─────────► S-2                    │
                                                    ▼
BLK-2 (identity) ──────────► S-4 ──────────────► S-7 ──► S-8 ──┐
                                                    ▲          │
BLK-5 (tests/golden) ──────► S-8 ───────────────────┘          │
                                                               ▼
BLK-3 (restore path) ──────► S-11 ──► S-12 ──► S-13 ──► S-14
                                                               ▲
BLK-6 (pooling) ───────────► S-9 ──────────────────────────────┘
```

`[INFERRED]` **Two of the six blockers (BLK-3, BLK-5) are entirely within the operator's control and
need no architectural decision.** They are also the two most likely to be deferred, because neither
feels like part of "the migration". Both are prerequisites for a safe cutover.

---

## Unknowns requiring live inspection

Consolidated. **None of these can be resolved from the repository**, and each materially affects a
decision.

| # | Unknown | Blocks / affects | How to resolve |
|---|---|---|---|
| U-01 | Actual row counts per table | VPS sizing ([VPS_REQUIREMENTS § 1.1](./VPS_REQUIREMENTS.md#11-what-cannot-be-known-from-this-repository)) | `SELECT relname, n_live_tup FROM pg_stat_user_tables;` |
| U-02 | Actual database size | Sizing, backup sizing, RTO | `SELECT pg_size_pretty(pg_database_size(current_database()));` |
| U-03 | **Live `users.role` CHECK constraint definition** | **Drift #5 — proves the drift** | `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public.users'::regclass;` |
| U-04 | **Live columns absent from repo SQL** — `users.nip`, `students.tanggal_lahir`, `students.tempat_lahir`, `app_settings.favicon_url` | Drift #1–#4; S-2 | `\d public.users`, `\d public.students`, `\d public.app_settings` |
| U-05 | **Live policies on `library_visits`** | **BLK-4** — possible public PII exposure | `SELECT polname, polroles::regrole[], pg_get_expr(polqual, polrelid) FROM pg_policy WHERE polrelid='public.library_visits'::regclass;` |
| U-06 | RLS enabled on all 11 tables in production | T-DATA-01 baseline | `SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r';` |
| U-07 | **Extensions actually installed** | Target environment spec; R-25 | `SELECT * FROM pg_extension;` |
| U-08 | Number of auth users | Credential distribution, load estimate | `SELECT count(*) FROM auth.users;` |
| U-09 | Which SQL files were actually executed, and in what order | Understanding the true current state | Not directly determinable — infer from the live schema |
| U-10 | Whether `users.password` still holds plaintext | **SEC-03** — credential exposure | `SELECT count(*) FROM public.users WHERE password IS NOT NULL AND password <> '***';` |
| U-11 | Whether `users.auth_id` has duplicates | SEC-08; IDX-B validation | `SELECT auth_id, count(*) FROM public.users GROUP BY auth_id HAVING count(*) > 1;` |
| U-12 | Whether more than one `academic_periods` row is `is_active` | U-6 index creation will fail if so | `SELECT count(*) FROM public.academic_periods WHERE is_active;` |
| U-13 | Whether `books.stok` matches actual outstanding loans | R-33 / PERF-12 correctness | Compare `books.stok` against `count(*)` of `book_loans` where `status='dipinjam'` |
| U-14 | Index usage statistics; unused indexes | Index decisions | `SELECT relname, indexrelname, idx_scan FROM pg_stat_user_indexes;` |
| U-15 | Actual query latency and slow-query profile | Performance baseline (S-9) | `pg_stat_statements` — `[UNKNOWN]` whether installed |
| U-16 | Production Supabase backup configuration, tier, and PITR availability | R-06; whether today's RPO is already poor | Supabase dashboard |
| U-17 | **Storage bucket configuration and object count** | [STORAGE_MIGRATION](./STORAGE_MIGRATION.md) | `SELECT name, public, file_size_limit, allowed_mime_types FROM storage.buckets;` and count objects in `assets` |
| U-18 | **Live `storage.objects` policies** | SEC-01 live state | `SELECT polname, polroles::regrole[] FROM pg_policy WHERE polrelid='storage.objects'::regclass;` |
| U-19 | Auth provider configuration — email confirmation, rate limits, password policy | T-AUTH-03, T-SEC-08 baselines | Supabase dashboard → Authentication |
| U-20 | Whether any realtime configuration exists beyond the one subscription | Phase 10 completeness | Supabase dashboard → Realtime; and grep confirms **one** client subscription |
| U-21 | Whether the live `handle_new_user()` matches `06_final_snapshot.sql` | R-18; `nip` handling on signup | `SELECT prosrc FROM pg_proc WHERE proname='handle_new_user';` |
| U-22 | Peak concurrent users and daily active users | Sizing; connection pool capacity | Application logs / platform analytics |
| U-23 | Actual RPO/RTO requirements | [BACKUP_DR_PLAN § 2](./BACKUP_DR_PLAN.md#2-objectives-rpo--rto) | **Operator decision** — not a database query |
| U-24 | Whether `favicon_url` is populated and used | Drift #4 | Inspect the live settings row |

### Verification queries for the drift set

Read-only. **Not executed during this audit.**

```sql
-- U-03  the constraint that proves the drift
SELECT conname, pg_get_constraintdef(oid)
FROM   pg_constraint
WHERE  conrelid = 'public.users'::regclass AND contype = 'c';

-- U-04  columns present live but absent from the repository SQL
SELECT column_name, data_type, is_nullable, column_default
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  ((table_name = 'users'          AND column_name IN ('nip','auth_id'))
     OR (table_name = 'students'       AND column_name IN ('tanggal_lahir','tempat_lahir'))
     OR (table_name = 'app_settings'   AND column_name IN ('favicon_url')))
ORDER  BY table_name, column_name;

-- U-05  the policy that may expose student PII
SELECT polname, polroles::regrole[], polcmd,
       pg_get_expr(polqual, polrelid)      AS using_expr,
       pg_get_expr(polwithcheck, polrelid) AS check_expr
FROM   pg_policy
WHERE  polrelid = 'public.library_visits'::regclass;

-- U-06  RLS enablement across every table
SELECT relname, relrowsecurity, relforcerowsecurity
FROM   pg_class
WHERE  relnamespace = 'public'::regnamespace AND relkind = 'r'
ORDER  BY relname;

-- U-07  every extension actually installed
SELECT extname, extversion FROM pg_extension ORDER BY extname;

-- U-21  what the live provisioning trigger actually does
SELECT proname, prosrc FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('handle_new_user','handle_delete_user','get_my_role');
```

---

## 3. Risk themes

`[INFERRED]` Grouping the matrix above reveals that the risks are not independent.

### Theme 1 — Supabase supplied mechanisms that the repository never contained

R-02, R-03, R-06, R-07, R-16, R-23, R-35 · plus BLK-2, BLK-3, BLK-6

Auth, RLS enforcement, grants, pooling, backups, TLS, monitoring, rate limiting. Sixteen security
controls identified in [SECURITY_REVIEW § 1](./SECURITY_REVIEW.md#1-security-controls-supabase-provided);
**twelve require a full rebuild**, and the repository contains implementation for two — both written
against Supabase-managed objects.

### Theme 2 — The repository does not describe production

R-01, R-13, R-14, R-26, R-28, R-33, R-34 · plus BLK-1, BLK-4

Four undeclared columns, a CHECK constraint that contradicts live data, a table defined twice with
conflicting policies, a helper relying on an auto-generated constraint name, and a destructive script
in the middle of the setup sequence. **The repository's SQL is evidence about the live database, not
a description of it.**

### Theme 3 — No seam, so nothing can be staged

R-11, R-12, R-30

102 call sites across 22 files, at least 8 distinct PostgREST behaviours relied upon, and no
generated types. There is no boundary at which old and new can coexist.

### Theme 4 — Silent failure modes

R-09, R-10, R-13, R-31, R-33 · plus CUTOVER step 37

The most dangerous risks here do **not** produce errors. A dangling permissive policy widens access
without complaint. A stale cached logo URL breaks weeks later. A misconfigured RLS identity makes
`INSERT` affect zero rows while `SELECT` returns data. A broken FK hint is masked by a fallback. An
empty `SELECT` looks identical to "no records yet".

`[INFERRED]` **Theme 4 is the strongest argument for the prioritisation in
[TEST_PLAN § 3](./TEST_PLAN.md#3-priority-ordering):** test security and restore paths first,
because they are the failure modes that stay quiet.

---

## 4. What would change the risk picture

| Action | Effect |
|---|---|
| Resolve BLK-1 (schema drift) | Removes the largest single uncertainty. Almost every downstream estimate depends on it |
| Add `CREATE UNIQUE INDEX ON public.users (auth_id)` | Removes R-23 and part of SEC-08 — **two lines, highest value-per-effort item in the audit** |
| Verify and drop `allow_all_library_visits` | Removes R-09 — potentially an active PII exposure |
| Perform one real restore | Clears BLK-3 and converts R-06 from CRITICAL to managed |
| Build the RLS assertion harness | Makes R-03 and R-09 *measurable* instead of *assumed* |
| Choose the identity model | Clears BLK-2 and unblocks S-4 and S-5 |
| Drop the `password` column | Removes SEC-03 permanently |
| Capture golden files | Clears half of BLK-5; makes R-14 and R-30 testable |

`[INFERRED]` **Note that seven of the eight actions above require no architecture decision.** They
are cheap, local, and independent of which option is chosen. They can all start immediately.

---

## 5. Is this migration advisable?

The brief asks for an audit, not a recommendation, and none is offered. What the audit *does*
establish, as fact:

| Finding | Evidence |
|---|---|
| The database is **small** and entirely standard PostgreSQL | 50 MB – 1.5 GB; no enums, no arrays, no sequences, no proprietary types ([DATA_MIGRATION § 4.9](./DATA_MIGRATION_PLAN.md#49-compatibility-summary)) |
| The **data** migration is straightforward | 11 tables, 3 dependency tiers, acyclic |
| The **schema** cannot be migrated yet | Drift is unresolved (R-01) |
| The **platform** migration is the project | 36 of 39 dependencies are Supabase platform features ([SUPABASE_DEPENDENCIES § 2.2](./SUPABASE_DEPENDENCIES.md#22-class-totals)) |
| **Authorization cannot be migrated** — it must be rebuilt | Every one of 22 policies depends on `auth.uid()` and the `authenticated` role (R-03) |
| **Authentication cannot be migrated** — it must be rebuilt | No hashing, no session, no token code exists (R-02) |
| The repository is **very well documented**, which materially reduces risk | 12 files in `docs/`, plus `SECURITY.md`, `ROADMAP.md`, `CHANGELOG.md` — and the drift is visible *because* the documentation disagrees with the SQL |
| The two most valuable preparatory actions need no decisions | A restore test, and an index ([§ 4](#4-what-would-change-the-risk-picture)) |

`[INFERRED]` The last two rows are the audit's most useful contribution. The repository's existing
documentation is unusually good — `docs/database.md`, `docs/authentication.md`, and
`docs/architecture.md` all describe intent precisely enough to be **checked against the code**, which
is how the drift was found. A less documented codebase would have hidden it.
