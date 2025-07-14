import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import Joi from 'joi';
import { getPagination } from '../utils/pagination.js';

const userSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  isAdmin: Joi.boolean().optional(),
});

const userUpdateSchema = Joi.object({
  username: Joi.string().min(3).max(30).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
  isAdmin: Joi.boolean().optional(),
});

const getAllUsers = async (req, res) => {
  try {
    const { limit, offset, page } = getPagination(req.query);
    const { count, rows: users } = await User.findAndCountAll({ limit, offset });
    sendSuccess(res, {
      message: 'Users fetched successfully',
      data: {
        users,
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

const getUserById = async (req, res) => {
  try {
    const u = await User.findByPk(req.params.id);
    if (!u) {
      return sendError(res, { status: 404, message: 'User not found' });
    }
    sendSuccess(res, { message: 'User fetched successfully', data: u });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const createUser = async (req, res) => {
  try {
    const { error, value } = userSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    const { username, email, password, isAdmin } = value;
    const u = await User.create({
      username,
      email,
      password,
      isAdmin: isAdmin || false,
    });
    sendSuccess(res, { status: 201, message: 'User created successfully', data: u });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const u = await User.findByPk(req.params.id);
    if (!u) {
      return sendError(res, { status: 404, message: 'User not found' });
    }
    const { error, value } = userUpdateSchema.validate(req.body);
    if (error) {
      return sendError(res, { status: 400, message: error.message });
    }
    const { username, email, password, isAdmin } = value;
    await u.update({
      username: username !== undefined ? username : u.username,
      email: email !== undefined ? email : u.email,
      password: password !== undefined ? password : u.password,
      isAdmin: isAdmin !== undefined ? isAdmin : u.isAdmin,
    });
    sendSuccess(res, { message: 'User updated successfully', data: u });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const u = await User.findByPk(req.params.id);
    if (!u) {
      return sendError(res, { status: 404, message: 'User not found' });
    }
    await u.destroy();
    sendSuccess(res, { message: 'User deleted successfully' });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

import bcrypt from 'bcryptjs';

const createDefaultUser = async () => {
  try {
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        isAdmin: true,
      });
      console.log('Default admin user created successfully');
    } else {
      console.log('Default admin user already exists');
    }
  } catch (e) {
    console.error('Error creating default user:', e);
  }
};

export {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  createDefaultUser,
};