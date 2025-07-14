import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const bnm = sequelize.define('bnm', {
  ...getBaseFields(),
  vbnm: { type: DataTypes.STRING }
});

export default bnm;
