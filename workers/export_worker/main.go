package main

//we will send message to queue from this worker

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
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

func generateExcel(msg ExportMessage) error {
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

	return f.SaveAs(filename)
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

		if err := generateExcel(exportMsg); err != nil {
			log.Printf("excel error: %v", err)
			msg.Nack(false, false)
			continue
		}

		log.Printf("excel created for company %d", exportMsg.CompanyID)
		msg.Ack(false)
	}
}
