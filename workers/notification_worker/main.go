package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/smtp"
	"os"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

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

func sendEmail(to, subject, body string) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASSWORD")

	if smtpHost == "" || smtpUser == "" || smtpPass == "" {
		log.Printf("[EMAIL] SMTP not configured, skipping email to %s", to)
		return nil
	}

	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s", smtpUser, to, subject, body)

	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, smtpUser, []string{to}, []byte(msg))
	if err != nil {
		return fmt.Errorf("email send error: %w", err)
	}

	log.Printf("[EMAIL] Sent to %s | Subject: %s", to, subject)
	return nil
}

func handleNotification(msg NotificationMessage) error {
	if msg.NotifyEmail && msg.Email != "" {
		if err := sendEmail(msg.Email, msg.Subject, msg.Body); err != nil {
			log.Printf("[EMAIL ERROR] %v", err)
		}
	}

	if msg.NotifyPush && msg.UserID != 0 {
		log.Printf("[PUSH] UserID: %d | Subject: %s", msg.UserID, msg.Subject)
		// FCM integration goes here
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
