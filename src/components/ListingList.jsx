// src/components/ListingList.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './ListingList.css';

const ListingList = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const res = await axios.get('/api/listings');
        setListings(res.data);
      } catch (e) {
        console.error(e);
        setErr('Failed to load listings');
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  const addToCart = async (listingId, size) => {
    try {
      await axios.post('/api/cart', { listingId, size, quantity: 1 }, { withCredentials: true });
      alert('Added to cart');
    } catch (e) {
      console.error(e);
      alert('Could not add to cart');
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
            <p>₹{item.price}</p>
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
