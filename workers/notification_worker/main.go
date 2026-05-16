package main

import (
	"encoding/json"
	"log"
	"os"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// NotificationMessage struct
type NotificationMessage struct {
	Event       string `json:"event"`
	EventType   string `json:"event_type"`
	UserID      int    `json:"user_id"`
	Email       string `json:"email"`
	NotifyEmail bool   `json:"notify_email"`
	NotifyPush  bool   `json:"notify_push"`
	Subject     string `json:"subject"`
	Body        string `json:"body"`
}

func getURL() string {
	url := os.Getenv("RABBITMQ_URL")
	if url == "" {
		url = "amqp://guest:guest@localhost:5672/"
	}
	return url
}

func connectRabbitMQ(url string) (*amqp.Connection, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, err
	}
	return conn, nil
}

func handleNotification(msg NotificationMessage) error {
	if msg.NotifyEmail && msg.Email != "" {
		log.Printf("[EMAIL] To: %s | Subject: %s", msg.Email, msg.Subject)
		// SMTP protcol need to be implemented asap
	}

	if msg.NotifyPush && msg.UserID != 0 {
		log.Printf("[PUSH] UserID: %d | Subject: %s", msg.UserID, msg.Subject)
		// FCM asap
	}

	if !msg.NotifyEmail && !msg.NotifyPush {
		log.Printf("[SKIP] User %s has all notifications disabled", msg.Email)
	}

	return nil
}

func main() {
	url := getURL()

	for {
		if err := run(url); err != nil {
			log.Printf("connection lost: %v — retrying in 5s", err)
			time.Sleep(5 * time.Second)
		}
	}
}

func run(url string) error {
	conn, err := connectRabbitMQ(url)
	if err != nil {
		return err
	}
	defer conn.Close()
	log.Println("notification worker connected")

	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	ch.ExchangeDeclare("logistrack.events", "topic", true, false, false, false, nil)

	q, err := ch.QueueDeclare("logistrack.notifications", true, false, false, false, nil)
	if err != nil {
		return err
	}

	ch.QueueBind(q.Name, "notification.send", "logistrack.events", false, nil)
	ch.Qos(1, 0, false)

	msgs, err := ch.Consume(q.Name, "", false, false, false, false, nil)
	if err != nil {
		return err
	}

	log.Println("notification worker ready, waiting for messages...")

	for msg := range msgs {
		log.Printf("notification received: %s", msg.Body)

		var notifMsg NotificationMessage
		if err := json.Unmarshal(msg.Body, &notifMsg); err != nil {
			log.Printf("parse error: %v", err)
			msg.Nack(false, false)
			continue
		}

		if err := handleNotification(notifMsg); err != nil {
			log.Printf("notification error: %v", err)
			msg.Nack(false, false)
			continue
		}

		msg.Ack(false)
	}

	return nil
}
