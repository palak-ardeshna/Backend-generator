import hjng from '../models/hjng.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import Joi from 'joi';
import { getPagination } from '../utils/pagination.js';

const hjngSchema = Joi.object({
  ghgj: Joi.string().required()
});

const hjngUpdateSchema = Joi.object({
  ghgj: Joi.string().optional()
});

const getAllhjngs = async (req, res) => {
  try {
    const { limit, offset, page } = getPagination(req.query);
    const { count, rows: items } = await hjng.findAndCountAll({ limit, offset });
    sendSuccess(res, {
      message: 'hjngs fetched successfully',
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

const gethjngById = async (req, res) => {
  try {
    const item = await hjng.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'hjng not found' });
    }
    sendSuccess(res, { message: 'hjng fetched successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const createhjng = async (req, res) => {
  try {
    const { error, value } = hjngSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    const item = await hjng.create(value);
    sendSuccess(res, { status: 201, message: 'hjng created successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const updatehjng = async (req, res) => {
  try {
    const item = await hjng.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'hjng not found' });
    }
    const { error, value } = hjngUpdateSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    await item.update(value);
    sendSuccess(res, { message: 'hjng updated successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const deletehjng = async (req, res) => {
  try {
    const item = await hjng.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'hjng not found' });
    }
    await item.destroy();
    sendSuccess(res, { message: 'hjng deleted successfully' });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

export {
  getAllhjngs,
  gethjngById,
  createhjng,
  updatehjng,
  deletehjng,
};
