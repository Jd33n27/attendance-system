# OALCDA Attendance System - Master Plan

**Project:** QR-code based attendance logger for Lagos local council  
**Timeline:** 3 days to MVP, 1 week full  
**Budget:** $0 (free tier)  
**Build Method:** AI agent in IDE (Zed/VS Code)

---

## EXECUTIVE SUMMARY

Replace manual logbooks with QR-code scanning. Workers scan a daily QR code → auto-logs clock-in/out with their UUID to Supabase. No names written, no signatures, no books.

**Success:** By end of Day 3, can generate new QR daily and mark attendance via web scanner.

---

## PHASE BREAKDOWN

### PHASE 1: Backend Core (Days 1–2, ~8 hours)
**Deliverable:** Running Go API with daily QR generation + attendance endpoints

- Supabase PostgreSQL setup (free tier: 500 MB, 2 projects, unlimited API requests)
- Database schema: `users`, `attendance_logs`, `daily_qr_codes`
- Go endpoints: register user → get UUID, generate daily QR, clock in/out
- QR logic: use `qrcode` lib to encode UUID + date hash
- Deploy to Render free tier (auto-deploys from Git)

**Why Go?** You know it. Statically compiled, minimal infra overhead, fast.

### PHASE 2: Frontend Scanner (Day 3, ~4 hours)
**Deliverable:** React single-page app. Worker scans QR → hits clock-in/out endpoint

- React + TypeScript
- `html5-qrcode` library (MIT, no cost)
- Simple UI: big scan button, success/error feedback, clock-in/out states
- Deploy to Vercel free (auto-deploys from Git, serverless)

### PHASE 3: Admin Dashboard (Week 2, optional for MVP)
**Deliverable:** View daily logs, export CSV, manage users

- Same React app, protected route
- UUID-based "admin mode" toggle
- Attendance table, filter by date/department

---

## TECH STACK (ALL FREE)

| Layer | Tech | Free Limits | Why |
|-------|------|------------|-----|
| **Backend** | Go 1.21+ | N/A | Compiled, you know it |
| **Database** | Supabase (PostgreSQL) | 500 MB, unlimited API calls | Generous, Postgres standard |
| **QR Gen** | `qrcode` (Go) | N/A | MIT licensed, pure Go |
| **QR Scan** | `html5-qrcode` (JS) | N/A | MIT, browser webcam access |
| **Frontend** | React 18 + TypeScript | N/A | You know it |
| **Host Backend** | Render | 1 free instance, 0.1 vCPU, 512 MB RAM, auto-sleeps after 15 min inactivity | Serverless-adjacent, good for low traffic |
| **Host Frontend** | Vercel | Unlimited free deployments, 6,000 build minutes/month | Next.js (but you'll use React) |
| **CI/CD** | GitHub Actions | Free for public repos | Automated testing/deploy |

**Note on Render sleep:** Workers will experience ~5 sec cold start if API sleeps. For MVP, acceptable. Upgrade to paid ($5/mo) post-launch if needed.

---

## DATABASE SCHEMA

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  qr_key VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Daily QR codes (one per day)
CREATE TABLE daily_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_string TEXT NOT NULL,
  date DATE UNIQUE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Attendance logs
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clock_in TIMESTAMP,
  clock_out TIMESTAMP,
  date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date) -- One clock-in per day per user
);
```

---

## API CONTRACTS

### 1. Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "department": "Finance"
}

---

Response 201:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "department": "Finance",
  "qr_key": "jdoe_550e8400",
  "created_at": "2026-06-20T10:30:00Z"
}
```

### 2. Generate Daily QR Code
```
POST /api/qr/generate
Authorization: Bearer {admin_token}

{}

---

Response 201:
{
  "qr_code_string": "OALCDA_2026-06-20_hash_abc123xyz",
  "date": "2026-06-20",
  "image_url": "data:image/png;base64,iVBORw0KG..." (optional, embed)
}
```

### 3. Clock In/Out
```
POST /api/attendance/scan
Content-Type: application/json

{
  "qr_string": "OALCDA_2026-06-20_hash_abc123xyz",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "action": "in" // or "out"
}

---

Response 200:
{
  "status": "success",
  "message": "Clocked in at 09:15:30",
  "clock_time": "2026-06-20T09:15:30Z",
  "action": "in"
}

Response 400:
{
  "status": "error",
  "message": "Invalid QR code or expired"
}
```

### 4. Get User Attendance History
```
GET /api/attendance/logs/{user_id}

---

Response 200:
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "logs": [
    {
      "date": "2026-06-20",
      "clock_in": "2026-06-20T09:15:30Z",
      "clock_out": "2026-06-20T17:45:00Z",
      "duration_hours": 8.5
    }
  ]
}
```

---

## FILE STRUCTURE

```
oalcda-attendance/
├── backend/
│   ├── main.go
│   ├── go.mod
│   ├── go.sum
│   ├── .env.example
│   ├── .render.yaml              # Render deployment config
│   ├── handlers/
│   │   ├── auth.go               # /api/auth/register
│   │   ├── qr.go                 # /api/qr/generate
│   │   └── attendance.go         # /api/attendance/*
│   ├── models/
│   │   ├── user.go
│   │   ├── attendance.go
│   │   └── daily_qr.go
│   ├── db/
│   │   └── supabase.go           # Supabase client init
│   └── middleware/
│       └── cors.go
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts            # Vite for fast dev
│   ├── .vercelignore
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx               # Main router
│       ├── pages/
│       │   ├── Scanner.tsx       # QR scanner page
│       │   ├── Register.tsx      # User registration
│       │   └── Dashboard.tsx     # Attendance history (Phase 3)
│       ├── components/
│       │   ├── QRScanner.tsx
│       │   └── FeedbackCard.tsx
│       ├── api/
│       │   └── client.ts         # Fetch wrapper
│       └── styles/
│           └── index.css         # Tailwind or plain CSS
│
├── docs/
│   ├── SETUP.md                  # Dev env setup
│   ├── DEPLOYMENT.md             # Render + Vercel steps
│   └── API.md                    # Full API reference
│
├── .github/
│   └── workflows/
│       ├── backend-deploy.yml    # Push to Render on commit
│       └── frontend-deploy.yml   # Push to Vercel on commit
│
└── README.md
```

---

## PHASE PROMPTS FOR AI AGENT

### PHASE 1 PROMPT (Day 1–2)

```
PHASE 1: Backend Core — Daily QR + Attendance API

REQUIREMENTS:
1. Set up Supabase PostgreSQL project (free tier)
   - Create tables: users, daily_qr_codes, attendance_logs
   - Enable Row Level Security (disable for MVP)

2. Go backend with these endpoints:
   - POST /api/auth/register: Accept {name, department} → return user UUID + qr_key
   - POST /api/qr/generate: Create daily QR code string, store in DB
   - POST /api/attendance/scan: Accept QR string + user_id + action (in/out)
     * Validate QR matches today's date
     * Insert/update attendance_logs
     * Return success + timestamp
   - GET /api/attendance/logs/{user_id}: Return user's attendance history

3. Dependencies:
   - github.com/lib/pq (PostgreSQL driver)
   - github.com/skip2/go-qrcode (generate QR PNG/string)
   - net/http (standard library)

4. QR Format: "OALCDA_{DATE}_{SHA256_HASH}"
   - DATE = 2026-06-20
   - HASH = SHA256(date + secret_key)
   - Encode as PNG, store base64 in DB

5. CORS enabled for localhost:3000 (React app)

6. Render deployment:
   - .render.yaml with buildCommand: "go build"
   - Environment variables: DATABASE_URL (Supabase connection string)
   - Start command: "./oalcda-attendance"

DELIVERABLE: Go binary runs on Render, can POST to endpoints, QR generated daily.
```

### PHASE 2 PROMPT (Day 3)

```
PHASE 2: Frontend Scanner — React + QR Scanner

REQUIREMENTS:
1. React + TypeScript with Vite
   - No backend build (static export)

2. Pages:
   - /register: Form → name + department → POST to /api/auth/register → show UUID
   - /scanner: 
     * Camera feed from browser (html5-qrcode)
     * Click "Scan QR" → opens camera
     * Reads QR string → determines if clock-in or clock-out (toggle state)
     * POST to /api/attendance/scan with QR + user_id + action
     * Show success/error card (green/red) with timestamp
   - /dashboard: Table of user's attendance logs (Phase 3 stretch)

3. State management: React hooks only (useState/useContext)
   - Store current_user_id in localStorage
   - Track in_out state (toggle button)

4. Styling: Tailwind CSS utility classes
   - Large scan button (mobile-first)
   - High contrast for warehouse lighting
   - Success/error feedback prominent

5. API calls:
   - client.ts wrapper with fetch
   - Handle 400/401 errors gracefully

6. Vercel deployment:
   - vercel.json: output directory "dist"
   - Auto-deploy on git push

DELIVERABLE: React app runs on Vercel, can scan QR codes and post to backend.
```

### PHASE 3 PROMPT (Week 2, if needed)

```
PHASE 3: Admin Dashboard — Attendance Reports

REQUIREMENTS:
1. Protected route (/admin) with UUID-based access
   - Simple check: localStorage.admin_uuid === hardcoded_admin_uuid (temporary)

2. Attendance table:
   - Filter by date range, department, user
   - Show clock-in, clock-out, duration

3. CSV export:
   - Download attendance logs for payroll

4. User management:
   - View all registered users
   - Deactivate (soft delete)

DELIVERABLE: Admin can view and export attendance reports.
```

---

## DEPLOYMENT CHECKLIST (Day 3)

- [ ] Supabase project created, tables seeded
- [ ] Go binary builds locally and connects to Supabase
- [ ] Render project created, .render.yaml in git root
- [ ] Backend deployed to Render, public URL working
- [ ] React app builds locally with `npm run build`
- [ ] Vercel project linked to git repo
- [ ] Frontend deployed, can reach backend API
- [ ] Test flow: Register user → Generate QR → Scan QR → See attendance log
- [ ] CORS working (backend accepts requests from Vercel domain)

---

## COST BREAKDOWN (TOTAL = $0/month MVP)

| Service | Free Tier | Cost |
|---------|-----------|------|
| Supabase | 500 MB DB, 2 projects | $0 |
| Render | 1 instance, auto-sleep | $0 |
| Vercel | Unlimited deploys | $0 |
| GitHub | Public repos | $0 |
| Domain | None (use Render/Vercel URLs) | $0 |
| **TOTAL** | | **$0** |

**When to upgrade:**
- Render cold starts bother users → upgrade to paid instance ($5/mo)
- Need custom domain → buy from Namecheap (~$10/year)
- Supabase hits 500 MB → upgrade tier ($25/mo)

---

## SUCCESS METRICS (MVP = DONE when...)

1. ✅ Can generate a new QR code daily via `/api/qr/generate`
2. ✅ Worker scans QR code on phone/tablet → hits endpoint
3. ✅ Clock-in/out timestamp saved to Supabase
4. ✅ No manual name entry needed (UUID handles identity)
5. ✅ Can view attendance logs via dashboard or API

---

## NEXT STEPS AFTER MVP

1. **Week 2:** Admin dashboard (Phase 3)
2. **Week 3:** Mobile app (React Native or PWA)
3. **Post-launch revenue:** Upgrade to paid Render instance ($5/mo), better DB tier ($25/mo)

---

## NOTES FOR CONTINUITY

- Save this file in your git repo root as `MASTER-PLAN.md`
- When continuing in a new chat, paste this entire doc
- Update "PHASE PROMPTS" section as you complete each phase (change from requirement → summary of what was built)
- Track blockers in a `BLOCKERS.md` file
- Keep `.env.example` in repo (don't commit `.env`)

---

**Created:** 2026-06-20  
**Last Updated:** 2026-06-20  
**Status:** Ready for Phase 1 agent build
