# Comparative Study of the Existing Enterprise IT Environment Observed During Training and the Independently Developed EITAMS Prototype

## 1. Purpose and scope

This document supports the comparison chapter of the academic report. It compares:

- **Subject A — the existing enterprise IT environment observed during summer training** at
  Ordnance Factory Kanpur (OFC), Information Technology Centre (ITC), from 11 June 2026 to
  08 July 2026.
- **Subject B — the EITAMS prototype**, an independently designed and developed React,
  Node.js, Express and MySQL application in this repository.

The comparison is qualitative and evidence-based. It is not a benchmark, security audit,
performance test, or claim that either system is superior. Subject A is described only from
direct training observations or information explained during training. Subject B is described
from the implemented source code and project documentation.

## 2. Evidence rules

Every factual statement about Subject A must be classified as one of the following:

- `[T]` — observed or discussed during training.
- `[X]` — not verifiable from the available evidence and therefore excluded from conclusions.

Every factual statement about Subject B must be classified as:

- `[P]` — verified in this repository, with a file path where useful.

No assumption about Subject A is presented as a verified fact. In particular, no database
schema, application architecture, authentication mechanism, deployment infrastructure,
performance figure or security mechanism is invented for Subject A.

## 3. Subject descriptions

### 3.1 Subject A — existing enterprise IT environment observed during training

The following observations are based on the user's summer training context. They are limited
because organisational security restrictions prevented independent inspection of live systems
and source code.

| Attribute | Value / observation | Evidence |
|---|---|---|
| Training organisation | Ordnance Factory Kanpur, Information Technology Centre | `[T]` |
| Training period | 11 June 2026 to 08 July 2026 | `[T]` |
| Database technology discussed or observed | IBM Informix | `[T]` |
| Command-line interface discussed or observed | `isql` | `[T]` |
| Programming / query technologies in training context | PHP and SQL | `[T]` |
| Enterprise systems or databases encountered or mentioned | PPC, eadmin and payroll | `[T]` |
| PPC meaning | Product Planning and Control | `[T]` |
| Enterprise topics observed or discussed | Inventory, quality, production-related information and MIS | `[T]` |
| Access to live systems | Limited | `[T]` |
| Access to complete source code | Not available | `[T]` |
| Complete architecture inspection | Not performed | `[T]` |
| Exact database schema for Subject A | Not verified | `[X]` |
| Exact frontend/backend technology of Subject A applications | Not fully verified | `[X]` |
| Authentication and authorization mechanisms | Not verified | `[X]` |
| Performance, scalability or reliability figures | Not measured | `[X]` |
| Deployment infrastructure | Not verified | `[X]` |

Subject A is therefore treated as a restricted training context, not as a fully audited or
reverse-engineered system.

### 3.2 Subject B — independently developed EITAMS prototype

Subject B is verified from this repository. It is an academic prototype using synthetic data.

| Attribute | Value | Evidence |
|---|---|---|
| Purpose | Asset lifecycle and IT service management for a hypothetical medium-sized organisation | `[P]` `docs/phase-1-design.md` |
| Frontend | React, Vite, React Router, Axios, Tailwind CSS | `[P]` `client/package.json`, `client/src/` |
| Backend | Node.js, Express, layered REST API, JWT, bcrypt | `[P]` `server/package.json`, `server/src/` |
| Database | MySQL 8.0 InnoDB, 12 tables plus `v_asset_history` | `[P]` `database/schema.sql` |
| API base path | `/api/v1` | `[P]` `server/src/app.js` |
| User roles | Admin, Employee, Technician | `[P]` `server/src/services/auth.service.js` |
| Modules | Employee and department management, IT asset management, asset allocation, service request management, technician and maintenance management, dashboard and reports | `[P]` `client/src/features/`, `server/src/routes/` |
| Navigation | Persistent sidebar, role-specific dashboards, filtered tables | `[P]` `client/src/layouts/AppLayout.jsx` |
| Authentication | JWT bearer tokens with bcrypt password hashing | `[P]` `server/src/utils/jwt.js`, `server/src/utils/password.js` |
| Authorization | Role and ownership checks in middleware and services | `[P]` `server/src/middleware/authenticate.js` |
| Data integrity | Foreign keys, CHECK constraints, generated-column uniqueness, transactions | `[P]` `database/schema.sql`, `server/src/db/index.js` |
| Deployment | Local development only; not deployed | `[P]` `README.md` |
| Test status | 37 backend tests passing across 11 test files; frontend verified through browser workflows | `[P]` `docs/phase-5-test-report.md` |

## 4. Comparative dimensions

### 4.1 Organisational context and purpose

- **Subject A:** The training context involved enterprise systems and databases such as PPC,
  eadmin and payroll, with topics including inventory, quality, production-related information
  and MIS. The exact purpose and scope of each system were not independently audited.
- **Subject B:** EITAMS is a focused prototype for IT asset and service management. It
  implements employee, department, asset, allocation, request, maintenance, dashboard and
  reporting workflows for a hypothetical organisation.
- **Comparison:** Both relate to enterprise information management, but Subject A is a
  restricted production environment while Subject B is a smaller, independently implemented
  academic prototype.

### 4.2 Database technology and data organisation

- **Subject A:** IBM Informix was observed or discussed, and SQL was part of the training
  context. The exact schema, tables, constraints and relationships were not verified.
- **Subject B:** MySQL 8.0 InnoDB is used with 12 base tables and the `v_asset_history`
  view. The schema uses primary keys, foreign keys, unique keys, CHECK constraints, generated
  columns and indexes.
- **Comparison:** Both are relational database environments, but only Subject B's schema,
  constraints and relationships are verifiable in this repository.

### 4.3 Application architecture

- **Subject A:** PHP and SQL were part of the training context. The complete application
  architecture, request flow and module boundaries were not independently inspected.
- **Subject B:** A three-tier architecture is implemented: React SPA, Express REST API under
  `/api/v1`, and MySQL. Backend layering separates routes, middleware, controllers and
  services.
- **Comparison:** Subject B demonstrates a modern web-based REST architecture. No equivalent
  architecture claim can be made for Subject A beyond the observed PHP/SQL context.

### 4.4 User interface and interaction model

- **Subject A:** The existing environment was described as menu-driven and form-based during
  training. Detailed screen flows, validation and responsive behaviour were not independently
  captured.
- **Subject B:** The frontend provides role-aware navigation, dashboards, filtered tables,
  forms, modals, status badges, loading/empty/error states and reports.
- **Comparison:** Subject B has verifiable UI workflows and role-based screens. Subject A's
  interface details remain observational.

### 4.5 Authentication and access control

- **Subject A:** Authentication and authorization mechanisms were not directly observed or
  documented in sufficient detail. No claim about password storage, session handling or
  role enforcement is made.
- **Subject B:** Authentication uses JWT bearer tokens and bcrypt password hashing. RBAC
  supports admin, employee and technician roles. Ownership checks restrict employees to
  their own records and technicians to assigned work.
- **Comparison:** Subject B's authentication and authorization are implementation-verified.
  Subject A's mechanisms are not verified.

### 4.6 Data integrity and transaction handling

- **Subject A:** Transaction boundaries, constraints and rollback behaviour were not
  independently inspected.
- **Subject B:** Multi-step operations use database transactions. The schema includes
  foreign keys, CHECK constraints and generated-column uniqueness. Asset status is recomputed
  centrally inside transactions.
- **Comparison:** Subject B demonstrates explicit relational integrity and transactional
  lifecycle handling. Equivalent details for Subject A are unavailable.

### 4.7 Module organisation and workflows

- **Subject A:** Enterprise-related topics included inventory, quality, production and MIS.
  The exact module boundaries and workflows of the existing applications were not verified.
- **Subject B:** The implemented modules are:
  1. Employee and department management.
  2. IT asset management.
  3. Asset allocation and return.
  4. Service request management.
  5. Technician and maintenance management.
  6. Dashboard and reports.
- **Comparison:** Both address enterprise operational workflows, but only Subject B's module
  structure and transitions are verifiable in this repository.

### 4.8 Audit, history and traceability

- **Subject A:** Audit or history capabilities were not independently verified.
- **Subject B:** `request_status_history` records request transitions. `asset_status_history`
  and `v_asset_history` record asset lifecycle events. Maintenance records include creation,
  start, completion, cancellation and outcome details.
- **Comparison:** Subject B provides implemented traceability for asset and request
  workflows. Subject A's traceability capabilities are not verified.

### 4.9 Maintainability and extensibility

- **Subject A:** Maintainability, extensibility and code organisation were not independently
  assessed because source code was not available.
- **Subject B:** The backend uses layered routes, controllers, services, validators and
  middleware. The frontend uses feature-based components. Automated backend tests and
  documentation reports support maintainability.
- **Comparison:** Subject B's structure and verification are visible in the repository.
  Subject A's maintainability cannot be evaluated from the available evidence.

### 4.10 Scope and limitations

- **Subject A:** Limited access means the comparison is based on training observations and
  discussed context, not a complete system audit.
- **Subject B:** The prototype is local, uses synthetic data, has no deployment claims and
  has known limitations such as frontend lint warnings, a bundle-size advisory and manual
  frontend verification.
- **Comparison:** The study is intentionally bounded and does not claim production parity or
  superiority.

## 5. Analytical discussion

A relational database is appropriate for EITAMS because assets, employees, allocations,
requests, maintenance and audit history have clear relationships and integrity requirements.
Foreign keys, CHECK constraints, unique indexes and transactions protect those relationships.

A REST-based web architecture was selected because it separates the React client from the
Express API, allows role-specific frontends to share one backend, and makes endpoints
testable through HTTP. The API uses a consistent JSON envelope and centralized validation.

Role-based authorization supports different users by giving admins full operational access,
employees access to their own assets and requests, and technicians access only to assigned
requests and maintenance. Ownership checks are enforced in services, not only in the
frontend.

Transactions and constraints maintain consistency during multi-step operations such as
allocation, return, maintenance creation, completion and cancellation. The central
`assetLifecycle.service.js` recomputes asset status using the approved precedence, reducing
the risk of inconsistent status updates.

Asset lifecycle history and request status history improve traceability by recording actors,
timestamps, old and new states and remarks. This supports auditability of operational
changes.

The prototype demonstrates a modern web-based approach to a related enterprise-management
problem, including role-aware workflows, transactional lifecycle handling and automated
backend tests. These aspects could not be explored directly in the restricted production
environment.

No conclusion can be drawn about the existing system's full architecture, performance,
security, reliability or maintainability without access to its implementation and
operational data.

## 6. Findings and conclusion

The training provided exposure to an existing enterprise IT environment and its operational
context. EITAMS demonstrates an independently designed and implemented modern web-based
approach to a related enterprise-management problem. It translates learning about enterprise
applications, databases and organisational workflows into a practical prototype.

The prototype is an academic case implementation. It is not an OFC replacement, deployed
system, commissioned system or production integration. No live-system performance or
security superiority is claimed.

### Learning outcomes from the comparative study

- Understanding of how enterprise IT systems support inventory, quality, production and MIS
  functions.
- Exposure to relational database concepts in an enterprise setting, including IBM Informix
  as observed or discussed during training.
- Practical experience designing a modern three-tier web application with React, Express and
  MySQL.
- Application of role-based access control, transactions, constraints and audit history to
  an asset and service-management workflow.
- Recognition of the difference between observed production context and independently
  developed academic prototype behaviour.
- Awareness that meaningful comparison requires verifiable evidence, not assumptions.

## 7. Evidence summary

| Claim area | Subject A | Subject B |
|---|---|---|
| Database technology | Informix observed or discussed | MySQL 8.0 verified |
| Programming context | PHP and SQL observed or discussed | Node.js, Express, React verified |
| Enterprise modules | PPC, eadmin, payroll encountered or mentioned | Employee, asset, request and maintenance modules implemented |
| Source code access | Limited | Full repository access |
| Deployment | Not verified | Local development only |
| Performance figures | Not measured | Not measured |
| Security mechanisms | Not verified | JWT, bcrypt, RBAC and validation implemented |

The comparison is therefore intentionally bounded and evidence-based.
