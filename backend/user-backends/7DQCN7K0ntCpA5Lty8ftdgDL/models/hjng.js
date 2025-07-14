import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const hjng = sequelize.define('hjng', {
  ...getBaseFields(),
  ghgj: { type: DataTypes.STRING }
});

export default hjng;
