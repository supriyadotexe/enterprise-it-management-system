# Test Cases and Verification Results

This document records the verification performed for the Enterprise IT Asset & Service
Management System (EITAMS). Automated backend results are taken from the implemented Vitest
and Supertest suite. Browser checks are manual verification only and are not automated
frontend tests.

## Test summary

- Automated backend test files: 11
- Automated backend tests executed: 37
- Automated backend tests passed: 37
- Automated backend tests failed: 0
- Automated frontend test framework: none
- Frontend verification: manual browser verification
- Latest lint result: 0 errors, 4 warnings
- Latest production build: successful

## Automated backend test cases

| Test ID | Test file | Module | Scenario | Preconditions | Steps / input | Expected result | Actual result | Status | Verification method |
|---|---|---|---|---|---|---|---|---|---|
| TC-B01 | `smoke.test.js` | Health and authentication | Health endpoint and admin login | Seeded test database | `GET /health`; `POST /api/v1/auth/login` with `admin` / `Demo@12345` | HTTP 200 and JWT returned | Passed | Pass | Automated backend test |
| TC-B02 | `auth.test.js` | Authentication | Reject invalid credentials | Seeded test database | `POST /api/v1/auth/login` with password `wrong` | HTTP 401 `INVALID_CREDENTIALS` | Passed | Pass | Automated backend test |
| TC-B03 | `auth.test.js` | Authentication | Return current user from database | Admin logged in | `GET /api/v1/auth/me` with bearer token | HTTP 200, username `admin`, role `admin` | Passed | Pass | Automated backend test |
| TC-B04 | `auth.test.js` | Authentication | Reject invalid token | None | `GET /api/v1/auth/me` with `Bearer not-a-token` | HTTP 401 `INVALID_TOKEN` | Passed | Pass | Automated backend test |
| TC-B05 | `auth.test.js` | Authentication | Change password and relogin | `staff01` logged in | `PATCH /api/v1/auth/password`; login with new password | HTTP 200; relogin HTTP 200 | Passed | Pass | Automated backend test |
| TC-B06 | `rbac.test.js` | Authorization | Prevent employee listing employees | `staff01` logged in | `GET /api/v1/employees` | HTTP 403 `FORBIDDEN` | Passed | Pass | Automated backend test |
| TC-B07 | `rbac.test.js` | Authorization | Prevent employee creating an asset | `staff01` logged in | `POST /api/v1/assets` with minimal asset body | HTTP 403 | Passed | Pass | Automated backend test |
| TC-B08 | `rbac.test.js` | Authorization | Prevent technician resolving another technician's request | Admin creates and assigns request; `rohan.iyer` logged in | `PATCH /api/v1/requests/:id/status` to `in_progress` | HTTP 403 `NOT_ASSIGNED_TECHNICIAN` | Passed | Pass | Automated backend test |
| TC-B09 | `allocation.test.js` | Asset allocation and return | Allocate and return an asset | Admin logged in; asset 52 available | Allocate to employee 6, then return assignment | Asset becomes `allocated`, then `available` | Passed | Pass | Automated backend test |
| TC-B10 | `allocation.test.js` | Asset allocation and return | Reject concurrent allocation | Admin logged in; asset 52 available | Two simultaneous allocation requests | One HTTP 201 and one HTTP 409 | Passed | Pass | Automated backend test |
| TC-B11 | `invalid.test.js` | Asset management | Reject arbitrary asset status update | Admin logged in | `PATCH /api/v1/assets/52` with `status: available` | HTTP 400 `VALIDATION_ERROR` | Passed | Pass | Automated backend test |
| TC-B12 | `invalid.test.js` | Maintenance | Reject immediate maintenance with a different scheduled date | Admin logged in | Create maintenance with `status: in_progress` and `scheduled_date: 2099-01-01` | HTTP 400 `INVALID_SCHEDULED_DATE` | Passed | Pass | Automated backend test |
| TC-B13 | `invalid.test.js` | Maintenance | Reject scheduled maintenance without a date | Admin logged in | Create maintenance with `status: scheduled` and no date | HTTP 400 `INVALID_SCHEDULED_DATE` | Passed | Pass | Automated backend test |
| TC-B14 | `invalid.test.js` | Maintenance | Reject returning a poor asset to service | Admin and technician logged in | Complete maintenance with `outcome: returned_to_service`, `condition_after: poor` | HTTP 422 `CONDITION_NOT_ALLOCATABLE` | Passed | Pass | Automated backend test |
| TC-B15 | `invalid.test.js` | Asset allocation and return | Reject returning an already returned assignment | Admin logged in | Return the same assignment twice | HTTP 409 `ASSIGNMENT_ALREADY_RETURNED` | Passed | Pass | Automated backend test |
| TC-B16 | `isolation.test.js` | Employee data isolation | Employee cannot read another employee record | `staff01` logged in | `GET /api/v1/employees/7` | HTTP 403 | Passed | Pass | Automated backend test |
| TC-B17 | `isolation.test.js` | Service requests | Employee only sees own requests | `staff01` logged in | `GET /api/v1/requests` | HTTP 200; all items have employee 6 | Passed | Pass | Automated backend test |
| TC-B18 | `isolation.test.js` | Assets | Employee only sees own assets through assignments | `staff01` logged in | `GET /api/v1/assets` | HTTP 200; response is an array | Passed | Pass | Automated backend test |
| TC-B19 | `maintenance.test.js` | Maintenance | Validate technician role on maintenance creation | Admin logged in | Create maintenance with `technician_id: 1` | HTTP 422 `TECHNICIAN_ROLE_REQUIRED` | Passed | Pass | Automated backend test |
| TC-B20 | `maintenance.test.js` | Maintenance | Complete immediate maintenance with returned_to_service | Admin and technician logged in | Create immediate maintenance, then complete | Asset becomes `available`; history records actor | Passed | Pass | Automated backend test |
| TC-B21 | `maintenance.test.js` | Maintenance | Hold a poor asset unavailable | Admin and technician logged in | Complete maintenance with `held_unavailable`, condition `poor` | Asset becomes `unavailable` | Passed | Pass | Automated backend test |
| TC-B22 | `maintenance.test.js` | Maintenance | Retire an asset through maintenance | Admin and technician logged in | Complete maintenance with `retired` | Asset becomes `retired` | Passed | Pass | Automated backend test |
| TC-B23 | `maintenance.test.js` | Maintenance | Support scheduled maintenance transitions | Admin and technician logged in | Create scheduled, start, cancel | Statuses `scheduled`, `in_progress`, `cancelled` | Passed | Pass | Automated backend test |
| TC-B24 | `maintenance.test.js` | Maintenance | Validate linked maintenance against request asset and technician | Admin logged in | Create maintenance with mismatched asset or technician | HTTP 422 `ASSET_MISMATCH` or `TECHNICIAN_MISMATCH` | Passed | Pass | Automated backend test |
| TC-B25 | `phase5-auth-rbac.test.js` | Authentication | Reject missing and malformed bearer tokens | None | `GET /api/v1/auth/me` without token and with invalid token | HTTP 401 | Passed | Pass | Automated backend test |
| TC-B26 | `phase5-auth-rbac.test.js` | Authorization | Enforce role and ownership restrictions | Employee and technician logged in | Employee accesses admin dashboard; employee reads another request; technician transitions unassigned request | HTTP 403 or conflict as applicable | Passed | Pass | Automated backend test |
| TC-B27 | `phase5-gap-closure.test.js` | Authentication | Reject expired JWTs and deactivated users | `staff01` logged in; expired token generated; `staff01` deactivated in test database | `GET /api/v1/auth/me` with expired token and with original token after deactivation | HTTP 401 for both | Passed | Pass | Automated backend test |
| TC-B28 | `phase5-gap-closure.test.js` | Authentication | Reflect role changes immediately after login | `staff01` logged in; role changed in database | `GET /api/v1/auth/me` before and after role update | Role changes from employee to technician | Passed | Pass | Automated backend test |
| TC-B29 | `phase5-gap-closure.test.js` | Employee management | Roll back invalid employee creation | Admin logged in | Create employee with invalid department | HTTP 400 or greater; no employee record created | Passed | Pass | Automated backend test |
| TC-B30 | `phase5-gap-closure.test.js` | Asset lifecycle | Return during maintenance does not make asset available | Asset 52 allocated and under maintenance | Return assignment, then cancel maintenance | Asset remains `under_maintenance`, then becomes `available` | Passed | Pass | Automated backend test |
| TC-B31 | `phase5-gap-closure.test.js` | Asset lifecycle | Record maintenance history without duplicate view rows | Admin and technician logged in | Complete maintenance on asset 53 | One audit row and one `v_asset_history` event | Passed | Pass | Automated backend test |
| TC-B32 | `phase5-gap-closure.test.js` | Maintenance | Reject conflicting concurrent maintenance completion | Admin and technician logged in | Two simultaneous completion requests | One HTTP 200 and one HTTP 409 | Passed | Pass | Automated backend test |
| TC-B33 | `phase5-gap-closure.test.js` | Database constraints | Enforce direct database constraints | Test database available | Invalid foreign key, invalid CHECK value, duplicate active allocation | All inserts rejected | Passed | Pass | Automated backend test |
| TC-B34 | `phase5-lifecycle.test.js` | Asset lifecycle | Recompute allocated status when maintenance is cancelled | Asset 52 allocated and under maintenance | Cancel in-progress maintenance | Asset becomes `allocated` | Passed | Pass | Automated backend test |
| TC-B35 | `phase5-lifecycle.test.js` | Asset lifecycle | Return allocated asset to allocated after maintenance completion | Asset 52 allocated and under maintenance | Complete maintenance with `returned_to_service` | Asset becomes `allocated` | Passed | Pass | Automated backend test |
| TC-B36 | `phase5-maintenance-constraints.test.js` | Maintenance | Reject second in-progress maintenance for one asset | Asset 52 has in-progress maintenance | Create another maintenance record | HTTP 409 | Passed | Pass | Automated backend test |
| TC-B37 | `phase5-maintenance-constraints.test.js` | Maintenance | Reject duplicate asset codes | Asset code `AST-0001` exists | Register duplicate asset code | HTTP 409 or 422 | Passed | Pass | Automated backend test |

Note: The automated suite contains 37 tests across 11 files. Smoke/health and login are consolidated in TC-B01.

## Manual browser verification

The following checks were performed through the running application. They are not automated frontend tests.

| Test ID | Module | Scenario | Role | Verification method | Result |
|---|---|---|---|---|---|
| TC-M01 | Authentication | Login and logout | Admin, Employee, Technician | Manual browser verification | Passed |
| TC-M02 | Dashboards | Role-specific dashboards render | Admin, Employee, Technician | Manual browser verification | Passed |
| TC-M03 | Assets | Register asset and allocate it | Admin | Manual browser verification | Passed |
| TC-M04 | Assets | Return allocated asset | Admin | Manual browser verification | Passed |
| TC-M05 | Assets | View asset history | Admin | Manual browser verification | Passed |
| TC-M06 | Service requests | Raise service request | Employee | Manual browser verification | Passed |
| TC-M07 | Service requests | Assign technician | Admin | Manual browser verification | Passed |
| TC-M08 | Service requests | Start and resolve request | Technician | Manual browser verification | Passed |
| TC-M09 | Service requests | Close resolved request | Employee | Manual browser verification | Passed |
| TC-M10 | Maintenance | Create and manage maintenance records | Admin / Technician | Manual browser verification | Passed |
| TC-M11 | Reports | View reports and analytics | Admin | Manual browser verification | Passed |
| TC-M12 | UI states | Loading, empty, error and unauthorized navigation states | All roles | Manual browser verification | Passed |

## Limitations

- No automated frontend test framework is installed.
- Manual browser verification is not equivalent to automated frontend tests.
- Concurrency coverage is limited to controlled scenarios.
- Four non-blocking frontend lint warnings remain.
- The production build emits a chunk-size advisory warning.
