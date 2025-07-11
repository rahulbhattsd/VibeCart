import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Listing.css';

const Listing = ({ isHomePage }) => {
  const [listings, setListings] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const limit = isHomePage ? 8 : 12;

  const fetchListings = async () => {
    try {
      setLoading(true);
      // const res = await axios.get(`/api/listings?page=${page}&limit=${limit}`, { withCredentials: true });
      const res = await axios.get(`/api/listings?page=${page}&limit=${limit}&sort=priceAsc`);

      if (res.data.length === 0) {
        setHasMore(false);
      } else {
        if (isHomePage && page === 1) {
          setListings(res.data);
        } else {
          setListings(prev => {
            const existingIds = new Set(prev.map(item => item._id));
            const newUnique = res.data.filter(item => !existingIds.has(item._id));
            return [...prev, ...newUnique];
          });
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load listings. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [page]);

  const handleScroll = () => {
    if (isHomePage) return;
    if (
      window.innerHeight + document.documentElement.scrollTop + 1 >=
      document.documentElement.scrollHeight &&
      !loading &&
      hasMore
    ) {
      setPage(prev => prev + 1);
    }
  };

  useEffect(() => {
    if (!isHomePage) {
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [loading, hasMore, isHomePage]);

  if (loading && listings.length === 0) {
    return (
      <div className="listing-container">
        <div className="loading">Loading listings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="listing-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="listing-container">
        <div className="no-listings">No listings found. Be the first to add one!</div>
      </div>
    );
  }

  return (
    <div className="listing-container">
      <h2>{isHomePage ? "Featured Products" : "All Available Products"}</h2>
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
            <p className="price">₹{item.price}</p>
            {item.seller && (
              <p className="seller">Seller: {item.seller.name}</p>
            )}
          </Link>
        ))}
      </div>

      {isHomePage && (
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <a href="/listings" style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#6a0dad',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}>
            View All Products
          </a>
        </div>
      )}

      {!isHomePage && loading && listings.length > 0 && (
        <div className="loading-more">Loading more products...</div>
      )}

      {!isHomePage && !hasMore && listings.length > 0 && (
        <div className="no-more">No more products to load</div>
      )}
    </div>
  );
};

export default Listing;

