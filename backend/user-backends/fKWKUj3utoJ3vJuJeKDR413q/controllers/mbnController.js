import mbn from '../models/mbn.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import Joi from 'joi';
import { getPagination } from '../utils/pagination.js';

const mbnSchema = Joi.object({
  vncb: Joi.string().required()
});

const mbnUpdateSchema = Joi.object({
  vncb: Joi.string().optional()
});

const getAllmbns = async (req, res) => {
  try {
    const { limit, offset, page } = getPagination(req.query);
    const { count, rows: items } = await mbn.findAndCountAll({ limit, offset });
    sendSuccess(res, {
      message: 'mbns fetched successfully',
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

const getmbnById = async (req, res) => {
  try {
    const item = await mbn.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'mbn not found' });
    }
    sendSuccess(res, { message: 'mbn fetched successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const creatembn = async (req, res) => {
  try {
    const { error, value } = mbnSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    const item = await mbn.create(value);
    sendSuccess(res, { status: 201, message: 'mbn created successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const updatembn = async (req, res) => {
  try {
    const item = await mbn.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'mbn not found' });
    }
    const { error, value } = mbnUpdateSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    await item.update(value);
    sendSuccess(res, { message: 'mbn updated successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const deletembn = async (req, res) => {
  try {
    const item = await mbn.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'mbn not found' });
    }
    await item.destroy();
    sendSuccess(res, { message: 'mbn deleted successfully' });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

export {
  getAllmbns,
  getmbnById,
  creatembn,
  updatembn,
  deletembn,
};
