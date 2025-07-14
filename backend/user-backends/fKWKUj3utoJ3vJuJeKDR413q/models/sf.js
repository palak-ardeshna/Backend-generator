import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const sf = sequelize.define('sf', {
  ...getBaseFields(),
  ew: { type: DataTypes.STRING }
});

export default sf;
