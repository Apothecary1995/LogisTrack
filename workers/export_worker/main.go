package main 

//we will send message to queue from this worker 

import(
"fmt"
"log"
"os"
amqp "github.com/rabbitmq/amqp091-go"

)




func connectRabbitMQ(url string) (*amqp.Connection, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, err
	}
	return conn, nil
}





func main(){

//this block of code here if we cant get url will route it to default url for mq
url := os.Getenv("RABBITMQ_URL")
if url == ""{
	url = "amqp://guest:guest@localhost:5672/"
}


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
	log.Fatal("connection failed ",err)

}
defer conn.Close()
log.Println("connected")


// channels needs to be implemented





}


