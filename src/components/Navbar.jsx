// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';
import cartIcon from '../models/cart.png';
import profileIcon from '../models/profile.png';
import searchIcon from '../models/search-icon.png';
const Navbar = () => {
  const [isMobile, setIsMobile]     = useState(false);
  const [user, setUser]             = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const location                    = useLocation();
  const navigate                    = useNavigate();
  const navRef                      = useRef(null);

  // keep user in sync
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    setUser(storedUser);
  }, [location]);

  // close mobile menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        isMobile &&
        navRef.current &&
        !navRef.current.contains(e.target)
      ) {
        setIsMobile(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMobile]);

  // handle search form submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setSearchTerm('');
      setIsMobile(false);
    }
  };

  return (
    <nav className="navbar" ref={navRef}>
      <div className="logo-wrapper">
        <Link to="/" className="logo">VibeCart</Link>
      </div>

         <form className="search-bar" onSubmit={handleSearchSubmit}>
      <div className="search-input-wrapper">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="submit" className="search-button" aria-label="Search">
          <img src={searchIcon} alt="Search" className="search-icon-img" />
        </button>
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
          <li>
            <Link to="/profile" title="Profile">
              <img 
                src={profileIcon} 
                alt="Profile" 
                style={{ height: '2rem', borderRadius: '50%' }} 
              />
            </Link>
          </li>
        ) : (
          <li><Link to="/login">Login / Signup</Link></li>
        )}

        <li>
          <Link to="/cart" className="cart-link" title="Cart">
            <img 
              src={cartIcon} 
              alt="Cart" 
              style={{ height: '2rem', borderRadius: '50%' }} 
            />
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


