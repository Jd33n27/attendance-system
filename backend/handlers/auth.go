package handlers

import (
	"encoding/json"
	"net/http"

	"oalcda-attendance/db"
	"oalcda-attendance/models"
)

type RegisterRequest struct {
	Name       string `json:"name"`
	Department string `json:"department"`
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
		// Check for unique constraint violation on qr_key
		// Since we slugify and append part of UUID, this is rare, but good to handle.
		RespondWithError(w, http.StatusInternalServerError, "Failed to register user: "+err.Error())
		return
	}

	RespondWithJSON(w, http.StatusCreated, user)
}
