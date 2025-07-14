import {
  getAllqwewes,
  getqweweById,
  createqwewe,
  updateqwewe,
  deleteqwewe,
} from '../controllers/qweweController.js';
import { createCrudRoutes } from './commonCrudRoutes.js';

const router = createCrudRoutes({
  getAll: getAllqwewes,
  getById: getqweweById,
  create: createqwewe,
  update: updateqwewe,
  remove: deleteqwewe,
});

export default router;
