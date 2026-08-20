import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import './Navbar.css';
import cartIcon from '../models/cart.png';
import profileIcon from '../models/profile.png';
import searchIcon from '../models/search-icon.png';

const Navbar = () => {
  const [isMobile, setIsMobile]     = useState(false);
  const [user, setUser]             = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [cartCount, setCartCount]   = useState(0);
  const location                    = useLocation();
  const navigate                    = useNavigate();
  const navRef                      = useRef(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim()) {
        api.get(`/products/search?q=${searchTerm}&limit=5`)
          .then(res => {
            const listings = Array.isArray(res.data) ? res.data : (res.data.listings || []);
            setAutocompleteResults(listings);
            setShowDropdown(true);
          })
          .catch(err => console.error(err));
      } else {
        setAutocompleteResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const fetchCartCount = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      api.get('/cart')
        .then(res => {
          const count = res.data.reduce((acc, item) => acc + item.quantity, 0);
          setCartCount(count);
        })
        .catch(() => setCartCount(0));
    } else {
      const guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
      const count = guestCart.reduce((acc, item) => acc + item.quantity, 0);
      setCartCount(count);
    }
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    setUser(storedUser);
    fetchCartCount();
  }, [location]);

  useEffect(() => {
    window.addEventListener('cartUpdated', fetchCartCount);
    return () => window.removeEventListener('cartUpdated', fetchCartCount);
  }, []);

  useEffect(() => {
    const handleOutsideClick = e => {
      if (isMobile && navRef.current && !navRef.current.contains(e.target)) {
        setIsMobile(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMobile]);

  const handleSearchSubmit = e => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setSearchTerm('');
      setShowDropdown(false);
      setIsMobile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', { withCredentials: true });
      localStorage.removeItem('user');
      setUser(null);
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      alert('Logout failed');
    }
  };

  return (
    <nav className="navbar" ref={navRef}>
      <div className="logo-wrapper">
        <Link to="/" className="logo">VibeCart</Link>
      </div>

      <form className="search-bar" onSubmit={handleSearchSubmit}>
        <div className="search-input-wrapper" style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onFocus={() => { if (searchTerm.trim() && autocompleteResults.length > 0) setShowDropdown(true); }}
          />
          <button type="submit" className="search-button" aria-label="Search">
            <img loading="lazy" src={searchIcon} alt="Search" className="search-icon-img" />
          </button>

          {showDropdown && autocompleteResults.length > 0 && (
            <ul className="autocomplete-dropdown" style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'white', listStyle: 'none', padding: '0.5rem 0',
              margin: '0.25rem 0 0 0', borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 1000,
              maxHeight: '300px', overflowY: 'auto'
            }}>
              {autocompleteResults.map(item => (
                <li key={item._id} style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #eee' }}>
                  <Link
                    to={`/purchase/${item._id}`}
                    style={{ textDecoration: 'none', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}
                    onClick={() => { setSearchTerm(''); setShowDropdown(false); setIsMobile(false); }}
                  >
                    {item.imageUrl && <img loading="lazy" src={item.imageUrl} alt={item.title} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                    <div>
                      <div style={{ fontWeight: '500' }}>{item.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>₹{item.price}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>

      <ul
        className={isMobile ? 'nav-links-mobile' : 'nav-links'}
        onClick={() => setIsMobile(false)}
      >
        <li><Link to="/">Home</Link></li>
        <li><Link to="/trending">Trending</Link></li>
        <li><Link to="/orders">Your Orders</Link></li>
        <li><Link to="/add-listing">Add Listing</Link></li>

        {user ? (
          <>
            <li>
              <Link to="/profile" title="Profile">
                <img loading="lazy"
                  src={profileIcon}
                  alt="Profile"
                  style={{ height: '2rem', borderRadius: '50%' }}
                />
              </Link>
            </li>
            <li>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </li>
          </>
        ) : (
          <li><Link to="/login">Login / Signup</Link></li>
        )}

        <li>
          <Link to="/cart" className="cart-link" title="Cart" style={{ position: 'relative' }}>
            <img loading="lazy"
              src={cartIcon}
              alt="Cart"
              style={{ height: '2rem', borderRadius: '50%' }}
            />
            {cartCount > 0 && (
              <span style={{
                position: 'absolute', top: '-5px', right: '-10px',
                background: '#ef4444', color: 'white', borderRadius: '50%',
                padding: '2px 6px', fontSize: '0.75rem', fontWeight: 'bold'
              }}>
                {cartCount}
              </span>
            )}
          </Link>
        </li>
      </ul>

      <button
        className="mobile-menu-icon"
        onClick={() => setIsMobile(!isMobile)}
      >
        {isMobile ? '✕' : '☰'}
      </button>
    </nav>
  );
};

export default Navbar;




