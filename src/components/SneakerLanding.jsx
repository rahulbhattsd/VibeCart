import React from 'react';
import './SneakerLanding.css';

const SneakerLanding = () => {
  return (
    <div className="landing-container">
      <header className="hero-section">
        <div className="hero-text">
          <h1>Step Into Originality</h1>
          <p>Fresh drop of exclusive sneakers. Stand out with every step.</p>
          <button className="shop-button">Shop Now</button>
        </div>
        <div className="hero-image">
          <img src="https://via.placeholder.com/500x400" alt="Sneakers" />
        </div>
      </header>

      <section className="features">
        <div className="feature">
          <h3>Bold Designs</h3>
          <p>Show off your unique style with limited-edition sneaker drops.</p>
        </div>
        <div className="feature">
          <h3>Premium Comfort</h3>
          <p>Cushioned soles and breathable fabric for all-day wear.</p>
        </div>
        <div className="feature">
          <h3>Fast Shipping</h3>
          <p>Worldwide delivery in record time – straight to your door.</p>
        </div>
      </section>

      <footer className="footer">
        <p>&copy; 2025 Original Kicks. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default SneakerLanding;
