# RLS Migration

**Phase 4 — Row Level Security audit.**

> **DO NOT CHANGE RLS.** This document analyses only. No policy was modified, created, or dropped.

The core warning, stated up front:

> **Ordinary PostgreSQL does NOT automatically reproduce Supabase RLS behaviour.**
> `CREATE POLICY … TO authenticated USING (public.get_my_role() = 'Admin')` fails on a fresh
> PostgreSQL instance at three independent points: the role `authenticated` does not exist, the
> function `get_my_role()` cannot be created (it calls `auth.uid()`), and nothing sets the session
> identity that `auth.uid()` would have read. RLS *the feature* is PostgreSQL's. RLS *the security
> model in this application* is Supabase's.

---

## 1. Policy inventory

### 1.1 RLS enablement

All **11 of 11** application tables have RLS enabled — `02_rls.sql:9-19`. There is no table with
RLS off. `app_settings` and `academic_periods`, the two "global config" tables, are covered like
any other.

| RLS-xx | Table | Enabled at |
|---|---|---|
| RLS-01 | `users` | `02_rls.sql:9` |
| RLS-02 | `students` | `02:10` |
| RLS-03 | `attendance_logs` | `02:11` |
| RLS-04 | `academic_calendar` | `02:12` |
| RLS-05 | `academic_periods` | `02:13` |
| RLS-06 | `class_history` | `02:14` |
| RLS-07 | `app_settings` | `02:15` |
| RLS-08 | `activity_logs` | `02:16` |
| RLS-09 | `books` | `02:17` |
| RLS-10 | `book_loans` | `02:18` |
| RLS-11 | `library_visits` | `02:19` |

### 1.2 The helper function

```sql
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER
AS $$ SELECT role FROM public.users WHERE auth_id = auth.uid(); $$;
```
— `supabase/02_rls.sql:22-29`

| Property | Value | Migration significance |
|---|---|---|
| Language | `sql` (inlinable) | Portable in form |
| Security | **`SECURITY DEFINER`** | Necessary to bypass RLS on `users` and avoid infinite recursion (`02:21`) |
| Body | `users.role WHERE auth_id = auth.uid()` | **Two Supabase dependencies**: `auth.uid()`, and `auth_id` pointing at `auth.users` |
| Returns | `text`, single-valued | Any change to the role model changes this signature |
| Index support | Relies on an index on `users.auth_id` | ⚠️ **No such index is declared** — see § 6 |

### 1.3 Complete policy table

| ID | Table | Operation | Policy name | `TO` role | `USING` | `WITH CHECK` | File |
|---|---|---|---|---|---|---|---|
| RLS-12 | `students` | SELECT | `Authenticated_Select` | `authenticated` | `true` | — | `02:53` |
| RLS-13 | `academic_calendar` | SELECT | `Authenticated_Select` | `authenticated` | `true` | — | `02:54` |
| RLS-14 | `academic_periods` | SELECT | `Authenticated_Select` | `authenticated` | `true` | — | `02:55` |
| RLS-15 | `app_settings` | SELECT | `Authenticated_Select` | `authenticated` | `true` | — | `02:56` |
| RLS-16 | `books` | SELECT | `Authenticated_Select` | `authenticated` | `true` | — | `02:57` |
| RLS-17 | `users` | SELECT | `Authenticated_Select` | `authenticated` | `true` | — | `02:58` |
| RLS-18 | `activity_logs` | INSERT | `Auth_Insert_ActivityLogs` | `authenticated` | — | `true` | `02:61-63` |
| RLS-19 | all 11 tables | ALL | `Admin_All_<table>` ×11 | `authenticated` | `get_my_role() = 'Admin'` | `get_my_role() = 'Admin'` | `02:76-84` |
| RLS-20 | `attendance_logs` | ALL | `Guru_Manage_Absensi` | `authenticated` | `get_my_role() IN ('Guru','Guru & Pustakawan')` | *(inherited from USING)* | `02:88-92` |
| RLS-21 | `books` | ALL | `Perpus_Manage_Buku` | `authenticated` | `get_my_role() IN ('Pustakawan','Guru & Pustakawan')` | *(inherited)* | `02:95-99` |
| RLS-22 | `book_loans` | ALL | `Perpus_Manage_Loans` | `authenticated` | idem | *(inherited)* | `02:102-105` |
| RLS-23 | `library_visits` | ALL | `Perpus_Manage_Visits` | `authenticated` | idem | *(inherited)* | `02:108-111` |
| RLS-24 | `library_visits` | ALL | **`allow_all_library_visits`** | **`anon`, `authenticated`** | `true` | `true` | **`05:19-21`** |
| RLS-25 | `storage.objects` | SELECT | `assets_public_read` | `public` | `bucket_id = 'assets'` | — | `03:12-15` |
| RLS-26 | `storage.objects` | INSERT | `assets_anon_write` | `anon`, `authenticated` | — | `bucket_id = 'assets'` | `03:17-20` |
| RLS-27 | `storage.objects` | UPDATE | `assets_anon_update` | `anon`, `authenticated` | `bucket_id = 'assets'` | `bucket_id = 'assets'` | `03:22-26` |
| RLS-28 | `storage.objects` | DELETE | `assets_anon_delete` | `anon`, `authenticated` | `bucket_id = 'assets'` | — | `03:28-31` |

**Policy count:** 11 (`Admin_All_*`) + 6 (`Authenticated_Select`) + 1 (`Auth_Insert_ActivityLogs`)
+ 4 (role write policies) + 1 (legacy) = **23 policies on application tables**, plus 4 on
`storage.objects`.

`[INFERRED]` `FOR ALL` policies that omit `WITH CHECK` (RLS-20…23) use the `USING` expression as
the `WITH CHECK` expression. So `Guru_Manage_Absensi` does constrain writes, not just reads. This
is correct Postgres behaviour and ports unchanged.

### 1.4 The policy-drop trap

`02_rls.sql:38-49` runs a `DO` block that drops six policy names from every table before recreating
them:

```
allow_all_%table%   Select_All   Admin_All   Admin_All_%table%   Guru_Read   Authenticated_Select
```

`[INFERRED]` This pattern is **idempotence-by-deletion**, and it is a migration hazard if copied
forward: it drops `Authenticated_Select` on all 11 tables and then recreates it on only **6** —
leaving `attendance_logs`, `class_history`, `activity_logs`, `book_loans`, and `library_visits`
with **no `SELECT` policy for a plain authenticated user**. That is intentional (those tables are
read through the `Admin_All_*` / role policies), but the net effect depends on every statement in
the file having run. Partial execution — a plausible outcome of manual SQL-Editor pasting — yields
a different security posture than the file describes.

---

## 2. Supabase behaviours that RLS here depends on

This is the heart of Phase 4. Each row is a Supabase-supplied behaviour with **no automatic
PostgreSQL equivalent**.

| # | Supabase supplies | Where used | What PostgreSQL alone does |
|---|---|---|---|
| RLS-DEP-01 | **Role `authenticated`** exists and is granted to logged-in requests | Every policy, `02` throughout | ❌ Role does not exist. `CREATE POLICY … TO authenticated` **errors**: `role "authenticated" does not exist` |
| RLS-DEP-02 | **Role `anon`** exists for unauthenticated requests | `03:18-31`, `05:20` | ❌ Does not exist |
| RLS-DEP-03 | **Role `public`** semantics as used in `03:14` | `03:14` | ✅ `public` is a real Postgres pseudo-role — the one policy that ports as written |
| RLS-DEP-04 | **`auth.uid()`** returns the calling user's UUID | `02:27` | ❌ Function does not exist. `get_my_role()` cannot be created |
| RLS-DEP-05 | **PostgREST role switching** — the JWT's `role` claim selects the DB role per request | Implicit in every policy | ❌ Nothing sets the role. A connection is whatever role it authenticated as |
| RLS-DEP-06 | **`auth.users`** as the identity source | `02:27` (via `auth_id`), `06:24` | ❌ Schema does not exist |
| RLS-DEP-07 | **RLS applied to Realtime `postgres_changes`** payloads | `DashboardView.vue:301` | ❌ No Realtime, therefore no payload filtering. A replacement must add it |
| RLS-DEP-08 | **RLS applied to PostgREST reads *and* writes** automatically | All 102 query sites | ⚠️ RLS applies, but only if the session identity is set. Otherwise policies see no role and deny |
| RLS-DEP-09 | **`service_role` bypass** for admin/server operations | *Not used in this repo* — `SECURITY.md:30` forbids the key in frontend env | ✅ Nothing to replace; the repo never had it |
| RLS-DEP-10 | **Storage RLS** on `storage.objects` | `03:12-31` | ❌ Table does not exist |
| RLS-DEP-11 | `storage.buckets` row as bucket definition | `03:7-9` | ❌ Table does not exist |

### 2.1 What "role switching" means, and why its loss matters most

`[INFERRED]` In Supabase, one database connection pool serves all requests. PostgREST inspects the
JWT on each request, and issues `SET LOCAL ROLE authenticated` (or `anon`) for the duration of that
request's transaction. Every policy's `TO authenticated` clause is matched against that per-request
role.

If a replacement backend connects to PostgreSQL as a single fixed role — the usual shape, e.g.
`app_user` — then:

- no policy is `TO app_user`, so `USING` never matches;
- **RLS denies every row**;
- every query returns empty sets or errors, in production, immediately.

This is a *fail-closed* outcome, which is preferable to a leak — but it means RLS cannot be left
enabled with the existing policies and simply "work". There are exactly three ways out, and the
choice is an architecture decision, not a detail:

| Approach | How it works | Trade-off |
|---|---|---|
| **A. Rebuild role switching** | Backend issues `SET LOCAL ROLE authenticated` per request, after resolving identity itself | Policies port nearly verbatim; requires careful connection-pool discipline (`SET LOCAL` is transaction-scoped) |
| **B. Port policies to session variables** | `get_my_role()` reads `current_setting('app.user_id')` instead of `auth.uid()`; policies drop the `TO` clause (or target a real app role) | Minimal policy edits; **the backend now owns identity injection**, and a bug there is a privilege escalation |
| **C. Enforce authorization in the backend; run the DB as owner** | Policies removed or left inert; backend checks roles per endpoint | Simplest DB; **moves all security into application code**, which the current design deliberately avoids (`docs/authentication.md:52`) |

`[INFERRED]` The repository's own stated principle argues against C: *"penegakan final ada di RLS
database, bukan di UI"* (`docs/authentication.md:52`). Option A is the smallest semantic change;
option B is the smallest code change. This document does not choose — see
[POSTGRES_ARCHITECTURE.md](./POSTGRES_ARCHITECTURE.md).

---

## 3. Per-table analysis

For each table: what is permitted, by whom, and what the equivalent must preserve.

### RLS-01 `users`

| Operation | Policy | Who | Predicate |
|---|---|---|---|
| SELECT | `Authenticated_Select` `02:58` | any authenticated | `true` |
| INSERT / UPDATE / DELETE | `Admin_All_users` `02:76-84` | `role = 'Admin'` | `get_my_role() = 'Admin'` |

**Ownership logic: none.** Any authenticated user may read **every** `users` row. The application
narrows this at the query level (`GuruView.vue:153` selects specific columns), but RLS does not
enforce column restriction.

⚠️ **The `users` table contains a `password` column** (`01_schema.sql:15`) that is readable under
RLS-17. See [SECURITY_REVIEW.md](./SECURITY_REVIEW.md#sec-03--legacy-plaintext-passwords-readable-by-any-authenticated-user).

**Institution/school isolation: absent.** There is no tenant column anywhere in the schema and no
policy filters by school. The system is single-school by design. `[INFERRED]` The
multi-school scenario in [VPS_REQUIREMENTS.md](./VPS_REQUIREMENTS.md) would require adding tenant
scoping that does not exist today — a **feature**, not a migration.

### RLS-02 `students`

| Operation | Policy | Who |
|---|---|---|
| SELECT | `Authenticated_Select` `02:53` | any authenticated |
| INSERT / UPDATE / DELETE | `Admin_All_students` | `role = 'Admin'` |

**Ownership logic: none.** No student can log in — there is no student identity. Matches
`docs/authentication.md:14` (roles are Admin, Guru, Pustakawan, and the composite).

### RLS-03 `attendance_logs`

| Operation | Policy | Who | Predicate |
|---|---|---|---|
| ALL | `Guru_Manage_Absensi` `02:88-92` | `Guru`, `Guru & Pustakawan` | `true` (no class restriction) |
| ALL | `Admin_All_attendance_logs` | `Admin` | — |
| SELECT | *(none for other roles)* | — | — |

⚠️ **`Guru_Manage_Absensi` has no class scoping.** Any teacher may read and write attendance for
**every** class, not only their own. `[INFERRED]` The UI restricts a teacher to their assigned
class (`InputPresensiView.vue:152` filters by `auth.kelas`; `docs/testing.md:55`); the database
does not. Deploying this unchanged to a VPS reproduces the gap but does not create it — however, a
migration is the natural moment to decide whether to add `kelas = (SELECT kelas FROM users WHERE
auth_id = auth.uid())`, because doing so later means re-testing every attendance query.

### RLS-04 `academic_calendar`

| Operation | Policy | Who |
|---|---|---|
| SELECT | `Authenticated_Select` `02:54` | any authenticated |
| INSERT / UPDATE / DELETE | `Admin_All_academic_calendar` | `Admin` only |

**Matches the UI exactly.** `docs/authentication.md:73` notes: *"Guru hanya melihat kalender"* —
teachers may read, not write, and `KalenderView` gates the controls at the view level. This is one
of the cleanest UI↔RLS agreements in the system.

### RLS-05 `academic_periods`

| Operation | Policy | Who |
|---|---|---|
| SELECT | `Authenticated_Select` `02:55` | any authenticated |
| INSERT / UPDATE / DELETE | `Admin_All_academic_periods` | `Admin` |

Combined with unique index U-6 (`01:81-83`), at most one row can have `is_active = true`.
`[INFERRED]` The partial index is a **data constraint enforced outside RLS**, so it holds
regardless of who writes. It must be recreated in the migration or the singleton invariant is lost.

### RLS-06 `class_history`

| Operation | Policy | Who |
|---|---|---|
| **SELECT** | **`Authenticated_Select`? No** — see note | — |
| INSERT / UPDATE / DELETE | `Admin_All_class_history` | `Admin` |

⚠️ `[INFERRED]` **`class_history` has no SELECT policy for non-admins.** `02:53-58` grants
`Authenticated_Select` to `students`, `academic_calendar`, `academic_periods`, `app_settings`,
`books`, and `users` — **`class_history` is not in that list**. The drop-trap at `02:38-49` removes
any `Select_All`/`Guru_Read`/`Authenticated_Select` that might have existed.

Consequence: `RiwayatKelasView.vue:48` reads `class_history`, and the route is `adminOnly`
(`router/index.js:81-85`). So non-admins are blocked at the guard *and* at RLS — consistent. **But**
`PengaturanView.vue:234` upserts into it, also admin-gated. So the current behaviour is coherent;
this is simply noted as a table whose access is entirely admin-mediated and which therefore must be
covered by the admin-path tests in [TEST_PLAN.md](./TEST_PLAN.md).

### RLS-07 `app_settings`

| Operation | Policy | Who |
|---|---|---|
| SELECT | `Authenticated_Select` `02:56` | any authenticated |
| INSERT / UPDATE / DELETE | `Admin_All_app_settings` | `Admin` |

Read is essential — `App.vue`, `AppLayout.vue`, and every PDF generator depend on the settings
store (`stores/settings.js:14-19`). `[INFERRED]` A regression here is high-visibility: the school
name, letterhead, and logo appear on every report.

### RLS-08 `activity_logs`

| Operation | Policy | Who | Predicate |
|---|---|---|---|
| INSERT | `Auth_Insert_ActivityLogs` `02:61-63` | any authenticated | `WITH CHECK (true)` |
| ALL | `Admin_All_activity_logs` | `Admin` | — |
| SELECT | *(none for non-admin)* | — | — |

⚠️ **`WITH CHECK (true)` means any authenticated user may insert a log row with an arbitrary
`user_id`.** `lib/activityLog.js:11` sets `user_id: auth.user?.id ?? null` client-side — a value
the client controls and the database does not verify. A malicious or buggy client can attribute an
audit entry to another user, or write `null`.

`[INFERRED]` The tighter predicate would be
`WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))`, or `user_id IS NULL`.
Because `activity_logs` is also a **reporting input** (see
[DATABASE_INVENTORY.md § 4.3](./DATABASE_INVENTORY.md#43-activity_logsrecord_id-is-a-string-encoded-composite-used-as-a-query-key)),
forged rows affect attendance reports, not just audit integrity.

### RLS-09 `books`

| Operation | Policy | Who |
|---|---|---|
| SELECT | `Authenticated_Select` `02:57` | any authenticated |
| ALL | `Perpus_Manage_Buku` `02:95-99` | `Pustakawan`, `Guru & Pustakawan` |
| ALL | `Admin_All_books` | `Admin` |

### RLS-10 `book_loans`

| Operation | Policy | Who |
|---|---|---|
| ALL | `Perpus_Manage_Loans` `02:102-105` | `Pustakawan`, `Guru & Pustakawan` |
| ALL | `Admin_All_book_loans` | `Admin` |
| SELECT | *(none for Guru)* | — |

⚠️ `[INFERRED]` A plain `Guru` cannot read `book_loans` at all. Consistent with the UI — library
routes are `perpusOnly` (`router/index.js:109-134`) — but it means the library reporting views are
unavailable to teachers by design, and any migration must preserve the split.

### RLS-11 `library_visits`

| Operation | Policy | Who | Predicate |
|---|---|---|---|
| ALL | `Perpus_Manage_Visits` `02:108-111` | `Pustakawan`, `Guru & Pustakawan` | role check |
| ALL | `Admin_All_library_visits` | `Admin` | role check |
| **ALL** | **`allow_all_library_visits` `05:19-21`** | **`anon` + `authenticated`** | **`true`** |

⚠️ **This is the most serious RLS finding.** Because policies are additive (OR-ed), the presence of
RLS-24 makes RLS-11, RLS-23, and the admin policy **irrelevant** — RLS-24 alone permits every
operation for every caller, including unauthenticated ones holding the public anon key.

**Status: `UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION`.** The repository's own documentation
asserts the policy should not be present (`docs/database.md:19`, `supabase/README.md`), but
`05_library_visits.sql` is a tracked, executable file whose only policy-related purpose is to
create it. Whether it was subsequently dropped is not recorded anywhere.

Verify with:

```sql
SELECT polname,
       polroles::regrole[],
       pg_get_expr(polqual, polrelid)       AS using_expr,
       pg_get_expr(polwithcheck, polrelid)  AS check_expr
FROM   pg_policy
WHERE  polrelid = 'public.library_visits'::regclass;
```

**Migration action regardless of live state:** RLS-24 must **not** be reproduced in the new
environment. Record the live state before cutover so the new environment can be *proven* no more
permissive than the old.

### `storage.objects` — RLS-25 … RLS-28

Analysed in [STORAGE_MIGRATION.md](./STORAGE_MIGRATION.md). Summary: read is public, and
**insert/update/delete are open to `anon`**. Anyone with the anon key — which is published in the
frontend bundle by design (`SECURITY.md:25`) — can overwrite or delete the school logo.

---

## 4. What happens to each Supabase control after leaving Supabase

Direct answer to the brief's question.

| Control | Today | After leaving Supabase | Verdict |
|---|---|---|---|
| **`auth.uid()`** | Returns the caller's UUID, resolved from the JWT by PostgREST | ❌ Function gone. Every `get_my_role()` call errors | **Must be replaced** — § 2, option A/B/C |
| **`auth.jwt()`** | Available; would return the full claim set | ❌ Gone | **Nothing to replace — used 0 times** `[REPO]` |
| **`auth.role()`** | Available; returns the JWT role claim | ❌ Gone | **Nothing to replace — used 0 times** `[REPO]` |
| **Supabase claims** (`user_metadata`, `app_metadata`) | Available on the session object | ❌ Gone | **Nothing to replace — read 0 times** `[REPO]`; metadata is consumed once, at signup, by FN-3 |
| **`auth.users`** | The credential store and FK target | ❌ Gone | **Must be replaced**; FK-1 and TG-3/TG-4 must be dropped and reimplemented |
| **PostgREST role switching** | Sets `authenticated`/`anon` per request | ❌ Gone | **Must be replaced** — the single most consequential loss (§ 2.1) |
| **`SECURITY DEFINER` functions** | FN-2, FN-3, FN-4 run as their owner, bypassing RLS | ⚠️ **Still available** — this is plain PostgreSQL | **But the owner changes.** On Supabase the owner was a managed role; self-hosted, it is whoever ran the DDL. New escalation surface; needs `search_path` pinning |
| **RLS itself** | Enforced | ✅ **Still available** — plain PostgreSQL | **Ports**, but only *after* roles, identity, and policies are re-supplied |
| **`service_role` bypass** | Existed but **never used by this repo** | n/a | No replacement needed; `SECURITY.md:30` forbids it in frontend env |

### 4.1 The "SECURITY DEFINER becomes dangerous" nuance

`[INFERRED]` On Supabase, all three `SECURITY DEFINER` functions are owned by the same managed
role that owns every table, and the connection pool never surfaces a superuser. The risk is latent
and uniform.

On a self-hosted VPS the shape changes:

- Whoever runs `01_schema.sql` / `02_rls.sql` becomes the owner. If that is the `postgres`
  superuser, then FN-2 executes **as superuser** for every RLS check on every table.
- `SECURITY DEFINER` functions without `SET search_path` are vulnerable to `search_path` hijacking
  (the classic `pg_temp` attack) when a lower-privileged role can create objects.
- Mitigation, standard practice for years: `CREATE FUNCTION … SECURITY DEFINER SET search_path = public, pg_temp`.

`[REPO]` **None of FN-2, FN-3, FN-4 pins `search_path`.** This is a pre-existing latent issue that
becomes material on a self-hosted instance with multiple roles. Flagged in
[SECURITY_REVIEW.md](./SECURITY_REVIEW.md).

---

## 5. Self-host equivalent — per policy

Phase 4's required output table.

| Table | Operation | Current policy | Depends on | Self-host equivalent |
|---|---|---|---|---|
| `users` | SELECT | `Authenticated_Select` `02:58` — `true` | role `authenticated` | Recreate `authenticated` role **or** re-target. Consider narrowing to a column grant |
| `users` | ALL | `Admin_All_users` | `get_my_role()`, `auth.uid()`, role `authenticated` | Same predicate with the new identity accessor |
| `students` | SELECT | `Authenticated_Select` `02:53` | role `authenticated` | Port after role exists |
| `students` | ALL | `Admin_All_students` | `get_my_role()` | idem |
| `attendance_logs` | ALL | `Guru_Manage_Absensi` `02:88` | `get_my_role()`; **no class predicate** | Port verbatim, **or** add class scoping as a deliberate improvement (§ 3, RLS-03) |
| `attendance_logs` | ALL | `Admin_All_attendance_logs` | `get_my_role()` | idem |
| `academic_calendar` | SELECT | `Authenticated_Select` `02:54` | role | Port |
| `academic_calendar` | ALL | `Admin_All_…` | `get_my_role()` | Port |
| `academic_periods` | SELECT | `Authenticated_Select` `02:55` | role | Port |
| `academic_periods` | ALL | `Admin_All_…` | `get_my_role()` | Port; pair with U-6 partial index |
| `class_history` | ALL | `Admin_All_…` only | `get_my_role()` | Port; **no non-admin SELECT exists today — do not add one accidentally** |
| `app_settings` | SELECT | `Authenticated_Select` `02:56` | role | Port |
| `app_settings` | ALL | `Admin_All_…` | `get_my_role()` | Port |
| `activity_logs` | INSERT | `Auth_Insert_ActivityLogs` `02:61` | role; **`WITH CHECK (true)`** | Port, **or tighten `user_id`** (§ 3, RLS-08) |
| `activity_logs` | ALL | `Admin_All_…` | `get_my_role()` | Port |
| `books` | SELECT | `Authenticated_Select` `02:57` | role | Port |
| `books` | ALL | `Perpus_Manage_Buku` `02:95` | `get_my_role()` | Port |
| `book_loans` | ALL | `Perpus_Manage_Loans` `02:102` | `get_my_role()` | Port |
| `library_visits` | ALL | `Perpus_Manage_Visits` `02:108` | `get_my_role()` | Port |
| `library_visits` | ALL | `allow_all_library_visits` `05:19` | role `anon` | ❌ **DO NOT PORT** — remove; verify live state first |
| `storage.objects` | ×4 | `03:12-31` | `storage` schema, roles | ❌ **No equivalent** — see [STORAGE_MIGRATION.md](./STORAGE_MIGRATION.md) |

---

## 6. Cross-cutting RLS observations with consequences for migration

| # | Observation | Evidence | Consequence |
|---|---|---|---|
| RLS-OB-1 | **No index on `users.auth_id`** | `01_schema.sql:12-22` declares no index; `06:24` adds the column without one | `get_my_role()` runs `WHERE auth_id = auth.uid()`. Under PostgREST role switching this executes **on every policy evaluation of every row**. Without an index it is a sequential scan of `users` each time. `docs/database.md:26` even describes `auth_id` as *"UNIQUE-ish via trigger upsert"* — i.e. uniqueness is not enforced either. **Add both an index and a UNIQUE constraint.** |
| RLS-OB-2 | **`auth_id` uniqueness is not enforced** | `06:24` adds the column with only an FK; no UNIQUE | Duplicate `auth_id` values would make `get_my_role()` return an arbitrary one of several roles, and `fetchProfile` (`auth.js:37`) uses `.single()` — which **errors** on multiple rows. Silent if rare, loud if hit |
| RLS-OB-3 | **No `auth_id`-based ownership anywhere except `get_my_role()`** | grep for `auth.uid()` → only `02:27` | The identity link is singular, which is good for migration |
| RLS-OB-4 | **No tenant/school column in any table** | all of `01_schema.sql` | Multi-school is a new feature, not a config change |
| RLS-OB-5 | **All policies are `TO authenticated`** | `02` throughout | Nothing targets `anon`, so an unauthenticated caller gets **zero rows** — fail-closed. The sole exception is RLS-24 (`allow_all_library_visits`) and the storage write policies |
| RLS-OB-6 | **UI gates and RLS gates agree except for `Guru_Manage_Absensi`** | `docs/authentication.md:52` claims RLS is the final enforcement; `02:92` places no class restriction | The UI is *stricter* than the database for teacher class scoping. Migration preserves the discrepancy unless deliberately changed |
| RLS-OB-7 | **`activity_logs` insert is the only non-admin write path for `Guru`** | `02:61-63` | Every teacher action writes here. If the replacement's identity injection is wrong, teacher actions still succeed but their logs vanish (the insert is `.catch`-swallowed at `activityLog.js:17-19`) — a silent audit-trail loss |

---

## 7. RLS migration checklist

Ordered. Nothing here was executed.

1. **Verify the live RLS state.** Enumerate `pg_policy`, `pg_policies`, and `pg_class.relrowsecurity`
   for all 11 tables. Resolve the `allow_all_library_visits` question. → *prerequisite*
2. **Decide the identity mechanism** (§ 2.1, options A/B/C). This decision precedes all policy work.
3. **Create the roles** that policies target (`authenticated`), or rewrite the `TO` clauses.
4. **Rewrite `get_my_role()`** for the chosen identity accessor. Move it out of a
   `SECURITY DEFINER` superuser-owned function, or pin `search_path`.
5. **Add an index and a UNIQUE constraint on `users.auth_id`** (RLS-OB-1, RLS-OB-2).
6. **Recreate every policy**, using § 5's table as the target list — explicitly excluding RLS-24.
7. **Prove the anon path is closed.** With no session, every table must return zero rows.
8. **Prove role parity.** For each of the 4 roles × 11 tables × 4 operations, assert the same
   allow/deny outcome as production. → [TEST_PLAN.md](./TEST_PLAN.md) test IDs T-RLS-*
9. **Re-verify after any policy change that policies are not additive in a harmful way.** Run the
   additive-policy check: list all policies per table and confirm no `USING (true)` grant exists
   for a role that should not have one.
10. **Record the comparison.** The evidence that the new environment is no more permissive than
    the old is the deliverable of stage S-10.
