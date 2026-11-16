# EITAMS REST API Documentation

Product identity: **Nexora — IT Operations Suite**

**Base path:** `/api/v1`  
**Authentication:** JWT Bearer token, except `POST /api/v1/auth/login`  
**Content type:** `application/json`  
**Application time zone:** `Asia/Kolkata` (`+05:30`)

This document describes the implemented REST API. The source code is authoritative. Request and response examples use synthetic data only.

## 1. Common conventions

### Successful responses

Single-resource and action responses:

```json
{
  "success": true,
  "data": {}
}
```

Paginated responses:

```json
{
  "success": true,
  "data": {
    "items": [],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

### Error responses

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed.",
    "details": [
      { "field": "name", "message": "Is required." }
    ]
  }
}
```

Common status codes:

| Status | Meaning |
|---|---|
| 200 | Successful read or update |
| 201 | Resource created |
| 400 | Validation or request error |
| 401 | Missing, invalid, expired or inactive account token |
| 403 | Authenticated but not permitted |
| 404 | Resource not found |
| 409 | Business-rule conflict or invalid transition |
| 422 | Semantic validation failure |
| 500 | Unexpected server error |

### Authentication

Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

Login returns `token`, `tokenType`, `expiresIn` and `user`. The frontend stores the token in
`localStorage` under `eitams.access_token` for this academic prototype. Production use should
use short-lived HttpOnly cookies.

### Pagination and filtering

List endpoints that support pagination use `page` and `limit`. Additional filters are
documented per endpoint. Unknown fields are rejected by validation.

## 2. Authentication

| Method | Route | Auth | Roles | Purpose |
|---|---|---|---|---|
| POST | `/auth/login` | None | Public | Authenticate and issue a JWT |
| GET | `/auth/me` | Bearer | Any active user | Return the current database-derived user |
| PATCH | `/auth/password` | Bearer | Any active user | Change the current user's password |
| POST | `/auth/logout` | Bearer | Any active user | Acknowledge logout |

Login body:

```json
{
  "username": "admin",
  "password": "Demo@12345"
}
```

Password change body:

```json
{
  "currentPassword": "Demo@12345",
  "newPassword": "NewPassword@123"
}
```

## 3. Departments

| Method | Route | Auth | Roles | Purpose |
|---|---|---|---|---|
| GET | `/departments` | Bearer | Any | List departments |
| POST | `/departments` | Bearer | Admin | Create a department |
| PATCH | `/departments/:id` | Bearer | Admin | Update a department |
| PATCH | `/departments/:id/status` | Bearer | Admin | Activate or deactivate a department |

Create/update body:

```json
{
  "name": "IT Support",
  "description": "Technology support and infrastructure"
}
```

Status body:

```json
{
  "is_active": true
}
```

## 4. Employees and users

### Employees

| Method | Route | Auth | Roles | Purpose |
|---|---|---|---|---|
| GET | `/employees` | Bearer | Admin | List employees |
| POST | `/employees` | Bearer | Admin | Create employee and optional account atomically |
| GET | `/employees/:id` | Bearer | Admin or self | View employee |
| PATCH | `/employees/:id` | Bearer | Admin | Update employee |
| PATCH | `/employees/:id/status` | Bearer | Admin | Activate or deactivate employee and linked account |
| GET | `/employees/:id/assets` | Bearer | Admin or self | List employee asset allocations |
| GET | `/employees/:id/requests` | Bearer | Admin or self | List employee service requests |

Employee creation body:

```json
{
  "employee": {
    "employee_code": "EMP-0041",
    "department_id": 1,
    "full_name": "Asha Verma",
    "email": "asha.verma@example.com",
    "phone": "+91-90000-00041",
    "designation": "IT Support Officer",
    "date_joined": "2026-11-17"
  },
  "account": {
    "username": "staff41",
    "role_id": 3,
    "password": "Demo@12345"
  }
}
```

The `account` object is optional. When supplied, employee and account creation occur in one
transaction.

### Users

| Method | Route | Auth | Roles | Purpose |
|---|---|---|---|---|
| POST | `/users` | Bearer | Admin | Attach an account to an existing employee |
| PATCH | `/users/:id` | Bearer | Admin | Update username, role or active state |
| POST | `/users/:id/reset-password` | Bearer | Admin | Reset a user password |

User creation body:

```json
{
  "employee_id": 41,
  "username": "staff41",
  "role_id": 3,
  "password": "Demo@12345"
}
```

## 5. Asset categories and service categories

Both category groups use the same request and response patterns.

| Method | Route | Auth | Roles | Purpose |
|---|---|---|---|---|
| GET | `/asset-categories` | Bearer | Any | List asset categories |
| POST | `/asset-categories` | Bearer | Admin | Create asset category |
| PATCH | `/asset-categories/:id` | Bearer | Admin | Update asset category |
| GET | `/service-categories` | Bearer | Any | List service categories |
| POST | `/service-categories` | Bearer | Admin | Create service category |
| PATCH | `/service-categories/:id` | Bearer | Admin | Update service category |

Category body:

```json
{
  "name": "Laptop",
  "description": "Portable business computers",
  "is_active": true
}
```

## 6. Assets

| Method | Route | Auth | Roles | Purpose |
|---|---|---|---|---|
| GET | `/assets` | Bearer | Any | List assets with filters |
| POST | `/assets` | Bearer | Admin | Register an asset |
| GET | `/assets/:id` | Bearer | Any | View asset detail |
| PATCH | `/assets/:id` | Bearer | Admin | Update editable asset fields |
| POST | `/assets/:id/retire` | Bearer | Admin | Retire an asset |
| GET | `/assets/:id/history` | Bearer | Any | View unified asset lifecycle history |
| GET | `/assets/:id/maintenance` | Bearer | Any | List maintenance for an asset |

Asset registration body:

```json
{
  "category_id": 2,
  "asset_code": "LAP-2041",
  "name": "Dell Latitude 5440",
  "brand": "Dell",
  "model": "Latitude 5440",
  "serial_number": "SN-LAP-2041",
  "purchase_date": "2026-11-17",
  "warranty_end": "2029-11-17",
  "purchase_cost": 75000.00,
  "asset_condition": "good",
  "notes": "Registered for verification"
}
```

Asset status is not directly editable. The `status` field is rejected on update.

Asset list filters include `status`, `category_id`, `assigned_employee_id`, `search`,
`page` and `limit`.

## 7. Asset assignments and returns

| Method | Route | Auth | Roles | Purpose |
|---|---|---|---|---|
| GET | `/assignments` | Bearer | Admin | List allocations |
| POST | `/assets/:id/assign` | Bearer | Admin | Allocate an asset |
| POST | `/assignments/:id/return` | Bearer | Admin or Technician | Return an allocated asset |

Allocation body:

```json
{
  "employee_id": 6,
  "remarks": "Allocated for field work"
}
```

Return body:

```json
{
  "return_condition": "fair",
  "remarks": "Returned after use"
}
```

Allocation requires the asset to be available and the employee to be active. Return requires
an open allocation.

## 8. Service categories

Documented with asset categories in section 5. Routes:

- `GET /service-categories`
- `POST /service-categories`
- `PATCH /service-categories/:id`

## 9. Service requests

| Method | Route | Auth | Roles | Purpose |
|---|---|---|---|---|
| GET | `/requests` | Bearer | Any | List requests according to role and filters |
| POST | `/requests` | Bearer | Employee or Admin | Create a service request |
| GET | `/requests/:id` | Bearer | Admin, requester, or assigned technician | View request |
| PATCH | `/requests/:id` | Bearer | Admin or requester | Update request |
| POST | `/requests/:id/assign` | Bearer | Admin | Assign a technician |
| PATCH | `/requests/:id/status` | Bearer | Role-dependent | Transition request status |
| GET | `/requests/:id/history` | Bearer | Admin, requester, or assigned technician | View status history |

Create request body:

```json
{
  "employee_id": 6,
  "asset_id": 6,
  "service_category_id": 1,
  "title": "Laptop does not boot",
  "description": "The laptop fails to start after the latest update.",
  "priority": "high"
}
```

`employee_id` is optional for employees and is enforced to the current employee. Admins may
specify it.

Assign body:

```json
{
  "technician_id": 2,
  "remarks": "Technician assigned"
}
```

Transition body uses the `status` field and transition-specific fields:

```json
{
  "status": "in_progress",
  "remarks": "Work started"
}
```

```json
{
  "status": "resolved",
  "resolution_notes": "Replaced faulty hardware and verified normal operation.",
  "remarks": "Resolved during service"
}
```

```json
{
  "status": "closed",
  "remarks": "Request closed"
}
```

```json
{
  "status": "cancelled",
  "remarks": "No longer required"
}
```

Request status values:

`pending`, `assigned`, `in_progress`, `resolved`, `closed`, `cancelled`.

## 10. Maintenance

| Method | Route | Auth | Roles | Purpose |
|---|---|---|---|---|
| GET | `/maintenance` | Bearer | Any | List maintenance records |
| POST | `/maintenance` | Bearer | Admin or Technician | Create maintenance |
| GET | `/maintenance/:id` | Bearer | Admin or assigned technician | View maintenance |
| PATCH | `/maintenance/:id/start` | Bearer | Admin or assigned technician | Start scheduled maintenance |
| PATCH | `/maintenance/:id/complete` | Bearer | Admin or assigned technician | Complete maintenance |
| PATCH | `/maintenance/:id/cancel` | Bearer | Admin or assigned technician | Cancel maintenance |

### Maintenance creation discriminator

Maintenance creation uses the `status` field to distinguish immediate and scheduled work:

- Immediate maintenance: omit `status` or send `"in_progress"`. The server stamps the
  current date and marks the asset under maintenance.
- Scheduled maintenance: send `"status": "scheduled"` with a required `scheduled_date` that
  is not in the past. The asset remains in its current state until work starts.

Immediate creation body:

```json
{
  "asset_id": 52,
  "technician_id": 2,
  "maintenance_type": "corrective",
  "description": "Repair and return to service",
  "remarks": "Started immediately"
}
```

Scheduled creation body:

```json
{
  "asset_id": 54,
  "technician_id": 2,
  "maintenance_type": "preventive",
  "description": "Quarterly preventive maintenance",
  "status": "scheduled",
  "scheduled_date": "2026-12-01",
  "remarks": "Scheduled for future work"
}
```

Start body:

```json
{
  "remarks": "Work started"
}
```

Complete body:

```json
{
  "outcome": "returned_to_service",
  "condition_after": "good",
  "cost": 150.00,
  "next_due_date": "2027-01-15",
  "remarks": "Completed and verified"
}
```

Completion outcomes:

- `returned_to_service`: asset becomes available unless an open allocation remains, in which
  case it becomes allocated.
- `held_unavailable`: asset becomes unavailable. Requires no open allocation and an
  ineligible condition (`poor` or `damaged`).
- `retired`: asset becomes retired. Requires no open allocation.

Cancel body:

```json
{
  "remarks": "No longer required"
}
```

Maintenance types: `preventive`, `corrective`, `inspection`, `upgrade`.

## 11. Dashboard

| Method | Route | Auth | Roles | Purpose |
|---|---|---|---|---|
| GET | `/dashboard/admin` | Bearer | Admin | Admin dashboard aggregates |
| GET | `/dashboard/employee` | Bearer | Employee | Employee dashboard |
| GET | `/dashboard/technician` | Bearer | Technician | Technician dashboard |

## 12. Reports

| Method | Route | Auth | Roles | Purpose |
|---|---|---|---|---|
| GET | `/reports/assets-by-department` | Bearer | Admin | Asset counts by department |
| GET | `/reports/technician-workload` | Bearer | Admin | Technician workload |
| GET | `/reports/maintenance-cost` | Bearer | Admin | Maintenance cost by period |
| GET | `/reports/request-summary` | Bearer | Admin | Request summary by priority and status |

Report range endpoints accept `from` and `to` query parameters in `YYYY-MM-DD` format.

## 13. Lookup endpoints

| Method | Route | Auth | Roles | Purpose |
|---|---|---|---|---|
| GET | `/lookups` | Bearer | Any | Roles, categories, employees and technicians |
| GET | `/health` | None | Public | Service health |

## 14. Maintenance creation and asset lifecycle notes

- The asset `status` field is not directly editable.
- Allocation requires an available asset and an active employee.
- Return recomputes asset status.
- Starting maintenance on an allocated asset leaves the allocation open.
- Cancelling in-progress maintenance recomputes asset status.
- Completing maintenance with an open allocation results in `allocated`.
- Retirement requires no open allocation and no in-progress maintenance.

## 15. Error response examples

Validation error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed.",
    "details": [
      { "field": "name", "message": "Is required." }
    ]
  }
}
```

Authentication error:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "The access token is invalid or expired."
  }
}
```

Business-rule conflict:

```json
{
  "success": false,
  "error": {
    "code": "ASSET_ALREADY_ALLOCATED",
    "message": "The asset already has an open allocation."
  }
}
```
