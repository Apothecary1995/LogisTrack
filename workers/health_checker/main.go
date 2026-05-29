package main

import (
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"time"
)

// config sservice

type Service struct {
	Name string
	URL  string
}

var services = []Service{
	{Name: "Django Backend", URL: "http://backend:8000/api/health/"},
	{Name: "RabbitMQ", URL: "http://rabbitmq:15672/"},
	{Name: "CouchDB", URL: "http://couchdb:5984/"},
	{Name: "Grafana", URL: "http://grafana:3000/api/health"},
	{Name: "WebSocket Server", URL: "http://websocket_server:8090/health"},
}

// ─track state

type ServiceState struct {
	Name    string
	Healthy bool
	Since   time.Time
}

func newStateMap() map[string]*ServiceState {
	states := make(map[string]*ServiceState)
	for _, s := range services {
		states[s.Name] = &ServiceState{
			Name:    s.Name,
			Healthy: true,
			Since:   time.Now(),
		}
	}
	return states
}

// check health

func checkService(url string) bool {
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode < 500
}

//email alertt

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func sendAlert(subject, body string) error {
	host := getEnv("SMTP_HOST", "smtp.gmail.com")
	port := getEnv("SMTP_PORT", "587")
	user := getEnv("SMTP_USER", "")
	pass := getEnv("SMTP_PASSWORD", "")
	to := getEnv("ALERT_EMAIL", user)

	if user == "" || pass == "" {
		log.Printf("[Alert] SMTP not configured, skipping email")
		return nil
	}

	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s",
		user, to, subject, body,
	)

	auth := smtp.PlainAuth("", user, pass, host)
	return smtp.SendMail(host+":"+port, auth, user, []string{to}, []byte(msg))
}

func monitor(interval time.Duration) {
	states := newStateMap()
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	log.Printf("[Health] Monitoring %d services every %s", len(services), interval)

	for range ticker.C {
		for _, svc := range services {
			healthy := checkService(svc.URL)
			state := states[svc.Name]

			if healthy && !state.Healthy {
				// Recovered
				downtime := time.Since(state.Since).Round(time.Second)
				log.Printf("[Health] RECOVERED: %s (was down for %s)", svc.Name, downtime)

				subject := fmt.Sprintf("[LogisTrack] RECOVERED: %s", svc.Name)
				body := fmt.Sprintf(
					"Service %s has recovered.\nWas down for: %s\nRecovered at: %s",
					svc.Name, downtime, time.Now().Format(time.RFC1123),
				)
				if err := sendAlert(subject, body); err != nil {
					log.Printf("[Alert] Email error: %v", err)
				}

				state.Healthy = true
				state.Since = time.Now()

			} else if !healthy && state.Healthy {
				// Went down
				log.Printf("[Health] DOWN: %s", svc.Name)

				subject := fmt.Sprintf("[LogisTrack] DOWN: %s", svc.Name)
				body := fmt.Sprintf(
					"Service %s is DOWN!\nDetected at: %s\nURL: %s",
					svc.Name, time.Now().Format(time.RFC1123), svc.URL,
				)
				if err := sendAlert(subject, body); err != nil {
					log.Printf("[Alert] Email error: %v", err)
				}

				state.Healthy = false
				state.Since = time.Now()

			} else if healthy {
				log.Printf("[Health] OK: %s", svc.Name)
			} else {
				log.Printf("[Health] STILL DOWN: %s (since %s)", svc.Name, state.Since.Format("15:04:05"))
			}
		}
	}
}

func main() {
	interval := 30 * time.Second
	if v := os.Getenv("CHECK_INTERVAL"); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			interval = d
		}
	}
	monitor(interval)
}
