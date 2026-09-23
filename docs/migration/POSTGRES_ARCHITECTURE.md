# PostgreSQL Architecture

**Phases covered: 13 (VPS architecture), 19 (compatibility matrix), 20 (target architecture options).**

> **DESIGN ONLY. Nothing was implemented, provisioned, or configured.**
> No VPS, container, database, or DNS record was created. No provider is selected.

---

## 1. Compatibility matrix (Phase 19)

Every row is grounded in repository evidence. "Replacement required" is answered from what the
application *actually calls*, not from what Supabase *could* do.

| Current Supabase capability | PostgreSQL VPS | Replacement required | Repository evidence |
|---|---|---|---|
| **PostgreSQL** | ✅ **Native** — this is the same engine | **No** | `supabase/01_schema.sql` is ordinary PostgreSQL DDL |
| **Tables** | ✅ Native | **No** — but see drift | 11 tables, `01_schema.sql` |
| **Columns / types** (`uuid`, `text`, `date`, `timestamptz`, `boolean`, `int`, `jsonb`) | ✅ Native, all standard types | **No** | `01_schema.sql` throughout |
| **Primary keys** | ✅ Native | **No** | § [DATABASE_INVENTORY § 1.3](./DATABASE_INVENTORY.md#13-primary-keys) |
| **Foreign keys** | ⚠️ 5 of 6 native; **1 targets `auth.users`** | **Yes — FK-1** | `06_final_snapshot.sql:33` |
| **CHECK constraints** | ✅ Native — **8 of 8** | **No*** | `01:17,29,33,49,65,74,104,176`. *\*`role` must gain `'Guru & Pustakawan'` — a drift correction, not an incompatibility* |
| **Unique constraints** | ✅ Native — all 6 | **No** | `01:14,27,54,77,96,81` |
| **Partial unique index** | ✅ Native — `WHERE` indexes are core PostgreSQL | **No** | `01:81-83` |
| **Indexes** | ✅ Native — all 13 | **No** | § [DATABASE_INVENTORY § 1.7](./DATABASE_INVENTORY.md#17-indexes) |
| **SQL functions** | ✅ Native | **No — for FN-1.** ❌ **Yes — for FN-2** | `01:138` portable; `02:22` calls `auth.uid()` |
| **PL/pgSQL functions** | ✅ Native | **Yes — FN-2, FN-3, FN-4** | `02:22`, `06:29`, `06:67` |
| **Triggers** | ✅ Native | **No — for TG-1/TG-2.** ❌ **Yes — TG-3/TG-4** | `01:146,185` portable; `06:62,84` target `auth.users` |
| **Views** | ✅ Native — **not used** | **No** (nothing to port) | zero views |
| **RLS (the feature)** | ✅ **Native — this is core PostgreSQL** | **No** | `02_rls.sql:9-19` |
| **RLS (this application's policies)** | ❌ **Cannot run as written** | ✅ **Yes — completely** | `TO authenticated` (role absent), `auth.uid()` (function absent) |
| **Roles `authenticated` / `anon`** | ❌ Do not exist | ✅ **Yes** | `02` throughout, `03:18-31` |
| **PostgREST role switching** | ❌ Not in PostgreSQL | ✅ **Yes** — the critical one | implicit in every policy |
| **`auth.uid()`** | ❌ Not in PostgreSQL | ✅ **Yes** | `02:27` |
| **`auth.jwt()` / `auth.role()`** | ❌ Not in PostgreSQL | **No** — used **0 times** | grep |
| **Auth (GoTrue)** | ❌ Separate service | ✅ **Yes — full rebuild** | `src/stores/auth.js` |
| **`auth.users` / `auth.identities`** | ❌ Supabase-managed schemas | ✅ **Yes** | `06:17-24, 45, 75, 84` |
| **User metadata** (`raw_user_meta_data`) | ❌ Supabase-only column | ✅ **Yes** | `06:41-43` |
| **Storage** | ❌ Separate service | ✅ **Yes** | `PengaturanView.vue:121,123` |
| **`storage.buckets` / `storage.objects`** | ❌ Supabase-managed schemas | ✅ **Yes** | `03:7-31` |
| **Realtime** | ❌ Separate service | ⚠️ **Yes, or drop it** | `DashboardView.vue:300-302` |
| **`postgres_changes`** | ❌ Not in PostgreSQL | ⚠️ **Yes, or drop it** | idem |
| **`LISTEN` / `NOTIFY`** | ✅ Native PostgreSQL | ⚠️ Available as a *building block*, but not a client transport | not currently used |
| **Edge Functions** | ❌ Separate service | **No — none exist** | `supabase/functions/` absent |
| **PostgREST** | ❌ Separate software (self-hostable) | ✅ **Yes — at minimum, a data-access layer** | 102 call sites |
| **Query builder (`.from()…`)** | ❌ JavaScript SDK over HTTP | ✅ **Yes** | `src/lib/supabase.js:12` |
| **Resource embedding** | ❌ PostgREST-specific | ✅ **Yes** | `DashboardView:145`, `PeminjamanView:125`, etc. |
| **`count: 'exact'` / `head: true`** | ❌ PostgREST-specific | ✅ **Yes** | `DashboardPerpusView:113-115` |
| **`.single()` / `.maybeSingle()`** | ❌ PostgREST-specific, incl. `PGRST116` | ✅ **Yes** | `auth.js:37`, `ScanQRView.vue:182` |
| **`.upsert(…, {onConflict})`** | ⚠️ `ON CONFLICT` **is** native SQL; the builder is not | ✅ **Yes — the SDK call, not the semantics** | `SiswaView:225`, `PengaturanView:234` |
| **Extension `pgcrypto`** | ⚠️ Available; **unnecessary** on PG ≥ 13 | **No** — `gen_random_uuid()` is core | `01:7` |
| **Connection pooling (Supavisor)** | ❌ Not in PostgreSQL | ✅ **Yes** — unless the VPS `postgres` runs it | `src/lib/supabase.js` (implicit) |
| **Managed backups / PITR** | ❌ Not in PostgreSQL | ✅ **Yes** | → [BACKUP_DR_PLAN.md](./BACKUP_DR_PLAN.md) |
| **Managed TLS** | ❌ Not in PostgreSQL | ✅ **Yes** | → [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) |
| **TLS on the wire today** | ✅ Supabase enforces HTTPS | — | `docs/architecture.md:9` shows `HTTPS` |
| **Secrets in the bundle** | ⚠️ anon key is public by design | ✅ **Design decision required** | `SECURITY.md:25` |

### 1.1 Tally

| Category | Count |
|---|---|
| Capabilities that port **unchanged** | **9** (PostgreSQL, tables, columns/types, PKs, CHECKs, uniques, indexes, partial indexes, views-none, RLS-the-feature, TG-1/2, FN-1) |
| Capabilities requiring **partial work** | **2** (FKs — 1 of 6; functions — FN-2 body only) |
| Capabilities requiring **full rebuild** | **8** (Auth, Storage, Realtime, PostgREST, query builder, DB roles, `auth.uid()`, connection pooling) |
| Capabilities with **nothing to migrate** | **2** (Edge Functions, and `auth.jwt()`/`auth.role()` — unused) |

`[INFERRED]` **The pattern is unambiguous.** Everything that is *declarative schema* ports. Nothing
that is a *platform service* ports. The boundary between the two is exactly the line between
`01_schema.sql` (green) and `02_rls.sql` / `03_storage.sql` / `src/lib/supabase.js` (red).

---

## 2. Proposed architecture, annotated (Phase 13)

Design only. Two variants, because the auth question forces a fork. Neither is implemented.

### 2.1 Variant 1 — single VPS, self-hosted backend

```
                    ┌─────────────────────────────────────┐
   Internet ────────►  TLS 443  (Caddy / nginx + ACME)    │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
    ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │ Static SPA      │  │ Backend API      │  │ Object storage   │
    │ (Vercel / CDN,  │  │ (Node/Deno/Go…)  │  │ (MinIO or S3)    │
    │  unchanged)     │  │  · Auth          │  │  bucket: assets  │
    │                 │  │  · Authorization │  │  public read     │
    │                 │  │  · Data access   │  │  admin write     │
    └─────────────────┘  └────────┬─────────┘  └──────────────────┘
                                  │
                                  │  PostgreSQL wire protocol
                                  │  TLS, least-privilege role
                                  ▼
                        ┌─────────────────────┐
                        │  PostgreSQL 16      │
                        │  (systemd, same VPS │
                        │   or a DB-only VPS) │
                        └──────────┬──────────┘
                                   │
                        ┌──────────┴──────────┐
                        ▼                     ▼
                 ┌─────────────┐      ┌─────────────────┐
                 │ WAL archive │      │ pg_dump backups │
                 │ → offsite   │      │ → offsite       │
                 └─────────────┘      └─────────────────┘
```

### 2.2 Variant 2 — self-hosted PostgREST + separate auth

```
   Internet
      │
      ▼
   TLS 443  (Caddy / nginx)
      │
      ├──► Static SPA (Vercel / CDN)
      │
      ├──► PostgREST  ──────► PostgreSQL
      │      │                  ▲
      │      └── JWT verify ────┘ (role switching preserved!)
      │
      └──► Auth service (GoTrue self-hosted, Authentik, Keycloak, Zitadel…)
             │
             └── issues JWTs whose `role` claim = `authenticated`
```

`[INFERRED]` Variant 2 is the only shape that lets the existing RLS policies run **nearly
verbatim** — because PostgREST re-supplies both the `authenticated` role *and* the
`SET LOCAL ROLE` behaviour that every policy depends on. If `auth.uid()` is re-expressed as a
PostgREST-compatible function over the JWT's `sub` claim (PostgREST has historically exposed
`auth.uid()` when configured with that JWT secret and claim mapping), the policies need no edits at
all.

It is presented as a shape, not a recommendation.

---

## 3. Design topics

Each topic below is a **question the design must answer**, with the repository evidence that bears
on it. No answer is prescribed.

### 3.1 PostgreSQL network exposure

| Option | Shape |
|---|---|
| **Private-only** | PostgreSQL binds `127.0.0.1` (or a private interface); only the backend, co-located, connects. Nothing to the internet |
| **Private network between two hosts** | WireGuard/Tailscale between app host and DB host; PostgreSQL binds the private interface only |
| **Public port** | ❌ PostgreSQL reachable from the internet on 5432 |

`[INFERRED]` Repository evidence bears on this only indirectly: the SPA is served from Vercel
(`vercel.json`, `docs/deployment.md`), so a *browser* reaching PostgreSQL directly would require
public exposure — which is exactly what Supabase provided via PostgREST and what must **not** be
recreated by publishing port 5432.

**Recommendation-forming constraint (not a recommendation):** the 100 existing call sites all
expect to reach data over HTTPS from the browser. Any architecture that keeps them working must put
an HTTP layer in between. That layer may co-locate with PostgreSQL.

### 3.2 Firewall

| Layer | Consideration |
|---|---|
| Host firewall (`ufw`/`nftables`) | Default-deny inbound; allow 22 (SSH), 443, and 5432 **only** from the app host |
| Cloud/provider firewall | A second, independent layer — defence in depth |
| Outbound | Restrict to what is needed (package mirrors, backup target, monitoring) |
| IPv6 | Must be firewalled too; it is commonly forgotten |

### 3.3 SSH

| Control | Note |
|---|---|
| Key-only authentication | `PasswordAuthentication no`, `PermitRootLogin no` |
| Non-default port | Marginal benefit; reduces log noise only |
| `fail2ban` / rate limiting | Useful against scanning |
| Bastion or VPN | Further reduces exposure |
| Auditing | `sshd` logs shipped offsite |

### 3.4 Database port

`[INFERRED]` **The single highest-impact decision in this document.** A public 5432 with password
auth is scanned and attacked continuously within minutes of exposure. The existing security model
depends on RLS, which requires a session identity — a direct `psql` connection as a table owner
bypasses RLS entirely (owners are exempt unless `FORCE ROW LEVEL SECURITY` is set). See
[RLS_MIGRATION.md § 6](./RLS_MIGRATION.md#6-cross-cutting-rls-observations-with-consequences-for-migration),
observation RLS-OB-1.

### 3.5 TLS

| Leg | Requirement |
|---|---|
| Browser → API/storage | Mandatory. Today's equivalent is Supabase's managed TLS (`docs/architecture.md:9`) |
| API → PostgreSQL | Required if the two are not on the same host. `sslmode=verify-full`, not `require` |
| PostgreSQL server certificate | Self-signed is workable on a private network; a real certificate if any leg crosses a network boundary |
| Certificate renewal | Automated (ACME/`certbot`); a silently expired certificate is indistinguishable from an outage |
| SSH | Unrelated to database TLS but part of the same posture |

### 3.6 Connection pooling

| Consideration | Detail |
|---|---|
| What Supabase provided | Supavisor, in transaction mode — invisible to the application |
| Why it matters here | The SPA issues **102 call sites**; each browser session can fan out to several concurrent queries (`Promise.all` at `DashboardView.vue:117-118`, `:199-200`; `RekapView.vue:92-95`; `RekapSemesterView.vue:79-82`; `DashboardPerpusView.vue:113-115`) |
| Pooling options | PgBouncer (transaction mode) in front of PostgreSQL; or connection pooling inside the backend |
| A specific hazard | **`SET LOCAL ROLE` — the mechanism Variant 2 needs — is transaction-scoped and therefore *compatible* with transaction-mode pooling, but incompatible with statement-mode pooling.** This constrains the pooler configuration |
| Postgres max_connections | Default 100. A pooled backend makes this irrelevant to browser count; an unpooled one makes it the hard ceiling |

### 3.7 Backup

→ [BACKUP_DR_PLAN.md](./BACKUP_DR_PLAN.md).

### 3.8 Monitoring

| What to watch | Why |
|---|---|
| Availability (TCP + `SELECT 1`) | Detects an outage before users report it |
| Connection count vs. pool ceiling | The likeliest saturation failure |
| Slow queries | Directly relevant — see [VPS_REQUIREMENTS.md](./VPS_REQUIREMENTS.md) |
| Disk space | A full disk stops PostgreSQL accepting writes |
| WAL volume and archive lag | Determines PITR feasibility |
| Replication lag (if any) | — |
| Backup success/failure | A backup that silently fails is worse than none |
| Certificate expiry | — |
| Auth failures / rate limits | Brute-force detection |

`[REPO]` **There is no monitoring of any kind today.** `docs/performance.md:59` lists runtime error
monitoring (Sentry/GlitchTip) as an unstarted backlog item, and the only operational signal is
whatever Supabase's dashboard showed. This is a **new** operational responsibility, not a
migration.

### 3.9 Logging

| Log | Retention | Where |
|---|---|---|
| PostgreSQL server log | days–weeks | local + shipped |
| Slow query log (`log_min_duration_statement`) | days | local |
| `activity_logs` (application audit) | **indefinite — it is a reporting input** | in the database; see [DATABASE_INVENTORY § 4.3](./DATABASE_INVENTORY.md#43-activity_logsrecord_id-is-a-string-encoded-composite-used-as-a-query-key) |
| Auth events | weeks–months | backend |
| Access logs (nginx/Caddy) | days | local + shipped |

⚠️ `[INFERRED]` **Do not confuse the two log types.** `activity_logs` is *not* an operational log —
it is a business table that the reporting layer reads. `log_min_duration_statement` is an
operational log and should never be exposed to the application.

### 3.10 Failover considerations

| Scenario | Options |
|---|---|
| Single VPS, disk failure | Restore from backup; RPO = time since last backup/WAL — see [BACKUP_DR_PLAN.md](./BACKUP_DR_PLAN.md) |
| Single VPS, PostgreSQL crash | `systemd` restart; PostgreSQL's own crash recovery from WAL |
| VPS provider outage | Restore elsewhere from offsite backup |
| Two-node streaming replication | Standby + manual/automated promotion. **Doubles** the operational surface |
| Backend instance failure | If stateless, restart; sessions must live outside the process |

`[INFERRED]` A single-school deployment with a few hundred users is unlikely to justify streaming
replication — but that is a judgement about *availability requirements*, which are not stated
anywhere in this repository and must be supplied by the operator.

### 3.11 Migration rollback

| Layer | Rollback |
|---|---|
| Frontend | Vercel instant rollback / promote previous deployment (`docs/deployment.md:39`) |
| Backend | Redeploy previous version |
| **Data** | **This is the hard one.** Once the new system is receiving writes, rolling back to Supabase means reconciling divergent datasets. See [CUTOVER_PLAN.md](./CUTOVER_PLAN.md#rollback) |
| DNS | Keep TTL low before cutover; revert the record |

`[INFERRED]` **The repository has no rollback story for data at all**, because until now the only
database changes were manual and irreversible. `docs/deployment.md:41` says so explicitly:
*"perubahan skema/RLS manual di Supabase tidak bisa di-rollback via Vercel"*. Establishing one is
new work.

### 3.12 Secrets management

| Secret | Today | After |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | In the SPA bundle (`.env` → Vercel env vars) | **Removed.** The anon key concept disappears with PostgREST |
| Supabase `service_role` key | **Never in the repo, never in frontend** (`SECURITY.md:30`) | n/a |
| **New:** database connection string | — | Server-side only. **Never** in a `VITE_*` variable |
| **New:** JWT signing secret | — | Server-side only |
| **New:** storage access keys | — | Server-side only |
| **New:** TLS private key | — | Host filesystem + automation |
| **New:** backup encryption key | — | ⚠️ **Must be stored separately from the backups** |

`[INFERRED]` A structural change is required here. Today, the only "secret" is a public key; the
application's entire secret-handling surface is `.env` with two non-secret values. A backend
introduces genuine secrets that must never reach the browser — and a naive migration that keeps the
`VITE_*` convention for the database URL would publish the database's address to the world.

---

## 4. Target architecture options (Phase 20)

**Not ranked. Not scored. Not called "best".** Each is described on six axes. The choice is the
user's.

Shared preconditions for all three, from § 1 and
[DATABASE_INVENTORY § 5](./DATABASE_INVENTORY.md#5-schema-drift--repo-sql--live-database):

- resolve the schema drift;
- resolve the live RLS state;
- decide the identity model.

---

### OPTION A — Keep the frontend, add a backend API, PostgreSQL on VPS

**Shape**

```
Vue 3 SPA (Vercel, unchanged in structure)
    │  HTTPS + session token
    ▼
Backend API  ← the new component
    ├── Auth (credentials, sessions)
    ├── Authorization (role checks per endpoint)
    ├── Data access (explicit SQL / ORM)
    └── Storage upload endpoint
    │
    ▼
PostgreSQL on VPS  +  object storage
```

| Axis | Assessment |
|---|---|
| **Components** | New backend service; PostgreSQL VPS; object storage; the SPA is modified at all 102 query sites to call HTTP endpoints instead of `supabase.from()` |
| **Migration effort** | **High.** The largest code change of the three: 102 call sites rewritten, a backend written from nothing, and PostgREST semantics (embeds, counts, upserts, `PGRST116`) reimplemented by hand |
| **Security implications** | The backend becomes the **sole** enforcement point unless RLS is also ported. Authorization moves into application code — a departure from the current design's stated principle (`docs/authentication.md:52`: *"penegakan final ada di RLS database"*). One missed role check = a data leak with no database backstop. RLS may be kept as defence-in-depth, but only if identity injection is implemented (`SET LOCAL ROLE` or session variables) |
| **Operational responsibility** | Highest breadth: OS patching, PostgreSQL, backend process, TLS, storage, backups, monitoring, on-call. Nothing is managed |
| **Supabase dependencies remaining** | **None** — full exit is achievable. (Optionally: retain Supabase Storage during a transition, which leaves a partial dependency) |
| **Rollback complexity** | **Highest.** The frontend and the data path change together. Rollback requires restoring both the previous SPA deployment *and* reconciling any writes made since cutover. The repository has no data-rollback mechanism today |

---

### OPTION B — Frontend + self-hosted Supabase-compatible backend + PostgreSQL

**Shape**

```
Vue 3 SPA  (src/stores/auth.js and src/lib/supabase.js largely unchanged)
    │  PostgREST HTTP + JWT
    ▼
Self-hosted PostgREST  ──────────► PostgreSQL on VPS
    │                                  ▲
    │                                  │  RLS policies run almost verbatim
    └── JWT issuer (self-hosted auth) ─┘
```

Self-hosted components from the Supabase stack: PostgREST, an auth service, and object storage.
Container orchestration is optional but conventional.

| Axis | Assessment |
|---|---|
| **Components** | PostgreSQL VPS; PostgREST; an auth service (self-hosted GoTrue or a general OIDC provider such as Authentik/Keycloak/Zitadel); S3-compatible storage. **The SPA changes least** |
| **Migration effort** | **Lower on the application side, higher on the infrastructure side.** PostgREST restores `.from()`, embeds, counts, upserts — so the 102 call sites largely survive. `src/lib/supabase.js` is repointed. The effort moves to running and integrating three or four services |
| **Security implications** | **Closest to today's model.** `authenticated`/`anon` role switching is restored, so RLS remains the enforcement point and the existing policies work. New risks: the JWT secret and signing configuration become operator-owned, and a mis-issued token is a database-level role grant. The `allow_all_library_visits` policy (RLS-24) must still be excluded, and this option makes it *more* consequential, because RLS is the actual control |
| **Operational responsibility** | Several services to run, version, and keep patched, plus their interconnection (JWT secret sharing, network policy, migrations). More moving parts than A, but the auth and data-access layers are off-the-shelf rather than hand-written |
| **Supabase dependencies remaining** | **Supabase-specific software persists** — PostgREST, GoTrue, and the `storage` schema are Supabase's own. The *hosted service* dependency ends; the *software* dependency does not. Future upgrades are the operator's |
| **Rollback complexity** | **Lowest of the three.** Because the SPA and its data-access code change least, reverting the frontend is a redeploy. The identity model (JWT with a role claim) is the same on both sides, so a token issued by either system has a comparable shape |

---

### OPTION C — Hybrid transition

**Shape** — a deliberate intermediate state, not a destination.

```
Phase C1  Introduce a data-access seam WITHOUT changing behaviour
             src/lib/supabase.js  →  src/lib/data/<domain>.js
             Views import domain modules instead of calling supabase.from() directly
             Behaviour identical; Supabase still underneath
                    │
                    ▼
Phase C2  Move the database, keep the platform
             PostgreSQL VPS + self-hosted PostgREST (Option B's infrastructure)
             Still no auth change
                    │
                    ▼
Phase C3  Move auth
             Replace GoTrue; port get_my_role(); re-verify all policies
                    │
                    ▼
Phase C4  Move storage, then realtime (or drop realtime)
                    │
                    ▼
Phase C5  Optionally continue to A's shape, or stop at B
```

| Axis | Assessment |
|---|---|
| **Components** | Sequenced subsets of A and B. Each phase is independently deployed and independently reversible |
| **Migration effort** | **Highest total, lowest per step.** C1 alone is a large mechanical refactor (102 call sites) that delivers **no functional change** — it is pure investment. But it is also the phase that makes every later phase small |
| **Security implications** | The transition passes through states with **mixed** enforcement. During C2, RLS is authoritative; during and after C3, identity handling is in flux — the highest-risk window. Each phase needs its own security verification, and the interim states must not be left running indefinitely |
| **Operational responsibility** | Grows progressively. There is a period where **both** Supabase and the new VPS are live and both must be operated, monitored, and backed up |
| **Supabase dependencies remaining** | Deliberately reduces over time. C1: full. C2: Auth + Storage + Realtime. C3: Storage + Realtime. C4: none, or realtime only |
| **Rollback complexity** | **Lowest per phase, with one exception.** C1 is trivially reversible (behaviour-preserving refactor). C2 and C4 are reversible by repointing. C3 — the auth cutover — is **not** cleanly reversible once users have authenticated against the new system, because credentials now live in two places. C3 must therefore be planned with the rigour of a full cutover |

---

### 4.1 Axes summarised

| | A — Backend API | B — Self-hosted compatible stack | C — Hybrid |
|---|---|---|---|
| Application code changed | 102 sites + new backend | Minimal (`supabase.js` repointed) | 102 sites (once, in C1) |
| RLS policies usable | Only with identity injection | ✅ Nearly verbatim | Depends on the C-variant |
| Auth rebuilt | Fully, by hand | Off-the-shelf service | Sequenced |
| Enforcement point after migration | Backend code | Database (RLS) | Varies by phase |
| Services to operate | 1 app + 1 DB + storage | 3–4 + DB + storage | Increases over time |
| Full Supabase exit | ✅ Yes | ⚠️ Software persists | ✅ Eventually |
| Rollback difficulty | High | **Low** | Low per step; **high at C3** |
| Can run both paths in parallel | ❌ No | ⚠️ Partially | ✅ Yes, by design |

### 4.2 What repository evidence says about the choice

Presented as constraints, not as a recommendation.

| Evidence | Bears on |
|---|---|
| No data-access seam; 102 call sites in 22 files ([SUPABASE_DEPENDENCIES § 6](./SUPABASE_DEPENDENCIES.md#6-the-missing-seam)) | A and C-front-load this cost; B minimises it |
| `docs/authentication.md:52` — RLS is the intended final enforcement | B preserves the design intent; A changes it |
| No backend code, no ORM, no `pg` driver in `package.json` | A requires new technology choices with no precedent in the repo |
| `get_my_role()` centralises all identity logic in one 3-line function (`02:22-29`) | Whichever option, the identity change is confined to one function plus its callers |
| `allow_all_library_visits` may still be live (RLS-24) | B makes RLS-load-bearing, so this must be resolved *before* B, not after |
| Realtime is used once, for a non-critical refresh | All options can defer or drop it |
| Storage is one logo object | Independent of the choice; can be sequenced freely |
| No automated tests exist (`docs/testing.md:3`) | Every option needs the [TEST_PLAN.md](./TEST_PLAN.md) built *before* it, or changes are unverifiable |
| Schema drift is unresolved | **Blocks all three.** No option can start at S-2 |

---

## 5. Relationship to the roadmap

| Roadmap stage | Option A | Option B | Option C |
|---|---|---|---|
| S-1 Prepare VPS | ✅ | ✅ | ✅ |
| S-2 Recreate schema | ✅ (blocked by drift) | ✅ (blocked by drift) | ✅ (blocked by drift) |
| S-3 Test database | ✅ | ✅ | ✅ |
| S-4 Backend API | **Write one** | **Deploy PostgREST** | C1 seam, then C2 PostgREST |
| S-5 Authentication | Hand-built | Self-hosted auth service | C3 |
| S-6 Migrate test data | ✅ | ✅ | ✅ |
| S-7 Application integration | **102 call sites** | Repoint `supabase.js` | Staged across C1–C4 |
| S-8 … S-14 | identical | identical | identical, repeated per phase |

Full stage definitions: [CUTOVER_PLAN.md](./CUTOVER_PLAN.md#migration-roadmap).

`[INFERRED]` Note what this table makes visible: **for Option B, stages S-4 and S-7 shrink
dramatically while stages S-1 and S-5−S-13 stay identical.** The option choice is not about whether
the project is large — every option carries the same operational build-out — it is about *where*
the large work sits: in application code (A), in infrastructure configuration (B), or spread
deliberately across time (C).
