import asew from '../models/asew.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import Joi from 'joi';
import { getPagination } from '../utils/pagination.js';

const asewSchema = Joi.object({
  sdfsdf: Joi.string().required()
});

const asewUpdateSchema = Joi.object({
  sdfsdf: Joi.string().optional()
});

const getAllasews = async (req, res) => {
  try {
    const { limit, offset, page } = getPagination(req.query);
    const { count, rows: items } = await asew.findAndCountAll({ limit, offset });
    sendSuccess(res, {
      message: 'asews fetched successfully',
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

const getasewById = async (req, res) => {
  try {
    const item = await asew.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'asew not found' });
    }
    sendSuccess(res, { message: 'asew fetched successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const createasew = async (req, res) => {
  try {
    const { error, value } = asewSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    const item = await asew.create(value);
    sendSuccess(res, { status: 201, message: 'asew created successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const updateasew = async (req, res) => {
  try {
    const item = await asew.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'asew not found' });
    }
    const { error, value } = asewUpdateSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    await item.update(value);
    sendSuccess(res, { message: 'asew updated successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const deleteasew = async (req, res) => {
  try {
    const item = await asew.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'asew not found' });
    }
    await item.destroy();
    sendSuccess(res, { message: 'asew deleted successfully' });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

export {
  getAllasews,
  getasewById,
  createasew,
  updateasew,
  deleteasew,
};
