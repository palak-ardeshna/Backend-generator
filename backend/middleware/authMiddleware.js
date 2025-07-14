import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendError } from '../utils/responseHandler.js';

// Default JWT secret if not provided in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123456789';

// Protect routes - authentication middleware
export const authMiddleware = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Check if token exists
    if (!token) {
      return sendError(res, { 
        status: 401, 
        message: 'Not authorized, no token' 
      });
    }
    
    // Verify token with fallback secret
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from token
    const user = await User.findOne({ where: { id: decoded.id } });
    
    if (!user) {
      return sendError(res, { 
        status: 401, 
        message: 'Not authorized, user not found' 
      });
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    sendError(res, { 
      status: 401, 
      message: 'Not authorized, token failed' 
    });
  }
};

// Admin middleware - check if user is an admin
export const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    sendError(res, {
      status: 403,
      message: 'Not authorized as an admin'
    });
  }
}; 