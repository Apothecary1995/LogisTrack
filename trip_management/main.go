package main

import (
	"encoding/json"
	"log"
	"math"
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

// optional coordinates (nil if not provided)
type coord = *float64

type TripWithCoords struct {
	Trip
	OriginLat  coord   `json:"originLat,omitempty"`
	OriginLng  coord   `json:"originLng,omitempty"`
	DestLat    coord   `json:"destLat,omitempty"`
	DestLng    coord   `json:"destLng,omitempty"`
	DistanceKM float64 `json:"distanceKM,omitempty"`
	Archived   bool    `json:"archived,omitempty"`
	ArchivedAt string  `json:"archivedAt,omitempty"`
}

type Waybill struct {
	ID            int64  `json:"id"`
	WaybillNumber string `json:"waybillNumber"`
	TripID        int64  `json:"tripId,omitempty"`
	TripCode      string `json:"tripCode,omitempty"`
	Sender        string `json:"sender"`
	Receiver      string `json:"receiver"`
	Cargo         string `json:"cargo"`
	Weight        string `json:"weight"`
	Volume        string `json:"volume"`
	Pickup        string `json:"pickup"`
	Delivery      string `json:"delivery"`
	Status        string `json:"status"`
	CreatedAt     string `json:"createdAt"`
}

var (
	trips         []TripWithCoords
	tripsMu       sync.Mutex
	waybills      []Waybill
	waybillsMu    sync.Mutex
	nextID        int64 = 1
	waybillNextID int64 = 1
)

func main() {
	http.Handle("/", http.FileServer(http.Dir("./static")))
	http.HandleFunc("/api/trips", tripsHandler)
	http.HandleFunc("/api/trips/archive", archiveHandler)
	http.HandleFunc("/api/waybills", waybillsHandler)

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
		var trip TripWithCoords
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

		// compute distance if all coordinates provided
		if trip.OriginLat != nil && trip.OriginLng != nil && trip.DestLat != nil && trip.DestLng != nil {
			trip.DistanceKM = haversine(*trip.OriginLat, *trip.OriginLng, *trip.DestLat, *trip.DestLng)
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

func archiveHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload struct {
		ID       int64 `json:"id"`
		Archived bool  `json:"archived"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	tripsMu.Lock()
	defer tripsMu.Unlock()

	for i := range trips {
		if trips[i].ID == payload.ID {
			trips[i].Archived = payload.Archived
			if payload.Archived {
				trips[i].ArchivedAt = time.Now().Format(time.RFC3339)
			} else {
				trips[i].ArchivedAt = ""
			}
			json.NewEncoder(w).Encode(trips[i])
			return
		}
	}

	http.Error(w, "Trip not found", http.StatusNotFound)
}

func waybillsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		waybillsMu.Lock()
		defer waybillsMu.Unlock()
		json.NewEncoder(w).Encode(waybills)

	case http.MethodPost:
		var waybill Waybill
		if err := json.NewDecoder(r.Body).Decode(&waybill); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if waybill.WaybillNumber == "" {
			http.Error(w, "Waybill number is required", http.StatusBadRequest)
			return
		}

		if waybill.CreatedAt == "" {
			waybill.CreatedAt = time.Now().Format(time.RFC3339)
		}

		if waybill.TripID != 0 {
			tripsMu.Lock()
			for _, trip := range trips {
				if trip.ID == waybill.TripID {
					waybill.TripCode = trip.TripCode
					break
				}
			}
			tripsMu.Unlock()
		}

		waybillsMu.Lock()
		waybill.ID = waybillNextID
		waybillNextID++
		waybills = append(waybills, waybill)
		waybillsMu.Unlock()

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(waybill)

	case http.MethodPut:
		var payload Waybill
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if payload.ID == 0 {
			http.Error(w, "Waybill id is required", http.StatusBadRequest)
			return
		}

		waybillsMu.Lock()
		defer waybillsMu.Unlock()

		for i := range waybills {
			if waybills[i].ID == payload.ID {
				waybills[i].WaybillNumber = payload.WaybillNumber
				waybills[i].TripID = payload.TripID
				waybills[i].TripCode = payload.TripCode
				waybills[i].Sender = payload.Sender
				waybills[i].Receiver = payload.Receiver
				waybills[i].Cargo = payload.Cargo
				waybills[i].Weight = payload.Weight
				waybills[i].Volume = payload.Volume
				waybills[i].Pickup = payload.Pickup
				waybills[i].Delivery = payload.Delivery
				waybills[i].Status = payload.Status
				json.NewEncoder(w).Encode(waybills[i])
				return
			}
		}

		http.Error(w, "Waybill not found", http.StatusNotFound)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func haversine(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0 // Earth radius in km
	dLat := (lat2 - lat1) * math.Pi / 180.0
	dLon := (lon2 - lon1) * math.Pi / 180.0
	a := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(lat1*math.Pi/180.0)*math.Cos(lat2*math.Pi/180.0)*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}
