import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const qwewe = sequelize.define('qwewe', {
  ...getBaseFields(),
  fg: { type: DataTypes.STRING }
});

export default qwewe;
