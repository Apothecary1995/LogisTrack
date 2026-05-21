package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRateLimiter_Allow(t *testing.T) {
	rl := NewRateLimiter(3, time.Minute)

	for i := 0; i < 3; i++ {
		if !rl.Allow("192.168.1.1") {
			t.Errorf("Request %d should be allowed", i+1)
		}
	}

	if rl.Allow("192.168.1.1") {
		t.Error("4th request should be blocked")
	}
}

func TestRateLimiter_DifferentIPs(t *testing.T) {
	rl := NewRateLimiter(2, time.Minute)

	rl.Allow("192.168.1.1")
	rl.Allow("192.168.1.1")

	if rl.Allow("192.168.1.1") {
		t.Error("IP1 should be blocked")
	}

	if !rl.Allow("192.168.1.2") {
		t.Error("IP2 should be allowed")
	}
}

func TestRules_AuthLimit(t *testing.T) {
	rules := NewRules()

	for i := 0; i < 5; i++ {
		allowed, _ := rules.Check("10.0.0.1", "/api/auth/login/")
		if !allowed {
			t.Errorf("Auth request %d should be allowed", i+1)
		}
	}

	allowed, msg := rules.Check("10.0.0.1", "/api/auth/login/")
	if allowed {
		t.Error("6th auth request should be blocked")
	}
	if msg == "" {
		t.Error("Error message should not be empty")
	}
}

func TestRules_GlobalLimit(t *testing.T) {
	rules := &Rules{
		global: NewRateLimiter(2, time.Minute),
		auth:   NewRateLimiter(5, time.Minute),
		export: NewRateLimiter(10, time.Hour),
	}

	rules.Check("10.0.0.2", "/api/trips/")
	rules.Check("10.0.0.2", "/api/trips/")

	allowed, _ := rules.Check("10.0.0.2", "/api/trips/")
	if allowed {
		t.Error("Should be globally rate limited")
	}
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
