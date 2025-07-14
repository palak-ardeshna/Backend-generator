import sf from '../models/sf.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import Joi from 'joi';
import { getPagination } from '../utils/pagination.js';

const sfSchema = Joi.object({
  ew: Joi.string().required()
});

const sfUpdateSchema = Joi.object({
  ew: Joi.string().optional()
});

const getAllsfs = async (req, res) => {
  try {
    const { limit, offset, page } = getPagination(req.query);
    const { count, rows: items } = await sf.findAndCountAll({ limit, offset });
    sendSuccess(res, {
      message: 'sfs fetched successfully',
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

const getsfById = async (req, res) => {
  try {
    const item = await sf.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'sf not found' });
    }
    sendSuccess(res, { message: 'sf fetched successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const createsf = async (req, res) => {
  try {
    const { error, value } = sfSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    const item = await sf.create(value);
    sendSuccess(res, { status: 201, message: 'sf created successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const updatesf = async (req, res) => {
  try {
    const item = await sf.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'sf not found' });
    }
    const { error, value } = sfUpdateSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    await item.update(value);
    sendSuccess(res, { message: 'sf updated successfully', data: item });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const deletesf = async (req, res) => {
  try {
    const item = await sf.findByPk(req.params.id);
    if (!item) {
      return sendError(res, { status: 404, message: 'sf not found' });
    }
    await item.destroy();
    sendSuccess(res, { message: 'sf deleted successfully' });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

export {
  getAllsfs,
  getsfById,
  createsf,
  updatesf,
  deletesf,
};
