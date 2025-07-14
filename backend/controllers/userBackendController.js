import UserBackend from '../models/UserBackend.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { getPagination } from '../utils/pagination.js';
import Joi from 'joi';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import archiver from 'archiver';
import { fileURLToPath, pathToFileURL } from 'url';

// Base directory for user backends
const USER_BACKENDS_DIR = path.join(process.cwd(), 'user-backends');

// Create directory if it doesn't exist
if (!fs.existsSync(USER_BACKENDS_DIR)) {
  fs.mkdirSync(USER_BACKENDS_DIR, { recursive: true });
}

const backendSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('', null),
  dbType: Joi.string().valid('mysql', 'postgres', 'sqlite', 'mongodb').default('mysql'),
  dbConfig: Joi.object({
    host: Joi.string().default('localhost'),
    port: Joi.number(),
    database: Joi.string(),
    username: Joi.string(),
    password: Joi.string().allow('', null),
  }).allow(null),
  settings: Joi.object().allow(null),
});

const moduleSchema = Joi.object({
  moduleName: Joi.string().required(),
  fields: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      type: Joi.string().required(),
      unique: Joi.boolean().default(false),
    })
  ).required(),
  apis: Joi.object({
    post: Joi.boolean().default(true),
    get: Joi.boolean().default(true),
    getById: Joi.boolean().default(true),
    put: Joi.boolean().default(true),
    delete: Joi.boolean().default(true),
  }).default({
    post: true,
    get: true,
    getById: true,
    put: true,
    delete: true,
  }),
});

// Get all backends for the current user
export const getUserBackends = async (req, res) => {
  try {
    const { limit, offset, page } = getPagination(req.query);
    
    // Filter by user ID
    const whereCondition = req.user.isAdmin 
      ? {} 
      : { userId: req.user.id };
    
    const { count, rows: backends } = await UserBackend.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });
    
    sendSuccess(res, {
      message: 'Backends fetched successfully',
      data: {
        backends,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error('Error fetching backends:', err);
    sendError(res, { message: 'Failed to fetch backends', error: err.message });
  }
};

// Get a specific backend by ID
export const getBackendById = async (req, res) => {
  try {
    const { backendId } = req.params;
    
    const backend = await UserBackend.findOne({
      where: {
        id: backendId,
        ...(req.user.isAdmin ? {} : { userId: req.user.id }),
      },
    });
    
    if (!backend) {
      return sendError(res, { 
        status: 404, 
        message: 'Backend not found or you do not have access' 
      });
    }
    
    // Synchronize database with file system
    await syncBackendWithFileSystem(backend);
    
    sendSuccess(res, {
      message: 'Backend fetched successfully',
      data: backend,
    });
  } catch (err) {
    console.error('Error fetching backend:', err);
    sendError(res, { message: 'Failed to fetch backend', error: err.message });
  }
};

// Synchronize database with file system
const syncBackendWithFileSystem = async (backend) => {
  try {
    const backendDir = path.join(USER_BACKENDS_DIR, backend.id);
    
    // Check if backend directory exists
    if (!fs.existsSync(backendDir)) {
      return;
    }
    
    // Read modules.json and generatedModules.json from file system
    const modulesPath = path.join(backendDir, 'modules.json');
    const generatedModulesPath = path.join(backendDir, 'generatedModules.json');
    
    let modules = {};
    let generatedModules = { generated: [] };
    
    if (fs.existsSync(modulesPath)) {
      modules = JSON.parse(fs.readFileSync(modulesPath, 'utf-8'));
    }
    
    if (fs.existsSync(generatedModulesPath)) {
      generatedModules = JSON.parse(fs.readFileSync(generatedModulesPath, 'utf-8'));
    }
    
    // Update backend in database
    backend.modules = modules;
    backend.generatedModules = generatedModules;
    await backend.save();
    
    return backend;
  } catch (error) {
    console.error('Error synchronizing backend with file system:', error);
    throw error;
  }
};

// Create a new backend
export const createBackend = async (req, res) => {
  try {
    const { error, value } = backendSchema.validate(req.body);
    
    if (error) {
      return sendError(res, { 
        status: 400, 
        message: 'Invalid input', 
        error: error.message 
      });
    }
    
    const { name, description, dbType, dbConfig, settings } = value;
    
    // Create backend in database
    const backend = await UserBackend.create({
      name,
      description,
      dbType,
      dbConfig: JSON.stringify(dbConfig),
      settings,
      userId: req.user.id,
    });
    
    // Create directory for this backend
    const backendDir = path.join(USER_BACKENDS_DIR, backend.id);
    fs.mkdirSync(backendDir, { recursive: true });
    
    // Create basic structure
    const dirs = [
      'models',
      'controllers',
      'routes',
      'middleware',
      'utils',
      'config',
    ];
    
    dirs.forEach(dir => {
      fs.mkdirSync(path.join(backendDir, dir), { recursive: true });
    });
    
    // Generate a random 32-character JWT token
    const generateRandomToken = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let token = '';
      for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return token;
    };
    
    const jwtToken = generateRandomToken();
    
    // Create basic files
    // package.json
    const packageJson = {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: description || `Backend API for ${name}`,
      main: 'index.js',
      type: 'module',
      scripts: {
        start: 'node index.js',
        dev: 'nodemon index.js',
      },
      dependencies: {
        express: '^4.18.2',
        cors: '^2.8.5',
        'dotenv': '^16.3.1',
        'joi': '^17.9.2',
        'sequelize': '^6.32.1',
        [dbType === 'mysql' ? 'mysql2' : dbType]: '^3.6.0',
        'bcryptjs': '^2.4.3',
        'jsonwebtoken': '^9.0.1',
      },
      devDependencies: {
        'nodemon': '^3.0.1',
      },
    };
    
    fs.writeFileSync(
      path.join(backendDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // .env file
    const envContent = `PORT=5000
DB_HOST=${dbConfig?.host || 'localhost'}
DB_USER=${dbConfig?.username || 'root'}
DB_PASSWORD=${dbConfig?.password || ''}
DB_NAME=${dbConfig?.database || name.toLowerCase().replace(/\s+/g, '_')}
JWT_SECRET=${jwtToken}
`;
    
    fs.writeFileSync(path.join(backendDir, '.env'), envContent);
    
    // Create empty modules.json and generatedModules.json
    fs.writeFileSync(
      path.join(backendDir, 'modules.json'),
      JSON.stringify({}, null, 2)
    );
    
    fs.writeFileSync(
      path.join(backendDir, 'generatedModules.json'),
      JSON.stringify({ generated: [] }, null, 2)
    );
    
    // Create basic utility files
    // Copy the existing utility files from the main backend
    const utilsFiles = [
      'generateId.js',
      'pagination.js',
      'responseHandler.js',
    ];
    
    utilsFiles.forEach(file => {
      const sourcePath = path.join(process.cwd(), 'utils', file);
      const destPath = path.join(backendDir, 'utils', file);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
      }
    });
    
    // Create basic model files
    const baseModelContent = fs.readFileSync(
      path.join(process.cwd(), 'models', 'BaseModel.js'),
      'utf-8'
    );
    
    fs.writeFileSync(
      path.join(backendDir, 'models', 'BaseModel.js'),
      baseModelContent
    );
    
    // Create db.js config
    const dbConfigContent = `import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || '${dbConfig?.database || name.toLowerCase().replace(/\s+/g, '_')}',
  process.env.DB_USER || '${dbConfig?.username || 'root'}',
  process.env.DB_PASSWORD || '${dbConfig?.password || ''}',
  {
    host: process.env.DB_HOST || '${dbConfig?.host || 'localhost'}',
    dialect: '${dbType === 'postgres' ? 'postgres' : 'mysql'}',
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
    
    fs.writeFileSync(
      path.join(backendDir, 'config', 'db.js'),
      dbConfigContent
    );
    
    // Create index.js
    const indexContent = `import express from 'express';
import cors from 'cors';
import { connectDB, sequelize } from './config/db.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to ${name} API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
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
      console.log(\`Server running on port \${PORT}\`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
`;
    
    fs.writeFileSync(
      path.join(backendDir, 'index.js'),
      indexContent
    );
    
    // Copy generateCrud.js
    const generateCrudContent = fs.readFileSync(
      path.join(process.cwd(), 'generateCrud.js'),
      'utf-8'
    );
    
    fs.writeFileSync(
      path.join(backendDir, 'generateCrud.js'),
      generateCrudContent
    );
    
    sendSuccess(res, {
      status: 201,
      message: 'Backend created successfully',
      data: backend,
    });
  } catch (err) {
    console.error('Error creating backend:', err);
    sendError(res, { message: 'Failed to create backend', error: err.message });
  }
};

// Update a backend
export const updateBackend = async (req, res) => {
  try {
    const { backendId } = req.params;
    
    const backend = await UserBackend.findOne({
      where: {
        id: backendId,
        ...(req.user.isAdmin ? {} : { userId: req.user.id }),
      },
    });
    
    if (!backend) {
      return sendError(res, { 
        status: 404, 
        message: 'Backend not found or you do not have access' 
      });
    }
    
    const { error, value } = backendSchema.validate(req.body);
    
    if (error) {
      return sendError(res, { 
        status: 400, 
        message: 'Invalid input', 
        error: error.message 
      });
    }
    
    const { name, description, dbType, dbConfig, settings } = value;
    
    // Update backend in database
    await backend.update({
      name,
      description,
      dbType,
      dbConfig: JSON.stringify(dbConfig),
      settings,
    });
    
    // Generate a random 32-character JWT token
    const generateRandomToken = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let token = '';
      for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return token;
    };
    
    const jwtToken = generateRandomToken();
    
    // Update .env file
    const backendDir = path.join(USER_BACKENDS_DIR, backend.id);
    const envContent = `PORT=5000
DB_HOST=${dbConfig?.host || 'localhost'}
DB_USER=${dbConfig?.username || 'root'}
DB_PASSWORD=${dbConfig?.password || ''}
DB_NAME=${dbConfig?.database || name.toLowerCase().replace(/\s+/g, '_')}
JWT_SECRET=${jwtToken}
`;
    
    fs.writeFileSync(path.join(backendDir, '.env'), envContent);
    
    // Update db.js config
    const dbConfigContent = `import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || '${dbConfig?.database || name.toLowerCase().replace(/\s+/g, '_')}',
  process.env.DB_USER || '${dbConfig?.username || 'root'}',
  process.env.DB_PASSWORD || '${dbConfig?.password || ''}',
  {
    host: process.env.DB_HOST || '${dbConfig?.host || 'localhost'}',
    dialect: '${dbType === 'postgres' ? 'postgres' : 'mysql'}',
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
    
    fs.writeFileSync(
      path.join(backendDir, 'config', 'db.js'),
      dbConfigContent
    );
    
    // Update index.js
    const indexContent = `import express from 'express';
import cors from 'cors';
import { connectDB, sequelize } from './config/db.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to ${name} API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
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
      console.log(\`Server running on port \${PORT}\`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
`;
    
    fs.writeFileSync(
      path.join(backendDir, 'index.js'),
      indexContent
    );
    
    sendSuccess(res, {
      message: 'Backend updated successfully',
      data: backend,
    });
  } catch (err) {
    console.error('Error updating backend:', err);
    sendError(res, { message: 'Failed to update backend', error: err.message });
  }
};

// Delete a backend
export const deleteBackend = async (req, res) => {
  try {
    const { backendId } = req.params;
    
    const backend = await UserBackend.findOne({
      where: {
        id: backendId,
        ...(req.user.isAdmin ? {} : { userId: req.user.id }),
      },
    });
    
    if (!backend) {
      return sendError(res, { 
        status: 404, 
        message: 'Backend not found or you do not have access' 
      });
    }
    
    // Delete backend directory
    const backendDir = path.join(USER_BACKENDS_DIR, backend.id);
    if (fs.existsSync(backendDir)) {
      fs.rmSync(backendDir, { recursive: true, force: true });
    }
    
    // Delete backend from database
    await backend.destroy();
    
    sendSuccess(res, {
      message: 'Backend deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting backend:', err);
    sendError(res, { message: 'Failed to delete backend', error: err.message });
  }
};

// Generate a module for a specific backend
export const generateModuleForBackend = async (req, res) => {
  try {
    const { backendId } = req.params;
    
    const backend = await UserBackend.findOne({
      where: {
        id: backendId,
        ...(req.user.isAdmin ? {} : { userId: req.user.id }),
      },
    });
    
    if (!backend) {
      return sendError(res, { 
        status: 404, 
        message: 'Backend not found or you do not have access' 
      });
    }
    
    // Synchronize database with file system before checking if module exists
    await syncBackendWithFileSystem(backend);
    
    const { error, value } = moduleSchema.validate(req.body);
    
    if (error) {
      return sendError(res, { 
        status: 400, 
        message: 'Invalid input', 
        error: error.message 
      });
    }
    
    const { moduleName, fields, apis } = value;
    
    // Get the backend directory
    const backendDir = path.join(USER_BACKENDS_DIR, backend.id);
    
    // Check if the module already exists in generatedModules
    const generatedModulesPath = path.join(backendDir, 'generatedModules.json');
    let generatedModules = { generated: [] };
    
    if (fs.existsSync(generatedModulesPath)) {
      generatedModules = JSON.parse(fs.readFileSync(generatedModulesPath, 'utf-8'));
    }
    
    if (generatedModules.generated.includes(moduleName)) {
      return sendError(res, { 
        status: 400, 
        message: `Module ${moduleName} already exists` 
      });
    }
    
    // Update modules.json
    const modulesPath = path.join(backendDir, 'modules.json');
    let modules = {};
    
    if (fs.existsSync(modulesPath)) {
      modules = JSON.parse(fs.readFileSync(modulesPath, 'utf-8'));
    }
    
    // Build fields object for modules.json
    const fieldsObj = {};
    fields.forEach(f => {
      fieldsObj[f.name] = { type: f.type };
      if (f.unique) fieldsObj[f.name].unique = true;
    });
    
    // Add to modules.json
    modules[moduleName] = { 
      fields: fieldsObj, 
      apis,
      userId: req.user.id
    };
    
    fs.writeFileSync(modulesPath, JSON.stringify(modules, null, 2));
    
    // Run the generator script
    const generateCrudScript = path.join(backendDir, 'generateCrud.js');
    
    // We need to run the script in the context of the backend directory
    exec(`cd "${backendDir}" && node "${generateCrudScript}"`, (err, stdout, stderr) => {
      if (err) {
        console.error('Error generating module:', stderr);
        return sendError(res, { 
          status: 500, 
          message: 'Failed to generate module', 
          error: stderr 
        });
      }
      
      console.log('Module generation output:', stdout);
      
      // Update backend in database
      const backendModules = backend.modules || {};
      backendModules[moduleName] = {
        fields,
        apis,
      };
      
      backend.modules = backendModules;
      
      const backendGeneratedModules = backend.generatedModules || { generated: [] };
      backendGeneratedModules.generated = [
        ...backendGeneratedModules.generated,
        moduleName,
      ];
      
      backend.generatedModules = backendGeneratedModules;
      
      backend.save().then(() => {
        sendSuccess(res, {
          message: `Module ${moduleName} generated successfully`,
          data: {
            moduleName,
            fields,
            apis,
          },
        });
      }).catch(saveErr => {
        console.error('Error saving backend:', saveErr);
        sendError(res, { 
          message: 'Module generated but failed to update backend', 
          error: saveErr.message 
        });
      });
    });
  } catch (err) {
    console.error('Error generating module:', err);
    sendError(res, { message: 'Failed to generate module', error: err.message });
  }
};

// Export a backend as a ZIP file
export const exportBackend = async (req, res) => {
  try {
    const { backendId } = req.params;
    
    const backend = await UserBackend.findOne({
      where: {
        id: backendId,
        ...(req.user.isAdmin ? {} : { userId: req.user.id }),
      },
    });
    
    if (!backend) {
      return sendError(res, { 
        status: 404, 
        message: 'Backend not found or you do not have access' 
      });
    }
    
    const backendDir = path.join(USER_BACKENDS_DIR, backend.id);
    
    if (!fs.existsSync(backendDir)) {
      return sendError(res, { 
        status: 404, 
        message: 'Backend directory not found' 
      });
    }
    
    // Parse dbConfig if it's a string
    let dbConfig = backend.dbConfig;
    if (typeof dbConfig === 'string') {
      try {
        dbConfig = JSON.parse(dbConfig);
      } catch (err) {
        console.error('Error parsing dbConfig:', err);
        dbConfig = {};
      }
    }
    
    // Generate a random 32-character JWT token
    const generateRandomToken = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let token = '';
      for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return token;
    };
    
    const jwtToken = generateRandomToken();
    
    // Update .env file with correct database name and JWT token
    const envContent = `PORT=5000
DB_HOST=${dbConfig?.host || 'localhost'}
DB_USER=${dbConfig?.username || 'root'}
DB_PASSWORD=${dbConfig?.password || ''}
DB_NAME=${dbConfig?.database || backend.name.toLowerCase().replace(/\s+/g, '_')}
JWT_SECRET=${jwtToken}
`;
    
    fs.writeFileSync(path.join(backendDir, '.env'), envContent);
    
    // Update index.js
    const indexContent = `import express from 'express';
import cors from 'cors';
import { connectDB, sequelize } from './config/db.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to ${backend.name} API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
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
      console.log(\`Server running on port \${PORT}\`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
`;
    
    fs.writeFileSync(
      path.join(backendDir, 'index.js'),
      indexContent
    );
    
    // Create a ZIP archive
    const zipFileName = `${backend.name.toLowerCase().replace(/\s+/g, '-')}-backend.zip`;
    const zipFilePath = path.join(process.cwd(), 'temp', zipFileName);
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
    }
    
    // Create a write stream for the ZIP file
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });
    
    // Pipe the archive to the file
    archive.pipe(output);
    
    // Add the backend directory to the archive
    archive.directory(backendDir, false);
    
    // Finalize the archive
    await archive.finalize();
    
    // Wait for the archive to be written
    output.on('close', () => {
      // Set headers for file download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);
      
      // Stream the file to the response
      const fileStream = fs.createReadStream(zipFilePath);
      fileStream.pipe(res);
      
      // Delete the file after sending
      fileStream.on('close', () => {
        fs.unlinkSync(zipFilePath);
      });
    });
  } catch (err) {
    console.error('Error exporting backend:', err);
    sendError(res, { message: 'Failed to export backend', error: err.message });
  }
};