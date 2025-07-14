import qwe from '../models/qwe.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import Joi from 'joi';
import { getPagination } from '../utils/pagination.js';

const qweSchema = Joi.object({
  fg: Joi.string().required()
});

const qweUpdateSchema = Joi.object({
  fg: Joi.string().optional()
});

const getAllqwes = async (req, res) => {
  try {
    const { limit, offset, page } = getPagination(req.query);
    const { count, rows: items } = await qwe.findAndCountAll({ limit, offset });
    sendSuccess(res, {
      message: 'qwes fetched successfully',
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

const getqweById = async (req, res) => {
  try {
    const item = await qwe.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'qwe not found' });
    }
    sendSuccess(res, { message: 'qwe fetched successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const createqwe = async (req, res) => {
  try {
    const { error, value } = qweSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    const item = await qwe.create(value);
    sendSuccess(res, { status: 201, message: 'qwe created successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const updateqwe = async (req, res) => {
  try {
    const item = await qwe.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'qwe not found' });
    }
    const { error, value } = qweUpdateSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    await item.update(value);
    sendSuccess(res, { message: 'qwe updated successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const deleteqwe = async (req, res) => {
  try {
    const item = await qwe.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'qwe not found' });
    }
    await item.destroy();
    sendSuccess(res, { message: 'qwe deleted successfully' });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

export {
  getAllqwes,
  getqweById,
  createqwe,
  updateqwe,
  deleteqwe,
};
