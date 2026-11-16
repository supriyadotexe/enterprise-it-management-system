# Phase 5 — Integration, End-to-End and System Test Plan

## 1. Objective

Phase 5 verifies the complete Enterprise IT Asset & Service Management System without expanding its functional scope. The backend REST API, database constraints, asset lifecycle rules, request and maintenance workflows, role-based authorization, frontend workflows, and regression behavior must be validated against the approved design.

No Phase 6 documentation or presentation work is included.

## 2. Current implementation and test baseline

### Backend

- Runtime: Node.js, Express, MySQL 8.
- API base path: `/api/v1`.
- Tests: Vitest + Supertest under `server/tests/`.
- Test setup: `server/tests/setup.js` resets the test database before every test using `database/schema.sql` and `database/seed.sql`.
- Existing test files at plan creation:
  - `smoke.test.js`
  - `auth.test.js`
  - `rbac.test.js`
  - `allocation.test.js`
  - `maintenance.test.js`
  - `invalid.test.js`
  - `isolation.test.js`
- Added during Phase 5:
  - `phase5-auth-rbac.test.js`
  - `phase5-lifecycle.test.js`
  - `phase5-maintenance-constraints.test.js`
  - `phase5-gap-closure.test.js`
- Backend test command: `npm test -w server`.
- Database test name is configured through `DB_TEST_NAME` / `.env`.

### Frontend

- React + Vite + Tailwind + React Router + Axios.
- No automated frontend test framework currently exists.
- Frontend verification in Phase 4 was manual browser verification.
- Lint command: `npm run lint`.
- Build command: `npm run build`.

### Existing coverage baseline

| Area | Coverage after final gap closure | Notes |
|---|---|---|
| Smoke / health | Health and login | Automated |
| Authentication | Valid/invalid login, invalid token, password change, expired JWT, deactivated user, role change | Rate-limit behavior remains a limitation |
| Authorization | Role restrictions, employee ownership, technician assignment, admin-only mutation depth | Automated |
| Allocation | Allocation/return, invalid asset status, invalid employee, concurrent attempts | Automated |
| Maintenance | Create/start/complete, all outcomes, invalid combinations, duplicate in-progress, request mismatch, actor attribution, repeated terminal actions | Automated |
| Invalid requests | Validation and invalid transitions | Automated for key cases |
| Isolation | Employee ownership and technician assignment restrictions | Automated |
| Asset lifecycle | Maintenance on allocated asset, return during maintenance, cancellation recomputation, completion with open allocation, history and view duplicate checks | Automated |
| Database constraints | Direct FK, CHECK, generated-column uniqueness, duplicate in-progress maintenance, invalid employee rollback | Direct SQL plus API tests |
| Frontend | Manual browser verification | No automated frontend test framework installed |

## 3. Test categories

1. **Backend integration tests** — REST API, controllers, services, database.
2. **Authorization and security tests** — JWT, roles, ownership, forbidden operations.
3. **Asset lifecycle invariant tests** — authoritative status and history rules.
4. **Database and concurrency tests** — constraints, transactions, rollback, race conditions.
5. **Frontend integration/workflow tests** — primary user journeys and UI states (manual plus lightweight automation where available).
6. **Regression tests** — rerun all existing and newly added tests after changes.

## 4. Test environment and isolation

- Backend tests must run only against `eitams_test`.
- `NODE_ENV=test` and `DB_TEST_NAME` must select the test database.
- Every test resets schema and seed data through `resetDatabase()`.
- Tests must not run against `eitams` or any non-test database.
- Frontend tests, if introduced, must use local dev server and isolated browser state; no production claims.
- Test data must remain synthetic.

## 5. Backend integration test matrix

### 5.1 Authentication and authorization

- Valid login for admin, employee and technician.
- Invalid username.
- Incorrect password.
- Missing credentials.
- Missing Authorization header.
- Malformed bearer token.
- Expired token.
- Deactivated user login and token access.
- Role change after login.
- Admin-only endpoint access by employee/technician.
- Employee-only endpoint access by admin/technician where applicable.
- Technician-only endpoint access by admin/employee where applicable.
- Employee accessing another employee's request.
- Technician modifying a request not assigned to them.

### 5.2 Employee and organisation management

- Department creation and listing.
- Employee creation with department.
- Duplicate employee/account handling.
- Atomic employee and user-account creation.
- Invalid department reference.
- Employee deactivation without deleting historical records.
- Account role assignment and activation status.

### 5.3 Asset management

- Valid asset registration.
- Missing required fields.
- Duplicate asset code.
- Asset editing.
- Asset retirement.
- Direct invalid status manipulation rejected.
- Asset history record creation.
- No duplicate registration history.

### 5.4 Allocation and return

- Successful allocation.
- Successful return with condition and remarks.
- Allocating already allocated asset.
- Allocating under-maintenance asset.
- Allocating unavailable asset.
- Allocating retired asset.
- Invalid employee reference.
- Returning non-allocated asset.
- Return condition lifecycle update.
- Concurrent allocation attempts.

### 5.5 Service request management

- Employee creates own request.
- Employee views only own requests.
- Admin assigns technician.
- Invalid technician assignment.
- Technician starts assigned request.
- Technician resolves assigned request.
- Unauthorized transitions rejected.
- Employee closes resolved request.
- Request history records every valid transition.
- Invalid/repeated transitions return conflict.
- Invalid status payload rejected.

### 5.6 Maintenance management

- Scheduled creation with future date.
- Immediate creation without date.
- Missing scheduled date rejected.
- Technician validation.
- Starting scheduled maintenance.
- Starting immediate maintenance.
- Cancelling scheduled maintenance.
- Cancelling in-progress maintenance.
- Completing with `returned_to_service`.
- Completing with `held_unavailable`.
- Completing with `retired`.
- Invalid outcome/condition combinations.
- Duplicate in-progress maintenance rejected.
- Maintenance linked to mismatched request asset rejected.
- Maintenance linked to another technician's request rejected.
- Actor attribution.
- Repeated terminal actions rejected.

## 6. Asset lifecycle invariant test matrix

Approved precedence:

1. Retired
2. Under maintenance
3. Allocated
4. Available when condition eligible
5. Unavailable when condition not eligible

Invariant scenarios:

- Starting maintenance on allocated asset leaves allocation open.
- Returning asset during maintenance does not make it available.
- Completing maintenance on asset with open allocation results in `allocated`.
- Cancelling in-progress maintenance recomputes status.
- Completing with `held_unavailable` produces `unavailable` when conditions allow.
- Retirement produces `retired`.
- Every actual status/condition transition creates history.
- No duplicate registration history.
- `v_asset_history` presents lifecycle events without duplicate transition rows.

## 7. Database and concurrency test matrix

- Foreign key constraints reject invalid references.
- CHECK constraints reject invalid enum/range values.
- Generated-column uniqueness rejects duplicate active allocation.
- One in-progress maintenance per asset.
- Transaction rollback on failed multi-step operation.
- No partially created employee/account.
- No inconsistent asset status after failed allocation/return/maintenance.
- Concurrent allocation attempts do not violate invariants.
- Concurrent maintenance completion does not corrupt asset status.

## 8. Frontend integration and workflow test matrix

### Admin

- Login and dashboard.
- Register asset.
- Allocate asset.
- Return asset.
- View asset history.
- Assign service request.
- Manage maintenance.
- View employees, departments and reports.

### Employee

- Login.
- Dashboard and assigned assets.
- Raise service request.
- Request history.
- Close resolved request.

### Technician

- Login.
- Assigned requests.
- Start and resolve.
- Permitted maintenance actions.

### UI states and behavior

- Loading states.
- Empty states.
- Error states.
- API error display.
- Unauthorized navigation blocking.
- Session expiry handling.
- Form validation.
- Responsive layout does not break critical workflows.

Frontend testing will remain lightweight and aligned to existing tooling. Automated frontend tests may be added only if justified; otherwise, a documented manual checklist with screenshots/browser verification will be used.

## 9. Regression execution

After each meaningful test or defect fix:

1. Run the affected backend test file.
2. Run the complete backend suite: `npm test -w server`.
3. Run frontend lint: `npm run lint`.
4. Run frontend production build: `npm run build`.
5. Re-run browser verification for affected workflows if frontend changes were made.

## 10. Defect handling

When a test fails:

1. Document the failing scenario.
2. Identify the root cause in the appropriate layer.
3. Fix without weakening tests or business rules.
4. Add a regression test.
5. Rerun relevant tests.
6. Rerun the complete suite.

## 11. Deliverables

- `docs/phase-5-test-plan.md`
- Expanded backend integration tests.
- Asset lifecycle invariant tests.
- Database/concurrency tests where feasible.
- Frontend workflow verification evidence.
- `docs/phase-5-test-report.md` with executed counts, failures, defects, coverage, limitations, and final lint/build results.

## 12. Exit criteria

Phase 5 is complete only when:

- Backend integration tests pass.
- Asset lifecycle invariants are verified.
- Database constraints and concurrency behavior are verified.
- Frontend critical workflows are verified.
- Regression suite passes.
- Final report is created.
- No Phase 6 work has begun.
