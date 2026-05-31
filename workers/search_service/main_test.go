package main

import (
	"testing"
)

func TestTokenize_Plate(t *testing.T) {
	tokens := tokenize("34ABC123")
	if len(tokens) != 1 {
		t.Fatalf("expected 1 token, got %d", len(tokens))
	}
	if tokens[0].Type != TOKEN_PLATE {
		t.Errorf("expected PLATE, got %s", tokens[0].Type)
	}
}

func TestTokenize_Location(t *testing.T) {
	tokens := tokenize("Istanbul")
	if tokens[0].Type != TOKEN_LOCATION {
		t.Errorf("expected LOCATION, got %s", tokens[0].Type)
	}
}

func TestTokenize_Mixed(t *testing.T) {
	tokens := tokenize("34ABC123 Istanbul Metalog")
	if len(tokens) != 3 {
		t.Fatalf("expected 3 tokens, got %d", len(tokens))
	}
	if tokens[0].Type != TOKEN_PLATE {
		t.Errorf("token 0 should be PLATE")
	}
	if tokens[1].Type != TOKEN_LOCATION {
		t.Errorf("token 1 should be LOCATION")
	}
	if tokens[2].Type != TOKEN_WORD {
		t.Errorf("token 2 should be WORD")
	}
}

func TestLevenshtein_SameString(t *testing.T) {
	if levenshtein("istanbul", "istanbul") != 0 {
		t.Error("same string should have distance 0")
	}
}

func TestLevenshtein_OneEdit(t *testing.T) {
	if levenshtein("istanbul", "istanbull") != 1 {
		t.Error("one char diff should have distance 1")
	}
}

func TestFuzzyMatch_Exact(t *testing.T) {
	if !fuzzyMatch("istanbul", "istanbul trafo") {
		t.Error("exact match should return true")
	}
}

func TestFuzzyMatch_Typo(t *testing.T) {
	if !fuzzyMatch("istanbull", "istanbul") {
		t.Error("typo should still match")
	}
}

func TestBuildFilters_Plate(t *testing.T) {
	tokens := []Token{{Type: TOKEN_PLATE, Value: "34ABC123"}}
	filters := buildFilters(tokens)
	if filters["plate"] != "34ABC123" {
		t.Errorf("expected plate filter, got %v", filters)
	}
}
