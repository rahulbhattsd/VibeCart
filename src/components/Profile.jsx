import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';      // <-- use your axios instance already configured for production
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    setUser(storedUser);
  }, []);

  const handleLogout = async () => {
    try {
      await api.get('/logout', { withCredentials: true });
      localStorage.removeItem('user');
      setUser(null);
      alert('👋 Logged out successfully!');
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      alert('Logout failed!');
    }
  };

  if (!user) {
    return <div className="profile-container"><p>Loading...</p></div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <img 
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBuop37VPM8lX6Cr8AL6HdFViC1PskX1mCQA&s" 
          alt="User Avatar" 
          className="profile-avatar"
          style={{ height: '7rem', borderRadius: '50%' }} 
        />
        <h2>{user.name || user.gmail.split('@')[0]}</h2>
        <p><strong>Role:</strong> {user.role || 'Buyer'}</p>
        <p><strong>Email:</strong> {user.gmail}</p>
        <p><strong>Joined:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;


