package main

import (
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"sync"
	"time"
)

// rate limiteer

type RateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	limit    int
	window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
	go rl.cleanup()
	return rl
}

func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.window)

	var recent []time.Time
	for _, t := range rl.requests[ip] {
		if t.After(windowStart) {
			recent = append(recent, t)
		}
	}

	if len(recent) >= rl.limit {
		rl.requests[ip] = recent
		return false
	}

	rl.requests[ip] = append(recent, now)
	return true
}

func (rl *RateLimiter) cleanup() {
	for {
		time.Sleep(5 * time.Minute)
		rl.mu.Lock()
		now := time.Now()
		for ip, times := range rl.requests {
			var recent []time.Time
			for _, t := range times {
				if t.After(now.Add(-rl.window)) {
					recent = append(recent, t)
				}
			}
			if len(recent) == 0 {
				delete(rl.requests, ip)
			} else {
				rl.requests[ip] = recent
			}
		}
		rl.mu.Unlock()
	}
}

type Rules struct {
	global *RateLimiter
	auth   *RateLimiter
	export *RateLimiter
}

func NewRules() *Rules {
	return &Rules{
		global: NewRateLimiter(100, time.Minute), // 100 istek/dakika
		auth:   NewRateLimiter(5, time.Minute),   // 5 login/dakika
		export: NewRateLimiter(10, time.Hour),    // 10 export/saat
	}
}

func (r *Rules) Check(ip, path string) (bool, string) {
	// authontication limits
	if path == "/api/auth/login/" || path == "/api/auth/register/" {
		if !r.auth.Allow(ip) {
			return false, "Too many auth requests. Try again in 1 minute."
		}
	}

	// Export endpoints
	if path == "/api/archive/export/" {
		if !r.export.Allow(ip) {
			return false, "Too many export requests. Try again in 1 hour."
		}
	}

	// Global limit
	if !r.global.Allow(ip) {
		return false, "Too many requests. Try again in 1 minute."
	}

	return true, ""
}

// proxy server

func getIP(r *http.Request) string {
	// Cloudflare will send real  ip
	if ip := r.Header.Get("CF-Connecting-IP"); ip != "" {
		return ip
	}
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return ip
	}
	return r.RemoteAddr
}

func main() {
	backendURL := os.Getenv("BACKEND_URL")
	if backendURL == "" {
		backendURL = "http://backend:8000"
	}

	listenPort := os.Getenv("LISTEN_PORT")
	if listenPort == "" {
		listenPort = "8080"
	}

	target, err := url.Parse(backendURL)
	if err != nil {
		log.Fatal("Invalid backend URL:", err)
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	rules := NewRules()

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getIP(r)
		allowed, message := rules.Check(ip, r.URL.Path)

		if !allowed {
			log.Printf("[RATE LIMIT] Blocked %s → %s", ip, r.URL.Path)
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Retry-After", "60")
			w.WriteHeader(http.StatusTooManyRequests)
			fmt.Fprintf(w, `{"error": "rate_limit_exceeded", "message": "%s"}`, message)
			return
		}

		log.Printf("[PROXY] %s %s → %s", r.Method, r.URL.Path, ip)
		proxy.ServeHTTP(w, r)
	})

	log.Printf("Rate limiter starting on :%s → %s", listenPort, backendURL)
	log.Fatal(http.ListenAndServe(":"+listenPort, handler))
}
