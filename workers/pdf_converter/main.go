package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/xuri/excelize/v2"
)

func main() {
	// check excel first
	excelPath := os.Getenv("EXCEL_PATH")
	if excelPath == "" {
		testMode()
		return
	}

	if err := convertExcelToPDF(excelPath); err != nil {
		log.Fatal("Conversion error:", err)
	}
}

func testMode() {
	fmt.Println("=== LogisTrack PDF Converter - Test Mode ===")

	lines := []string{
		"2026-05-21 | 34ABC123 | Mehmet Yilmaz | Istanbul | Sarajevo | 1247 | 3200",
		"2026-05-20 | 06DEF456 | Ali Kaya | Ankara | Zagreb | 1890 | 4100",
		"2026-05-19 | 35GHI789 | Veli Demir | Izmir | Vienna | 2100 | 5200",
	}

	records := ParseLines(lines)

	fmt.Printf("Parsed %d records\n", len(records))

	for _, r := range records {
		fmt.Printf("Date: %s | Plate: %s | Driver: %s\n", r.Date, r.Plate, r.Driver)
	}

	// PDF oluştur
	if err := GeneratePDF(records, "test_output.pdf"); err != nil {
		log.Fatal("PDF error:", err)
	}

	fmt.Println("PDF created: test_output.pdf")
}

func convertExcelToPDF(excelPath string) error {
	f, err := excelize.OpenFile(excelPath)
	if err != nil {
		return fmt.Errorf("excel open error: %w", err)
	}

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return fmt.Errorf("no sheets found")
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil {
		return fmt.Errorf("get rows error: %w", err)
	}

	var lines []string
	for _, row := range rows[1:] {
		line := strings.Join(row, " | ")
		lines = append(lines, line)
	}

	records := ParseLines(lines)

	pdfPath := strings.Replace(excelPath, ".xlsx", ".pdf", 1)
	return GeneratePDF(records, pdfPath)
}
