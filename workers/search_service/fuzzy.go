package main

import "strings"

// fuzzy matchinf for search engine
func levenshtein(a, b string) int {
	a = strings.ToLower(a)
	b = strings.ToLower(b)

	la, lb := len(a), len(b)
	dp := make([][]int, la+1)
	for i := range dp {
		dp[i] = make([]int, lb+1)
	}

	for i := 0; i <= la; i++ {
		dp[i][0] = i
	}
	for j := 0; j <= lb; j++ {
		dp[0][j] = j
	}

	for i := 1; i <= la; i++ {
		for j := 1; j <= lb; j++ {
			cost := 1
			if a[i-1] == b[j-1] {
				cost = 0
			}
			dp[i][j] = min3(
				dp[i-1][j]+1,
				dp[i][j-1]+1,
				dp[i-1][j-1]+cost,
			)
		}
	}
	return dp[la][lb]
}

func min3(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}

// if strings are similar enough true
func fuzzyMatch(query, target string) bool {
	query = strings.ToLower(query)
	target = strings.ToLower(target)

	// exact contains
	if strings.Contains(target, query) {
		return true
	}

	// too short for fuzzy
	if len(query) < 3 {
		return false
	}

	//  threshold
	threshold := 2
	if len(query) > 6 {
		threshold = 3
	}

	return levenshtein(query, target) <= threshold
}
