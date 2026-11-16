# EITAMS Postman Collection

Product identity: **Nexora — IT Operations Suite**

## Import

1. Open Postman.
2. Choose **Import**.
3. Select `postman/EITAMS.postman_collection.json`.
4. The collection name is **EITAMS API**.

## Configuration

Set the collection variable:

- `baseUrl`: `http://localhost:5000`

The API base path is `/api/v1`. Most requests use `{{baseUrl}}/api/v1/...`.

The collection also defines:

- `token`: empty by default. The **Login - admin** request saves the JWT to this variable through its test script.

## Authentication

1. Start the API and database.
2. Run **Authentication > Login - admin**.
3. The response test script stores `data.token` in `{{token}}`.
4. Protected requests use `Authorization: Bearer {{token}}`.

For employee or technician workflows, log in with the relevant seeded account and store that token instead.

## Seed prerequisites

The collection assumes the deterministic seed data is loaded:

```powershell
npm run db:seed
```

Seeded accounts use the synthetic local development password `Demo@12345`.

## Recommended request order

1. **Health > Health check**
2. **Authentication > Login - admin**
3. **Lookups > Lookups**
4. Create or inspect organisation data:
   - Departments
   - Employees
   - Users
   - Asset categories
   - Service categories
5. Asset workflow:
   - Register asset
   - Allocate asset
   - Return assignment
   - Retire asset
   - Asset history
6. Service request workflow:
   - Create request
   - Assign request
   - Transition request status
   - Request history
7. Maintenance workflow:
   - Create immediate maintenance
   - Create scheduled maintenance
   - Start maintenance
   - Complete maintenance with each outcome
   - Cancel maintenance
8. Dashboard and report requests

## Workflows requiring existing records

Some requests use fixed synthetic IDs from the seed data, such as asset `52`, employee `6`,
technician `2` and request `1`. If records have changed, update the path or body values to
match existing records. The collection is intended for local development and verification,
not production use.

## Notes

- All examples use synthetic data.
- No real secrets or personal data are included.
- The collection documents implemented endpoints only.
- Requests were prepared from the implemented route definitions; only a representative
  subset should be executed against a disposable local database.
