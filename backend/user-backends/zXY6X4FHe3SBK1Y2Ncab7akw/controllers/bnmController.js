import bnm from '../models/bnm.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import Joi from 'joi';
import { getPagination } from '../utils/pagination.js';

const bnmSchema = Joi.object({
  vbnm: Joi.string().required()
});

const bnmUpdateSchema = Joi.object({
  vbnm: Joi.string().optional()
});

const getAllbnms = async (req, res) => {
  try {
    const { limit, offset, page } = getPagination(req.query);
    const { count, rows: items } = await bnm.findAndCountAll({ limit, offset });
    sendSuccess(res, {
      message: 'bnms fetched successfully',
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

const getbnmById = async (req, res) => {
  try {
    const item = await bnm.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'bnm not found' });
    }
    sendSuccess(res, { message: 'bnm fetched successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const createbnm = async (req, res) => {
  try {
    const { error, value } = bnmSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    const item = await bnm.create(value);
    sendSuccess(res, { status: 201, message: 'bnm created successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const updatebnm = async (req, res) => {
  try {
    const item = await bnm.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'bnm not found' });
    }
    const { error, value } = bnmUpdateSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    await item.update(value);
    sendSuccess(res, { message: 'bnm updated successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const deletebnm = async (req, res) => {
  try {
    const item = await bnm.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'bnm not found' });
    }
    await item.destroy();
    sendSuccess(res, { message: 'bnm deleted successfully' });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

export {
  getAllbnms,
  getbnmById,
  createbnm,
  updatebnm,
  deletebnm,
};
