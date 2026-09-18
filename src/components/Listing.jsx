// src/components/Listing.jsx
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import PriceRangeSlider from './PriceRangeSlider';
import { FiFilter, FiX, FiCheck } from 'react-icons/fi';
import './Listing.css';

const CATEGORIES = [
  { label: 'All Footwear', value: 'all' },
  { label: 'Sneakers', value: 'sneakers' },
  { label: 'Running', value: 'running' },
  { label: 'Casual', value: 'casual' },
  { label: 'Sports', value: 'sports' }
];

const SIZES = ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];

const SORT_OPTIONS = [
  { label: 'Price: Low to High', value: 'priceAsc' },
  { label: 'Price: High to Low', value: 'priceDesc' },
  { label: 'Customer Rating', value: 'rating' },
  { label: 'Newest First', value: 'newest' }
];

const Listing = ({ isHomePage }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL search params
  const categoryParam = searchParams.get('category') || 'all';
  const sizeParam = searchParams.get('size') || '';
  const sortParam = searchParams.get('sort') || 'priceAsc';
  const minPriceParam = searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('maxPrice');

  // Dynamic bounds fetched from DB
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 10000 });
  const [sliderRange, setSliderRange] = useState([0, 10000]);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Listing data & pagination state
  const [listings, setListings] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const debounceTimerRef = useRef(null);
  const limit = isHomePage ? 8 : 12;

  // 1. Fetch dynamic price bounds from actual database catalog for the current category
  useEffect(() => {
    if (isHomePage) return;

    let isMounted = true;
    const fetchBounds = async () => {
      try {
        const params = {};
        if (categoryParam && categoryParam !== 'all') {
          params.category = categoryParam;
        }

        const res = await api.get('/listings/price-bounds', { params });
        if (!isMounted) return;

        const min = typeof res.data?.minPrice === 'number' ? res.data.minPrice : 0;
        const max = typeof res.data?.maxPrice === 'number' && res.data.maxPrice > min ? res.data.maxPrice : 10000;

        setPriceBounds({ min, max });

        // Synchronize local slider position with URL params or DB bounds
        const initialMin = minPriceParam !== null ? Math.max(Number(minPriceParam), min) : min;
        const initialMax = maxPriceParam !== null ? Math.min(Number(maxPriceParam), max) : max;
        setSliderRange([initialMin, initialMax]);
      } catch (err) {
        console.warn('Failed to fetch dynamic price bounds:', err);
      }
    };

    fetchBounds();
    return () => {
      isMounted = false;
    };
  }, [categoryParam, isHomePage, maxPriceParam, minPriceParam]);

  // 2. Fetch listings based on all filters (ANDed together)
  const fetchListings = useCallback(async (targetPage = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: targetPage,
        limit,
        sort: sortParam,
      };

      if (!isHomePage) {
        if (categoryParam && categoryParam !== 'all') {
          params.category = categoryParam;
        }
        if (sizeParam) {
          params.size = sizeParam;
        }
        if (minPriceParam !== null && minPriceParam !== '') {
          params.minPrice = minPriceParam;
        }
        if (maxPriceParam !== null && maxPriceParam !== '') {
          params.maxPrice = maxPriceParam;
        }
      }

      const res = await api.get('/listings', { params });
      const fetched = Array.isArray(res.data) ? res.data : res.data?.listings || [];

      if (fetched.length < limit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (append && targetPage > 1) {
        setListings(prev => {
          const existingIds = new Set(prev.map(item => item._id));
          const uniqueNew = fetched.filter(item => !existingIds.has(item._id));
          return [...prev, ...uniqueNew];
        });
      } else {
        setListings(fetched);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load listings. Please try again later.');
      setLoading(false);
    }
  }, [categoryParam, isHomePage, limit, maxPriceParam, minPriceParam, sizeParam, sortParam]);

  // Trigger re-fetch when active filters or sort change (reset to page 1)
  useEffect(() => {
    setPage(1);
    fetchListings(1, false);
  }, [fetchListings]);

  // Infinite scroll on non-home pages
  const handleScroll = useCallback(() => {
    if (isHomePage) return;
    if (
      window.innerHeight + document.documentElement.scrollTop + 1 >=
      document.documentElement.scrollHeight &&
      !loading &&
      hasMore
    ) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchListings(nextPage, true);
    }
  }, [fetchListings, hasMore, isHomePage, loading, page]);

  useEffect(() => {
    if (!isHomePage) {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, isHomePage]);

  // Debounced slider change handler (350ms) to update URL query params
  const handleSliderChange = (newRange) => {
    setSliderRange(newRange);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('minPrice', String(Math.round(newRange[0])));
      newParams.set('maxPrice', String(Math.round(newRange[1])));
      setSearchParams(newParams, { replace: true });
    }, 350);
  };

  // Preset button click handler
  const handlePricePreset = (minVal, maxVal) => {
    const nextRange = [minVal, maxVal];
    setSliderRange(nextRange);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('minPrice', String(minVal));
    newParams.set('maxPrice', String(maxVal));
    setSearchParams(newParams, { replace: true });
  };

  // Filter change handlers (merging cleanly with URL search params)
  const handleCategoryChange = (catValue) => {
    const newParams = new URLSearchParams(searchParams);
    if (catValue === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', catValue);
    }
    // Clear price params to re-anchor to category bounds
    newParams.delete('minPrice');
    newParams.delete('maxPrice');
    setSearchParams(newParams, { replace: true });
  };

  const handleSizeChange = (sizeVal) => {
    const newParams = new URLSearchParams(searchParams);
    if (sizeParam === sizeVal) {
      newParams.delete('size');
    } else {
      newParams.set('size', sizeVal);
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleSortChange = (e) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', e.target.value);
    setSearchParams(newParams, { replace: true });
  };

  const handleClearFilters = () => {
    setSliderRange([priceBounds.min, priceBounds.max]);
    const newParams = new URLSearchParams();
    if (sortParam && sortParam !== 'priceAsc') {
      newParams.set('sort', sortParam);
    }
    setSearchParams(newParams, { replace: true });
  };

  // Count active filters for badge
  const activeFiltersCount = [
    categoryParam !== 'all',
    Boolean(sizeParam),
    minPriceParam !== null && Number(minPriceParam) > priceBounds.min,
    maxPriceParam !== null && Number(maxPriceParam) < priceBounds.max
  ].filter(Boolean).length;

  return (
    <div className={`listing-container ${!isHomePage ? 'listing-catalog-mode' : ''}`}>
      <div className="listing-header-area">
        <h2>{isHomePage ? 'Featured Products' : 'All Available Products'}</h2>
        {!isHomePage && (
          <p className="listing-subheading">
            Browse our curated lineup of sneakers, athletic shoes, and casual footwear.
          </p>
        )}
      </div>

      {/* Catalog Layout with Sidebar Filter */}
      <div className={!isHomePage ? 'catalog-layout' : 'home-layout'}>
        {!isHomePage && (
          <>
            {/* Mobile Filter Toggle Button */}
            <div className="mobile-filter-bar">
              <button
                className="mobile-filter-toggle-btn"
                onClick={() => setIsMobileFiltersOpen(prev => !prev)}
                aria-expanded={isMobileFiltersOpen}
              >
                <FiFilter />
                <span>Filters &amp; Sizing</span>
                {activeFiltersCount > 0 && (
                  <span className="filter-count-badge">{activeFiltersCount}</span>
                )}
              </button>

              <div className="mobile-sort-select">
                <select value={sortParam} onChange={handleSortChange} aria-label="Sort products">
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sidebar Controls */}
            <aside className={`catalog-sidebar ${isMobileFiltersOpen ? 'sidebar-open' : ''}`}>
              <div className="sidebar-header">
                <h3>Filters</h3>
                {activeFiltersCount > 0 && (
                  <button className="clear-filters-btn" onClick={handleClearFilters}>
                    Reset all
                  </button>
                )}
                <button
                  className="sidebar-close-btn"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  aria-label="Close filters"
                >
                  <FiX />
                </button>
              </div>

              {/* Price Range Filter */}
              <div className="filter-section">
                <PriceRangeSlider
                  min={priceBounds.min}
                  max={priceBounds.max}
                  value={sliderRange}
                  onChange={handleSliderChange}
                  step={50}
                />

                {/* Price Presets */}
                <div className="price-presets">
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => handlePricePreset(priceBounds.min, 2000)}
                  >
                    Under ₹2k
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => handlePricePreset(2000, 5000)}
                  >
                    ₹2k – ₹5k
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => handlePricePreset(5000, priceBounds.max)}
                  >
                    ₹5k+
                  </button>
                </div>
              </div>

              {/* Category Filter */}
              <div className="filter-section">
                <h4 className="filter-title">Category</h4>
                <div className="category-chips">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      className={`category-chip ${categoryParam === cat.value ? 'active' : ''}`}
                      onClick={() => handleCategoryChange(cat.value)}
                    >
                      {cat.label}
                      {categoryParam === cat.value && <FiCheck className="chip-check" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shoe Size Filter */}
              <div className="filter-section">
                <h4 className="filter-title">Shoe Size (UK)</h4>
                <div className="size-grid">
                  {SIZES.map(sz => (
                    <button
                      key={sz}
                      type="button"
                      className={`size-chip ${sizeParam === sz ? 'active' : ''}`}
                      onClick={() => handleSizeChange(sz)}
                    >
                      UK {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop Sort Selector */}
              <div className="filter-section desktop-sort-section">
                <h4 className="filter-title">Sort By</h4>
                <select
                  className="filter-sort-dropdown"
                  value={sortParam}
                  onChange={handleSortChange}
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Apply button for mobile modal */}
              <div className="mobile-apply-wrap">
                <button
                  className="mobile-apply-btn"
                  onClick={() => setIsMobileFiltersOpen(false)}
                >
                  Show Results ({listings.length})
                </button>
              </div>
            </aside>
          </>
        )}

        {/* Product Grid Area */}
        <div className="catalog-main-content">
          {loading && listings.length === 0 ? (
            <div className="loading">Loading listings...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : listings.length === 0 ? (
            <div className="no-listings">
              <h3>No products matched your criteria</h3>
              <p>Try adjusting your price range, category, or size filter.</p>
              <button className="clear-filters-btn inline-clear" onClick={handleClearFilters}>
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="listings-grid">
              {listings.map((item) => (
                <Link key={item._id} to={`/purchase/${item._id}`} className="listing-card">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="listing-image" />
                  ) : (
                    <div className="listing-image placeholder">No Image</div>
                  )}
                  <h3>{item.title}</h3>
                  <p className="description">{item.description || 'No description available'}</p>
                  <p className="price">₹{item.price.toLocaleString('en-IN')}</p>
                  {item.seller && (
                    <p className="seller">Seller: {item.seller.name}</p>
                  )}
                </Link>
              ))}
            </div>
          )}

          {isHomePage && (
            <div className="view-all-products">
              <Link to="/listings">View All Products</Link>
            </div>
          )}

          {!isHomePage && loading && listings.length > 0 && (
            <div className="loading-more">Loading more products...</div>
          )}

          {!isHomePage && !hasMore && listings.length > 0 && (
            <div className="no-more">No more products to load</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Listing;
