# Migration Audit — Supabase → Self-Hosted PostgreSQL VPS

> **AUDIT / ANALYSIS ONLY.** No migration has been executed. No application code, schema,
> migration, RLS policy, auth configuration, environment variable, deployment target, database
> or storage object was modified, created, or written to during this audit.
> See [MIGRATION_STATUS.md](./MIGRATION_STATUS.md).

This directory is the deliverable of a read-only readiness audit. It exists to answer one
question: **what would be required before migrating this application off Supabase and onto a
self-hosted PostgreSQL VPS?**

It does not answer "should you", and it does not rank the options — see
[POSTGRES_ARCHITECTURE.md](./POSTGRES_ARCHITECTURE.md#4-target-architecture-options-phase-20).

---

## 1. How to read these documents

### Evidence classification

Every non-obvious claim in these documents is tagged with one of three levels. **Nothing is
stated as fact without one of these tags.**

| Tag | Meaning |
|---|---|
| `[REPO]` **VERIFIED FROM REPOSITORY** | Directly readable from a tracked file. Cited as `path:line`. |
| `[INFERRED]` | A conclusion drawn from repository evidence, where the conclusion itself is not literally in the file. The evidence is always shown so the reader can disagree. |
| `[UNKNOWN]` | Not determinable from the repository. Written as `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION`. |

### The source-of-truth rule

The repository is the only source of truth for this audit. Where the repository's own prose
documentation disagrees with its SQL or its application code, **all three are reported and the
contradiction is surfaced rather than resolved silently**. Several such contradictions were found
and they are the single most important finding of this audit — see
[DATABASE_INVENTORY.md § Schema drift](./DATABASE_INVENTORY.md#5-schema-drift--repo-sql--live-database).

### What could not be inspected

This audit had **no access to the live Supabase project**: no database connection, no
`service_role` key, no dashboard, no Supabase CLI link, no `config.toml`. The repository contains
no local Supabase development configuration and no migration runner
(`supabase/` holds six loose `.sql` files — `[REPO]` `git ls-files supabase/`).

Consequently the following classes of fact are **permanently out of reach for this audit** and are
marked `[UNKNOWN]` throughout rather than guessed:

- production row counts and database size
- which SQL files were actually executed against the live database, and in what order
- the live RLS state (policies are additive; a stale permissive policy may still be present)
- which extensions are actually installed
- index usage statistics and real query latency
- production auth configuration (auto-confirm, rate limits, password policy)
- storage bucket configuration and contents
- whether `public.users.role` accepts a 4th role value, and the live constraint set
- columns present in the live database but absent from the repository SQL

These are enumerated in [MIGRATION_RISKS.md § Unknowns](./MIGRATION_RISKS.md#unknowns-requiring-live-inspection).

---

## 2. Method — the skills applied

Two skill libraries were surveyed for methodology and the relevant ones were applied. **No
repository was copied into this one** — only the method was adopted.

### `mattpocock/skills`

| Skill | Adopted? | How it was applied |
|---|---|---|
| `engineering/research` | **Yes** | *"Investigate against primary sources… Follow every claim back to the source that owns it."* Applied literally: every claim cites `path:line` from this repository, and the repository's own docs are treated as a secondary source to be checked against the SQL and application code rather than trusted. |
| `engineering/domain-modeling` | **Yes** | *"When the user states how something works, check whether the code agrees… surface it."* This produced the drift findings (documentation vs SQL vs application code) and the glossary-appendix in [DATABASE_INVENTORY.md](./DATABASE_INVENTORY.md#appendix-b--domain-glossary-enid). |
| `engineering/codebase-design` | **Yes** | The `seam` / `adapter` vocabulary was used to describe the coupling to Supabase. The finding: this codebase has **no data-access seam** — `supabase.from()` is called directly from 18 view files, so a migration cannot be localised behind one module. See [SUPABASE_DEPENDENCIES.md § The missing seam](./SUPABASE_DEPENDENCIES.md#6-the-missing-seam). |
| `engineering/improve-codebase-architecture` | Partly | Its *scope before you scan* guidance (weight recent-change hot spots) informed where to look first. Its HTML-report deliverable does not apply to an audit-only task. |
| `engineering/tdd`, `diagnosing-bugs`, `code-review` | No | No test framework, no defect, no diff under review. |
| `productivity/writing-for-agents` | Yes | Drove the structure of this document set: lead with the answer, tables over prose, stable anchors for cross-linking. |

### `anthropics/skills`

| Skill | Adopted? | How it was applied |
|---|---|---|
| `doc-coauthoring` | **Yes** | Its three-stage model (Context Gathering → Refinement & Structure → **Reader Testing**) shaped the workflow. Reader Testing was performed as a self-consistency pass: every cross-document link and anchor was resolved, and every `[UNKNOWN]` was checked to appear in the consolidated list. |
| `webapp-testing` | **Yes** | Its reconnaissance-then-action discipline and *"always run with `--help` first — do not read the source until you must"* informed the test-plan structure in [TEST_PLAN.md](./TEST_PLAN.md): observe the current behaviour first, then assert on it. |
| `xlsx`, `pdf`, `pptx`, `docx`, `canvas-design`, `brand-guidelines`, `algorithmic-art`, `slack-gif-creator`, `theme-factory` | No | Not applicable to an engineering audit. |
| `mcp-builder`, `claude-api`, `web-artifacts-builder` | No | Out of scope — this is not an MCP or API-client project. |

### Not adopted, deliberately

`skill-creator`, `internal-comms`, `academy-guide`, `discernment-nudge` — none bear on a database
migration audit.

---

## 3. Baseline (Phase 0)

Recorded **before** any analysis. `[REPO]`

| Property | Value | Evidence |
|---|---|---|
| Branch | `arena/01a0cbc9-presensi-siswa` | `git rev-parse --abbrev-ref HEAD` |
| Commit SHA | `de441b79221c040cc6e437429234d38fed09088d` | `git rev-parse HEAD` |
| Working tree | Clean (`git status --porcelain` empty) | `git status` |
| Application version | `0.1.0` | `package.json:4` |
| Framework | Vue `3.5.38` (locked) | `package.json:22`, `docs/tech-stack.md` |
| Build tool | Vite `5.4.21` (locked) | `package.json:29` |
| State | Pinia `2.3.1` (locked) | `package.json:20` |
| Routing | vue-router `4.6.4` (locked), `createWebHistory` | `package.json:23`, `src/router/index.js:141` |
| CSS | Tailwind `3.4.19` (locked) | `package.json:28` |
| Supabase client | `@supabase/supabase-js` `^2.45.0` → locked **`2.108.2`** | `package.json:10`, `package-lock.json` |
| Realtime client | `@supabase/realtime-js` `2.108.2` (transitive) | `package-lock.json` |
| Database-related directories | `supabase/` **only** — 6 loose `.sql` + `README.md` | `git ls-files supabase/` |
| Migration runner | **None.** No `supabase/migrations/`, no `config.toml`, no CLI link | `ls supabase/` |
| Edge Functions | **None.** No `supabase/functions/` directory | `ls supabase/functions` → *No such file* |
| Environment variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — **only these two** | `.env.example:1-2` |
| `.env` tracked? | No — gitignored, and absent from the checkout | `.gitignore:5`, `ls .env` → *No such file* |
| Backend / ORM / driver | **None.** No Express, Fastify, Hono, Prisma, Drizzle, Knex, `pg`, or Dockerfile in dependencies | `package.json` dependency scan |
| Hosting | Vercel static SPA + CDN | `vercel.json`, `docs/deployment.md` |
| CI | GitHub Actions: `npm ci` → template-binding guard → `npm run build` | `.github/workflows/ci.yml:1-25` |

### Database access paths (all of them)

There is exactly **one** Supabase client instance in the application `[REPO]`
(`src/lib/supabase.js:12`) plus one deliberate secondary client
(`src/views/GuruView.vue:19`). All database access flows through one of four Supabase
sub-clients:

```
                     src/lib/supabase.js  (createClient)
                              │
      ┌───────────────┬───────┴────────┬──────────────────┐
      │               │                │                  │
   .from()        .auth            .storage          .channel
  PostgREST      GoTrue          Storage API        Realtime
      │               │                │                  │
  11 tables      signIn/signOut    bucket 'assets'   postgres_changes
  0 RPC calls    getSession         logo upload       on attendance_logs
                 onAuthStateChange  getPublicUrl      (1 subscription)
```

`[REPO]` Evidence: `.rpc(` appears **zero times** in `src/` and `supabase/`.
`supabase.functions.invoke` / Edge Functions appear **zero times**.
See [SUPABASE_DEPENDENCIES.md](./SUPABASE_DEPENDENCIES.md) for the full classification.

---

## 4. Document index

| Document | Phase(s) | What it establishes |
|---|---|---|
| [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) | — | **AUDIT ONLY. NO MIGRATION EXECUTED.** Current status and what is explicitly not done. |
| [DATABASE_INVENTORY.md](./DATABASE_INVENTORY.md) | 1, 2, 7, 8 | Every object in the repository SQL; the dependency graph; schema drift; functions/triggers/extensions. |
| [SUPABASE_DEPENDENCIES.md](./SUPABASE_DEPENDENCIES.md) | 3, 6, 10, 11 | Every Supabase-specific coupling, classified A–G; the full UI→store→query matrix; realtime; API layer. |
| [AUTH_MIGRATION.md](./AUTH_MIGRATION.md) | 5 | Whether Supabase Auth is mandatory, what depends on `auth.users`, and the database-vs-platform split. |
| [RLS_MIGRATION.md](./RLS_MIGRATION.md) | 4 | Every policy; what Supabase supplies that plain PostgreSQL does not; what silently breaks. |
| [STORAGE_MIGRATION.md](./STORAGE_MIGRATION.md) | 9 | The logo bucket, its permissive write policy, and replacement shapes. |
| [POSTGRES_ARCHITECTURE.md](./POSTGRES_ARCHITECTURE.md) | 13, 19, 20 | Compatibility matrix; three architecture options; proposed target topology. |
| [VPS_REQUIREMENTS.md](./VPS_REQUIREMENTS.md) | 14, 15 | Resource sizing scenarios (assumption-labelled); query bottlenecks; needed indexes. |
| [DATA_MIGRATION_PLAN.md](./DATA_MIGRATION_PLAN.md) | 12 | Dependency-ordered migration plan; what `pg_dump` can and cannot carry. |
| [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) | 17 | Supabase-supplied controls vs controls that must be rebuilt; findings. |
| [BACKUP_DR_PLAN.md](./BACKUP_DR_PLAN.md) | 16 | Backup strategy, PITR, RPO/RTO, restore testing. |
| [TEST_PLAN.md](./TEST_PLAN.md) | 23 | Test matrix with IDs, expected results, and migration validation. |
| [CUTOVER_PLAN.md](./CUTOVER_PLAN.md) | 21, 22 | Staged roadmap; T-minus cutover timeline; rollback. |
| [MIGRATION_RISKS.md](./MIGRATION_RISKS.md) | 18 | Risk matrix, blocking issues, consolidated unknowns. |

---

## 5. The three findings that dominate everything else

Stated here up front because they change the shape of the whole project. Each is expanded in its
own document.

**1. The repository SQL cannot recreate the production database.** At least four columns used by
the application are absent from every SQL file in `supabase/`, and one role value used throughout
the code violates a `CHECK` constraint declared in `supabase/01_schema.sql`. The live schema has
drifted and the drift is not recorded in the repository. Any plan that starts with "run the SQL
files" produces a database the application cannot run against.
→ [DATABASE_INVENTORY.md § 5](./DATABASE_INVENTORY.md#5-schema-drift--repo-sql--live-database)

**2. "PostgreSQL" is a strict subset of what is being consumed.** Of the ten Supabase capabilities
the application uses, plain PostgreSQL replaces three. The other seven — Auth, Storage, Realtime,
PostgREST, the `authenticated`/`anon` database roles, `auth.uid()`, and the JWT claim chain —
must be either rebuilt or re-sourced. `[REPO]` The application contains **zero** backend code, so
"rebuild" means *writing a backend that does not currently exist*.
→ [POSTGRES_ARCHITECTURE.md § Compatibility](./POSTGRES_ARCHITECTURE.md#1-compatibility-matrix-phase-19)

**3. There is no seam to migrate behind.** `supabase.from()` is called directly from **22 files at
102 call sites**; there is no repository layer, no API client module, no service abstraction. The
database access pattern is diffuse across the view layer. A migration therefore touches the
majority of the application's files rather than a boundary.
→ [SUPABASE_DEPENDENCIES.md § 6](./SUPABASE_DEPENDENCIES.md#6-the-missing-seam)

---

## 6. Conventions used

- **Path references** are relative to the repository root and always include a line number where a
  single line is meant: `src/stores/auth.js:90`.
- **IDs** are stable and referenced across documents: `DB-xx` (inventory), `SD-xx` (Supabase
  dependency), `RLS-xx`, `AU-xx`, `ST-xx`, `DA-xx` (data access), `R-xx` (risk), `T-xx` (test),
  `S-x` (roadmap stage), `BLK-x` (blocking issue).
- **No timings or costs are estimated as facts.** Where effort is characterised it is qualitative
  (`low` / `medium` / `high`) and explicitly labelled as judgement, not measurement.
- **Indonesian domain terms** are preserved verbatim (`presensi`, `guru`, `siswa`, `kelas`,
  `nisn`, `wali kelas`) because they are the actual identifiers in the schema. A glossary is in
  [DATABASE_INVENTORY.md Appendix B](./DATABASE_INVENTORY.md#appendix-b--domain-glossary-enid).
