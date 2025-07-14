import React, { useState } from 'react';
import { useRegisterMutation } from './authApi';
import { useNavigate } from 'react-router-dom';
import './AuthStyles.css';

export default function Register({ onSuccess }) {
  const [form, setForm] = useState({ username: '', name: '', email: '', password: '' });
  const [register, { isLoading, error, isSuccess }] = useRegisterMutation();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register(form);
    if (result.data && onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Register</h2>
          <p>Create a new account to get started.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input 
              id="username"
              name="username" 
              placeholder="Choose a username" 
              value={form.username} 
              onChange={handleChange} 
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input 
              id="name"
              name="name" 
              placeholder="Enter your full name" 
              value={form.name} 
              onChange={handleChange} 
              required 
            />
          </div>
          
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
              placeholder="Create a password" 
              value={form.password} 
              onChange={handleChange} 
              required 
            />
          </div>
          
          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'Register'}
          </button>
          
          {isSuccess && <div className="success-message">Registration successful!</div>}
          {error && <div className="error-message">{error.data?.message || 'Registration failed'}</div>}
          
          <div className="auth-footer">
            <p>Already have an account? <button type="button" className="link-button" onClick={() => navigate('/login')}>Login</button></p>
          </div>
        </form>
      </div>
    </div>
  );
} 