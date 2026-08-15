import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Trendy.css';

const Trendy = () => {
  const [trendings, setTrendings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTrendings = async () => {
      try {
        const res = await axios.get('/api/trendings', { withCredentials: true });
        setTrendings(res.data);
      } catch (err) {
        console.error('Error loading trendings:', err);
        setError('Could not load trending products.');
      } finally {
        setLoading(false);
      }
    };
    fetchTrendings();
  }, []);

  if (loading) return <div className="trendy-container"><p>Loading trending products…</p></div>;
  if (error)   return <div className="trendy-container"><p className="error">{error}</p></div>;

  return (
    <div className="trendy-container">
      <h2>🔥 Trending Now</h2>
      <div className="trendy-grid">
        {trendings.map(item => (
          <Link key={item._id} to={`/purchase/${item._id}`} className="trendy-card">
            {item.imageUrl
              ? <img src={item.imageUrl} alt={item.title} className="trendy-image"/>
              : <div className="trendy-image placeholder">No Image</div>
            }
            <h3>{item.title}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0' }}>
              <p className="price" style={{ margin: 0 }}>₹{item.price}</p>
              <div style={{ color: '#f59e0b', fontSize: '0.9rem', fontWeight: 'bold' }}>
                ⭐ {item.rating ? item.rating.toFixed(1) : '0.0'} ({item.ratingCount || 0})
              </div>
            </div>
            <p className="seller">By {item.seller.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Trendy;

