# Phase 3 — Backend Implementation Report

## 1. Introduction and backend objectives

The backend implements the REST API and business logic for the Enterprise IT Asset & Service
Management System. Its objectives are to provide authenticated, role-aware access to
organisation, asset, allocation, service request and maintenance data; to protect the asset
lifecycle through a single transactional status service; and to expose consistent JSON
responses and validation errors to the React frontend.

The backend is implemented as an Express application backed by MySQL 8. It is used by the
React client through the `/api/v1` base path.

## 2. Backend technology stack

- Node.js and Express for the HTTP API.
- MySQL 8 accessed through `mysql2/promise`.
- JSON Web Tokens (`jsonwebtoken`) for stateless authentication.
- bcrypt (`bcryptjs`) for password hashing.
- Helmet, CORS, Morgan and Express JSON parsing middleware.
- Custom validation and error-handling middleware.
- Vitest and Supertest for automated backend integration tests.

## 3. Backend directory structure

The backend is organised under `server/src/`:

- `app.js` creates and configures the Express application.
- `config/env.js` validates environment variables.
- `db/` contains the lazy connection pool, transaction helper, time-zone helper and seed runner.
- `middleware/` contains authentication, authorization, error handling, not-found handling and login rate limiting.
- `routes/` defines endpoint paths and applies middleware.
- `controllers/` translate HTTP requests into service calls.
- `services/` contain business logic and database transactions.
- `validators/` contain request validation rules.
- `utils/` contain API errors, pagination, password hashing and JWT helpers.

## 4. Three-tier architecture and request flow

A request follows this path:

1. The React client sends an HTTP request to `/api/v1/...`.
2. Vite proxies local development requests to the Express API.
3. Express applies Helmet, CORS, JSON parsing and, where configured, request logging.
4. Route-level middleware authenticates the bearer token, authorizes the role and validates input.
5. The controller calls the relevant service.
6. The service uses parameterized SQL through the shared pool or a transactional connection.
7. MySQL returns rows or errors.
8. The controller returns a JSON envelope.
9. Errors are converted by the centralized error handler into a consistent error response.

The frontend never writes asset status directly. Asset status changes are performed inside
backend transactions through `assetLifecycle.service.js`.

## 5. Express application setup and API versioning

`createApp()` in `server/src/app.js` configures:

- `x-powered-by` disabled.
- Helmet security headers.
- CORS restricted to configured client origins.
- JSON and URL-encoded body parsing with a 1 MB limit.
- Morgan logging outside test mode.
- Route mounting under `/health` and `/api/v1/...`.
- A 404 handler and centralized error handler.

All application routes are mounted under `/api/v1`, except `/health`.

## 6. Database connectivity and connection-pool configuration

The database layer is implemented in `server/src/db/pool.js` and `server/src/db/index.js`:

- `createDatabasePool()` creates a `mysql2` pool.
- `charset` is set to `utf8mb4`.
- The approved `Asia/Kolkata` time zone is converted to a numeric offset.
- `dateStrings: true` keeps DATE/DATETIME values as exact strings.
- Every physical connection runs `SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci` and
  `SET time_zone = ?`.
- `getPool()` lazily creates the pool and selects the test database when `NODE_ENV=test`.
- `withTransaction()` obtains a dedicated connection, begins a transaction, commits on
  success and rolls back on failure.
- `closePool()` is used by tests and graceful shutdown.

## 7. Authentication using JWT and bcrypt

Authentication is implemented in `server/src/services/auth.service.js` and related utilities:

- `POST /api/v1/auth/login` validates credentials.
- Passwords are verified with bcrypt.
- Inactive user or employee accounts receive the same invalid-credentials response as
  unknown users or incorrect passwords.
- On successful login, a JWT is signed with `HS256` and an 8-hour expiry by default.
- `GET /api/v1/auth/me` re-reads the current user from the database on every request.
- `PATCH /api/v1/auth/password` verifies the current password before hashing and storing
  the new password.
- `POST /api/v1/auth/logout` acknowledges logout; the client discards the token.

Because the current user is re-read from the database, role changes and deactivation take
effect immediately, even if an older token is still present.

## 8. Authorization and role-based access control

Authorization is implemented through `server/src/middleware/authenticate.js`:

- `authenticate` requires a `Bearer` token and verifies it using the configured JWT secret.
- `authorize(...roles)` checks the database-derived role.
- `isAdmin`, `isTechnician` and `isEmployee` provide role-specific guards.
- Ownership checks are enforced in services. For example, employees may only access their own
  employee record and requests; technicians may only access requests and maintenance assigned
  to them.

Role checks are never based solely on the JWT payload. The database value is authoritative.

## 9. Backend layering: routes, middleware, controllers and services

The backend follows a layered structure:

- **Routes** define paths, apply authentication, authorization and validation, and delegate
  to controllers.
- **Middleware** handles authentication, authorization, validation, rate limiting,
  not-found handling and centralized errors.
- **Controllers** call services and return HTTP responses.
- **Services** implement business rules, transactional updates and database queries.
- **Validators** use a custom schema validator that rejects unknown fields and returns
  field-level error details.

This separation keeps HTTP concerns out of the business logic and allows transactional
services to be tested through the API.

## 10. Employee and department management

Employee and department functionality is implemented in `employee.service.js`,
`department.service.js` and `user.service.js`:

- Departments can be listed, created, updated and activated/deactivated.
- Employees can be listed, created, viewed, updated and activated/deactivated.
- Employee creation accepts an optional nested account. Employee and account creation occur
  inside one transaction.
- Duplicate employee codes, emails and usernames are rejected.
- Invalid or inactive department references are rejected.
- Employee deactivation cascades to the linked user account.
- Employees can read their own record; admins can read all records.
- Employee assets and requests are exposed through nested endpoints.

## 11. Asset registration and management

Asset functionality is implemented in `asset.service.js` and `assetLifecycle.service.js`:

- Assets can be listed with filters, registered, viewed, updated and retired.
- Asset registration validates the active asset category and date range.
- Duplicate asset codes and serial numbers are rejected.
- Asset status is not directly editable through the update endpoint.
- Retirement requires no open allocation and no in-progress maintenance.
- Asset history is exposed through `GET /api/v1/assets/:id/history`.
- Maintenance records for an asset are exposed through `GET /api/v1/assets/:id/maintenance`.

## 12. Asset allocation and return workflows

Allocation and return are implemented in `assetLifecycle.service.js`:

- `POST /api/v1/assets/:id/assign` allocates an available asset to an active employee.
- An asset cannot be allocated if it is retired, under maintenance, already allocated or
  unavailable.
- `POST /api/v1/assignments/:id/return` records the return condition and remarks.
- The asset status is recomputed after allocation and return.
- The generated `active_asset_id` column enforces one open allocation per asset.
- Concurrent allocation attempts result in one success and one conflict.

## 13. Service request management

Service requests are implemented in `request.service.js`:

- Employees can create and view their own requests.
- Admins can list and manage all requests.
- Requests can be linked to an asset currently allocated to the employee.
- Admins can assign an active technician.
- Assigned technicians and admins can start work.
- Only the assigned technician can resolve a request.
- Requesters and admins can close resolved requests.
- Admins can cancel open requests.
- Employees can edit their own pending requests.
- Every transition writes `request_status_history`.
- Invalid or repeated transitions return `409 INVALID_REQUEST_TRANSITION`.

## 14. Technician and maintenance management

Maintenance is implemented in `assetLifecycle.service.js` and `maintenance.service.js`:

- Maintenance can be created by admins and technicians.
- Technicians may only create maintenance for themselves.
- The technician must be an active user with the technician role.
- Immediate maintenance uses the current date and marks the asset under maintenance.
- Scheduled maintenance requires a future or current scheduled date and does not change the
  asset until started.
- Maintenance can be linked to a service request only when the asset and technician match.
- Maintenance can be started, completed or cancelled by the assigned technician or an admin.
- Completion supports three outcomes:
  - `returned_to_service`
  - `held_unavailable`
  - `retired`
- Completion validates condition/outcome combinations and requires return of open allocations
  for `held_unavailable` and `retired`.
- Maintenance list and detail endpoints enforce technician scoping.

## 15. Centralized asset lifecycle management

`assetLifecycle.service.js` is the central authority for asset status changes. It uses
`recomputeAssetStatus()`, which:

1. Locks the asset row with `SELECT ... FOR UPDATE`.
2. Checks for an in-progress maintenance record.
3. Checks for an open allocation.
4. Applies the approved precedence:
   - retired
   - under_maintenance
   - allocated
   - available when condition is `new`, `good` or `fair`
   - unavailable otherwise
5. Updates `assets.status`.
6. Writes `asset_status_history` only when status or condition changes.

Allocation, return, maintenance start, maintenance completion, maintenance cancellation and
retirement all call this function inside a transaction. This prevents scattered status
updates and keeps history consistent.

## 16. Database transactions and integrity safeguards

Transactions are used for multi-step operations, including:

- Asset registration and initial history.
- Asset update and condition history.
- Asset retirement.
- Asset allocation.
- Asset return.
- Maintenance creation, start, completion and cancellation.
- Employee and account creation.
- Request creation, update, assignment, transition and cancellation.
- User account creation and updates.

Integrity safeguards include:

- Parameterized SQL queries throughout services.
- Foreign keys and CHECK constraints in the schema.
- Generated-column uniqueness for one open allocation per asset.
- Unique in-progress maintenance per asset.
- Row locking with `FOR UPDATE`.
- Transaction rollback on failure.
- Service-level validation for active employees, active categories and technician roles.

## 17. Validation and error handling

Validation is implemented through custom validators in `server/src/validators/`. They:

- Validate required fields, types, ranges, enums, dates and email formats.
- Reject unknown fields.
- Return `400 VALIDATION_ERROR` with field-level details.

Business-rule failures use `ApiError` with appropriate status codes:

- `401` for authentication failures.
- `403` for authorization failures.
- `404` for missing records.
- `409` for conflicts and invalid transitions.
- `422` for semantic validation failures.

A centralized error handler converts errors into the standard JSON error envelope.

## 18. Testing approach and verified results

Automated backend tests use Vitest and Supertest. The test database is reset before every
test through `server/tests/setup.js`.

Verified results:

- 11 backend test files.
- 37 backend tests passed.
- 0 failures.
- Lint: 0 errors, 4 warnings.
- Production build: successful.

Automated coverage includes authentication, authorization, allocation, maintenance,
invalid requests, isolation, asset lifecycle invariants, database constraints and
concurrency checks.

Frontend workflows were verified through browser checks during Phase 4 and Phase 5. These
are manual verification results, not automated frontend tests.

## 19. Security considerations and known limitations

Security measures:

- JWT authentication with bcrypt password hashing.
- Role-based authorization.
- Ownership checks in services.
- Parameterized SQL queries.
- Helmet headers and CORS origin restriction.
- Login rate limiting.
- Centralized validation and error handling.

Known limitations:

- JWTs are stored in browser `localStorage` in the frontend; production use would require
  HttpOnly cookies and refresh-token rotation.
- Frontend route restrictions are usability aids; backend authorization is authoritative.
- Four non-blocking frontend lint warnings remain.
- The frontend bundle exceeds 500 kB and is not code-split.
- No automated frontend test framework is installed.
- Full multi-user concurrency stress testing was not performed; only controlled scenarios
  were executed.

## 20. Conclusion

The backend provides the complete API and business-logic layer for the EITAMS prototype. It
implements authentication, authorization, organisation management, asset lifecycle
management, allocations, returns, service requests, maintenance and reporting endpoints.
Asset status is recomputed centrally through `assetLifecycle.service.js`, preserving the
approved precedence and history rules. The implementation is covered by 37 passing backend
integration tests and verified frontend browser workflows.

The system remains an independently developed academic prototype using synthetic data. It is
not deployed, adopted, commissioned or integrated with any organisation.
