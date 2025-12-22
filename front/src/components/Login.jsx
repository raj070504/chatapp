import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for existing token on component mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Verify if the token is still valid by making a request to a protected endpoint
          const response = await axios.get('/api/verify-token', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // If token is valid, navigate based on user status
          if (response.data.isRegistered) {
            navigate('/chat');
          } else {
            navigate('/register');
          }
        } catch (error) {
          // Token is invalid or expired, remove it
          localStorage.removeItem('token');
          console.log('Token expired or invalid, user needs to login again');
        }
      }
      
      setIsCheckingAuth(false);
    };

    checkExistingAuth();
  }, [navigate]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    console.log('Sending OTP to:', email);
    try {
      await axios.post('/api/send-otp', { email });
      setOtpSent(true);
      setErrorMessage('');
    } catch (error) {
      console.error('Error sending OTP:', error);
      setErrorMessage('Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/verify-otp', { email, otp });
      localStorage.setItem('token', response.data.token);
      if (response.data.message === 'Please complete registration') {
        navigate('/register');
      } else if (response.data.error === 'Invalid OTP') {
        setErrorMessage('Invalid OTP. Please try again.');
      } else {
        navigate('/chat');
      }
      console.log('Login successful:', response.data.message);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setErrorMessage('An error occurred. Please try again.');
    }
  };

  const handleMathChat = () => {
    navigate('/chat/math');
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="login-container">
        <div className="loading">Checking authentication...</div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2 className="login-title">Welcome Back</h2>
          <p className="login-subtitle">
            {!otpSent ? 'Enter your email to get started' : 'Check your email for the OTP'}
          </p>
        </div>
        
        {errorMessage && (
          <div className="error-message">
            <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            {errorMessage}
          </div>
        )}

        <div className="form-container">
          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="login-form">
              <div className="input-group">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="m4 4 16 0 0 16-16 0z"></path>
                  <path d="m4 4 8 8 8-8"></path>
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="login-input"
                />
              </div>
              <button type="submit" className="login-button">
                <span>Send OTP</span>
                <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12,5 19,12 12,19"></polyline>
                </svg>
              </button>
              
              <div className="divider">
                <span>or</span>
              </div>
              
              <button 
                type="button" 
                onClick={handleMathChat} 
                className="math-chat-button"
              >
                <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
                <span>Try Math Chat (No Login Required)</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="login-form otp-form">
              <div className="input-group">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <circle cx="12" cy="16" r="1"></circle>
                </svg>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                  required
                  className="login-input"
                  maxLength="6"
                />
              </div>
              <button type="submit" className="login-button">
                <span>Verify OTP</span>
                <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                  setErrorMessage('');
                }} 
                className="back-button"
              >
                ← Back to email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;