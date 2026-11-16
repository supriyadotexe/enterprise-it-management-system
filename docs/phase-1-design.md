# Phase 0 — Analysis, Architecture and Design

> Approved design deliverable. The file name remains `phase-1-design.md` because earlier review
> correspondence referenced it; the phase numbering below is authoritative.

**Project:** Enterprise IT Asset & Service Management System
**Subtitle:** Design and Development of a Web-Based Enterprise Management Application
**Document status:** Revision 5 — approved; Phase 1 complete and verified, awaiting review
**Scope of this phase:** Analysis and design, now approved. Implementation follows the approved phase sequence; Phase 2 database work has not started.

## Revision history

| Version | Change |
|---|---|
| 1 | Initial architecture, 11-table schema, folder structure, phase plan |
| 2 | Auth trade-offs documented; atomic employee+account creation; single asset-lifecycle service with locking; condition-aware maintenance completion; request–maintenance asset validation; unified asset history and audit table; comparison-study document added; previous repository clarified as unrelated |
| 3 | Third completion outcome `held_unavailable`; explicit maintenance actor columns; `under_maintenance` terminology standardised; unified history enriched with status/condition transitions and correct actors; maintenance state-machine rules |
| 4 | NULL-safe history comparison at registration; phase sequence corrected; `scheduled_date` semantics fixed for immediate work; full timestamp/actor/outcome consistency matrix and checks |
| 5 | Approved. `technician_id` must have the `technician` role; `verify.sql` scope limited to current-state/history consistency; `APP_TIMEZONE` governs MySQL session time and `CURDATE()` |

## Revision 4 corrections

| # | Correction | Where |
|---|---|---|
| 1 | NULL-safe `<=>` comparison; registration always writes exactly one history row | §5.6.1, §8 |
| 2 | Implementation begins with Phase 1 (scaffold), then Phase 2 (database) | §10 |
| 3 | `scheduled_date` stays NOT NULL; immediate maintenance is stamped with the server's current date | §5.3 table 11, §5.6.4, §6, §8 |
| 4 | Per-status timestamp/actor/outcome consistency matrix, database CHECKs and `verify.sql` rules | §5.3 table 11, §8 |

## Revision 5 clarifications

| # | Clarification | Where |
|---|---|---|
| 1 | `maintenance_records.technician_id` must reference a `technician` user; admins may select the technician but employees/admins in that column are rejected `422 TECHNICIAN_ROLE_REQUIRED` | §5.3, §5.6.4, §8 |
| 2 | `verify.sql` checks only current-state/history consistency, registration counts and domain-event references; integration tests prove each lifecycle operation wrote its expected event. A static SQL audit cannot prove intermediate transitions if writes bypass the application | §8 |
| 3 | `APP_TIMEZONE` (validated IANA name) is applied to every MySQL session so `CURDATE()` for immediate maintenance agrees with Node | §5.3, §8, `docs/implementation-checklist.md` |

## Revision 3 review points

| # | Review point | Where |
|---|---|---|
| 1 | `held_unavailable` outcome and the full outcome/condition matrix | §5.3 table 11, §5.6.5 |
| 2 | `created_by`, `started_by`, `cancelled_by` audit actors; unified history shows the real actor per event | §5.3 table 11, §5.4 |
| 3 | `under_maintenance` used consistently everywhere | §5.6.1, §5.9, §10 (R3); whole document |
| 4 | Timeline keeps condition and status changes without duplicate events | §5.4 |
| 5 | Scheduled/started/completed/cancelled rules, recompute and invalid transitions | §5.6.4, §5.6.5 |

## Earlier review points (revision 2, approved)

| # | Review point | Where |
|---|---|---|
| 1 | JWT localStorage trade-offs documented | §3.4 |
| 2 | Atomic employee + login creation | §5.3 (`employees`/`users`), §5.6.7, §6 API |
| 3 | One asset lifecycle workflow, transactions and locking | §5.6 |
| 4 | Maintenance completion is an explicit decision, not automatic `available` | §5.6.5, §5.9 |
| 5 | Maintenance linked to a request must match the request's asset | §5.7 |
| 6 | Unified asset history; new audit table justified | §5.2, §5.4 |
| 7 | Comparison-study document | `docs/comparison-study.md` |
| 8 | Earlier PHP/MySQL pension repository explicitly unrelated | §1, comparison doc |

---

## 1. Repository inspection

| Check | Result |
|---|---|
| Working tree | Empty apart from `.git/` |
| Current HEAD | `1658c36 delete all files` |
| Earlier history | `ca4a285 Initial commit OPMS` — a PHP/MySQL **pension-management** application (72 files, including `sql/database.sql`, `admin/`, `officer/`, `pensioner/`) |
| Node.js | v22.19.0 |
| npm | 11.11.1 |
| Git | 2.51.0 (Windows) |
| MySQL client | 8.0 installed at `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe` |

**Conclusion:** the working tree contains no code to preserve. The previous PHP application was already deleted in commit `1658c36` and will not be restored, modified, quoted as OFC's system, or used as a data source. It is a **separate earlier project**. The only system discussed as the "existing approach" in the comparison study is the one actually observed during training; that distinction is enforced in `docs/comparison-study.md`.

---

## 2. Project baseline (revision 3)

| Decision | Choice |
|---|---|
| Project | Enterprise IT Asset & Service Management System |
| Architecture | Three-tier: React SPA → Express REST API → MySQL |
| Frontend | React 18 + Vite, React Router, Axios, Tailwind CSS |
| Backend | Node.js + Express, JWT, bcrypt, mysql2 |
| Database | MySQL 8.0, InnoDB, `utf8mb4` |
| Roles | Admin, Employee, Technician |
| Modules | 6 |
| Core tables | **12** (11 from the original outline + `asset_status_history`) + 1 read-only view |
| Asset statuses | **5** (`available`, `allocated`, `under_maintenance`, `unavailable`, `retired`) |
| Case study | Hypothetical medium-sized organisation, synthetic data only |

Two baseline numbers changed after the revision-2 review. Both are explained in §5.2 and both require your approval:
- a twelfth table, `asset_status_history`, so status/condition/retirement changes are auditable;
- a fifth asset status, `unavailable`, so equipment that is not allocatable but not retired is visible instead of being forced to `available` or permanently `retired`.

Revision 3 does not change the table count; it adds audit columns and one additional recorded outcome within the 12-table design.

**Non-goals for v1:** payroll, procurement, real-time network monitoring, AI fault prediction, mobile app, live email/SMS, multi-branch deployment.

---

## 3. System architecture

### 3.1 Three-tier view

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation tier — React SPA (Vite, port 5173)             │
│  Router → Auth context → Role-aware layout → Feature pages  │
│  Axios instance: attaches JWT, normalises API errors         │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS/JSON  /api/v1/...
┌───────────────────────────▼─────────────────────────────────┐
│ Application tier — Express (port 5000)                       │
│  helmet / cors / rate-limit → JSON parser → request logger    │
│  → routes → authenticate → authorize → validate              │
│  → controller (HTTP) → service (rules + transactions)        │
│     └─ assetLifecycle.service.js = single asset state engine │
│  → mysql2 pool (parameterised SQL) → central error handler    │
└───────────────────────────┬─────────────────────────────────┘
                            │ TCP 3306
┌───────────────────────────▼─────────────────────────────────┐
│ Data tier — MySQL 8.0 (InnoDB)                               │
│  12 tables + v_asset_history view, FKs, CHECK constraints,   │
│  unique indexes, generated columns for allocation/maintenance │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Backend layering rule

1. **Route** — URL, verb, middleware chain.
2. **Middleware** — `authenticate`, `authorize(...roles)`, `validate(schema)`, parameter checks.
3. **Controller** — reads `req`, calls one service function, sends `{ success, data }`. No SQL, no rules.
4. **Service** — business rules, ownership checks, state transitions and transactions. Only this layer touches the database.
5. **DB pool** — `mysql2/promise` with `execute()`, `withTransaction(fn)` and `query()` helpers.

Cross-cutting: `ApiError`, `errorHandler`, `notFound`, `pagination`, `asyncHandler`.

`services/assetLifecycle.service.js` is the **only** module allowed to write `assets.status`, `asset_status_history`, `asset_assignments` or `maintenance_records`. Other services call it rather than changing asset state directly. This is the enforcement mechanism for review point 3.

**Why raw SQL instead of an ORM:** the assessment is about relational design, joins, constraints and transactions. Visible SQL is easier to defend in the report, and `SELECT ... FOR UPDATE` can be demonstrated directly. Cost: more hand-written queries, acceptable for 12 tables.

### 3.3 Authentication and authorisation flow

1. `POST /api/v1/auth/login` with username + password.
2. Server loads user + role + employee, rejects inactive accounts, compares bcrypt hash (cost 12; configurable lower in tests), updates `last_login_at`.
3. Server signs a JWT `{ sub: userId, role, employeeId }`, 8h expiry, secret from `JWT_SECRET`.
4. React attaches `Authorization: Bearer <token>`.
5. `authenticate` verifies signature/expiry, re-reads the user (deactivation takes effect immediately), sets `req.user`.
6. `authorize('admin')` gates route groups.
7. Object-level checks live in services: employee may read only own requests; technician may update only requests assigned to them; admin may read all.
8. `PATCH /auth/password` verifies the current password before re-hashing.

### 3.4 Token storage trade-offs (review point 1)

The prototype uses a Bearer JWT in `localStorage`. This is a deliberate academic choice, not a claim of production-grade security.

| Aspect | `localStorage` + Bearer (chosen) | `HttpOnly` cookie (production alternative) |
|---|---|---|
| XSS exposure | Any successful XSS can read the token | Script cannot read the cookie |
| CSRF exposure | Not sent automatically, so CSRF risk is low | Sent automatically; needs `SameSite` + CSRF token |
| Logout | Client discards token; the token remains valid until expiry | Server can clear the cookie; with server-side sessions, revoke immediately |
| Cross-tab behaviour | Shared across tabs; expiry handled per request | Shared by browser automatically |
| Implementation | Simple: one Axios header | More moving parts: CORS credentials, cookie parsing, CSRF |
| Revocation before expiry | Not possible without a token blacklist | Possible with session store or rotated cookies |

**Mitigations documented for this prototype:** 8h expiry, no refresh token, all user content rendered through React escaping (no `dangerouslySetInnerHTML`), strict input validation, CSP header via `helmet`, bcrypt hashing, rate limiting on `/auth/login`, HTTPS expected in any non-local deployment.

**Production alternative documented in README and report:** short-lived access token in an `HttpOnly; Secure; SameSite=Strict` cookie, refresh-token rotation, CSRF token for state-changing requests, server-side revocation. This is a documented hardening path, not something we claim to have implemented.

### 3.5 Error and response contract

```json
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
```

```json
{ "success": false, "error": { "code": "ASSET_NOT_AVAILABLE", "message": "Asset AST-0007 is currently allocated.", "details": [] } }
```

Status codes: 200/201/204, 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 business-rule conflict, 422 semantic validation, 500 unexpected. `details` carries field-level messages for forms.

---

## 4. Repository structure

```
enterprise-it-management-system/
├─ package.json                     # npm workspaces + concurrently dev script
├─ .gitignore
├─ README.md                        # Phase 6
├─ docs/
│  ├─ phase-1-design.md             # this document
│  ├─ comparison-study.md           # existing approach vs prototype (evidence-based)
│  ├─ er-diagram.md                 # Mermaid ER + relational schema
│  ├─ architecture.md
│  ├─ api.md
│  ├─ test-cases.md                 # TC-xx with actual results
│  ├─ test-plan.md
│  └─ screenshots/
├─ database/
│  ├─ schema.sql                    # 12 tables + v_asset_history + indexes
│  ├─ seed.sql                      # optional portable snapshot
│  └─ verify.sql                    # invariant checks, must return zero rows
├─ server/
│  ├─ .env.example
│  ├─ package.json
│  ├─ vitest.config.js
│  └─ src/
│     ├─ config/env.js
│     ├─ db/                        # pool, transaction, seed
│     ├─ middleware/
│     ├─ validators/
│     ├─ utils/
│     ├─ services/                  # includes assetLifecycle.service.js
│     ├─ controllers/
│     ├─ routes/
│     ├─ app.js
│     └─ server.js
│  └─ tests/
├─ client/
│  ├─ .env.example
│  ├─ package.json
│  ├─ vite.config.js
│  └─ src/
│     ├─ api/
│     ├─ context/
│     ├─ router/
│     ├─ layouts/
│     ├─ components/                # ui, layout, charts
│     ├─ features/                  # auth, dashboard, employees, departments,
│     │                             # assets, assignments, requests, maintenance, reports
│     ├─ hooks/
│     ├─ utils/
│     └─ styles/
└─ postman/
   └─ collection.json
```

---

## 5. Database design

### 5.1 Conventions

InnoDB, `utf8mb4`, surrogate integer keys (`SMALLINT` lookups, `BIGINT` history), `created_at`/`updated_at` on mutable entities, `ON DELETE RESTRICT` where history exists, `is_active` instead of deletion, `CHECK` constraints for dates/costs/status consistency, indexes on FKs plus real filter/sort columns.

### 5.2 Table-count decision: 11 → 12 (review point 6)

**Question:** can the four existing event sources (`assets`, `asset_assignments`, `maintenance_records`, `service_requests`) produce a complete lifecycle history without another table?

**Analysis:**

| Event | Source today | Complete? |
|---|---|---|
| Registration | `assets.created_at` | Yes, except *who* registered it (no actor column) |
| Allocation | `asset_assignments.assigned_at` | Yes (`assigned_by`) |
| Return | `asset_assignments.returned_at` | Date yes, actor missing (no `returned_by`) |
| Maintenance scheduled/started/completed/cancelled | `maintenance_records` dates | Incomplete: no start timestamp, and no distinct actor for creation, start, completion or cancellation |
| **Manual status change / condition change / retirement** | only current value in `assets` | **No** — `updated_at` only shows the last write, and the previous value is lost |
| Service requests on the asset | `service_requests` | Yes, but request history is a separate concern |

The decisive gap is the manual-change row. The brief requires every request status change to be auditable and expects an asset's lifecycle to be demonstrable. Manual condition corrections and retirement are exactly the actions an auditor asks about ("who marked this damaged laptop available?"), and **there is nowhere to store them today**. Deriving history from current rows would also misrepresent events: if an asset is retired and later corrected, a derived timeline silently changes its past.

A second, narrower gap is actor attribution inside maintenance. `technician_id` identifies the technician responsible for the work, but an administrator may create or cancel the record, and a different technician may start it. The schema therefore records one actor per event (§5.3 table 11), so the timeline answers "who did this?" rather than "who owns the job?"

**Decision:** add a twelfth table, `asset_status_history`, as an **append-only audit log of asset status and condition transitions**. Keep allocations and maintenance in their own domain tables as the source of truth. Add a **read-only view** `v_asset_history` that unions the domain events into one timeline for the UI.

Why not make a single generic `asset_events` table the source of truth? That duplicates allocation and maintenance data, creates two places to keep consistent, and weakens the normalised design the report is meant to demonstrate. Why not a generic `audit_log` for all entities? It complicates role-specific queries and is harder to explain; one focused table is proportionate.

**Cost:** one table + one view; the brief's "11 core tables" becomes 12. **If you prefer to keep exactly 11**, the fallback is: no audit table, timeline derived from the three domain tables, and documented limitation that manual status/condition changes are not auditable. I recommend the 12-table version.

Also added to existing tables (no new tables): `assets.created_by`, `assets.retired_at`, `assets.retired_by`, `asset_assignments.returned_by`, `maintenance_records.created_by`, `started_at`, `started_by`, `completed_at`, `completed_by`, `cancelled_at`, `cancelled_by`, `outcome`.

### 5.3 Table specifications

All PKs are `AUTO_INCREMENT`. All FKs are `RESTRICT` on delete unless noted.

#### 1. `departments`
`department_id` PK · `name` VARCHAR(100) NOT NULL UNIQUE · `description` VARCHAR(255) NULL · `is_active` TINYINT(1) DEFAULT 1 · timestamps.
Index: none beyond unique name.

#### 2. `employees`
`employee_id` PK · `employee_code` VARCHAR(20) NOT NULL UNIQUE · `department_id` FK → departments · `full_name` VARCHAR(120) NOT NULL · `email` VARCHAR(150) NOT NULL UNIQUE · `phone` VARCHAR(20) NULL · `designation` VARCHAR(80) NOT NULL · `date_joined` DATE NULL · `is_active` TINYINT(1) DEFAULT 1 · timestamps.
Indexes: `(department_id)`, `(full_name)`.

#### 3. `roles`
`role_id` PK · `role_name` ENUM('admin','employee','technician') NOT NULL UNIQUE · `description` VARCHAR(150) NULL. Three seeded rows.

#### 4. `users`
`user_id` PK · `employee_id` NOT NULL UNIQUE FK → employees · `role_id` NOT NULL FK → roles · `username` VARCHAR(50) NOT NULL UNIQUE · `password_hash` VARCHAR(255) NOT NULL · `is_active` TINYINT(1) DEFAULT 1 · `last_login_at` DATETIME NULL · timestamps.
One account per employee (`UNIQUE(employee_id)`).

**Atomicity requirement (review point 2):** employee and login are inserted by one service inside one transaction. Password hashing happens *before* the transaction opens (slow CPU work should not hold locks). On any failure the whole transaction rolls back, so there is never an employee created for an account that failed, or an account pointing at a missing employee (the NOT NULL FK makes the latter impossible anyway). Deactivation and reactivation update `employees.is_active` and `users.is_active` together in one transaction.

#### 5. `asset_categories`
`category_id` PK · `category_name` VARCHAR(60) NOT NULL UNIQUE · `description` NULL · `is_active` DEFAULT 1.
Seeded: Laptop, Desktop, Printer, Server, Network Equipment, Monitor & Peripheral.

#### 6. `assets`
| Column | Type / constraint |
|---|---|
| asset_id | PK |
| category_id | NOT NULL FK → asset_categories |
| asset_code | VARCHAR(30) NOT NULL UNIQUE |
| name | VARCHAR(120) NOT NULL |
| brand / model | VARCHAR(60) / VARCHAR(80) NULL |
| serial_number | VARCHAR(80) NULL UNIQUE |
| purchase_date / warranty_end | DATE NULL; CHECK warranty ≥ purchase |
| purchase_cost | DECIMAL(12,2) NULL, CHECK ≥ 0 |
| asset_condition | ENUM('new','good','fair','poor','damaged') NOT NULL DEFAULT 'good' |
| status | ENUM('available','allocated','under_maintenance','unavailable','retired') NOT NULL DEFAULT 'available' |
| created_by | NOT NULL FK → users |
| retired_at | DATETIME NULL |
| retired_by | INT UNSIGNED NULL FK → users |
| notes | VARCHAR(500) NULL |
| created_at / updated_at | TIMESTAMP defaults |

Indexes: `(status)`, `(category_id)`, `(name)`, `(warranty_end)`.

`status` is a **derived cache**, not an independently editable field. The single lifecycle service recomputes it from authoritative facts (§5.6). No endpoint accepts `status` as input. This removes the classic bug where a status badge disagrees with the assignment table.

`unavailable` means "physically present but not eligible for allocation" — e.g. repaired but still `damaged`, or awaiting assessment/disposal. It is not terminal; a later successful repair can make it `available`.

#### 7. `asset_assignments`
`assignment_id` PK · `asset_id` NOT NULL FK → assets · `employee_id` NOT NULL FK → employees · `assigned_by` NOT NULL FK → users · `assigned_at` DATETIME DEFAULT CURRENT_TIMESTAMP · `returned_at` DATETIME NULL · `returned_by` NULL FK → users · `return_condition` ENUM(same as condition) NULL · `remarks` VARCHAR(255) NULL · **`active_asset_id` INT UNSIGNED GENERATED ALWAYS AS `IF(returned_at IS NULL, asset_id, NULL)` STORED, UNIQUE**.
CHECKs: `returned_at >= assigned_at` when returned; `(returned_at IS NULL) = (returned_by IS NULL)`.
Indexes: `(asset_id, returned_at)`, `(employee_id, returned_at)`.

The generated-column unique index is what makes "one active allocation per asset" a **database** guarantee. Concurrent duplicate requests cannot both commit; the loser gets a duplicate-key error mapped to `409 ASSET_ALREADY_ALLOCATED`.

#### 8. `service_categories`
`service_category_id` PK · `name` VARCHAR(60) NOT NULL UNIQUE · `description` NULL · `is_active` DEFAULT 1.
Seeded: Hardware, Software, Network, Printer, Account & Access.

#### 9. `service_requests`
`request_id` PK · `request_code` VARCHAR(20) NOT NULL UNIQUE · `employee_id` NOT NULL FK → employees · `asset_id` NULL FK → assets · `service_category_id` NOT NULL FK → service_categories · `assigned_technician_id` NULL FK → users · `title` VARCHAR(150) NOT NULL · `description` TEXT NOT NULL · `priority` ENUM('low','medium','high','critical') DEFAULT 'medium' · `status` ENUM('pending','assigned','in_progress','resolved','closed','cancelled') DEFAULT 'pending' · `assigned_at` NULL · `resolved_at` NULL · `resolution_notes` TEXT NULL · timestamps.
CHECK: resolved/closed ⇒ `resolved_at IS NOT NULL`.
Indexes: `(employee_id, status)`, `(assigned_technician_id, status)`, `(status)`, `(created_at)`, `(asset_id)`.
`request_code` is generated inside the insert transaction as `SR-{YYYY}-{LPAD(request_id,4,'0')}`, so it is unique by construction rather than by race-prone counting.

#### 10. `request_status_history` (unchanged, append-only)
`history_id` BIGINT PK · `request_id` NOT NULL FK · `changed_by` NOT NULL FK → users · `old_status` NULL · `new_status` NOT NULL · `remarks` NULL · `changed_at` DEFAULT now. Index `(request_id, changed_at)`. Creation is recorded with `old_status = NULL`.

#### 11. `maintenance_records`
| Column | Type / constraint |
|---|---|
| maintenance_id | PK |
| asset_id | NOT NULL FK → assets |
| request_id | NULL FK → service_requests (ON DELETE SET NULL) |
| technician_id | NOT NULL FK → users — the technician responsible for the work |
| created_by | NOT NULL FK → users — who created the record |
| maintenance_type | ENUM('preventive','corrective','inspection','upgrade') NOT NULL |
| description | TEXT NOT NULL |
| status | ENUM('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'in_progress' |
| scheduled_date | DATE NOT NULL — planned service date; for immediate records the server stores the current date automatically (see below) |
| started_at | DATETIME NULL |
| started_by | NULL FK → users — who actually started the work |
| completed_at | DATETIME NULL |
| completed_by | NULL FK → users — who completed and signed off |
| cancelled_at | DATETIME NULL |
| cancelled_by | NULL FK → users — who cancelled |
| outcome | ENUM('returned_to_service','held_unavailable','retired') NULL |
| condition_after | ENUM('new','good','fair','poor','damaged') NULL |
| cost | DECIMAL(12,2) NOT NULL DEFAULT 0, CHECK ≥ 0 |
| next_due_date | DATE NULL |
| remarks | VARCHAR(500) NULL |
| **open_asset_id** | GENERATED `IF(status = 'in_progress', asset_id, NULL)` STORED, UNIQUE |
| created_at | TIMESTAMP default |

**Actor model.** `technician_id` is the accountable technician assigned to the job; it is **not** assumed to be the person who performed each action. `created_by`, `started_by`, `completed_by` and `cancelled_by` record the actual actor for each event. An administrator may create, start, complete or cancel a record, and a different technician may start it. When a technician creates a record, `technician_id` defaults to that technician; an administrator must choose the accountable technician explicitly. Every actor must hold the `admin` or `technician` role, checked by the service (roles are in a separate table, so this cannot be a CHECK constraint).

**`technician_id` role validation.** The accountable technician must reference a user whose role is exactly `technician`. An admin or employee account is rejected with `422 TECHNICIAN_ROLE_REQUIRED`, even when an administrator is selecting the technician or creating the record on their behalf. This is validated in the service for every create and update path, and covered by an integration test; the FK alone cannot enforce it because the role lives in `users`/`roles`.

**Field consistency by status.** `created_by` and `technician_id` are always required. The remaining fields follow this matrix exactly.

| Status | `started_at` / `started_by` | `completed_at` / `completed_by` | `cancelled_at` / `cancelled_by` | `outcome` | `condition_after` |
|---|---|---|---|---|---|
| `scheduled` | both NULL | both NULL | both NULL | NULL | NULL |
| `in_progress` | both required | both NULL | both NULL | NULL | NULL |
| `completed` | both required | both required | both NULL | required | required |
| `cancelled` | both NULL or both set (work had started) | both NULL | both required | NULL | NULL |

A cancelled record may retain its start fields, because work can be cancelled after it started; it must never retain completion fields or an outcome. A scheduled record has not started, completed or been cancelled, so all six event fields and the outcome fields are NULL. Completed records must not carry cancellation fields.

**CHECK constraints:**
- `status <> 'scheduled' OR (started_at IS NULL AND started_by IS NULL AND completed_at IS NULL AND completed_by IS NULL AND cancelled_at IS NULL AND cancelled_by IS NULL AND outcome IS NULL AND condition_after IS NULL)`
- `status <> 'in_progress' OR (started_at IS NOT NULL AND started_by IS NOT NULL AND completed_at IS NULL AND completed_by IS NULL AND cancelled_at IS NULL AND cancelled_by IS NULL AND outcome IS NULL AND condition_after IS NULL)`
- `status <> 'completed' OR (started_at IS NOT NULL AND started_by IS NOT NULL AND completed_at IS NOT NULL AND completed_by IS NOT NULL AND cancelled_at IS NULL AND cancelled_by IS NULL AND outcome IS NOT NULL AND condition_after IS NOT NULL)`
- `status <> 'cancelled' OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND completed_at IS NULL AND completed_by IS NULL AND outcome IS NULL AND condition_after IS NULL)`
- `status <> 'cancelled' OR ((started_at IS NULL AND started_by IS NULL) OR (started_at IS NOT NULL AND started_by IS NOT NULL))`
- `completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at`
- `cancelled_at IS NULL OR started_at IS NULL OR cancelled_at >= started_at`

The service sets these fields; the API never accepts `started_*`, `completed_*`, `cancelled_*`, `outcome` or `condition_after` as free-form client input outside the specific action endpoint. `verify.sql` re-checks the same matrix.

**`scheduled_date` semantics.** The column stays `NOT NULL`; nullability would weaken the preventive-maintenance report and require a second conditional path in every query.

- **Immediate maintenance** does not need advance scheduling. The service sets `scheduled_date = CURDATE()` (server date) automatically. The create request should omit the field; if it is supplied, it must equal the server's current date, otherwise `400 INVALID_SCHEDULED_DATE`.
- **Scheduled maintenance** requires `scheduled_date` in the body, must be a valid date, and must not be in the past (`400 INVALID_SCHEDULED_DATE`). The planned date is retained when the job starts late.
- `started_at` remains the authoritative timestamp of when work actually began; `scheduled_date` is only the plan (or the service date for immediate jobs).

**MySQL session time zone.** Immediate maintenance uses `CURDATE()`, so the database session must use the same zone as the application. `APP_TIMEZONE` is a required, validated IANA name (default `Asia/Kolkata` for this case study; numeric offsets are not accepted). In Phase 2 the mysql2 pool sets `time_zone` on every new connection with `SET time_zone = ?`, and the pool's client-side `timezone` option is set to the same value; no connection is allowed to rely on the server default. `CURDATE()`, `NOW()` and timestamp formatting therefore agree with the Node process, the health endpoint reports the configured zone, and integration tests assert the immediate-maintenance date against the same value. Changing the zone is an environment change, not a code change.

Indexes: `(asset_id, scheduled_date)`, `(technician_id)`, `(status)`, `(created_by)`.

The second generated-column unique index guarantees **at most one `in_progress` maintenance record per asset**, so two technicians cannot both start work on the same machine. Scheduled records are not constrained by it; `start` checks explicitly and the index is the concurrency backstop.

#### 12. `asset_status_history` (new — see §5.2)
| Column | Type / constraint |
|---|---|
| history_id | BIGINT UNSIGNED PK |
| asset_id | NOT NULL FK → assets |
| old_status | ENUM(asset statuses) NULL (NULL on registration) |
| new_status | ENUM(asset statuses) NOT NULL |
| old_condition | ENUM(conditions) NULL |
| new_condition | ENUM(conditions) NULL |
| source | ENUM('registration','allocation','return','maintenance_start','maintenance_complete','maintenance_cancel','manual_edit','retirement') NOT NULL |
| reference_id | INT UNSIGNED NULL — logical reference to the cause: assignment id for `allocation`/`return`, maintenance id for `maintenance_*`, `NULL` for `registration`/`manual_edit`/`retirement`. Polymorphic by design, therefore not an FK. |
| changed_by | NOT NULL FK → users — the actual actor of the transition |
| remarks | VARCHAR(255) NULL |
| changed_at | DATETIME DEFAULT now |

Indexes: `(asset_id, changed_at)`, `(changed_by)`, `(source, reference_id)` — the last one lets the unified view join a domain event to its status/condition transition. Append-only: no update/delete endpoints.

A row is written **only when the recomputed status or the condition actually differs**, so the log is not noisy. `(source, reference_id)` is the pairing key used by the unified view to attach the transition to the event that caused it (§5.4), without inserting the same event twice.

### 5.4 Unified asset history view (review points 2–4)

`v_asset_history` is a read-only SQL view with one shape:

| Column | Meaning |
|---|---|
| asset_id | owning asset |
| event_at | timestamp used for ordering |
| event_type | `registered`, `allocated`, `returned`, `maintenance_scheduled`, `maintenance_started`, `maintenance_completed`, `maintenance_cancelled`, `status_changed`, `condition_changed`, `retired` |
| summary | short human label, e.g. "Allocated to Priya Sharma" |
| detail | optional context (issue title, cost, outcome, remarks) |
| actor_name | full name of the user who **performed that specific event** |
| reference_table / reference_id | `assets`, `asset_assignments`, `maintenance_records` or `asset_status_history` |
| status_from / status_to | asset status before and after the event, when it changed |
| condition_from / condition_to | asset condition before and after the event, when it changed |

Branches, in order:

1. **Registration** — `assets.created_at`; actor `assets.created_by`; status/condition taken from the matching `asset_status_history` row (`source='registration'`).
2. **Allocation / return** — one row per event from `asset_assignments` (`assigned_at` with actor `assigned_by`; `returned_at` with actor `returned_by`), enriched by a LEFT JOIN to the matching `asset_status_history` row (`source='allocation'` or `'return'`, `reference_id = assignment_id`). A return that also changes condition therefore shows `condition_from → condition_to` and the resulting `status_to` on the same event.
3. **Maintenance** — event actors are `created_by`, `started_by`, `completed_by`, `cancelled_by` respectively, not `technician_id`; each row LEFT JOINs its transition via `(source, reference_id = maintenance_id)`, mapping event `maintenance_started` → source `maintenance_start`, `maintenance_completed` → `maintenance_complete`, `maintenance_cancelled` → `maintenance_cancel` (a scheduled record has no transition row):
   - `maintenance_scheduled` at `created_at`, only when the record was created as `scheduled`;
   - `maintenance_started` at `started_at`, actor `started_by`;
   - `maintenance_completed` at `completed_at`, actor `completed_by`, with the condition and status transition columns filled from the same completion;
   - `maintenance_cancelled` at `cancelled_at`, actor `cancelled_by`.
   A record created directly as `in_progress` emits **one** `maintenance_started` event (created and started by the same actor), not a duplicate "recorded" plus "started" pair.
4. **Audit-only transitions** — `asset_status_history` rows where `source IN ('manual_edit','retirement')`. Manual edits become `status_changed` (with both transition column pairs) or `condition_changed` when only the condition moved; `retirement` becomes a `retired` event. Status rows whose cause is already an allocation or maintenance event are **excluded from this branch**, because those events carry the same transition in their own columns.

This design keeps the timeline complete without duplicates: a maintenance completion that changes both condition and status appears exactly once and shows both changes; a return with a worse condition appears once with the condition delta; an allocation appears once with its status change. The rule for choosing a branch is the **cause** of the transition, and the transition details travel with the event rather than as a separate row.

Each branch uses direct joins only (no derived tables), which keeps the view inside MySQL's view restrictions. The API sorts by `event_at DESC`, then `reference_id DESC`, then `event_type`. `service_requests` on the asset are shown in a separate detail tab, because a request is a service event, not an asset lifecycle event; including it would mix two different audits.

### 5.5 Relationships

```
departments 1 ─── n employees
employees   1 ─── 1 users            (n users → 1 role)
employees   1 ─── n asset_assignments ─── n assets
employees   1 ─── n service_requests (requester)
users       1 ─── n service_requests (assigned technician)
users       1 ─── n request_status_history (changed_by)
users       1 ─── n maintenance_records (technician / created_by / started_by / completed_by / cancelled_by)
users       1 ─── n assets (created_by / retired_by)
users       1 ─── n asset_status_history (changed_by)
asset_categories 1 ─── n assets
service_categories 1 ─── n service_requests
assets 1 ─── n asset_assignments
assets 1 ─── n service_requests
assets 1 ─── n maintenance_records
assets 1 ─── n asset_status_history
service_requests 1 ─── n request_status_history
service_requests 1 ─── n maintenance_records (optional link)
```

### 5.6 The single asset lifecycle workflow (review point 3)

All lifecycle operations live in `services/assetLifecycle.service.js` and share one private function. Nothing else writes asset state. This includes registration: the insert sets `created_by`, the initial condition and `status='available'`, then calls the recompute (which writes the `registration` history row) so even a newly registered `poor`/`damaged` asset lands in `unavailable` rather than a misleading `available`.

#### 5.6.1 `recomputeAssetStatus(conn, assetId, { source, referenceId, actorId, priorStatus, priorCondition, remarks })`

Called at the end of every lifecycle transaction while the asset row is locked. The caller captures `priorStatus`/`priorCondition` from its **first** locked read, before any update (return and completion change the condition before calling this function), so one history row can record both deltas. For registration, both prior values are `NULL`.

```
lock asset row (SELECT ... FOR UPDATE)
read retired_at, asset_condition
if retired_at IS NOT NULL            -> retired
else if open maintenance (in_progress) -> under_maintenance
else if open assignment (returned_at IS NULL) -> allocated
else if asset_condition IN ('new','good','fair') -> available
else                                  -> unavailable
UPDATE assets SET status = computed
if NOT (priorStatus <=> computed) OR NOT (priorCondition <=> asset_condition):
    INSERT asset_status_history (
        asset_id, old_status=priorStatus, new_status=computed,
        old_condition=priorCondition, new_condition=asset_condition,
        source, reference_id, changed_by=actorId, remarks)
```

The comparison **must** use MySQL's NULL-safe equality operator `<=>` (or the explicit `(a IS NULL AND b IS NULL) OR a = b` form). Ordinary `<>` / `=` produce `NULL` when either side is `NULL`, and a `NULL` condition fails the `IF`, so registration would silently skip its audit row. With `<=>`, `NULL <=> 'available'` is false, so the condition is true.

Registration passes `priorStatus = NULL` and `priorCondition = NULL`, so it **always** inserts exactly one `registration` history row (one call per registration, no other source). `verify.sql` asserts exactly one registration row per asset. A return or completion that changes condition and status writes **one** row containing both pairs; a transition that changes neither writes none.

Precedence is deliberate: **retirement beats maintenance, maintenance beats allocation, allocation beats availability, and condition decides availability**. This is the single rule that makes the status column, assignments and maintenance records agree.

Every history insert carries the cause: `source` identifies the operation and `reference_id` the assignment or maintenance record (NULL for registration, manual edits and retirement). When both status and condition move in one operation, **one** history row carries both pairs, which is what allows the view to show the full transition on a single event.

#### 5.6.2 Allocation

```
tx:
  SELECT asset FOR UPDATE; capture priorStatus, priorCondition
  reject if retired_at IS NOT NULL           -> 409 ASSET_RETIRED
  reject if open assignment exists           -> 409 ASSET_ALREADY_ALLOCATED
  reject if in-progress maintenance exists   -> 409 ASSET_UNDER_MAINTENANCE
  reject if status <> 'available'            -> 409 ASSET_UNAVAILABLE
  SELECT employee FOR SHARE; reject inactive -> 409 EMPLOYEE_INACTIVE
  INSERT assignment (assigned_by = actor)
  recomputeAssetStatus(source='allocation', referenceId=assignment_id,
                       priorStatus, priorCondition)
```

Row locking serialises concurrent allocation attempts; the generated-column UNIQUE index is the final backstop. Both are exercised by a concurrency test.

#### 5.6.3 Return

```
tx:
  SELECT assignment FOR UPDATE; reject unless returned_at IS NULL
  SELECT asset FOR UPDATE; capture priorStatus, priorCondition
  UPDATE assignment SET returned_at, returned_by, return_condition, remarks
  if return_condition supplied: UPDATE assets.asset_condition
  recomputeAssetStatus(source='return', referenceId=assignment_id,
                       priorStatus, priorCondition)
```

Important consequence: **returning an asset that is under maintenance leaves the status at `under_maintenance`**, because the recompute sees the open maintenance record. It becomes `available` only when maintenance is completed with an eligible condition. Returning during maintenance is a valid action (the employee hands the machine back), so the lifecycle does not assume "return implies available".

#### 5.6.4 Maintenance state machine (review points 2 and 5)

`maintenance_records.status` is the source of truth for a maintenance job. Only the transitions below are legal; everything else returns `409 INVALID_MAINTENANCE_TRANSITION`.

| From | Action | Allowed actor | Preconditions | Writes | Effect on asset |
|---|---|---|---|---|---|
| — | create immediate | admin or technician | asset not retired; no `in_progress` record; request link valid (§5.7); actor role valid; `scheduled_date` optional, if supplied must equal the server's current date | insert `in_progress`, `created_by`, `scheduled_date`, `started_at`, `started_by` | recompute → `under_maintenance` |
| — | create scheduled | admin or technician | asset not retired; request link valid; `scheduled_date` required, valid and not in the past | insert `scheduled`, `created_by`, `scheduled_date` | **none** |
| `scheduled` | start | admin or assigned technician | asset not retired; no other `in_progress`; link valid | `status='in_progress'`, `started_at`, `started_by` | recompute → `under_maintenance` |
| `scheduled` | cancel | admin or assigned technician | — | `status='cancelled'`, `cancelled_at`, `cancelled_by` | **none** (explicitly no recompute) |
| `in_progress` | complete | admin or assigned technician | outcome/condition matrix valid; no open allocation for held/retired | `status='completed'`, `completed_at`, `completed_by`, `outcome`, `condition_after`, `cost`, `next_due_date`, `remarks` | recompute → `available` / `allocated` / `unavailable` / `retired` |
| `in_progress` | cancel | admin or assigned technician | — | `status='cancelled'`, `cancelled_at`, `cancelled_by` | recompute → `allocated` if allocation open, else `available`/`unavailable` by condition |
| `completed` | any | — | terminal | — | rejected `409` |
| `cancelled` | any | — | terminal | — | rejected `409` |

Rules that apply to every row:

1. The record is loaded with `SELECT ... FOR UPDATE`, so two people cannot start or complete the same job concurrently.
2. Repeating an action on a record that already left the required state is rejected, not silently ignored: starting twice, completing twice, cancelling twice or completing a cancelled job all return `409 INVALID_MAINTENANCE_TRANSITION`.
3. **Scheduled maintenance never changes asset status.** Only a transition to or from `in_progress` calls `recomputeAssetStatus`.
4. `start` also calls the request-link validation when a request is attached, and checks the asset is not retired. A retired asset cannot enter maintenance.
5. Actors are recorded per event: `created_by`, `started_by`, `completed_by`, `cancelled_by`. `technician_id` is the accountable technician and may differ from the actor only when the actor is an administrator.
6. When a request is linked, `technician_id` must equal `request.assigned_technician_id` (otherwise `422 TECHNICIAN_MISMATCH`), so ownership and audit cannot diverge.
7. `technician_id` must reference a user with the `technician` role, checked on create and whenever it is changed. An admin or employee account is rejected with `422 TECHNICIAN_ROLE_REQUIRED`; an administrator may choose the technician, but cannot make an employee accountable for the work.

**Maintenance on an allocated asset is allowed** (the employee's laptop is serviced while it stays with them). During maintenance the status is `under_maintenance`, so it cannot be allocated to anyone else; when maintenance completes, the open assignment makes the recomputed status `allocated` again. This precedence is why status and allocation are recomputed together rather than patched by hand.

#### 5.6.5 Maintenance completion outcomes (review points 1 and 4)

Completion is an explicit decision, never an automatic `available`. Three outcomes are available, each with a strict condition/outcome matrix:

```
tx:
  SELECT record FOR UPDATE; require status='in_progress'   -> else 409
  SELECT asset FOR UPDATE; capture priorStatus, priorCondition
  authorise: admin or technician_id                        -> else 403
  require condition_after supplied                         -> else 400
  validate outcome against condition (§matrix below)       -> else 422
  for held_unavailable / retired:
      reject if an open assignment exists                  -> 409 RETURN_BEFORE_HOLD / RETURN_BEFORE_RETIRE
  UPDATE assets SET asset_condition = condition_after
      [, retired_at = now(), retired_by = actor]           when retired
  UPDATE record SET status='completed', completed_at, completed_by,
                    outcome, condition_after, cost, next_due_date, remarks
  recomputeAssetStatus(source='maintenance_complete', referenceId=maintenance_id,
                       priorStatus, priorCondition)
  assert computed status equals the expected status for the outcome -> else rollback 409 STATE_INVARIANT
```

| `condition_after` | `outcome` | Open allocation? | Resulting asset status |
|---|---|---|---|
| `new` / `good` / `fair` | `returned_to_service` | no | `available` |
| `new` / `good` / `fair` | `returned_to_service` | yes | `allocated` |
| `new` / `good` / `fair` | `held_unavailable` | — | rejected `422 CONDITION_ELIGIBLE_FOR_SERVICE` |
| `new` / `good` / `fair` | `retired` | no | `retired` (end-of-life retirement is allowed regardless of condition) |
| `new` / `good` / `fair` | `retired` | yes | rejected `409 RETURN_BEFORE_RETIRE` |
| `poor` / `damaged` | `returned_to_service` | — | rejected `422 CONDITION_NOT_ALLOCATABLE` |
| `poor` / `damaged` | `held_unavailable` | no | `unavailable` |
| `poor` / `damaged` | `held_unavailable` | yes | rejected `409 RETURN_BEFORE_HOLD` |
| `poor` / `damaged` | `retired` | no | `retired` |
| `poor` / `damaged` | `retired` | yes | rejected `409 RETURN_BEFORE_RETIRE` |

Semantics:

- **`returned_to_service`** returns an allocatable asset to circulation. It is the only outcome that can leave an allocation open, because the employee keeps a working device.
- **`held_unavailable`** is the direct, non-terminal path the review asked for: maintenance is finished, the asset is physically present but **not eligible for allocation**, and it stays `unavailable` for later assessment, repair or disposal. It is restricted to `poor`/`damaged` because those are exactly the conditions the recompute function treats as ineligible; allowing it for a `good` asset would contradict the recorded outcome. An open allocation must be closed first, otherwise the recompute precedence would mark the asset `allocated` while the record says "held".
- **`retired`** permanently withdraws the asset. It is allowed for any condition because end-of-life decisions can be economic (repair cost, age), not only physical. Retiring requires the asset to be back in the organisation's custody, so an open allocation must be closed first.
- `poor`/`damaged` are therefore **never silently mapped** to `available`. The technician must hold the asset as `unavailable` or retire it; an admin can later correct the condition through `PATCH /assets/:id` (which recomputes status) if a further repair succeeds.

`technician_id` remains the accountable technician; `completed_by` is the person who signed off. Completing a maintenance record does **not** change a linked service request's status: resolution stays a separate action with `resolution_notes`.

#### 5.6.6 Retirement, manual edits and employee deactivation

- `POST /assets/:id/retire` — locks the asset, rejects while an allocation is open or maintenance is in progress, then sets `retired_at`/`retired_by` and recomputes (writes a `retirement` history row). Retired is terminal for the pilot; no un-retire endpoint.
- `PATCH /assets/:id` — never accepts `status`; if condition changes, it recomputes in the same transaction.
- Employee deactivation — one transaction: reject if the employee has an open allocation (`409 ASSETS_STILL_ALLOCATED`), then set `employees.is_active = 0` and `users.is_active = 0`. Reactivation reverses both. This preserves history and prevents a deactivated person holding accountable equipment.

#### 5.6.7 Atomic employee + account creation (review point 2)

`POST /employees` accepts an optional nested account:

```json
{
  "employee": { "employee_code": "EMP-0041", "department_id": 2, "full_name": "…", "email": "…", "designation": "…" },
  "account":  { "username": "…", "role_id": 2, "password": "…" }
}
```

Service order: validate employee fields and account fields (including unique email/username pre-check) → hash password (outside the transaction) → `BEGIN` → insert employee → insert user → `COMMIT`. Any failure rolls back both inserts. A duplicate email/username that slips past the pre-check is caught by the unique index and mapped to `409 DUPLICATE_EMAIL` / `409 DUPLICATE_USERNAME` with no partial row left behind.

`POST /users` remains available for attaching an account to an existing employee, and is itself a single atomic insert. An employee without a login is legitimate (staff who never use the system); a user without an employee is impossible (NOT NULL FK).

### 5.7 Request–maintenance integrity (review point 5)

When `POST /maintenance` (immediate or scheduled) or `PATCH /maintenance/:id/start` includes `request_id`, the service validates inside the same transaction, with the request row locked:

1. request exists → else `404`;
2. `request.asset_id IS NOT NULL` → else `422 REQUEST_HAS_NO_ASSET`;
3. `request.asset_id = maintenance.asset_id` → else `422 ASSET_MISMATCH`;
4. request status is `assigned` or `in_progress` → else `409 REQUEST_NOT_OPEN`;
5. `maintenance.technician_id = request.assigned_technician_id` → else `422 TECHNICIAN_MISMATCH`;
6. actor is admin **or** `request.assigned_technician_id = actorId` → else `403 NOT_ASSIGNED_TECHNICIAN`.

Only then is the maintenance row written. Completion of a maintenance record does **not** auto-resolve the request: resolution is a separate technician action with `resolution_notes`, because a repair can finish while verification is still pending. The UI offers "resolve linked request" as a follow-up action.

### 5.8 Where each business rule is enforced

| # | Rule | Enforcement |
|---|---|---|
| 1 | One active allocation per asset | Generated-column UNIQUE + row lock + service check |
| 2 | Asset with status `under_maintenance` cannot be allocated | Recompute/status check + open-maintenance check |
| 3 | Return closes active allocation | Transactional update of `returned_at` |
| 4 | Employee sees only own requests | Employee-scoped query + ownership check |
| 5 | Technician updates only own requests | Service ownership check, 403 |
| 6 | Every status change recorded | Single transition service writes request + history |
| 7 | Maintenance references a valid asset | NOT NULL FK + service validation (§5.7) |
| 8 | Deactivated records keep history | `is_active` flags, RESTRICT FKs, deactivation blocked while holding assets |
| 9 | Multi-step operations transactional | `withTransaction` in every lifecycle, request and employee service |
| 10 | Validation on both tiers | express-validator + React forms; server authoritative |
| 11 | Request-linked maintenance matches asset | §5.7 checks inside the transaction |
| 12 | Maintenance completion respects condition | Explicit outcome matrix + eligibility check, never automatic |
| 13 | Asset status cannot drift | Single recompute function, no status input endpoint, `verify.sql` audit |
| 14 | Maintenance transitions are legal and attributed | Row lock + state table (§5.6.4) + per-event actor columns |
| 15 | Scheduled maintenance does not change asset status | No recompute on create/cancel; explicit state tests |
| 16 | Timeline shows condition and status changes once | Transition columns on the causing event; audit rows de-duplicated (§5.4) |

### 5.9 State machines

**Asset status is computed, not transitioned directly.** The table lists the operations that are legal in each computed state and the status that results. Any other operation is rejected by the lifecycle service.

| Current status | Permitted operations | Resulting status |
|---|---|---|
| `available` | allocate asset; start maintenance; retire | `allocated`; `under_maintenance`; `retired` |
| `allocated` | return asset; start maintenance | `available` / `unavailable` (or stays `under_maintenance` if maintenance is open); `under_maintenance` |
| `under_maintenance` | complete maintenance (`returned_to_service`, `held_unavailable`, `retired`); cancel maintenance | `available` / `allocated`; `unavailable`; `retired`; cancel → `allocated` if an allocation is open, else `available` / `unavailable` |
| `unavailable` | start maintenance; retire | `under_maintenance`; `retired` |
| `retired` | none — terminal | — |

Allocation is only possible from `available`; retiring requires no open allocation and no in-progress maintenance. The recompute precedence is:

```
retired_at set                  → retired
else in-progress maintenance    → under_maintenance
else open assignment            → allocated
else condition in new/good/fair → available
else                            → unavailable
```

**Maintenance record:**

```
(create immediate) ──► in_progress ──complete──► completed (terminal)
                           │
                           └──cancel──► cancelled (terminal)

(create scheduled) ──► scheduled ──start──► in_progress
                           │
                           └──cancel──► cancelled (terminal)
```

Asset effect: `scheduled` creation and cancellation do **not** change the asset; `start`, `complete` and cancelling an `in_progress` record recompute it inside the same transaction. `completed` and `cancelled` are terminal; repeated or out-of-order actions return `409 INVALID_MAINTENANCE_TRANSITION`.

**Request:**

```
pending ──assign──► assigned ──start──► in_progress ──resolve──► resolved ──close──► closed
   │                    │                    │
   └────────cancel──────┴────────────────────┴──► cancelled
```

| Transition | Who |
|---|---|
| create → pending | employee (own), admin |
| pending → assigned | admin |
| assigned → in_progress | assigned technician, admin |
| in_progress → resolved | assigned technician, resolution notes required |
| resolved → closed | requester, admin |
| any open → cancelled | admin, remark required |

Every transition, including creation (`old_status = NULL`), writes `request_status_history`.

### 5.10 Seed data plan (Phase 2)

Northbridge Technologies: 6 departments (IT, HR, Finance, Operations, Sales, Administration).

| Entity | Volume |
|---|---|
| roles / departments | 3 / 6 |
| employees + users | 40 each (1 admin, 4 technicians, 35 staff) |
| asset categories / service categories | 6 / 5 |
| assets | 70 across all five statuses |
| assignments | ~55 (38 open) |
| requests | ~60 across all statuses |
| request history | 2–5 rows per request |
| maintenance | ~22 (scheduled, in_progress, completed, cancelled) with correct per-event actors |
| asset status history | ~150 rows |

Deterministic Node seed script (`server/src/db/seed.js`) so bcrypt hashes are generated at runtime and FKs stay consistent; a portable `seed.sql` snapshot is optional. One documented demo password for local seeded accounts, listed in the README only.

---

## 6. API surface (revised)

Base `/api/v1`. All routes require a token except login.

| Group | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me`, `PATCH /auth/password`, `POST /auth/logout` |
| Departments | `GET /departments`, `POST /departments`, `PATCH /departments/:id`, `PATCH /departments/:id/status` |
| Employees | `GET /employees`, **`POST /employees` (employee + optional account, atomic)**, `GET /employees/:id`, `PATCH /employees/:id`, `PATCH /employees/:id/status` (cascades to user), `GET /employees/:id/assets`, `GET /employees/:id/requests` |
| Users | `POST /users` (attach account to existing employee), `PATCH /users/:id`, `POST /users/:id/reset-password` |
| Categories | `GET/POST/PATCH /asset-categories`, `GET/POST/PATCH /service-categories` |
| Assets | `GET /assets`, `POST /assets`, `GET /assets/:id`, `PATCH /assets/:id` (**no status field**), `POST /assets/:id/retire`, `GET /assets/:id/history` (unified view), `GET /assets/:id/maintenance` |
| Assignments | `POST /assets/:id/assign`, `POST /assignments/:id/return`, `GET /assignments` |
| Requests | `GET /requests`, `POST /requests`, `GET /requests/:id`, `PATCH /requests/:id`, `POST /requests/:id/assign`, `PATCH /requests/:id/status`, `GET /requests/:id/history` |
| Maintenance | `GET /maintenance`, `POST /maintenance` (immediate: omit `scheduled_date`, server stamps `CURDATE()`; scheduled: `scheduled_date` required and not in the past; actor `created_by`), `GET /maintenance/:id`, `PATCH /maintenance/:id/start`, `PATCH /maintenance/:id/complete` (`condition_after` + `outcome` ∈ `returned_to_service` / `held_unavailable` / `retired`), `PATCH /maintenance/:id/cancel` |
| Dashboard | `GET /dashboard/admin`, `/employee`, `/technician` |
| Reports | `GET /reports/assets-by-department`, `/technician-workload`, `/maintenance-cost`, `/request-summary` (`from`/`to`) |
| Lookups | `GET /lookups` (roles, categories, active employees, technicians) |

Dashboard counts are computed from authoritative tables, not only the cached status: `allocated = open assignments`, `under_maintenance = in-progress records`, `available = status available`. `verify.sql` asserts the cached status agrees with those facts.

---

## 7. Frontend plan

### 7.1 Design system

Slate neutrals (`#0F172A`, `#F8FAFC`), indigo-600 primary; badges — `available` emerald, `allocated` sky, `under_maintenance` amber, `unavailable` rose, `retired` slate; request badges — pending amber, in progress indigo, resolved emerald, closed slate, cancelled rose, critical red. Inter, 14px base, tabular numerals for metrics.

Layout: 264px sidebar (drawer under `lg`), 64px topbar with breadcrumb and role chip. Dense tables, sticky headers, filter bar, row-action menu, right-side drawers for quick forms, confirmation dialogs for destructive actions. Skeletons, inline field errors, toasts, empty states, error boundary.

Print: dedicated `print:` styles for reports (hide chrome, add title, generated date, actor), via `window.print()`.

### 7.2 Routes

| Area | Routes |
|---|---|
| Public | `/login` |
| Shared | `/profile`, `/change-password`, `/403`, `*` |
| Admin | `/admin/dashboard`, `/admin/employees`, `/admin/employees/:id`, `/admin/departments`, `/admin/assets`, `/admin/assets/:id`, `/admin/assignments`, `/admin/requests`, `/admin/requests/:id`, `/admin/maintenance`, `/admin/technicians`, `/admin/reports` |
| Employee | `/me/dashboard`, `/me/assets`, `/me/requests`, `/me/requests/new`, `/me/requests/:id` |
| Technician | `/tech/dashboard`, `/tech/requests`, `/tech/requests/:id`, `/tech/assets/:id`, `/tech/maintenance` |

`ProtectedRoute` + `RoleRoute roles={[...]}`; a shared request detail component renders role-appropriate actions.

### 7.3 Key screens shaped by this revision

- **Employee form:** optional "Create login account" section (username, role, temporary password) submits one request; the UI states that employee and account are created together or not at all.
- **Asset detail:** tabs **Overview · Allocations · Maintenance · Service requests · Lifecycle timeline**. The timeline shows the real actor for every event and renders status/condition deltas (`under_maintenance → available`, `condition: good → poor`) on the event that caused them. "Return" and "Retire" are disabled with an explanatory tooltip when preconditions fail.
- **Maintenance completion modal:** requires `condition_after` and an explicit outcome — **Return to service**, **Hold unavailable**, or **Retire**. Ineligible combinations are disabled with the reason shown (e.g. poor/damaged cannot return to service, eligible conditions cannot be held, held/retired require the asset to be returned first). The linked request is offered as a follow-up action, not auto-resolved.
- **Maintenance start modal:** optional service-request link filtered to requests for the same asset and assigned technician; scheduled records show **Start** and **Cancel**, in-progress records show **Complete** and **Cancel**, and terminal records show no actions.
- **Dashboards:** status badges use the exact API values (`under_maintenance`, not "under repair"), and counts are described as "open allocations" / "in-progress maintenance" where those are the source of truth.

### 7.4 Dashboards

- **Admin:** total/`available`/`allocated`/`under_maintenance` assets; total/open/in-progress/resolved requests; department distribution (bar); status split (donut); technician workload (stacked); 5 recent requests; warranty expiring in 60 days.
- **Employee:** active assets, request counts, raise-request CTA, recent requests.
- **Technician:** open assigned requests, pending/in-progress/completed, upcoming preventive maintenance, assets assigned to me.

---

## 8. Testing plan (revised)

1. **Manual matrix** (`docs/test-cases.md`), 45+ cases covering FR-01…FR-11, permissions, validation and the three demo workflows, with actual results and evidence.
2. **Automated integration tests** (Vitest + Supertest, dedicated `eitams_test` schema reset per run) — additions from this revision:
   - employee + account creation rolls back completely when the username is duplicated;
   - deactivating an employee with an open allocation returns 409 and changes nothing;
   - maintenance linked to a request with a different asset returns 422 `ASSET_MISMATCH`;
   - a non-assigned technician cannot attach a maintenance record to the request (403);
   - creating or changing a maintenance record with an employee or admin as `technician_id` → 422 `TECHNICIAN_ROLE_REQUIRED`, while an admin may select a valid technician;
   - immediate maintenance stores `CURDATE()` in the configured `APP_TIMEZONE` (test runs set the same zone on MySQL sessions);
   - concurrent allocation → exactly one 201 and one 409;
   - return during maintenance leaves status `under_maintenance`;
   - **scheduled create and scheduled cancel leave asset status unchanged**; starting the scheduled record sets `under_maintenance`;
   - invalid transitions (start twice, complete a scheduled record, complete twice, cancel a completed record) return 409 and write nothing;
   - immediate maintenance created without `scheduled_date` succeeds and stores the server's current date;
   - immediate maintenance with a different `scheduled_date` → 400 `INVALID_SCHEDULED_DATE`;
   - scheduled maintenance without a date, or with a past date → 400 `INVALID_SCHEDULED_DATE`;
   - registration of an asset creates exactly one `registration` row in `asset_status_history`, including when the asset is registered with `poor`/`damaged` condition;
   - cancelling an in-progress record recomputes to `allocated` when an allocation is open, otherwise to `available`/`unavailable`;
   - completion with `poor` + `held_unavailable` and no allocation → `unavailable`;
   - completion with `poor` + `held_unavailable` with an open allocation → 409 `RETURN_BEFORE_HOLD`;
   - completion with `good` + `held_unavailable` → 422 `CONDITION_ELIGIBLE_FOR_SERVICE`;
   - completion with `poor` + `returned_to_service` → 422 `CONDITION_NOT_ALLOCATABLE`; `poor` + `retired` → `retired`;
   - completion with `good` while an allocation is open → `allocated`;
   - retire blocked by an open allocation or in-progress maintenance;
   - audit actors: admin creates a scheduled record, the assigned technician starts it, and the admin completes it → `created_by`, `started_by` and `completed_by` each store the correct user while `technician_id` stays the accountable technician;
   - unified history shows each event once, in descending time order, with the actor of that event;
   - a completion that changes condition and status shows both transitions on the single `maintenance_completed` event;
   - return with a changed condition shows the condition delta on the `returned` event;
   - dashboard totals equal values computed directly from assignments/maintenance;
   - `/assets/:id` ignores or rejects a `status` field.
3. **Concurrency check:** parallel allocation and parallel maintenance-start.
4. **Invariant audit** (`database/verify.sql`, must return zero rows):
   - more than one open allocation per asset;
   - more than one `in_progress` maintenance record per asset;
   - cached `status` disagreeing with recompute logic;
   - retired asset with an open allocation or in-progress maintenance;
   - maintenance record with an actor column inconsistent with its status (`completed` without `completed_by`, `cancelled` without `cancelled_by`, `scheduled` with a start actor, etc.);
   - `scheduled` record with any start, completion, cancellation, outcome or `condition_after` field set;
   - `in_progress` record with any completion, cancellation, outcome or `condition_after` field set;
   - `completed` record with any cancellation field set, or missing a start/completion actor or timestamp;
   - `cancelled` record with any completion field, `outcome` or `condition_after` set, or with only one of the start fields set;
   - `completed_at` earlier than `started_at`, or `cancelled_at` earlier than `started_at`;
   - maintenance marked `completed` whose `outcome`/`condition_after` pairing violates the matrix;
   - asset with zero or more than one `source='registration'` history row;
   - `asset_status_history` gap: status or condition changed without a matching row;
   - maintenance linked to a request with a different asset or a different assigned technician;
   - request missing creation history.

   **Scope and limits of `verify.sql`.** It is a static, point-in-time audit of the data as it exists when the script runs. It can prove that current cached state agrees with current facts, that every asset has exactly one registration history row, that maintenance actor/timestamp/outcome fields are mutually consistent, and that domain events reference existing assets, requests and assignments with matching asset/technician pairs. It cannot prove that every intermediate transition happened, or that an operation wrote its event, if rows are changed directly in MySQL: the database retains no record of the intended operation. Integration tests cover that gap by asserting the exact expected `asset_status_history` and domain-event rows after each lifecycle call. The report presents `verify.sql` as a consistency check, not as proof of complete historical causality.
5. **Security checks:** role matrix per endpoint, direct object-reference attempts (employee A reads B's request), inactive-user token rejection, SQL-injection probes on search parameters.
6. **Responsive/print:** 360, 768, 1280 widths and print preview.

---

## 9. Phase plan

| Phase | Work | Done when |
|---|---|---|
| 0 | Analysis and design (this document) | Approved (revision 5) |
| 1 | Workspaces, env handling, linting, base Express app, React/Tailwind shell | `npm run dev` boots both; `/health` returns 200 |
| 2 | `schema.sql` (12 tables + view), seed, `verify.sql` | Schema executes; seeds load; invariant queries return zero rows |
| 3 | Auth + RBAC + modules + lifecycle service + dashboards/reports APIs | Postman collection and integration tests green |
| 4 | UI shell, auth, dashboards, all module screens | Every route functional, no mock data |
| 5 | End-to-end workflows, concurrency, responsive, print | Test matrix complete with evidence |
| 6 | README, ER/architecture diagrams, API docs, test table, screenshots, comparison study finalised, report/PPT notes | Deliverables complete |

Each phase ends with files created, functionality, tests run and remaining work.

---

## 10. Decisions requiring approval

**Treated as approved from your revision-2 reply** (architecture and 12-table direction): JWT prototype with documented trade-offs; raw `mysql2`; technician FKs → `users`; Recharts; Vitest + Supertest; seed volumes; env-only credentials; real screenshots; Vite + Tailwind v4; R1 twelfth table `asset_status_history` + view; R2 fifth status `unavailable`; R3 maintenance may start on an allocated asset; R5 atomic employee + account creation; R6 evidence-only comparison study. Flag any of these if you intended them to stay open.

**Approved in your revision-4 reply:**

| ID | Decision | Status |
|---|---|---|
| R4 (revised) | Completion has three outcomes: `returned_to_service` (new/good/fair only), `held_unavailable` (poor/damaged only, asset must be returned), `retired` (any condition, asset must be returned). Each outcome's resulting status is asserted after recompute. | Approved |
| R7 | Add `created_by` (NOT NULL), `started_by`, `completed_by`, `cancelled_by` to `maintenance_records`, with CHECK constraints per status and actor-role validation in the service. `technician_id` remains the accountable technician. | Approved |
| R8 | Maintenance state machine: scheduled create/cancel do not change asset status; start, complete and cancel-in-progress recompute transactionally; terminal states reject repeated actions with 409. | Approved |
| R9 | Enrich `v_asset_history` with `status_from/to` and `condition_from/to`, paired by `(source, reference_id)` so a combined condition+status change appears once; actors are taken per event, not from `technician_id`. | Approved |
| R10 | When maintenance links a service request, `maintenance.technician_id` must equal `request.assigned_technician_id` (422 `TECHNICIAN_MISMATCH`). | Approved |

R4 and R7–R10 are approved, with the revision-5 clarifications recorded above. Implementation proceeds in the approved order: **Phase 1** (workspaces, environment handling, linting, base Express app, React/Tailwind shell) is complete and verified — `npm run dev` booted both applications and `/health` returned 200. **Phase 2** (`schema.sql`, 12 tables + view, seed data and invariant checks) has not started. No database objects were created during Phase 1.
