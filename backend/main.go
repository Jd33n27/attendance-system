package main

import (
	"bufio"
	"log"
	"net/http"
	"os"
	"strings"

	"oalcda-attendance/db"
	"oalcda-attendance/handlers"
	"oalcda-attendance/middleware"
)

// loadEnv loads environment variables from a local .env file if it exists
func loadEnv() {
	file, err := os.Open(".env")
	if err != nil {
		// File does not exist, standard behavior for cloud deployment
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			// Strip quotes if they enclose the value
			value = strings.Trim(value, `"'`)
			os.Setenv(key, value)
		}
	}
	log.Println(".env file successfully loaded")
}

func main() {
	// 1. Load local environment configurations
	loadEnv()

	// 2. Initialize PostgreSQL database connection
	err := db.InitDB()
	if err != nil {
		log.Printf("Warning: Database initialization failed: %v", err)
		log.Println("Backend starting anyway, but database endpoints will fail")
	} else {
		defer db.CloseDB()
	}

	// 3. Create router and register handlers (Go 1.22+ patterns)
	mux := http.NewServeMux()

	// Auth routes
	mux.HandleFunc("POST /api/auth/register", handlers.RegisterUser)
	mux.HandleFunc("POST /api/auth/login", handlers.LoginUser)

	// QR code routes
	mux.HandleFunc("POST /api/qr/generate", handlers.GenerateDailyQR)
	mux.HandleFunc("GET /api/qr/active", handlers.GetActiveQR)

	// Attendance routes
	mux.HandleFunc("POST /api/attendance/scan", handlers.ClockInOut)
	mux.HandleFunc("GET /api/attendance/logs/{user_id}", handlers.GetAttendanceLogs)

	// Admin Dashboard routes
	mux.HandleFunc("GET /api/admin/logs", handlers.GetAdminLogs)
	mux.HandleFunc("GET /api/admin/users", handlers.GetAdminUsers)
	mux.HandleFunc("POST /api/admin/users/{user_id}/toggle-active", handlers.ToggleUserActive)
	mux.HandleFunc("POST /api/admin/verify", handlers.VerifyAdminToken)


	// Health check endpoint (critical for Render hosting)
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// 4. Wrap router with CORS middleware
	handler := middleware.CORS(mux)

	// 5. Determine server port
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s...", port)
	err = http.ListenAndServe(":"+port, handler)
	if err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
