# Data Migration Plan

**Phase 12 — data migration plan.**

> **PLAN ONLY. NOT EXECUTED.**
> No `pg_dump` was run. No data was exported, copied, or transformed. No database was created.
> Every command shown below is documentation, not a record of something performed.

---

## 0. Prerequisite: close the schema drift

**Nothing in this document is executable until the drift is resolved.**
→ [DATABASE_INVENTORY.md § 5](./DATABASE_INVENTORY.md#5-schema-drift--repo-sql--live-database)

The repository does not describe the production schema. Four columns the application reads are
absent from every SQL file; one role value violates a declared CHECK constraint; one table's RLS
state is contradictory. Therefore:

```
Repository SQL  ──✗──►  cannot be used as the migration source
Live database   ──✓──►  is the only authoritative description of the target schema
```

**Step 0.1 — Capture the live schema (read-only).**

```bash
# READ-ONLY. Not executed during this audit.
pg_dump --schema-only --no-owner --no-privileges \
        --schema=public \
        "$SUPABASE_DB_URL" > live_schema_public.sql
```

⚠️ This requires a **direct PostgreSQL connection string** to the Supabase database. Do **not**
confuse this with the PostgREST URL or the anon key. The connection string contains a `postgres`
password and must never be committed — see the [no-credentials rule](./README.md) and
`SECURITY.md:29`.

**Step 0.2 — Diff it against the repository.**

```bash
# READ-ONLY.
# Reconstruct what the repo SQL *would* produce, then compare object by object.
diff <(grep -Ei 'create (table|index|unique|function|trigger)' supabase/*.sql) \
     <(grep -Ei 'create (table|index|unique|function|trigger)' live_schema_public.sql)
```

**Step 0.3 — Resolve each drift item before building anything.**

| # | Item | Resolution required |
|---|---|---|
| 1 | `users.nip` | Add to the target schema |
| 2 | `students.tanggal_lahir` | Add |
| 3 | `students.tempat_lahir` | Add |
| 4 | `app_settings.favicon_url` | Add |
| 5 | `users.role` CHECK | Widen to include `'Guru & Pustakawan'` |
| 6 | `library_visits` RLS | Determine live policies; decide |
| 7 | Historical functions | Confirm what exists live; decide what to carry |
| 8 | `06_final_snapshot.sql` | ⚠️ **Never run.** See § 7 |

**Exit criterion:** a single authoritative schema file, reviewed and versioned, that **provably**
reproduces the live structure. Not the repository's SQL; not `pg_dump` output verbatim; a
deliberate, reviewed target.

---

## 1. Schema migration order

Ordered by dependency. Every step is a constraint on the next.

| Step | Object(s) | Depends on | Why this position | Supabase-specific? |
|---|---|---|---|---|
| **1** | Database + roles | — | Roles must exist before policies reference them | ⚠️ Section 6 |
| **2** | Extensions | — | `gen_random_uuid()` availability | ✅ Core in PG ≥ 13 |
| **3** | `public.users` | — | **Root of the FK graph**; `activity_logs` references it | ❌ **Split** — see step 3a |
| 3a | └ `auth_id` column | — | Added, but **without** the FK to `auth.users` | 🔴 FK cannot be recreated |
| **4** | `public.students` | — | Parent of 4 child tables | ✅ |
| **5** | `public.academic_calendar` | — | Independent | ✅ |
| **6** | `public.academic_periods` | — | Independent; partial unique index | ✅ |
| **7** | `public.app_settings` | — | Independent singleton | ✅ |
| **8** | `public.books` | — | Parent of `book_loans` | ✅ |
| **9** | `public.attendance_logs` | `students` (FK-3) | Requires `students.nisn` UNIQUE | ✅ |
| **10** | `public.class_history` | `students` (FK-4) | idem | ✅ |
| **11** | `public.book_loans` | `books` (FK-5), `students` (FK-6) | Requires both parents | ✅ |
| **12** | `public.library_visits` | `students` (FK-6-equiv) | idem | ✅ |
| **13** | `public.activity_logs` | `users` (FK-2) | Last table; nullable FK allows deferral | ✅ |
| **14** | Functions | tables above | `set_updated_at`; `get_my_role` needs `users` | 🔴 FN-2 body |
| **15** | Triggers | functions + tables | TG-1/TG-2 only | 🔴 TG-3/TG-4 impossible |
| **16** | Indexes | tables | After data load for speed, before RLS for the helper | ✅ |
| **17** | Constraints (`CHECK`, `UNIQUE`) | tables | After data load — a violating row aborts the load | ⚠️ Widened CHECK |
| **18** | **RLS: enable + policies** | roles, functions, tables | **Last.** See § 6 | 🔴 Heaviest |
| **19** | Grants | roles, tables | PostgREST/backend needs table-level grants | 🔴 Section 6 |

### 1.1 A deliberate ordering choice

`[INFERRED]` **Load data before adding constraints and enabling RLS.**

- **Constraints:** if any live row violates the widened CHECK or a UNIQUE (e.g. duplicate
  `auth_id` — unenforced today, [RLS_MIGRATION RLS-OB-2](./RLS_MIGRATION.md#6-cross-cutting-rls-observations-with-consequences-for-migration)), the load aborts *after* transferring
  the data, forcing a restart. Validate on a staging load first.
- **RLS:** with RLS enabled and identity not yet wired, **every load into a table you are not the
  owner of silently inserts zero rows** or errors. Load as the table owner, then enable RLS.
- **Indexes:** build after bulk load is materially faster than maintaining b-trees row by row.

⚠️ `[INFERRED]` This ordering is the **opposite** of the repository's own scripts, which create
constraints inline with the tables (`01_schema.sql`). That is correct for a fresh empty schema and
wrong for a data load. The two scripts serve different purposes and must not be confused.

---

## 2. Table dependency order for data

Data loads child-after-parent, so every FK is satisfiable at insert time.

```
Tier 0  (no FK dependencies — any order)
    users          (auth_id loaded as a plain UUID; FK dropped)
    students
    academic_calendar
    academic_periods
    app_settings
    books

Tier 1  (depend on Tier 0)
    attendance_logs    ← students.nisn
    class_history      ← students.nisn
    book_loans         ← books.id, students.nisn
    library_visits     ← students.nisn

Tier 2  (nullable FK — order-flexible, but see below)
    activity_logs      ← users.id  ON DELETE SET NULL
```

| Tier | Tables | Note |
|---|---|---|
| 0 | 6 | No inter-dependencies. Load in any order, or in parallel |
| 1 | 4 | All require `students.nisn` to be present **and unique** |
| 2 | 1 | FK-2 is `ON DELETE SET NULL` — so `activity_logs` *can* load first, but then `user_id` is permanently null and audit attribution is lost |

⚠️ `[INFERRED]` **Load `activity_logs` after `users`.** The nullable FK makes loading it first
technically valid, which is exactly why it is a trap: the failure is silent (rows insert fine with
`user_id = NULL`) and irreversible without a source copy. The audit trail is a **reporting input**
here ([DATABASE_INVENTORY § 4.3](./DATABASE_INVENTORY.md#43-activity_logsrecord_id-is-a-string-encoded-composite-used-as-a-query-key)), so losing attribution degrades reports, not just history.

### 2.1 The one row that cannot be migrated honestly

`public.users.auth_id` was a FK into `auth.users` (FK-1, `06_final_snapshot.sql:33`). After
migration:

| Option | Result |
|---|---|
| Load `auth_id` as a plain UUID | Values are preserved but now reference **nothing** — dangling identifiers from a decommissioned auth system |
| Re-map to the new auth system's identifiers | New auth users must be created first, then a mapping applied. Deterministic only if created from the same usernames |
| Null it and re-establish on first login | `auth_id` becomes null; `get_my_role()` returns null; **every user is locked out of every policy** until re-established |
| Keep it as a foreign key | ❌ Impossible — `auth.users` does not exist |

`[INFERRED]` **This is the single hardest step in the data migration**, and it is why the auth
decision ([AUTH_MIGRATION.md § 9](./AUTH_MIGRATION.md#9-the-database-vs-platform-split)) must be made
*before* data migration, not during it. The cleanest path is to create the new identities first,
then map `auth_id` (old) → new identity id, so the application's `WHERE auth_id = ?` lookup keeps
working unchanged.

---

## 3. What `pg_dump` can and cannot carry

The brief warns: *"Do not assume Supabase database = plain PostgreSQL dump with no additional
considerations."* This is where that warning bites.

### 3.1 Carryable by `pg_dump`

| Object | `pg_dump` handles it? | Note |
|---|---|---|
| Table DDL (columns, types, defaults) | ✅ Yes | Schema-only dump |
| `uuid`, `text`, `date`, `timestamptz`, `boolean`, `int`, `jsonb` | ✅ Yes | All standard; no conversion |
| Primary keys | ✅ Yes | |
| Foreign keys **within `public`** | ✅ Yes | FK-2 … FK-6 |
| Unique constraints & indexes | ✅ Yes | Including partial indexes |
| CHECK constraints | ✅ Yes | As they exist live (post-drift) |
| Non-unique indexes | ✅ Yes | |
| Row data (`COPY`) | ✅ Yes | `--data-only` or full dump |
| Function bodies | ⚠️ Yes, with conditions | See § 3.2 |
| Trigger definitions | ⚠️ Only for `public` tables | See § 3.2 |
| Comments | ✅ Yes | |
| Ownership / privileges | ⚠️ With `--no-owner --no-privileges` | **Recommended** — live ownership references Supabase roles |
| `pgcrypto` extension | ✅ Yes (`CREATE EXTENSION`) | Unnecessary on PG ≥ 13 but harmless |

### 3.2 Requires manual work — despite being "in" the dump

| Object | Why manual | Action |
|---|---|---|
| **FK to `auth.users`** (FK-1) | `pg_dump` will emit `REFERENCES auth.users(id)`. The target has no `auth` schema → the load **fails** | Drop the clause; load `auth_id` as a bare UUID |
| **Triggers on `auth.users`** (TG-3, TG-4) | Same — DDL targeting a non-existent schema | Exclude; reimplement in the backend |
| **`handle_new_user()` / `handle_delete_user()`** | Bodies reference `NEW.raw_user_meta_data`, `NEW.email` | Exclude; reimplement |
| **`get_my_role()`** | Body calls `auth.uid()` | Body must be rewritten (§ 6) |
| **All RLS policies** | `TO authenticated`, `auth.uid()` | Every policy needs the role and the function |
| **Grants to `anon` / `authenticated` / `service_role`** | Those roles do not exist | Rewrite grant target |
| **`storage.*` schema** | Supabase-managed; `pg_dump` of `public` excludes it | Separate workstream → [STORAGE_MIGRATION.md](./STORAGE_MIGRATION.md) |
| **`auth.*` schema** | Supabase-managed; **contains password hashes** | ❌ **Do not dump.** See § 3.4 |
| **Extensions installed live but never declared** | `pg_dump` emits `CREATE EXTENSION` only for what exists | `UNKNOWN` — verify with `SELECT * FROM pg_extension;` |
| **Roles/role memberships** | `pg_dump` default is no roles | `UNKNOWN` live config |
| **Sequences** | ✅ Yes | ⚠️ **But this schema has none** — see § 4.5 |

### 3.3 A critical `pg_dump` caveat: it is not a "migration"

`[INFERRED]` `pg_dump` produces a **snapshot of the live database including its drift**. If the
live schema has:
- a different `role` CHECK constraint → the dump carries the widened one (✅ actually helpful), but
- permissive policies that the repository says should have been removed → **the dump carries those too**,

then loading the dump **reproduces every problem in § 0** plus every RLS finding in
[RLS_MIGRATION.md](./RLS_MIGRATION.md) — faithfully, and without flagging any of it.

**Therefore:** `pg_dump` is the **input** to schema reconciliation, not its output. The
deliverable of S-2 is a *reviewed* schema, hand-adjusted from the dump with each drift item and each
policy explicitly decided.

### 3.4 Do not dump the `auth` schema

`[INFERRED]` `auth.users` contains password hashes, and `auth.identities` contains identity data.
Dumping it would:

- copy credential material into a file, in scope of the
  [no-credentials rule](./README.md) — the repository forbids committing dumps (`SECURITY.md:31`),
  and more importantly the file would exist at all;
- be **useless** — the hashes are GoTrue-specific and not directly consumable by another auth
  system;
- be **incomplete** — GoTrue's session, refresh-token, and MFA tables would also be needed for a
  true credential migration.

**The correct approach is to recreate credentials, not copy them.** With virtual email addresses
(`<username>@minblora.id`, `auth.js:88`) that cannot receive mail, the only realistic path is an
admin-initiated password reset for every account — i.e. **every user's password changes at
cutover**. This must be communicated as part of the cutover plan.

⚠️ `[INFERRED]` This is a **user-facing, operationally significant consequence** that is easy to
miss when the problem is framed as "move the database". It belongs in
[CUTOVER_PLAN.md](./CUTOVER_PLAN.md).

---

## 4. Data type compatibility

Direct answer to the brief's Phase 12 checklist.

### 4.1 UUID

| Aspect | Assessment |
|---|---|
| Compatibility | ✅ **Perfect.** `uuid` is a core PostgreSQL type |
| Generation | `gen_random_uuid()` — core since PG 13; no extension needed (`01:7`) |
| Values | 9 columns use UUID PKs; values are opaque and carry over byte-for-byte |
| Format | Canonical lowercase hex with hyphens; `pg_dump` emits them verbatim |
| Risk | **None** in the data |
| ⚠️ Exception | `PengaturanView.vue:276` et al. hard-code `'00000000-0000-0000-0000-000000000000'` as a deletion sentinel. It is a valid UUID and matches no real row. Harmless, but a backend replacement should not promote the trick |

### 4.2 Timestamps and timezones

| Aspect | Assessment |
|---|---|
| Type | `timestamptz` everywhere (`01:19, 42, 53, 60, 61, 79, 102, 120, 131, 164, 181, 199`) — an absolute instant, timezone-safe by construction |
| Storage | Internally UTC microsecond epoch; **no conversion needed** |
| `pg_dump` | Emits `SET TIME ZONE` + literal timestamps; the instant is preserved |
| **Watch out** | The **session `TimeZone`** on the target affects: `now()` defaults for *new* rows, and the *display* of these values via `psql`. It does **not** alter stored instants |
| Recommendation | Set the VPS to `UTC` (`timezone = 'UTC'` in `postgresql.conf`) and do **not** convert stored data |
| `date` columns | `date` is timezone-free. `attendance_logs.date` (`01:47`) and `academic_calendar.date` (`01:64`) are unaffected |
| ⚠️ Application-level | `PengaturanView.vue:396` uses `toLocaleString('id-ID')` — display depends on the **browser**, not the DB. Migration does not change it |
| ⚠️ Application-level | Dates are built client-side with `new Date().toISOString().split('T')[0]` (e.g. `DashboardView.vue:185`, `RekapSemesterView.vue:67`). `toISOString()` is **UTC**, so a user in UTC+7 after 17:00 local produces **tomorrow's date**. `[INFERRED]` This is a **pre-existing** bug, unrelated to migration, but it will be scrutinised during cutover validation — flag it so it is not misattributed to the migration |

### 4.3 JSON / JSONB

| Aspect | Assessment |
|---|---|
| Columns | `app_settings.daftar_kelas` `jsonb` (`01:114`), `app_settings.hari_libur_mingguan` `jsonb` (`01:119`), `activity_logs.detail` `jsonb` (`01:129`) |
| Compatibility | ✅ **Perfect.** `jsonb` is core PostgreSQL |
| Defaults | `'[…]'::jsonb` casts — portable verbatim |
| `pg_dump` | Emits as JSON literals; round-trips exactly |
| Risk | **None in the transport.** ⚠️ The **shape** is contract, not schema: `daftar_kelas` is a string array; `hari_libur_mingguan` is a **number array** (`[0, 6]` = Sunday, Saturday — JavaScript `getDay()` convention, not SQL `DOW`). `stores/settings.js:23-24` defends against missing values by supplying defaults. A backend returning these as strings instead of arrays would break every class dropdown |

⚠️ `[INFERRED]` **`hari_libur_mingguan` uses JavaScript's day numbering** (`0` = Sunday, `6` =
Saturday) — **not** PostgreSQL's `EXTRACT(DOW)` (also 0=Sunday, but the parallel is coincidental,
not a shared contract). Any server-side logic added later must not assume ISO-8601 (`1` = Monday).

### 4.4 Arrays

| Aspect | Assessment |
|---|---|
| Native PostgreSQL array columns | ❌ **None.** No column is declared `text[]`, `int[]`, or similar |
| Array usage | JSON arrays inside `jsonb` (above) — **not** SQL arrays |
| JS arrays | Used extensively client-side (`Array.from`, `.map`, `.filter`) — irrelevant to storage |
| Migration risk | **None** |

`[INFERRED]` This is a small simplification: there is no array-literal parsing, no
`ARRAY[…]` syntax, and no array-vs-string ambiguity in the transport.

### 4.5 Enums

| Aspect | Assessment |
|---|---|
| Native PostgreSQL `ENUM` types | ❌ **None** |
| Representation | `text` + `CHECK` constraint — 6 such constraints (C-1…C-6, C-8) |
| Migration advantage | ✅ **No `CREATE TYPE` to recreate.** No enum ordering, no `ALTER TYPE … ADD VALUE` transaction restrictions |
| Adding a value | `ALTER TABLE … DROP CONSTRAINT … ; ALTER TABLE … ADD CONSTRAINT …` — which is exactly what drift #5 proves happened in production |
| Risk | **Low**, but the CHECK list must match the live one, not the repository's |

`[INFERRED]` The text+CHECK design is the friendlier choice for migration and it is already in
place. It should be preserved, not "improved" into native enums during migration — that would add
conversion work and lock in the same rigidity.

### 4.6 Sequences

| Aspect | Assessment |
|---|---|
| Sequences in the schema | ❌ **None.** No `serial`, no `bigserial`, no `CREATE SEQUENCE` |
| UUID defaults | `gen_random_uuid()` on 9 tables — no sequence involved |
| ⚠️ Sole exception | `app_settings.id int primary key default 1 check (id = 1)` (`01:104`) — a literal `int` with no sequence, enforced as a singleton by CHECK |
| Migration risk | **None.** Nothing to reset — and notably **no `setval()` step is needed**, which is the most common post-`pg_dump` oversight in sequence-based schemas |

### 4.7 Identity columns

| Aspect | Assessment |
|---|---|
| `GENERATED … AS IDENTITY` | ❌ **None** |
| `serial` / `bigserial` | ❌ **None** |
| Practical effect | **None.** All surrogate keys are UUIDs assigned by `gen_random_uuid()` |
| ⚠️ Implication | UUIDs are **random, not monotonic**. `ORDER BY id` is meaningless. Every query that needs recency orders by `created_at` (e.g. `BukuView.vue:111`), and IX-9 indexes `activity_logs(created_at)` for exactly that. A replacement backend must not assume insertion order from the PK |

### 4.8 Defaults

| Default | Columns | Portable? |
|---|---|---|
| `gen_random_uuid()` | 9 PKs | ✅ (core ≥ 13) |
| `now()` | all `created_at` / `updated_at` | ✅ |
| `true` | `students.active` `01:31`, `academic_periods.is_active` `01:75` | ✅ |
| `'aktif'` | `students.status` `01:33` | ✅ |
| `'Masuk'` | `academic_calendar.status` `01:65` | ✅ |
| `'dipinjam'` | `book_loans.status` `01:176` | ✅ |
| `'Guru'` | `users.role` `01:17` | ✅ |
| `1` | `app_settings.id` `01:104` | ✅ |
| `current_date` | `book_loans.tanggal_pinjam` `01:173`, `library_visits.tanggal` `01:196` | ✅ ⚠️ depends on the **server's** `TimeZone` for what "today" means |
| `'[\"1A\"…]'::jsonb` | `app_settings.daftar_kelas` `01:114` | ✅ |
| `'[0, 6]'::jsonb` | `app_settings.hari_libur_mingguan` `01:119` | ✅ |
| `'MIN Blora'` | `app_settings.nama_perpustakaan` `01:118` | ✅ (a data value in a default — note it is a school name) |

`[INFERRED]` `current_date` defaults are the only timezone-sensitive ones. On a UTC-configured VPS,
`current_date` matches UTC "today", which for a UTC+7 user differs between 00:00 and 07:00 local.
⚠️ This is the same class of issue as § 4.2's application-level `toISOString()` note, and the two
can compound: a client computing "today" in UTC and a server defaulting `current_date` in UTC agree
with each other, but both can differ from the user's actual local day.

### 4.9 Compatibility summary

| Item | Verdict |
|---|---|
| UUID | ✅ No conversion |
| `timestamptz` | ✅ No conversion; set target to UTC |
| `date` | ✅ No conversion |
| `jsonb` | ✅ No conversion |
| Arrays | ✅ Not used natively |
| Enums | ✅ Not used natively |
| Sequences | ✅ Not used |
| Identity columns | ✅ Not used |
| Defaults | ✅ All standard |

**`[INFERRED]` No data-type conversion work is required.** The schema is built entirely from
standard PostgreSQL types with no Supabase-proprietary types, no extensions beyond a vestigial
`pgcrypto`, and no generated columns. The migration's difficulty is **entirely** in functions,
triggers, RLS, and the platform services — not in the data representation.

---

## 5. Constraints, indexes, and RLS

### 5.1 Foreign keys

| FK | Migration approach |
|---|---|
| FK-1 `users.auth_id → auth.users` | ❌ **Cannot recreate.** Load `auth_id` as a bare UUID; add a replacement integrity mechanism in the backend |
| FK-2 `activity_logs.user_id → users` | ✅ Recreate |
| FK-3 `attendance_logs.student_nisn → students(nisn)` | ✅ Recreate — **preserve `ON UPDATE CASCADE ON DELETE CASCADE`** |
| FK-4 `class_history.student_nisn → students(nisn)` | ✅ Recreate, same cascades |
| FK-5 `book_loans.book_id → books(id)` | ✅ Recreate, `ON DELETE CASCADE` |
| FK-6 `book_loans.student_nisn → students(nisn)` | ✅ Recreate — **and consider naming it explicitly**, because `BukuView.vue:274` depends on the auto-generated name `book_loans_student_nisn_fkey` |

⚠️ `[INFERRED]` **Cascade semantics are part of the data model, not an implementation detail.**
Omitting `ON DELETE CASCADE` on FK-3/4/6 changes behaviour: deleting a student would then fail with
a constraint violation instead of silently destroying their history. Neither is obviously right —
but the migration must *choose*, not accidentally default. See
[DATABASE_INVENTORY § 2.6](./DATABASE_INVENTORY.md#26-cascade-delete-map).

### 5.2 Unique constraints and indexes

| Object | Approach |
|---|---|
| U-1 … U-5 | ✅ Recreate |
| U-6 partial unique `idx_one_active_period` | ✅ Recreate **as an index**, exactly as written. ⚠️ Must be normalised first — if two live rows have `is_active = true`, creation fails |
| IX-1 … IX-13 | ✅ Recreate — **after** data load |
| **IDX-A** `users(auth_id)` index | ➕ **Add** — [VPS_REQUIREMENTS](./VPS_REQUIREMENTS.md#34-indexes-required) |
| **IDX-B** `users(auth_id)` UNIQUE | ➕ **Add** (validate for duplicates first) |
| IDX-C … IDX-F, IDX-H | ➕ Consider, measurement-driven |

### 5.3 Functions and triggers

| Object | Approach |
|---|---|
| FN-1 `set_updated_at()` | ✅ Copy verbatim. Consider adding `SET search_path` |
| TG-1, TG-2 | ✅ Copy verbatim |
| FN-2 `get_my_role()` | 🔴 **Body rewritten** for the new identity accessor |
| FN-3, FN-4 | ❌ **Delete.** Reimplement provisioning in the backend |
| TG-3, TG-4 | ❌ **Delete** — target table does not exist |

### 5.4 RLS

🔴 **The heaviest step, and last.** Full analysis and checklist:
[RLS_MIGRATION.md](./RLS_MIGRATION.md). Summary of what changes:

| Aspect | Count |
|---|---|
| Tables with RLS to re-enable | 11 |
| Policies to recreate | 22 (excluding RLS-24, which must **not** be recreated) |
| Policies that can be copied verbatim | **0** — every one targets the `authenticated` role |
| Policies whose *predicate* can be copied | 21 of 22 (the `TO` clause changes, not the `USING` expression) |
| Policies with no possible equivalent | 4 (`storage.objects`) |

### 5.5 Grants

`[INFERRED]` **Frequently forgotten, and it causes a total outage.** PostgreSQL requires both:

1. **Table-level `GRANT`** — without `GRANT SELECT ON … TO app_role`, the connection sees
   `permission denied`, regardless of RLS.
2. **RLS policy** — with the grant but no matching policy, the result is an empty set.

Together they produce a failure mode where every query "succeeds" with zero rows. Under Supabase,
PostgREST's setup scripts issued these grants automatically; self-hosted, they are the operator's
responsibility and are not represented anywhere in `supabase/*.sql`.

`[INFERRED]` This is worth calling out explicitly because **the repository contains no `GRANT`
statement at all.** The migration must add a grants step that has no precedent to copy.

---

## 6. The three Supabase-specific SQL constructs

Every Supabase coupling in the SQL falls into one of three shapes. Nothing else in
`supabase/*.sql` is platform-specific.

### Shape 1 — `auth.uid()` in a function body

```sql
-- current, 02_rls.sql:27
SELECT role FROM public.users WHERE auth_id = auth.uid();
```

| Replacement approaches | Trade-off |
|---|---|
| `current_setting('app.user_id')::uuid` set per transaction by the backend | Portable, explicit, requires backend discipline |
| PostgREST's `auth.uid()` (if PostgREST is self-hosted with the JWT secret) | **No change needed** — see [POSTGRES_ARCHITECTURE option B](./POSTGRES_ARCHITECTURE.md#option-b--frontend--self-hosted-supabase-compatible-backend--postgresql) |
| Passing the user id as a function parameter | Changes every policy's call signature |

### Shape 2 — `TO authenticated` / `TO anon` role targets

| Approach | Trade-off |
|---|---|
| Create real `authenticated` / `anon` roles and switch into them | Closest to current behaviour; needs `SET LOCAL ROLE` (transaction-scoped, pooler-compatible) |
| Drop the `TO` clause, rely on grants | Policies then apply to all roles — changes the security surface |
| Grant a single `app_user` role and re-target every policy | Requires editing all 22 policies |

### Shape 3 — DDL against Supabase-managed schemas

```sql
ALTER TABLE public.users ADD COLUMN auth_id uuid REFERENCES auth.users(id);   -- 06:24
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users …              -- 06:62
INSERT INTO storage.buckets …                                                 -- 03:7
CREATE POLICY … ON storage.objects …                                          -- 03:12
```

| Object | Disposition |
|---|---|
| `auth.users` FK | ❌ Remove |
| `auth.users` triggers | ❌ Remove; reimplement in the backend |
| `storage.buckets` seed row | ❌ Replace with bucket provisioning in the new store |
| `storage.objects` policies | ❌ Replace with storage ACLs / signed URLs |
| `auth.identities` cleanup | ❌ Remove — part of the destructive `06` script |

---

## 7. ⚠️ `06_final_snapshot.sql` must never be run

Restating the most dangerous item in the repository, because it sits in the middle of the file
sequence a reader would naturally follow.

| Statement | Line | Effect |
|---|---|---|
| `DELETE FROM auth.identities WHERE identity_data->>'email' LIKE '%@minblora.com'` | `06:17` | Destroys auth identities |
| `DELETE FROM auth.users WHERE email LIKE '%@minblora.com'` | `06:18` | Destroys auth accounts |
| `DELETE FROM auth.identities WHERE identity_data->>'email' LIKE '%@minblora.local'` | `06:19` | idem |
| `DELETE FROM auth.users WHERE email LIKE '%@minblora.local'` | `06:20` | idem |
| **`TRUNCATE TABLE public.users CASCADE`** | **`06:21`** | **Deletes every profile row** |

`06_final_snapshot.sql` is **not a schema script**. It is a record of a one-off production repair,
containing a hard reset. `[INFERRED]` Its filename invites it to be run in sequence after `05`.
Running the `supabase/` directory in numeric order would **truncate `public.users` and delete auth
accounts**.

`docs/database.md:11` does list `06` in the execution order — which is correct only for a clean
bootstrap on a **new** Supabase project, where `TRUNCATE` on an empty table is a no-op. Against an
existing database it is destructive.

**Migration action:** treat `06_final_snapshot.sql` as **historical documentation**. Extract from it
only: FK-1's definition (to be dropped), the trigger logic (to be reimplemented in the backend), and
the evidence of prior churn. Never execute it.

---

## 8. Export requirements

### 8.1 What must be exported

| # | Artefact | Method | Contains credentials? | Handling |
|---|---|---|---|---|
| 1 | `public` schema DDL | `pg_dump --schema-only --schema=public` | ❌ no | Safe; foundation of the target schema |
| 2 | `public` data | `pg_dump --data-only --schema=public` | ❌ no | ⚠️ Contains **student PII** — treat as production data |
| 3 | RLS policies | `pg_dump --schema-only` captures `CREATE POLICY`, **or** enumerate via `pg_policies` | ❌ no | Required input to the RLS rebuild |
| 4 | Extensions list | `SELECT * FROM pg_extension;` | ❌ no | § 3.2 |
| 5 | Storage objects | Storage API / `storage.objects` metadata | ❌ no | [STORAGE_MIGRATION.md](./STORAGE_MIGRATION.md) |
| 6 | **`auth` schema** | ❌ **DO NOT EXPORT** | ✅ **yes — password hashes** | § 3.4 |
| 7 | Connection string | — | ✅ **yes** | ⚠️ Never committed. Env var or secret manager only |

### 8.2 Handling rules

| Rule | Source |
|---|---|
| **Never commit** a dump, credential, or `auth` export | `SECURITY.md:29-31`, `.gitignore:1-7` |
| Data dumps contain student PII — `students` has `nama`, `nisn`, `tanggal_lahir`, `tempat_lahir` | `01_schema.sql:26-38`, plus drift #2/#3 |
| Store dumps encrypted, off-repo, with a defined retention | [BACKUP_DR_PLAN.md](./BACKUP_DR_PLAN.md) |
| Delete working copies after the migration is verified | — |
| Do not export `activity_logs` without noting its reporting role | [DATABASE_INVENTORY § 4.3](./DATABASE_INVENTORY.md#43-activity_logsrecord_id-is-a-string-encoded-composite-used-as-a-query-key) |

⚠️ `[INFERRED]` The brief forbids migrating production data as part of this task, and no export was
taken. The rules above describe the **plan**, for a future, separately-authorised stage (S-11).

---

## 9. Migration plan summary

| Step | Stage | Gate |
|---|---|---|
| 0 | — | ✅ **Schema drift resolved** — blocking |
| 1 | S-1 | VPS provisioned; PostgreSQL installed; roles created |
| 2 | S-2 | Target schema written and reviewed from the reconciled dump |
| 3 | S-2 | Constraints/indexes added **after** load |
| 4 | S-2 | Functions ported; FN-3/FN-4/TG-3/TG-4 dropped |
| 5 | S-2 | **RLS rebuilt** — 22 policies, `auth.uid()` substituted |
| 6 | S-2 | **Grants added** — no precedent exists in the repo |
| 7 | S-6 | Test data loaded in tier order (§ 2); IDs and FKs validated |
| 8 | S-8 | Constraint validation; row-count parity; FK-orphan check |
| 9 | S-11 | Production data migrated; `auth_id` mapping applied (§ 2.1) |
| 10 | S-12 | Credentials recreated — **all passwords change** (§ 3.4) |

### 9.1 Validation queries (read-only; not executed)

| Check | Query shape |
|---|---|
| Row-count parity per table | `SELECT count(*) FROM public.<table>;` — compare source vs. target |
| FK orphans | `SELECT count(*) FROM public.attendance_logs a LEFT JOIN public.students s ON s.nisn = a.student_nisn WHERE s.nisn IS NULL;` — expect 0 |
| Duplicate `auth_id` | `SELECT auth_id, count(*) FROM public.users WHERE auth_id IS NOT NULL GROUP BY auth_id HAVING count(*) > 1;` — expect 0 (validates IDX-B) |
| Multiple active periods | `SELECT count(*) FROM public.academic_periods WHERE is_active;` — expect 0 or 1 (validates U-6) |
| Role values present | `SELECT role, count(*) FROM public.users GROUP BY role;` — expect only the 4 known values |
| `activity_logs` attribution | `SELECT count(*) FROM public.activity_logs WHERE user_id IS NULL;` — compare against source; a jump means § 2's tier trap was hit |
| CHECK violations | Validate each `CHECK` against live data before adding the constraint |
| Timestamp sanity | `SELECT min(created_at), max(created_at) FROM public.attendance_logs;` — compare source vs. target |
| Singleton settings | `SELECT count(*) FROM public.app_settings;` — expect exactly 1 |

---

## 10. Complexity assessment

| Dimension | Assessment | Reason |
|---|---|---|
| **Data representation** | 🟢 **Trivial** | All standard types; no conversion (§ 4.9) |
| **Data volume** | 🟢 **Trivial** | 50 MB – 1.5 GB across all scenarios ([VPS_REQUIREMENTS § 2.2](./VPS_REQUIREMENTS.md#22-three-scenarios)) |
| **Table count / ordering** | 🟢 **Simple** | 11 tables, 3 tiers, acyclic ([§ 2](#2-table-dependency-order-for-data)) |
| **Export mechanics** | 🟢 **Simple** | Standard `pg_dump` |
| **Schema reconstruction** | 🔴 **Blocked** | Drift unresolved (§ 0) |
| **Functions & triggers** | 🟡 **Moderate** | 2 of 4 functions and 2 of 4 triggers cannot be recreated as-is |
| **RLS** | 🔴 **Hard** | 22 policies; a role model and an identity mechanism must exist first |
| **Auth data** | 🔴 **Hard** | `auth_id` mapping (§ 2.1) + **all passwords change** (§ 3.4) |
| **Grants** | 🟡 **Hidden** | No precedent in the repo; omission causes a silent empty-result outage (§ 5.5) |
| **Overall** | **Data migration is the easy part. Platform migration is the project.** | Consistent with [AUTH_MIGRATION § 9](./AUTH_MIGRATION.md#9-the-database-vs-platform-split) |
