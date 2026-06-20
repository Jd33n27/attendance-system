package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"oalcda-attendance/db"
	"oalcda-attendance/models"

	"golang.org/x/crypto/bcrypt"
)

type RegisterRequest struct {
	Name       string `json:"name"`
	Department string `json:"department"`
	Password   string `json:"password"`
}

type LoginRequest struct {
	Name       string `json:"name"`
	Department string `json:"department"`
	Password   string `json:"password"`
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

	if req.Name == "" || req.Department == "" || req.Password == "" {
		RespondWithError(w, http.StatusBadRequest, "Name, department, and password are required")
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

	// Hash password using bcrypt
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}
	passwordHash := string(hashedBytes)

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
		INSERT INTO users (id, name, department, qr_key, password_hash)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at
	`
	err = db.DB.QueryRow(query, user.ID, user.Name, user.Department, user.QRKey, passwordHash).Scan(&user.CreatedAt)
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

	if req.Name == "" || req.Department == "" || req.Password == "" {
		RespondWithError(w, http.StatusBadRequest, "Name, department, and password are required")
		return
	}

	var user models.User
	var active bool
	var passwordHash string
	query := `
		SELECT id, name, department, qr_key, password_hash, active, created_at
		FROM users
		WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND LOWER(TRIM(department)) = LOWER(TRIM($2))
	`
	err = db.DB.QueryRow(query, req.Name, req.Department).Scan(&user.ID, &user.Name, &user.Department, &user.QRKey, &passwordHash, &active, &user.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			RespondWithError(w, http.StatusUnauthorized, "Invalid credentials. Worker profile not found.")
			return
		}
		RespondWithError(w, http.StatusInternalServerError, "Database error: "+err.Error())
		return
	}

	if !active {
		RespondWithError(w, http.StatusForbidden, "Worker profile is suspended. Please contact administrator.")
		return
	}

	// Verify hashed password
	err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password))
	if err != nil {
		RespondWithError(w, http.StatusUnauthorized, "Invalid credentials. Incorrect password.")
		return
	}

	RespondWithJSON(w, http.StatusOK, user)
}


