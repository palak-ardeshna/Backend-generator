import jwt from 'jsonwebtoken';
import { sendError } from '../utils/responseHandler.js';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware to protect routes - requires a valid JWT token
export const protect = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return sendError(res, { 
        status: 401, 
        message: 'Not authorized, no token provided' 
      });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user from the token
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });
      
      if (!user) {
        return sendError(res, { 
          status: 401, 
          message: 'Not authorized, user not found' 
        });
      }
      
      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      return sendError(res, { 
        status: 401, 
        message: 'Not authorized, token failed' 
      });
    }
  } catch (error) {
    return sendError(res, { 
      status: 500, 
      message: 'Server error in authentication' 
    });
  }
};

// Middleware to restrict routes to admin users only
export const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    return sendError(res, { 
      status: 403, 
      message: 'Not authorized as an admin' 
    });
  }
}; 