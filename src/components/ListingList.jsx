// src/components/ListingList.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate, Link } from 'react-router-dom';
import './ListingList.css';

const ListingList = ({ listings: providedListings }) => {
  const [listings, setListings] = useState(providedListings || []);
  const [loading, setLoading] = useState(!providedListings);
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (providedListings) {
      setListings(providedListings);
      setLoading(false);
      return;
    }

    const fetchListings = async () => {
      try {
        const res = await api.get('/listings');
        setListings(res.data);
      } catch (e) {
        console.error(e);
        setErr('Failed to load listings');
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [providedListings]);

  const addToCart = async (listingId, size) => {
    try {
      await api.post('/cart', { listingId, size, quantity: 1 });
      alert('Added to cart');
    } catch (e) {
      console.error(e);
      if (e.response?.status === 401) {
        alert('Please login to add items to your cart');
        navigate('/login');
      } else {
        alert(e.response?.data?.message || 'Could not add to cart');
      }
    }
  };

  const buyNow = (id, size) => {
    navigate(`/purchase/${id}?size=${size}&qty=1`);
  };

  if (loading) return <p>Loading listings…</p>;
  if (err)     return <p className="error">{err}</p>;

  return (
    <div className="listing-grid">
      {listings.map(item => {
        const sizes = Object.keys(item.inventory);
        return (
          <div key={item._id} className="listing-card">
            <Link to={`/purchase/${item._id}`}>
              <img src={item.imageUrl} alt={item.title} />
            </Link>
            <h3>{item.title}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0 }}>₹{item.price}</p>
              <div style={{ color: '#f59e0b', fontSize: '0.9rem', fontWeight: 'bold' }}>
                ⭐ {item.rating ? item.rating.toFixed(1) : '0.0'} ({item.ratingCount || 0})
              </div>
            </div>
            <div className="size-select">
              <label htmlFor={`size-${item._id}`}>Size</label>
              <select id={`size-${item._id}`} defaultValue={sizes[0]}>
                {sizes.map(sz => (
                  <option key={sz} value={sz}>
                    UK {sz}
                  </option>
                ))}
              </select>
            </div>
            <div className="actions">
              <button
                onClick={() => {
                  const select = document.getElementById(`size-${item._id}`);
                  addToCart(item._id, select.value);
                }}
              >
                Add to Cart
              </button>
              <button
                onClick={() => {
                  const select = document.getElementById(`size-${item._id}`);
                  buyNow(item._id, select.value);
                }}
              >
                Buy Now
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ListingList;
