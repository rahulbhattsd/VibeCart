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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortOption, setSortOption] = useState('latest'); // 'priceAsc', 'priceDesc', 'rating'

  // Filter states
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  useEffect(() => {
    if (!searchTerm) {
      setResults([]);
      setError('');
      return;
    }
    if (page === 1) setResults([]);

    const fetchResults = async () => {
      setLoading(true);
      setError('');

      try {
        console.log('🔍 Searching for:', searchTerm, ' | Sort:', sortOption);

        const params = {
          q: searchTerm,
          sort: sortOption,
          page: page,
          limit: 10,
        };

        if (minPrice) params.minPrice = minPrice;
        if (maxPrice) params.maxPrice = maxPrice;
        if (sizeFilter) params.size = sizeFilter;
        if (brandFilter) params.brand = brandFilter;

        const { data } = await api.get('/products/search', { params });

        const listings = Array.isArray(data) ? data : data.listings || [];
        if (listings.length === 0) setHasMore(false);
        else {
          if (page === 1) setResults(listings);
          else setResults(prev => {
            const existingIds = new Set(prev.map(i => i._id));
            return [...prev, ...listings.filter(i => !existingIds.has(i._id))];
          });
        }
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
  }, [searchTerm, sortOption, minPrice, maxPrice, sizeFilter, brandFilter, page]); // fetch again when sortOption or filters change

  const handleSortChange = (e) => {
    setSortOption(e.target.value);
    setPage(1);
    setHasMore(true);
  };

  const handleScroll = () => {
    if (window.innerHeight + document.documentElement.scrollTop + 1 >= document.documentElement.offsetHeight) {
      if (!loading && hasMore) {
        setPage(prev => prev + 1);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore]);

  return (
    <div className="search-results">
      <h2>Search results for “{searchTerm}”</h2>

      <div className="controls-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', padding: '1rem', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div className="sort-options">
          <label htmlFor="sort-select" style={{ marginRight: '0.5rem', fontWeight: '500' }}>Sort by: </label>
          <select id="sort-select" value={sortOption} onChange={handleSortChange} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}>
            <option value="latest">Latest</option>
            <option value="priceAsc">Price: Low to High</option>
            <option value="priceDesc">Price: High to Low</option>
            <option value="rating">Rating</option>
          </select>
        </div>

        <div className="filter-options" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontWeight: '500' }}>Filters:</span>

          <input
            type="number"
            placeholder="Min Price"
            value={minPrice}
            onChange={e => { setMinPrice(e.target.value); setPage(1); setHasMore(true); }}
            style={{ padding: '0.5rem', width: '100px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <input
            type="number"
            placeholder="Max Price"
            value={maxPrice}
            onChange={e => { setMaxPrice(e.target.value); setPage(1); setHasMore(true); }}
            style={{ padding: '0.5rem', width: '100px', borderRadius: '4px', border: '1px solid #ddd' }}
          />

          <select value={sizeFilter} onChange={e => { setSizeFilter(e.target.value); setPage(1); setHasMore(true); }} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}>
            <option value="">Any Size</option>
            {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(sz => (
              <option key={sz} value={sz}>UK {sz}</option>
            ))}
          </select>

          <select value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setPage(1); setHasMore(true); }} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}>
            <option value="">All Brands</option>
            <option value="Nike">Nike</option>
            <option value="Adidas">Adidas</option>
            <option value="Puma">Puma</option>
            <option value="New Balance">New Balance</option>
          </select>
        </div>
      </div>

      {loading && results.length === 0 && <p className="loading">Loading...</p>}
      {error && <p className="error">{error}</p>}

      {!error && searchTerm && (
        results.length > 0 ? (
          <>
            <p className="results-count">
              Found {results.length} product{results.length > 1 ? 's' : ''}
            </p>
            <ListingList listings={results} />
            {loading && results.length > 0 && <div className="loading-more">Loading more...</div>}
            {!hasMore && results.length > 0 && <div className="no-more">No more products</div>}
          </>
        ) : (
          <p className="no-results">No products found for “{searchTerm}”</p>
        )
      )}
    </div>
  );
}




