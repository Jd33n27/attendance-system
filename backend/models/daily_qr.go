package models

import "time"

type DailyQRCode struct {
	ID           string    `json:"id"`
	QRCodeString string    `json:"qr_code_string"`
	Date         string    `json:"date"` // YYYY-MM-DD
	Active       bool      `json:"active"`
	CreatedAt    time.Time `json:"created_at"`
}
