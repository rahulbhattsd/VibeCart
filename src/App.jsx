import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Banner from './components/Banner';
import Footer from './components/Footer.jsx';

const Profile = lazy(() => import('./components/Profile'));
const LoginSignup = lazy(() => import('./components/LoginSignup'));
const AddListing = lazy(() => import('./components/AddListing'));
const Listing = lazy(() => import('./components/Listing.jsx'));
const Cart = lazy(() => import('./components/Cart.jsx'));
const Orders = lazy(() => import('./components/Orders.jsx'));
const OrderDetail = lazy(() => import('./components/OrderDetail.jsx'));
const OrderConfirmation = lazy(() => import('./components/OrderConfirmation.jsx'));
const Purchase = lazy(() => import('./components/Purchase.jsx'));
const SearchResults = lazy(() => import('./components/SearchResults'));
const Trendy = lazy(() => import('./components/Trendy'));
const AboutUs = lazy(() => import('./components/AboutUs.jsx'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy.jsx'));

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  useEffect(() => {
    const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    setRecentlyViewed(viewed);
  }, []);

  return (
    <main>
      <Banner />
 
      <section className="home-listings-container">
        {recentlyViewed.length > 0 && (
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1f2a38' }}>Recently Viewed</h2>
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
              {recentlyViewed.map(item => (
                <Link key={item.id} to={`/purchase/${item.id}`} style={{ textDecoration: 'none', color: 'inherit', minWidth: '150px' }}>
                  <img loading="lazy" src={item.imageUrl} alt={item.title} style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px' }} />
                  <p style={{ margin: '0.5rem 0 0 0', fontWeight: '500', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
        <Listing />
        <Footer />
      </section>
    </main>
  );
};

const App = () => {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
        <main>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginSignup />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/add-listing" element={<AddListing />} />
          <Route path="/listings" element={<Listing />} />

         <Route path="/cart" element={<Cart />} />
         <Route path="/purchase/:id" element={<Purchase />} />
         <Route path="/orders" element={<Orders />} />
         <Route path="/orders/:id" element={<OrderDetail />} />
         <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
        <Route path="/search" element={<SearchResults />} />
         <Route path="/trending" element={<Trendy />} />
         <Route path="/about-us" element={<AboutUs />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </main>
      </Suspense>
    </>
  );
};

export default App;

