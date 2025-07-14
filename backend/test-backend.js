import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a temporary test backend
const TEST_DIR = path.join(__dirname, 'temp-test-backend');

// Create directory structure
if (fs.existsSync(TEST_DIR)) {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
}

fs.mkdirSync(TEST_DIR, { recursive: true });
fs.mkdirSync(path.join(TEST_DIR, 'models'), { recursive: true });
fs.mkdirSync(path.join(TEST_DIR, 'config'), { recursive: true });

// Create BaseModel.js
const baseModelContent = `
import { DataTypes } from 'sequelize';

export const getBaseFields = () => ({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});
`;

fs.writeFileSync(path.join(TEST_DIR, 'models', 'BaseModel.js'), baseModelContent);

// Create a test model
const testModelContent = `
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
`;

fs.writeFileSync(path.join(TEST_DIR, 'models', 'TestModel.js'), testModelContent);

// Create db.js
const dbConfigContent = `
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  'test_db',
  'root',
  '',
  {
    host: 'localhost',
    dialect: 'mysql',
    logging: false,
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

export { sequelize, connectDB };
`;

fs.writeFileSync(path.join(TEST_DIR, 'config', 'db.js'), dbConfigContent);

// Create index.js with the fixed import model code
const indexContent = `
import express from 'express';
import cors from 'cors';
import { connectDB, sequelize } from './config/db.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

dotenv.config();

const app = express();
const PORT = 5050;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Test backend is running' });
});

// Import all models dynamically
const importModels = async () => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const modelsDir = path.join(__dirname, 'models');
    
    // Get all model files
    const modelFiles = fs.readdirSync(modelsDir)
      .filter(file => file.endsWith('.js') && file !== 'BaseModel.js');
    
    // Import each model
    for (const file of modelFiles) {
      const modelPath = path.join(modelsDir, file);
      // Convert path to file URL for Windows compatibility
      const modelURL = pathToFileURL(modelPath).href;
      const modelModule = await import(modelURL);
      console.log(\`Imported model: \${file}\`);
    }
    
    return true;
  } catch (error) {
    console.error('Error importing models:', error);
    return false;
  }
};

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();
    
    // Import all models
    await importModels();
    
    // Sync models with database
    await sequelize.sync({ alter: true });
    
    app.listen(PORT, () => {
      console.log(\`Test server running on port \${PORT}\`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
`;

fs.writeFileSync(path.join(TEST_DIR, 'index.js'), indexContent);

// Create package.json
const packageJsonContent = `{
  "name": "test-backend",
  "version": "1.0.0",
  "description": "Test backend",
  "main": "index.js",
  "type": "module",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "sequelize": "^6.32.1",
    "mysql2": "^3.6.0"
  }
}`;

fs.writeFileSync(path.join(TEST_DIR, 'package.json'), packageJsonContent);

// Create .env file
const envContent = `PORT=5050
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=test_db
`;

fs.writeFileSync(path.join(TEST_DIR, '.env'), envContent);

console.log(`Test backend created at ${TEST_DIR}`);
console.log('To run the test backend:');
console.log(`cd ${TEST_DIR} && node index.js`); 