import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const qwe = sequelize.define('qwe', {
  ...getBaseFields(),
  fg: { type: DataTypes.STRING }
});

export default qwe;
