package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	amqp "github.com/rabbitmq/amqp091-go"
)

type Event struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.Mutex
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("[Hub] Client connected. Total: %d", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("[Hub] Client disconnected. Total: %d", len(h.clients))

		case message := <-h.broadcast:
			h.mu.Lock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Cloudflare arkasında olduğu için güvenli
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] Upgrade error: %v", err)
		return
	}

	client := &Client{hub: hub, conn: conn, send: make(chan []byte, 256)}
	hub.register <- client

	go client.writePump()
	go client.readPump()
}

func getRabbitURL() string {
	url := os.Getenv("RABBITMQ_URL")
	if url == "" {
		url = "amqp://guest:guest@localhost:5672/"
	}
	return url
}

func connectRabbitMQ(url string) (*amqp.Connection, error) {
	return amqp.Dial(url)
}

func startRabbitMQConsumer(hub *Hub) {
	url := getRabbitURL()

	for {
		if err := consumeEvents(url, hub); err != nil {
			log.Printf("[RabbitMQ] Connection lost: %v — retrying in 5s", err)
			time.Sleep(5 * time.Second)
		}
	}
}

func consumeEvents(url string, hub *Hub) error {
	conn, err := connectRabbitMQ(url)
	if err != nil {
		return err
	}
	defer conn.Close()
	log.Println("[RabbitMQ] WebSocket server connected")

	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	ch.ExchangeDeclare("logistrack.events", "topic", true, false, false, false, nil)

	q, err := ch.QueueDeclare("", false, true, true, false, nil)
	if err != nil {
		return err
	}

	patterns := []string{"trip.#", "vehicle.#", "notification.#", "export.#", "service.#", "fuel.#"}
	for _, pattern := range patterns {
		ch.QueueBind(q.Name, pattern, "logistrack.events", false, nil)
	}

	msgs, err := ch.Consume(q.Name, "", true, false, false, false, nil)
	if err != nil {
		return err
	}

	log.Println("[RabbitMQ] WebSocket server listening for all events...")

	for msg := range msgs {

		event := Event{
			Type:    msg.RoutingKey,
			Payload: json.RawMessage(msg.Body),
		}

		data, err := json.Marshal(event)
		if err != nil {
			log.Printf("[Event] Marshal error: %v", err)
			continue
		}

		log.Printf("[Event] Broadcasting: %s to %d clients", msg.RoutingKey, len(hub.clients))
		hub.broadcast <- data
	}

	return nil
}

func main() {
	hub := newHub()
	go hub.run()
	go startRabbitMQConsumer(hub)

	port := os.Getenv("WS_PORT")
	if port == "" {
		port = "8090"
	}

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","clients":` + string(rune('0'+len(hub.clients))) + `}`))
	})

	log.Printf("[Server] WebSocket server starting on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
