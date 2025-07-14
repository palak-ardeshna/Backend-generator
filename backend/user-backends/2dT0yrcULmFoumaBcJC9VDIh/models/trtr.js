import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const trtr = sequelize.define('trtr', {
  ...getBaseFields(),
  sdfsdfsdf: { type: DataTypes.STRING }
});

export default trtr;
