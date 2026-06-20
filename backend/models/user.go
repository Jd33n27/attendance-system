package models

import "time"

type User struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Department string    `json:"department"`
	QRKey      string    `json:"qr_key"`
	CreatedAt  time.Time `json:"created_at"`
}
