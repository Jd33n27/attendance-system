# OALCDA Attendance System (MVP)

A QR-code based digital attendance logger designed for the Lagos local council (Orile Agege LCDA) to replace manual sign-in sheets.

## 🚀 Features

- **🛡️ Secure Daily QR Code:** Generates signed daily QR codes containing a date-bound `SHA256` token verification to prevent late or falsified scans. Locked to **Africa/Lagos** timezone.
- **📷 Device QR Scanner:** Built-in mobile-responsive webcam scanner that registers clock-ins and clock-outs.
- **💾 Offline/Camera Fallback:** Expandable manual input entry drawer if device cameras are restricted or unavailable.
- **📊 Shift Audit & Reports:** Comprehensive admin filtering of attendance logs with instant **local CSV downloads** for payroll processing.
- **👥 Worker Management:** Active worker directories with toggles to de-authorize profiles instantly without destroying historical audit data.
- **☁️ Zero-Cost Hosting ready:** Designed to run entirely on free tiers (Supabase PostgreSQL, Render for Go, Vercel for React).

---

## 📂 Project Architecture

```
oalcda-attendance/
├── backend/                  # Go REST API backend
│   ├── main.go               # Server initialization
│   ├── schema.sql            # Database schema and indexes
│   ├── test_api.sh           # Integration test script (executable)
│   ├── db/                   # Supabase database connection pooler
│   ├── handlers/             # Endpoint logic (auth, qr, scans, admin)
│   ├── middleware/           # CORS configuration
│   └── render.yaml           # Render deployment configuration
│
├── frontend/                 # React Vite TypeScript frontend
│   ├── src/
│   │   ├── main.tsx          # App entry DOM mounting
│   │   ├── App.tsx           # Router view switcher
│   │   ├── index.css         # Styling system
│   │   ├── api/client.ts     # Type-safe fetch wrappers
│   │   └── components/       # UI tabs (Register, Scanner, History, Admin)
│   └── vercel.json           # Vercel SPA routing redirects
│
├── docs/                     # Detailed guides
│   ├── SETUP.md              # Local setup guide
│   ├── DEPLOYMENT.md         # Production deployment guide (Render + Vercel)
│   └── API.md                # Full API contract reference
│
└── OALCDA-Attendance-MASTER-PLAN.md  # Master project plan
```

---

## ⚡ Quick Start (Local Setup)

For full prerequisites and instructions, check [SETUP.md](file:///home/jd33n27/Desktop/work/fullstack/attendance_project/docs/SETUP.md).

### 1. Database
Exceute [schema.sql](file:///home/jd33n27/Desktop/work/fullstack/attendance_project/backend/schema.sql) in your local PostgreSQL or Supabase SQL Editor to seed the tables.

### 2. Run Backend
```bash
cd backend
cp .env.example .env      # Configure connection string & admin secrets
go mod tidy
go run main.go
```
The server will run on `http://localhost:8080`. You can run [test_api.sh](file:///home/jd33n27/Desktop/work/fullstack/attendance_project/backend/test_api.sh) to verify compilation logic.

### 3. Run Frontend
```bash
cd frontend
pnpm install              # or npm install
# Create a .env file with VITE_API_URL=http://localhost:8080
pnpm dev
```
The app will run locally on `http://localhost:5173`.
