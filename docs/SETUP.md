# Local Development Setup Guide

This guide details how to set up the OALCDA Attendance System API backend and React frontend for local development.

## Prerequisites

Ensure you have the following installed on your machine:
1. **Go** (version 1.22+)
2. **Node.js** (version 18+) & **npm** or **pnpm**
3. **PostgreSQL** database (running locally or accessible via URL, e.g., Supabase)

---

## Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Copy the example environment file and configure it:
   ```bash
   cp .env.example .env
   ```
   Open `.env` in your editor and configure:
   - `DATABASE_URL`: Set this to your PostgreSQL connection string.
     - For local PostgreSQL: `postgres://username:password@localhost:5432/database_name?sslmode=disable`
     - For Supabase: Copy the connection string from the Supabase dashboard (Settings -> Database -> Connection Pooler).
   - `ADMIN_TOKEN`: Set a secret Bearer token used to authenticate QR generation.
   - `QR_SECRET`: Set a unique salt value to hash daily QR strings securely.

3. Set up the Database Schema:
   Use the SQL commands in `backend/schema.sql` to initialize your database tables. You can run this file directly on your local database or paste it into the Supabase SQL Editor.
   ```bash
   psql -U username -d database_name -f schema.sql
   ```

4. Tidy and download Go modules:
   ```bash
   go mod tidy
   ```

5. Run the Go server:
   ```bash
   go run main.go
   ```
   The server will start on port `8080` (or the port defined in your `.env` file).
   Check if the API is active by visiting: `http://localhost:8080/health` (should return "OK").

---

## Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   # or
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the `frontend` directory:
   ```env
   VITE_API_URL=http://localhost:8080
   ```

4. Run the frontend development server:
   ```bash
   pnpm dev
   # or
   npm run dev
   ```
   The application will run on `http://localhost:5173`.
