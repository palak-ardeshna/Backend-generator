import trtr from '../models/trtr.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import Joi from 'joi';
import { getPagination } from '../utils/pagination.js';

const trtrSchema = Joi.object({
  sdfsdfsdf: Joi.string().required()
});

const trtrUpdateSchema = Joi.object({
  sdfsdfsdf: Joi.string().optional()
});

const getAlltrtrs = async (req, res) => {
  try {
    const { limit, offset, page } = getPagination(req.query);
    const { count, rows: items } = await trtr.findAndCountAll({ limit, offset });
    sendSuccess(res, {
      message: 'trtrs fetched successfully',
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

const gettrtrById = async (req, res) => {
  try {
    const item = await trtr.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'trtr not found' });
    }
    sendSuccess(res, { message: 'trtr fetched successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const createtrtr = async (req, res) => {
  try {
    const { error, value } = trtrSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    const item = await trtr.create(value);
    sendSuccess(res, { status: 201, message: 'trtr created successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const updatetrtr = async (req, res) => {
  try {
    const item = await trtr.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'trtr not found' });
    }
    const { error, value } = trtrUpdateSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    await item.update(value);
    sendSuccess(res, { message: 'trtr updated successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const deletetrtr = async (req, res) => {
  try {
    const item = await trtr.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'trtr not found' });
    }
    await item.destroy();
    sendSuccess(res, { message: 'trtr deleted successfully' });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

export {
  getAlltrtrs,
  gettrtrById,
  createtrtr,
  updatetrtr,
  deletetrtr,
};
