package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/smtp"
	"os"
	"path/filepath"
	"strings"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/xuri/excelize/v2"
)

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

type ExportMessage struct {
	Event       string            `json:"event"`
	CompanyID   int               `json:"company_id"`
	RequestedBy string            `json:"requested_by"`
	Filters     map[string]string `json:"filters"`
}

func generateExcel(msg ExportMessage) (string, error) {
	f := excelize.NewFile()
	sheet := "Fleet Archive"
	f.NewSheet(sheet)
	f.DeleteSheet("Sheet1")

	headers := []string{
		"Date", "Plate", "Driver",
		"Origin", "Destination",
		"CCI KM", "Extra KM", "Total KM",
		"Customer", "Price", "Total Amount",
	}

	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	exportDir := os.Getenv("EXPORT_DIR")
	if exportDir == "" {
		exportDir = "./exports"
	}
	os.MkdirAll(exportDir, os.ModePerm)

	filename := fmt.Sprintf("%s/fleet-archive-company%d-%s.xlsx",
		exportDir,
		msg.CompanyID,
		time.Now().Format("20060102_150405"),
	)

	return filename, f.SaveAs(filename)
}

func sendExcelByEmail(filename string, msg ExportMessage) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASSWORD")

	if smtpHost == "" || smtpUser == "" || smtpPass == "" {
		log.Printf("[EMAIL] SMTP not configured, skipping email")
		return nil
	}

	fileBytes, err := os.ReadFile(filename)
	if err != nil {
		return fmt.Errorf("file read error: %w", err)
	}

	boundary := "LogisTrackBoundary"

	body := &strings.Builder{}
	body.WriteString(fmt.Sprintf("From: %s\r\n", smtpUser))
	body.WriteString(fmt.Sprintf("To: %s\r\n", msg.RequestedBy))
	body.WriteString("Subject: LogisTrack Fleet Archive Export\r\n")
	body.WriteString("MIME-Version: 1.0\r\n")
	body.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=%s\r\n\r\n", boundary))

	body.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	body.WriteString("Content-Type: text/plain; charset=utf-8\r\n\r\n")
	body.WriteString("Please find your fleet archive export attached.\r\n\r\n")

	body.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	body.WriteString("Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n")
	body.WriteString("Content-Transfer-Encoding: base64\r\n")
	body.WriteString(fmt.Sprintf("Content-Disposition: attachment; filename=\"%s\"\r\n\r\n",
		filepath.Base(filename)))
	body.WriteString(base64.StdEncoding.EncodeToString(fileBytes))
	body.WriteString(fmt.Sprintf("\r\n--%s--\r\n", boundary))

	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
	err = smtp.SendMail(
		smtpHost+":"+smtpPort,
		auth,
		smtpUser,
		[]string{msg.RequestedBy},
		[]byte(body.String()),
	)
	if err != nil {
		return fmt.Errorf("email send error: %w", err)
	}

	log.Printf("[EMAIL] Excel sent to %s", msg.RequestedBy)
	return nil
}

func main() {
	url := getURL()

	conn, err := amqp.Dial(url)
	if err != nil {
		log.Fatal("connection failed ", err)
	}
	defer conn.Close()
	log.Println("connected")

	ch, err := conn.Channel()
	if err != nil {
		log.Fatal("channel could not opened: ", err)
	}
	defer ch.Close()
	log.Println("channel opened")

	err = ch.ExchangeDeclare(
		"logistrack.events",
		"topic",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Fatal("exchange could not be created: ", err)
	}
	log.Println("exchange ready")

	q, err := ch.QueueDeclare(
		"logistrack.export.requests",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Fatal("queue can not be created: ", err)
	}
	log.Println("queue ready:", q.Name)

	err = ch.QueueBind(
		q.Name,
		"export.request",
		"logistrack.events",
		false,
		nil,
	)
	if err != nil {
		log.Fatal("queue bind err: ", err)
	}
	log.Println("queue connected")

	msgs, err := ch.Consume(
		q.Name,
		"",
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Fatal("listening error: ", err)
	}

	log.Println("expecting message.....")

	for msg := range msgs {
		log.Printf("message arrived: %s", msg.Body)

		var exportMsg ExportMessage
		if err := json.Unmarshal(msg.Body, &exportMsg); err != nil {
			log.Printf("parse error: %v", err)
			msg.Nack(false, false)
			continue
		}

		filename, err := generateExcel(exportMsg)
		if err != nil {
			log.Printf("excel error: %v", err)
			msg.Nack(false, false)
			continue
		}

		if err := sendExcelByEmail(filename, exportMsg); err != nil {
			log.Printf("email error: %v", err)
		}

		log.Printf("excel created and sent for company %d", exportMsg.CompanyID)
		msg.Ack(false)
	}
}
