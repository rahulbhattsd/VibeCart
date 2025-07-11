/* Banner.jsx */
import React, { useState, useEffect } from 'react';
import './Banner.css';
import shopImg    from '../models/woman-leather-shoes.jpg';
import legImg     from '../models/men-shoes.jpg';
import atitudeImg from '../models/l4.jpg';
import coupleImg  from '../models/shoe2.jpg';

const Banner = () => {
  const images = [ legImg, atitudeImg, coupleImg,shopImg];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(i => (i + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  const nextSlide = () => setCurrentIndex(i => (i + 1) % images.length);
  const prevSlide = () => setCurrentIndex(i => (i - 1 + images.length) % images.length);

  return (
    <div className="banner">
      {/* Abstract gradient blobs */}
      <div className="shape shape1" />
      <div className="shape shape2" />

      <div
        className="slides"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((src, idx) => (
          <div className="slide" key={idx}>
            <img src={src} alt={`Slide ${idx + 1}`} className="responsive-image" />
            <div className="slide-content">
              <h2>Discover Our Collection</h2>
              
              <div className="slide-buttons">
                <button className="shop-btn">Shop Now</button>
                <button className="explore-btn">Explore</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="arrow prev" onClick={prevSlide}>&#10094;</button>
      <button className="arrow next" onClick={nextSlide}>&#10095;</button>
    </div>
  );
};

export default Banner;
