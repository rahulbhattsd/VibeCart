import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Profile from './components/Profile';
import Navbar from './components/Navbar';
import Banner from './components/Banner';
import LoginSignup from './components/LoginSignup';
import AddListing from './components/AddListing';
import Listing from './components/Listing.jsx';
import Cart from './components/Cart.jsx';
import Orders from './components/Orders.jsx';
import OrderDetail from './components/OrderDetail.jsx';
import Purchase from './components/Purchase.jsx';
import SearchResults from './components/SearchResults';
import Footer from './components/Footer.jsx';
import Trendy from './components/Trendy';

import AboutUs from './components/AboutUs.jsx';
import PrivacyPolicy from './components/PrivacyPolicy.jsx';

const Home = () => {
  return (
    <>
      <Banner />
 
      <div className="home-listings-container">
        <Listing />
        <Footer />
      </div>
    </>
  );
};

const App = () => {
  return (
    <>
      <Navbar />
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
      <Route path="/search" element={<SearchResults />} />
       <Route path="/trending" element={<Trendy />} />
       <Route path="/about-us" element={<AboutUs />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      </Routes>
    </>
  );
};

export default App;

