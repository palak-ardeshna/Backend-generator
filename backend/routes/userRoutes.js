import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import express from 'express';

const router = express.Router();

// Public routes
// None for users - all require authentication

// Protected routes (require login)
router.get('/', protect, getAllUsers);
router.get('/:id', protect, getUserById);

// Admin only routes
router.post('/', protect, admin, createUser);
router.put('/:id', protect, admin, updateUser);
router.delete('/:id', protect, admin, deleteUser);

export default router;