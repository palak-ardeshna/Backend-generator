import {
  getAllmbns,
  getmbnById,
  creatembn,
  updatembn,
  deletembn,
} from '../controllers/mbnController.js';
import { createCrudRoutes } from './commonCrudRoutes.js';

const router = createCrudRoutes({
  getAll: getAllmbns,
  getById: getmbnById,
  create: creatembn,
  update: updatembn,
  remove: deletembn,
});

export default router;
