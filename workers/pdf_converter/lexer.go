package main

// Token types
type TokenType string

const (
	DATE    TokenType = "DATE"
	PLATE   TokenType = "PLATE"
	DRIVER  TokenType = "DRIVER"
	ORIGIN  TokenType = "ORIGIN"
	DEST    TokenType = "DEST"
	KM      TokenType = "KM"
	AMOUNT  TokenType = "AMOUNT"
	SEP     TokenType = "SEPARATOR"
	EOF     TokenType = "EOF"
	UNKNOWN TokenType = "UNKNOWN"
)

type Token struct {
	Type    TokenType
	Literal string // real valouo of token
}

type Lexer struct {
	input string // text to read
	pos   int    // position
	col   int    //which column we are
}

// create new lexer
func NewLexer(input string) *Lexer {
	return &Lexer{
		input: input,
		pos:   0,
		col:   0,
	}
}

// skip spaces
func (l *Lexer) skipWhitespace() {
	for l.pos < len(l.input) && l.input[l.pos] == ' ' {
		l.pos++
	}
}

// take next token
func (l *Lexer) NextToken() Token {
	l.skipWhitespace()

	// see if file is ended
	if l.pos >= len(l.input) {
		return Token{Type: EOF, Literal: ""}
	}

	// if there is a seperator
	if l.input[l.pos] == '|' {
		l.pos++
		l.col++ // Sütun ilerle
		return Token{Type: SEP, Literal: "|"}
	}

	// read values
	start := l.pos
	for l.pos < len(l.input) && l.input[l.pos] != '|' && l.input[l.pos] != '\n' {
		l.pos++
	}

	literal := l.input[start:l.pos]
	// clen up the beggining and end
	literal = trimSpace(literal)

	// token type according to the value
	tokenType := l.getTokenType()

	return Token{Type: tokenType, Literal: literal}
}

// token type according to the column
func (l *Lexer) getTokenType() TokenType {
	switch l.col {
	case 0:
		return DATE
	case 1:
		return PLATE
	case 2:
		return DRIVER
	case 3:
		return ORIGIN
	case 4:
		return DEST
	case 5:
		return KM
	case 6:
		return AMOUNT
	default:
		return UNKNOWN
	}
}

// tokenize every line
func TokenizeLine(line string) []Token {
	lexer := NewLexer(line)
	var tokens []Token

	for {
		tok := lexer.NextToken()
		if tok.Type == EOF {
			break
		}
		if tok.Type != SEP {
			tokens = append(tokens, tok)
		}
	}

	return tokens
}

// trimming spaces
func trimSpace(s string) string {
	start := 0
	end := len(s)

	for start < end && s[start] == ' ' {
		start++
	}
	for end > start && s[end-1] == ' ' {
		end--
	}

	return s[start:end]
}
