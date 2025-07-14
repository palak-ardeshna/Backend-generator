import { DataTypes } from 'sequelize';
import generateId from '../utils/generateId.js';

function getBaseFields() {
  return {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: () => generateId(),
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  };
}

export { getBaseFields };