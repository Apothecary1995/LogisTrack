package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
)

type SearchRequest struct {
	Query     string `json:"query"`
	CompanyID int    `json:"company_id"`
}

type SearchResponse struct {
	Query      string            `json:"query"`
	Tokens     []Token           `json:"tokens"`
	Filters    map[string]string `json:"filters"`
	BackendURL string            `json:"backend_url"`
}

func getBackendURL() string {
	u := os.Getenv("BACKEND_URL")
	if u == "" {
		u = "http://backend:8000"
	}
	return u
}

func buildFilters(tokens []Token) map[string]string {
	filters := make(map[string]string)

	words := []string{}
	for _, t := range tokens {
		switch t.Type {
		case TOKEN_PLATE:
			filters["plate"] = t.Value
		case TOKEN_LOCATION:
			if _, ok := filters["location"]; !ok {
				filters["location"] = t.Value
			} else {
				filters["location2"] = t.Value
			}
		case TOKEN_KM:
			filters["km"] = t.Value
		case TOKEN_DATE:
			filters["date"] = t.Value
		case TOKEN_CUSTOMER, TOKEN_WORD:
			words = append(words, t.Value)
		}
	}

	if len(words) > 0 {
		filters["q"] = strings.Join(words, " ")
	}

	return filters
}

func searchHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, `{"error":"query required"}`, http.StatusBadRequest)
		return
	}

	authHeader := r.Header.Get("Authorization")

	tokens := tokenize(query)
	filters := buildFilters(tokens)

	backendURL := getBackendURL()
	params := url.Values{}
	for k, v := range filters {
		params.Set(k, v)
	}

	targetURL := fmt.Sprintf("%s/api/trips/search/?%s", backendURL, params.Encode())

	// Forward to Django
	req, err := http.NewRequest(http.MethodGet, targetURL, nil)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[Search] Backend error: %v", err)
		http.Error(w, "backend unavailable", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(resp.StatusCode)

	var result interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	json.NewEncoder(w).Encode(result)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok","service":"search"}`))
}

func main() {
	port := os.Getenv("SEARCH_PORT")
	if port == "" {
		port = "8070"
	}

	http.HandleFunc("/search", searchHandler)
	http.HandleFunc("/health", healthHandler)

	log.Printf("[Search] Service starting on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
