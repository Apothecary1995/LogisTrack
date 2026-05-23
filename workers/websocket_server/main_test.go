package main

import (
	"encoding/json"
	"os"
	"testing"
	"time"
)

func TestGetRabbitURL_Default(t *testing.T) {
	os.Unsetenv("RABBITMQ_URL")
	url := getRabbitURL()
	expected := "amqp://guest:guest@localhost:5672/"
	if url != expected {
		t.Errorf("expected %s, got %s", expected, url)
	}
}

func TestGetRabbitURL_Custom(t *testing.T) {
	os.Setenv("RABBITMQ_URL", "amqp://user:pass@rabbitmq:5672/")
	defer os.Unsetenv("RABBITMQ_URL")
	url := getRabbitURL()
	if url != "amqp://user:pass@rabbitmq:5672/" {
		t.Errorf("unexpected url: %s", url)
	}
}

func TestHubRegisterUnregister(t *testing.T) {
	hub := newHub()
	go hub.run()

	client := &Client{
		hub:  hub,
		send: make(chan []byte, 256),
	}

	hub.register <- client
	time.Sleep(50 * time.Millisecond)

	hub.mu.Lock()
	count := len(hub.clients)
	hub.mu.Unlock()

	if count != 1 {
		t.Errorf("expected 1 client, got %d", count)
	}

	hub.unregister <- client
	time.Sleep(50 * time.Millisecond)

	hub.mu.Lock()
	count = len(hub.clients)
	hub.mu.Unlock()

	if count != 0 {
		t.Errorf("expected 0 clients, got %d", count)
	}
}

func TestHubBroadcast(t *testing.T) {
	hub := newHub()
	go hub.run()

	client := &Client{
		hub:  hub,
		send: make(chan []byte, 256),
	}

	hub.register <- client
	time.Sleep(50 * time.Millisecond)

	msg := []byte(`{"type":"trip.created","payload":{}}`)
	hub.broadcast <- msg
	time.Sleep(50 * time.Millisecond)

	select {
	case received := <-client.send:
		if string(received) != string(msg) {
			t.Errorf("expected %s, got %s", msg, received)
		}
	default:
		t.Error("no message received")
	}
}

func TestEventMarshaling(t *testing.T) {
	event := Event{
		Type:    "trip.created",
		Payload: json.RawMessage(`{"trip_id":1,"plate":"34ABC123"}`),
	}

	data, err := json.Marshal(event)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}

	var parsed Event
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}

	if parsed.Type != "trip.created" {
		t.Errorf("expected trip.created, got %s", parsed.Type)
	}
}

func TestConnectRabbitMQ_InvalidURL(t *testing.T) {
	_, err := connectRabbitMQ("amqp://invalid:5672/")
	if err == nil {
		t.Error("expected error for invalid URL")
	}
}
