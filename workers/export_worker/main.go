package main

//we will send message to queue from this worker

import (
	"log"
	"os"

	amqp "github.com/rabbitmq/amqp091-go"
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

func main() {

	//this block of code here if we cant get url will route it to default url for mq
	url := getURL()

	//this block of code is here for connection purposes

	/*check this example for further knowlage func main() {
	  // Define RabbitMQ server URL.
	  amqpServerURL := os.Getenv("AMQP_SERVER_URL")

	  // Create a new RabbitMQ connection.
	  connectRabbitMQ, err := amqp.Dial(amqpServerURL)
	  if err != nil {
	      panic(err)
	  }
	  defer connectRabbitMQ.Close() */
	//will use log since we need dates as well
	conn, err := amqp.Dial(url)
	if err != nil {
		log.Fatal("connection failed ", err)

	}
	defer conn.Close()
	log.Println("connected")

	// channels needs to be implemented
	// Channel opens
	ch, err := conn.Channel()
	if err != nil {
		log.Fatal("channel could not opened: ", err)
	}
	defer ch.Close()
	log.Println("channel opened")

	// Exchange defined
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
		log.Fatal("exchange oluşturulamadı: ", err)
	}
	log.Println("exchange hazır")

	// Queue define
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

	// bind queue to exchange
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
	log.Println("queue connectead")

	//message listeners
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
		log.Fatal("listenening: ", err)
	}

	log.Println("expecting message.....")

	for msg := range msgs {
		log.Printf("message arrived: %s", msg.Body)
		msg.Ack(false)
	}

}
