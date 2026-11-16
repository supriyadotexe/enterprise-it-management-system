# EITAMS Entity-Relationship Diagram

Product identity: **Nexora — IT Operations Suite**

This document describes the implemented MySQL schema for the Enterprise IT Asset & Service
Management System. It is based on `database/schema.sql` and the backend services that use it.

## ER diagram

```mermaid
erDiagram
    DEPARTMENTS ||--o{ EMPLOYEES : "has"
    ROLES ||--o{ USERS : "assigned to"
    EMPLOYEES ||--o| USERS : "may have login"
    EMPLOYEES }o--|| DEPARTMENTS : "belongs to"
    ASSET_CATEGORIES ||--o{ ASSETS : "classifies"
    USERS ||--o{ ASSETS : "creates"
    USERS ||--o{ ASSETS : "retires"
    ASSETS ||--o{ ASSET_ASSIGNMENTS : "allocated through"
    EMPLOYEES ||--o{ ASSET_ASSIGNMENTS : "receives"
    USERS ||--o{ ASSET_ASSIGNMENTS : "assigns"
    USERS ||--o{ ASSET_ASSIGNMENTS : "returns"
    SERVICE_CATEGORIES ||--o{ SERVICE_REQUESTS : "classifies"
    EMPLOYEES ||--o{ SERVICE_REQUESTS : "raises"
    ASSETS ||--o{ SERVICE_REQUESTS : "may be linked to"
    USERS ||--o{ SERVICE_REQUESTS : "assigned technician"
    SERVICE_REQUESTS ||--o{ REQUEST_STATUS_HISTORY : "has"
    USERS ||--o{ REQUEST_STATUS_HISTORY : "changes"
    ASSETS ||--o{ MAINTENANCE_RECORDS : "maintained through"
    SERVICE_REQUESTS ||--o{ MAINTENANCE_RECORDS : "may be linked to"
    USERS ||--o{ MAINTENANCE_RECORDS : "technician"
    USERS ||--o{ MAINTENANCE_RECORDS : "created by"
    USERS ||--o{ MAINTENANCE_RECORDS : "started by"
    USERS ||--o{ MAINTENANCE_RECORDS : "completed by"
    USERS ||--o{ MAINTENANCE_RECORDS : "cancelled by"
    ASSETS ||--o{ ASSET_STATUS_HISTORY : "has"
    USERS ||--o{ ASSET_STATUS_HISTORY : "changes"

    DEPARTMENTS {
        smallint_unsigned department_id PK
        varchar name UK
        varchar description
        tinyint is_active
        timestamp created_at
        timestamp updated_at
    }

    EMPLOYEES {
        int_unsigned employee_id PK
        varchar employee_code UK
        smallint_unsigned department_id FK
        varchar full_name
        varchar email UK
        varchar phone
        varchar designation
        date date_joined
        tinyint is_active
        timestamp created_at
        timestamp updated_at
    }

    ROLES {
        smallint_unsigned role_id PK
        enum role_name UK
        varchar description
    }

    USERS {
        int_unsigned user_id PK
        int_unsigned employee_id FK
        smallint_unsigned role_id FK
        varchar username UK
        varchar password_hash
        tinyint is_active
        datetime last_login_at
        timestamp created_at
        timestamp updated_at
    }

    ASSET_CATEGORIES {
        smallint_unsigned category_id PK
        varchar category_name UK
        varchar description
        tinyint is_active
    }

    ASSETS {
        int_unsigned asset_id PK
        smallint_unsigned category_id FK
        varchar asset_code UK
        varchar name
        varchar brand
        varchar model
        varchar serial_number UK
        date purchase_date
        date warranty_end
        decimal purchase_cost
        enum asset_condition
        enum status
        int_unsigned created_by FK
        datetime retired_at
        int_unsigned retired_by FK
        varchar notes
        timestamp created_at
        timestamp updated_at
    }

    ASSET_ASSIGNMENTS {
        int_unsigned assignment_id PK
        int_unsigned asset_id FK
        int_unsigned employee_id FK
        int_unsigned assigned_by FK
        datetime assigned_at
        datetime returned_at
        int_unsigned returned_by FK
        enum return_condition
        varchar remarks
        int_unsigned active_asset_id UK
    }

    SERVICE_CATEGORIES {
        smallint_unsigned service_category_id PK
        varchar name UK
        varchar description
        tinyint is_active
    }

    SERVICE_REQUESTS {
        int_unsigned request_id PK
        varchar request_code UK
        int_unsigned employee_id FK
        int_unsigned asset_id FK
        smallint_unsigned service_category_id FK
        int_unsigned assigned_technician_id FK
        varchar title
        text description
        enum priority
        enum status
        datetime assigned_at
        datetime resolved_at
        text resolution_notes
        timestamp created_at
        timestamp updated_at
    }

    REQUEST_STATUS_HISTORY {
        bigint_unsigned history_id PK
        int_unsigned request_id FK
        int_unsigned changed_by FK
        enum old_status
        enum new_status
        varchar remarks
        datetime changed_at
    }

    MAINTENANCE_RECORDS {
        int_unsigned maintenance_id PK
        int_unsigned asset_id FK
        int_unsigned request_id FK
        int_unsigned technician_id FK
        int_unsigned created_by FK
        enum maintenance_type
        text description
        enum status
        date scheduled_date
        datetime started_at
        int_unsigned started_by FK
        datetime completed_at
        int_unsigned completed_by FK
        datetime cancelled_at
        int_unsigned cancelled_by FK
        enum outcome
        enum condition_after
        decimal cost
        date next_due_date
        varchar remarks
        int_unsigned open_asset_id UK
        timestamp created_at
    }

    ASSET_STATUS_HISTORY {
        bigint_unsigned history_id PK
        int_unsigned asset_id FK
        enum old_status
        enum new_status
        enum old_condition
        enum new_condition
        enum source
        int_unsigned reference_id
        int_unsigned changed_by FK
        varchar remarks
        datetime changed_at
    }
```

## Table purposes

| Table | Purpose |
|---|---|
| `departments` | Organisation units used by employees and reports. |
| `employees` | Employee master records. |
| `roles` | Application roles: admin, employee, technician. |
| `users` | Login accounts linked one-to-one to employees. |
| `asset_categories` | Controlled vocabulary for asset registration. |
| `assets` | Asset master records and derived status cache. |
| `asset_assignments` | Allocation and return history, including one open allocation per asset. |
| `service_categories` | Controlled vocabulary for service requests. |
| `service_requests` | Employee-raised service requests and assignments. |
| `request_status_history` | Append-only request status transition audit. |
| `maintenance_records` | Scheduled and immediate maintenance lifecycle records. |
| `asset_status_history` | Append-only asset status and condition audit. |

## Constraints and generated columns

- `asset_assignments.active_asset_id` is a stored generated column equal to `asset_id` when
  `returned_at IS NULL`, otherwise `NULL`. Its unique key enforces at most one open
  allocation per asset.
- `maintenance_records.open_asset_id` is a stored generated column equal to `asset_id` when
  `status = 'in_progress'`, otherwise `NULL`. Its unique key enforces at most one
  in-progress maintenance record per asset.
- Foreign keys use `ON DELETE RESTRICT` for most relationships. `maintenance_records.request_id`
  uses `ON DELETE SET NULL`.
- CHECK constraints enforce active flags, warranty ranges, purchase cost, retirement pairs,
  assignment return timing and actor pairing, request resolved timestamps, maintenance field
  sets and completion ordering.
- `asset_status_history.reference_id` is polymorphic by design and is not a foreign key.

## `v_asset_history`

`v_asset_history` is a database view, not a base table. It consolidates lifecycle events
from `assets`, `asset_assignments`, `maintenance_records` and `asset_status_history` so that
registration, allocation, return, maintenance scheduled/started/completed/cancelled, manual
edits and direct retirement appear once. Allocation, return and maintenance events are read
from their domain tables, while audit-only manual edits and retirements are read from
`asset_status_history`.
