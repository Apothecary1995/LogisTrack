# LogisTrack

**Fleet and Trip Management System** — Production-ready ERP for logistics companies.

Built for [Metalog](https://metalog.ba) as part of IUS CS308 Software Engineering, Spring 2026.

 **Live:** [logistrack.ahmetcengiz.dev](https://logistrack.ahmetcengiz.dev)
 **Monitoring:** [grafana.ahmetcengiz.dev](https://grafana.ahmetcengiz.dev)
 **Search:** [search.ahmetcengiz.dev](https://search.ahmetcengiz.dev)
 **WebSocket:** `wss://ws.ahmetcengiz.dev/ws`

---

## What is LogisTrack?

LogisTrack manages the full lifecycle of fleet operations:

- Add vehicles and assign drivers
- Create trips with auto-calculated KM from route distance database
- Track fuel entries, payroll, and service repairs
- Search trip archive with fuzzy matching — finds results even with typos
- Export trip archive as Excel (direct download or email) or PDF (email)
- View real-time financial dashboard
- Receive live browser notifications when trips or vehicles are added
- Works offline — add vehicles and trips without internet, syncs automatically

---

## Architecture

```
Internet → Cloudflare Tunnel + SSL
         → Go Rate Limiter :8080 (Redis-backed sliding window)
         → Django REST Backend :8000  (monolith — all business logic)
         → React Frontend :5173        (nginx, PWA, offline support)
         → SQLite                      (primary database, persistent volume)
         → Redis :6379                 (rate limit counters + Django cache)
         → RabbitMQ :5672             (event bus)
              ├── Export Worker        (Excel + PDF → Gmail)
              ├── Notification Worker  (welcome + forgot password emails)
              ├── CouchDB Worker       (trip/vehicle sync)
              └── WebSocket Server     (real-time push → all browsers)
         → Search Service :8070        (Go lexer + Levenshtein fuzzy search)
         → Health Checker             (monitors all services, email alerts)
         → Prometheus + Grafana       (metrics dashboard)
         → CouchDB :5984              (document store)
```

**70% monolith** (Django + React) · **30% Go microservices** (8 workers)

---

## Features

### Core (Django + React)
- JWT authentication with automatic token refresh
- Multi-tenant company-scoped data isolation
- Vehicle fleet management (CRUD, driver assignment)
- Trip creation with auto KM calculation from route distance DB
- Driver profiles and leave management
- Fuel entry tracking with merged daily view
- Payroll and financial overview with date range filtering
- Employee efficiency insights and KPI dashboard
- Forgot password email via Notification Worker

### Search (Go Search Service)
- Custom lexer tokenizes query into typed tokens:
  - `PLATE` — regex pattern (34ABC123)
  - `LOCATION` — city keyword dictionary
  - `KM` — numeric with km suffix
  - `DATE` — YYYY-MM-DD format
  - `WORD` — fuzzy matched with Levenshtein distance
- Finds results even with typos ("Istanbull" → "Istanbul")
- Searches plate, origin, destination, customer, cargo, notes

### Async (Go Workers via RabbitMQ)
- **Excel export via email** — Export Worker generates and emails attachment
- **PDF export via email** — custom Go lexer tokenizes Excel → gofpdf → Gmail
- **Welcome email** — sent on registration via Notification Worker
- **Forgot password email** — sent on request via Notification Worker
- **CouchDB sync** — every trip and vehicle synced to CouchDB

### Real-time
- **WebSocket server** — listens to all RabbitMQ events, broadcasts to all browsers
- **Toast notifications** — appear in every open tab when events occur

### PWA Offline
- **Offline read** — StaleWhileRevalidate Service Worker cache
- **Offline write** — vehicles and trips saved to IndexedDB when offline
- **Auto-sync** — pending records sent to Django automatically on reconnect
- **Install as app** — works on desktop and mobile via PWA manifest

### Infrastructure
- **Rate limiter** — Go reverse proxy with Redis sliding window: 100/min global, 5/min auth, 10/hr export
- **Health checker** — polls all services every 30s, emails alert on down/recovery
- **Grafana + Prometheus** — real-time Django metrics dashboard
- **CI/CD** — GitHub Actions: Go tests + E2E Playwright tests on every push, auto-deploy on main
- **Cloudflare Tunnel** — HTTPS without exposed ports, DDoS protection

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, Vite, nginx |
| Backend | Python 3.12, Django REST Framework, SQLite |
| Search | Go 1.26, custom lexer, Levenshtein distance |
| Message Broker | RabbitMQ 3.13 |
| Cache / Rate Limiting | Redis 7 |
| Workers | Go 1.26 (8 microservices) |
| Monitoring | Prometheus, Grafana |
| Document Store | CouchDB 3 |
| Deployment | Docker Compose, Ubuntu 26.04 |
| CI/CD | GitHub Actions, Cloudflare Tunnel |
| Testing | Go testing, Playwright E2E |

---

## Project Structure

```
LogisTrack/
├── .github/
│   └── workflows/
│       ├── test.yml          # 38 Go unit tests on every push
│       ├── e2e.yml           # 10 Playwright E2E tests (Docker Compose mock)
│       └── deploy.yml        # auto-deploy to server on main merge
├── LogisTrack/
│   ├── backend/              # Django REST API
│   │   ├── api/
│   │   │   ├── models.py
│   │   │   ├── views.py      # TripSearchView, ForgotPasswordView, etc.
│   │   │   ├── serializers.py
│   │   │   ├── urls.py
│   │   │   └── publisher.py  # RabbitMQ event publisher
│   │   └── requirements.txt
│   ├── frontend/             # React + Vite + PWA
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── SearchBar.jsx       # fuzzy search UI
│   │   │   │   ├── OfflineBanner.jsx
│   │   │   │   └── ToastNotification.jsx
│   │   │   ├── hooks/
│   │   │   │   ├── useWebSocket.js
│   │   │   │   ├── useOfflineSync.js
│   │   │   │   └── useOfflineRequest.js
│   │   │   └── lib/
│   │   │       └── offlineDB.js        # IndexedDB helper
│   │   ├── nginx.conf
│   │   └── vite.config.js    # PWA + StaleWhileRevalidate
│   ├── docker-compose.yml
│   └── prometheus.yml
└── workers/
    ├── export_worker/        # Excel + PDF + Gmail
    ├── notification_worker/  # Welcome + forgot password emails
    ├── couchdb_worker/       # CouchDB sync
    ├── rate_limiter/         # Redis sliding window rate limiting
    ├── pdf_converter/        # Custom lexer Excel→PDF
    ├── websocket_server/     # Real-time event broadcaster
    ├── health_checker/       # Service monitoring + email alerts
    └── search_service/       # Lexer + Levenshtein fuzzy search
```

---

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Go 1.21+
- Gmail account with App Password

### 1. Clone

```bash
git clone https://github.com/Apothecary1995/LogisTrack.git
cd LogisTrack
```

### 2. Environment file

```bash
cp .env.example LogisTrack/.env
```

Edit `LogisTrack/.env`:

```env
RABBITMQ_URL=amqp://logistrack:yourpassword@rabbitmq:5672/
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youremail@gmail.com
SMTP_PASSWORD=your-16-char-gmail-app-password
EXPORT_DIR=/app/exports
COUCHDB_URL=http://logistrack:yourpassword@couchdb:5984/
ALERT_EMAIL=youremail@gmail.com
CHECK_INTERVAL=30s
```

### 3. Run

```bash
cd LogisTrack/LogisTrack
docker compose up -d
```

### 4. Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000/api/ |
| Search | http://localhost:8070/search?q=Istanbul |
| RabbitMQ | http://localhost:15672 |
| Grafana | http://localhost:3000 |
| CouchDB | http://localhost:5984 |
| WebSocket | ws://localhost:8090/ws |

Default login: `admin@logitarget.com` / `Admin123`

---

## Search API

```bash
# Search by city
GET https://search.ahmetcengiz.dev/search?q=Istanbul
Authorization: Bearer <token>

# Search by plate
GET https://search.ahmetcengiz.dev/search?q=34ABC123

# Mixed query — lexer handles it
GET https://search.ahmetcengiz.dev/search?q=34ABC123+Istanbul+Metalog

# Fuzzy — typo tolerant
GET https://search.ahmetcengiz.dev/search?q=Istanbull
```

---

## Running Tests

```bash
# All Go worker tests
for worker in export_worker notification_worker couchdb_worker rate_limiter pdf_converter websocket_server health_checker search_service; do
  cd workers/$worker && go test ./... -v && cd ../..
done

# E2E tests (requires Docker)
cd e2e && npx playwright test

# Django backend tests
cd LogisTrack/backend
python manage.py test api --verbosity=2
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register |
| POST | `/api/auth/login/` | Login, get JWT |
| POST | `/api/auth/refresh/` | Refresh token |
| POST | `/api/auth/forgot-password/` | Send reset email |
| GET | `/api/auth/me/` | Current user |
| POST | `/api/auth/change-password/` | Change password |

### Fleet + Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/vehicles/` | List / create vehicles |
| POST | `/api/vehicles/{id}/create-trip/` | Create trip |
| GET | `/api/trips/` | List trips |
| GET | `/api/trips/search/` | Search trips (Django filter) |
| GET | `/api/dashboard/summary/` | Dashboard KPIs |

### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/archive/export/` | Download Excel |
| POST | `/api/archive/export/` | Email Excel (async) |
| POST | `/api/archive/export/pdf/` | Email PDF (async) |

---

## Deployment

Production runs on Excalibur G900 (i7-11800H, Ubuntu 26.04) behind Cloudflare Tunnel.

Every merge to `main` triggers:
1. GitHub Actions runs all Go tests + E2E Playwright tests
2. Webhook fires `deploy.sh` on server
3. `git pull && docker compose up -d --build`

---

## Team

| Member | Role |
|--------|------|
| Ahmet Cengiz | DevOps, Infrastructure, 8 Go Microservices |
| Firat Aras Uzun | Financial Module |
| Cem Berke Tepedelen | Fleet Management |
| Muhammed Said Sincar | Trip Management |
| Sait Yucel | Driver and Maintenance |

---

## Version History

| Version | Description |
|---------|-------------|
| v1.0.0 | Initial monolith: Django + React |
| v1.x | RabbitMQ + 6 Go workers + WebSocket + Health Checker + PWA |
| v2.0.0 | Redis + Search Service (lexer+fuzzy) + E2E mock CI + SQLite volume + forgot password |

---

## License

MIT license
