package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

//client

var ctx = context.Background()

func newRedisClient() *redis.Client {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://redis:6379/0"
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Printf("[Redis] Invalid URL, using default: %v", err)
		opts = &redis.Options{Addr: "redis:6379", DB: 0}
	}

	return redis.NewClient(opts)
}

// Rate Limiter

type RateLimiter struct {
	client *redis.Client
	limit  int
	window time.Duration
	prefix string
}

func NewRateLimiter(client *redis.Client, prefix string, limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		client: client,
		limit:  limit,
		window: window,
		prefix: prefix,
	}
}

func (rl *RateLimiter) Allow(ip string) bool {
	key := fmt.Sprintf("ratelimit:%s:%s", rl.prefix, ip)
	now := time.Now().UnixMilli()
	windowStart := now - rl.window.Milliseconds()

	pipe := rl.client.Pipeline()
	pipe.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(windowStart, 10))
	pipe.ZCard(ctx, key)
	pipe.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: now})
	pipe.Expire(ctx, key, rl.window)

	cmds, err := pipe.Exec(ctx)
	if err != nil {
		log.Printf("[Redis] Pipeline error: %v — allowing request", err)
		return true
	}

	count := cmds[1].(*redis.IntCmd).Val()
	return count < int64(rl.limit)
}

// Rules

type Rules struct {
	global *RateLimiter
	auth   *RateLimiter
	export *RateLimiter
}

func NewRules(client *redis.Client) *Rules {
	return &Rules{
		global: NewRateLimiter(client, "global", 100, time.Minute),
		auth:   NewRateLimiter(client, "auth", 5, time.Minute),
		export: NewRateLimiter(client, "export", 10, time.Hour),
	}
}

func (r *Rules) Check(ip, path string) (bool, string) {
	if path == "/api/auth/login/" || path == "/api/auth/register/" {
		if !r.auth.Allow(ip) {
			return false, "Too many auth requests. Try again in 1 minute."
		}
	}

	if path == "/api/archive/export/" {
		if !r.export.Allow(ip) {
			return false, "Too many export requests. Try again in 1 hour."
		}
	}

	if !r.global.Allow(ip) {
		return false, "Too many requests. Try again in 1 minute."
	}

	return true, ""
}

//IP extraction

func getIP(r *http.Request) string {
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

	redisClient := newRedisClient()
	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Printf("[Redis] Cannot connect: %v — using fallback", err)
	} else {
		log.Println("[Redis] Connected successfully")
	}

	target, err := url.Parse(backendURL)
	if err != nil {
		log.Fatal("Invalid backend URL:", err)
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	rules := NewRules(redisClient)

	allowedOrigins := map[string]bool{
		"http://localhost:5173":              true,
		"https://logistrack.ahmetcengiz.dev": true,
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Vary", "Origin")
		}

		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Max-Age", "86400")
			w.WriteHeader(http.StatusNoContent)
			return
		}

		ip := getIP(r)
		allowed, message := rules.Check(ip, r.URL.Path)

		if !allowed {
			log.Printf("[RATE LIMIT] Blocked %s → %s", ip, r.URL.Path)
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Retry-After", "60")
			w.WriteHeader(http.StatusTooManyRequests)
			fmt.Fprintf(w, `{"error":"rate_limit_exceeded","message":"%s"}`, message)
			return
		}

		proxy.ServeHTTP(w, r)
	})

	log.Printf("[Server] Rate limiter starting on :%s → %s (Redis-backed)", listenPort, backendURL)
	log.Fatal(http.ListenAndServe(":"+listenPort, handler))
}
