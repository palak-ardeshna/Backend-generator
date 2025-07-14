import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const User = sequelize.define('User', {
  ...getBaseFields(),
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    // Removed unique constraint to avoid hitting MySQL index limit
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    // Removed unique constraint to avoid hitting MySQL index limit
    
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

export default User;