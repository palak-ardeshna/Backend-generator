import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const register = async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return sendError(res, { status: 400, message: error.message });
    const { username, name, email, password } = value;
    const existing = await User.findOne({ where: { email } });
    if (existing) return sendError(res, { status: 409, message: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, name, email, password: hashed });
    sendSuccess(res, { status: 201, message: 'User registered successfully', data: { id: user.id, username, name, email } });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return sendError(res, { status: 400, message: error.message });
    const { email, password } = value;
    const user = await User.findOne({ where: { email } });
    if (!user) return sendError(res, { status: 401, message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return sendError(res, { status: 401, message: 'Invalid password' });
    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    sendSuccess(res, { message: 'Login successful', data: { token, user: { id: user.id, username: user.username, name: user.name, email: user.email } } });
  } catch (e) {
    sendError(res, { message: 'Server error' });
  }
}; 