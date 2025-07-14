import {
  getAllasews,
  getasewById,
  createasew,
  updateasew,
  deleteasew,
} from '../controllers/asewController.js';
import { createCrudRoutes } from './commonCrudRoutes.js';

const router = createCrudRoutes({
  getAll: getAllasews,
  getById: getasewById,
  create: createasew,
  update: updateasew,
  remove: deleteasew,
});

export default router;
