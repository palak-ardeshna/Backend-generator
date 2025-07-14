import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware.js';
import express from 'express';

const router = express.Router();

// Public routes
// None for users - all require authentication

// Protected routes (require login)
router.get('/', authMiddleware, getAllUsers);
router.get('/:id', authMiddleware, getUserById);

// Admin only routes
router.post('/', authMiddleware, adminMiddleware, createUser);
router.put('/:id', authMiddleware, adminMiddleware, updateUser);
router.delete('/:id', authMiddleware, adminMiddleware, deleteUser);

export default router;