import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  // For now, always allow (replace with real auth logic)
  const isAuthenticated = true; // Replace with: useSelector(state => state.auth.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" />;
} 