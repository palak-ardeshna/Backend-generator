import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const er = sequelize.define('er', {
  ...getBaseFields(),
  errrr: { type: DataTypes.STRING }
});

export default er;
