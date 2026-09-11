# Innovatiview India Ltd.

A full-stack Employee Expense Management & Approval System built with React, React Router, Tailwind CSS, Axios, Node.js, Express, MongoDB/Mongoose, JWT and bcrypt.

**Start here:** [Local setup](#local-setup) · [Vercel + MongoDB deployment](docs/DEPLOYMENT.md) · [API reference](docs/API.md) · [Verification](docs/TESTING.md)

## What is included

- Employee, Manager and Admin logins with protected pages and API authorization.
- Employee dashboard, required receipt upload, expense submission, search, detail view, and pending-request editing/withdrawal.
- Assigned-manager review, mandatory rejection reason, optional approval note and decision timestamps.
- Admin dashboards, employee/manager creation and editing, password resets, account deactivation and manager assignments.
- Admin-only recording of completed reimbursements, including payment reference, timestamp and responsible administrator. **No payment gateway and no money transfers.**
- Authenticated receipt viewing/download; PDFs, JPEG, PNG and WebP, up to 3 MB per receipt.
- Dashboard totals, category spending breakdown, status filters, pagination, notifications, empty/error states and responsive layouts.
- Audit history and revision checks that prevent approving an older expense version or recording payment twice.
- Seed scripts, automated tests, a lockfile and configuration for one Vercel project serving frontend and API.

## Roles and permissions

| Action | Employee | Manager | Admin |
|---|---|---|---|
| View expenses/receipts | Own | Assigned requests | All active requests |
| Submit an expense | Yes | No | No |
| Edit/withdraw a pending expense | Own | No | No |
| Approve/reject pending requests | No | Assigned | All |
| Mark an approved expense as paid | No | No | Yes |
| Manage employees/managers | No | No | Yes |
| Reassign a pending request | No | No | Yes |
| Change own password | Yes | Yes | Yes |

An administrator has company-wide oversight but does not impersonate employees or rewrite their financial claims. Approved/rejected requests are immutable; submit a new corrected request when necessary.

## Requirements

- Node.js **22.12 or later** (Node 22 LTS recommended), including npm.
- MongoDB Atlas or a local MongoDB 7+ server. Atlas is recommended for deployment.
- A modern browser.

The project uses MongoDB ObjectId references and validated relationships, not SQL tables. Receipts are embedded as BSON binary in the expense document. No local upload folder, Cloudinary account or separate storage service is needed.

## Local setup

### 1. Extract and install

Extract the ZIP, open the `innovatiview-india-ltd` folder in VS Code, and open a terminal in the folder containing the root `package.json` and `vercel.json`.

```bash
npm ci
```

Do not run `npm install` separately in both subfolders. npm workspaces install everything from the project root.

### 2. Configure the backend

Copy `backend/.env.example` to `backend/.env`.

Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

macOS / Linux:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/innovatiview_expenses
JWT_SECRET=PASTE_A_NEW_RANDOM_SECRET_HERE
APP_URL=http://localhost:5173
SEED_ADMIN_NAME=Company Administrator
SEED_ADMIN_EMAIL=admin@your-company.com
SEED_ADMIN_PASSWORD=CHOOSE_A_UNIQUE_PASSWORD_OF_AT_LEAST_12_CHARACTERS
DEMO_PASSWORD=Demo-Only-ChangeMe!2026
```

For Atlas, replace `MONGODB_URI` with your Atlas connection string containing the database name. See [database configuration](docs/DEPLOYMENT.md#1-create-the-mongodb-atlas-database).

Generate the JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the generated value into `JWT_SECRET`. The application refuses the placeholder secret. Never commit `.env` files or paste secrets into frontend variables.

### 3. Start MongoDB

For Atlas, ensure your computer's public IP is allowed in Atlas Network Access. For local MongoDB, start the installed MongoDB service. If you already have Docker, this optional command starts a local database:

```bash
docker run -d --name innovatiview-mongo -p 127.0.0.1:27017:27017 -v innovatiview_mongo:/data/db mongo:7
```

On later runs, use `docker start innovatiview-mongo` rather than creating the container again.

### 4. Create accounts

For a clean company database:

```bash
npm run seed
```

This creates database indexes and one Admin with your configured email/password. Sign in as Admin, create a Manager, then create an Employee assigned to that Manager.

For a **separate development/demo database**:

```bash
npm run seed:demo
```

| Role | Email | Password |
|---|---|---|
| Admin | Value of `SEED_ADMIN_EMAIL` | Value of `SEED_ADMIN_PASSWORD` |
| Manager | `manager@example.com` | Value of `DEMO_PASSWORD` |
| Employee | `employee@example.com` | Value of `DEMO_PASSWORD` |
| Second employee | `kavya@example.com` | Value of `DEMO_PASSWORD` |

The demo password defaults to `Demo-Only-ChangeMe!2026` if not provided. Demo requests include clearly marked sample PDF receipts. Do not seed demo users into a production database.

Seed commands are repeatable: existing accounts and passwords are preserved, and existing demo expense titles are not duplicated. They do not delete your data. Changing a seed password in `.env` does **not** reset an existing account. Use Settings or the admin password-reset action.

### 5. Run the application

```bash
npm run dev
```

- Website: **http://localhost:5173**
- API: **http://localhost:5000/api**
- Database health check: **http://localhost:5000/api/health**

Always open the website at `http://localhost:5173`. Vite forwards `/api` to Express; no CORS configuration or frontend secret is required.

Alternatively use two terminals:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

### 6. Test the business flow

1. Sign in as Employee and submit a titled expense with amount, date, description and receipt.
2. Sign out and sign in as the assigned Manager.
3. Open Expense requests, view the receipt, and approve or reject with a reason.
4. Sign in as Employee to see the decision and feedback.
5. Sign in as Admin, open Reimbursements, and record a completed payment with a reference.
6. Reopen the expense and verify `Paid`, payment reference and audit history. Dashboards update after actions and refresh their data every 20 seconds or on window focus.

## Deploy to Vercel

Follow **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**. Deploy the entire root folder as **one Vercel project**, with MongoDB Atlas as the database. Do not select only `frontend` as the Vercel Root Directory.

## Commands

| Command | Purpose |
|---|---|
| `npm ci` | Install locked dependencies for all workspaces |
| `npm run dev` | Run React and Express together |
| `npm run build` | Generate production React assets in `frontend/dist` |
| `npm start` | Run standalone Express API (frontend hosted separately) |
| `npm run seed` | Create indexes and initial Admin |
| `npm run seed:demo` | Add demo accounts and sample requests |
| `npm test` | Unit tests and real-MongoDB integration suite |
| `npm run test:unit` | Tests that do not need a MongoDB process |
| `npm run test:integration` | Isolated MongoDB workflow/security tests |

## Project layout

```text
innovatiview-india-ltd/
  api/index.js                 Vercel serverless entry point
  backend/
    src/
      config/                  Environment and cached database connection
      middleware/              Authentication, authorization, receipt upload
      models/                  User, Expense, Session, LoginAttempt
      routes/                  Auth, users, expenses, dashboard APIs
      utils/                   Validation, audit helpers, serializers
      app.js                   Express app and error handling
      server.js                Standalone development/production API server
    scripts/seed.js            Initial admin, indexes, optional demo records
    tests/                     Unit and integration tests
    .env.example
  frontend/
    src/
      components/              Shared UI, layout, expense table
      context/                 Auth and notifications
      pages/                   Login, dashboards, expenses, people, settings
      api.js                   Axios and refresh hooks
      App.jsx                  Role-protected React Router routes
      styles.css               Tailwind and responsive company UI
    vite.config.js             React/Tailwind plugins and local API proxy
  docs/                        Deployment, API and verification guides
  package.json                 Root workspace commands
  package-lock.json            Locked dependency tree
  vercel.json                  Full-stack deployment configuration
```

## Data and workflow rules

- All amounts use **INR**, with integer **paise** stored in `Expense.amount`; API input/output uses rupees. The allowed per-request range is ₹0.01–₹10,00,000. Two decimal places maximum.
- Dates are stored as `YYYY-MM-DD` and cannot be in the future in India time. Audit timestamps are UTC in MongoDB and displayed in Asia/Kolkata.
- An expense starts `Pending`, with `paymentStatus: Not Applicable`. Approval sets `Pending Payment`; rejection keeps `Not Applicable`. Only Admin can set `Paid` after an actual external reimbursement.
- Each expense captures the employee's active assigned manager when created. Later user-assignment changes affect **future** submissions. Admin can explicitly reassign individual pending requests; approved/rejected history is preserved.
- Employees may edit or withdraw only their own pending requests. Withdrawal is a soft delete: hidden from active lists and totals, retained in MongoDB with an audit event. There is no UI restore or permanent-delete action.
- Users are deactivated instead of hard-deleted. A Manager with active employees or pending requests must be reassigned before deactivation. User roles cannot be edited in place; create a new account for a different role.
- Admin bootstrap is restricted to one initial administrator. The application has no public registration, password-recovery emails, automated receipt OCR, tax/policy engine, real-time push notifications, or payment gateway.

## Authentication and deployment notes

Passwords are hashed with bcrypt cost 12. JWTs last eight hours and live in HttpOnly, SameSite=Strict cookies (Secure in production), never localStorage. Every API request checks current account status, token version and a revocable database session. Password changes/reset and deactivation invalidate old sessions. Login limits are stored in MongoDB, not only in one serverless process.

Write requests require an Origin header matching `APP_URL`. The included app deliberately uses same-origin API requests. API callers such as Postman must send that Origin header as well as the login cookie.

Receipt content is excluded from list/detail JSON and is returned only by the authenticated receipt endpoint. Files are type-sniffed, capped at 3 MB and served as attachments. File validation is **not malware scanning**. For an enterprise rollout, add your company's retention/backup controls and scanning policy as needed. Database size grows with receipts, so monitor Atlas storage.

See [verification notes](docs/TESTING.md) for exactly what was checked before packaging.
