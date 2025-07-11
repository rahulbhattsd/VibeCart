
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Listing.css';

const AddListing = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    imageUrl: '',
  });
  const [uploading, setUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('');

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/me', { withCredentials: true });
        if (res.data && res.data.user) {
          setIsAuthenticated(true);
          setUserRole(res.data.user.role);
          
          if (res.data.user.role !== 'seller') {
            alert('Only sellers can add listings');
            navigate('/listings');
          }
        } else {
          setIsAuthenticated(false);
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        navigate('/login');
      }
    };
    
    checkAuth();
  }, [navigate]);

  const handleUpload = () => {
    setUploading(true);
    window.cloudinary.openUploadWidget({
      cloudName: import.meta.env.VITE_CLOUD_NAME,
      uploadPreset: import.meta.env.VITE_UPLOAD_PRESET,
      sources: ['local', 'url', 'camera'],
      cropping: true,
      multiple: false,
    }, (err, result) => {
      setUploading(false);
      if (err) {
        console.error('Cloudinary upload error:', err);
        alert('Failed to upload image. Please try again.');
      } else if (result.event === 'success') {
        setForm(prev => ({ ...prev, imageUrl: result.info.secure_url }));
      }
    });
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.imageUrl) {
      alert('Please upload an image before submitting.');
      return;
    }
    
    if (!form.title || !form.price) {
      alert('Please fill in all required fields (title and price).');
      return;
    }
    
    try {
      // Use the API endpoint with proxy from vite.config.js
      const res = await axios.post('/api/listings', form, { withCredentials: true });
      if (res.status === 201) {
        alert('Listing created successfully!');
        navigate('/listings');
      } else {
        alert('Failed to add listing. Please try again.');
        console.log('Server response:', res);
      }
    } catch (error) {
      console.error('Listing submission error:', error);
      if (error.response && error.response.status === 401) {
        alert('You must be logged in to add a listing.');
        navigate('/login');
      } else if (error.response && error.response.status === 403) {
        alert('Only sellers can add listings.');
      } else {
        alert('Server error while submitting. Please try again later.');
      }
    }
  };

  if (!isAuthenticated) {
    return <div className="add-listing-container">Checking authentication...</div>;
  }

  if (userRole !== 'seller') {
    return <div className="add-listing-container">Only sellers can add listings</div>;
  }

  return (
    <div className="add-listing-container">
      <h2>Add New Listing</h2>
      <div className="add-listing-form">
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Product Title"
          required
        />
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Description"
        />
        <input
          type="number"
          name="price"
          value={form.price}
          onChange={handleChange}
          placeholder="Price (₹)"
          required
        />
        <button type="button" onClick={handleUpload} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload Image'}
        </button>
        {form.imageUrl && (
          <img src={form.imageUrl} alt="preview" className="listing-image" />
        )}
        <button type="button" onClick={handleSubmit}>Add Listing</button>
      </div>
    </div>
  );
};

export default AddListing;
