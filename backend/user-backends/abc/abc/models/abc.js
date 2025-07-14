import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const abc = sequelize.define('abc', {
  ...getBaseFields(),
  abc: { type: DataTypes.STRING }
});

export default abc;
