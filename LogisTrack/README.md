# LogiTarget

Kisellestirilebilir Hizli Lojistik Takip Sistemi.

- Backend: Django + DRF + JWT + SQLite
- Frontend: React SPA (SF Pro font stack)
- Infra: Docker Compose (frontend + backend + persisted SQLite file)
- Architecture: Multi-tenant (company-isolated data)

## Main UX Rules

- `/`:
  - Guest: top-right `Login` and `Register`, slogan, and `Registered User Count`.
  - Authenticated: top-right user dropdown (`Profile`, `Settings`, `Logout`).
- `/profile`: full name, company name, membership date.
- `/settings`: password change, notification toggles, language switch (TR/EN/BS via React Context API).
- Django admin button is not shown in regular app UI. Admin access is direct via `/admin/` URL.

## Authentication

- Register fields: `Email`, `Full Name`, `Password`, `Company Name`
- Signin contains: `Forgot Password` + `Create Account`
- Multi-tenant isolation: all business records are linked to `Company`.

## Functional Modules

### Operation
- `/operation/dashboard`
  - Monthly revenue, pending maintenance, total trips, total KM
  - Refresh data
  - Quick trip add
  - Excel upload for Origin/Destination to KM mapping
- `/operation/archive`
  - Responsive table of fleet trip data
  - Excel export
- `/operation/fleet-manager`
  - Vehicle registration/edit/delete
  - Create Trip with auto CCI KM lookup from uploaded routes

### Technic & Finance
- `/technicfinance/service-repair`: service entry
- `/technicfinance/fuel`: fuel/adblue entry and merged same-day same-vehicle view
- `/technicfinance/payroll`: weekly/monthly accounting, date filters, wages and invoices

### System
- `/system/employee`: driver KPI filters + leave tracking
- `/system/erp`: VAT and mileage bonus threshold/formula settings

## Important APIs

- Public:
  - `GET /api/health/`
  - `GET /api/users/count/`
- Auth:
  - `POST /api/auth/register/`
  - `POST /api/auth/login/`
  - `POST /api/auth/refresh/`
  - `POST /api/auth/forgot-password/`
  - `GET /api/auth/me/`
  - `POST /api/auth/change-password/`
  - `GET|PATCH /api/auth/preferences/`
- Operation/Finance/System:
  - `GET /api/dashboard/summary/`
  - `POST /api/routes/upload/`
  - `GET /api/archive/export/`
  - `CRUD /api/vehicles/`
  - `POST /api/vehicles/{id}/create-trip/`
  - `CRUD /api/trips/`
  - `CRUD /api/service-repairs/`
  - `CRUD /api/fuel-entries/`
  - `GET /api/fuel-entries/merged/`
  - `CRUD /api/payroll-entries/`
  - `GET /api/payroll/overview/`
  - `CRUD /api/drivers/`
  - `CRUD /api/driver-leaves/`
  - `GET /api/employees/insights/`
  - `GET|PUT|PATCH /api/erp/settings/`

## Run

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/health/
- Django Admin: http://localhost:8000/admin/

## Superuser

- Email: `admin@logitarget.com`
- Password: `Admin123`
- Company: `LogiTarget HQ`

Seed is handled by `/Users/keremsincar/Desktop/LogiTrack/backend/entrypoint.sh` on container start.

## Notes

- SQLite is persisted at `/Users/keremsincar/Desktop/LogiTrack/backend/data/db.sqlite3` through a compose bind mount.
- `invoice_date` parsing accepts `YYYY-MM-DD`, `DD.MM.YYYY`, `DD/MM/YYYY`, and `YYYY/MM/DD`; empty values are safely treated as null.
