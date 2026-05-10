package main 


import (

	
	"testing"
)
func TestConnectRabbitMQ_InvalidURL(t *testing.T) {
	// Geçersiz URL ile bağlantı hata vermeli
	_, err := connectRabbitMQ("amqp://invalid:5672/")

	if err == nil {
		t.Error("geçersiz URL için hata bekliyordu")
	}
}
//will add geturl test needed