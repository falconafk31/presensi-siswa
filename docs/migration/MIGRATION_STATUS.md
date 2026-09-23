# MIGRATION STATUS

```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║                            A U D I T   O N L Y                           ║
║                                                                          ║
║                    NO MIGRATION EXECUTED  ·  NO DATABASE WRITE           ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

**Status: Phase 0–23 complete (analysis + documentation). Phase 21 stages S-0 … S-14: NOT STARTED.**

This audit produced documentation only. The following confirmations are made explicitly, because
the value of an audit depends on nothing else having happened.

---

## Confirmations

### No database write occurred

- No connection was made to any Supabase project, production database, staging database, or any
  PostgreSQL instance. There is no database connection string, `service_role` key, or Supabase
  access token in this environment `[REPO]` — `.env` is absent (`.gitignore:5`) and
  `.env.example:1-2` contains only placeholder values.
- No SQL was executed. All 500 lines of `supabase/*.sql` were **read**, not run.
- No DDL and no DML was issued at any point during this audit.
- Nothing was written to Supabase Auth, Storage, Realtime, or Edge Functions.

### No production data was migrated

- No data export was taken. No `pg_dump`, no CSV/JSON extract, no `COPY`, no API pagination over
  live rows.
- No data file, dump, or backup — containing production or sample data — was created, added, or
  committed. The audit adds Markdown files and nothing else.

### No migration artefact was created

- No PostgreSQL database was created or provisioned.
- No VPS, container, Docker image, or managed service was created or configured.
- No DNS record, Vercel project setting, or environment variable was changed.
- No new migration file was added — not to `supabase/`, and there is no `supabase/migrations/`
  directory to add one to.

### No source, schema, RLS, auth, or configuration was modified

Verified by `git status` at the end of the audit: the only untracked additions are the files in
`docs/migration/`. Every pre-existing tracked file is byte-identical to commit
`de441b79221c040cc6e437429234d38fed09088d`.

Explicitly **unchanged**:

| Area | Files | Status |
|---|---|---|
| Application source | `src/**` (48 files) | unchanged |
| Schema SQL | `supabase/01_schema.sql` | unchanged |
| RLS SQL | `supabase/02_rls.sql` | unchanged |
| Storage SQL | `supabase/03_storage.sql` | unchanged |
| Seed SQL | `supabase/04_seed.sql` | unchanged |
| Historical SQL | `supabase/05_library_visits.sql` | unchanged |
| Auth-sync SQL | `supabase/06_final_snapshot.sql` | unchanged |
| Supabase config | *(does not exist)* | n/a |
| Environment | `.env.example` | unchanged |
| Deployment | `vercel.json` | unchanged |
| Dependencies | `package.json`, `package-lock.json` | unchanged |
| CI | `.github/workflows/ci.yml` | unchanged |

> Note on `.env`: a local `.env` was created transiently from `.env.example` **solely** to run the
> project's own build command for the build-status verification, mirroring what
> `.github/workflows/ci.yml:19-25` does in CI. It contains no real credentials (the placeholder
> values from `.env.example`), is gitignored (`.gitignore:5`), was never committed, and was removed
> at the end of the audit.

---

## What this audit did do

Read-only inspection of the repository, plus one permitted verification command:

| Action | Performed | Notes |
|---|---|---|
| Read all 103 tracked files' metadata | Yes | `git ls-files` |
| Read all 6 SQL files (500 lines) | Yes | In full |
| Read all application source under `src/` | Yes | Targeted + full reads |
| Read all 12 files in `docs/`, plus root Markdown | Yes | In full |
| Grep for every Supabase API surface listed in the brief | Yes | Zero-hit results reported as zero, not omitted |
| `npm ci` (install dependencies) | Yes | Required to run the project's own build; does not alter source |
| `npm run build` | Yes | **Passed** — see build status below |

### Build / test status

`[REPO]` Result of running the project's own verification pipeline at commit
`de441b79221c040cc6e437429234d38fed09088d`:

| Command | Result | Detail |
|---|---|---|
| `node scripts/check-template-bindings.mjs` | ✅ passed | Part of `npm run build` (`package.json:8`) |
| `npm run build` | ✅ passed | `✓ built in 12.08s`, exit code 0 |
| Automated tests | ⚠️ **none exist** | `docs/testing.md:3` states the repo has no Vitest/Vue Test Utils/Playwright and no `test` script in `package.json` |

The build emitted 29 chunks. Largest: `xlsx` 429.03 kB (gzip 143.08 kB), `ScanQRView` 383.29 kB
(gzip 113.94 kB), `jspdf` 357.74 kB (gzip 118.02 kB) — all lazy-loaded, consistent with
`docs/performance.md`.

`npm ci` reported dependency advisories. These are **pre-existing and out of scope for this
audit**; they are noted so the reader does not mistake them for something this audit introduced.

---

## State of the migration project

| Roadmap stage | Description | Status |
|---|---|---|
| **S-0** | Audit | ✅ **COMPLETE** (this document set) |
| S-1 | Prepare PostgreSQL VPS | ⬜ Not started |
| S-2 | Recreate schema | ⬜ Not started — **blocked**, see BLK-1 |
| S-3 | Test database | ⬜ Not started |
| S-4 | Build backend API | ⬜ Not started — **blocked**, see BLK-2 |
| S-5 | Authentication | ⬜ Not started |
| S-6 | Migrate test data | ⬜ Not started |
| S-7 | Application integration | ⬜ Not started |
| S-8 | Functional testing | ⬜ Not started |
| S-9 | Performance testing | ⬜ Not started |
| S-10 | Security testing | ⬜ Not started |
| S-11 | Production data migration | ⬜ Not started |
| S-12 | DNS / deployment cutover | ⬜ Not started |
| S-13 | Monitoring | ⬜ Not started |
| S-14 | Rollback window | ⬜ Not started |

Full stage descriptions: [CUTOVER_PLAN.md](./CUTOVER_PLAN.md#migration-roadmap).

---

## Next actions, in dependency order

These are prerequisites that **must** be satisfied before any implementation stage can begin.
They are ordered — each unblocks the next.

1. **Resolve the schema drift.** Export the live schema and diff it against `supabase/*.sql`.
   Until this is done, the true target schema is unknown and nothing downstream can be specified.
   → [DATABASE_INVENTORY.md § 5](./DATABASE_INVENTORY.md#5-schema-drift--repo-sql--live-database)
2. **Audit the live RLS state.** Policies are additive; the repository documents at least one
   permissive policy that may or may not still exist in production.
   → [RLS_MIGRATION.md](./RLS_MIGRATION.md)
3. **Collect the operational baseline** — row counts, database size, bucket contents, auth user
   count. Everything in [VPS_REQUIREMENTS.md](./VPS_REQUIREMENTS.md) is currently
   assumption-labelled for want of these numbers.
4. **Choose an architecture option.** Not a recommendation — a decision that must be made before
   design work starts. → [POSTGRES_ARCHITECTURE.md](./POSTGRES_ARCHITECTURE.md)
5. **Decide the fate of the four Supabase capabilities with no direct replacement** — Auth,
   Storage, Realtime, PostgREST. Each needs a source. → [SUPABASE_DEPENDENCIES.md](./SUPABASE_DEPENDENCIES.md)

---

## How this status file is maintained

This file is the single place where migration progress is asserted. If any stage in the roadmap is
ever started, this file changes **in the same commit** as that work, and the `AUDIT ONLY` banner is
replaced with the actual state.

Until then the banner stands: **audit only, no migration executed.**
