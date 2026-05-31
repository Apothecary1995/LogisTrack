package main

import (
	"fmt"

	"github.com/jung-kurt/gofpdf"
)

func GeneratePDF(records []TripRecord, filename string) error {
	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.AddPage()

	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(0, 10, "LogisTrack Fleet Archive Report")
	pdf.Ln(12)

	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 6, fmt.Sprintf("Generated: %s", getCurrentDate()))
	pdf.Ln(10)

	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(31, 78, 121)
	pdf.SetTextColor(255, 255, 255)

	headers := []string{"Date", "Plate", "Driver", "Origin", "Destination", "KM", "Amount"}
	widths := []float64{28, 25, 40, 35, 35, 20, 25}

	for i, header := range headers {
		pdf.CellFormat(widths[i], 8, header, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(0, 0, 0)

	for i, record := range records {

		if i%2 == 0 {
			pdf.SetFillColor(240, 240, 240)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}

		pdf.CellFormat(widths[0], 7, record.Date, "1", 0, "C", true, 0, "")
		pdf.CellFormat(widths[1], 7, record.Plate, "1", 0, "C", true, 0, "")
		pdf.CellFormat(widths[2], 7, record.Driver, "1", 0, "L", true, 0, "")
		pdf.CellFormat(widths[3], 7, record.Origin, "1", 0, "L", true, 0, "")
		pdf.CellFormat(widths[4], 7, record.Dest, "1", 0, "L", true, 0, "")
		pdf.CellFormat(widths[5], 7, record.KM+" km", "1", 0, "R", true, 0, "")
		pdf.CellFormat(widths[6], 7, record.Amount+"€", "1", 0, "R", true, 0, "")
		pdf.Ln(-1)
	}

	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(31, 78, 121)
	pdf.SetTextColor(255, 255, 255)
	pdf.CellFormat(183, 8, fmt.Sprintf("Total Records: %d", len(records)), "1", 0, "R", true, 0, "")
	pdf.Ln(-1)

	return pdf.OutputFileAndClose(filename)
}

func getCurrentDate() string {
	return "2026"
}
