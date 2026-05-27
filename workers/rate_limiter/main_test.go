package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

func newTestRedis() *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   15, // test DB
	})
}

func TestGetIP_CloudflareHeader(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("CF-Connecting-IP", "1.2.3.4")
	ip := getIP(req)
	if ip != "1.2.3.4" {
		t.Errorf("expected 1.2.3.4, got %s", ip)
	}
}

func TestGetIP_XForwardedFor(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-For", "5.6.7.8")
	ip := getIP(req)
	if ip != "5.6.7.8" {
		t.Errorf("expected 5.6.7.8, got %s", ip)
	}
}

func TestGetIP_RemoteAddr(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "9.9.9.9:1234"
	ip := getIP(req)
	if ip != "9.9.9.9:1234" {
		t.Errorf("expected RemoteAddr, got %s", ip)
	}
}

func TestNewRedisClient_Default(t *testing.T) {
	os.Unsetenv("REDIS_URL")
	client := newRedisClient()
	if client == nil {
		t.Error("redis client should not be nil")
	}
}

func TestNewRedisClient_CustomURL(t *testing.T) {
	os.Setenv("REDIS_URL", "redis://localhost:6379/0")
	defer os.Unsetenv("REDIS_URL")
	client := newRedisClient()
	if client == nil {
		t.Error("redis client should not be nil")
	}
}

func TestRateLimiter_WithRedis(t *testing.T) {
	client := newTestRedis()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skipf("Redis not available, skipping: %v", err)
	}

	rl := NewRateLimiter(client, "test", 3, time.Minute)
	key := "ratelimit:test:10.0.0.1"
	defer client.Del(ctx, key)

	for i := 0; i < 3; i++ {
		if !rl.Allow("10.0.0.1") {
			t.Errorf("request %d should be allowed", i+1)
		}
	}

	if rl.Allow("10.0.0.1") {
		t.Error("4th request should be blocked")
	}
}

func TestRateLimiter_DifferentIPs(t *testing.T) {
	client := newTestRedis()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skipf("Redis not available, skipping: %v", err)
	}

	rl := NewRateLimiter(client, "test2", 2, time.Minute)
	key1 := "ratelimit:test2:10.0.0.1"
	key2 := "ratelimit:test2:10.0.0.2"
	defer client.Del(ctx, key1, key2)

	rl.Allow("10.0.0.1")
	rl.Allow("10.0.0.1")

	if rl.Allow("10.0.0.1") {
		t.Error("IP1 should be blocked")
	}
	if !rl.Allow("10.0.0.2") {
		t.Error("IP2 should be allowed")
	}
}

func TestRules_AuthLimit(t *testing.T) {
	client := newTestRedis()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skipf("Redis not available, skipping: %v", err)
	}

	rules := &Rules{
		global: NewRateLimiter(client, "global_test", 100, time.Minute),
		auth:   NewRateLimiter(client, "auth_test", 5, time.Minute),
		export: NewRateLimiter(client, "export_test", 10, time.Hour),
	}

	authKey := "ratelimit:auth_test:10.0.0.3"
	defer client.Del(ctx, authKey)

	for i := 0; i < 5; i++ {
		allowed, _ := rules.Check("10.0.0.3", "/api/auth/login/")
		if !allowed {
			t.Errorf("request %d should be allowed", i+1)
		}
	}

	allowed, msg := rules.Check("10.0.0.3", "/api/auth/login/")
	if allowed {
		t.Error("6th request should be blocked")
	}
	if msg == "" {
		t.Error("message should not be empty")
	}
}
