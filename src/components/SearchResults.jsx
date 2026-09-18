import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../api";
import ListingList from "./ListingList";
import "./SearchResults.css";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function SearchResults() {
  const query = useQuery();
  const searchTerm = (query.get("q") || "").trim();

  const [results, setResults]         = useState([]);
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(true);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [sortOption, setSortOption]   = useState("latest");
  const [minPrice, setMinPrice]       = useState("");
  const [maxPrice, setMaxPrice]       = useState("");
  const [sizeFilter, setSizeFilter]   = useState("");
  const [brandFilter, setBrandFilter] = useState("");

  // Reset everything when the search term changes
  useEffect(() => {
    setResults([]);
    setPage(1);
    setHasMore(true);
    setError("");
  }, [searchTerm]);

  // Reset page/results when filters or sort change
  useEffect(() => {
    setResults([]);
    setPage(1);
    setHasMore(true);
  }, [sortOption, minPrice, maxPrice, sizeFilter, brandFilter]);

  // Fetch results
  useEffect(() => {
    if (!searchTerm) {
      setResults([]);
      setError("");
      return;
    }

    let cancelled = false;
    const fetchResults = async () => {
      setLoading(true);
      setError("");

      try {
        const params = { q: searchTerm, sort: sortOption, page, limit: 10 };
        if (minPrice)    params.minPrice = minPrice;
        if (maxPrice)    params.maxPrice = maxPrice;
        if (sizeFilter)  params.size     = sizeFilter;
        if (brandFilter) params.brand    = brandFilter;

        const { data } = await api.get("/products/search", { params });
        if (cancelled) return;

        const listings = Array.isArray(data) ? data : (data.listings || []);

        if (listings.length === 0) {
          setHasMore(false);
          if (page === 1) setResults([]);
        } else {
          setResults(prev => {
            if (page === 1) return listings;
            const ids = new Set(prev.map(i => i._id));
            return [...prev, ...listings.filter(i => !ids.has(i._id))];
          });
          if (listings.length < 10) setHasMore(false);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Search error:", err);
        if (err.response) {
          setError(`Server error: ${err.response.status} - ${err.response.data?.message || "Unknown"}`);
        } else if (err.request) {
          setError("Network error - could not reach server");
        } else {
          setError("Unexpected error fetching results");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchResults();
    return () => { cancelled = true; };
  }, [searchTerm, sortOption, minPrice, maxPrice, sizeFilter, brandFilter, page]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop + 200 >=
        document.documentElement.offsetHeight
      ) {
        if (!loading && hasMore) setPage(prev => prev + 1);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, hasMore]);

  const clearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setSizeFilter("");
    setBrandFilter("");
  };

  const hasActiveFilters = minPrice || maxPrice || sizeFilter || brandFilter;

  return (
    <div className="search-results">
      <h2>Search results for "{searchTerm}"</h2>

      <div className="controls-bar" style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem", padding: "1rem", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>

        <div className="sort-options">
          <label htmlFor="sort-select" style={{ marginRight: "0.5rem", fontWeight: "500" }}>Sort by:</label>
          <select id="sort-select" value={sortOption} onChange={e => setSortOption(e.target.value)} style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ddd" }}>
            <option value="latest">Latest</option>
            <option value="priceAsc">Price: Low to High</option>
            <option value="priceDesc">Price: High to Low</option>
            <option value="rating">Rating</option>
          </select>
        </div>

        <div className="filter-options" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
          <span style={{ fontWeight: "500" }}>Filters:</span>
          <input type="number" placeholder="Min Price (Rs)" value={minPrice} onChange={e => setMinPrice(e.target.value)} style={{ padding: "0.5rem", width: "115px", borderRadius: "4px", border: "1px solid #ddd" }} />
          <input type="number" placeholder="Max Price (Rs)" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{ padding: "0.5rem", width: "115px", borderRadius: "4px", border: "1px solid #ddd" }} />

          <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ddd" }}>
            <option value="">Any Size</option>
            {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(sz => <option key={sz} value={sz}>UK {sz}</option>)}
          </select>

          <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ddd" }}>
            <option value="">All Brands</option>
            <option value="Nike">Nike</option>
            <option value="Adidas">Adidas</option>
            <option value="Puma">Puma</option>
            <option value="New Balance">New Balance</option>
          </select>

          {hasActiveFilters && (
            <button onClick={clearFilters} style={{ padding: "0.5rem 1rem", borderRadius: "4px", border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontWeight: "500" }}>
              X Clear Filters
            </button>
          )}
        </div>
      </div>

      {loading && results.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <p className="loading">Searching for "{searchTerm}"...</p>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {!error && searchTerm && (
        results.length > 0 ? (
          <>
            <p className="results-count">
              Found {results.length} product{results.length > 1 ? "s" : ""}
              {hasActiveFilters && " (filtered)"}
            </p>
            <ListingList listings={results} />
            {loading && <div className="loading-more">Loading more...</div>}
            {!hasMore && <div className="no-more">End of results</div>}
          </>
        ) : (
          !loading && (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <p className="no-results">No products found for "{searchTerm}"</p>
              <p style={{ color: "#888", marginTop: "0.5rem" }}>Try a different keyword or clear the filters</p>
            </div>
          )
        )
      )}
    </div>
  );
}
