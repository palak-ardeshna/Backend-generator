import qwewe from '../models/qwewe.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import Joi from 'joi';
import { getPagination } from '../utils/pagination.js';

const qweweSchema = Joi.object({
  fg: Joi.string().required()
});

const qweweUpdateSchema = Joi.object({
  fg: Joi.string().optional()
});

const getAllqwewes = async (req, res) => {
  try {
    const { limit, offset, page } = getPagination(req.query);
    const { count, rows: items } = await qwewe.findAndCountAll({ limit, offset });
    sendSuccess(res, {
      message: 'qwewes fetched successfully',
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

const getqweweById = async (req, res) => {
  try {
    const item = await qwewe.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'qwewe not found' });
    }
    sendSuccess(res, { message: 'qwewe fetched successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const createqwewe = async (req, res) => {
  try {
    const { error, value } = qweweSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    const item = await qwewe.create(value);
    sendSuccess(res, { status: 201, message: 'qwewe created successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const updateqwewe = async (req, res) => {
  try {
    const item = await qwewe.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'qwewe not found' });
    }
    const { error, value } = qweweUpdateSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    await item.update(value);
    sendSuccess(res, { message: 'qwewe updated successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const deleteqwewe = async (req, res) => {
  try {
    const item = await qwewe.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'qwewe not found' });
    }
    await item.destroy();
    sendSuccess(res, { message: 'qwewe deleted successfully' });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

export {
  getAllqwewes,
  getqweweById,
  createqwewe,
  updateqwewe,
  deleteqwewe,
};
