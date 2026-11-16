# Implementation checklist

**Status:** Phases 0–5 complete and verified. Phase 6 documentation and deliverables are in
progress. No Phase 6 deliverable is marked complete until it has been created and verified.

This checklist tracks the approved phase plan in `docs/phase-1-design.md`.

## Cross-cutting clarifications (approved)

- [x] **Technician role validation.** `maintenance_records.technician_id` references a user
      whose role is exactly `technician`; an admin or employee is rejected with
      `422 TECHNICIAN_ROLE_REQUIRED`. Validated on create and covered by integration tests.
- [x] **`verify.sql` scope.** Static audit limited to current-state/history consistency,
      exactly one registration row per asset, actor/timestamp/outcome consistency, and domain
      events referencing existing assets, requests and assignments.
- [x] **Time zone.** `APP_TIMEZONE` validated as an IANA name, default `Asia/Kolkata`.
      MySQL sessions use the derived numeric offset; immediate maintenance uses `CURDATE()`
      in that zone.

## Phase 1 — workspaces and application shell

- [x] Root npm workspaces for `server` and `client` with a single lockfile
- [x] Root scripts for `dev`, `dev:server`, `dev:client`, `lint`, `format`, `format:check`,
      `build`
- [x] `.gitignore`, `.editorconfig`, Prettier and ESLint configuration
- [x] Server environment loader with validation and `.env.example`; no secrets committed
- [x] Express app with Helmet, CORS, JSON parsing, request logging, 404 and error handling
- [x] `GET /health` returning 200 with service metadata and configured timezone
- [x] Graceful shutdown and port-in-use reporting
- [x] React + Vite + Tailwind shell with routing, API status card and responsive landing page
- [x] Vite dev proxy for `/health` and `/api`
- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] `npm run dev` starts both services
- [x] `GET /health` returns HTTP 200 directly and through the Vite proxy
- [x] Phase 1 report recorded with commands and actual results

## Phase 2 — database (complete and verified)

- [x] `database/schema.sql`: 12 tables + `v_asset_history`, constraints, indexes, generated
      columns
- [x] Every MySQL session sets `time_zone` from `APP_TIMEZONE`
- [x] Deterministic seed script; credentials only from `.env`
- [x] `database/verify.sql`: current-state and history consistency checks
- [x] Invariant queries return zero rows; seed and schema execute cleanly
- [x] `database/seed.sql` reruns cleanly; seed volumes and status distribution documented
- [x] Negative probes confirm generated-column uniqueness, CHECK constraints and audit detection
- [x] Actual MySQL 8.0.46 execution results recorded in `docs/phase-2-report.md`

## Phase 3 — API and lifecycle

- [x] JWT authentication, bcrypt hashing, RBAC middleware
- [x] Employee/department, asset, allocation, request and maintenance endpoints
- [x] Single `assetLifecycle.service.js` recompute path with transactions and row locks
- [x] Technician-role validation on maintenance create/update
- [x] Integration tests, including seeded history-event assertions
- [ ] Postman collection

## Phase 4 — UI modules

- [x] Authentication and role-aware layout/navigation
- [x] Dashboards and all module screens backed by real API data
- [x] No mock data; loading, empty and error states

## Phase 5 — verification

- [x] End-to-end workflows, permission matrix, concurrency and responsive checks
- [x] Automated backend integration tests
- [x] Asset lifecycle invariant tests
- [x] Database constraint and rollback tests
- [x] Final lint and production build verification
- [x] `docs/test-cases.md` with actual results and evidence
- [x] `docs/phase-5-test-plan.md` and `docs/phase-5-test-report.md`

## Phase 6 — deliverables

- [ ] README, ER/architecture diagrams, API docs, test table, screenshots, comparison study
      finalised, report/PPT notes
- [ ] `docs/api.md`
- [ ] `docs/er-diagram.md`
- [ ] `docs/architecture.md`
- [x] `docs/test-cases.md`
- [ ] `docs/screenshots/`
- [ ] Postman collection
- [ ] Comparison study finalised with evidence tags and limitations
- [ ] Report/PPT notes

## Current verified results

- Backend tests: 11 files, 37 tests passed, 0 failures.
- Lint: 0 errors, 4 warnings.
- Production build: successful.
- Phase 5 documentation: `docs/phase-5-test-plan.md` and `docs/phase-5-test-report.md`.
