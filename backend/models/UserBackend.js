import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const UserBackend = sequelize.define('UserBackend', {
  ...getBaseFields(),
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dbType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'mysql',
  },
  dbConfig: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  modules: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },
  generatedModules: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: { generated: [] },
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active',
  },
});

export default UserBackend; 