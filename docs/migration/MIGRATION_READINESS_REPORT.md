# Migration Readiness Report

> **AUDIT ONLY — NO MIGRATION EXECUTED.**
> This report and the fourteen audit documents it summarises were produced by reading the repository.
> No database was contacted, no SQL was executed, no schema/auth/RLS/storage configuration was
> changed, nothing was deployed, and no data was migrated. See
> [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) for the full statement of scope and the list of
> things that were *not* touched.

**Question this audit answers:** *how ready is this application to move off Supabase onto a
self-hosted PostgreSQL VPS?*

**Evidence convention used throughout:** `[REPO]` = verified from repository contents;
`[INFERRED]` = reasoned from repository evidence but not directly observable;
`UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION` = cannot be determined from the repository at all.
Risk levels are **LOW / MEDIUM / HIGH / CRITICAL**. There is deliberately **no overall score**, and
blocking issues are listed **separately** from risks.

---

## Audit metadata

| Item | Value |
|---|---|
| Branch | `arena/01a0cbc9-presensi-siswa` |
| Base commit | `de441b79221c040cc6e437429234d38fed09088d` |
| Files created | **16** (this report + 15 under `docs/migration/`) |
| Files modified | **0** — no source, schema, config, or environment file was changed |
| Build status | `npm run build` **PASS** (exit 0, `✓ built in 12.08s`); template-binding guard passed |
| Test status | **No automated test suite exists** in the repository (no Vitest, no Playwright) |
| Database writes | **None.** No connection to any database was opened |
| Production data migrated | **None.** No export, dump, or copy was taken |
| Read-only queries executed | **None.** All validation SQL is written but unexecuted |

---

## 1. Current architecture

Vue 3.5 single-page application (Vite 5.4, Pinia 2.2, vue-router 4.4, Tailwind 3.4) deployed as
static assets on Vercel, talking **directly from the browser** to Supabase over HTTPS.

**There is no backend in this repository.** `[REPO]` No server directory, no API routes, no Edge
Functions (`supabase/functions/` does not exist), no ORM, no `pg`/`postgres` driver dependency, and
zero `.rpc()` calls. The entire "backend" is Supabase platform services addressed by the anon key.

```
Browser SPA ──► Supabase Platform
   │              ├── PostgREST   (all table access, via supabase.from())
   │              ├── GoTrue/Auth (login, session, signUp)
   │              ├── Storage     (1 bucket: assets)
   │              ├── Realtime    (1 postgres_changes subscription)
   │              └── PostgreSQL  (11 tables, 22 RLS policies, 4 functions, 4 triggers)
   └────────────► (nothing else — no self-hosted component exists)
```

The client is constructed once in `src/lib/supabase.js:12` from `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`. A **second, session-less client** exists at `src/views/GuruView.vue:19`
purely so that creating a user does not log the admin out.

→ Detail: [README.md](./README.md#database-access-paths-all-of-them),
[POSTGRES_ARCHITECTURE.md](./POSTGRES_ARCHITECTURE.md#2-proposed-architecture-annotated-phase-13)

---

## 2. Database inventory

| Object | Count | Notes |
|---|---|---|
| Tables | **11** | all with RLS enabled (`02_rls.sql:9-19`) |
| Primary keys | 11 | all `uuid` with `gen_random_uuid()` |
| Foreign keys | **6** | 1 of them into `auth.users` |
| Unique constraints | 6 | |
| CHECK constraints | **8** | one is **violated by live data** (see §16, BLK-1) |
| Secondary indexes | **13** | 12 `CREATE INDEX` + 1 partial unique |
| Views / materialised views | **0** | |
| Functions | **4** | 3 × `SECURITY DEFINER` |
| Triggers | **4** | 2 of them on the Supabase-managed `auth.users` |
| Extensions | 1 | `pgcrypto` (`01:7`) |
| RLS policies (application) | **22** | 11 are loop-generated `Admin_All_<table>` |
| RLS policies (storage) | 4 | on `storage.objects` |
| Declared columns | **88** | plus **4 columns referenced by the app but absent from the SQL** |

Tables: `users`, `students`, `attendance_logs`, `academic_calendar`, `academic_periods`,
`class_history`, `app_settings`, `activity_logs`, `books`, `book_loans`, `library_visits`.

**Structural facts that shape the migration**

- `app_settings` is a **singleton** (`CHECK (id = 1)`, `01:104`) — the entire school configuration
  is one row, and it is also mutated by client-side calls (e.g. `PengaturanView.vue:100`).
- There is **no `kelas` table**. A "class" is free text on `students.kelas`, `users.kelas`,
  `attendance_logs.kelas`, and a jsonb array `app_settings.daftar_kelas` (`01:114`).
- `activity_logs.record_id` is a **string-encoded composite key** (`YYYY-MM-DD:kelas`) used as a
  query key with lexicographic range filters — not a foreign key.
- Four functions and two triggers exist **only in `06_final_snapshot.sql`**, a file that is
  *destructive* and must never be re-run (see §13).

→ Detail: [DATABASE_INVENTORY.md](./DATABASE_INVENTORY.md)

---

## 3. Supabase dependency surface

Every Supabase dependency found in the repository was classified (SD-01…SD-39) into eight classes:

| Class | Meaning | Count |
|---|---|---|
| **A** | Portable to plain PostgreSQL with no change | **3** |
| **B** | PostgREST query-builder semantics | 9 |
| **C** | Supabase Auth / JWT / `auth` schema | 12 |
| **D** | Storage API | 4 |
| **E** | Realtime | 4 |
| **F** | Edge Functions | **0** |
| **G** | Role names / unknown live state | 3 |

**Only 3 of 39 dependencies survive a plain-PostgreSQL move unmodified.** The headline number is
the call-site count: **102 `supabase.from()` call sites across 22 files**, plus 2
`supabase.storage.from()` and 6 `supabase.auth.*` call sites.

**There is no seam.** `docs/architecture.md:31` states it explicitly — *"Views fetch sendiri. Tidak
ada lapisan API/repository terpusat"* — and the audit confirms it: queries are issued from inside
view components, including PostgREST-specific behaviour (embedded joins, `count: 'exact'`,
`onConflict` upserts, `PGRST116` handling).

→ Detail: [SUPABASE_DEPENDENCIES.md](./SUPABASE_DEPENDENCIES.md)

---

## 4. Authentication and identity

- Login is **username + password**, transformed to a virtual email `${username}@minblora.id`
  (`src/stores/auth.js:88`, `GuruView.vue:117`). The domain cannot receive mail.
- `users.auth_id` links an application row to `auth.users.id`, `ON DELETE CASCADE` (`06:24`).
- **No JWT claim is ever inspected by application code.** `[REPO]` Identity enters the database
  only through `auth.uid()` inside `get_my_role()` (`02_rls.sql:27`). The app reads its own
  `users` row and does role checks in JavaScript (`src/stores/auth.js:30`).
- Profile loading uses `select('*')` (`src/stores/auth.js:37`), which pulls the **legacy plaintext
  `password` column** into client-side state.
- Password reset by email **cannot work** with virtual addresses; the repository's own instructions
  say the admin resets via the dashboard (`docs/authentication.md:73`).

**Consequence:** the `auth` schema must not be dumped or copied (it contains password hashes the new
platform cannot use), so **all passwords change at cutover**, and account recovery must happen
out-of-band. Auth is roughly **85 % platform and 15 % database** — the hard part is what Supabase
supplied, not what the SQL declares.

→ Detail: [AUTH_MIGRATION.md](./AUTH_MIGRATION.md)

---

## 5. RLS and authorization

22 policies are written **`TO authenticated`** and call **`auth.uid()`** through
`public.get_my_role()`. Off Supabase, **neither the `authenticated` role nor `auth.uid()` exists**.
Because RLS denies by default when no policy applies, a botched port produces either a total
outage or — worse — a silent widening if a permissive policy is added as a stopgap.

Three findings carry the most weight:

- **`get_my_role()` is `SECURITY DEFINER` and reads `users` by `auth_id`** (`02:22-29`), but
  `auth_id` has **no index and no unique constraint** (`RLS-OB-1`). It is evaluated per row per
  policy; without an index that is a sequential scan, and without uniqueness it can return an
  arbitrary role.
- **Policies are additive (OR-ed)**, so a single permissive policy silently overrides all strict
  ones. `05_library_visits.sql:19-21` defines exactly such a policy, granting **`anon` full access
  to `library_visits`**, which contains student PII. Whether it is live in production is
  **UNKNOWN**.
- The three `SECURITY DEFINER` functions **do not pin `search_path`**, which becomes more dangerous
  when the owner may be a superuser.

→ Detail: [RLS_MIGRATION.md](./RLS_MIGRATION.md),
[SECURITY_REVIEW.md](./SECURITY_REVIEW.md#2-security-findings)

---

## 6. Storage

The entire storage surface is **one bucket (`assets`) and one upload call site**
(`PengaturanView.vue:121,123`). `[REPO]` Two hazards dominate:

1. **The bucket is created `public`** (`03:7-9`) and its write/update/delete policies are open to
   **`anon`** (`03:17-31`) — anyone with the anon key can overwrite the school's logo.
2. **Stored URLs are absolute** and get persisted into `app_settings` and cached in `localStorage`.
   When the storage origin changes, previously-issued URLs keep pointing at Supabase. Cached URLs
   in users' browsers will not be rewritten by a database migration.

The object itself (the logo) is small and can be re-uploaded by hand; the risk is *stale URLs*, not
data volume. Four replacement options are documented without ranking.

→ Detail: [STORAGE_MIGRATION.md](./STORAGE_MIGRATION.md)

---

## 7. Realtime

**One** subscription exists in the whole application: `postgres_changes` on `attendance_logs`,
`DashboardView.vue:300-302`, used to refresh dashboard counters. It is wrapped in
`whenRealtimeReady()` (`src/lib/supabase.js:25-33`) and a Vite alias shim
(`src/lib/lazyRealtime.js`, `vite.config.js:22-33`) that code-splits `@supabase/realtime-js`.

Realtime is the **cheapest** dependency to migrate: it is one call site, and the shim, the alias and
the `whenRealtimeReady()` helper are all **deleted** rather than ported. The replacement choices are
polling, native Postgres `LISTEN`/`NOTIFY` behind a WebSocket bridge, or dropping live updates
entirely. RLS applies to realtime too, so the subscription inherits §5's identity problem.

→ Detail: [SUPABASE_DEPENDENCIES.md § 7](./SUPABASE_DEPENDENCIES.md#7-realtime-phase-10),
[POSTGRES_ARCHITECTURE.md](./POSTGRES_ARCHITECTURE.md)

---

## 8. Edge Functions and server-side logic

**There are none.** `[REPO]` No `supabase/functions/` directory, zero `supabase.functions.invoke`
calls, zero `.rpc()` calls, and no serverless route handlers. Consequently there is **no server-side
code to port — and also no server-side code to reuse**. Every operation that needs a privileged
context today simply does not exist; any new backend requirement is greenfield.

The only server-side logic that exists is the four PL/pgSQL functions (`set_updated_at`,
`get_my_role`, `handle_new_user`, `handle_delete_user`), which are portable with the caveats in §5.

→ Detail: [SUPABASE_DEPENDENCIES.md § 8](./SUPABASE_DEPENDENCIES.md#8-edge-functions-and-api-layer-phase-11)

---

## 9. PostgreSQL compatibility

| Verdict | Count | Examples |
|---|---|---|
| ✅ Ports as-is | **9** | tables, PKs, FKs, CHECKs, unique constraints, indexes, jsonb, `date`/`timestamptz` |
| ⚠️ Ports with a caveat | **2** | `pgcrypto` (`gen_random_uuid()` is core on PG ≥ 13); `SECURITY DEFINER` without `search_path` |
| 🔁 Must be rebuilt | **8** | RLS identity (`auth.uid()`, `authenticated`), triggers on `auth.users`, `auth` schema |
| ➖ No action | **2** | `service_role` bypass (correctly never used) |

**Data types require no conversion work.** `[REPO]` Standard types only: `uuid`, `text`, `date`,
`timestamptz`, `boolean`, `jsonb`, `integer`. No arrays, no enums, no sequences, no identity
columns, no custom types. The caveats are limited to `current_date`/`timestamptz` behaviour and a
**pre-existing** `toISOString()` UTC-day bug in the client (`DATA_MIGRATION_PLAN.md:268`) that must
not be misattributed to the migration.

One CHECK constraint will **fail on load**: `users.role` allows only `('Admin','Guru','Pustakawan')`
(`01:17`), but live data contains `'Guru & Pustakawan'`.

→ Detail: [POSTGRES_ARCHITECTURE.md § 1](./POSTGRES_ARCHITECTURE.md#1-compatibility-matrix-phase-19),
[DATA_MIGRATION_PLAN.md § 4](./DATA_MIGRATION_PLAN.md)

---

## 10. Backend requirements

Because the application has no backend, "migrating" requires **creating one**. The minimum is a
service that reproduces what PostgREST did, and the audit enumerated exactly what is relied upon:

- filter-required `DELETE` semantics (`SD-10`);
- object-vs-array response modes (`SD-08`) — `.single()` raises `PGRST116`;
- resource embedding, including **FK-hint embeds** (`students!book_loans_student_nisn_fkey`,
  `BukuView.vue:274`);
- `count: 'exact'` headers (`SD-07`, used in `DashboardPerpusView.vue:113-115`);
- `upsert(..., { onConflict })` (e.g. `SiswaView.vue:225-229`);
- auth endpoints, session handling, and a storage upload/serving path.

Plus the identity mechanism from §5, and a connection-pooling layer (§11). Any of the three
architecture options in §18 supplies these differently; the requirement list is common to all.

→ Detail: [SUPABASE_DEPENDENCIES.md § 8.5](./SUPABASE_DEPENDENCIES.md#85-which-apis-must-be-replaced),
[POSTGRES_ARCHITECTURE.md](./POSTGRES_ARCHITECTURE.md)

---

## 11. VPS requirements

**No traffic or volume figure can be derived from this repository.** `[REPO]` The eight quantities
that would size a VPS (school count, student count, attendance rows/day, peak concurrency, library
volume, growth rate, retention policy, backup window) are **all UNKNOWN** and are listed with a
resolution query in `VPS_REQUIREMENTS.md § 1.1`.

Sizing is therefore presented as a **parameterised, clearly-labelled illustration** — not a
specification — for 150 / 600 / 2500 students, giving roughly 50 MB / 200–300 MB / 1–1.5 GB of
database over five years.

The binding constraint is **connections, not data**: a single dashboard render fans out to 4
concurrent queries (`DashboardView.vue:117-118, 199-200`), and ~40 concurrent consumers is already
plausible at medium scale against PostgreSQL's default `max_connections = 100`. **A pooler is
required**, and no pooling plan exists today (BLK-6).

Seventeen performance bottlenecks were catalogued (PERF-01…PERF-17), five of them HIGH — including
an **unbounded `activity_logs` scan** (`StatistikView.vue:61`), `LIKE '%:kelas'` scans
(`RekapView.vue:95`), client-side aggregation of full result sets (PERF-04), a missing index on
`users.auth_id` (PERF-10), and `books.stok` never being decremented on loan (PERF-12, a
correctness bug).

→ Detail: [VPS_REQUIREMENTS.md](./VPS_REQUIREMENTS.md)

---

## 12. Security changes introduced by the migration

Sixteen Supabase-provided controls were reviewed (`SC-01…SC-16`): **12 must be rebuilt**, 3
re-wired, and 1 needs nothing (the `service_role` key, which the repo correctly never used).

The findings that change with the migration are the ones where **Supabase was silently compensating
for a repository weakness**:

| ID | Finding | Level |
|---|---|---|
| SEC-01 | `assets` bucket accepts **anonymous writes and deletes** | HIGH |
| SEC-03 | Legacy **plaintext `password` column** readable by any authenticated user | HIGH |
| SEC-04 | A permissive `anon` policy may still grant full access to `library_visits` | **CRITICAL if live** (live state UNKNOWN) |
| SEC-07 | `SECURITY DEFINER` functions do not pin `search_path` | MEDIUM |
| SEC-08 | `auth_id` not unique → `get_my_role()` may return an arbitrary role | MEDIUM |
| SEC-09 | **The database is not currently internet-exposed; keeping it that way becomes the operator's job** | — |

**The single most dangerous new failure mode is the `VITE_*` trap:** the repository's convention is
that environment variables are prefixed `VITE_` and shipped to the browser by design
(`docs/deployment.md:33`). A DB hostname, user, or password added under that convention would be
published to every visitor. VPS_REQUIREMENTS/POSTGRES_ARCHITECTURE therefore require all new
secrets to be server-side only, and the test plan includes a check that greps the built bundle.

A five-role least-privilege design and a 22-point pre-cutover verification checklist are documented.

→ Detail: [SECURITY_REVIEW.md](./SECURITY_REVIEW.md)

---

## 13. Backup and disaster recovery requirements

**The application's "Backup" button is not a backup.** `[REPO]` `PengaturanView.jalankanBackup`
(`:340-405`) exports an **`.xlsx` covering 4 of 11 tables**, has **no import path**, and the
repository's own docs describe it as a JSON backup. It cannot restore anything.

What is required instead:

- **Logical backups** — `pg_dump --format=custom --no-owner --no-privileges`, **never the `auth`
  schema** (hashes are unusable and sensitive).
- **PITR** — continuous WAL archiving. This is the **only** mechanism that can undo a bad data
  operation, which matters because `activity_logs` doubles as the presensi submission ledger and
  `PengaturanView.vue:293` deletes all of it. `archive_timeout` is needed because the database is
  idle at night and would otherwise not switch WAL segments.
- **Offsite, immutable copies** with write-only credentials.

Proposed objectives: **RPO ≤ 1 h / RTO ≤ 4 h**. Ten pre-cutover gates are defined, of which
**gate 2 (a restore has actually been performed)** is a hard blocker — and today **no restore has
ever been demonstrated** (BLK-3). Nine failure scenarios are analysed (F-1…F-9), including F-7,
**silent backup failure**, which is the most dangerous because it is invisible until the day it is
needed.

→ Detail: [BACKUP_DR_PLAN.md](./BACKUP_DR_PLAN.md)

---

## 14. Data migration complexity

**The data is the easy part; the platform is the hard part.**

- **Volume:** small. Even the largest illustrated scenario is ~1–1.5 GB over five years.
- **Types:** no conversion work required (§9).
- **Ordering:** the plan defines a 19-step schema load order. Load order matters in two places that
  are easy to get wrong: data must be loaded **before** constraints and RLS, and `activity_logs`
  must load **before** `users`, because `activity_logs.user_id` references `users` and a wrong order
  produces **silent nulls** rather than an error.
- **`auth_id` re-mapping:** four options are documented for re-linking application rows to whatever
  identity system replaces GoTrue.
- **Passwords:** the `auth` schema must **not** be dumped (hashes), so **every password changes** at
  cutover and resets must be communicated out-of-band. The virtual-email domain
  (`@minblora.id`) cannot receive reset mail.
- **`06_final_snapshot.sql` must never be run** — it executes destructive `DELETE`s and a
  `TRUNCATE public.users CASCADE` (`06:17-21`).

Complexity verdict: **data trivial, platform hard.** Every step that touches real data is
mechanical; every step that is genuinely risky involves identity, RLS, or the application.

→ Detail: [DATA_MIGRATION_PLAN.md](./DATA_MIGRATION_PLAN.md)

---

## 15. Application changes required

All **102 call sites in 22 files** must be revisited, because there is no boundary to migrate
behind. Additional application-level work:

- a **data-access layer** (does not exist today) if the seam is to be introduced first;
- **auth flow** rewiring — login, session bootstrap (`main.js:35`), session recovery
  (`LoginView.vue:117,137`), and the second client in `GuruView.vue:19`;
- **user creation**, which today depends on the `handle_new_user()` trigger on `auth.users`
  (`06:29-60`) — off Supabase there is no such table to trigger on;
- **storage upload/serving** and rewriting the persisted absolute logo URL;
- **realtime** — delete the shim/alias/helper, optionally add a replacement;
- **role handling** — the app uses four role values (`GuruView.vue:256`) while the schema permits
  three (`01:17`).

The **deletion test** applies to the largest opportunities: several view components are shallow
pass-throughs that would become deep modules behind a data-access interface.

→ Detail: [SUPABASE_DEPENDENCIES.md](./SUPABASE_DEPENDENCIES.md),
[POSTGRES_ARCHITECTURE.md](./POSTGRES_ARCHITECTURE.md)

---

## 16. Blocking issues

These are listed **separately from risks**. They are not probabilities to be managed; they are
things that must be resolved before the migration can proceed at all.

| ID | Blocking issue | Why it blocks |
|---|---|---|
| **BLK-1** | **Schema drift** — the repo's SQL is not the live database | 4 columns referenced by the app are missing from the SQL; a CHECK constraint is violated by live data; `library_visits` has two definitions. **8 drifts** documented. No migration can be validated against an unknown target shape |
| **BLK-2** | **Identity model undecided** | RLS, Auth, and every policy depend on `auth.uid()` and `authenticated`, which have no equivalent yet |
| **BLK-3** | **No proven restore path** | A migration with no demonstrated restore is an irreversible operation. No restore has ever been performed |
| **BLK-4** | **Live RLS state unknown** | Possibly-permissive policies may be live; additive policies mean one stray policy defeats the model |
| **BLK-5** | **No tests and no golden files** | There is no automated suite, so "did the migration break the reports?" cannot be answered. Golden files **must** be captured from the current system *before* any change |
| **BLK-6** | **No pooling plan** | Default `max_connections` is the binding constraint; nothing today manages it |

BLK-3 and BLK-5 are notable because they require **no architecture decision** — they can be started
immediately — and they are the two most likely to be deferred until they hurt.

→ Detail: [MIGRATION_RISKS.md § 2](./MIGRATION_RISKS.md#2-blocking-issues),
[CUTOVER_PLAN.md](./CUTOVER_PLAN.md)

---

## 17. Risk matrix

**36 risks** (R-01…R-36) are catalogued with levels LOW/MEDIUM/HIGH/CRITICAL. **No overall score is
given**, and no risk is aggregated into a single number.

**7 CRITICAL risks:**

| ID | Risk |
|---|---|
| R-01 | **Schema fidelity** — migrating from SQL that does not match production |
| R-02 | **Auth** — 12 dependencies on a platform service with no drop-in replacement |
| R-03 | **RLS** — 22 policies that deny-by-default; failure mode is outage or silent widening |
| R-06 | **Backup / restore** — no verified recoverability |
| R-09 | **Dangling permissive RLS** — `allow_all_library_visits` silently overriding strict policy |
| R-15 | **Secrets in the bundle** — the `VITE_*` trap publishing DB credentials to browsers |
| R-16 | **Database exposure** — replacing a managed, non-exposed database with a self-run one |

Distribution across the full set: 7 CRITICAL, 12 HIGH, 13 MEDIUM, 4 LOW.

**Four themes** organise the matrix: (1) Supabase-supplied mechanisms the repository never
contained; (2) the repository does not describe production; (3) no seam, so nothing can be staged;
(4) silent failure modes.

→ Detail: [MIGRATION_RISKS.md](./MIGRATION_RISKS.md)

---

## 18. Architecture options

Three options are documented in equal depth across six axes — application changes, infrastructure,
identity, effort, risk, and reversibility. **They are deliberately not ranked, and no option is
recommended over another.**

- **Option A — Direct port:** frontend talks to a new custom backend service which talks to
  PostgreSQL. Largest application change (all 102 sites), one new service to write and operate.
- **Option B — Frontend + self-hosted Supabase-compatible backend + PostgreSQL:** keep
  `supabase.from()` and repoint `src/lib/supabase.js:12`; run PostgREST/GoTrue/Storage/Realtime
  yourself. Smallest application change, largest infrastructure surface (3–4 services to operate
  and keep patched).
- **Option C — Hybrid / transition:** introduce a data-access seam first (C1), then migrate behind
  it in stages. Largest total effort, smallest per-step risk, and the only option that makes later
  phases small.

Choosing between them is a decision for the maintainers; this audit's job is to make the trade-offs
legible.

→ Detail: [POSTGRES_ARCHITECTURE.md § 4](./POSTGRES_ARCHITECTURE.md)

---

## 19. Roadmap

**15 stages (S-0…S-14)**, each with explicit exit criteria and a dependency graph.

| Stage | Status |
|---|---|
| **S-0** Establish audit baseline | ✅ **complete** (this audit) |
| S-1…S-14 | ⬜ not started |
| S-2 (RLS rebuild) | 🔴 **blocked by BLK-1** |
| S-4 (backend API) | 🔴 **blocked by BLK-2** |

No stage was executed. The roadmap is a plan, not a record of work performed.

→ Detail: [CUTOVER_PLAN.md](./CUTOVER_PLAN.md#migration-roadmap)

---

## 20. Cutover

**Downtime is unavoidable in exactly one place:** the freeze + final backup + load window at T-0
(steps 23–27). `[INFERRED]` A realistic window is **2–4 hours**, driven by the final backup and
verification rather than by data volume.

The timeline is specified as T-7 days (11 steps), T-1 day (9), T-1 hour (6), T-0 (14), plus
post-cutover checks. A **14-point go/no-go checklist** gates the start.

**The most-skipped verification step is the one that matters most:** confirming that a **write**
survives a page reload. Reads can succeed while writes fail silently under RLS, so a cutover that
only exercises reads can look healthy and still be broken for teachers taking attendance.

Assets (the logo) and the browser-cached URL problem are handled by a dedicated 10-step checklist,
including five PDF generators that embed absolute URLs.

→ Detail: [CUTOVER_PLAN.md](./CUTOVER_PLAN.md)

---

## 21. Rollback

Rollback is defined in terms of **triggers** (what makes you roll back), **procedure**, and a
**cheap window** — the period during which rolling back is inexpensive.

The critical property: **the cheap-rollback window closes at the first production write.** Once new
data exists on the new platform, rolling back means reconciling two divergent datasets, and
**no reconciliation tooling exists** in this repository. After that point rollback becomes a
data-merge project, not an operations action.

This is why §16's BLK-3 (no proven restore) and the T-0 verification steps carry disproportionate
weight: the migration is effectively **irreversible after the first write**, and the only safety net
is a backup that has never been restore-tested.

→ Detail: [CUTOVER_PLAN.md](./CUTOVER_PLAN.md#rollback),
[BACKUP_DR_PLAN.md](./BACKUP_DR_PLAN.md)

---

## 22. Test strategy

**Starting position (`[REPO]`):** there is **no automated test suite**. No Vitest, no Vue Test Utils,
no Playwright, no CI test job. What exists is a template-binding guard, a production build
(`npm run build`), GitHub Actions CI, and manual QA. `docs/testing.md:3` states this explicitly.

The plan defines **13 suites** (T-AUTH, T-AUTHZ, T-CRUD, T-ATT, T-RPT, T-STAT, T-LIB, T-EXP, T-ENV,
T-DATA, T-SEC, T-RLS, T-BAK) ordered P0–P4.

Two elements are load-bearing:

- **Golden files must be captured from the current system *before* any migration step.** Reports,
  statistics and recaps are the outputs that cannot be eyeballed; once the old system is gone, the
  reference data is gone with it.
- **RLS must be verified by outcome parity per role × table × operation**, not by inspecting policy
  text. The failure mode is a policy that *looks* correct and denies (or permits) the wrong thing.

P0 (blocking) includes the RLS outcome tests, the security tests, the bundle secret scan, the backup
suite, data-integrity checks, and the auth suite. Restore testing is defined as T-R1…T-R6, where
T-R6 is pointing a staging frontend at the restored database.

→ Detail: [TEST_PLAN.md](./TEST_PLAN.md)

---

## 23. Unknowns requiring live inspection

**24 unknowns (U-01…U-24)** cannot be resolved from the repository at all. Each carries a read-only
resolution query; **none was executed** in this audit — the repository was never used to connect to
any database.

**They are all one sentence long:** *the repository does not describe production.* The eight schema
drifts, the live RLS policy set, the actual `users.role` values, the true row counts and growth
rate, whether `favicon_url` is populated, whether `nip` is populated, and whether the permissive
`library_visits` policy is live — none of these are knowable from the files in this repository.

Until these are answered by inspection, **any migration plan is a plan against an unknown target**,
which is precisely why BLK-1 and BLK-4 are blocking rather than merely risky.

→ Detail: [MIGRATION_RISKS.md § Unknowns](./MIGRATION_RISKS.md),
[VPS_REQUIREMENTS.md § 1.1](./VPS_REQUIREMENTS.md)

---

## Unresolved questions

Open questions this audit could not answer, listed so they are not lost:

1. **What is the live schema?** Eight drift items are suspected; the live column list, constraints
   and policies are unknown (BLK-1, BLK-4).
2. **Which identity model will replace GoTrue?** Undecided, and it blocks RLS, Auth, and the
   backend (BLK-2).
3. **What are the real operational numbers?** Student count, peak concurrency, and growth rate are
   unknown, so VPS sizing remains parameterised rather than specified (§11).
4. **Has a restore ever worked?** No evidence exists that it has (BLK-3).
5. **Which architecture option will be chosen?** Presented unranked; the decision is the
   maintainers' (§18).
6. **How will passwords be re-issued to users?** The virtual-email domain cannot receive reset mail,
   so this is an operational decision, not a technical one (§4).
7. **Is `allow_all_library_visits` live?** If it is, `library_visits` may currently be fully
   readable and writable by anonymous callers (§5, §12).

---

*This report summarises 15 documents totalling ~6,300 lines in `docs/migration/`. Nothing in this
audit changed the application, its schema, its configuration, or any database.*
