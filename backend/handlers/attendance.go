package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"oalcda-attendance/db"
	"oalcda-attendance/models"
)

type ScanRequest struct {
	QRString string `json:"qr_string"`
	UserID   string `json:"user_id"`
	Action   string `json:"action"` // "in" or "out"
}

type ScanResponse struct {
	Status    string    `json:"status"`
	Message   string    `json:"message"`
	ClockTime time.Time `json:"clock_time"`
	Action    string    `json:"action"`
}

// ClockInOut handles POST /api/attendance/scan
func ClockInOut(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req ScanRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.QRString == "" || req.UserID == "" || (req.Action != "in" && req.Action != "out") {
		RespondWithError(w, http.StatusBadRequest, "Missing qr_string, user_id, or valid action (in/out)")
		return
	}

	// 1. Verify user exists and is active
	var userName string
	var active bool
	err = db.DB.QueryRow("SELECT name, active FROM users WHERE id = $1", req.UserID).Scan(&userName, &active)
	if err != nil {
		if err == sql.ErrNoRows {
			RespondWithError(w, http.StatusNotFound, "User not found")
			return
		}
		RespondWithError(w, http.StatusInternalServerError, "Database error: "+err.Error())
		return
	}

	if !active {
		RespondWithError(w, http.StatusForbidden, "User profile is deactivated. Cannot log attendance.")
		return
	}

	// 2. Fetch Lagos timezone today's date
	loc, err := time.LoadLocation("Africa/Lagos")
	var today time.Time
	if err != nil {
		today = time.Now()
	} else {
		today = time.Now().In(loc)
	}
	todayStr := today.Format("2006-01-02")

	// 3. Verify QR code exists, matches today's date, and is active
	var qrDateVal time.Time
	var qrActive bool
	qrQuery := "SELECT date, active FROM daily_qr_codes WHERE qr_code_string = $1"
	err = db.DB.QueryRow(qrQuery, req.QRString).Scan(&qrDateVal, &qrActive)
	if err != nil {
		if err == sql.ErrNoRows {
			RespondWithError(w, http.StatusBadRequest, "Invalid QR code: QR code does not exist")
			return
		}
		RespondWithError(w, http.StatusInternalServerError, "Database error: "+err.Error())
		return
	}

	qrDate := qrDateVal.Format("2006-01-02")

	if !qrActive {
		RespondWithError(w, http.StatusBadRequest, "Invalid QR code: QR code is inactive")
		return
	}

	if qrDate != todayStr {
		RespondWithError(w, http.StatusBadRequest, "Expired QR code: QR code is not for today ("+todayStr+")")
		return
	}

	now := time.Now().UTC()
	if loc == nil {
		now = time.Now().In(loc)
	}

	if req.Action == "in" {
		// Clock In: Insert a new attendance log for user and today's date
		insertQuery := `
			INSERT INTO attendance_logs (user_id, clock_in, date)
			VALUES ($1, $2, $3)
			RETURNING clock_in
		`
		var clockInTime time.Time
		err = db.DB.QueryRow(insertQuery, req.UserID, now, todayStr).Scan(&clockInTime)
		if err != nil {
			// Check if duplicate key violation (already clocked in today)
			// Postgres error for unique constraint violation is 23505
			if strings.Contains(err.Error(), "unique constraint") || strings.Contains(err.Error(), "duplicate key") {
				RespondWithError(w, http.StatusBadRequest, "You have already clocked in for today ("+todayStr+")")
				return
			}
			RespondWithError(w, http.StatusInternalServerError, "Failed to record clock-in: "+err.Error())
			return
		}

		RespondWithJSON(w, http.StatusOK, ScanResponse{
			Status:    "success",
			Message:   "Clocked in successfully at " + clockInTime.In(loc).Format("15:04:05"),
			ClockTime: clockInTime,
			Action:    "in",
		})
		return

	} else {
		// Clock Out: Update the clock_out column where clock_out is NULL
		// First check if clock_in exists and if clock_out is already set
		var clockInExists bool
		var clockOutIsSet bool
		checkQuery := "SELECT clock_in IS NOT NULL, clock_out IS NOT NULL FROM attendance_logs WHERE user_id = $1 AND date = $2"
		err = db.DB.QueryRow(checkQuery, req.UserID, todayStr).Scan(&clockInExists, &clockOutIsSet)
		if err != nil {
			if err == sql.ErrNoRows {
				RespondWithError(w, http.StatusBadRequest, "Cannot clock out: you must clock in first")
				return
			}
			RespondWithError(w, http.StatusInternalServerError, "Database error: "+err.Error())
			return
		}

		if clockOutIsSet {
			RespondWithError(w, http.StatusBadRequest, "You have already clocked out for today ("+todayStr+")")
			return
		}

		updateQuery := `
			UPDATE attendance_logs
			SET clock_out = $1
			WHERE user_id = $2 AND date = $3 AND clock_out IS NULL
			RETURNING clock_out
		`
		var clockOutTime time.Time
		err = db.DB.QueryRow(updateQuery, now, req.UserID, todayStr).Scan(&clockOutTime)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Failed to record clock-out: "+err.Error())
			return
		}

		RespondWithJSON(w, http.StatusOK, ScanResponse{
			Status:    "success",
			Message:   "Clocked out successfully at " + clockOutTime.In(loc).Format("15:04:05"),
			ClockTime: clockOutTime,
			Action:    "out",
		})
		return
	}
}

// GetAttendanceLogs handles GET /api/attendance/logs/{user_id}
func GetAttendanceLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := r.PathValue("user_id")
	if userID == "" {
		RespondWithError(w, http.StatusBadRequest, "User ID is required")
		return
	}

	// Verify user exists first
	var exists bool
	err := db.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", userID).Scan(&exists)
	if err != nil || !exists {
		RespondWithError(w, http.StatusNotFound, "User not found")
		return
	}

	query := `
		SELECT id, user_id, clock_in, clock_out, date, created_at
		FROM attendance_logs
		WHERE user_id = $1
		ORDER BY date DESC
	`
	rows, err := db.DB.Query(query, userID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to retrieve attendance logs: "+err.Error())
		return
	}
	defer rows.Close()

	var logs []models.AttendanceLog
	for rows.Next() {
		var logItem models.AttendanceLog
		var clockInNull sql.NullTime
		var clockOutNull sql.NullTime
		var dateVal time.Time

		err := rows.Scan(&logItem.ID, &logItem.UserID, &clockInNull, &clockOutNull, &dateVal, &logItem.CreatedAt)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Error scanning database row: "+err.Error())
			return
		}

		logItem.Date = dateVal.Format("2006-01-02")
		if clockInNull.Valid {
			t := clockInNull.Time
			logItem.ClockIn = &t
		}
		if clockOutNull.Valid {
			t := clockOutNull.Time
			logItem.ClockOut = &t

			if clockInNull.Valid {
				duration := t.Sub(clockInNull.Time).Hours()
				logItem.DurationHours = &duration
			}
		}

		logs = append(logs, logItem)
	}

	if logs == nil {
		logs = []models.AttendanceLog{}
	}

	resp := map[string]interface{}{
		"user_id": userID,
		"logs":    logs,
	}

	RespondWithJSON(w, http.StatusOK, resp)
}
