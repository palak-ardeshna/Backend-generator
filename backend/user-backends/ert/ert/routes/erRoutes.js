import {
  getAllers,
  geterById,
  createer,
  updateer,
  deleteer,
} from '../controllers/erController.js';
import { createCrudRoutes } from './commonCrudRoutes.js';

const router = createCrudRoutes({
  getAll: getAllers,
  getById: geterById,
  create: createer,
  update: updateer,
  remove: deleteer,
});

export default router;
