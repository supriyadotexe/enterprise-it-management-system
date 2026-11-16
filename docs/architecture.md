# EITAMS Architecture and Workflow Diagrams

Product identity: **Nexora — IT Operations Suite**

## A. System architecture diagram

This diagram shows the implemented three-tier architecture and the direction of requests and
responses. Database access is owned by the service layer; controllers do not access the
database directly.

```mermaid
graph TD
    Browser["Browser / React client"]
    Router["React Router"]
    Pages["Feature pages and dashboards"]
    ApiClient["Axios API client"]
    Express["Express application (/api/v1)"]
    Middleware["Authentication, authorization, validation"]
    Controllers["Controllers"]
    Services["Services and assetLifecycle.service.js"]
    Pool["MySQL connection pool"]
    Database["MySQL database"]

    Browser --> Router
    Router --> Pages
    Pages --> ApiClient
    ApiClient --> Express
    Express --> Middleware
    Middleware --> Controllers
    Controllers --> Services
    Services --> Pool
    Pool --> Database
    Database --> Pool
    Pool --> Services
    Services --> Controllers
    Controllers --> Express
    Express --> ApiClient
    ApiClient --> Pages
```

## B. Backend request-flow diagram

This sequence shows a typical authenticated API request, including validation and error
handling.

```mermaid
sequenceDiagram
    participant Client as React client
    participant Route as Express route
    participant Auth as authenticate middleware
    participant Guard as authorize / validation
    participant Controller as Controller
    participant Service as Service layer
    participant DB as MySQL

    Client->>Route: HTTP request with Bearer token
    Route->>Auth: verify JWT and load current user
    Auth->>Guard: role and input validation
    Guard->>Controller: validated request
    Controller->>Service: business operation
    Service->>DB: parameterized SQL / transaction
    DB-->>Service: rows or error
    Service-->>Controller: domain result or ApiError
    Controller-->>Client: JSON success or error response
```

## C. Asset lifecycle workflow

This diagram shows the implemented asset lifecycle. `assetLifecycle.service.js` recomputes
asset status inside the same transaction as the causing operation.

```mermaid
stateDiagram-v2
    [*] --> Available : asset registered
    Available --> Allocated : allocate asset
    Allocated --> UnderMaintenance : start maintenance
    Available --> UnderMaintenance : start maintenance
    UnderMaintenance --> Allocated : complete returned_to_service with open allocation
    UnderMaintenance --> Available : complete returned_to_service with no open allocation
    UnderMaintenance --> Unavailable : complete held_unavailable
    UnderMaintenance --> Retired : complete retired
    UnderMaintenance --> UnderMaintenance : cancel in-progress maintenance recomputes status
    Allocated --> Available : return asset
    Allocated --> Retired : retire asset after return
    UnderMaintenance --> Allocated : return during maintenance keeps allocation precedence
    Available --> Retired : retire asset
    Unavailable --> Retired : retire asset
    Retired --> [*]
```

Maintenance completion outcomes:

- `returned_to_service`
- `held_unavailable`
- `retired`

Scheduled maintenance does not automatically change asset status. It becomes in-progress only
when started.

## D. Service request workflow

This diagram shows the implemented request lifecycle and transition ownership.

```mermaid
stateDiagram-v2
    [*] --> Pending : employee or admin creates request
    Pending --> Assigned : admin assigns technician
    Assigned --> InProgress : assigned technician or admin starts work
    InProgress --> Resolved : assigned technician resolves with resolution notes
    Resolved --> Closed : requester or admin closes
    Pending --> Cancelled : admin cancels
    Assigned --> Cancelled : admin cancels
    InProgress --> Cancelled : admin cancels
    Closed --> [*]
    Cancelled --> [*]
```

Every transition, including creation, writes `request_status_history`. Invalid or repeated
transitions return `409 INVALID_REQUEST_TRANSITION`.
