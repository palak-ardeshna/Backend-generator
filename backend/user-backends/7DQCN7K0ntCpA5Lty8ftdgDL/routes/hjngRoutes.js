import {
  getAllhjngs,
  gethjngById,
  createhjng,
  updatehjng,
  deletehjng,
} from '../controllers/hjngController.js';
import { createCrudRoutes } from './commonCrudRoutes.js';

const router = createCrudRoutes({
  getAll: getAllhjngs,
  getById: gethjngById,
  create: createhjng,
  update: updatehjng,
  remove: deletehjng,
});

export default router;
