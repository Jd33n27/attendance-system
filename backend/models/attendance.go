package models

import "time"

type AttendanceLog struct {
	ID            string     `json:"id"`
	UserID        string     `json:"user_id"`
	ClockIn       *time.Time `json:"clock_in"`
	ClockOut      *time.Time `json:"clock_out"`
	Date          string     `json:"date"` // YYYY-MM-DD
	CreatedAt     time.Time  `json:"created_at"`
	DurationHours *float64   `json:"duration_hours,omitempty"`
}
