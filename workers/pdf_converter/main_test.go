package main

import (
	"os"
	"testing"
)

func TestTokenizeLine(t *testing.T) {
	line := "2026-05-21 | 34ABC123 | Mehmet Yilmaz | Istanbul | Sarajevo | 1247 | 3200"
	tokens := TokenizeLine(line)

	if len(tokens) != 7 {
		t.Errorf("expected 7 tokens, got %d", len(tokens))
	}

	if tokens[0].Type != DATE {
		t.Errorf("expected DATE, got %s", tokens[0].Type)
	}
	if tokens[0].Literal != "2026-05-21" {
		t.Errorf("expected 2026-05-21, got %s", tokens[0].Literal)
	}
	if tokens[1].Type != PLATE {
		t.Errorf("expected PLATE, got %s", tokens[1].Type)
	}
	if tokens[6].Type != AMOUNT {
		t.Errorf("expected AMOUNT, got %s", tokens[6].Type)
	}
}

func TestParseTokens(t *testing.T) {
	line := "2026-05-21 | 34ABC123 | Mehmet Yilmaz | Istanbul | Sarajevo | 1247 | 3200"
	tokens := TokenizeLine(line)
	record := ParseTokens(tokens)

	if record.Date != "2026-05-21" {
		t.Errorf("expected 2026-05-21, got %s", record.Date)
	}
	if record.Plate != "34ABC123" {
		t.Errorf("expected 34ABC123, got %s", record.Plate)
	}
	if record.Driver != "Mehmet Yilmaz" {
		t.Errorf("expected Mehmet Yilmaz, got %s", record.Driver)
	}
	if record.KM != "1247" {
		t.Errorf("expected 1247, got %s", record.KM)
	}
}

func TestParseLines(t *testing.T) {
	lines := []string{
		"2026-05-21 | 34ABC123 | Mehmet | Istanbul | Sarajevo | 1247 | 3200",
		"2026-05-20 | 06DEF456 | Ali | Ankara | Zagreb | 1890 | 4100",
		"",
	}

	records := ParseLines(lines)

	if len(records) != 2 {
		t.Errorf("expected 2 records, got %d", len(records))
	}
}

func TestGeneratePDF(t *testing.T) {
	records := []TripRecord{
		{
			Date:   "2026-05-21",
			Plate:  "34ABC123",
			Driver: "Mehmet Yilmaz",
			Origin: "Istanbul",
			Dest:   "Sarajevo",
			KM:     "1247",
			Amount: "3200",
		},
	}

	filename := "test_output.pdf"
	defer os.Remove(filename)

	err := GeneratePDF(records, filename)
	if err != nil {
		t.Fatalf("PDF generation error: %v", err)
	}

	if _, err := os.Stat(filename); os.IsNotExist(err) {
		t.Error("PDF file was not created")
	}
}
