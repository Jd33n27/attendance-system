package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"oalcda-attendance/db"
	"oalcda-attendance/models"
)

type RegisterRequest struct {
	Name       string `json:"name"`
	Department string `json:"department"`
}

type LoginRequest struct {
	QRKey string `json:"qr_key"`
}

// RegisterUser handles POST /api/auth/register
func RegisterUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req RegisterRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Name == "" || req.Department == "" {
		RespondWithError(w, http.StatusBadRequest, "Name and department are required")
		return
	}

	// Check for duplicate registration by name + department (case-insensitive trim check)
	var existingID string
	checkDupQuery := `SELECT id FROM users WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND LOWER(TRIM(department)) = LOWER(TRIM($2))`
	err = db.DB.QueryRow(checkDupQuery, req.Name, req.Department).Scan(&existingID)
	if err == nil {
		RespondWithError(w, http.StatusConflict, "A worker with this name is already registered in this department.")
		return
	} else if err != sql.ErrNoRows {
		RespondWithError(w, http.StatusInternalServerError, "Database error: "+err.Error())
		return
	}

	userID, err := GenerateUUID()
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to generate user ID")
		return
	}

	qrKey := Slugify(req.Name) + "_" + userID[:8]

	var user models.User
	user.ID = userID
	user.Name = req.Name
	user.Department = req.Department
	user.QRKey = qrKey

	query := `
		INSERT INTO users (id, name, department, qr_key)
		VALUES ($1, $2, $3, $4)
		RETURNING created_at
	`
	err = db.DB.QueryRow(query, user.ID, user.Name, user.Department, user.QRKey).Scan(&user.CreatedAt)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to register user: "+err.Error())
		return
	}

	RespondWithJSON(w, http.StatusCreated, user)
}

// LoginUser handles POST /api/auth/login
func LoginUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req LoginRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.QRKey == "" {
		RespondWithError(w, http.StatusBadRequest, "QR Key is required")
		return
	}

	var user models.User
	var active bool
	query := `
		SELECT id, name, department, qr_key, active, created_at
		FROM users
		WHERE qr_key = $1
	`
	err = db.DB.QueryRow(query, req.QRKey).Scan(&user.ID, &user.Name, &user.Department, &user.QRKey, &active, &user.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			RespondWithError(w, http.StatusNotFound, "Worker profile not found. Please register first.")
			return
		}
		RespondWithError(w, http.StatusInternalServerError, "Database error: "+err.Error())
		return
	}

	if !active {
		RespondWithError(w, http.StatusForbidden, "Worker profile is suspended. Please contact administrator.")
		return
	}

	RespondWithJSON(w, http.StatusOK, user)
}

