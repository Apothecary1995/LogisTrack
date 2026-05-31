package main

import (
	"regexp"
	"strings"
	"unicode"
)

type TokenType string

const (
	TOKEN_PLATE    TokenType = "PLATE"
	TOKEN_LOCATION TokenType = "LOCATION"
	TOKEN_CUSTOMER TokenType = "CUSTOMER"
	TOKEN_KM       TokenType = "KM"
	TOKEN_DATE     TokenType = "DATE"
	TOKEN_WORD     TokenType = "WORD"
)

type Token struct {
	Type  TokenType
	Value string
}

var (
	plateRegex = regexp.MustCompile(`(?i)^[0-9]{2}[A-Z]{1,3}[0-9]{1,4}$`)
	kmRegex    = regexp.MustCompile(`(?i)^[0-9]+(\.[0-9]+)?(km|KM)?$`)
	dateRegex  = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
)

var locationKeywords = map[string]bool{
	"istanbul": true, "ankara": true, "izmir": true, "bursa": true,
	"sarajevo": true, "zagreb": true, "belgrade": true, "sofia": true,
	"skopje": true, "tirana": true, "pristina": true, "podgorica": true,
}

func tokenize(query string) []Token {
	words := strings.FieldsFunc(query, func(r rune) bool {
		return unicode.IsSpace(r) || r == ','
	})

	tokens := make([]Token, 0, len(words))
	for _, word := range words {
		token := classifyToken(word)
		tokens = append(tokens, token)
	}
	return tokens
}

func classifyToken(word string) Token {
	upper := strings.ToUpper(word)
	lower := strings.ToLower(word)

	if plateRegex.MatchString(upper) {
		return Token{Type: TOKEN_PLATE, Value: upper}
	}
	if dateRegex.MatchString(word) {
		return Token{Type: TOKEN_DATE, Value: word}
	}
	if kmRegex.MatchString(word) {
		val := strings.ToLower(word)
		val = strings.TrimSuffix(val, "km")
		return Token{Type: TOKEN_KM, Value: val}
	}
	if locationKeywords[lower] {
		return Token{Type: TOKEN_LOCATION, Value: word}
	}
	return Token{Type: TOKEN_WORD, Value: word}
}
