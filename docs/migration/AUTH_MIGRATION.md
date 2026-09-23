# Authentication Migration

**Phase 5 — authentication audit.**

The single most important thing this document establishes:

> **PostgreSQL is a database. It is not an authentication system.**
> Supabase Auth (GoTrue) is a separate service that happens to share a connection pool with the
> database. Moving to a PostgreSQL VPS removes the database; it does not supply an auth system.
> Auth is therefore a **rebuild**, not a migration.

---

## 1. Is Supabase Auth currently mandatory?

**Yes — entirely and without fallback.** `[REPO]`

| Evidence | Detail |
|---|---|
| `src/lib/supabase.js:12` | A single client with `auth: { persistSession: true, autoRefreshToken: true }` — auth is configured at client construction, not optional |
| `src/stores/auth.js:90` | Login **is** `supabase.auth.signInWithPassword()`. There is no second path |
| `src/stores/auth.js:71` | Session bootstrap **is** `supabase.auth.getSession()` |
| `src/stores/auth.js:58` | Session continuity **is** `supabase.auth.onAuthStateChange()` |
| `src/stores/auth.js:107` | Logout **is** `supabase.auth.signOut()` |
| `src/router/index.js:143` | Every authenticated route's guard reads the store, which is populated only from Supabase Auth |
| `src/views/GuruView.vue:202` | Account creation **is** `signInWithPassword`'s sibling, `auth.signUp()` |
| `supabase/06_final_snapshot.sql:39-86` | Profile provisioning **is** database triggers on `auth.users` |

`docs/authentication.md:3` states it plainly: *"Seluruh autentikasi memakai Supabase Auth (JWT).
Tidak ada sistem session buatan sendiri."* — "All authentication uses Supabase Auth (JWT). There is
no home-grown session system."

`[INFERRED]` **There is no credential-verification code in this repository at all.** No bcrypt, no
argon2, no hashing, no token signing, no `crypto.subtle` usage for passwords, no session store.
The `public.users.password` column is legacy and unused for login
(`SECURITY.md:38`: *"Kolom `password` lama di `public.users` tidak dipakai untuk login"*).

---

## 2. Which tables depend on `auth.users`?

Exactly **one** table has a foreign key into the Supabase-managed `auth` schema.

| ID | Dependency | File | Direction | Behaviour |
|---|---|---|---|---|
| AU-01 | FK `public.users.auth_id → auth.users(id) ON DELETE CASCADE` | `06_final_snapshot.sql:33` | profile → credential | Deleting an auth user deletes the profile |
| AU-02 | Trigger `on_auth_user_created` (AFTER INSERT ON `auth.users`) | `06_final_snapshot.sql:75-77` | credential → profile | Creating an auth user creates a profile |
| AU-03 | Trigger `on_auth_user_deleted` (AFTER DELETE ON `auth.users`) | `06_final_snapshot.sql:84-86` | credential → profile | Deleting an auth user deletes the profile (redundant with AU-01) |
| AU-04 | FN-3 reads `NEW.email`, `NEW.raw_user_meta_data` | `06_final_snapshot.sql:42-46` | credential → profile | Derives `username` from the email local-part; reads `nama`, `role`, `kelas`, `nip` |
| AU-05 | FN-4 deletes `public.users WHERE auth_id = OLD.id` | `06_final_snapshot.sql:79` | credential → profile | Manual counterpart to AU-01 |
| AU-06 | `auth.identities` — referenced by the destructive cleanup | `06_final_snapshot.sql:23, 25` | — | Evidence of an earlier custom auth scheme (see § 8) |
| AU-07 | `public.activity_logs.user_id → public.users(id)` | `01_schema.sql:125` | profile → log | Indirect: breaks if `users` cannot be populated |

**Answer to "is `auth.users` referenced by foreign keys?" — Yes, once (AU-01).** No other table
references `auth.*`.

`[INFERRED]` The blast radius of removing `auth.users` is therefore **structurally narrow** (one
FK, two triggers, one table) but **functionally total** (that one table is the authorization source
for every RLS policy in the database).

---

## 3. Which code assumes Supabase Auth?

Six call sites across two files. Complete list — there are no others.

| # | File:line | Call | Assumption encoded |
|---|---|---|---|
| AU-08 | `src/stores/auth.js:90-93` | `signInWithPassword({ email, password })` | Credentials are exchanged for a session server-side; the client never sees a password hash |
| AU-09 | `src/stores/auth.js:107` | `signOut()` | A global sign-out exists that revokes the session |
| AU-10 | `src/stores/auth.js:58` | `onAuthStateChange((event, session) => …)` | Auth state changes are observable, and the event stream emits `INITIAL_SESSION` and `TOKEN_REFRESHED` (the comment at `:63-66` depends on this) |
| AU-11 | `src/stores/auth.js:71` | `getSession()` | A session can be read locally without a network round-trip, and is refreshed automatically |
| AU-12 | `src/views/LoginView.vue:117` | `signOut({ scope: 'local' })` | Sign-out can be scoped to *this device only* |
| AU-13 | `src/views/LoginView.vue:137` | `supabase.auth.storageKey` | The session blob lives in `localStorage` under a key the library names |

Plus two **client-construction** assumptions:

| # | File:line | Assumption |
|---|---|---|
| AU-14 | `src/lib/supabase.js` | The primary client owns the persisted session |
| AU-15 | `src/views/GuruView.vue:18-21` | A **second** client with `persistSession: false, autoRefreshToken: false` can call `signUp()` without disturbing the primary client's session |

AU-15 is a genuine architectural constraint, not a convenience: GoTrue's `signUp` establishes a
session for the newly created user. Without the secondary client, an admin creating a teacher
account would be logged out and replaced by the new account. **Any replacement auth must provide
an equivalent "create user without becoming that user" capability**, or the admin account-creation
flow breaks in a way that is both confusing and a potential privilege escalation.

---

## 4. Which JWT claims are used?

**None directly.** `[REPO]`

| Claim accessor | Occurrences in `src/` |
|---|---|
| `auth.jwt()` | **0** |
| `auth.role()` | **0** |
| `session.user.user_metadata` | **0** |
| `session.user.app_metadata` | **0** |
| `.getClaims()` | **0** |
| Any manual JWT decode | **0** |

The application **never inspects a token**. It obtains `session.user.id` only:

- `src/stores/auth.js:62` — `user.value?.auth_id !== session.user.id`
- `src/stores/auth.js:78` — `user.value?.auth_id === session.user.id`
- `src/stores/auth.js:101` — `await fetchProfile(data.user.id)`

and then resolves everything else from `public.users` via a normal PostgREST query
(`src/stores/auth.js:37`).

`[INFERRED]` **This is a significant simplification for migration.** The authorization decision
does not depend on claims parsing, token structure, or signing algorithm. It depends on one thing:
*"given the current identity, what row is `SELECT * FROM users WHERE auth_id = $1`?"* Any
replacement that can answer that question — a session cookie, an opaque token, a signed JWT — works
without changing a single RLS predicate or Pinia getter.

`[INFERRED]` The one indirect claim dependency is structural: PostgREST maps the JWT's role claim
to the database roles `anon` (no token) and `authenticated` (valid token). Every RLS policy is
written `TO authenticated` (`02_rls.sql:53-58, 76-84, 88-111`). If the replacement data path does
not connect to PostgreSQL *as* a role named `authenticated`, those policies stop applying — and
since RLS with no applicable policy **denies everything**, the failure mode is a hard error rather
than a silent leak. That is the safer of the two failure modes, but it is still an outage.

---

## 5. Which role information is derived from auth metadata?

Two mechanisms run in parallel. Both matter.

### 5.1 Claim/metadata path — write-time only

| Step | Location | What carries the role |
|---|---|---|
| Admin creates account | `GuruView.vue:202-207` | `options.data: { role: form.value.role, … }` |
| GoTrue stores metadata | `auth.users.raw_user_meta_data` | *(Supabase-side)* |
| Trigger provisions profile | `06_final_snapshot.sql:44` | `v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'Guru')` |
| Profile row written | `06_final_snapshot.sql:51-59` | `INSERT INTO public.users (… role …)` |

`[INFERRED]` Metadata is used **once, at account creation**. It is never re-read. The `'Guru'`
default at `:44` means an account created without a role silently becomes a teacher.

### 5.2 Table path — read-time, authoritative

| Step | Location | What carries the role |
|---|---|---|
| Login resolves the profile | `stores/auth.js:37` | `SELECT * FROM users WHERE auth_id = $1` |
| Store exposes role getters | `stores/auth.js:29-33` | `isAdmin`, `isGuru`, `isPustakawan`, `canManagePerpus`, `canManagePresensi` |
| Router enforces | `router/index.js:145-158` | `adminOnly`, `perpusOnly`, `presensiOnly` |
| Navigation filters | `config/navigation.js` + `AppLayout.vue` | menu visibility |
| **Database enforces** | `02_rls.sql:76-111` | `get_my_role()` → `users.role` |

**The table is authoritative at read time; metadata is only a seed.** `[INFERRED]` This is
fortunate: it means the role-migration question reduces to *"how does `public.users.role` get
populated when an account is created?"* — a single, well-bounded problem — rather than *"which
claims are trusted?"*, which would be a security question.

### 5.3 The role inventory

Four roles are used, three are declared.

| Role | UI gate | RLS | Declared in CHECK |
|---|---|---|---|
| `Admin` | `adminOnly` routes | full access, all 11 tables | ✅ `01:17` |
| `Guru` | `presensiOnly` routes | `attendance_logs` write | ✅ `01:17` |
| `Pustakawan` | `perpusOnly` routes | `books`, `book_loans`, `library_visits` write | ✅ `01:17` |
| `Guru & Pustakawan` | both `presensiOnly` **and** `perpusOnly` | both write sets | ❌ **NOT declared — drift #5** |

The composite role is the one that breaks the declared constraint. See
[DATABASE_INVENTORY.md § Drift #5](./DATABASE_INVENTORY.md#drift-5--role-value-guru--pustakawan-violates-declared-check-constraint).

---

## 6. Session, persistence, and browser-dependent behaviour

### 6.1 The session lifecycle as implemented

```
┌─ BOOT (src/main.js:32-46) ──────────────────────────────────────────────┐
│ 1. Synchronously hydrate profile from localStorage['presensi.user']     │
│    → role/kelas available with ZERO network round-trips  (auth.js:53-55)│
│ 2. Register onAuthStateChange BEFORE any await            (auth.js:58)   │
│    (comment at :57 is explicit: "didaftarkan SEBELUM await apa pun")     │
│ 3. await getSession()                                     (auth.js:71)   │
│ 4. If a session exists AND cache.auth_id matches → refresh in BACKGROUND │
│    If cache is empty/different (new device) → BLOCKING fetch (auth.js:78)│
│ 5. Whole boot is raced against BOOT_TIMEOUT_MS = 5000     (main.js:35-38)│
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Session behaviour that is browser-dependent

| Behaviour | Where | Browser dependency | Portability |
|---|---|---|---|
| Session blob in `localStorage` | `supabase-js` default; read at `LoginView.vue:137` | Yes — `localStorage` semantics, private mode, storage quota | `[INFERRED]` Portable if the replacement also uses `localStorage`, but the **key name** changes and the recovery routine hard-codes the old key's origin |
| Profile cache `presensi.user` | `stores/auth.js:5, 16, 22` | Yes — `localStorage`, wrapped in try/catch for quota/private mode (`:21`) | Fully portable — it is plain JSON, unrelated to Supabase |
| Logo cache `app.logo_url` | `stores/settings.js:41-45`; consumed by inline `<script>` in `index.html:86-95` | Yes | Portable |
| Auto token refresh | `src/lib/supabase.js:15` | Timer-based; suspended in background tabs | Replacement needs its own refresh strategy |
| `INITIAL_SESSION` / `TOKEN_REFRESHED` events | `stores/auth.js:63-66` | Event ordering | **Not portable** — event names are GoTrue-specific |
| Cross-tab sign-out propagation | Implicit in `onAuthStateChange` | `storage` events | **Not portable** unless reimplemented |
| Service worker unregistration | `main.js:12-18`, `LoginView.vue:121-125` | Browser API | Portable, unrelated to auth |
| Login hang on some Chrome mobile | `docs/authentication.md:66-79` | **Real observed browser bug** | ⚠️ See § 7 |

### 6.3 The stale-session recovery path — a real defect history

`[REPO]` `docs/authentication.md:66` records an actual production incident: *"di sebagian Chrome
mobile, proses masuk bisa menggantung tanpa batas (loading 'Memeriksa…' selamanya) akibat state
sesi lokal yang stale"* — on some Chrome mobile devices login hung indefinitely on stale local
session state.

The mitigation (`LoginView.vue:96-141`, CHANGELOG `0.2.19`) is a **12-second timeout** that
reveals a "Mengalami masalah?" panel whose "Pulihkan Sesi" button performs four steps in order:

| Step | Line | Action | Timeout |
|---|---|---|---|
| 1 | `:108-113` | `localStorage.removeItem('presensi.user')` | — |
| 2 | `:117` | `supabase.auth.signOut({ scope: 'local' })` | `RECOVERY_STEP_TIMEOUT_MS` |
| 3 | `:120-125` | Unregister orphaned service workers | idem |
| 4 | `:132-138` | `localStorage.removeItem(supabase.auth.storageKey)`, then `window.location.reload()` | **no await** |

`[INFERRED]` **This is the strongest warning in the auth audit.** It documents that the Supabase
Auth session lifecycle has *already* produced an unrecoverable client-side state in the field, and
that the application's response was to build a manual escape hatch that reaches into
`supabase-js`'s internal storage key. That reach-in is exactly what AU-13 shows:
`supabase.auth.storageKey` is a library-internal detail the application now depends on.

**Implication for migration:** a replacement auth system inherits this risk profile. The recovery
path must be reimplemented, not deleted, and it must be re-derived for the new storage key — a
copy-paste will silently remove the only escape hatch users have. The `loginAttempt` counter
(`LoginView.vue:100-101`) that prevents a late-arriving login result from re-writing state is
equally load-bearing and equally non-portable.

---

## 7. Which code must change for self-hosted PostgreSQL?

Complete inventory of auth-touching code and its disposition.

| # | File | Lines | Current | Disposition | Effort |
|---|---|---|---|---|---|
| AU-16 | `src/lib/supabase.js` | whole file | `createClient` + auth config + realtime shim glue | **Rewrite** as a data-access/auth module | Medium |
| AU-17 | `src/stores/auth.js` | `:36-42` | `fetchProfile` via PostgREST `users` | Re-target to new data path | Low |
| AU-18 | `src/stores/auth.js` | `:52-83` | `initialize()` with `getSession` + `onAuthStateChange` | **Rewrite** the event model | **High** |
| AU-19 | `src/stores/auth.js` | `:87-103` | `login()` via `signInWithPassword` | **Rewrite** | Medium |
| AU-20 | `src/stores/auth.js` | `:106-111` | `logout()` via `signOut` | **Rewrite** | Low |
| AU-21 | `src/stores/auth.js` | `:5-22` | `presensi.user` localStorage cache | **Keep unchanged** | None |
| AU-22 | `src/stores/auth.js` | `:29-33` | Role getters | **Keep unchanged** | None |
| AU-23 | `src/router/index.js` | `:143-158` | Route guard over the store | **Keep unchanged** (store interface is stable) | None |
| AU-24 | `src/views/LoginView.vue` | `:62-95` | Login submit + timeout | Adjust call, keep timeout | Low |
| AU-25 | `src/views/LoginView.vue` | `:96-141` | Recovery flow | **Re-derive** for the new storage key | Medium |
| AU-26 | `src/views/GuruView.vue` | `:21-24` | Secondary client | **Replace** with backend "create user" endpoint | Medium |
| AU-27 | `src/views/GuruView.vue` | `:113-135` | Excel bulk `signUp` loop | **Replace**; consider a bulk endpoint | Medium |
| AU-28 | `supabase/06_final_snapshot.sql` | `:33` | FK to `auth.users` | **Drop the FK**; keep `auth_id` as a plain UUID (or rename) | Low |
| AU-29 | `supabase/06_final_snapshot.sql` | `:39-86` | FN-3, FN-4, TG-3, TG-4 | **Delete**; reimplement provisioning in the backend | **High** |
| AU-30 | `supabase/02_rls.sql` | `:27` | `auth.uid()` | **Replace** with the new session accessor | **High** — see [RLS_MIGRATION.md](./RLS_MIGRATION.md) |
| AU-31 | `supabase/04_seed.sql` | `:7-11` | Plaintext seed passwords | **Delete the auth portion**; it is already obsolete (`docs/database.md:17`) | Low |
| AU-32 | `src/stores/auth.js` | `:88` | Virtual email `@minblora.id` | **Optional removal** — a real auth service can use usernames directly | Low |
| AU-33 | `src/views/LoginView.vue` | `:137` | `supabase.auth.storageKey` | **Replace** with the new key | Low |

**Unchanged:** AU-21 (profile cache), AU-22 (role getters), AU-23 (route guard), and every RLS
*predicate* (only its `auth.uid()` operand changes).

`[INFERRED]` That three of the most visible pieces — the store's public interface, the route guard,
and the role logic — survive untouched is a direct consequence of the finding in § 4: the
application never inspects tokens. The rewrite is confined to the surface that talks to the auth
*API*, not the surface that reasons about *users*.

---

## 8. Historical evidence: this application has already changed auth systems once

`[INFERRED]` from a cluster of artifacts that only make sense together:

| Artifact | Location | What it reveals |
|---|---|---|
| `users.password` — `text NOT NULL` | `01_schema.sql:15` | A **pre-Supabase** login lived in this table |
| Seed rows with `'admin123'`, `'guru123'` | `04_seed.sql:8-10` | Those were real, plaintext, working credentials |
| FN-3 writes `'***'` into `password` | `06_final_snapshot.sql:56` | The column was deliberately neutered |
| Comment: *"Password kini 100% diurus Supabase Auth"* | `06_final_snapshot.sql:55` | Explicit handover |
| `DELETE FROM auth.identities WHERE identity_data->>'email' LIKE '%@minblora.com'` | `06_final_snapshot.sql:23` | An **earlier virtual domain** |
| `DELETE … LIKE '%@minblora.local'` | `06_final_snapshot.sql:25` | An **even earlier** one |
| `DROP FUNCTION sync_user_to_auth()` / `delete_user_from_auth()` | `06_final_snapshot.sql:5-8` | **Reverse-direction** sync functions (public → auth) that existed only in the live database |
| `TRUNCATE TABLE public.users CASCADE` | `06_final_snapshot.sql:27` | A hard reset was performed in production |
| `docs/database.md:22` warns `04_seed.sql`'s login section is obsolete | — | The repository knows `password` is dead |

**Conclusion:** this codebase has migrated its authentication mechanism at least twice
(`@minblora.local` → `@minblora.com` → `@minblora.id`), each time with a destructive reset. The
current state is the third iteration.

`[INFERRED]` Two implications:

1. **Precedent exists, but not a plan.** Each prior migration was done ad hoc against a live
   database with no migration files — which is precisely why the repository cannot describe its own
   schema (drift, [DATABASE_INVENTORY.md § 5](./DATABASE_INVENTORY.md#5-schema-drift--repo-sql--live-database)).
   Repeating that pattern for the VPS migration would produce the same outcome at larger scale.
2. **The legacy `password` column is a standing liability.** It is `NOT NULL`
   (`01_schema.sql:15`), it is readable by every authenticated user via the
   `Authenticated_Select` policy (`02_rls.sql:58`), and for any row created by `04_seed.sql` it
   still contains a **usable plaintext password**. See
   [SECURITY_REVIEW.md](./SECURITY_REVIEW.md#sec-03--legacy-plaintext-passwords-readable-by-any-authenticated-user).

---

## 9. The database-vs-platform split

The brief requires this separation explicitly. It is the organising idea of this document.

### 8.1 Database migration — what actually moves

| Item | Portable to a PostgreSQL VPS? |
|---|---|
| 11 tables, all columns | ✅ yes |
| 11 primary keys | ✅ yes |
| 6 foreign keys | ⚠️ 5 of 6 — FK-1 targets `auth.users` |
| 6 unique constraints/indexes | ✅ yes |
| 13 secondary indexes | ✅ yes |
| 8 check constraints | ✅ yes (`'Guru & Pustakawan'` must be added) |
| 4 functions | ⚠️ 1 of 4 (FN-1) |
| 4 triggers | ⚠️ 2 of 4 (TG-1, TG-2) |
| `pgcrypto` | ✅ built into PG ≥ 13 |
| Data (rows) | ✅ via `pg_dump`/`COPY` — *where the FK allows* |
| `public.users` rows | ⚠️ **contain dangling `auth_id` values** once `auth.users` is gone |

### 8.2 Backend platform migration — what must be built

| Capability | Supabase supplied it? | Exists in the repo? | Must be built? |
|---|---|---|---|
| **Auth** (credentials, sessions, password reset) | ✅ GoTrue | ❌ | ✅ **Yes** |
| **Authorization enforcement** | ✅ RLS + PostgREST role switching | ⚠️ policies exist, enforcement mechanism does not | ✅ **Yes** |
| **API layer** (HTTP/JSON, embeds, counts, upserts) | ✅ PostgREST | ❌ | ✅ **Yes** |
| **Storage** (objects, public URLs) | ✅ Storage API | ❌ | ✅ **Yes** |
| **Realtime** (WAL → clients) | ✅ Realtime | ❌ | ⚠️ Optional — see [SUPABASE_DEPENDENCIES.md § 7.3](./SUPABASE_DEPENDENCIES.md#73-replacement-requirements) |
| **Connection pooling** | ✅ Supavisor | ❌ | ✅ **Yes** |
| **Backups / PITR** | ✅ managed | ❌ | ✅ **Yes** — see [BACKUP_DR_PLAN.md](./BACKUP_DR_PLAN.md) |
| **TLS termination** | ✅ managed | ❌ | ✅ **Yes** |
| **Database (PostgreSQL itself)** | ✅ managed | ❌ | ✅ **Yes** — this is the part being self-hosted |

`[INFERRED]` Read the two tables together: **the database migration column is almost entirely
green, and the platform migration column is almost entirely empty.** That asymmetry is the whole
project. The phrase "migrate Supabase to self-hosted PostgreSQL" describes roughly 15% of the work;
the remaining 85% is building the backend platform that Supabase was providing implicitly and that
this repository never contained.

### 8.3 Non-negotiable ordering constraint

Authorization cannot be built after the data path, because every RLS policy is `TO authenticated`
and depends on `auth.uid()`. The dependency runs:

```
identity model  →  session mechanism  →  auth.uid() replacement  →  RLS operative
       ↑                                                                  │
       └──────────────── the API layer must carry identity ───────────────┘
```

`[INFERRED]` Concretely: **stage S-5 (Authentication) must complete before stage S-7
(Application integration) can be validated**, and stage S-4 (Backend API) must be designed with the
identity mechanism already fixed. Building the API first and bolting auth on afterwards would
require rewriting every endpoint's authorization.
