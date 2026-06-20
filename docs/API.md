# API Reference

This document outlines the API endpoints, request bodies, and expected responses.

All endpoints return JSON responses.

---

## Authentication & Users

### 1. Register User
Creates a new worker record and returns their unique database ID and assigned scan-key prefix.

- **URL:** `/api/auth/register`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "department": "Finance"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "id": "c6114eb3-fb1c-43f1-b8d4-bb373f1d2c69",
    "name": "John Doe",
    "department": "Finance",
    "qr_key": "johndoe_c6114eb3",
    "created_at": "2026-06-20T10:30:00Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: If request body is malformed, or if fields are empty.
  - `405 Method Not Allowed`: If request is not a `POST`.

---

## QR Code Management

### 2. Generate Daily QR Code
Creates the official, signed QR code token for the current day. If a QR code already exists for the day, it is updated.

- **URL:** `/api/qr/generate`
- **Method:** `POST`
- **Headers:**
  - `Authorization: Bearer {admin_token}` *(Required only if `ADMIN_TOKEN` environment variable is configured)*
- **Success Response (201 Created):**
  ```json
  {
    "id": "e2da19f2-23c2-4876-b9b5-f483b8b60ab3",
    "qr_code_string": "OALCDA_2026-06-20_6fb2a061b476fc32",
    "date": "2026-06-20",
    "image_url": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "active": true,
    "created_at": "2026-06-20T00:05:00Z"
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: If the bearer token is missing or incorrect.
  - `405 Method Not Allowed`: If request is not a `POST`.

### 3. Get Active Daily QR Code
Fetches the active QR code for today.

- **URL:** `/api/qr/active`
- **Method:** `GET`
- **Success Response (200 OK):**
  ```json
  {
    "id": "e2da19f2-23c2-4876-b9b5-f483b8b60ab3",
    "qr_code_string": "OALCDA_2026-06-20_6fb2a061b476fc32",
    "date": "2026-06-20",
    "image_url": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "active": true,
    "created_at": "2026-06-20T00:05:00Z"
  }
  ```
- **Error Responses:**
  - `404 Not Found`: If no active QR code has been generated yet for today.
  - `405 Method Not Allowed`: If request is not a `GET`.

---

## Attendance Logging

### 4. Clock In/Out (Scan QR)
Logs clock-in or clock-out timestamp. The backend validates the scanned QR code token against the active token for today.

- **URL:** `/api/attendance/scan`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "qr_string": "OALCDA_2026-06-20_6fb2a061b476fc32",
    "user_id": "c6114eb3-fb1c-43f1-b8d4-bb373f1d2c69",
    "action": "in"
  }
  ```
  *(Set `"action"` to `"in"` to clock in, or `"out"` to clock out).*
- **Success Response (200 OK - Clock In):**
  ```json
  {
    "status": "success",
    "message": "Clocked in successfully at 09:15:30",
    "clock_time": "2026-06-20T09:15:30Z",
    "action": "in"
  }
  ```
- **Success Response (200 OK - Clock Out):**
  ```json
  {
    "status": "success",
    "message": "Clocked out successfully at 17:45:00",
    "clock_time": "2026-06-20T17:45:00Z",
    "action": "out"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`:
    - If QR code is invalid, expired, or deactivated.
    - If action is not "in" or "out".
    - If worker tries to clock in twice.
    - If worker tries to clock out without clocking in first.
    - If worker tries to clock out twice.
  - `404 Not Found`: If worker UUID is not registered.

### 5. Get User Attendance History
Returns all historical clock-in and clock-out logs for a specific user, ordered from newest to oldest.

- **URL:** `/api/attendance/logs/{user_id}`
- **Method:** `GET`
- **Success Response (200 OK):**
  ```json
  {
    "user_id": "c6114eb3-fb1c-43f1-b8d4-bb373f1d2c69",
    "logs": [
      {
        "id": "848bb208-410a-40a2-aa59-4d6423c10a30",
        "user_id": "c6114eb3-fb1c-43f1-b8d4-bb373f1d2c69",
        "clock_in": "2026-06-20T08:12:00Z",
        "clock_out": "2026-06-20T16:45:00Z",
        "date": "2026-06-20",
        "created_at": "2026-06-20T08:12:00Z",
        "duration_hours": 8.55
      }
    ]
  }
  ```
  *(Notice that `duration_hours` is automatically calculated in hours when both clock-in and clock-out are present).*
- **Error Responses:**
  - `404 Not Found`: If user ID is not registered.

---

## Admin Dashboard (Phase 3)

All endpoints in this section require the administrative authorization header:
`Authorization: Bearer {admin_token}`

### 6. Get All Attendance Logs (Filtered)
Retrieves all attendance logs across all users, joined with user names and departments. Supports rich filters.

- **URL:** `/api/admin/logs`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Query Parameters:**
  - `date`: specific date filter (`YYYY-MM-DD`)
  - `start_date`: range start date filter (`YYYY-MM-DD`)
  - `end_date`: range end date filter (`YYYY-MM-DD`)
  - `department`: filter by worker department (e.g. `Finance`)
  - `user_id`: filter by specific worker UUID
- **Success Response (200 OK):**
  ```json
  [
    {
      "id": "848bb208-410a-40a2-aa59-4d6423c10a30",
      "user_id": "c6114eb3-fb1c-43f1-b8d4-bb373f1d2c69",
      "user_name": "John Doe",
      "department": "Finance",
      "clock_in": "2026-06-20T08:12:00Z",
      "clock_out": "2026-06-20T16:45:00Z",
      "date": "2026-06-20",
      "created_at": "2026-06-20T08:12:00Z",
      "duration_hours": 8.55
    }
  ]
  ```

### 7. Get All Registered Users (with Stats)
Lists all registered workers in the system along with their total attendance count.

- **URL:** `/api/admin/users`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {admin_token}`
- **Success Response (200 OK):**
  ```json
  [
    {
      "id": "c6114eb3-fb1c-43f1-b8d4-bb373f1d2c69",
      "name": "John Doe",
      "department": "Finance",
      "qr_key": "johndoe_c6114eb3",
      "active": true,
      "created_at": "2026-06-20T10:30:00Z",
      "total_attendance": 12
    }
  ]
  ```

### 8. Toggle User Active Status (Soft Deactivation)
Enables or disables a user profile. Deactivated workers cannot scan to log shifts, but their historical logs remain preserved for payroll audits.

- **URL:** `/api/admin/users/{user_id}/toggle-active`
- **Method:** `POST`
- **Headers:**
  - `Authorization: Bearer {admin_token}`
  - `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "active": false
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "User profile successfully deactivated"
  }
  ```

