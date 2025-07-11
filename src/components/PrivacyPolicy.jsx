import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const navigate = useNavigate();

  const handleAccept = () => {
    setIsAccepting(true);
    // You can add logic here to store consent in localStorage or cookies
    localStorage.setItem('privacyPolicyAccepted', 'true');
    
    // Redirect after a brief delay for animation
    setTimeout(() => {
      navigate('/');
    }, 500);
  };

  const handleReject = () => {
    setIsRejecting(true);
    // You can add logic here to handle rejection
    
    // Redirect after a brief delay for animation
    setTimeout(() => {
      navigate('/');
    }, 500);
  };

  return (
    <div className="privacy-policy-container">
      <div className={`privacy-policy-card ${isAccepting ? 'accepting' : ''} ${isRejecting ? 'rejecting' : ''}`}>
        <div className="privacy-header">
          <h1>Privacy Policy</h1>
          <div className="privacy-decoration"></div>
        </div>

        <div className="privacy-content">
          <section className="policy-section">
            <h2>Introduction</h2>
            <p>
              Welcome to vibeCart's Privacy Policy. This document outlines how we collect, use, and protect your personal information when you use our services.
            </p>
          </section>

          <section className="policy-section">
            <h2>Information We Collect</h2>
            <ul>
              <li>
                <span className="highlight">Personal Information:</span> Name, email address, phone number, and billing information when you create an account or make a purchase.
              </li>
              <li>
                <span className="highlight">Usage Data:</span> Information about how you interact with our website, including browsing patterns, pages visited, and time spent.
              </li>
              <li>
                <span className="highlight">Device Information:</span> Data about the device you use to access our services, including IP address, browser type, and operating system.
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>How We Use Your Information</h2>
            <ul>
              <li>To process orders and provide customer support</li>
              <li>To improve our products and services</li>
              <li>To personalize your shopping experience</li>
              <li>To send promotional emails about new products, special offers, or other information</li>
              <li>To conduct market research and analysis</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>Information Sharing</h2>
            <p>
              We do not sell or rent your personal information to third parties. We may share your information with:
            </p>
            <ul>
              <li>Service providers who assist us in operating our website</li>
              <li>Payment processors to complete transactions</li>
              <li>Delivery partners to fulfill orders</li>
              <li>Legal authorities when required by law</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>Your Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul>
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify inaccurate personal information</li>
              <li>Request deletion of your personal data</li>
              <li>Object to the processing of your personal information</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>Security Measures</h2>
            <p>
              We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="policy-section">
            <h2>Cookies Policy</h2>
            <p>
              We use cookies to enhance your experience on our website. You can set your browser to refuse all or some browser cookies, but this may prevent some parts of our website from functioning properly.
            </p>
          </section>

          <section className="policy-section">
            <h2>Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section className="policy-section">
            <h2>Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="contact-info">
              support@vibecart.com<br />
              7898372675
            </p>
          </section>
        </div>

        <div className="privacy-actions">
          <button 
            className="privacy-button reject"
            onClick={handleReject}
            disabled={isAccepting || isRejecting}
          >
            I Decline
          </button>
          <button 
            className="privacy-button accept"
            onClick={handleAccept}
            disabled={isAccepting || isRejecting}
          >
            I Accept
          </button>
        </div>

        <div className="last-updated">
          Last Updated: May 4, 2025
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;