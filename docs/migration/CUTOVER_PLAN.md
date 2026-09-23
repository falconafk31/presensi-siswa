# Cutover Plan

**Phases covered: 21 (migration roadmap), 22 (cutover plan).**

> **NOTHING IN THIS DOCUMENT WAS EXECUTED.**
> No stage was started. No DNS record was changed. No VPS was provisioned. No deployment occurred.
> No production data was touched. Every item below is a plan for a future, separately-authorised
> effort.

---

## Migration roadmap

Stages as specified in the brief. **S-0 is complete; S-1 through S-14 are not started.**

| Stage | Name | Objective | Exit criteria | Blocked by |
|---|---|---|---|---|
| **S-0** | **Audit** | Establish what the migration requires | ✅ **This document set** | — |
| **S-1** | **Prepare PostgreSQL VPS** | Provision the host; install PostgreSQL; harden; set up backups | Host reachable; PostgreSQL running; 5432 not publicly exposed; backup job running and monitored; RPO/RTO agreed | — |
| **S-2** | **Recreate schema** | Build the target schema from the reconciled dump | A single reviewed schema file that provably reproduces live structure; all drift items resolved; functions ported; **RLS rebuilt**; **grants added** | 🔴 **BLK-1** (drift), **BLK-4** (RLS state) |
| **S-3** | **Test database** | Validate the schema without the application | Constraints, indexes, RLS, and the `get_my_role()` replacement all verified by direct SQL | S-2 |
| **S-4** | **Build backend API** | Replace PostgREST | Every one of the 102 call sites has a working endpoint; response shapes match (embeds, counts, upserts, error semantics) | 🔴 **BLK-2** (identity model must be fixed first) |
| **S-5** | **Authentication** | Replace GoTrue | Login, logout, session, refresh, and **account provisioning** all work; credentials recreated; every password changed | S-1; identity decision |
| **S-6** | **Migrate test data** | Load a realistic dataset | Row-count parity; zero FK orphans; reports produce identical output to golden files | S-2, S-3 |
| **S-7** | **Application integration** | Point the SPA at the new backend | All 22 files / 102 call sites migrated; every view functions | S-4, S-5, S-6 |
| **S-8** | **Functional testing** | Verify behaviour parity | All P1/P2 tests pass ([TEST_PLAN](./TEST_PLAN.md)) | S-7 |
| **S-9** | **Performance testing** | Verify the new backend is not slower than PostgREST | T-ENV-13 (25 concurrent entries) passes; no query exceeds an agreed budget; index decisions justified by measurement | S-8 |
| **S-10** | **Security testing** | Verify no control was lost or widened | All P0 tests pass; RLS parity proven; anonymous paths denied; 5432 unreachable; no secrets in the bundle | S-8 |
| **S-11** | **Production data migration** | Move the real data | Row-count parity; `auth_id` mapping applied; `password` column dropped or neutralised; production data load verified | S-6, S-10, **BLK-3** (backup) |
| **S-12** | **DNS / deployment cutover** | Switch traffic | Frontend pointed at the new backend; credentials distributed; rollback window opens | S-11; § [Cutover timeline](#cutover-timeline) |
| **S-13** | **Monitoring** | Observe the new system | Availability, connections, slow queries, disk, backup success, TLS expiry, auth failures all observed and alerted | S-12 |
| **S-14** | **Rollback window** | Keep the old system viable | Supabase project retained read-only; a documented and **tested** procedure to return; window closed only on explicit decision | S-12 |

### Roadmap dependencies

```
S-0 (done)
 │
 ├─► S-1 ────────────────┐
 │                        │
 ├─► BLK-1 resolved ──► S-2 ──► S-3 ──► S-6
 │                        │            │
 │                        └──► S-4 ────┤
 │                              ▲      │
 │        identity decision ────┘      │
 │                                     │
 └─► S-5 ──────────────────────────────┤
                                       ▼
                                      S-7 ──► S-8 ──► S-9 ──┐
                                                          │
                                              S-10 ◄──────┘
                                                │
                                    BLK-3 ──► S-11 ──► S-12 ──► S-13
                                                          │
                                                          └──► S-14
```

`[INFERRED]` Two structural facts the diagram makes visible:

- **S-1 has no prerequisites.** VPS preparation and backup setup can begin immediately, in parallel
  with the blocking analysis. It is the only substantial stage that is unblocked today.
- **S-5 feeds S-7, not S-4.** The backend (S-4) must be *designed* around the identity decision, but
  it needs auth working before it can be *integrated*. Building S-4 before fixing the identity model
  means rewriting every endpoint's authorization.

---

## Blocking issues

Gates, not risks. Each must be cleared before its dependent stage can start.
Consolidated list: [MIGRATION_RISKS.md § Blocking issues](./MIGRATION_RISKS.md#2-blocking-issues).

| ID | Blocker | Blocks | Resolved by |
|---|---|---|---|
| **BLK-1** | Schema drift — repository SQL does not describe production | S-2 and everything after | Schema-only dump + reconciliation ([DATA_MIGRATION § 0](./DATA_MIGRATION_PLAN.md#0-prerequisite-close-the-schema-drift)) |
| **BLK-2** | Identity model undecided — the API cannot be designed without it | S-4, S-5, S-7 | Choose A/B/C ([RLS_MIGRATION § 2.1](./RLS_MIGRATION.md#21-what-role-switching-means-and-why-its-loss-matters-most)) |
| **BLK-3** | No proven restore path — there is no complete backup today | S-11, S-12, S-14 | [BACKUP_DR_PLAN § 10](./BACKUP_DR_PLAN.md#10-what-must-be-true-before-cutover) |
| **BLK-4** | Live RLS state unknown — `allow_all_library_visits` may still be active | S-2, S-10 | Enumerate `pg_policy` ([SECURITY_REVIEW SEC-04](./SECURITY_REVIEW.md#sec-04--a-permissive-anon-policy-may-still-grant-full-access-to-library_visits)) |
| **BLK-5** | No test harness and no golden files — report correctness is unpinnable after cutover | S-8, S-11 | [TEST_PLAN § 4](./TEST_PLAN.md#4-data-driven-testing-strategy) |
| **BLK-6** | No connection pooling plan | S-9, S-12 | [POSTGRES_ARCHITECTURE § 3.6](./POSTGRES_ARCHITECTURE.md#36-connection-pooling) |

---

## Cutover timeline

Assumes the "cut in one window" shape (S-12 as a single event). If the hybrid option is chosen
([POSTGRES_ARCHITECTURE option C](./POSTGRES_ARCHITECTURE.md#option-c--hybrid-transition)), several
of these steps repeat per phase and each phase has its own smaller timeline.

### T-7 days

| # | Action | Owner | Verification |
|---|---|---|---|
| 1 | **Freeze schema changes.** No DDL against Supabase from now until after cutover | — | Agreed in writing |
| 2 | **Take a full logical backup** of production (all 11 tables) | — | File exists; size sane; **not** on the VPS |
| 3 | **Restore that backup into a staging instance** | — | Row counts match (T-BAK-01) |
| 4 | **Run the full test suite against staging** | — | P0 + P1 green |
| 5 | **Print/prepare credential handover** — every user's password will change ([DATA_MIGRATION § 3.4](./DATA_MIGRATION_PLAN.md#34-do-not-dump-the-auth-schema)) | — | Comms drafted |
| 6 | **Notify users** of the upcoming window and the password reset | — | Message sent through the school's normal channel |
| 7 | **Lower DNS TTL** to 60 s on the application record | — | Verified via `dig` |
| 8 | **Verify backups are current and monitored** | — | Backup log reviewed |
| 9 | **Rehearse the rollback** on staging — actually perform it | — | Rollback completes within RTO |
| 10 | **Capture golden files** from the current system for every report/statistic | — | [TEST_PLAN § 4](./TEST_PLAN.md#4-data-driven-testing-strategy) |
| 11 | **Record the live RLS state** — `pg_policy` for all tables | — | Evidence saved (BLK-4) |

### T-1 day

| # | Action | Verification |
|---|---|---|
| 12 | Final full backup of production | File exists, offsite, restorable |
| 13 | Freeze **all** application writes — announce a read-only evening | Users informed |
| 14 | Confirm staging is green on the exact build that will go live | Test report |
| 15 | Confirm the new backend's configuration (env, secrets, TLS) | Config diff reviewed |
| 16 | Confirm monitoring is live on the new host | Alert test fires |
| 17 | Confirm the new host's disk has headroom for the load + WAL | `df -h` |
| 18 | Rehearse the data-migration script **on the staging copy** | Timing recorded |
| 19 | Rehearse the rollback again | Completes within RTO |
| 20 | Prepare the logo-cache decision (§ [Assets and the logo cache](#assets-and-the-logo-cache)) | Decision recorded |

### T-1 hour

| # | Action | Verification |
|---|---|---|
| 21 | Final delta backup / confirm no writes since T-1 day | Row counts unchanged, or the delta is captured |
| 22 | Enter maintenance mode on the SPA (or accept the brief window during the low-traffic period) | — |
| 23 | Stop writes to Supabase — **revoke the anon key's write access, or take the app offline** | Verify a write fails |
| 24 | Take the **final** production backup with writes stopped | ✅ **This is the rollback point** |
| 25 | Confirm all operators are on the call and have the runbook | Roll call |
| 26 | Confirm the rollback artifact is accessible to everyone who may need it | Access tested, not assumed |

⚠️ `[INFERRED]` **Step 23 is where downtime becomes unavoidable.** See
[Where downtime is unavoidable](#where-downtime-is-unavoidable).

### T-0 (cutover)

| # | Action | Verification |
|---|---|---|
| 27 | **Load the final backup into the new PostgreSQL VPS** | Row counts match source exactly (T-DATA-10) |
| 28 | Run the FK-orphan and integrity checks | Zero orphans (T-DATA-09) |
| 29 | Apply the `auth_id` mapping from old identities to new | Every user has a resolvable identity |
| 30 | Verify counts on every table | Automated comparison |
| 31 | **Provision credentials** — create accounts, generate initial passwords | Count matches the user list |
| 32 | Smoke test the API directly (not through the UI) | Auth, one read, one write per domain |
| 33 | Point the frontend at the new backend | Config change |
| 34 | **Smoke test through the UI** | Login → dashboard → input presensi → rekap → library |
| 35 | Verify **the logo renders** — sidebar, splash, PDF | § [Assets and the logo cache](#assets-and-the-logo-cache) |
| 36 | Verify reporting against the golden files | Identical output (T-RPT-01, T-RPT-03) |
| 37 | Verify a **write survives a reload** — not just a read | Critical: reads can pass while writes silently fail under RLS |
| 38 | Switch DNS (if applicable) | Propagation verified from an external resolver |
| 39 | Confirm monitoring shows healthy traffic on the new host | Dashboards |
| 40 | **Declare cutover complete; open the rollback window** | — |

⚠️ `[INFERRED]` **Step 37 is the most-skipped and most-important smoke test.** Under RLS, a
misconfigured identity makes `INSERT` fail *or* silently affect zero rows while `SELECT` continues
to work — so a read-only smoke test can pass on a system that cannot record attendance.

### Post-cutover

| Window | Action |
|---|---|
| **+0 to 2 h** | Watch monitoring continuously. Attend to user reports immediately |
| **+2 h** | Verify attendance entry worked for a real class, with a real teacher |
| **+24 h** | Verify a full school-day cycle: attendance entered, reports correct, library circulation working |
| **+72 h** | Verify a report generation and an export end-to-end |
| **+7 days** | Keep the Supabase project **read-only but live** — do not decommission yet |
| **+30 days** | Confirm backups have run and at least one has been **restored**; then decommission Supabase |
| **Ongoing** | Monitoring, restore tests per [BACKUP_DR_PLAN § 8.4](./BACKUP_DR_PLAN.md#84-restore-testing) |

### Rollback

| Trigger | Action |
|---|---|
| Login fails for all users, and the cause is not identified within 30 min | **Roll back** |
| Attendance writes silently do nothing (step 37 failed) | **Roll back** |
| Reports produce materially wrong numbers | **Roll back** |
| RLS is denied more broadly than intended (users blocked) | **Roll back**, or narrowly re-grant if the fix is certain |
| RLS is more permissive than intended (potential exposure) | **Do not roll back blindly** — the data may already be exposed. Stop, triage, and decide deliberately |
| Performance is unacceptable | Assess. Rollback is expensive; a targeted index usually beats it |

```
Rollback procedure (high level)

1. Revert the frontend to the previous deployment   (Vercel instant rollback — docs/deployment.md:39)
2. Re-enable writes on Supabase (reverse step 23)
3. Restore DNS to the previous target (if changed)
4. RECONCILE: writes made against the new system after cutover exist nowhere else
        ├── If none: done
        └── If some: export them and replay into Supabase, or accept the loss —
                      decide explicitly, do not discover it later
5. Keep the new system's data — do not destroy it; it may be the source for step 4
6. Post-mortem before retrying
```

🔴 **Step 4 is the hard part and the reason a rollback window is not free.**
Once the new system accepts writes, there are **two divergent datasets** and no automated
reconciliation exists. The window during which rollback is *cheap* is therefore:

```
T-0 ──────────── reads only ────────────► first production WRITE ──────► rollback becomes expensive
     └──── cheap rollback window ────────┘
```

`[INFERRED]` **Practical guidance:** perform the cutover at a time when the school will not need to
record attendance for several hours — a weekend, or an evening before a holiday. That keeps the
cheap-rollback window open and makes the decision about step 4 much easier, because there is
nothing to reconcile.

---

## Where downtime is unavoidable

The brief asks for zero/low downtime "where realistically possible". Honest answer:

| Phase | Downtime? | Why |
|---|---|---|
| S-1 … S-10 | **None** | All work happens on new infrastructure; production is untouched |
| S-11 (pre-cutover data load) | **None** | Loading a copy; production keeps serving |
| **S-12, steps 23–27 (freeze + final backup + load)** | 🔴 **Unavoidable** | A consistent final copy requires no writes. Without a quiescent source, the copy is not a snapshot — it is a moving target |
| S-12, steps 27–40 | ⚠️ **Minimisable** | Practice the load; most of it can be prepared in advance |
| S-13, S-14 | None | Observation only |

**Minimum realistic downtime:** the duration of freezing writes + taking the final backup +
restoring it + verifying + repointing.

`[INFERRED]` For a database of this size ([VPS_REQUIREMENTS § 2.2](./VPS_REQUIREMENTS.md#22-three-scenarios):
50 MB – 1.5 GB), the mechanical parts are fast. The **human** parts — verification steps 28–37 —
dominate, and they should not be rushed. A window of **2–4 hours** is a realistic planning figure;
it is a judgement, not a measurement.

### Can it be avoided entirely?

| Approach | Viable? | Why |
|---|---|---|
| **Logical replication** from Supabase to the VPS | ⚠️ Possible, requires `wal_level = logical` and a publication the operator may not be able to create | Would allow warm sync and a near-instant switch, at the cost of managing replication and cutover ordering |
| **Dual-write** from a modified frontend | ❌ Not viable | There is no seam ([SUPABASE_DEPENDENCIES § 6](./SUPABASE_DEPENDENCIES.md#6-the-missing-seam)); 102 call sites would each need dual-write logic, and consistency problems multiply |
| **Read-replica cutover** | ❌ Not available | Requires the ability to create a replica of the Supabase database |
| **Accept a brief read-only window** | ✅ **Realistic** | The application is used in bursts, not continuously. A window during a school holiday is close to zero-impact in practice |

`[INFERRED]` **Recommendation-shaped observation (not a recommendation):** given that this system is
used for daily attendance by a single school, a planned 2–4 hour window during a holiday period is
likely to be less risky than the complexity of logical replication — because replication adds
failure modes to the *cutover*, which is the moment you can least afford them. The operator decides.

---

## Assets and the logo cache

A specific, easy-to-miss cutover item, referenced from
[STORAGE_MIGRATION § 1.3](./STORAGE_MIGRATION.md#13-who-consumes-logo_url). It is called out
separately because it fails **visually and silently**, and because a stale cached value can persist
on users' devices for a long time.

### The problem

Three places hold the logo's location, and they are not all in the database:

| # | Holder | Value | Changed by |
|---|---|---|---|
| 1 | `app_settings.logo_url` | absolute public URL | a single-row `UPDATE` |
| 2 | `localStorage['app.logo_url']` (server-side) | a **cached copy** of #1, written by `stores/settings.js:41-45` | the settings store, on next successful fetch |
| 3 | `index.html:86-95` (inline `<script>`) | reads #2 **before any JavaScript runs** | — |

### Why it matters at cutover

```
Cutover happens
     │
     ├── app_settings.logo_url  → rewritten (or left pointing at the old origin)
     │
     └── localStorage['app.logo_url'] on every device → STILL THE OLD URL
              │
              └── on the next page load, the inline splash script injects
                  an <img src="<OLD URL>">
                       │
                       ├── If the old Supabase bucket still exists → logo appears.
                       │     The problem is INVISIBLE until the bucket is decommissioned.
                       │
                       └── If it has been removed → broken image on the splash,
                             and again on every load until the settings store
                             refreshes the cache. Users who never reopen the app
                             keep the stale value indefinitely.
```

`[INFERRED]` **The deferred-failure property is what makes this dangerous.** If the old Supabase
bucket is left running during the rollback window (which the plan recommends), everything looks
correct. The breakage appears weeks later, when the bucket is finally decommissioned — by which time
the cutover is long over, the cause is not obvious, and the symptom ("logo missing on some devices,
fine on others") looks like a browser bug.

### Options

| Option | `app_settings.logo_url` | Client cache | Assessment |
|---|---|---|---|
| **Custom domain in front of the new store** | unchanged | unchanged | ✅ **Cleanest.** The old URL keeps working; cache stays valid; the bucket can be decommissioned without any client noticing. Requires a stable hostname for the storage endpoint |
| Rewrite the column + change the cache key | rewritten | key renamed → refreshed | ✅ Effective. The renamed key makes every client re-fetch. Requires a coordinated change to `stores/settings.js` **and** `index.html` (two files, and the second is inline HTML with no module system) |
| Rewrite the column only | rewritten | **stale** | ⚠️ Works only while the old bucket lives. The deferred failure above |
| Leave the column pointing at Supabase | unchanged | unchanged | ⚠️ Retains a live Supabase Storage dependency — partially defeats the migration |

### Cutover checklist for this item

| # | Step | Verify |
|---|---|---|
| 1 | Decide the option **before T-0** (T-1 day, step 20) | Decision recorded |
| 2 | Migrate the object to the new storage | URL resolves, correct image |
| 3 | If rewriting: `UPDATE app_settings SET logo_url = <new> WHERE id = 1` | Single row |
| 4 | If renaming the cache key: update `stores/settings.js` **and** `index.html` together | Both files in the same commit |
| 5 | **Verify the cold-cache first load** — clear `localStorage`, load the app, watch the splash | Logo appears, or appears after the settings fetch. **Not** a broken image |
| 6 | Verify the sidebar/header logo | Present |
| 7 | Verify the dynamic favicon (`App.vue:14`) | Correct |
| 8 | **Verify the logo in all five PDF generators** — `pdfRekap`, `pdfRekapSemester`, `pdfPerpus`, `pdfKunjungan`, `pdfSirkulasi` | Present on each. ⚠️ **The most likely miss** — a missing image inside a generated PDF is not a visible UI error |
| 9 | **Defer decommissioning the old bucket until after the +30 day mark** | — |
| 10 | When decommissioning, **re-verify the splash on a cold cache** | No broken image |

⚠️ `[INFERRED]` **Step 8 deserves emphasis.** PDFs are generated entirely client-side
(`lib/pdf*.js`) from `app_settings.logo_url`. A stale URL produces a PDF that generates
**successfully** with a **missing** logo — no error, no toast, no console warning. It will be
noticed by whoever receives the report, long after the cutover, and will be misattributed.

---

## Communication plan

`[INFERRED]` Nothing in the repository addresses user communication. The following are consequences
of the findings, not policy choices.

| Audience | When | Message |
|---|---|---|
| **All users** | T-7 days | The system will be offline for a scheduled window. **Everyone's password will be reset** — each user receives a new temporary credential and must change it |
| **Admins** | T-7 days | They will need to distribute credentials and re-verify reports |
| **Admins** | T-1 day | Final reminder; writes freeze in the evening |
| **All users** | T-0, post-cutover | System is live; log in with the new credentials; report anything that looks wrong **immediately** |
| **Admins** | +24 h | Confirm a full school-day cycle worked; watch for report discrepancies |

🔴 **The password reset is unavoidable and must be communicated early.**

Emails are virtual (`<username>@minblora.id`, `auth.js:88`) and cannot receive mail, so there is no
self-service password reset and no bulk email path. Credentials must be distributed
**out-of-band** — printed, or handed over in person.

`[INFERRED]` This is a **user-facing, operationally significant** consequence of a decision that
looks purely technical. It is the item most likely to be discovered too late.

---

## Rollback window

| Aspect | Detail |
|---|---|
| **Opens** | The moment cutover is declared complete (T-0, step 40) |
| **Cheap window closes** | At the **first production write** to the new system |
| **Expensive window closes** | When the Supabase project is decommissioned |
| **Retention of the old system** | ≤ 30 days, read-only, not decommissioned |
| **Retention of the T-1h backup** | Until the +30 day decommission, then per backup retention |
| **Reconciliation required if** | Any write occurred after cutover |

### What must be true before the window closes

| # | Condition |
|---|---|
| 1 | A full school-day cycle has completed with real data |
| 2 | Attendance, reports, and library circulation verified by an actual user |
| 3 | All exports (PDF/Excel) verified, **including the logo** |
| 4 | At least one restore from the **new** system's backups has been performed and validated |
| 5 | Monitoring has run long enough to show no silent failures |
| 6 | No unresolved user reports |

`[INFERRED]` **Condition 4 is the one that tends to slip**, because it is the only item on the list
that does not involve the application and therefore does not feel urgent. After cutover, the
**new** system's backups are all that protect the data — and they are unproven until restored once.

---

## Go / no-go checklist

Immediately before step 23. Any "no" means **do not proceed**.

| # | Check | Criterion |
|---|---|---|
| 1 | BLK-1 schema drift resolved | ✅ |
| 2 | BLK-3 restore proven | ✅ T-BAK-01 + T-BAK-05 pass |
| 3 | BLK-4 live RLS state recorded | ✅ `pg_policy` evidence captured |
| 4 | BLK-5 golden files captured | ✅ from the current system |
| 5 | All P0 tests green | ✅ |
| 6 | Rollback rehearsed on staging | ✅ completes within RTO |
| 7 | Final backup taken and verified | ✅ offsite, restorable |
| 8 | Monitoring live on the new host | ✅ alert test fired |
| 9 | Operators available for the whole window | ✅ |
| 10 | Users notified | ✅ |
| 11 | Logo-cache decision made | ✅ § [Assets and the logo cache](#assets-and-the-logo-cache) |
| 12 | DNS TTL lowered | ✅ (if DNS changes) |
| 13 | Headroom on the new host | ✅ disk, connections |
| 14 | No writes can reach Supabase during the load | ✅ verified, not assumed |

---

## Summary

| Question | Answer |
|---|---|
| Is a zero-downtime cutover realistic? | ❌ **No** for this application. The final consistent copy requires a write-freeze |
| Where is downtime unavoidable? | **S-12, steps 23–27** — freeze + final backup + load. It is the only genuinely unavoidable window |
| Realistic window | **2–4 hours** `[INFERRED]` — human verification dominates, not data volume |
| Best timing | A school holiday or weekend evening, to keep the cheap-rollback window open |
| Largest hidden risk | **The logo cache** (§ [Assets and the logo cache](#assets-and-the-logo-cache)) — a visual failure that appears *after* decommissioning, not at cutover |
| Largest operational risk | Rollback reconciliation — once the new system takes writes, two datasets exist with no reconciliation tooling |
| Most-skipped critical step | **Step 37** — verifying a *write* survives reload, not just a read |
| Most-skipped critical prerequisite | **Restoring a backup before relying on it** (BLK-3) |
| Unavoidable user-facing consequence | **Every password changes.** Must be communicated at T-7 days, distributed out-of-band |
| Can stages S-1 … S-10 run without touching production? | ✅ **Yes.** Only S-11 onward touches production data |
| What can start today? | **S-1** (VPS + backups + monitoring) and the [TEST_PLAN](./TEST_PLAN.md) harness — neither is blocked |
