import {
  getAllsfs,
  getsfById,
  createsf,
  updatesf,
  deletesf,
} from '../controllers/sfController.js';
import { createCrudRoutes } from './commonCrudRoutes.js';

const router = createCrudRoutes({
  getAll: getAllsfs,
  getById: getsfById,
  create: createsf,
  update: updatesf,
  remove: deletesf,
});

export default router;
