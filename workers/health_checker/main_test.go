package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

func TestCheckService_Healthy(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}))
	defer server.Close()

	if !checkService(server.URL) {
		t.Error("expected healthy service to return true")
	}
}

func TestCheckService_Down(t *testing.T) {
	if checkService("http://localhost:19999/nonexistent") {
		t.Error("expected down service to return false")
	}
}

func TestCheckService_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	if checkService(server.URL) {
		t.Error("expected 500 response to return false")
	}
}

func TestGetEnv_Default(t *testing.T) {
	os.Unsetenv("TEST_VAR")
	val := getEnv("TEST_VAR", "default_value")
	if val != "default_value" {
		t.Errorf("expected default_value, got %s", val)
	}
}

func TestGetEnv_Custom(t *testing.T) {
	os.Setenv("TEST_VAR", "custom_value")
	defer os.Unsetenv("TEST_VAR")
	val := getEnv("TEST_VAR", "default_value")
	if val != "custom_value" {
		t.Errorf("expected custom_value, got %s", val)
	}
}

func TestNewStateMap(t *testing.T) {
	states := newStateMap()
	if len(states) != len(services) {
		t.Errorf("expected %d states, got %d", len(services), len(states))
	}
	for _, s := range services {
		state, ok := states[s.Name]
		if !ok {
			t.Errorf("missing state for %s", s.Name)
		}
		if !state.Healthy {
			t.Errorf("initial state should be healthy for %s", s.Name)
		}
	}
}

func TestServiceState_Transition(t *testing.T) {
	state := &ServiceState{
		Name:    "Test Service",
		Healthy: true,
		Since:   time.Now(),
	}

	state.Healthy = false
	state.Since = time.Now()

	if state.Healthy {
		t.Error("state should be unhealthy")
	}

	state.Healthy = true
	state.Since = time.Now()

	if !state.Healthy {
		t.Error("state should be healthy after recovery")
	}
}
