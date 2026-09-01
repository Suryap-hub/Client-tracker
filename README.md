# Mahogany client tracker — Postgres + employee logins

A client tracker with employee logins, individual monthly targets, and a CFO/admin
view of the whole team's progress. Backed by PostgreSQL.

```
frontend (React/Vite)  →  backend (Express + JWT auth)  →  PostgreSQL
```

## How access works

- **Employees** log in and see only their own clients and their own target/progress.
- **You (admin)** log in and see a team leaderboard — everyone's target vs. closed —
  plus every client across the whole team, and can create new employee logins.
- Every request is checked server-side by role. An employee token can't read or edit
  another employee's clients even by guessing a client ID — this was tested directly.

## Project layout

```
client-tracker/
  backend/
    server.js
    src/
      db/schema.sql              run this once to create the tables
      db/seedAdmin.js            one-time script to create your own admin login
      db/pool.js                 Postgres connection
      services/clientService.js  all client CRUD, role-scoped
      services/userService.js    employee accounts, targets, password hashing
      services/authTokens.js     JWT sign/verify
      middleware/requireAuth.js  checks the login token; requireAdmin checks role
      routes/auth.js             POST /api/auth/login
      routes/users.js            admin-only: create/list employees, set targets
      routes/clients.js          client CRUD, auto-scoped to the logged-in user
      routes/dashboard.js        personal stats (employee) or team leaderboard (admin)
    .env.example
  frontend/
    src/
      context/AuthContext.jsx    holds the login token, exposes login()/logout()
      components/Login.jsx
      App.jsx                    switches between the employee view and admin view
      api.js                     attaches the login token to every request
```

## 1. Install PostgreSQL

If you don't already have it:
- **Mac:** `brew install postgresql@16 && brew services start postgresql@16`
- **Windows/Linux:** download from [postgresql.org/download](https://www.postgresql.org/download/)
- Or use a free hosted instance (Supabase, Neon, Railway all have free Postgres tiers)
  if you don't want to install it locally.

Then create a database:

```bash
psql -U postgres -c "CREATE DATABASE client_tracker;"
```

## 2. Apply the schema

```bash
psql -U postgres -d client_tracker -f backend/src/db/schema.sql
```

This creates the `users` and `clients` tables.

## 3. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/client_tracker
DATABASE_SSL=false
JWT_SECRET=<generate one — see below>
PORT=4000
CORS_ORIGIN=http://localhost:5173
```

Generate a real `JWT_SECRET` (used to sign login sessions — don't skip this):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Install and create your admin (CFO) login

```bash
npm install
npm run seed-admin -- "Your Name" you@company.com "a-strong-password"
```

This is the only account created this way. Every employee login after this gets
created *by you*, from inside the app, once you're logged in as admin.

## 5. Start the backend

```bash
npm run dev
```

Check `http://localhost:4000/api/health` → should return `{"ok":true}`.

## 6. Start the frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`) and log in with the admin
email/password you just created.

## 7. Add your employees

Once logged in as admin, click **Add employee** — enter their name, email, a temporary
password, and their individual monthly target. Give each employee their email +
temporary password to log in with. They'll only ever see their own clients and their
own target/progress bar.

## 8. API reference

| Method | Path | Access | Does |
|---|---|---|---|
| POST | `/api/auth/login` | anyone | returns a login token |
| GET | `/api/clients` | logged in | employees: own clients only. admins: everyone's (optional `?assignedTo=`) |
| POST | `/api/clients` | logged in | adds a client, auto-assigned to whoever is logged in |
| PUT | `/api/clients/:clientId` | logged in | edit — blocked if it's not your client (403) |
| DELETE | `/api/clients/:clientId` | logged in | delete — blocked if it's not your client (403) |
| GET | `/api/dashboard` | logged in | employees: own target/closed/progress. admins: team totals + per-employee breakdown |
| GET | `/api/dashboard/team` | admin only | the team leaderboard directly |
| GET | `/api/users` | admin only | list all employee logins |
| POST | `/api/users` | admin only | create a new employee login + target |
| PUT | `/api/users/:id/target` | admin only | change one employee's monthly target |

## 9. What was verified

Every one of the following was tested directly against a running instance before
this was handed to you:

- Admin login, employee creation with individual targets (10 vs 6, tested)
- An employee adding/closing clients and their personal dashboard reflecting the
  correct target and percent-to-target
- **Employees cannot see each other's clients** — confirmed by listing clients as
  one employee and checking the other's data never appears
- **Employees cannot edit or delete another employee's client**, even when given
  the exact client ID directly — returns `403 Forbidden`
- Admin's `/api/dashboard` correctly aggregates totals across everyone
- Non-admins get `403` on admin-only routes (`/api/users`)
- Wrong password → `401`, no token → `401`, all with clean messages (no stack traces)
- The frontend builds cleanly with `npm run build`

## 10. Deploying

- **Backend:** any Node host (Render, Railway, Fly.io). Use a managed Postgres
  (the same hosts usually offer one, or use Supabase/Neon) and set `DATABASE_URL`,
  `JWT_SECRET`, and `CORS_ORIGIN` as environment variables there.
- **Frontend:** `npm run build` in `frontend/` → deploy the `dist/` folder to
  Vercel, Netlify, or any static host. Point it at your deployed backend.

## Note on the earlier Google Sheets version

This replaces the Google Sheets version from earlier — Postgres is the right fit
now that multiple employees need concurrent logins and row-level access control,
which a spreadsheet can't really enforce. If you ever want to go back to Sheets
instead of Postgres, the same clean separation applies: only `clientService.js`
would need to change.
