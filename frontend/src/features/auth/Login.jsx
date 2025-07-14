import React, { useState } from 'react';
import { useLoginMutation } from './authApi';
import { useNavigate } from 'react-router-dom';
import './AuthStyles.css';

export default function Login({ onSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [login, { isLoading, error, isSuccess }] = useLoginMutation();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(form);
    if (result.data && onSuccess) {
      const { user, token } = result.data.data;
      onSuccess(user, token);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Login</h2>
          <p>Welcome back! Please login to your account.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              name="email" 
              type="email" 
              placeholder="Enter your email" 
              value={form.email} 
              onChange={handleChange} 
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              name="password" 
              type="password" 
              placeholder="Enter your password" 
              value={form.password} 
              onChange={handleChange} 
              required 
            />
          </div>
          
          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
          
          {isSuccess && <div className="success-message">Login successful!</div>}
          {error && <div className="error-message">{error.data?.message || 'Login failed'}</div>}
          
          <div className="auth-footer">
            <p>Don't have an account? <button type="button" className="link-button" onClick={() => navigate('/register')}>Register</button></p>
          </div>
        </form>
      </div>
    </div>
  );
} 