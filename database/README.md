# Database

**Status:** Phase 2 complete and verified against MySQL 8.0.46 on 2026-11-15. Phase 3
(authentication, CRUD APIs and business services) has not started.

This directory contains the approved 12-table schema plus the read-only
`v_asset_history` view. The schema is deliberately small and enforces the allocation and
maintenance uniqueness rules with stored generated columns and unique indexes.

## Files

| File                        | Purpose                                                        |
| --------------------------- | -------------------------------------------------------------- |
| `database/schema.sql`       | Destructive recreate of the 12 tables and `v_asset_history`    |
| `database/seed.sql`         | Deterministic rerunnable seed snapshot                         |
| `database/verify.sql`       | Failure-only static audits; a clean run returns no rows        |
| `server/src/db/seed.js`     | Parameterised seed generator and runner                        |
| `server/src/db/timezone.js` | Converts `APP_TIMEZONE` to a MySQL numeric session offset      |
| `server/src/db/pool.js`     | Phase 3 pool factory; sets `time_zone` on every new connection |

## Core tables

`departments`, `employees`, `roles`, `users`, `asset_categories`, `assets`,
`asset_assignments`, `service_categories`, `service_requests`,
`request_status_history`, `maintenance_records` and `asset_status_history`.

`v_asset_history` consolidates registration, allocation, return, maintenance
scheduled/started/completed/cancelled, manual edits and direct retirement. Audit-only
manual edits and retirements are read from `asset_status_history`; allocation, return and
maintenance events are read from their domain tables, so they are not duplicated.

`assets.status` is a derived cache. In Phase 3 only the single lifecycle service may
recompute it. The seed writes the final cache directly because it is a deterministic
snapshot, then proves in `verify.sql` that the cache agrees with the current facts and the
last history row.

## Time zone

`APP_TIMEZONE` is validated as an IANA name and defaults to `Asia/Kolkata`.

A default Windows MySQL installation does not load the named time-zone tables, so
`'Asia/Kolkata'` is not available to MySQL. EITAMS therefore converts the IANA name to the
numeric offset (`+05:30` for the default) and:

- `server/src/db/seed.js` runs `SET time_zone = ?` and checks the resulting session offset
  before inserting anything;
- `server/src/db/pool.js` sets the same offset on every new pooled connection and passes
  the same offset to mysql2's client-side `timezone` option;
- `database/schema.sql`, `database/seed.sql` and `database/verify.sql` pin the approved
  case-study offset explicitly.

`CURDATE()` and `NOW()` therefore agree with Node for the configured application zone. If
you change `APP_TIMEZONE` away from `Asia/Kolkata`, regenerate `database/seed.sql` with
`npm run db:seed:emit` and update the pinned offset in the static scripts. For DST-aware
zones the numeric offset changes across the year; this project's approved case-study zone
does not observe DST. Do not use a numeric value in `APP_TIMEZONE` itself.

## Setup

1. Copy the environment template and set local credentials:

   ```powershell
   Copy-Item server/.env.example server/.env
   ```

   `database/schema.sql` creates the default `eitams` schema. Keep `DB_NAME=eitams` unless
   you also change the `CREATE DATABASE`/`USE` statements in the static SQL files.

2. Create or recreate the schema (this destroys existing EITAMS tables):

   ```powershell
   mysql --default-character-set=utf8mb4 -u root -p -e "SOURCE database/schema.sql"
   ```

3. Apply the deterministic seed. Either use the Node runner, which reads `server/.env` and
   uses parameterised inserts, or execute the generated SQL snapshot:

   ```powershell
   npm run db:seed
   # or
   mysql --default-character-set=utf8mb4 -u root -p -e "SOURCE database/seed.sql"
   ```

4. Run the static audits:

   ```powershell
   mysql --default-character-set=utf8mb4 -u root -p --batch --raw -e "SOURCE database/verify.sql"
   ```

   A clean database produces no output and exit code 0. Only failing rows are returned.

## Reset behaviour

- `schema.sql` drops `v_asset_history` and all 12 tables, then recreates them. It is
  destructive.
- `seed.sql` and `npm run db:seed` truncate all 12 tables and then insert the fixed dataset.
  Both are safe to rerun. The insert phase is wrapped in a transaction; the truncates commit
  immediately, so a failed insert leaves the tables empty or partially repopulated. Rerun the
  seed to restore the snapshot.
- `seed.sql` is generated. Do not hand-edit it. Change `server/src/db/seed.js` and run
  `npm run db:seed:emit`.

## Seed snapshot

| Table                    |                      Rows |
| ------------------------ | ------------------------: |
| `departments`            |                         6 |
| `roles`                  |                         3 |
| `employees`              |                        40 |
| `users`                  |                        40 |
| `asset_categories`       |                         6 |
| `service_categories`     |                         5 |
| `assets`                 |                        70 |
| `asset_assignments`      | 55 (38 open, 17 returned) |
| `service_requests`       |                        60 |
| `request_status_history` |                       192 |
| `maintenance_records`    |                        22 |
| `asset_status_history`   |                       173 |

Asset status distribution: 34 allocated, 6 under maintenance, 19 available, 6 unavailable
and 5 retired.

Pending requests have exactly one history row (creation). Every other request has 2–5 rows:
assigned, in-progress, resolved, closed and cancellation transitions are recorded only when
they actually happened.

All seeded accounts use the synthetic demo password `Demo@12345`:

| Username      | Role       | Purpose                        |
| ------------- | ---------- | ------------------------------ |
| `admin`       | admin      | Administrative demonstration   |
| `ananya.rao`  | technician | Technician demonstration       |
| `rohan.iyer`  | technician | Technician demonstration       |
| `meera.nair`  | technician | Technician demonstration       |
| `vikram.shah` | technician | Technician demonstration       |
| `staff01`...  | employee   | Employee self-service accounts |

Names, email addresses, serial numbers and costs are synthetic. No institutional or
production data is used.

## Verification scope and results

`verify.sql` checks current-state and history consistency only:

- one registration row per asset, with matching registration actor and timestamp;
- continuous per-asset and per-request status chains and latest-history equality;
- exactly one open allocation and one in-progress maintenance record per asset;
- the cached `assets.status` precedence (`retired > under_maintenance > allocated >
available/unavailable`);
- assignment and maintenance timestamp/actor/outcome consistency;
- maintenance technician and request-technician role checks;
- maintenance-to-request asset and technician references;
- polymorphic history references and view references;
- duplicate view events and missing view registrations.

It does **not** prove every historical intermediate transition. Phase 3 integration tests
must assert the exact event rows emitted by each lifecycle service call.

Actual Phase 2 execution results are recorded in
[`docs/phase-2-report.md`](../docs/phase-2-report.md) and in the implementation checklist.
Negative probes confirmed that:

- a deliberately wrong cached status is reported by `latest_history_mismatch` and
  `cached_status_mismatch`, then rolled back;
- a second open allocation is rejected by
  `uq_asset_assignments_active_asset` (MySQL error 1062);
- a second in-progress maintenance record is rejected by
  `uq_maintenance_records_open_asset` (MySQL error 1062);
- invalid scheduled maintenance state and a return without a return actor are rejected by
  named CHECK constraints (MySQL error 3819);
- an admin user can be inserted into `maintenance_records.technician_id` because a foreign
  key cannot inspect the role. `422 TECHNICIAN_ROLE_REQUIRED` is therefore a Phase 3
  service-level rule, not a database constraint.
