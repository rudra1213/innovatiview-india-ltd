# API reference

Base path: `/api`. JSON unless described as multipart. Amounts in API requests/responses use INR rupees; database amounts are integer paise.

## Authentication

Login sets an eight-hour HttpOnly cookie named `iv_session`. Send cookies on later requests. Every POST/PATCH/DELETE must include an `Origin` matching `APP_URL`. The React Axios client and browser handle this automatically.

| Method | Endpoint | Access | Body |
|---|---|---|---|
| GET | `/health` | Public | Database connectivity status |
| POST | `/auth/login` | Public, rate-limited | `email`, `password` |
| GET | `/auth/me` | Signed-in | Current user and assigned manager |
| POST | `/auth/logout` | Signed-in | None; revokes this session |
| PATCH | `/auth/password` | Signed-in | `currentPassword`, `newPassword`; invalidates all previous sessions |

Login response: `{ "user": { "_id", "name", "email", "role", "active", "managerId" } }`. Passwords, hashes and token versions are not exposed.

## Expenses

| Method | Endpoint | Access | Details |
|---|---|---|---|
| GET | `/expenses/categories` | Signed-in | Supported category names |
| GET | `/expenses` | Scoped by role | Paginated list |
| POST | `/expenses` | Employee | Multipart form; creates Pending expense |
| GET | `/expenses/:id` | Owner / assigned Manager / Admin | Details and audit history |
| GET | `/expenses/:id/receipt` | Same as details | Binary attachment |
| PATCH | `/expenses/:id` | Owner Employee, Pending | Multipart fields; optional replacement receipt; current `revision` required |
| DELETE | `/expenses/:id` | Owner Employee, Pending | JSON `{ "revision": 0 }`; soft withdrawal |
| PATCH | `/expenses/:id/review` | Assigned Manager / Admin | `status`, `reason`, `revision` |
| PATCH | `/expenses/:id/payment` | Admin | `reference`, `revision`; Approved → Paid |
| PATCH | `/expenses/:id/manager` | Admin, Pending | `managerId`, `revision` |

Multipart create/update fields:

- `title`: 3–120 characters
- `category`: Travel, Accommodation, Food & Meals, Office Supplies, Communication, Other
- `amount`: ₹0.01–₹10,00,000, up to two decimal places
- `date`: valid YYYY-MM-DD, no future India date
- `description`: 5–2000 characters
- `receipt`: one PDF/JPEG/PNG/WebP, up to 3 MB; mandatory on create, optional on edit
- `revision`: mandatory on edit; use the number from the latest detail response

Review examples:

```json
{ "status": "Approved", "reason": "Receipt verified", "revision": 0 }
```

```json
{ "status": "Rejected", "reason": "Please provide an itemized bill.", "revision": 0 }
```

Rejection requires 5–1000 characters; approval notes are optional. Payment references require 3–120 characters. Revisions increment on every mutation. A stale revision or disallowed state transition returns 409 and changes nothing.

List query parameters: `page` (default 1), `limit` (default 15, maximum 100), `search`, `status` (Pending/Approved/Rejected), `paymentStatus` (Pending Payment/Paid). Search matches expense title/category or employee name. List response: `{ "items": [], "total": 0, "page": 1, "pages": 0 }`.

Detail/mutation response: `{ "expense": { ... } }`. Relationship fields are populated in list/detail responses; mutation responses may contain ObjectId strings, so refetch detail after mutations. `receipt` contains metadata only, never binary bytes in JSON.

## Users (Admin only)

| Method | Endpoint | Body / result |
|---|---|---|
| GET | `/users` | Paginated users; `page`, `limit`, `search`, `role` filters |
| GET | `/users/managers` | Active managers for assignment selection |
| POST | `/users` | `name`, `email`, `password`, `role` (Employee/Manager), `managerId` for Employees |
| PATCH | `/users/:id` | `name`, `email`, `active`, `managerId` for Employees |
| PATCH | `/users/:id/password` | `{ "password": "new strong password" }` |

Passwords require at least 12 characters, at most 72 UTF-8 bytes. Roles are immutable after creation. Admin accounts cannot be modified through these routes. Soft deactivation invalidates sessions and preserves expense references.

## Dashboard

`GET /dashboard` returns `{ "stats": {...}, "recent": [...], "categories": [...] }` scoped by role.

Stats include total/pending/approved/rejected counts and amounts, paid/unpaid counts and amounts. Admin also receives total and active employee/manager counts. All displayed amounts use rupees. Withdrawn expenses are excluded.

## Errors

All app errors use `{ "message": "Human-readable explanation" }`.

| Status | Meaning |
|---|---|
| 400 | Validation/upload error |
| 401 | Missing, expired, revoked session or invalid login |
| 403 | Wrong role or untrusted request Origin |
| 404 | Missing or inaccessible expense/receipt |
| 409 | Duplicate email, outdated revision or invalid workflow transition |
| 413 | Request body too large |
| 429 | Login rate limit reached |
| 500 / 503 | Server configuration or database/service failure |

Login limits: 15 attempts per normalized account and 60 per IP within a 15-minute fixed window. Both successful and failed attempts count. Session and login-limit TTL indexes are created by the seed script. Expiration is also checked at request time, so MongoDB's asynchronous TTL deletion cannot extend sessions.
