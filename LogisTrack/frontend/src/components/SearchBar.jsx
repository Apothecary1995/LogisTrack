import { useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const SEARCH_URL = "https://search.ahmetcengiz.dev/search";

export function SearchBar({ onResults, onClear }) {
  const { authRequest } = useAuth();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      onClear();
      return;
    }

    setIsSearching(true);
    try {
      const token = JSON.parse(localStorage.getItem("logitarget_auth_state"))?.accessToken;
      const response = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      onResults(data);
    } catch (err) {
      console.error("[Search] Error:", err);
    } finally {
      setIsSearching(false);
    }
  }, [query, onResults, onClear]);

  const handleClear = () => {
    setQuery("");
    onClear();
  };

  return (
    <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search: plate, city, (fuzzy search)"
        style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }}
      />
      <button type="submit" className="primary-button" disabled={isSearching}>
        {isSearching ? "Searching 🔄" : "Search"}
      </button>
      {query && (
        <button type="button" className="ghost-button" onClick={handleClear}>
          Clear
        </button>
      )}
    </form>
  );
}