import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const UpdateProfile = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState(null);
  const [currentPhoto, setCurrentPhoto] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch current user data when component mounts
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      try {
        const response = await axios.get('/user-profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setName(response.data.name || '');
        setPhone(response.data.phone || '');
        setCurrentPhoto(response.data.photo || '');
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setErrorMessage('Failed to load your profile data.');
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    setPhoto(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setErrorMessage('No token found. Please login again.');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('phone', phone);
    if (photo) {
      formData.append('photo', photo);
    }

    try {
      setSuccessMessage('');
      setErrorMessage('');
      
      const response = await axios.put('/update-profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Profile update successful:', response.data);
      setSuccessMessage('Profile updated successfully!');
      
      // If there's a new token in the response, update it
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        window.location.href='/chat';
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage('Profile update failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="register-container">
        <div className="loading">Loading your profile...</div>
      </div>
    );
  }

  return (
    <div className="register-container">
      <h2 className="register-title">Update Profile</h2>
      {errorMessage && <div className="error-message">{errorMessage}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      <form onSubmit={handleSubmit} className="register-form">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          required
          className="register-input"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter your phone number"
          required
          className="register-input"
        />
        
        {currentPhoto && (
          <div className="current-photo">
            <p>Current Photo:</p>
            <img 
              src={`/uploads/${currentPhoto}`} 
              alt="Current profile" 
              className="profile-preview" 
            />
          </div>
        )}
        
        <input
          type="file"
          onChange={handlePhotoChange}
          accept="image/*"
          className="register-input"
        />
        <button type="submit" className="register-button">Update Profile</button>
        <button 
          type="button" 
          onClick={() => navigate('/chat')} 
          className="cancel-button"
        >
          Cancel
        </button>
      </form>
    </div>
  );
};

export default UpdateProfile;