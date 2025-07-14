
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const TestModel = sequelize.define('TestModel', {
  ...getBaseFields(),
  name: { 
    type: DataTypes.STRING 
  },
  description: { 
    type: DataTypes.TEXT 
  }
});

export default TestModel;
