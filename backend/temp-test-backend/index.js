
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
      console.log(`Imported model: ${file}`);
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
      console.log(`Test server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
