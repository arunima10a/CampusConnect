# CampusConnect

CampusConnect is a full-stack college event and notice portal. Students can explore campus events, register after reviewing their details, manage their registrations, and read notices. Administrators sign in before creating, editing, or deleting events.

## Features

1. Event listing and event details.
2. Combined text search and category filters.
3. Event registration with details, review, and confirmation steps.
4. My Registrations with owner-scoped cancellation.
5. Notice board sorted by publication date.
6. Authenticated admin event management.

Dashboard statistics are calculated from the API. Sample data is added only when the related tables are empty.

## Stack and architecture

- Frontend: React, Vite, TypeScript, React Router, Lucide React, custom CSS, Fetch API.
- Backend: Go, Gin REST API, SQLite with `modernc.org/sqlite` (pure Go; no CGO or native SQLite install needed), bcrypt from `golang.org/x/crypto`.
- The frontend uses `VITE_API_URL` and sends credentialed requests for the short-lived, HttpOnly cookies. The backend defaults to port 18080 to avoid common local conflicts. CORS accepts the local Vite origins and the optional exact `FRONTEND_ORIGIN` value.

## Administrator setup

There is no public administrator registration. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in a private local environment file before starting the backend. The password must be 10–72 bytes. At startup the backend bcrypt-hashes it in memory; it never writes the plaintext password or a password hash to the database. Do not use the example values as real credentials.

```sh
cp .env.example .env
# Edit .env and replace the placeholder administrator values with a private password.
set -a
source .env
set +a
```

The `.env` file is ignored by Git. The backend does not read dotenv files itself, so export these values in the shell that starts Go.

The login uses a server-side, in-memory session referenced by a cryptographically random HttpOnly cookie. Sessions expire after eight hours and are invalidated at logout or backend restart. A separate double-submit CSRF token protects login and admin mutations. Cookies use SameSite=Strict; set `APP_ENV=production` (or `SECURE_COOKIES=true`) when serving over HTTPS to enable Secure cookies. Set `FRONTEND_ORIGIN` to the exact deployed frontend origin when appropriate. Login is limited to five attempts per client IP per minute.

## Student registration model and limitations

Registration asks for name, student ID, college email, department, academic year, optional phone, and optional information. The details step is reviewed before the final confirmation request creates a row. A stable reference such as `CC-000123` is derived from the saved SQLite registration ID.

This is not verified student authentication: students can enter self-reported details and email addresses. A random, long-lived HttpOnly browser cookie scopes My Registrations and cancellation to the browser that submitted the registration; only a hash of that browser token is stored in SQLite. This prevents changing a student ID query parameter to view or cancel another browser's registration, but it does not prove a student's identity. Anyone with access to that same browser profile can view or cancel its registrations; clearing browser cookies loses access to those registrations. Existing registrations from the earlier schema are migrated in place and retained; because those rows have no browser-owner token, they remain in the database but are not shown in the new browser-scoped My Registrations list.

## Database

- `events`: event content, schedule, venue, image, and capacity.
- `registrations`: ID, student ID, event ID, full name, college email, department, academic year, optional phone/information, registration time, and browser-owner token digest. `(student_id,event_id)` remains unique, and event deletion cascades to its registrations.
- `notices`: announcement content, category, priority, and publication date.

Startup migrations add the new registration columns and index without dropping or recreating existing tables. Registration validation, duplicate checks, past-date checks, and capacity checks run in the backend. SQLite operations use a transaction, and a single database connection serializes writes.

## Setup and run

Requirements: Go 1.23+ and Node.js 20+. No Docker, native SQLite, or database server is required. From this project directory:

```sh
# Terminal 1: after setting the admin environment variables above
cd backend
go mod tidy
go run .

# Terminal 2
cd frontend
cp .env.example .env   # first-time setup; contains only the local API URL
npm install
npm run dev
```

Open http://localhost:5173. The API listens at http://localhost:18080. If you want another free port, set `API_ADDR=:PORT` and set the matching `VITE_API_URL=http://localhost:PORT/api` in `frontend/.env`; restart both servers after changing these values. `CAMPUSCONNECT_DB=/absolute/path/to/file.db` selects a database path.

The default SQLite file is `backend/campusconnect.db` when the backend is started from its directory. To reset it, stop the backend and make a backup before removing the file; the next start creates a fresh schema and seeds the sample data:

```sh
cp backend/campusconnect.db /tmp/campusconnect-backup.db
rm backend/campusconnect.db
```

## API

All routes are under `/api`; JSON errors use `{ "error": "..." }` (registration validation may also include a `fields` object).

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Health status |
| GET | `/events?search=&category=` | Public | List/filter events |
| GET | `/events/:id` | Public | Event details |
| GET | `/notices` | Public | Notices, newest first |
| GET | `/admin/csrf` | Public | Issue CSRF cookie/token for sign-in |
| POST | `/admin/login` | CSRF | Administrator login `{ "email", "password" }` |
| GET | `/admin/session` | Admin session | Check current administrator identity |
| POST | `/admin/logout` | Admin session + CSRF | Invalidate session |
| POST | `/events` | Admin session + CSRF | Create event |
| PUT | `/events/:id` | Admin session + CSRF | Update event |
| DELETE | `/events/:id` | Admin session + CSRF | Delete event and cascade registrations |
| POST | `/registrations` | Public, browser scoped | Confirm registration details |
| GET | `/registrations` | Public, browser scoped | Current browser's registrations |
| DELETE | `/registrations/:id` | Registration owner cookie | Cancel own registration |

Registration JSON fields: `eventId`, `fullName`, `studentId`, `collegeEmail`, `department`, `academicYear`, optional `phone`, and optional `additionalInfo`. Event writes accept `title`, `description`, `category`, `eventDate` (`YYYY-MM-DD`), `eventTime` (`HH:MM`), `venue`, `imageUrl`, and `capacity` (0 means unlimited).

## Verification

Run `cd backend && go test ./...` and `cd frontend && npm run build`. The admin panel redirects to `/admin/login` when no valid backend session exists. The backend, not just the UI, protects event writes. Authentication is suitable for this local assignment demo; it has not been independently security-audited for production deployment.

