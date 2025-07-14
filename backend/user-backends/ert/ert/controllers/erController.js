import er from '../models/er.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import Joi from 'joi';
import { getPagination } from '../utils/pagination.js';

const erSchema = Joi.object({
  errrr: Joi.string().required()
});

const erUpdateSchema = Joi.object({
  errrr: Joi.string().optional()
});

const getAllers = async (req, res) => {
  try {
    const { limit, offset, page } = getPagination(req.query);
    const { count, rows: items } = await er.findAndCountAll({ limit, offset });
    sendSuccess(res, {
      message: 'ers fetched successfully',
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

const geterById = async (req, res) => {
  try {
    const item = await er.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'er not found' });
    }
    sendSuccess(res, { message: 'er fetched successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const createer = async (req, res) => {
  try {
    const { error, value } = erSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    const item = await er.create(value);
    sendSuccess(res, { status: 201, message: 'er created successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const updateer = async (req, res) => {
  try {
    const item = await er.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'er not found' });
    }
    const { error, value } = erUpdateSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    await item.update(value);
    sendSuccess(res, { message: 'er updated successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const deleteer = async (req, res) => {
  try {
    const item = await er.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'er not found' });
    }
    await item.destroy();
    sendSuccess(res, { message: 'er deleted successfully' });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

export {
  getAllers,
  geterById,
  createer,
  updateer,
  deleteer,
};
