import {
  getAllbnms,
  getbnmById,
  createbnm,
  updatebnm,
  deletebnm,
} from '../controllers/bnmController.js';
import { createCrudRoutes } from './commonCrudRoutes.js';

const router = createCrudRoutes({
  getAll: getAllbnms,
  getById: getbnmById,
  create: createbnm,
  update: updatebnm,
  remove: deletebnm,
});

export default router;
