
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Register.css';

const Register = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

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
      const response = await axios.post('/api/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Registration successful:', response.data);
      navigate('/chat');
    } catch (error) {
      console.error('Error registering:', error);
      setErrorMessage('Registration failed. Please try again.');
    }
  };

  return (
    <div className="register-container">
      <h2 className="register-title">Complete Registration</h2>
      {errorMessage && <div className="error-message">{errorMessage}</div>}
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
        <input
          type="file"
          onChange={handlePhotoChange}
          accept="image/*"
          className="register-input"
        />
        <button type="submit" className="register-button">Complete Registration</button>
      </form>
    </div>
  );
};

export default Register;