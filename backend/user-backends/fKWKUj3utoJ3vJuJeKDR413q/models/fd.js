import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const fd = sequelize.define('fd', {
  ...getBaseFields(),
  fd: { type: DataTypes.STRING }
});

export default fd;
