import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const ApiModule = sequelize.define('ApiModule', {
  ...getBaseFields(),
  moduleName: {
    type: DataTypes.STRING,
    allowNull: false,
    // Removed unique constraint to avoid hitting MySQL index limit
  },
  fields: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  apis: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: true,
    // Removed unique constraint to avoid hitting MySQL index limit
  }
});

export default ApiModule; 