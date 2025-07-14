import {
  getAllqwes,
  getqweById,
  createqwe,
  updateqwe,
  deleteqwe,
} from '../controllers/qweController.js';
import { createCrudRoutes } from './commonCrudRoutes.js';

const router = createCrudRoutes({
  getAll: getAllqwes,
  getById: getqweById,
  create: createqwe,
  update: updateqwe,
  remove: deleteqwe,
});

export default router;
