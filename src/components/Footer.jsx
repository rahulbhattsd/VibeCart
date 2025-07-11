import React from 'react';
import './Footer.css';

// Make sure these files exist in src/models/
import logo from '../models/logo.png';
import fbIcon from '../models/facebook.png';
import instaIcon from '../models/instagram.png';
import twitterIcon from '../models/twitter.png';
// Correct import paths for store/payment images
import appStoreImg from '../models/appstore.png';
import playStoreImg from '../models/playstore.png';
import payImage from '../models/paypal.png';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer section-p1">
      <div className="col">
        <img src={logo} alt="Logo" className="logo-img" />
        <h4>Contact VibeCart</h4>
        <p><span>Address:</span> Jabalpur, Madhya Pradesh</p>
        <p><span>Phone:</span> 7898372676</p>
        <p><span>Hours:</span> 10:00-18:00, Mon‑Sat</p>
        <div className="follow">
          <h4>Follow us</h4>
          <div className="icon">
            <a href="https://facebook.com"><img src={fbIcon} alt="Facebook" className="social" /></a>
            <a href="https://instagram.com"><img src={instaIcon} alt="Instagram" className="social" /></a>
            <a href="https://twitter.com"><img src={twitterIcon} alt="Twitter" className="social" /></a>
          </div>
        </div>
      </div>

      <div className="col">
        <h4>About</h4>
        <a href="/about-us">About us</a>
        <a href="/orders">Delivery Information</a>
        <a href="/privacy">Privacy Policy</a>
        <a href="/privacy">Terms &amp; Condition</a>
        <a href="/about-us">Contact us</a>
      </div>

      <div className="col">
        <h4>My Account</h4>
        <a href="/login">Sign In</a>
        <a href="/cart">Cart</a>
        <a href="/cart">My Wishlist</a>
        <a href="/orders">Your Orders</a>
        <a href="/help">Help</a>
      </div>

      <div className="col install">
        <h4>Install App</h4>
        <p>From App Store or Google Play</p>
        <div className="row">
          <a href="#"><img src={appStoreImg} alt="App Store" /></a>
          <a href="#"><img src={playStoreImg} alt="Google Play" /></a>
        </div>
        <p>Secure Payment Gateways</p>
        <a href="#"><img src={payImage} alt="Payment Methods" /></a>
      </div>

      <div className="copyright">
        <p>&copy; {currentYear} All rights reserved</p>
      </div>
    </footer>
  );
}

