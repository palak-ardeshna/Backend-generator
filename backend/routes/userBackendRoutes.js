import express from 'express';
import {
  getUserBackends,
  getBackendById,
  createBackend,
  updateBackend,
  deleteBackend,
  generateModuleForBackend,
  exportBackend,
} from '../controllers/userBackendController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all backends for the current user
router.get('/', getUserBackends);

// Get a specific backend by ID
router.get('/:backendId', getBackendById);

// Create a new backend
router.post('/', createBackend);

// Update a backend
router.put('/:backendId', updateBackend);

// Delete a backend
router.delete('/:backendId', deleteBackend);

// Generate a module for a specific backend
router.post('/:backendId/modules', generateModuleForBackend);

// Export a backend as a ZIP file
router.get('/:backendId/export', exportBackend);

export default router; 