# Backup & Disaster Recovery Plan

**Phase 16 — backup / disaster recovery design.**

> **DESIGN ONLY. No backup was taken. No restore was performed. No production command was executed.**
> No WAL was archived, no snapshot created, no `pg_dump` run against any database.

---

## 1. What exists today

| Layer | Today | Adequacy |
|---|---|---|
| **Database backup** | Supabase managed backups — `[UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION]` tier, retention, and PITR status | ❓ Unverifiable from the repository |
| **Application-level "backup"** | A menu button that exports `.xlsx` | ❌ **Not a backup.** See § 1.1 |
| **Storage backup** | `[UNKNOWN]` — presumably none | ❓ |
| **Restore procedure** | **None documented anywhere** | 🔴 **None** |
| **Restore test** | **Never mentioned** | 🔴 **None** |
| **Offsite copy** | **Not mentioned** | 🔴 **None** |
| **Encryption of backups** | Not mentioned | 🔴 **None** |

`[REPO]` `SECURITY.md:37` is the only operational guidance offered:
*"Backup database berkala dari dashboard Supabase (terpisah dari backup JSON aplikasi)"* —
"Regular database backups from the Supabase dashboard (separate from the application's JSON
backup)." That is where today's responsibility ends.

### 1.1 ⚠️ The application's "backup" button is not a backup

`src/views/PengaturanView.vue:340-405` (`jalankanBackup()`) exports an `.xlsx` workbook. It is
labelled **"Backup"** in the UI and logs `aksi: 'backup_database'` (`:401`).

What it actually exports — **four of eleven tables**:

| Sheet | Source | Line |
|---|---|---|
| Siswa | `students` (NISN, Nama, JK, Kelas, Status, Aktif, Tgl Masuk) | `:351, :360-365` |
| Guru | `users` (Username, Nama, Role, NIP, Wali Kelas) | `:352, :367-372` |
| Buku | `books` (Judul, Pengarang, Penerbit, Tahun, ISBN, Stok, Kategori) | `:353, :374-379` |
| Log Aktivitas | `activity_logs`, **`.limit(1000)`** (`:354`) | `:354, :381-388` |

**Not exported at all:** `attendance_logs`, `book_loans`, `library_visits`, `class_history`,
`academic_calendar`, `academic_periods`, `app_settings`.

| Property of a real backup | This export |
|---|---|
| Complete | ❌ 4 of 11 tables; zero attendance data |
| Restorable | ❌ **No import path exists.** `SiswaView` and `GuruView` have Excel import, but they are *business* importers, not restore tools — different columns, different validation, and they cannot recreate attendance |
| Consistent (single point in time) | ❌ Four independent queries with no transaction or snapshot |
| Encrypted | ❌ Plain `.xlsx` |
| Stored offsite | ❌ Downloaded to the operator's workstation |
| Verified | ❌ Never tested |
| Retained per policy | ❌ Undefined |

`[INFERRED]` **The practical implication is severe and worth stating plainly: there is currently no
way to restore this system's attendance data, library circulation, or class history from anything.**
If the Supabase project were lost, the Excel export would not rebuild it. This is a **pre-existing
gap**, not a migration consequence — but a migration is the moment it becomes unacceptable, because
the migration itself is the highest-risk event the database has experienced.

**It is also a required prerequisite.** [CUTOVER_PLAN.md](./CUTOVER_PLAN.md) cannot offer a rollback
window without a working restore path.

---

## 2. Objectives (RPO / RTO)

`[INFERRED]` **These are proposals, not requirements.** No availability or data-loss tolerance is
stated anywhere in the repository, and the appropriate values depend on how the school uses the
system — which the operator must decide.

| Objective | Proposal | Rationale |
|---|---|---|
| **RPO** (max tolerable data loss) | **≤ 1 hour** | Attendance is entered daily by teachers. Losing a day means re-entry across 12 classes. Losing an hour is recoverable without asking teachers to redo work |
| **RTO** (max tolerable downtime) | **≤ 4 hours** | The system is used in bursts (morning attendance entry, month-end reports), not continuously. A few hours is survivable if planned |
| **Backup retention** | **Daily × 30, weekly × 12, monthly × 12** | Covers "we noticed the corruption three weeks later", the most common recovery scenario |
| **Restore test frequency** | **Quarterly, minimum** | A backup that has never been restored is a hypothesis |

`[INFERRED]` **If real downtime tolerance is lower than RTO 4 h, the design changes materially** —
it would justify a warm standby, which roughly doubles operational surface. Do not commit to a
tighter RTO without a corresponding budget for running a standby.

---

## 3. Backup layers

Three complementary layers. Each covers a failure the others do not.

```
┌──────────────────────────────────────────────────────────────────────┐
│ LAYER 1 — Logical (pg_dump)                                          │
│   · Portable, human-inspectable, version-independent                 │
│   · Slow to restore; large for the data volume here (still tiny)     │
│   · Protects against: accidental DELETE, bad migration, operator error│
├──────────────────────────────────────────────────────────────────────┤
│ LAYER 2 — Physical + WAL archiving                                   │
│   · pg_basebackup + continuous WAL to object storage                 │
│   · Enables PITR: restore to any instant, e.g. "1 minute before the  │
│     bad UPDATE"                                                      │
│   · Protects against: everything Layer 1 does, with RPO ≈ 0          │
├──────────────────────────────────────────────────────────────────────┤
│ LAYER 3 — Offsite replication                                        │
│   · Backups copied to a different provider/region                    │
│   · Protects against: VPS provider loss, account loss, ransomware,   │
│     accidental deletion of the primary backup location               │
└──────────────────────────────────────────────────────────────────────┘
```

`[INFERRED]` **Layer 3 is the one most often omitted and the one that matters most here.** A
single VPS is a single point of failure, and backups stored *on* that VPS share its fate — including
its compromise.

---

## 4. Layer 1 — `pg_dump`

### 4.1 What to dump

| Target | Command shape | Frequency |
|---|---|---|
| Schema + data | `pg_dump --format=custom --no-owner --no-privileges --schema=public` | Daily |
| Schema only (for diffing) | `pg_dump --schema-only --schema=public` | On every schema change |
| Globals (roles) | `pg_dumpall --globals-only` | On role changes |
| **`auth` schema** | ❌ **Never** — contains password hashes ([DATA_MIGRATION § 3.4](./DATA_MIGRATION_PLAN.md#34-do-not-dump-the-auth-schema)) | — |

`[INFERRED]` Use `--format=custom` (or `--format=directory` with `-j` for parallelism). The
directory format allows parallel restore and selective table restore — valuable when recovering a
single table after a mistake.

⚠️ **`--no-owner --no-privileges` matters here.** Live ownership references Supabase roles that will
not exist on the target. Restoring ownership statements would fail or create misleading grants.

### 4.2 Properties

| Property | Approach |
|---|---|
| **Consistency** | `pg_dump` takes a consistent snapshot via `REPEATABLE READ`, so it is transaction-consistent even while the application writes. Not an issue at this data volume |
| **Compression** | Default for custom format; the data is ~50 MB – 1.5 GB uncompressed ([VPS_REQUIREMENTS § 2.2](./VPS_REQUIREMENTS.md#22-three-scenarios)) — compression is cheap and effective on text-heavy tables |
| **Encryption** | 🔴 **Required.** See § 7 |
| **Verification** | Restore into a scratch database, compare row counts. **Not** `pg_restore --list` alone — listing proves the file parses, not that it is usable |
| **Retention** | § 2 |

---

## 5. Layer 2 — physical backups + PITR

### 5.1 The mechanism

```
PostgreSQL
   │
   ├── archive_mode = on
   ├── archive_command / archive_library  →  copies each WAL segment away
   ├── wal_level = replica (or logical)
   └── continuous archiving  →  WAL segments in remote storage
                    │
                    ▼
        base backup (pg_basebackup) + WAL segments
                    │
                    ▼
        restore = base backup + replay WAL to a target time
```

### 5.2 What PITR buys, concretely for this schema

`[INFERRED]` Three realistic scenarios where PITR is the only adequate answer:

| Scenario | Layer 1 (daily dump) | Layer 2 (PITR) |
|---|---|---|
| **An admin uses the "Reset Absensi" maintenance function** (`PengaturanView.vue:276`) and deletes every attendance row | ⚠️ Recovers to last night — **loses the day's work** | ✅ Recovers to 30 seconds before the click |
| An admin runs class promotion (`PengaturanView.vue:175`) on the wrong period, modifying every student | ⚠️ Same | ✅ Same |
| A bad data migration corrupts `attendance_logs` mid-run | ⚠️ Same | ✅ Same |
| Disk failure | ✅ Adequate | ✅ Adequate |
| Operator error weeks ago, noticed now | ✅ Adequate (within 30 days) | ⚠️ Only if WAL retained that long |

⚠️ **The first three scenarios are not hypothetical.** The application ships destructive admin
functions behind a typed-confirmation dialog (`PengaturanView.vue:268-276`) — the confirmation
reduces accidental use but does not make it reversible. **PITR is the only thing that makes those
buttons safe.**

### 5.3 Configuration notes

| Setting | Value | Note |
|---|---|---|
| `wal_level` | `replica` minimum | `logical` only if logical replication or decoding is needed |
| `archive_mode` | `on` | ⚠️ Requires a restart |
| `archive_command` | `test ! -f … && cp %p …` — or an archive library | Must be **idempotent and never lose a segment**; a failing archive command causes WAL to accumulate and eventually fills the disk |
| `archive_timeout` | e.g. `300` | Bounds RPO on a low-write database. ⚠️ **Important here:** this application can be idle for hours (nights, weekends), and a partial WAL segment is not archived until it fills or the timeout fires |
| `wal_keep_size` / retention | Sized to the retention window | WAL retention determines the PITR window |
| Base backup frequency | Daily, offset from the `pg_dump` | PITR needs a starting point |

`[INFERRED]` ⚠️ **`archive_timeout` deserves specific attention for this workload.** A low-traffic
school system may write almost nothing overnight, so without a timeout the PITR window could lag by
hours during exactly the period when nobody is watching. Setting it to a few minutes trades a
little storage for a bounded RPO.

### 5.4 A simpler alternative worth considering

`[INFERRED]` For a database of this size, a managed PostgreSQL provider's PITR, or a
backup tool that handles WAL shipping and retention as a unit, delivers Layer 2 with far less
operational surface than hand-configured archiving. It is presented as an option, not a
recommendation — and it trades "self-hosted" purity for a guarantee that is actually exercised.

---

## 6. Layer 3 — offsite

| Requirement | Detail |
|---|---|
| **Different provider or region** | From the VPS. Anything on the same account or host shares its failure modes |
| **Immutable / object-lock** | Object-lock or write-once storage prevents a compromised host from deleting the backups — a ransomware-resistant posture |
| **Credentials scoped to write-only** | The VPS should be able to **push** backups and **not delete** them |
| **Include storage objects** | The logo ([STORAGE_MIGRATION.md](./STORAGE_MIGRATION.md)) — small, but if it is lost, every PDF letterhead and the splash lose the logo |
| **Include configuration** | `postgresql.conf`, `pg_hba.conf`, roles, systemd units, Caddy/nginx config, TLS material, and the deployment manifest. **Restoring a database without the configuration around it is half a recovery** |
| **Test restoration from offsite only** | The real test is restoring **without** the primary host's cooperation |

`[INFERRED]` **The most important offsite property is that the VPS cannot destroy the backups.** A
backup strategy where the production host holds delete credentials protects against disk failure
and nothing else.

---

## 7. Backup encryption and secrets

| Item | Requirement |
|---|---|
| **Encryption at rest** | ✅ Required. Backups contain student PII: `students.nama`, `nisn`, `tanggal_lahir`, `tempat_lahir` ([DATA_MIGRATION § 8.2](./DATA_MIGRATION_PLAN.md#82-handling-rules)) |
| **Encryption in transit** | ✅ Required for any off-host leg |
| **Key storage** | 🔴 **Separate from the backups.** A key stored beside its ciphertext is not a control |
| **Key rotation** | Document a procedure; rotating without a tested restore path risks losing the ability to read old backups |
| **Access control** | Restore-capable access should be rare and audited |
| **Retention of keys** | ⚠️ **Outlive the backup retention window.** Deleting a key silently destroys every backup it encrypted |

`[INFERRED]` Encryption is straightforward (`pg_dump | age`/`gpg`, or client-side encryption at the
object store). **Key custody is the part that decides whether the backups are actually recoverable**,
and it is the part most often left implicit.

---

## 8. Restore procedures

> Documentation only. **Not executed.**

### 8.1 Full restore from a logical dump

```
1. Provision a clean PostgreSQL instance (or a scratch database on the same host)
2. Create the roles the schema expects (see § 5.5 of DATA_MIGRATION_PLAN — grants have no precedent)
3. pg_restore --no-owner --no-privileges --dbname=<target> <dump>
4. Apply the post-load steps: constraints validated, indexes built, RLS enabled  ← ORDER MATTERS
5. Re-apply grants
6. Verify with the validation queries in DATA_MIGRATION_PLAN § 9.1
7. Repoint the backend
```

⚠️ `[INFERRED]` **Step 4's ordering is the same trap as the initial migration.** A dump restored
with RLS already enabled and identity not yet wired inserts nothing into tables the restore role
does not own. Restore **as the owner**, then enable RLS.

### 8.2 PITR restore

```
1. Restore the most recent base backup into a fresh data directory
2. Configure recovery: recovery_target_time = '<instant before the incident>'
                       restore_command        = '<fetch WAL from archive>'
3. Start PostgreSQL in recovery; it replays WAL and stops at the target
4. Promote
5. Verify; then repoint, or extract only the affected rows and copy them across
```

`[INFERRED]` **Prefer extraction over full promotion when possible.** For SEC-04-style incidents or
a mistaken single-table delete, recovering into a *separate* instance and copying the affected rows
across avoids overwriting unrelated changes made since. This is the difference between a surgical
recovery and an outage.

### 8.3 Partial restore (single table)

| Situation | Method |
|---|---|
| Table dropped or corrupted | `pg_restore --table=<name>` from a custom/directory dump |
| Rows mistakenly deleted, cause known | PITR into a scratch instance, copy the rows back |
| Rows mistakenly deleted, cause unknown | Full PITR; treat as an incident |

### 8.4 Restore testing

**This is the deliverable that turns a backup plan into a backup capability.**

| Test | Frequency | Method | Pass criterion |
|---|---|---|---|
| **T-R1** Logical restore | Monthly | `pg_restore` into a scratch DB | All 11 tables present; row counts match source |
| **T-R2** PITR restore | Quarterly | Restore to a point 1 h in the past | Opens read-only; data matches that instant |
| **T-R3** Offsite-only restore | Quarterly | Restore using **only** offsite artefacts | Succeeds without the primary host |
| **T-R4** Encryption round-trip | Quarterly | Decrypt + restore a backup whose key has been retrieved from custody | Succeeds |
| **T-R5** Timing | Each of the above | Measure wall-clock | Meets the RTO in § 2 |
| **T-R6** Application validation | After T-R1/T-R2 | Point a staging frontend at the restored DB | Login, dashboard, presensi, rekap, library all work |

`[INFERRED]` ⚠️ **T-R6 is the test that proves the backup is usable, and it is the one usually
skipped.** Row-count parity can pass while the restore is useless — for example if `users.auth_id`
values no longer resolve, every user is locked out ([DATA_MIGRATION § 2.1](./DATA_MIGRATION_PLAN.md#21-the-one-row-that-cannot-be-migrated-honestly))
and the backup is technically complete but operationally worthless.

---

## 9. Failure scenarios and responses

| # | Scenario | Detection | Response | RPO | RTO |
|---|---|---|---|---|---|
| F-1 | Accidental data deletion via the admin UI or SQL | Report/log discrepancy | PITR into a scratch instance; copy affected rows back | seconds | ~1 h |
| F-2 | Bad migration corrupts data | Validation queries | Full PITR to before the migration | seconds | 1–4 h |
| F-3 | Disk full / corruption | Monitoring | Restore from base backup + WAL | ≤ WAL lag | 1–4 h |
| F-4 | VPS lost entirely | Monitoring | Provision a new VPS; restore offsite; repoint DNS | ≤ 1 h (last offsite copy) | 4–8 h |
| F-5 | VPS provider outage | Monitoring | Same as F-4, into a different provider | ≤ 1 h | 4–8 h |
| F-6 | Ransomware / compromise | Anomalies, locked files | Restore into a **clean** host from **immutable** backups. **Rotate every secret** — DB, JWT, storage, SSH | ≤ 1 h | 8 h+ |
| F-7 | Backup job silent failure | Backup monitoring | Fix; restore from the last known-good; **audit how long it was failing** | unknown | — |
| F-8 | Storage objects lost | Broken logo | Restore from the offsite copy of the storage bucket | — | minutes |
| F-9 | TLS certificate expired | External probe | Renew and reload | none | minutes |

`[INFERRED]` **F-7 is the most dangerous category**, because a backup that fails quietly produces a
false sense of security. Its mitigation is monitoring **backup success specifically** — the absence
of a failure alert is not the presence of a backup. → [TEST_PLAN.md](./TEST_PLAN.md).

---

## 10. What must be true before cutover

Gating items for [CUTOVER_PLAN.md](./CUTOVER_PLAN.md). None are satisfied today.

| # | Requirement | Status today |
|---|---|---|
| 1 | A **complete** logical backup exists (all 11 tables) | ❌ Only the 4-table `.xlsx` export exists |
| 2 | A restore into a scratch instance has been **performed and verified** | ❌ Never done |
| 3 | Backup automation is scheduled and **monitored** | ❌ Does not exist |
| 4 | Backups are encrypted, with the key held separately | ❌ Not implemented |
| 5 | An offsite copy exists, on a different provider | ❌ Not implemented |
| 6 | PITR is enabled (or explicitly, knowingly declined) | ❓ Supabase tier `[UNKNOWN]`; not implemented anywhere else |
| 7 | RPO and RTO are **agreed by the operator**, not assumed | ❌ § 2 values are proposals |
| 8 | A restore runbook exists and has been walked through | ❌ Does not exist |
| 9 | The storage bucket is backed up too | ❌ |
| 10 | Configuration (not just data) is captured | ❌ |

🔴 **Item 2 is the hard blocker.** Until a restore has actually been performed, *"we have backups"*
is an untested assumption, and the rollback window in the cutover plan
([CUTOVER_PLAN.md § Rollback](./CUTOVER_PLAN.md#rollback)) cannot be honestly offered.

---

## 11. Summary

| Aspect | Assessment |
|---|---|
| Backups today | ⚠️ Managed by Supabase at an unknown tier; **the application's own "backup" is a 4-of-11-table `.xlsx` with no import path** |
| Can the system be restored today? | ❌ **Not from anything in this repository** |
| Data volume to protect | 🟢 50 MB – 1.5 GB — trivially small, cheap to back up thoroughly |
| PITR justified? | ✅ **Yes.** The application ships destructive admin functions (`PengaturanView.vue:276-323`) that only PITR can undo |
| Offsite required? | ✅ **Yes** — a single VPS is a single point of failure |
| Encryption required? | ✅ **Yes** — backups contain student PII |
| Biggest risk | **A backup that has never been restored.** Test T-R1 is the single most valuable action available |
| Effort relative to the migration | 🟢 **Low, and it is the highest-leverage work in the whole project** — because it is also the precondition for a safe cutover and a credible rollback |
| Must it precede the migration? | ✅ **Yes.** See § 10. This is a blocking prerequisite, not a parallel workstream |
