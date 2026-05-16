package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"
)

type Trip struct {
	ID            int64  `json:"id"`
	TripCode      string `json:"tripCode"`
	Origin        string `json:"origin"`
	Destination   string `json:"destination"`
	DepartureTime string `json:"departureTime"`
	ArrivalTime   string `json:"arrivalTime"`
	Vehicle       string `json:"vehicle"`
	Driver        string `json:"driver"`
	Cargo         string `json:"cargo"`
	Notes         string `json:"notes"`
	CreatedAt     string `json:"createdAt"`
}

var (
	trips   []Trip
	tripsMu sync.Mutex
	nextID  int64 = 1
)

func main() {
	http.Handle("/", http.FileServer(http.Dir("./static")))
	http.HandleFunc("/api/trips", tripsHandler)

	log.Println("Trip management server started: http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func tripsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		tripsMu.Lock()
		defer tripsMu.Unlock()
		json.NewEncoder(w).Encode(trips)

	case http.MethodPost:
		var trip Trip
		if err := json.NewDecoder(r.Body).Decode(&trip); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if trip.TripCode == "" || trip.Origin == "" || trip.Destination == "" {
			http.Error(w, "Trip code, origin and destination are required", http.StatusBadRequest)
			return
		}

		if trip.CreatedAt == "" {
			trip.CreatedAt = time.Now().Format(time.RFC3339)
		}

		tripsMu.Lock()
		trip.ID = nextID
		nextID++
		trips = append(trips, trip)
		tripsMu.Unlock()

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(trip)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
