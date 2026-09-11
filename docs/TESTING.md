# Verification and acceptance tests

## Checked before packaging

- `npm run build`: passed. Vite generated the production React bundle successfully.
- `npm run test:unit`: **8 tests passed**, covering input/date/currency validation, bcrypt, password byte limits, literal search, query-operator rejection, receipt type detection, role scopes, request-origin checks, database model defaults and response privacy.
- JavaScript syntax checks: passed for backend, seed scripts, API entry point and tests.
- `npm audit --omit=dev`: reported **0 known production dependency vulnerabilities** at the time of packaging. This is a point-in-time package audit, not a security certification.

## Checks that could not complete in the build environment

The real-MongoDB integration suite was attempted, but the temporary MongoDB process failed at startup with an operating-system `open: Operation not permitted` error. Its test assertions did not execute, so the full database-backed workflow is **not claimed as verified here**.

The local Vite development server encountered an environment network-interface error, and the test browser could not open localhost. Therefore browser interaction, visual layout at different viewport sizes, and live Vercel behavior remain to be verified in your environment.

No real Atlas database or Vercel deployment was created. The project contains actual Mongoose models, authenticated APIs and database-backed implementations; it does not replace them with mock data or localStorage persistence.

## Run the automated tests

From the project root after `npm ci`:

```bash
npm run test:unit
npm run test:integration
# or both:
npm test
```

The integration suite uses `mongodb-memory-server-core` to download and start a real isolated MongoDB 7.x process. It does not need your Atlas account, does not use the production database, and stops/deletes its temporary database afterward. Internet access is required on the first run to download the MongoDB binary. The host must permit MongoDB to run and provide its normal OS dependencies.

Integration coverage includes:

1. Authentication, missing/wrong Origin, role-denied APIs and private account fields.
2. Employee submission, automatic manager association, authorized receipt download, cross-user/cross-manager denial, approval, payment and exact dashboard totals.
3. Mandatory rejection reasons, employee-visible feedback and denial of payment for rejected expenses.
4. Pending request editing, outdated-revision protection, withdrawal and retained audit history.
5. Invalid/oversized/forged receipts, missing receipt, bad amounts, invalid/future dates and query-operator injection.
6. Admin user creation, unique emails, manager validation, assignment changes, explicit request reassignment, deactivation restrictions and protected admin accounts.
7. Revoked logout cookies, password reset and account-deactivation session invalidation.
8. Concurrent approval/rejection: exactly one update succeeds.

## Browser acceptance checklist

Use a separate demo database for this checklist. Start with `npm run seed:demo` and `npm run dev`.

| Check | Expected result |
|---|---|
| Visit a protected page while signed out | Redirect to Login |
| Employee opens `/users` | Access restricted |
| Manager opens `/users` | Access restricted |
| Admin creates Manager and assigned Employee | Users persist and can sign in |
| Employee submits valid details plus PDF/image | Pending request assigned to Manager |
| Employee omits receipt or uploads >3 MB | Clear validation error |
| Manager views request and receipt | Correct details and private file load |
| Manager rejects without reason | Submission blocked |
| Manager rejects with reason | Employee sees Rejected and exact reason |
| Manager approves another expense | Approved / Pending Payment |
| Admin records external payment reference | Paid, timestamp, recorder and reference visible |
| Employee edits pending expense | New values persist; receipt retained unless replaced |
| Employee withdraws pending expense | Removed from active lists and totals |
| Two sessions act on same revision | Second action receives conflict and refresh guidance |
| Admin changes employee assignment | Future submissions route to new manager |
| Admin reassigns existing pending request | New manager can see it; old manager cannot |
| Reset user password or deactivate user | Previous sessions stop working |
| Change own password in Settings | Signed out; new password works |
| Search, status tabs and pagination | Results remain scoped to the role |
| Refresh nested URL in Vercel | React route loads and API remains reachable |
| Widths around 390, 768 and 1440 pixels | Forms remain usable, sidebar collapses, wide tables scroll |
| Keyboard navigation | Visible focus, labeled fields, modal focus containment and Escape close |

Dashboard/list auto-refresh is polling every 20 seconds while the page is visible and on window focus. Expense details are refreshed manually so managers can review a stable snapshot; revision checks reject outdated actions.
