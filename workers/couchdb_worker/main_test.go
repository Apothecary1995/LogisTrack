package main

import (
	"encoding/json"
	"os"
	"testing"
)

func TestGetURL_Default(t *testing.T) {
	os.Unsetenv("RABBITMQ_URL")
	url := getURL()
	expected := "amqp://guest:guest@localhost:5672/"
	if url != expected {
		t.Errorf("expected %s, got %s", expected, url)
	}
}

func TestGetURL_Custom(t *testing.T) {
	os.Setenv("RABBITMQ_URL", "amqp://user:pass@rabbitmq:5672/")
	defer os.Unsetenv("RABBITMQ_URL")
	url := getURL()
	expected := "amqp://user:pass@rabbitmq:5672/"
	if url != expected {
		t.Errorf("expected %s, got %s", expected, url)
	}
}

func TestHandleTrip_ValidJSON(t *testing.T) {
	msg := TripMessage{
		Event:     "trip.created",
		CompanyID: 1,
		TripID:    42,
		Plate:     "34ABC123",
		Origin:    "Istanbul",
		Dest:      "Sarajevo",
		CciKm:     1247.5,
		ExtraKm:   45.0,
		Amount:    3200.00,
		CreatedAt: "2026-05-20T10:00:00Z",
	}

	body, _ := json.Marshal(msg)

	// only parse
	var parsed TripMessage
	if err := json.Unmarshal(body, &parsed); err != nil {
		t.Fatalf("parse error: %v", err)
	}

	if parsed.TripID != 42 {
		t.Errorf("expected TripID 42, got %d", parsed.TripID)
	}
	if parsed.Plate != "34ABC123" {
		t.Errorf("expected plate 34ABC123, got %s", parsed.Plate)
	}
}

func TestHandleTrip_InvalidJSON(t *testing.T) {
	body := []byte(`invalid json`)
	var msg TripMessage
	err := json.Unmarshal(body, &msg)
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestHandleVehicle_ValidJSON(t *testing.T) {
	msg := VehicleMessage{
		Event:     "vehicle.created",
		CompanyID: 1,
		VehicleID: 5,
		Plate:     "06DEF456",
		Driver:    "Mehmet Yilmaz",
	}

	body, _ := json.Marshal(msg)

	var parsed VehicleMessage
	if err := json.Unmarshal(body, &parsed); err != nil {
		t.Fatalf("parse error: %v", err)
	}

	if parsed.VehicleID != 5 {
		t.Errorf("expected VehicleID 5, got %d", parsed.VehicleID)
	}
}

func TestConnectRabbitMQ_InvalidURL(t *testing.T) {
	_, err := connectRabbitMQ("amqp://invalid:5672/")
	if err == nil {
		t.Error("expected error for invalid URL")
	}
}
