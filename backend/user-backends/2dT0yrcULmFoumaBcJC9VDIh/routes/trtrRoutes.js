import {
  getAlltrtrs,
  gettrtrById,
  createtrtr,
  updatetrtr,
  deletetrtr,
} from '../controllers/trtrController.js';
import { createCrudRoutes } from './commonCrudRoutes.js';

const router = createCrudRoutes({
  getAll: getAlltrtrs,
  getById: gettrtrById,
  create: createtrtr,
  update: updatetrtr,
  remove: deletetrtr,
});

export default router;
