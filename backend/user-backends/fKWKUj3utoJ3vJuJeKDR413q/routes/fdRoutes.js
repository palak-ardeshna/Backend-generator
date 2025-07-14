import {
  getAllfds,
  getfdById,
  createfd,
  updatefd,
  deletefd,
} from '../controllers/fdController.js';
import { createCrudRoutes } from './commonCrudRoutes.js';

const router = createCrudRoutes({
  getAll: getAllfds,
  getById: getfdById,
  create: createfd,
  update: updatefd,
  remove: deletefd,
});

export default router;
