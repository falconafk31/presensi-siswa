# Storage Migration

**Phase 9 — Storage and file dependencies.**

**Answer: yes, the application uses Supabase Storage — minimally but on a critical display path.**

---

## 1. What is actually stored

### 1.1 The complete inventory

There is **one** bucket and **one** upload call site. That is the entire storage surface.

| ID | Item | Evidence |
|---|---|---|
| ST-01 | Bucket **`assets`**, `public = true` | `supabase/03_storage.sql:7-9` |
| ST-02 | Object path convention: `logo/logo-<timestamp>.<ext>` | `src/views/PengaturanView.vue:119` — `` `logo/logo-${Date.now()}.${ext}` `` |
| ST-03 | Upload call — the **only** write to storage | `PengaturanView.vue:121` — `supabase.storage.from('assets').upload(path, file, { upsert: true })` |
| ST-04 | URL construction — the **only** read of storage metadata | `PengaturanView.vue:123` — `supabase.storage.from('assets').getPublicUrl(path)` |
| ST-05 | Persisted URL column | `app_settings.logo_url` (`01_schema.sql:116`); the whole settings row is upserted at `PengaturanView.vue:101` |
| ST-06 | Four bucket policies | `03_storage.sql:12-31` |

### 1.2 Everything the brief asked about — answered

| Question | Answer | Evidence |
|---|---|---|
| Supabase Storage used? | **Yes** | ST-03, ST-04 |
| Public buckets? | **Yes** — `assets`, `public = true` | `03:7-9` |
| Private buckets? | **No** — no other bucket is created anywhere in the repository | grep: `insert into storage.buckets` appears once, `03:7` |
| Signed URLs? | **No** — `createSignedUrl` appears zero times | grep |
| Avatars? | **No** | grep: no avatar code, no `profile` upload |
| Documents? | **No** | grep |
| PDFs? | **No — PDFs are generated in the browser and never uploaded.** `jspdf` writes to a download; there is no upload path | `lib/pdfRekap.js`, `pdfPerpus.js`, `pdfKunjungan.js`, `pdfSirkulasi.js`, `pdfRekapSemester.js` |
| Images? | **Yes — exactly one: the school logo** | ST-02 |
| Attachments? | **No** | grep |
| Bulk file operations? | **No** — no `list()`, no `remove()`, no `download()`, no `copy()`, no `move()` | grep |

`[INFERRED]` Four of the five PDF generators (`pdfRekap`, `pdfPerpus`, `pdfKunjungan`,
`pdfSirkulasi`, `pdfRekapSemester`) *embed* the logo URL into generated documents, but they read it
from `app_settings.logo_url` — a database column — not from the Storage API. So **Storage is on the
critical path for report generation indirectly**, through that one column.

### 1.3 Who consumes `logo_url`

The URL is read in six places. This is why URL stability matters more than the file itself.

| Consumer | Location | How |
|---|---|---|
| Settings store | `src/stores/settings.js:20` | Loaded into `settings.value.logo_url` |
| Boot splash | `index.html:86-95` | Inline script reads `localStorage['app.logo_url']` — **a cached copy** |
| Logo cache writer | `src/stores/settings.js:41-45` | `localStorage.setItem('app.logo_url', logo)` |
| Dynamic favicon | `src/App.vue:14-…` | Watches `settingsStore.settings?.logo_url` |
| Sidebar / header | `AppLayout.vue` | Renders the logo |
| PDF letterhead | `lib/pdfRekap.js`, `pdfPerpus.js`, `pdfKunjungan.js`, `pdfSirkulasi.js`, `pdfRekapSemester.js` | Embedded into generated reports |
| Settings preview | `PengaturanView.vue:~410` | `<img :src="form.logo_url">` |

`[INFERRED]` **The boot splash is the interesting one.** `index.html:90` reads a *cached* URL from
`localStorage` before any JavaScript runs — including before settings are fetched. If the storage
origin changes, then on the first load after migration:

1. the cached `app.logo_url` still points at the **old** origin;
2. the splash renders a broken image (or times out) until `settings.js` refreshes and overwrites
   the cache;
3. users who never reopen the app keep the stale URL indefinitely.

This must be handled explicitly in the cutover —
see [CUTOVER_PLAN.md](./CUTOVER_PLAN.md#assets-and-the-logo-cache).

---

## 2. Current policies, and what is wrong with them

`supabase/03_storage.sql:12-31` installs four policies on `storage.objects`:

| Policy | Operation | `TO` | Predicate | Assessment |
|---|---|---|---|---|
| `assets_public_read` | SELECT | `public` | `bucket_id = 'assets'` | ✅ Intended — the logo must be publicly readable |
| `assets_anon_write` | INSERT | **`anon`, `authenticated`** | `bucket_id = 'assets'` | 🔴 **Anyone may upload** |
| `assets_anon_update` | UPDATE | **`anon`, `authenticated`** | `bucket_id = 'assets'` | 🔴 **Anyone may overwrite** |
| `assets_anon_delete` | DELETE | **`anon`, `authenticated`** | `bucket_id = 'assets'` | 🔴 **Anyone may delete** |

`[REPO]` The SQL file itself labels this *"OPSI A"* (`03_storage.sql:11`). The repository
acknowledges the risk in two places:

- `docs/database.md:103` — *"siapa pun yang tahu endpoint bisa menulis ke bucket ini"* ("anyone who
  knows the endpoint can write to this bucket"), described as an accepted risk with a plan to
  tighten.
- `SECURITY.md:26` — *"policy tulis saat ini terbuka untuk anon ('OPSI A' di `03_storage.sql`) —
  risiko yang diterima sementara"*.

**Why `TO anon` is equivalent to "anyone on the internet":** the anon key is embedded in the
frontend bundle by design — `SECURITY.md:25` states this is normal for the architecture, and
`docs/deployment.md:33` instructs deployers to add `VITE_SUPABASE_ANON_KEY` as a build-time
environment variable, meaning it is compiled into `dist/assets/*.js` and served to every visitor.
`[INFERRED]` Extracting it requires no more than opening browser devtools. Combined with
`assets_anon_delete`, **any visitor can delete the school's logo**, breaking every PDF letterhead,
the sidebar, and the splash until an admin re-uploads.

`[INFERRED]` This is a **pre-existing** finding, not a migration defect. But it is squarely in
scope as a control to rebuild: a replacement storage system must not reproduce open anonymous
write, and the migration is the cheapest moment to close it.

---

## 3. Why this cannot be done with PostgreSQL

| Requirement | PostgreSQL VPS provides |
|---|---|
| Store an opaque binary blob | ⚠️ Technically yes (`bytea` / large objects) — with serious cost |
| Serve it over HTTP with cache headers | ❌ **No.** PostgreSQL speaks its own wire protocol |
| Produce a durable public URL | ❌ No |
| CDN/edge caching for the splash image | ❌ No |
| Lifecycle, versioning, signed URLs | ❌ No |
| Serve the URL before JS boots (splash) | ❌ No — the URL must be a plain HTTP GET |

**Do not store the logo in the database.** `[INFERRED]` Although `bytea` would technically work,
each PDF generation and each page load would stream the image through the database connection —
competing with the queries in [VPS_REQUIREMENTS.md](./VPS_REQUIREMENTS.md) for connections and
bandwidth — and the splash's inline `<script>` could not address it. PostgreSQL is the wrong tool
for object delivery.

---

## 4. Replacement architecture

The brief's suggested shape applies directly:

```
Application (Vue 3 SPA)
   │
   ├──► PostgreSQL on VPS          ← relational data (11 tables)
   │
   ├──► Object storage             ← the logo (1 object type, 1 bucket)
   │        └── S3-compatible API, served over HTTPS
   │
   └──► Auth service / backend     ← identity + sessions
```

### 4.1 Options for the object-storage component

The brief says not to select a provider unless repository evidence requires it. `[INFERRED]` The
repository contains **no** provider preference, no S3 client, no storage abstraction — so no
evidence forces a choice. The options are presented without ranking, per
[POSTGRES_ARCHITECTURE.md](./POSTGRES_ARCHITECTURE.md).

| Option | Shape | Notes |
|---|---|---|
| **S3-compatible object storage** (self-hosted: MinIO; managed: any S3-compatible provider) | Bucket `assets`, public-read prefix or CDN in front | Preserves the "public URL" model with least change. MinIO is self-hostable on the same VPS, which keeps the "self-hosted" goal intact |
| **Serve from the web server** | Static files under a directory served by nginx/Caddy on the VPS | Simplest possible; adequate for one logo. Loses object-storage durability, versioning, and offsite replication — a backup strategy must cover the directory |
| **Keep Supabase Storage only** | Leave the bucket on Supabase, move only the database | ⚠️ Hybrid. Retains a live Supabase dependency and its anon key, which partially defeats the purpose. Legitimate only as a transition step |
| **Store on the app host (Vercel)** | Static asset in the frontend repo | ❌ Not viable — the file would need a redeploy to change, and `app_settings.logo_url` is database-driven |

### 4.2 What the replacement must provide

Regardless of option, these behaviours are depended upon today and must be preserved:

| # | Requirement | Today's source | Why |
|---|---|---|---|
| ST-R-1 | **Public HTTPS URL, long-lived, no auth** | `getPublicUrl()` `PengaturanView.vue:123` | The URL is stored in the database and embedded in PDFs |
| ST-R-2 | **Stable origin (or a rewrite plan)** | implicit | `app_settings.logo_url` + `localStorage['app.logo_url']` hold absolute URLs (§ 1.3) |
| ST-R-3 | **Write restricted to admins** | ⚠️ Currently **not** provided | See § 2. The replacement must authenticate and authorize uploads |
| ST-R-4 | **Overwrite/upsert semantics** | `{ upsert: true }` `:121` | New uploads use timestamped paths, so true overwrite is not strictly needed — timestamp naming already makes each upload unique |
| ST-R-5 | **File-size ceiling** | not enforced anywhere `[REPO]` | The repo has no upload size limit; `docs/performance.md:57` lists *"Kompresi logo saat unggah"* (client-side resize to ~256×256 WebP) as an unstarted backlog item |
| ST-R-6 | **Content-type handling** | inferred from file extension at `:119` | `file.name.split('.').pop()` — the extension is taken from the client filename |
| ST-R-7 | **Cache headers** | Supabase Storage defaults `[UNKNOWN for live config]` | The logo is loaded on every page; `vercel.json` sets immutable caching for `/assets/*` **build assets**, not for the logo |
| ST-R-8 | **Old-logo cleanup** | ❌ **None** | `[INFERRED]` Each upload writes a new timestamped path and never deletes the previous object. Orphaned logos accumulate |

`[UNKNOWN — REQUIRES LIVE SUPABASE INSPECTION]` for ST-R-7 and for the actual number of objects in
the bucket. Query with `SELECT count(*), sum((metadata->>'size')::bigint) FROM storage.objects WHERE bucket_id = 'assets';`

### 4.3 Migration of the object itself

`[INFERRED]` The object payload is trivial: **one image file**, most likely a few hundred kilobytes.
A `supabase storage cp`/`download` of the bucket, or a single GET of the public URL, captures it.

The harder part is the **reference**, not the file:

```
app_settings.logo_url  ──►  absolute URL pointing at the old origin
        │
        ├── must be rewritten to the new origin
        ├── OR the new origin must be presented under the old URL (custom domain / proxy)
        └── AND localStorage['app.logo_url'] must be invalidated on clients (§ 1.3)
```

| Approach | Effect on `app_settings.logo_url` | Effect on cached clients |
|---|---|---|
| Custom domain in front of new storage | **No data change** | Cache stays valid — cleanest |
| Rewrite the column during data migration | One `UPDATE` per row (1 row) | **Stale cache persists** until settings refresh; splash shows a broken image meanwhile |
| Rewrite column + change the client-side cache key | One `UPDATE` | Old key orphaned; splash shows no logo (neutral, not broken) for one load |

`[INFERRED]` Because `app_settings` is a singleton, the data change is a single-row update — not a
scaling concern. The client cache invalidation is the part that needs a deliberate decision.

---

## 5. Storage migration checklist

Nothing here was executed.

1. **Enumerate the live bucket.** `SELECT name, id, public, file_size_limit, allowed_mime_types FROM storage.buckets;` and count objects in `assets`. Resolve ST-R-7 and the object count.
2. **Verify the live policies on `storage.objects`.** Confirm `assets_anon_*` are still present and whether any others exist.
3. **Download the object(s).** One logo, or however many orphaned versions exist (ST-R-8).
4. **Choose the storage component** (§ 4.1).
5. **Provision the bucket/prefix** and set the access model — **public read, admin-only write** (ST-R-3). Do not reproduce `TO anon` write policies.
6. **Decide URL stability** (§ 4.3): custom domain, column rewrite, or both.
7. **Apply the URL change** — single-row `UPDATE` on `app_settings`, plus a client-cache decision.
8. **Implement the upload path** in the new backend: authenticated, admin-authorized, size- and type-validated (ST-R-5, ST-R-6).
9. **Implement `getPublicUrl` equivalent** returning the new origin.
10. **Verify the logo appears in:** sidebar, splash (including the cold-cache first load), dynamic favicon, settings preview, and **all five PDF generators** — the last of these is the one most likely to be missed, because the failure is a missing image inside a generated document rather than a visible UI error.
11. **Verify anonymous write is rejected** with a 401/403, from a session-less client.
12. **Add lifecycle/retention for orphaned objects** or accept unbounded growth explicitly (ST-R-8).

---

## 6. Summary

| Aspect | Finding |
|---|---|
| Storage surface | **1 bucket, 1 upload site, 1 object type** — the smallest possible footprint |
| Complexity | **Low.** Nothing about the object migration is hard |
| Risk concentration | **Entirely in the reference**: `app_settings.logo_url` stores an absolute URL that is also cached in `localStorage` and baked into the splash's inline script |
| Security finding | 🔴 Bucket write is open to `anon`; the anon key is public by design — **anyone can upload, overwrite, or delete the school logo** |
| PostgreSQL suitability | ❌ **Not suitable.** PostgreSQL cannot serve public HTTP object URLs |
| Recommended posture | Public-read object storage + authenticated admin-only write + URL stability decision |
| Blocker for the overall migration? | **No.** This is an independent workstream that can proceed in parallel or be deferred to a transition phase |
