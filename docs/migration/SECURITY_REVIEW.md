# Security Review

**Phase 17 — security audit, migration-scoped.**

> **READ-ONLY REVIEW. No security control was changed. No RLS policy, auth setting, storage policy,
> or firewall rule was modified.**
> No live database was inspected; findings marked `[UNKNOWN]` require live verification.

This document has two jobs:

1. **Separate** the controls Supabase provided from the controls that must be **rebuilt** after
   leaving it (the brief's central ask for this phase).
2. **Record** the security findings the audit surfaced, including pre-existing ones, so they are
   not silently carried into the new environment.

---

## 1. Security controls Supabase provided

| # | Control | What Supabase did | Exists in this repo? | After leaving Supabase |
|---|---|---|---|---|
| SC-01 | **Authentication** | GoTrue: password hashing, session issuance, token refresh, revocation | ❌ Only *calls* to it (`auth.js:90-107`) | 🔴 **REBUILD** |
| SC-02 | **JWT issuance & verification** | Signed tokens, key management, expiry | ❌ Not present | 🔴 **REBUILD** |
| SC-03 | **Password hashing** | Bcrypt, server-side, never in the client | ❌ **No hashing code anywhere** | 🔴 **REBUILD** |
| SC-04 | **RLS enforcement path** | PostgREST applied RLS per request | ✅ Policies exist (`02_rls.sql`) | 🟡 **KEEP + RE-WIRE** — the policies are not the problem; the *mechanism* is |
| SC-05 | **DB role switching** | `SET LOCAL ROLE authenticated/anon` per request from the JWT | ❌ Implicit | 🔴 **REBUILD** |
| SC-06 | **`auth.uid()`** | Session identity inside SQL | ❌ Implicit | 🔴 **REBUILD** |
| SC-07 | **Connection pooling** | Supavisor, transaction mode | ❌ Implicit | 🔴 **REBUILD** |
| SC-08 | **TLS termination** | Managed certs on all endpoints | ❌ Implicit | 🔴 **REBUILD** |
| SC-09 | **Network isolation of the database** | PostgreSQL never publicly exposed; only PostgREST was | ❌ Implicit | 🔴 **REBUILD** — and the easiest to get wrong |
| SC-10 | **API rate limiting / abuse protection** | Platform-level | ❌ Implicit | 🔴 **REBUILD** |
| SC-11 | **Managed backups & PITR** | Automated | ❌ Implicit — **and the app's own "backup" is an .xlsx export** (`PengaturanView.vue:340-405`) | 🔴 **REBUILD** → [BACKUP_DR_PLAN.md](./BACKUP_DR_PLAN.md) |
| SC-12 | **Audit logging of platform events** | Dashboard audit | ❌ Implicit | 🟡 **PARTIAL** — app-level audit exists in `activity_logs`; platform-level must be rebuilt |
| SC-13 | **Storage access policies** | `storage.objects` RLS | ✅ `03_storage.sql:12-31` | 🔴 **REBUILD** — different technology |
| SC-14 | **Secrets at rest** | Platform-managed | ⚠️ `.env` with **non-secret** values only | 🔴 **REBUILD** — new, real secrets appear |
| SC-15 | **Realtime authorization** | RLS-mediated payload filtering | ❌ Implicit | 🟡 **REBUILD or DROP** |
| SC-16 | **`service_role` bypass** | Existed | ❌ **Correctly never used** (`SECURITY.md:30`) | ✅ **Nothing to rebuild** — the repo never had it |

`[INFERRED]` **Count: 16 controls identified; 12 require rebuild, 3 require re-wiring, 1 requires
nothing.** The repository contains implementation for exactly **two** of them (SC-04's policies and
SC-13's policies) — and both are written against Supabase-managed objects.

---

## 2. Security findings

Ordered by severity. Every one is evidence-backed. Several are **pre-existing** and are recorded
so that the migration does not silently reproduce them.

### SEC-01 — Public storage bucket accepts anonymous writes and deletes

| | |
|---|---|
| **Severity** | 🔴 **HIGH** |
| **Evidence** | `supabase/03_storage.sql:17-31` — `assets_anon_write`, `assets_anon_update`, `assets_anon_delete`, all `TO anon, authenticated` |
| **Preconditions** | The anon key is **published in the frontend bundle by design** (`SECURITY.md:25`, `docs/deployment.md:33`), so it requires no more than opening devtools |
| **Impact** | **Any internet user can upload to, overwrite, or delete the school's logo.** Deleting it breaks the sidebar, the boot splash, and the letterhead of every generated PDF |
| **Acknowledged?** | ✅ Yes — `docs/database.md:103` and `SECURITY.md:26` both describe it as an accepted temporary risk (the SQL calls it *"OPSI A"*) |
| **Live state** | `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION` |
| **Migration action** | ❌ **Do not reproduce.** The replacement storage must be public-**read**, admin-**write**. Add anonymous-write rejection to [TEST_PLAN.md](./TEST_PLAN.md) |

### SEC-02 — Every authenticated user can read every `users` row

| | |
|---|---|
| **Severity** | 🟡 **MEDIUM** |
| **Evidence** | `supabase/02_rls.sql:58` — `CREATE POLICY "Authenticated_Select" ON public.users FOR SELECT TO authenticated USING (true);` |
| **Impact** | RLS filters **rows, not columns**. Any authenticated user — including a `Guru` or a `Pustakawan` — can `SELECT *` from `users` and read every staff member's `username`, `nip`, `role`, `kelas`, and the `password` column |
| **UI reality** | The application narrows columns at the query level (`GuruView.vue:153`), but nothing enforces that. `auth.js:37` itself does `select('*')`, and a user with the anon key can bypass the UI entirely |
| **Aggravating factor** | The route guard makes `/guru` admin-only (`router/index.js:81-85`), so this is invisible in normal use — **the UI is stricter than the database**, exactly the inversion `docs/authentication.md:52` warns against |
| **Migration action** | Decide deliberately: keep the broad read (simplest, matches today), or restrict to self + admin. Consider `GRANT SELECT (id, nama, role, kelas, nip) ON public.users TO authenticated` — **column-level grants, which the repository does not currently use at all** |

### SEC-03 — Legacy plaintext passwords readable by any authenticated user

| | |
|---|---|
| **Severity** | 🔴 **HIGH** |
| **Evidence** | Column: `supabase/01_schema.sql:15` — `password text not null`. Readable under: `supabase/02_rls.sql:58`. Populated with **real plaintext** by: `supabase/04_seed.sql:8-10` — `('admin', 'admin123', …)`, `('guru1', 'guru123', …)`, `('guru2', 'guru123', …)` |
| **Why it is still a finding** | `06_final_snapshot.sql:56` writes `'***'` for rows **it** creates. But rows created by `04_seed.sql` — or by any earlier code path — retain their original plaintext. The column is `NOT NULL`, so it cannot simply be absent from old rows |
| **Compounding factor** | `admin123` and `guru123` are the values **documented in the repository's own setup instructions** (`04_seed.sql:3`: *"GANTI password default setelah login pertama!"* — "change the default password after first login"; `06_final_snapshot.sql:84`) |
| **Impact** | Any authenticated user can read `users.password` (SEC-02) and obtain plaintext credentials. Even though login no longer uses this column (`SECURITY.md:38`), operators reuse passwords — and these are the documented defaults |
| **Live state** | `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION` — `SELECT count(*) FROM public.users WHERE password IS NOT NULL AND password <> '***';` |
| **Migration action** | **Do not carry the column into the new environment at all**, or carry it as `NULL`/`'***'` only. If any row still holds a real value, treat those credentials as compromised and force a reset. The new auth system should have **no password column** — see [AUTH_MIGRATION.md § 9](./AUTH_MIGRATION.md#9-the-database-vs-platform-split) |

### SEC-04 — A permissive `anon` policy may still grant full access to `library_visits`

| | |
|---|---|
| **Severity** | 🔴 **CRITICAL (if live)** / ⚪ none (if dropped) |
| **Evidence** | `supabase/05_library_visits.sql:19-21` — `CREATE POLICY "allow_all_library_visits" ON public.library_visits FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);` |
| **Mechanism** | PostgreSQL policies are **additive (OR-ed)**. If both this and `Perpus_Manage_Visits` (`02:108-111`) exist, this one alone permits **every operation for every caller — including unauthenticated ones** |
| **Consequence of coexistence** | `library_visits` is fully public: readable, writable, and deletable by anyone holding the anon key. It contains `student_nisn` and `tanggal` — i.e. **a record of which children visited the library and when**, which is student PII |
| **Documented?** | ✅ Both `docs/database.md:19` and `supabase/README.md` warn the policy should not be present; `docs/database.md:96` states policies are additive and *"satu policy longgar membatalkan seluruh model ketat"* ("one loose policy cancels the entire strict model") |
| **Live state** | ❗ `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION`. The file is tracked and executable; whether the policy was later dropped is recorded nowhere |
| **Verify** | `SELECT polname, polroles::regrole[], pg_get_expr(polqual, polrelid), pg_get_expr(polwithcheck, polrelid) FROM pg_policy WHERE polrelid = 'public.library_visits'::regclass;` |
| **Migration action** | ❌ **Do not reproduce.** Capture the live state **before** cutover so the new environment can be *proven* no more permissive than the old. This is the single most important pre-migration check |

### SEC-05 — Audit log rows can be forged

| | |
|---|---|
| **Severity** | 🟡 **MEDIUM** |
| **Evidence** | `supabase/02_rls.sql:61-63` — `CREATE POLICY "Auth_Insert_ActivityLogs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);` |
| **Impact** | Any authenticated user may insert a log row with **any** `user_id`. The client sets it (`lib/activityLog.js:11`: `user_id: auth.user?.id ?? null`) — a value the client controls and the database never verifies |
| **Aggravating factor** | `activity_logs` is not merely an audit trail — it is a **reporting input**. `RekapView.vue:95`, `RekapSemesterView.vue:82`, `StatistikView.vue:61`, and `DashboardView.vue:117` all read it to determine whether a class submitted attendance. Forged or misattributed rows therefore **corrupt attendance reporting**, not just the audit trail |
| **Migration action** | Tighten to `WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_id = <identity>))` or `user_id IS NULL`. This is best done in the new backend, where `user_id` can be set **server-side from the session** and not accepted from the client at all — the strongest available fix |

### SEC-06 — Teacher attendance access is not scoped to their own class

| | |
|---|---|
| **Severity** | 🟡 **MEDIUM** |
| **Evidence** | `supabase/02_rls.sql:88-92` — `Guru_Manage_Absensi` is `USING (get_my_role() IN ('Guru','Guru & Pustakawan'))` with **no class predicate** |
| **Impact** | Any `Guru` may read and write `attendance_logs` for **every** class in the school |
| **UI reality** | The UI restricts teachers to their assigned class (`InputPresensiView.vue:152` filters by `auth.kelas`; `docs/testing.md:55` asserts it). **The database does not** |
| **Contrast** | `docs/authentication.md:52` states RLS is the final enforcement layer — this is one place where it is weaker than the UI |
| **Migration action** | Decide deliberately. Adding `kelas = (SELECT kelas FROM public.users WHERE auth_id = <identity>)` is straightforward but changes behaviour and requires re-testing every attendance path. Doing it during migration is cheaper than doing it after |

### SEC-07 — `SECURITY DEFINER` functions do not pin `search_path`

| | |
|---|---|
| **Severity** | 🟡 **MEDIUM (latent today; material after migration)** |
| **Evidence** | `02_rls.sql:22-29` (FN-2), `06_final_snapshot.sql:39-73` (FN-3), `06_final_snapshot.sql:76-82` (FN-4) — all `SECURITY DEFINER`, **none** with `SET search_path` |
| **Why latent today** | On Supabase, all three are owned by the same managed role that owns the tables, and the connection pool never surfaces a superuser |
| **Why it becomes material** | Self-hosted, the owner is **whoever ran the DDL**. If that is the `postgres` superuser, FN-2 executes **as superuser** for every RLS check on every table. Without a pinned `search_path`, a lower-privileged role able to create objects can shadow unqualified references (the classic `pg_temp` attack) |
| **Migration action** | `CREATE FUNCTION … SECURITY DEFINER SET search_path = public, pg_temp`. Also reconsider whether FN-2 needs `SECURITY DEFINER` at all under the new identity mechanism ([RLS_MIGRATION § 2.1](./RLS_MIGRATION.md#21-what-role-switching-means-and-why-its-loss-matters-most)) |

### SEC-08 — `users.auth_id` has neither an index nor a uniqueness constraint

| | |
|---|---|
| **Severity** | 🟡 **MEDIUM** |
| **Evidence** | `06_final_snapshot.sql:33` adds the column with only an FK. `01_schema.sql:12-22` declares no index. `docs/database.md:26` describes it as *"UNIQUE-ish via trigger upsert"* — i.e. uniqueness is a convention, not a constraint |
| **Security impact** | Subtler than the other findings. `fetchProfile` (`auth.js:37`) uses `.single()`, which **errors** on multiple rows — so duplicates cause a visible failure, not a silent one. But `get_my_role()` (`02:27`) is `SELECT role … WHERE auth_id = auth.uid()` with **no `LIMIT`**, returning an **arbitrary** matching row. `[INFERRED]` Duplicate `auth_id` values would let the *wrong* role be applied — an authorization error, not merely a data-quality one |
| **Migration action** | Add `CREATE UNIQUE INDEX ON public.users (auth_id)` after validating for duplicates ([DATA_MIGRATION § 9.1](./DATA_MIGRATION_PLAN.md#91-validation-queries-read-only-not-executed)) |

### SEC-09 — The database is not currently exposed; keeping it that way is the operator's job

| | |
|---|---|
| **Severity** | 🔴 **HIGH (risk introduced by the migration itself)** |
| **Current state** | PostgreSQL is **not** reachable from the internet. Every browser request goes to PostgREST over HTTPS (`docs/architecture.md:9`) |
| **Risk introduced** | A self-hosted VPS makes port 5432 a candidate for exposure. A publicly reachable PostgreSQL with password authentication is scanned and attacked **continuously** |
| **Aggravating factor** | RLS does **not** protect a direct connection. Table owners bypass RLS unless `FORCE ROW LEVEL SECURITY` is set — and a direct `psql` session is exactly a table-owner session |
| **Migration action** | Bind PostgreSQL to `127.0.0.1` or a private interface only. Firewall 5432 to the app host. Prefer a private network (WireGuard/Tailscale) or a unix socket between the backend and the database. Never publish 5432. → [POSTGRES_ARCHITECTURE § 3.1](./POSTGRES_ARCHITECTURE.md#31-postgresql-network-exposure) |

### SEC-10 — `06_final_snapshot.sql` contains destructive statements

| | |
|---|---|
| **Severity** | 🔴 **HIGH (operational)** |
| **Evidence** | `06_final_snapshot.sql:23-27` — four `DELETE`s against `auth.identities`/`auth.users`, then `TRUNCATE TABLE public.users CASCADE` |
| **Risk** | The filename invites sequential execution after `05`. `docs/database.md:11` lists it in the run order — correct only for a clean bootstrap on a **new** project, where the `TRUNCATE` is a no-op |
| **Migration action** | Treat as **historical documentation**. Extract only FK-1's definition and the trigger logic. Never execute |

### Findings summary

| ID | Finding | Severity | Status | In scope for migration? |
|---|---|---|---|---|
| SEC-01 | Anon-writable storage bucket | 🔴 HIGH | Pre-existing, acknowledged | ✅ **Must not reproduce** |
| SEC-02 | All authenticated users read all `users` rows | 🟡 MEDIUM | Pre-existing | ✅ Decide |
| SEC-03 | Plaintext passwords readable by any authenticated user | 🔴 HIGH | Pre-existing | ✅ **Drop the column** |
| SEC-04 | Permissive `anon` policy may still exist on `library_visits` | 🔴 CRITICAL if live | ❗ Unknown | ✅ **Verify + exclude** |
| SEC-05 | Forgeable audit-log rows | 🟡 MEDIUM | Pre-existing | ✅ Fix in the backend |
| SEC-06 | Teacher access not class-scoped | 🟡 MEDIUM | Pre-existing | ✅ Decide |
| SEC-07 | `SECURITY DEFINER` without `search_path` | 🟡 MEDIUM | Latent | ✅ Pin |
| SEC-08 | `auth_id` not indexed or unique | 🟡 MEDIUM | Pre-existing | ✅ Fix |
| SEC-09 | Database exposure risk | 🔴 HIGH | **Introduced by migration** | ✅ Design |
| SEC-10 | Destructive snapshot script | 🔴 HIGH | Pre-existing | ✅ Do not run |

---

## 3. Least-privilege design

The brief asks specifically about separating database users. There is currently **one** role
concept — Supabase's managed roles — and no privileged application user at all.

### 3.1 Recommended role separation

| Role | Purpose | Privileges | Never does |
|---|---|---|---|
| `app_runtime` | The backend's normal connection | `SELECT/INSERT/UPDATE/DELETE` on the 11 tables; `EXECUTE` on `get_my_role()` | ❌ Own tables, ❌ DDL, ❌ `SUPERUSER`, ❌ `BYPASSRLS` |
| `app_migrator` | Schema changes, applied by a controlled process | DDL on `public`; ownership of new objects | ❌ Serves traffic |
| `app_readonly` | Reporting, debugging, analytics | `SELECT` only | ❌ Writes |
| `app_backup` | `pg_dump` | `SELECT` on all tables; replication for physical backups | ❌ Application access |
| `postgres` | Superuser | Everything | ❌ **Never used by the application or by migrations** |

`[INFERRED]` **Why the runtime role must not own the tables:** table owners bypass RLS. If
`app_runtime` owned the tables, every policy would be silently inert and the entire authorization
model would depend on the application's own checks — exactly the outcome
[RLS_MIGRATION § 2.1](./RLS_MIGRATION.md#21-what-role-switching-means-and-why-its-loss-matters-most)
identifies as option C.

### 3.2 What has to be created from nothing

| Item | Exists today? |
|---|---|
| Application role (non-owner) | ❌ No |
| Explicit `GRANT` statements | ❌ **None anywhere in `supabase/*.sql`** |
| Migration role | ❌ No |
| Backup role | ❌ No |
| Role for the backend to `SET LOCAL ROLE authenticated` into | ❌ No — the role does not exist |

`[INFERRED]` **The complete absence of `GRANT` statements is itself a finding.** Under Supabase,
PostgREST's setup issued table grants automatically. Self-hosted, they must be written by hand. An
omitted `GRANT` produces `permission denied`; an omitted policy produces an empty result set. Both
look like "the migration didn't work" and neither points at the cause.

---

## 4. Secrets and configuration

| Secret | Today | After | Rule |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Build-time, public | **Removed** | — |
| `VITE_SUPABASE_ANON_KEY` | Build-time, **public by design** | **Removed** | The anon-key concept disappears with PostgREST |
| `service_role` key | Absent; `SECURITY.md:30` forbids it in frontend env | n/a | Keep forbidden |
| **NEW** `DATABASE_URL` | — | **Server-side only** | 🔴 **Never** `VITE_*` — a `VITE_` prefix would publish the database address and credentials to every visitor |
| **NEW** JWT signing secret | — | Server-side only | Rotate on suspicion; store in a secret manager or root-readable env file |
| **NEW** storage access keys | — | Server-side only | Scope to the `assets` bucket |
| **NEW** TLS private key | — | Host filesystem | Restricted permissions; automated renewal |
| **NEW** backup encryption key | — | **Stored separately from the backups** | ⚠️ A key stored alongside its ciphertext protects nothing |

`[INFERRED]` ⚠️ **The `VITE_*` trap deserves emphasis.** The repository's entire secret convention
today is "a `.env` file with two non-secret values, exposed to the browser by design"
(`docs/deployment.md:33`). A developer migrating this application would naturally follow that
convention. Applying a `VITE_` prefix to a database connection string would publish the VPS
database's hostname, port, username, and password **to every visitor of the site** in a
content-hashed, CDN-cached JavaScript bundle.

**This is the single highest-consequence mistake available in this migration, and it follows a
pattern the repository has established.**

---

## 5. Brute force, rate limiting, and abuse

| Surface | Today | After |
|---|---|---|
| **Login** | Supabase Auth's platform rate limiting (`[UNKNOWN]` exact config) | 🔴 **REBUILD** — the backend must rate-limit and lock out. `SECURITY.md` advises enabling Supabase's rate limits; those disappear with GoTrue |
| **Anonymous storage write** | Open (SEC-01) | ✅ **Close it** — this eliminates the abuse surface entirely |
| **Anonymous table access** | Blocked — all policies are `TO authenticated` except RLS-24/SEC-04, which is fail-closed by default | 🟡 Keep fail-closed; verify |
| **Public API** | Only PostgREST, RLS-gated | 🔴 **REBUILD** — new endpoints are new attack surface |
| **`/login` flood** | Client has a 12 s timeout (`LoginView.vue`) but no rate limit | 🔴 Add server-side limiting |
| **Realtime channel** | One channel, RLS-filtered | 🔴 Any replacement must authorize subscriptions |

`[INFERRED]` The virtual-email design (`<username>@minblora.id` — `<username>@minblora.id`,
`auth.js:88`) has a security benefit worth preserving: there is **no self-service signup path** in
the application. `signUp` is called only from the admin-gated `GuruView` (`:203`). Account creation
is admin-mediated by construction. A replacement backend must preserve that — a public
registration endpoint would be a significant regression.

⚠️ Related operational risk: because the emails are virtual, **password reset by email is
impossible** (`docs/authentication.md:73`). Today, resetting a password means an admin deletes and
recreates the account. After migration this becomes a real backend feature that does not exist yet.

---

## 6. Verification checklist for stage S-10

Read-only where possible. Nothing here was executed.

| # | Check | Method | Pass criterion |
|---|---|---|---|
| 1 | Port 5432 not publicly reachable | `nmap` from an external host | filtered/closed |
| 2 | DB bound to loopback/private interface | `ss -tlnp` on the VPS | not `0.0.0.0:5432` |
| 3 | Firewall default-deny | `ufw status verbose` | deny incoming by default |
| 4 | Password auth disabled for SSH | `sshd -T \| grep passwordauth` | `no` |
| 5 | Root SSH disabled | `sshd -T \| grep permitrootlogin` | `no` |
| 6 | TLS on every browser-facing leg | `openssl s_client` / browser | valid chain, no expiry within 30 d |
| 7 | TLS on the DB leg | `sslmode=verify-full` in the connection string | connects; plaintext refused |
| 8 | Runtime role is not a table owner | `pg_class.relowner` vs. current role | owner differs |
| 9 | Runtime role is not `SUPERUSER` / `BYPASSRLS` | `\du` | neither |
| 10 | RLS enabled on all 11 tables | `SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r';` | all `true` |
| 11 | No `USING (true)` grant to `anon` | Enumerate `pg_policy` | none |
| 12 | No policy grants more than production did | Side-by-side dump comparison | new ⊆ old |
| 13 | Anonymous access returns zero rows | Session-less client, every table | 0 rows on all |
| 14 | Anonymous storage write rejected | Session-less upload attempt | 401/403 |
| 15 | Role parity, all 4 roles × 11 tables | Scripted matrix | identical allow/deny to production |
| 16 | Login rate-limited | Scripted repeated failures | lockout/throttle after N |
| 17 | No secrets in the built bundle | `grep -r` the `dist/` output for hostnames, keys, `postgres://` | no matches |
| 18 | No `password` column carried over | `\d public.users` | absent, or all `'***'` |
| 19 | `SECURITY DEFINER` functions pin `search_path` | `SELECT proname, proconfig FROM pg_proc` | `search_path` present |
| 20 | Backup encryption key not co-located | Inspect backup storage | key absent from that location |
| 21 | Restore test succeeds | Restore to a scratch instance | row counts match → [BACKUP_DR_PLAN.md](./BACKUP_DR_PLAN.md) |
| 22 | Error responses leak nothing | Trigger 401/403/500 | no stack traces, no SQL, no connection strings |

---

## 7. Summary

| Question | Answer |
|---|---|
| Controls Supabase provided | **16 identified** (§ 1) |
| Controls that must be rebuilt | **12** |
| Controls already implemented in the repo | **2** — and both target Supabase-managed objects |
| Does the repo contain any authentication security implementation? | ❌ **No.** No hashing, no session code, no token handling |
| Does the repo contain any `GRANT` statement? | ❌ **No** |
| Does the repo contain any rate limiting? | ❌ **No** |
| Highest-severity live-unknown | **SEC-04** — `allow_all_library_visits` may expose student PII publicly. Must be verified before cutover |
| Highest-consequence new risk | **SEC-09** — exposing PostgreSQL, and the `VITE_*` secret trap (§ 4) |
| Does migration improve or worsen security? | **Neutral by default; improvable.** It removes Supabase's managed controls but also removes the two permissive policies (SEC-01, SEC-04) if the findings are acted on. It introduces new surface: a public database port, new secrets, a new backend |
| What must happen first? | Resolve SEC-04's live state, drop the `password` column, and build the [TEST_PLAN.md](./TEST_PLAN.md) — none of these depend on the architecture decision |
