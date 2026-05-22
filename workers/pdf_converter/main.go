package main

import "fmt"

func main() {
	// lines like from excel
	line := "2026-05-21 | 34ABC123 | Mehmet Yilmaz | Istanbul | Sarajevo | 1247 | 3200"

	fmt.Println("Tokenizing:", line)
	fmt.Println("---")

	tokens := TokenizeLine(line)

	for _, tok := range tokens {
		fmt.Printf("Type: %-10s Literal: %s\n", tok.Type, tok.Literal)
	}
}
