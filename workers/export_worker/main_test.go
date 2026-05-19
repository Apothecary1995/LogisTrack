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

	testDir := "./test_exports"
	defer os.RemoveAll(testDir)

	os.Setenv("EXPORT_DIR", testDir)
	defer os.Unsetenv("EXPORT_DIR")

	filename, err := generateExcel(msg)

	if err != nil {
		t.Fatalf("Excel creation error: %v", err)
	}

	if _, err := os.Stat(filename); os.IsNotExist(err) {
		t.Errorf("file can not created: %s", filename)
	}
}
