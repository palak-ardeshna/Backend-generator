import { useState, useEffect } from 'react';
import { useCreateUserMutation, useUpdateUserMutation } from '../features/users/usersApi';
import './UserForm.css';

export default function UserForm({ user, onClose }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    isAdmin: false,
  });
  
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [errors, setErrors] = useState({});
  
  // If user is provided, we're in edit mode
  const isEditMode = !!user;
  
  useEffect(() => {
    if (isEditMode && user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        password: '', // Don't populate password in edit mode
        isAdmin: user.isAdmin || false,
      });
    }
  }, [user, isEditMode]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    // Only validate password for new users or if a password is provided
    if (!isEditMode || formData.password) {
      if (!isEditMode && !formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password && formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      if (isEditMode) {
        // Only include password if it's provided
        const userData = { ...formData };
        if (!userData.password) {
          delete userData.password;
        }
        
        await updateUser({ id: user.id, ...userData }).unwrap();
      } else {
        await createUser(formData).unwrap();
      }
      
      onClose();
    } catch (err) {
      console.error('Failed to save user:', err);
      
      // Handle API validation errors
      if (err.data?.errors) {
        setErrors(err.data.errors);
      } else {
        setErrors({ form: err.data?.message || 'Failed to save user' });
      }
    }
  };
  
  return (
    <form className="user-form" onSubmit={handleSubmit}>
      {errors.form && <div className="form-error">{errors.form}</div>}
      
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          className={errors.username ? 'error' : ''}
        />
        {errors.username && <div className="field-error">{errors.username}</div>}
      </div>
      
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={errors.email ? 'error' : ''}
        />
        {errors.email && <div className="field-error">{errors.email}</div>}
      </div>
      
      <div className="form-group">
        <label htmlFor="password">
          {isEditMode ? 'Password (leave blank to keep current)' : 'Password'}
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className={errors.password ? 'error' : ''}
        />
        {errors.password && <div className="field-error">{errors.password}</div>}
      </div>
      
      <div className="form-group checkbox">
        <input
          type="checkbox"
          id="isAdmin"
          name="isAdmin"
          checked={formData.isAdmin}
          onChange={handleChange}
        />
        <label htmlFor="isAdmin">Admin User</label>
      </div>
      
      <div className="form-actions">
        <button type="button" onClick={onClose} disabled={isCreating || isUpdating}>
          Cancel
        </button>
        <button 
          type="submit" 
          className="save-btn" 
          disabled={isCreating || isUpdating}
        >
          {isCreating || isUpdating ? 'Saving...' : isEditMode ? 'Update User' : 'Create User'}
        </button>
      </div>
    </form>
  );
} 