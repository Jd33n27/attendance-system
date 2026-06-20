package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"oalcda-attendance/db"
	"oalcda-attendance/models"
)

// AdminLogItem defines logs joined with user details
type AdminLogItem struct {
	ID            string     `json:"id"`
	UserID        string     `json:"user_id"`
	UserName      string     `json:"user_name"`
	Department    string     `json:"department"`
	ClockIn       *time.Time `json:"clock_in"`
	ClockOut      *time.Time `json:"clock_out"`
	Date          string     `json:"date"`
	CreatedAt     time.Time  `json:"created_at"`
	DurationHours *float64   `json:"duration_hours,omitempty"`
}

// AdminUserItem defines users with basic stats
type AdminUserItem struct {
	models.User
	Active          bool `json:"active"`
	TotalAttendance int  `json:"total_attendance"`
}

// checkAdminAuth verifies the bearer token in the authorization header
func checkAdminAuth(w http.ResponseWriter, r *http.Request) bool {
	adminToken := os.Getenv("ADMIN_TOKEN")
	if adminToken == "" {
		// If not set, allow for local ease, but log a warning.
		return true
	}

	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized: missing bearer token")
		return false
	}
	token := strings.TrimPrefix(authHeader, "Bearer ")
	if token != adminToken {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized: invalid bearer token")
		return false
	}
	return true
}

// GetAdminLogs handles GET /api/admin/logs (lists all logs with filters)
func GetAdminLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	if !checkAdminAuth(w, r) {
		return
	}

	query := `
		SELECT l.id, l.user_id, u.name, u.department, l.clock_in, l.clock_out, l.date, l.created_at
		FROM attendance_logs l
		JOIN users u ON l.user_id = u.id
		WHERE 1=1
	`
	var args []interface{}
	argCounter := 1

	if date := r.URL.Query().Get("date"); date != "" {
		query += fmt.Sprintf(" AND l.date = $%d", argCounter)
		args = append(args, date)
		argCounter++
	}
	if startDate := r.URL.Query().Get("start_date"); startDate != "" {
		query += fmt.Sprintf(" AND l.date >= $%d", argCounter)
		args = append(args, startDate)
		argCounter++
	}
	if endDate := r.URL.Query().Get("end_date"); endDate != "" {
		query += fmt.Sprintf(" AND l.date <= $%d", argCounter)
		args = append(args, endDate)
		argCounter++
	}
	if dept := r.URL.Query().Get("department"); dept != "" {
		query += fmt.Sprintf(" AND u.department = $%d", argCounter)
		args = append(args, dept)
		argCounter++
	}
	if userID := r.URL.Query().Get("user_id"); userID != "" {
		query += fmt.Sprintf(" AND l.user_id = $%d", argCounter)
		args = append(args, userID)
		argCounter++
	}

	query += " ORDER BY l.date DESC, l.clock_in DESC"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to query logs: "+err.Error())
		return
	}
	defer rows.Close()

	var logs []AdminLogItem
	for rows.Next() {
		var item AdminLogItem
		var clockInNull sql.NullTime
		var clockOutNull sql.NullTime
		var dateVal time.Time

		err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.UserName,
			&item.Department,
			&clockInNull,
			&clockOutNull,
			&dateVal,
			&item.CreatedAt,
		)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Failed to scan row: "+err.Error())
			return
		}

		item.Date = dateVal.Format("2006-01-02")
		if clockInNull.Valid {
			t := clockInNull.Time
			item.ClockIn = &t
		}
		if clockOutNull.Valid {
			t := clockOutNull.Time
			item.ClockOut = &t

			if clockInNull.Valid {
				duration := t.Sub(clockInNull.Time).Hours()
				item.DurationHours = &duration
			}
		}

		logs = append(logs, item)
	}

	if logs == nil {
		logs = []AdminLogItem{}
	}

	RespondWithJSON(w, http.StatusOK, logs)
}

// GetAdminUsers handles GET /api/admin/users (lists all registered users with stats)
func GetAdminUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	if !checkAdminAuth(w, r) {
		return
	}

	query := `
		SELECT u.id, u.name, u.department, u.qr_key, u.active, u.created_at,
		       COALESCE((SELECT COUNT(*) FROM attendance_logs WHERE user_id = u.id), 0) as total_attendance
		FROM users u
		ORDER BY u.name ASC
	`
	rows, err := db.DB.Query(query)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to query users: "+err.Error())
		return
	}
	defer rows.Close()

	var users []AdminUserItem
	for rows.Next() {
		var item AdminUserItem
		err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Department,
			&item.QRKey,
			&item.Active,
			&item.CreatedAt,
			&item.TotalAttendance,
		)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Failed to scan user: "+err.Error())
			return
		}
		users = append(users, item)
	}

	if users == nil {
		users = []AdminUserItem{}
	}

	RespondWithJSON(w, http.StatusOK, users)
}

// ToggleUserActive handles POST /api/admin/users/{user_id}/toggle-active
func ToggleUserActive(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	if !checkAdminAuth(w, r) {
		return
	}

	userID := r.PathValue("user_id")
	if userID == "" {
		RespondWithError(w, http.StatusBadRequest, "User ID is required")
		return
	}

	type ToggleRequest struct {
		Active bool `json:"active"`
	}

	var req ToggleRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	query := "UPDATE users SET active = $1 WHERE id = $2"
	result, err := db.DB.Exec(query, req.Active, userID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to update user status: "+err.Error())
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		RespondWithError(w, http.StatusNotFound, "User not found")
		return
	}

	statusStr := "activated"
	if !req.Active {
		statusStr = "deactivated"
	}

	RespondWithJSON(w, http.StatusOK, map[string]string{
		"status":  "success",
		"message": fmt.Sprintf("User profile successfully %s", statusStr),
	})
}
