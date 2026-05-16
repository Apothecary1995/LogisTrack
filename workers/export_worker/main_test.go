package main

import (
	"os"
	"testing"
)

func TestGetURL_DefaultURL(t *testing.T) {
	os.Unsetenv("RABBITMQ_URL")

	url := getURL()

	expected := "amqp://guest:guest@localhost:5672/"
	if url != expected {
		t.Errorf("expected %s, arrived %s", expected, url)
	}
}

func TestGetURL_CustomURL(t *testing.T) {
	os.Setenv("RABBITMQ_URL", "amqp://user:pass@rabbitmq:5672/")
	defer os.Unsetenv("RABBITMQ_URL")

	url := getURL()

	expected := "amqp://user:pass@rabbitmq:5672/"
	if url != expected {
		t.Errorf("expected %s, arrived %s", expected, url)
	}
}

func TestConnectRabbitMQ_InvalidURL(t *testing.T) {
	_, err := connectRabbitMQ("amqp://invalid:5672/")

	if err == nil {
		t.Error("invalid url error ")
	}
}

func TestGenerateExcel_CreatesFile(t *testing.T) {
	msg := ExportMessage{
		Event:     "export.request",
		CompanyID: 99,
	}

	err := generateExcel(msg)

	if err != nil {
		t.Fatalf("Error creating excel: %v", err)
	}
}
