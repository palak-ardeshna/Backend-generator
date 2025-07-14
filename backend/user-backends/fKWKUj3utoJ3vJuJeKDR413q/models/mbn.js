import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const mbn = sequelize.define('mbn', {
  ...getBaseFields(),
  vncb: { type: DataTypes.STRING }
});

export default mbn;
