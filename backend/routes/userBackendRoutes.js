import express from 'express';
import { 
  getUserBackends, 
  getBackendById, 
  createBackend, 
  updateBackend, 
  deleteBackend, 
  generateModuleForBackend,
  exportBackend,
  migrateToUltraMinimal,
  deleteModuleFromBackend,
  updateModuleInBackend
} from '../controllers/userBackendController.js';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all backends for current user
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

// Update a module in a specific backend
router.put('/:backendId/modules/:moduleName', updateModuleInBackend);

// Delete a module from a specific backend
router.delete('/:backendId/modules/:moduleName', deleteModuleFromBackend);

// Export a backend as a ZIP file
router.get('/:backendId/export', exportBackend);

// Migrate backends to ultra-minimal format (admin only)
router.post('/migrate-to-minimal', adminMiddleware, migrateToUltraMinimal);

export default router; 