import fd from '../models/fd.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import Joi from 'joi';
import { getPagination } from '../utils/pagination.js';

const fdSchema = Joi.object({
  fd: Joi.string().required()
});

const fdUpdateSchema = Joi.object({
  fd: Joi.string().optional()
});

const getAllfds = async (req, res) => {
  try {
    const { limit, offset, page } = getPagination(req.query);
    const { count, rows: items } = await fd.findAndCountAll({ limit, offset });
    sendSuccess(res, {
      message: 'fds fetched successfully',
      data: {
        items,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const getfdById = async (req, res) => {
  try {
    const item = await fd.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'fd not found' });
    }
    sendSuccess(res, { message: 'fd fetched successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const createfd = async (req, res) => {
  try {
    const { error, value } = fdSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    const item = await fd.create(value);
    sendSuccess(res, { status: 201, message: 'fd created successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const updatefd = async (req, res) => {
  try {
    const item = await fd.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'fd not found' });
    }
    const { error, value } = fdUpdateSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    await item.update(value);
    sendSuccess(res, { message: 'fd updated successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const deletefd = async (req, res) => {
  try {
    const item = await fd.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'fd not found' });
    }
    await item.destroy();
    sendSuccess(res, { message: 'fd deleted successfully' });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

export {
  getAllfds,
  getfdById,
  createfd,
  updatefd,
  deletefd,
};
