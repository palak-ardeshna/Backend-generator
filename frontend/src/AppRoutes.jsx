import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ApiGenerator from './pages/ApiGenerator';
import Users from './pages/Users';
import Register from './features/auth/Register';
import Login from './features/auth/Login';
import UserBackends from './pages/UserBackends';
import BackendDetail from './pages/BackendDetail';

export default function AppRoutes() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Restore user/token from localStorage on refresh
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    navigate('/login');
  };

  const handleRegisterSuccess = () => {
    navigate('/login');
  };

  const handleLoginSuccess = (user, token) => {
    setUser(user);
    setToken(token);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Navigate to dashboard by default
    navigate('/dashboard');
  };

  // Save current path to localStorage when it changes
  useEffect(() => {
    // Only save authenticated routes
    if (token && location.pathname !== '/login' && location.pathname !== '/register') {
      localStorage.setItem('lastPath', location.pathname);
    }
  }, [location.pathname, token]);

  // If not authenticated, only show Register or Login
  if (!token) {
    return (
      <Routes>
        <Route path="/register" element={<Register onSuccess={handleRegisterSuccess} />} />
        <Route path="/login" element={<Login onSuccess={handleLoginSuccess} />} />
        <Route path="*" element={<Navigate to="/register" replace />} />
      </Routes>
    );
  }

  // If authenticated, show main app with routes based on user role
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        {user.isAdmin && (
          <>
            <Route path="/api-generator" element={<ApiGenerator />} />
            <Route path="/users" element={<Users />} />
          </>
        )}
        <Route path="/backends" element={<UserBackends />} />
        <Route path="/backends/:backendId" element={<BackendDetail />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </MainLayout>
  );
} 