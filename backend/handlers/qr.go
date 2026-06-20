package handlers

import (
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"net/http"
	"os"
	"strings"
	"time"

	"oalcda-attendance/db"
	"oalcda-attendance/models"

	"github.com/skip2/go-qrcode"
)

// GenerateQRResponse defines response shape
type GenerateQRResponse struct {
	ID             string `json:"id"`
	QRCodeString   string `json:"qr_code_string"`
	Date           string `json:"date"`
	ImageURL       string `json:"image_url"`
	Active         bool   `json:"active"`
	CreatedAt      string `json:"created_at"`
}

// GenerateDailyQR handles POST /api/qr/generate
func GenerateDailyQR(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Admin Token check if ADMIN_TOKEN env is set
	adminToken := os.Getenv("ADMIN_TOKEN")
	if adminToken != "" {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			RespondWithError(w, http.StatusUnauthorized, "Unauthorized: missing or invalid bearer token")
			return
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token != adminToken {
			RespondWithError(w, http.StatusUnauthorized, "Unauthorized: invalid token")
			return
		}
	}

	// Secret key for hash generation
	qrSecret := os.Getenv("QR_SECRET")
	if qrSecret == "" {
		qrSecret = "oalcda_super_secret_salt_2026" // Default fallback
	}

	// Current date (local council time format: YYYY-MM-DD)
	// We can use the timezone of the server, or UTC. Let's use local server time or UTC.
	// Lagos timezone is UTC+1. Let's load the location or just use UTC/local time.
	// For simplicity, we use local time (which matches host machine or UTC if configured).
	// Let's format today as YYYY-MM-DD.
	loc, err := time.LoadLocation("Africa/Lagos")
	var today time.Time
	if err != nil {
		today = time.Now() // default local
	} else {
		today = time.Now().In(loc)
	}
	dateStr := today.Format("2006-01-02")

	// Generate hash: SHA256(dateStr + secret)
	hasher := sha256.New()
	hasher.Write([]byte(dateStr + qrSecret))
	hashStr := hex.EncodeToString(hasher.Sum(nil))[:16] // use first 16 chars for cleaner string

	qrCodeString := "OALCDA_" + dateStr + "_" + hashStr

	// Generate QR Code PNG bytes
	pngBytes, err := qrcode.Encode(qrCodeString, qrcode.Medium, 256)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to generate QR code image: "+err.Error())
		return
	}

	// Base64 encode QR PNG
	imageBase64 := "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngBytes)

	// Upsert to DB
	query := `
		INSERT INTO daily_qr_codes (qr_code_string, date, active)
		VALUES ($1, $2, TRUE)
		ON CONFLICT (date) DO UPDATE 
		SET qr_code_string = EXCLUDED.qr_code_string, active = TRUE
		RETURNING id, created_at
	`
	var qr models.DailyQRCode
	qr.QRCodeString = qrCodeString
	qr.Date = dateStr
	qr.Active = true

	var createdAtTime time.Time
	err = db.DB.QueryRow(query, qr.QRCodeString, qr.Date).Scan(&qr.ID, &createdAtTime)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to save daily QR code: "+err.Error())
		return
	}

	resp := GenerateQRResponse{
		ID:           qr.ID,
		QRCodeString: qr.QRCodeString,
		Date:         qr.Date,
		ImageURL:     imageBase64,
		Active:       qr.Active,
		CreatedAt:    createdAtTime.Format(time.RFC3339),
	}

	RespondWithJSON(w, http.StatusCreated, resp)
}

// GetActiveQR handles GET /api/qr/active (useful helper endpoint for the frontend or testing)
func GetActiveQR(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	loc, err := time.LoadLocation("Africa/Lagos")
	var today time.Time
	if err != nil {
		today = time.Now()
	} else {
		today = time.Now().In(loc)
	}
	dateStr := today.Format("2006-01-02")

	var qr models.DailyQRCode
	var createdAtTime time.Time

	query := `SELECT id, qr_code_string, date, active, created_at FROM daily_qr_codes WHERE date = $1 AND active = TRUE`
	err = db.DB.QueryRow(query, dateStr).Scan(&qr.ID, &qr.QRCodeString, &qr.Date, &qr.Active, &createdAtTime)
	if err != nil {
		if err == sql.ErrNoRows {
			RespondWithError(w, http.StatusNotFound, "No active QR code generated for today")
			return
		}
		RespondWithError(w, http.StatusInternalServerError, "Failed to retrieve active QR code: "+err.Error())
		return
	}

	// Generate QR Code PNG bytes to include the base64 URL
	pngBytes, err := qrcode.Encode(qr.QRCodeString, qrcode.Medium, 256)
	var imageBase64 string
	if err == nil {
		imageBase64 = "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngBytes)
	}

	resp := GenerateQRResponse{
		ID:           qr.ID,
		QRCodeString: qr.QRCodeString,
		Date:         qr.Date,
		ImageURL:     imageBase64,
		Active:       qr.Active,
		CreatedAt:    createdAtTime.Format(time.RFC3339),
	}

	RespondWithJSON(w, http.StatusOK, resp)
}
