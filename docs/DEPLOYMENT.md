# Deploy Innovatiview India Ltd. on Vercel + MongoDB Atlas

Deploy **one project containing both frontend and backend**. MongoDB Atlas persists users, sessions, expenses and receipt files. Vercel serves the React build and runs the Express API through `api/index.js`.

## 1. Create the MongoDB Atlas database

1. Sign in at [MongoDB Atlas](https://www.mongodb.com/atlas/database).
2. Create a project and a cluster suitable for your workload. Choose a region near your users and Vercel function region where possible.
3. Under Database Access, create a **database user** with a strong unique password and `readWrite` permission for `innovatiview_expenses`. This user is different from your Atlas website login and the app's Admin.
4. Under Network Access, add your own public IP so you can run the seed script locally.
5. Allow your Vercel deployment's outbound connectivity. If your plan provides static egress, allow those IPs. Where static egress is unavailable, Atlas's `0.0.0.0/0` entry permits connections from anywhere; it broadens network access and still requires database credentials. Use least-privilege credentials, TLS and a restricted/static-egress configuration when available.
6. Choose Connect → Drivers → Node.js, and copy the connection string.
7. Insert the database name before the query string:

```text
mongodb+srv://DB_USERNAME:URL_ENCODED_DB_PASSWORD@YOUR_CLUSTER.mongodb.net/innovatiview_expenses?retryWrites=true&w=majority
```

Replace every placeholder. URL-encode special characters in the database password. Never share or commit the complete URI.

Atlas documentation: [IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/) and [connection strings](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/).

## 2. Initialize the production database from your computer

1. Extract the ZIP and run `npm ci` in the project root.
2. Copy `backend/.env.example` to `backend/.env`.
3. Set `MONGODB_URI` to the Atlas URI above.
4. Set a random `JWT_SECRET`, a real `SEED_ADMIN_EMAIL`, a unique `SEED_ADMIN_PASSWORD`, and your preferred `SEED_ADMIN_NAME`.
5. For this local command, leave `NODE_ENV=development` and `APP_URL=http://localhost:5173`.
6. Run:

```bash
npm run seed
```

This creates the administrator and required unique, lookup, session-expiry and login-limit indexes. **Do not run `seed:demo` against this company database.**

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

You can reuse that secret for the Vercel backend environment. The seed password is not embedded in the code or build output.

## 3. Upload the code to your GitHub repository

Create an empty private GitHub repository. From the extracted project root:

```bash
git init
git add .
git commit -m "Add Innovatiview expense management system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Replace the repository URL with your actual one. Authenticate through GitHub's supported login/token flow. The included `.gitignore` excludes `.env`, `node_modules`, build output and local Vercel settings. Verify no secrets are staged before pushing.

## 4. Import the repository into Vercel

1. Open [Vercel](https://vercel.com/) and choose Add New → Project.
2. Import the GitHub repository.
3. Use these settings:

| Vercel setting | Value |
|---|---|
| Framework Preset | **Other** |
| Root Directory | **Project root / `.`** |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `frontend/dist` |
| Node.js version | **22.x** |

The included `vercel.json` supplies build/output/install settings and API/SPA rewrites. Do not replace it with a frontend-only configuration. If the uploaded repository contains an extra enclosing folder, choose the folder that actually contains `vercel.json` and the root `package.json`.

## 5. Set Vercel environment variables

Add these under Project Settings → Environment Variables, for the intended environment:

| Name | Value | Required |
|---|---|---|
| `MONGODB_URI` | Atlas connection string including `innovatiview_expenses` | Yes |
| `JWT_SECRET` | Random secret, minimum 32 characters | Yes |
| `NODE_ENV` | `production` | Yes |
| `APP_URL` | Exact stable HTTPS origin, e.g. `https://your-project.vercel.app` | Yes |

Do **not** prefix them with `VITE_`. Do not add `SEED_ADMIN_PASSWORD` or `DEMO_PASSWORD` to Vercel; seeding is run from your own computer. `PORT` is unnecessary in Vercel.

`APP_URL` should contain only the scheme and hostname, with no page path. For example, `https://your-project.vercel.app`, not `/login` and not a temporary deployment URL.

If you do not know the final hostname before the first deployment, deploy once, copy the stable Production domain assigned by Vercel, set `APP_URL` to that exact HTTPS origin, and **redeploy before signing in**. A missing or mismatched `APP_URL` will deliberately block login/write operations.

The default project is designed around one canonical production origin. For preview deployments, use a separate preview database and the preview's exact origin in `APP_URL`; never connect untrusted preview branches to company production data.

## 6. Deploy and verify

Click Deploy. After it finishes:

1. Open `https://YOUR_PROJECT.vercel.app/api/health`. Expected JSON contains `"status":"ok"`.
2. Open the main website and sign in with the Admin created by `npm run seed`.
3. Under People & teams, add a Manager, then an Employee assigned to that Manager.
4. Use separate browser profiles/private windows or sign out between roles.
5. Submit a small test expense as Employee, including a receipt.
6. Approve it as Manager, then record the reimbursement as Admin.
7. Verify the Employee sees the updated approval/payment status and receipt.
8. Refresh a nested route such as `/dashboard` or `/expenses/ID`; it must load normally.

Any environment-variable change requires a redeployment to take effect. If you attach a custom domain, update `APP_URL` to that domain and redeploy. Users must use the configured canonical origin.

## Why receipts persist

Uploads use memory temporarily, then save BSON binary bytes inside the MongoDB expense document. The file is not written into the Vercel filesystem. Viewing uses an authenticated `/api/expenses/:id/receipt` request, so changing roles does not expose other users' receipts.

Uploads are limited to 3 MB, leaving room below Vercel's documented 4.5 MB request/response payload limit. Receipt responses also remain below that limit. See [Vercel Function limits](https://vercel.com/docs/functions/limitations).

## Troubleshooting

| Symptom | What to check |
|---|---|
| `npm` not recognized | Install Node.js, reopen the terminal, check `node -v` and `npm -v` |
| Login says request origin is not allowed | Set `APP_URL` to the exact origin used in the browser, then redeploy |
| `/api/health` returns 500/503 | Check backend environment variables, Atlas database user/password, URI encoding, and Network Access |
| Incorrect email or password | Run `npm run seed` against the same database used by Vercel; use the configured admin password, not an Atlas password |
| Employee cannot submit | Create/activate a Manager, then assign the Employee through People & teams |
| Manager sees no requests | Check the expense's recorded manager; changing employee assignment only changes future submissions |
| Can't deactivate a Manager | Reassign their active employees and pending expense requests first |
| File rejected | Use an actual PDF/JPG/PNG/WebP up to 3 MB; changing the filename extension does not convert a file |
| JSON syntax/HTML response instead of API | Verify the whole project root was deployed and `vercel.json` is unchanged |
| Nested URLs show 404 | Keep the included SPA rewrite; do not deploy only the `frontend` folder |
| App returns 409 on review/edit/payment | Another action changed the request; refresh and inspect the latest version |
| Existing admin password didn't change after seeding | Seed intentionally preserves credentials. Change it in Settings while signed in |
| Preview login works but saving fails | Use a preview-specific `APP_URL` and redeploy; the production origin does not authorize preview origins |
| Repeated sign-in attempts blocked | Wait up to 15 minutes; persistent database-backed login limits are active |

## Configuration references

- [Vercel project configuration](https://vercel.com/docs/project-configuration)
- [Mongoose serverless connection reuse](https://mongoosejs.com/docs/lambda.html)
- [MongoDB Atlas connection guide](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/)

No deployment has been performed by this ZIP. Your Vercel account, Atlas credentials, final hostname and production connectivity must be configured during these steps.
