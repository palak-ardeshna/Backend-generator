import express from 'express';

function createCrudRoutes({ getAll, getById, create, update, remove }) {
  const router = express.Router();
  if (getAll) router.get('/', getAll);
  if (getById) router.get('/:id', getById);
  if (create) router.post('/', create);
  if (update) router.put('/:id', update);
  if (remove) router.delete('/:id', remove);
  return router;
}

export { createCrudRoutes };