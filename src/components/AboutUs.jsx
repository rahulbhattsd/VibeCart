import React from 'react';
import './AboutUs.css';

const AboutUs = () => {
  return (
    <div className="about-us-container">
      <section className="hero-section">
        <h1>About Us</h1>
        <p>Welcome to vibeCart — where fashion meets passion. We bring you the best handpicked collections at unbeatable prices.</p>
      </section>

      <section className="values-section">
        <h2>Our Values</h2>
        <div className="value-cards">
          <div className="value-card">
            <h3>Quality</h3>
            <p>We prioritize top-notch quality across all our products and services.</p>
          </div>
          <div className="value-card">
            <h3>Affordability</h3>
            <p>Fashion for everyone — without breaking the bank.</p>
          </div>
          <div className="value-card">
            <h3>Customer First</h3>
            <p>Your satisfaction drives everything we do at vibeCart.</p>
          </div>
        </div>
      </section>

      <section className="team-section">
        <h2>Meet the Team</h2>
        <div className="team-members">
          <div className="team-member">
            <img src="src\models\me.jpg" alt="logo"></img>
            <h4>Rahul Bhatt</h4>
            <p>Founder & Full Stack Developer</p>
          </div>
          {/* Add more members here if needed */}
        </div>
      </section>

      <section className="cta-section">
        <h2>Join Our Journey</h2>
        <p>Explore our exclusive collection and feel the vibe.</p>
        <a href="/" className="cta-button">Shop Now</a>
      </section>
    </div>
  );
};

export default AboutUs;
