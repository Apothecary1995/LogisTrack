package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// structs

type TripMessage struct {
	Event     string  `json:"event"`
	CompanyID int     `json:"company_id"`
	TripID    int     `json:"trip_id"`
	Plate     string  `json:"plate_number"`
	Origin    string  `json:"origin"`
	Dest      string  `json:"destination"`
	CciKm     float64 `json:"cci_km"`
	ExtraKm   float64 `json:"extra_km"`
	Amount    float64 `json:"total_amount"`
	CreatedAt string  `json:"created_at"`
}

type VehicleMessage struct {
	Event     string `json:"event"`
	CompanyID int    `json:"company_id"`
	VehicleID int    `json:"vehicle_id"`
	Plate     string `json:"plate_number"`
	Driver    string `json:"driver_name"`
}

type CouchDoc struct {
	ID   string      `json:"_id"`
	Rev  string      `json:"_rev,omitempty"`
	Data interface{} `json:"data"`
	Type string      `json:"type"`
}

// couchdb for offline use

func getCouchURL() string {
	url := os.Getenv("COUCHDB_URL")
	if url == "" {
		url = "http://logistrack:logistrack_pass@localhost:5984/"
	}
	return url
}

func ensureDB(dbName string) error {
	url := getCouchURL() + dbName
	req, _ := http.NewRequest("PUT", url, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

func getDocRev(dbName, docID string) string {
	url := fmt.Sprintf("%s%s/%s", getCouchURL(), dbName, docID)
	resp, err := http.Get(url)
	if err != nil || resp.StatusCode != 200 {
		return ""
	}
	defer resp.Body.Close()

	var doc map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&doc)
	if rev, ok := doc["_rev"].(string); ok {
		return rev
	}
	return ""
}

func saveToCouch(dbName, docID string, data interface{}) error {
	rev := getDocRev(dbName, docID)

	doc := map[string]interface{}{
		"_id":  docID,
		"data": data,
		"type": dbName,
	}
	if rev != "" {
		doc["_rev"] = rev
	}

	body, err := json.Marshal(doc)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s%s/%s", getCouchURL(), dbName, docID)
	req, err := http.NewRequest("PUT", url, bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 201 && resp.StatusCode != 200 {
		return fmt.Errorf("couchdb error: %d", resp.StatusCode)
	}

	log.Printf("[CouchDB] Saved %s/%s", dbName, docID)
	return nil
}

// handler mesaages

func handleTrip(body []byte) error {
	var msg TripMessage
	if err := json.Unmarshal(body, &msg); err != nil {
		return fmt.Errorf("parse error: %w", err)
	}

	docID := fmt.Sprintf("trip_%d", msg.TripID)
	return saveToCouch("trips", docID, msg)
}

func handleVehicle(body []byte) error {
	var msg VehicleMessage
	if err := json.Unmarshal(body, &msg); err != nil {
		return fmt.Errorf("parse error: %w", err)
	}

	docID := fmt.Sprintf("vehicle_%d", msg.VehicleID)
	return saveToCouch("vehicles", docID, msg)
}

//rabbitmq pub sub

func getURL() string {
	url := os.Getenv("RABBITMQ_URL")
	if url == "" {
		url = "amqp://guest:guest@localhost:5672/"
	}
	return url
}

func connectRabbitMQ(url string) (*amqp.Connection, error) {
	return amqp.Dial(url)
}

func run(url string) error {
	conn, err := connectRabbitMQ(url)
	if err != nil {
		return err
	}
	defer conn.Close()
	log.Println("CouchDB worker connected to RabbitMQ")

	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	ch.ExchangeDeclare("logistrack.events", "topic", true, false, false, false, nil)

	ensureDB("trips")
	ensureDB("vehicles")

	// Trip queue
	tripQ, _ := ch.QueueDeclare("logistrack.couchdb.trips", true, false, false, false, nil)
	ch.QueueBind(tripQ.Name, "trip.#", "logistrack.events", false, nil)

	// Vehicle queue
	vehicleQ, _ := ch.QueueDeclare("logistrack.couchdb.vehicles", true, false, false, false, nil)
	ch.QueueBind(vehicleQ.Name, "vehicle.#", "logistrack.events", false, nil)

	ch.Qos(1, 0, false)

	tripMsgs, _ := ch.Consume(tripQ.Name, "", false, false, false, false, nil)
	vehicleMsgs, _ := ch.Consume(vehicleQ.Name, "", false, false, false, false, nil)

	log.Println("CouchDB worker ready, waiting for messages...")

	for {
		select {
		case msg := <-tripMsgs:
			log.Printf("[Trip] Message received")
			if err := handleTrip(msg.Body); err != nil {
				log.Printf("[Trip] Error: %v", err)
				msg.Nack(false, false)
			} else {
				msg.Ack(false)
			}

		case msg := <-vehicleMsgs:
			log.Printf("[Vehicle] Message received")
			if err := handleVehicle(msg.Body); err != nil {
				log.Printf("[Vehicle] Error: %v", err)
				msg.Nack(false, false)
			} else {
				msg.Ack(false)
			}
		}
	}
}

func main() {
	url := getURL()

	for {
		if err := run(url); err != nil {
			log.Printf("Connection failed: %v — retrying in 5s", err)
			time.Sleep(5 * time.Second)
		}
	}
}
