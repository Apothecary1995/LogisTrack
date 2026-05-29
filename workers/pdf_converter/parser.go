package main

type TripRecord struct {
	Date   string
	Plate  string
	Driver string
	Origin string
	Dest   string
	KM     string
	Amount string
}

func ParseTokens(tokens []Token) TripRecord {
	record := TripRecord{}

	for _, tok := range tokens {
		switch tok.Type {
		case DATE:
			record.Date = tok.Literal
		case PLATE:
			record.Plate = tok.Literal
		case DRIVER:
			record.Driver = tok.Literal
		case ORIGIN:
			record.Origin = tok.Literal
		case DEST:
			record.Dest = tok.Literal
		case KM:
			record.KM = tok.Literal
		case AMOUNT:
			record.Amount = tok.Literal
		}
	}

	return record
}

func ParseLines(lines []string) []TripRecord {
	var records []TripRecord

	for _, line := range lines {
		if line == "" {
			continue
		}
		tokens := TokenizeLine(line)
		if len(tokens) > 0 {
			record := ParseTokens(tokens)
			records = append(records, record)
		}
	}

	return records
}
