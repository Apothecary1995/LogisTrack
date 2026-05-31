package main

import (
	"encoding/json"
	"os"
	"testing"

	amqp "github.com/rabbitmq/amqp091-go"
)

// UNIT TESTS: handleNotification func logic etest
func TestHandleNotification(t *testing.T) {
	tests := []struct {
		name    string
		message NotificationMessage
		wantErr bool
	}{
		{
			name: "Email notification enabled",
			message: NotificationMessage{
				Email:       "test@example.com",
				NotifyEmail: true,
				Subject:     "Hello Email",
			},
			wantErr: false,
		},
		{
			name: "Push notification enabled",
			message: NotificationMessage{
				UserID:     123,
				NotifyPush: true,
				Subject:    "Hello Push",
			},
			wantErr: false,
		},
		{
			name: "Both notifications disabled",
			message: NotificationMessage{
				Email:       "silent@example.com",
				NotifyEmail: false,
				NotifyPush:  false,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := handleNotification(tt.message)
			if (err != nil) != tt.wantErr {
				t.Errorf("handleNotification() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// UNIT TEST: getURL func test .
func TestGetURL(t *testing.T) {
	oldURL := os.Getenv("RABBITMQ_URL")
	defer os.Setenv("RABBITMQ_URL", oldURL)

	// env tests
	os.Setenv("RABBITMQ_URL", "")
	got := getURL()
	want := "amqp://guest:guest@localhost:5672/"
	if got != want {
		t.Errorf("getURL() = %q, want %q (default)", got, want)
	}

	customURL := "amqp://user:pass@remote:5672/"
	os.Setenv("RABBITMQ_URL", customURL)
	got = getURL()
	if got != customURL {
		t.Errorf("getURL() = %q, want %q (custom)", got, customURL)
	}
}

// INTEGRATION TEST: testing it with rabbitmq over docker
// if rabbitmq not found will skip test
func TestRabbitMQIntegration(t *testing.T) {
	url := getURL()

	// check connecion
	conn, err := connectRabbitMQ(url)
	if err != nil {
		t.Skipf("RabbitMQ bağlantısı kurulamadı, entegrasyon testi atlanıyor: %v", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		t.Fatalf("Channel oluşturulamadı: %v", err)
	}
	defer ch.Close()

	err = ch.ExchangeDeclare("logistrack.events", "topic", true, false, false, false, nil)
	if err != nil {
		t.Fatalf("ExchangeDeclare hatası: %v", err)
	}

	// identfiy tail
	q, err := ch.QueueDeclare("logistrack.notifications_test", true, false, false, false, nil)
	if err != nil {
		t.Fatalf("QueueDeclare hatası: %v", err)
	}
	// clear the tail
	defer func() {
		_, _ = ch.QueueDelete("logistrack.notifications_test", false, false, false)
	}()

	// binding test
	err = ch.QueueBind(q.Name, "notification.send", "logistrack.events", false, nil)
	if err != nil {
		t.Fatalf("QueueBind hatası: %v", err)
	}

	// send and recevice message
	mockMsg := NotificationMessage{
		Event:       "user.created",
		Email:       "integration@test.com",
		NotifyEmail: true,
		Subject:     "Welcome",
		Body:        "Integration test body",
	}

	body, _ := json.Marshal(mockMsg)

	// send message to queue
	err = ch.Publish("logistrack.events", "notification.send", false, false, amqp.Publishing{
		ContentType: "application/json",
		Body:        body,
	})
	if err != nil {
		t.Fatalf("Mesaj publish edilemedi: %v", err)
	}

	// draw from message queue
	msgs, err := ch.Consume(q.Name, "", true, false, false, false, nil)
	if err != nil {
		t.Fatalf("Consume hatası: %v", err)
	}

	// confitm message arrived
	select {
	case d := <-msgs:
		var received NotificationMessage
		if err := json.Unmarshal(d.Body, &received); err != nil {
			t.Fatalf("Gelen mesaj parse edilemedi: %v", err)
		}
		if received.Email != mockMsg.Email {
			t.Errorf("Beklenen Email: %s, Gelen Email: %s", mockMsg.Email, received.Email)
		}
	}
}
func TestSendEmail_NoSMTP(t *testing.T) {
	os.Unsetenv("SMTP_HOST")
	os.Unsetenv("SMTP_USER")
	os.Unsetenv("SMTP_PASSWORD")

	err := sendEmail("test@test.com", "Test Subject", "Test Body")
	if err != nil {
		t.Errorf("expected nil when SMTP not configured: %v", err)
	}
}

func TestHandleNotification_WithEmail(t *testing.T) {
	os.Unsetenv("SMTP_HOST")
	os.Unsetenv("SMTP_USER")
	os.Unsetenv("SMTP_PASSWORD")

	msg := NotificationMessage{
		Email:       "test@test.com",
		NotifyEmail: true,
		Subject:     "Test",
		Body:        "Test body",
	}

	err := handleNotification(msg)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}
