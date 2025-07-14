import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const asew = sequelize.define('asew', {
  ...getBaseFields(),
  sdfsdf: { type: DataTypes.STRING }
});

export default asew;
