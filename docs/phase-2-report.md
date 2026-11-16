# Phase 2 completion report — database

**Date:** 2026-11-15  
**Database engine:** MySQL 8.0.46, InnoDB, `utf8mb4_0900_ai_ci`  
**Status:** Complete and verified — awaiting review. Phase 3 has not started.

## Scope delivered

Phase 2 implements the approved database design only:

- exactly 12 core tables and one read-only view, `v_asset_history`;
- primary keys, foreign keys, unique constraints, generated columns, CHECK constraints and
  indexes from `docs/phase-1-design.md`;
- deterministic synthetic seed data with synthetic demo accounts;
- static SQL audits for current-state and history consistency;
- MySQL session time-zone handling derived from `APP_TIMEZONE`;
- no authentication, CRUD API, business service, frontend module or lifecycle
  implementation.

## Files

| File                        | Change                                                        |
| --------------------------- | ------------------------------------------------------------- |
| `database/schema.sql`       | Destructive schema recreate with 12 tables and the view       |
| `database/seed.sql`         | Generated deterministic seed snapshot                         |
| `database/verify.sql`       | 42 failure-only static audit queries                           |
| `server/src/db/seed.js`     | Deterministic seed generator, validator and applier            |
| `server/src/db/timezone.js` | IANA-to-MySQL numeric offset helper                            |
| `server/src/db/pool.js`     | Pool factory that sets `time_zone` on every new connection     |
| `database/README.md`        | Schema scope, setup, reset, seed and verification documentation |
| `README.md`                 | Phase 2 setup, scripts, demo accounts and status               |
| `docs/implementation-checklist.md` | Phase 2 status and clarification tracking              |
| `server/package.json`       | `seed` and `seed:emit` scripts                                |
| `package.json`              | Root `db:seed` and `db:seed:emit` scripts                     |
| `.gitignore`                | Local MySQL data/runtime artifacts ignored                    |

## Schema objects

The schema contains exactly 12 `BASE TABLE` objects and one view:

`departments`, `employees`, `roles`, `users`, `asset_categories`, `assets`,
`asset_assignments`, `service_categories`, `service_requests`,
`request_status_history`, `maintenance_records`, `asset_status_history`, plus
`v_asset_history`.

Key database rules:

- `asset_assignments.active_asset_id` is a stored generated column with a unique index,
  allowing at most one open allocation per asset.
- `maintenance_records.open_asset_id` is a stored generated column with a unique index,
  allowing at most one `in_progress` maintenance record per asset.
- CHECK constraints enforce return actor/timestamp pairs, maintenance state matrices,
  completion outcome/condition pairs, request state/timestamp consistency, retirement
  actor/timestamp pairs, warranty ranges and non-negative costs.
- `assets.status` remains a derived cache. The seed writes the snapshot directly; Phase 3
  will make one lifecycle service exclusively responsible for recomputing it.
- `v_asset_history` uses domain tables for allocation, return and maintenance events and
  `asset_status_history` for registration, manual condition/status edits and retirement.
  This avoids duplicating domain events.

## Seed snapshot and determinism

The final seeded volumes were:

| Table                      | Rows |
| -------------------------- | ---: |
| `departments`              |    6 |
| `roles`                    |    3 |
| `employees`                |   40 |
| `users`                    |   40 |
| `asset_categories`         |    6 |
| `service_categories`       |    5 |
| `assets`                   |   70 |
| `asset_assignments`        |   55 (38 open, 17 returned) |
| `service_requests`         |   60 |
| `request_status_history`   |  192 |
| `maintenance_records`      |   22 |
| `asset_status_history`     |  173 |

Asset status distribution: 34 `allocated`, 6 `under_maintenance`, 19 `available`,
6 `unavailable`, 5 `retired`.

Maintenance distribution: 4 `scheduled`, 6 `in_progress`, 8 `completed`, 4 `cancelled`.

`v_asset_history` returned 189 rows:

| Event type             | Rows |
| ---------------------- | ---: |
| `registered`           |   70 |
| `allocated`            |   55 |
| `returned`             |   17 |
| `maintenance_scheduled`|   14 |
| `maintenance_started`  |   16 |
| `maintenance_completed`|    8 |
| `maintenance_cancelled`|    4 |
| `condition_changed`    |    2 |
| `retired`              |    3 |

The seed uses a fixed bcrypt salt for the synthetic demo password and fixed timestamp
literals. Two consecutive `database/seed.sql` runs produced identical checksums for all 12
tables. Pending requests intentionally have one history row (creation); every other request
has 2–5 real status-history rows.

## Commands executed and actual results

All commands ran against a dedicated local MySQL 8.0.46 instance at `127.0.0.1:3306`.

| Command | Result |
| ------- | ------ |
| `mysql -e "DROP DATABASE IF EXISTS eitams;"` | Exit 0; fresh-database test |
| `mysql -e "SOURCE database/schema.sql"` | Exit 0; 12 tables and 1 view created |
| `npm run db:seed` | Exit 0; all 12 tables populated |
| `mysql -e "SOURCE database/seed.sql"` | Exit 0 on two consecutive runs |
| `mysql --batch --raw -e "SOURCE database/verify.sql"` | Exit 0; no failing rows |
| `CHECKSUM TABLE` for all 12 tables before/after a seed rerun | Identical |
| `npm run lint` | Exit 0 |
| `npm run format:check` | Exit 0; all matched files formatted |
| `npm run build` | Exit 0; Vite production build succeeded |

The seed runner also asserted the live session time zone before inserting:
`@@session.time_zone = +05:30`, offset `19800` seconds. A three-connection pool probe
returned `+05:30` and `19800` seconds on every connection.

## Static verification results

`database/verify.sql` now contains 42 failure-only checks. The clean run returned no rows
and exit code 0 after both the Node seed and the generated `seed.sql` snapshot.

The checks cover:

- one registration row per asset with matching registration actor and timestamp;
- per-asset and per-request continuous history chains;
- latest-history and cached asset-status equality;
- one open allocation and one in-progress maintenance record per asset;
- asset lifecycle precedence;
- assignment and maintenance actor/timestamp/outcome matrices;
- maintenance technician, request technician and maintenance actor role data;
- maintenance-to-request asset/technician references;
- polymorphic history references and view references;
- duplicate view events and missing view registrations;
- request and manual/retirement history shapes.

### Negative probes

The audits were tested with an intentional violation inside a transaction:

| Probe | Actual result |
| ----- | ------------- |
| Changed asset 1 from `allocated` to `available` | `latest_history_mismatch` and `cached_status_mismatch` returned; rollback restored `allocated` |
| Inserted a second open allocation for asset 1 | MySQL error 1062 on `uq_asset_assignments_active_asset` |
| Inserted a second `in_progress` maintenance for asset 35 | MySQL error 1062 on `uq_maintenance_records_open_asset` |
| Inserted `scheduled` maintenance with `started_at` set | MySQL error 3819 on `chk_maintenance_records_scheduled_fields` |
| Set `returned_at` without `returned_by` | MySQL error 3819 on `chk_asset_assignments_return_actor` |
| Inserted admin user 1 as a maintenance technician in a transaction | Insert succeeded and showed actual role `admin`; rolled back with zero probe rows remaining |

The last probe confirms the approved limitation: a foreign key cannot validate the referenced
user's role. `422 TECHNICIAN_ROLE_REQUIRED` must be enforced by the Phase 3 service on create
and technician change, with an integration test.

## Clarifications applied

1. **Technician role validation:** static verify checks current seeded technician roles;
   service-level create/update enforcement and the integration test remain Phase 3 work.
2. **Static-vs-integration scope:** `verify.sql` proves current-state/history consistency,
   registration counts and domain-event references only. It does not prove every historical
   intermediate transition.
3. **MySQL time zone:** `APP_TIMEZONE` is validated as an IANA name (`Asia/Kolkata` by
   default). The seed and future pool derive `+05:30`; static SQL scripts pin the same
   numeric offset. `CURDATE()` and `NOW()` therefore run in the approved zone.

## Limitations and review notes

- `assets.status` is intentionally a derived cache; only the Phase 3 lifecycle service may
  recompute it.
- The static audits do not replace integration tests for lifecycle event recording.
- Pending requests have exactly one history row because creation is their only transition.
- Named time-zone tables are not loaded in the local MySQL installation, so static SQL uses
  the approved numeric offset. Changing `APP_TIMEZONE` away from `Asia/Kolkata` requires
  regenerating `seed.sql` and updating the pinned static offsets.
- Phase 3 has not started.
