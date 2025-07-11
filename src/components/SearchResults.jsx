import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import ListingList from './ListingList';
import './SearchResults.css';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function SearchResults() {
  const query = useQuery();
  const searchTerm = (query.get('q') || '').trim();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortOption, setSortOption] = useState('latest'); // 'priceAsc', 'priceDesc', 'rating'

  useEffect(() => {
    if (!searchTerm) {
      setResults([]);
      setError('');
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError('');

      try {
        console.log('🔍 Searching for:', searchTerm, ' | Sort:', sortOption);

        const { data } = await api.get('/listings', {
          params: {
            search: searchTerm,
            sort: sortOption,
          }
        });

        const listings = Array.isArray(data)
          ? data
          : data.listings || [];

        setResults(listings);
      } catch (err) {
        console.error('❌ Search error:', err);

        if (err.response) {
          setError(`Server error: ${err.response.status} – ${err.response.data?.message || 'Unknown'}`);
        } else if (err.request) {
          setError('Network error – could not reach server');
        } else {
          setError('Unexpected error fetching results');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [searchTerm, sortOption]); // fetch again when sortOption changes

  const handleSortChange = (e) => {
    setSortOption(e.target.value);
  };

  return (
    <div className="search-results">
      <h2>Search results for “{searchTerm}”</h2>

      <div className="sort-options">
        <label htmlFor="sort-select">Sort by: </label>
        <select id="sort-select" value={sortOption} onChange={handleSortChange}>
          <option value="latest">Latest</option>
          <option value="priceAsc">Price: Low to High</option>
          <option value="priceDesc">Price: High to Low</option>
          <option value="rating">Rating</option>
        </select>
      </div>

      {loading && <p className="loading">Loading...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && searchTerm && (
        results.length > 0 ? (
          <>
            <p className="results-count">
              Found {results.length} product{results.length > 1 ? 's' : ''}
            </p>
            <ListingList listings={results} />
          </>
        ) : (
          <p className="no-results">No products found for “{searchTerm}”</p>
        )
      )}
    </div>
  );
}




