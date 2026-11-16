# Enterprise IT Asset & Service Management System

Product identity: **Nexora — IT Operations Suite**

Academic prototype for managing employees, departments, IT assets, allocations, service
requests and maintenance. The application is an independently developed React/Node.js/Express/MySQL
prototype using synthetic data. It was developed in the context of studying enterprise IT
applications during summer training at Ordnance Factory Kanpur. It is not deployed at, adopted
by, commissioned for, or integrated with any organisation, and it does not use institutional or
production data.

## Project overview

EITAMS provides a role-aware web application for IT asset and service operations. It tracks
assets from registration through allocation, maintenance and retirement, records service
requests and technician work, and provides dashboards and reports for administrators.

## Core functional areas

1. Authentication and role-based access control.
2. Organisation management: departments, employees and user accounts.
3. Asset and service categories.
4. Asset inventory, registration, allocation, return, retirement and lifecycle history.
5. Service request management and technician assignment.
6. Maintenance management, including scheduled and immediate maintenance.
7. Dashboards and reports.

## User roles

- **Admin:** manages organisation data, assets, allocations, requests, maintenance, users and reports.
- **Employee:** views assigned assets, raises and tracks service requests, closes resolved requests.
- **Technician:** views assigned requests, starts and resolves work, and performs permitted maintenance actions.

## Technology stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios.
- Backend: Node.js, Express, JWT, bcrypt.
- Database: MySQL 8.0.
- Testing: Vitest, Supertest.
- Tooling: npm workspaces, ESLint, Prettier.

## Architecture

EITAMS uses a three-tier architecture:

1. React single-page application client.
2. Express REST API under `/api/v1`.
3. MySQL database with constraints, generated columns, indexes and the `v_asset_history` view.

Frontend route restrictions are usability aids only. Backend authorisation remains authoritative.

## Database overview

The approved schema contains 12 tables plus the `v_asset_history` view:

`departments`, `employees`, `roles`, `users`, `asset_categories`, `assets`,
`asset_assignments`, `service_categories`, `service_requests`,
`request_status_history`, `maintenance_records`, `asset_status_history`.

The database enforces allocation and maintenance uniqueness through generated columns and
unique indexes. Asset status is a derived cache recomputed by the single lifecycle service.

## Project structure

```text
client/            React + Vite + Tailwind frontend
server/            Express API, tests, seed and pool helpers
database/          Schema, seed snapshot, verification SQL and database documentation
docs/              Design, phase reports, test plan/report, comparison study
postman/           Reserved for API collection documentation
```

Frontend source is organised under `client/src/api`, `client/src/components`,
`client/src/context`, `client/src/features`, `client/src/hooks`, `client/src/layouts`,
`client/src/pages`, `client/src/router` and `client/src/utils`.

## Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- MySQL 8.0

## Installation and setup

```powershell
npm install
Copy-Item server/.env.example server/.env
mysql --default-character-set=utf8mb4 -u root -p -e "SOURCE database/schema.sql"
npm run db:seed
mysql --default-character-set=utf8mb4 -u root -p --batch --raw -e "SOURCE database/verify.sql"
npm run dev
```

`database/schema.sql` creates the default `eitams` schema. Edit `server/.env` if your MySQL
credentials differ. Do not commit `.env`. If you change `DB_NAME`, also update the
`CREATE DATABASE`/`USE` statements in the static SQL files.

`database/verify.sql` returns only failing rows; a clean run produces no output. See
[`database/README.md`](database/README.md) for schema scope, seed volumes, demo accounts,
time-zone handling and verification limitations.

## Environment configuration

Copy `server/.env.example` to `server/.env` and adjust local values. The template includes:

- `NODE_ENV`
- `PORT`
- `CLIENT_ORIGIN`
- `APP_TIMEZONE` (default `Asia/Kolkata`)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_TEST_NAME`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `BCRYPT_ROUNDS`

Never commit `server/.env`. Use a long random value for `JWT_SECRET` in any non-local
deployment.

## Database setup and seed

1. Create or recreate the schema. This is destructive:

   ```powershell
   mysql --default-character-set=utf8mb4 -u root -p -e "SOURCE database/schema.sql"
   ```

2. Apply the deterministic seed:

   ```powershell
   npm run db:seed
   ```

   Alternatively, execute `database/seed.sql` directly.

3. Run static verification:

   ```powershell
   mysql --default-character-set=utf8mb4 -u root -p --batch --raw -e "SOURCE database/verify.sql"
   ```

A clean verification run returns no rows and exit code 0.

## Running the application

```powershell
npm run dev
```

This starts:

- Express API at `http://localhost:5000`
- React client at `http://localhost:5173`

Health checks:

- `http://localhost:5000/health`
- `http://localhost:5173/health` through the Vite proxy

The frontend displays an API status card so the client-to-backend connection is visible.

## API base path

All API endpoints are served under:

```text
/api/v1
```

## Demo credentials

All seeded accounts use the synthetic local development password `Demo@12345`.

| Username | Role |
|---|---|
| `admin` | admin |
| `ananya.rao` | technician |
| `rohan.iyer` | technician |
| `meera.nair` | technician |
| `vikram.shah` | technician |
| `staff01` ... `staff35` | employee |

These credentials are local demonstration data only. They are not production credentials.

## Test, lint and build commands

| Command | Purpose |
|---|---|
| `npm test -w server` | Run backend integration tests |
| `npm run lint` | Lint server and client sources |
| `npm run build` | Production build of the React client |
| `npm run format` | Format sources with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run dev` | Start API and client together |
| `npm run dev:server` | Start only the Express API |
| `npm run dev:client` | Start only the Vite client |
| `npm run db:seed` | Apply deterministic seed data |
| `npm run db:seed:emit` | Regenerate `database/seed.sql` |

The most recent verified results are:

- Backend tests: 11 files, 37 tests passed, 0 failures.
- Lint: 0 errors, 4 warnings.
- Production build: successful.

## Current implementation and testing status

- Phase 0 design: complete.
- Phase 1 application shell: complete.
- Phase 2 database and seed: complete.
- Phase 3 API and lifecycle services: complete.
- Phase 4 frontend implementation: complete.
- Phase 5 integration, end-to-end and system testing: complete.
- Phase 6 documentation and deliverables: in progress.

Backend integration tests use an isolated `eitams_test` database and reset it before every
test. Frontend verification has been performed through browser workflow checks; no automated
frontend test framework is currently installed.

## Known limitations

- Four non-blocking frontend lint warnings remain.
- The production build emits a chunk-size advisory warning because the client is not code-split.
- Frontend verification is browser/manual rather than automated.
- Concurrency coverage is limited to controlled scenarios, not full stress testing.
- API documentation, Postman collection, ER/architecture/workflow diagrams and screenshots are
  Phase 6 deliverables and are not yet complete.
- The comparison study's existing-system observations remain incomplete where authorised
  training evidence has not been recorded.
- JWTs are stored in browser `localStorage` for this academic prototype; production use would
  require HttpOnly cookies and refresh-token rotation.

## Academic project context and scope

This repository is an independently developed academic prototype. It uses synthetic data only
and does not contain real employee, asset, request or maintenance records. It was developed
to study enterprise IT asset and service management concepts in the context of summer training
at Ordnance Factory Kanpur.

The prototype is not deployed, adopted, commissioned or integrated with any organisation. Any
comparison with an existing enterprise application is evidence-based and clearly separates
observed training context from implemented prototype behaviour.
