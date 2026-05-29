package main

import (
	"os"
	"testing"
)

func TestGetURL_DefaultURL(t *testing.T) {
	os.Unsetenv("RABBITMQ_URL")

	url := getURL()

	expected := "amqp://guest:guest@localhost:5672/"
	if url != expected {
		t.Errorf("expected %s, arrived %s", expected, url)
	}
}

func TestGetURL_CustomURL(t *testing.T) {
	os.Setenv("RABBITMQ_URL", "amqp://user:pass@rabbitmq:5672/")
	defer os.Unsetenv("RABBITMQ_URL")

	url := getURL()

	expected := "amqp://user:pass@rabbitmq:5672/"
	if url != expected {
		t.Errorf("expected %s, arrived %s", expected, url)
	}
}

func TestConnectRabbitMQ_InvalidURL(t *testing.T) {
	_, err := connectRabbitMQ("amqp://invalid:5672/")

	if err == nil {
		t.Error("invalid url error ")
	}
}

func TestGenerateExcel_CreatesFile(t *testing.T) {
	msg := ExportMessage{
		Event:     "export.request",
		CompanyID: 99,
	}

	testDir := "./test_exports"
	defer os.RemoveAll(testDir)

	os.Setenv("EXPORT_DIR", testDir)
	defer os.Unsetenv("EXPORT_DIR")

	filename, err := generateExcel(msg)

	if err != nil {
		t.Fatalf("Excel creation error: %v", err)
	}

	if _, err := os.Stat(filename); os.IsNotExist(err) {
		t.Errorf("file can not created: %s", filename)
	}
}
func TestGeneratePDF_CreatesFile(t *testing.T) {
	msg := ExportMessage{
		Event:     "export.request",
		Format:    "pdf",
		CompanyID: 99,
		Trips:     []map[string]interface{}{},
	}

	testDir := "./test_exports"
	defer os.RemoveAll(testDir)
	os.Setenv("EXPORT_DIR", testDir)
	defer os.Unsetenv("EXPORT_DIR")

	filename, err := generatePDF(msg)
	if err != nil {
		t.Fatalf("PDF generation error: %v", err)
	}
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		t.Errorf("PDF file not created: %s", filename)
	}
}

func TestSendExcelByEmail_NoSMTP(t *testing.T) {
	os.Unsetenv("SMTP_HOST")
	os.Unsetenv("SMTP_USER")
	os.Unsetenv("SMTP_PASSWORD")

	msg := ExportMessage{CompanyID: 1, RequestedBy: "test@test.com"}

	tmpFile, _ := os.CreateTemp("", "test*.xlsx")
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	err := sendExcelByEmail(tmpFile.Name(), msg)
	if err != nil {
		t.Errorf("expected nil when SMTP not configured: %v", err)
	}
}

func TestSendPDFByEmail_NoSMTP(t *testing.T) {
	os.Unsetenv("SMTP_HOST")
	os.Unsetenv("SMTP_USER")
	os.Unsetenv("SMTP_PASSWORD")

	msg := ExportMessage{CompanyID: 1, RequestedBy: "test@test.com"}

	tmpFile, _ := os.CreateTemp("", "test*.pdf")
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	err := sendPDFByEmail(tmpFile.Name(), msg)
	if err != nil {
		t.Errorf("expected nil when SMTP not configured: %v", err)
	}
}

func TestGenerateExcel_WithTrips(t *testing.T) {
	msg := ExportMessage{
		CompanyID: 1,
		Trips: []map[string]interface{}{
			{
				"created_at": "2026-05-26", "plate_number": "34ABC123",
				"driver": "Mehmet", "origin": "Istanbul",
				"destination": "Sarajevo", "cci_km": 1247.5,
				"extra_km": 45.0, "total_km": 1292.5,
				"customer": "Metalog", "price": 3200.0, "total_amount": 3200.0,
			},
		},
	}

	testDir := "./test_exports"
	defer os.RemoveAll(testDir)
	os.Setenv("EXPORT_DIR", testDir)
	defer os.Unsetenv("EXPORT_DIR")

	filename, err := generateExcel(msg)
	if err != nil {
		t.Fatalf("Excel error: %v", err)
	}
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		t.Errorf("file not created: %s", filename)
	}
}
