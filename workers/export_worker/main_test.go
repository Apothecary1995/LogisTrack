package main

import (
	"os"
	"testing"
)

func TestConnectRabbitMQ_InvalidURL(t *testing.T) {
	_, err := connectRabbitMQ("amqp://invalid:5672/")

	if err == nil {
		t.Error("geçersiz URL için hata bekliyordu")
	}
}

// geturl test added
func TestGetURL_DefaultURL(t *testing.T) {
	os.Unsetenv("RABBITMQ_URL")

	url := getURL()

	expected := "amqp://guest:guest@localhost:5672/"
	if url != expected {
		t.Errorf("beklenen %s, gelen %s", expected, url)
	}
}

func TestGetURL_CustomURL(t *testing.T) {
	os.Setenv("RABBITMQ_URL", "amqp://user:pass@rabbitmq:5672/")
	defer os.Unsetenv("RABBITMQ_URL")

	url := getURL()

	expected := "amqp://user:pass@rabbitmq:5672/"
	if url != expected {
		t.Errorf("beklenen %s, gelen %s", expected, url)
	}
}
