import UserBackend from '../models/UserBackend.js';
import User from '../models/User.js';
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

// Helper function to get backend directory path
const getBackendDir = async (userId, backendName) => {
  try {
    // Find user to get username
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    
    // Create sanitized folder names
    const safeUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const safeBackendName = backendName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Create user directory if it doesn't exist
    const userDir = path.join(USER_BACKENDS_DIR, safeUsername);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    // Return path to backend directory
    return path.join(userDir, safeBackendName);
  } catch (error) {
    console.error('Error getting backend directory:', error);
    // Fallback to old method if there's an error
    return path.join(USER_BACKENDS_DIR, userId);
  }
};

// Helper function to determine if a file is essential for configuration
const isEssentialFile = (filePath) => {
  const essentialFiles = [
    'modules.json',
    'generatedModules.json',
    '.env',
    'config/db.js'
  ];
  
  const essentialDirs = [
    'models',
    'config'
  ];
  
  // Check if it's an essential file
  if (essentialFiles.some(file => filePath.endsWith(file))) {
    return true;
  }
  
  // Check if it's in an essential directory but only keep model definitions
  for (const dir of essentialDirs) {
    if (filePath.includes(`/${dir}/`) && filePath.endsWith('.js')) {
      // For models directory, only keep model definitions
      if (dir === 'models') {
        return !filePath.includes('node_modules') && 
               (filePath.endsWith('BaseModel.js') || 
                !filePath.includes('index.js'));
      }
      return true;
    }
  }
  
  return false;
};

// Function to create an ultra-minimal backend with only JSON configuration
const createUltraMinimalBackend = async (backendDir, name, description, dbType, dbConfig, userId) => {
  // Create directory
  fs.mkdirSync(backendDir, { recursive: true });
  
  // Store all configuration in a single JSON file
  const backendConfig = {
    name,
    description,
    dbType,
    dbConfig,
    userId,
    modules: {},
    generatedModules: { generated: [] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {}
  };
  
  // Save the configuration
  fs.writeFileSync(
    path.join(backendDir, 'backend-config.json'),
    JSON.stringify(backendConfig, null, 2)
  );
};

// Function to generate a complete backend from ultra-minimal configuration
const generateCompleteBackend = async (backendDir, tempDir, backend) => {
  // Create all necessary directories
  const dirs = [
    'models',
    'controllers',
    'routes',
    'middleware',
    'utils',
    'config',
  ];
  
  dirs.forEach(dir => {
    fs.mkdirSync(path.join(tempDir, dir), { recursive: true });
  });
  
  // Check if we're using the ultra-minimal format
  const configPath = path.join(backendDir, 'backend-config.json');
  let backendConfig;
  
  if (fs.existsSync(configPath)) {
    // Read the single configuration file
    backendConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } else {
    // Legacy format - read from backend object
    backendConfig = {
      name: backend.name,
      description: backend.description,
      dbType: backend.dbType,
      dbConfig: backend.dbConfig,
      modules: backend.modules,
      generatedModules: backend.generatedModules
    };
  }
  
  // Parse dbConfig if it's a string
  let dbConfig = backendConfig.dbConfig;
  if (typeof dbConfig === 'string') {
    try {
      dbConfig = JSON.parse(dbConfig);
    } catch (err) {
      console.error('Error parsing dbConfig:', err);
      dbConfig = {};
    }
  }
  
  // Create modules.json and generatedModules.json in the temp directory
  fs.writeFileSync(
    path.join(tempDir, 'modules.json'),
    JSON.stringify(backendConfig.modules || {}, null, 2)
  );
  
  fs.writeFileSync(
    path.join(tempDir, 'generatedModules.json'),
    JSON.stringify(backendConfig.generatedModules || { generated: [] }, null, 2)
  );
  
  // Generate a random JWT token
  const generateRandomToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };
  
  const jwtToken = generateRandomToken();
  
  // Create .env file
  const envContent = `PORT=5000
DB_HOST=${dbConfig?.host || 'localhost'}
DB_USER=${dbConfig?.username || 'root'}
DB_PASSWORD=${dbConfig?.password || ''}
DB_NAME=${dbConfig?.database || backendConfig.name.toLowerCase().replace(/\s+/g, '_')}
JWT_SECRET=${jwtToken}
`;
  
  fs.writeFileSync(path.join(tempDir, '.env'), envContent);
  
  // Create package.json
  const packageJson = {
    name: backendConfig.name.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    description: backendConfig.description || `Backend API for ${backendConfig.name}`,
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
      [backendConfig.dbType === 'mysql' ? 'mysql2' : backendConfig.dbType]: '^3.6.0',
      'bcryptjs': '^2.4.3',
      'jsonwebtoken': '^9.0.1',
    },
    devDependencies: {
      'nodemon': '^3.0.1',
    },
  };
  
  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Create db.js config
  const dbConfigContent = `import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || '${dbConfig?.database || backendConfig.name.toLowerCase().replace(/\s+/g, '_')}',
  process.env.DB_USER || '${dbConfig?.username || 'root'}',
  process.env.DB_PASSWORD || '${dbConfig?.password || ''}',
  {
    host: process.env.DB_HOST || '${dbConfig?.host || 'localhost'}',
    dialect: '${backendConfig.dbType === 'postgres' ? 'postgres' : 'mysql'}',
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
  
  fs.mkdirSync(path.join(tempDir, 'config'), { recursive: true });
  fs.writeFileSync(
    path.join(tempDir, 'config', 'db.js'),
    dbConfigContent
  );
  
  // Create utility files
  const utilsFiles = [
    'generateId.js',
    'pagination.js',
    'responseHandler.js',
  ];
  
  fs.mkdirSync(path.join(tempDir, 'utils'), { recursive: true });
  utilsFiles.forEach(file => {
    const sourcePath = path.join(process.cwd(), 'utils', file);
    const destPath = path.join(tempDir, 'utils', file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
  
  // Create BaseModel.js
  fs.mkdirSync(path.join(tempDir, 'models'), { recursive: true });
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
  
  fs.writeFileSync(
    path.join(tempDir, 'models', 'BaseModel.js'),
    baseModelContent
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
  res.json({ message: 'Welcome to ${backendConfig.name} API' });
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
    path.join(tempDir, 'index.js'),
    indexContent
  );
  
  // Copy generateCrud.js
  const generateCrudContent = fs.readFileSync(
    path.join(process.cwd(), 'generateCrud.js'),
    'utf-8'
  );
  
  fs.writeFileSync(
    path.join(tempDir, 'generateCrud.js'),
    generateCrudContent
  );
  
  // Generate model files based on modules
  const generatedModules = backendConfig.generatedModules?.generated || [];
  const modules = backendConfig.modules || {};
  
  for (const moduleName of generatedModules) {
    const moduleConfig = modules[moduleName];
    if (!moduleConfig) continue;
    
    // Generate model file
    const modelFields = Object.entries(moduleConfig.fields || {})
      .map(([field, def]) => {
        let dataType = 'DataTypes.STRING';
        if (def.type === 'Number') dataType = 'DataTypes.FLOAT';
        if (def.type === 'Boolean') dataType = 'DataTypes.BOOLEAN';
        let extra = '';
        if (def.unique) extra += ', unique: true';
        return `  ${field}: { type: ${dataType}${extra} }`;
      })
      .join(',\n');
    
    const modelContent = `import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const ${moduleName} = sequelize.define('${moduleName}', {
  ...getBaseFields(),
${modelFields}
});

export default ${moduleName};
`;
    
    fs.writeFileSync(
      path.join(tempDir, 'models', `${moduleName}.js`),
      modelContent
    );
  }
  
  // Run the generator script to create controllers and routes
  if (generatedModules.length > 0) {
    try {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec(`cd "${tempDir}" && node generateCrud.js`, (err, stdout, stderr) => {
          if (err) {
            console.error('Error generating CRUD:', stderr);
            reject(err);
          } else {
            console.log('CRUD generation output:', stdout);
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('Error executing generator script:', error);
    }
  }
  
  return tempDir;
};

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
    const backendDir = await getBackendDir(backend.userId, backend.name);
    
    // Check if backend directory exists
    if (!fs.existsSync(backendDir)) {
      return;
    }
    
    // Check if we're using the ultra-minimal format
    const configPath = path.join(backendDir, 'backend-config.json');
    if (fs.existsSync(configPath)) {
      // Read the single configuration file
      const backendConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      // Update backend in database
      backend.modules = backendConfig.modules || {};
      backend.generatedModules = backendConfig.generatedModules || { generated: [] };
      await backend.save();
    } else {
      // Legacy format - read separate files
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
    }
    
    return backend;
  } catch (error) {
    console.error('Error synchronizing backend with file system:', error);
    throw error;
  }
};

// Helper function to optimize storage by removing unused files
const optimizeBackendStorage = async (backendDir, activeModules) => {
  try {
    // Only keep models that are in active modules
    const modelsDir = path.join(backendDir, 'models');
    if (fs.existsSync(modelsDir)) {
      const modelFiles = fs.readdirSync(modelsDir)
        .filter(file => file.endsWith('.js') && file !== 'BaseModel.js');
      
      // Remove model files that aren't in active modules
      for (const file of modelFiles) {
        const moduleName = file.replace('.js', '');
        if (!activeModules.includes(moduleName)) {
          fs.unlinkSync(path.join(modelsDir, file));
          console.log(`Removed unused model file: ${file}`);
        }
      }
    }
    
    // Clean up controllers directory
    const controllersDir = path.join(backendDir, 'controllers');
    if (fs.existsSync(controllersDir)) {
      const controllerFiles = fs.readdirSync(controllersDir)
        .filter(file => file.endsWith('Controller.js'));
      
      // Remove controller files that aren't in active modules
      for (const file of controllerFiles) {
        const moduleName = file.replace('Controller.js', '');
        if (!activeModules.includes(moduleName)) {
          fs.unlinkSync(path.join(controllersDir, file));
          console.log(`Removed unused controller file: ${file}`);
        }
      }
    }
    
    // Clean up routes directory
    const routesDir = path.join(backendDir, 'routes');
    if (fs.existsSync(routesDir)) {
      const routeFiles = fs.readdirSync(routesDir)
        .filter(file => file.endsWith('Routes.js') && file !== 'index.js' && file !== 'commonCrudRoutes.js');
      
      // Remove route files that aren't in active modules
      for (const file of routeFiles) {
        const moduleName = file.replace('Routes.js', '');
        if (!activeModules.includes(moduleName)) {
          fs.unlinkSync(path.join(routesDir, file));
          console.log(`Removed unused route file: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error('Error optimizing backend storage:', error);
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
    
    // Create directory for this backend with ultra-minimal configuration
    const backendDir = await getBackendDir(req.user.id, name);
    await createUltraMinimalBackend(backendDir, name, description, dbType, dbConfig, req.user.id);
    
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
    
    // Check if name changed, if so, we need to move the directory
    const oldBackendDir = await getBackendDir(backend.userId, backend.name);
    const newBackendDir = await getBackendDir(backend.userId, name);
    
    if (backend.name !== name && fs.existsSync(oldBackendDir)) {
      // Ensure parent directory exists
      const parentDir = path.dirname(newBackendDir);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      
      // Move directory if name changed
      if (fs.existsSync(oldBackendDir) && !fs.existsSync(newBackendDir)) {
        fs.renameSync(oldBackendDir, newBackendDir);
      }
    }
    
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
    const backendDir = await getBackendDir(backend.userId, backend.name);
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
    const backendDir = await getBackendDir(backend.userId, backend.name);
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
    
    // Check if module already exists
    const generatedModules = backend.generatedModules?.generated || [];
    if (generatedModules.includes(moduleName)) {
      return sendError(res, { 
        status: 400, 
        message: `Module ${moduleName} already exists` 
      });
    }
    
    // Get the backend directory
    const backendDir = await getBackendDir(backend.userId, backend.name);
    
    // Check if we're using the ultra-minimal format
    const configPath = path.join(backendDir, 'backend-config.json');
    let backendConfig;
    
    if (fs.existsSync(configPath)) {
      // Read the single configuration file
      backendConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } else {
      // Legacy format - create config from backend object
      backendConfig = {
        name: backend.name,
        description: backend.description,
        dbType: backend.dbType,
        dbConfig: backend.dbConfig,
        modules: backend.modules || {},
        generatedModules: backend.generatedModules || { generated: [] },
        userId: backend.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    
    // Build fields object for modules
    const fieldsObj = {};
    fields.forEach(f => {
      fieldsObj[f.name] = { type: f.type };
      if (f.unique) fieldsObj[f.name].unique = true;
    });
    
    // Add to modules
    backendConfig.modules[moduleName] = { 
      fields: fieldsObj, 
      apis,
      userId: req.user.id
    };
    
    // Add to generatedModules
    if (!backendConfig.generatedModules) {
      backendConfig.generatedModules = { generated: [] };
    }
    backendConfig.generatedModules.generated.push(moduleName);
    backendConfig.updatedAt = new Date().toISOString();
    
    // Save the updated configuration
    fs.writeFileSync(
      path.join(backendDir, 'backend-config.json'),
      JSON.stringify(backendConfig, null, 2)
    );
    
    // Create a temporary directory to generate the model file
    const tempDir = path.join(process.cwd(), 'temp', `generate-${backend.id}-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'models'), { recursive: true });
    }
    
    // Generate model file directly
    const modelFields = Object.entries(fieldsObj)
      .map(([field, def]) => {
        let dataType = 'DataTypes.STRING';
        if (def.type === 'Number') dataType = 'DataTypes.FLOAT';
        if (def.type === 'Boolean') dataType = 'DataTypes.BOOLEAN';
        let extra = '';
        if (def.unique) extra += ', unique: true';
        return `  ${field}: { type: ${dataType}${extra} }`;
      })
      .join(',\n');
    
    const modelContent = `import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getBaseFields } from './BaseModel.js';

const ${moduleName} = sequelize.define('${moduleName}', {
  ...getBaseFields(),
${modelFields}
});

export default ${moduleName};
`;
    
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
    
    // Clean up temp directory if it was created
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    await backend.save();
    
    sendSuccess(res, {
      message: `Module ${moduleName} generated successfully`,
      data: {
        moduleName,
        fields,
        apis,
      },
    });
  } catch (err) {
    console.error('Error generating module:', err);
    sendError(res, { message: 'Failed to generate module', error: err.message });
  }
};

// Delete a module from a backend
export const deleteModuleFromBackend = async (req, res) => {
  try {
    const { backendId, moduleName } = req.params;
    
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
    
    // Check if module exists
    const generatedModules = backend.generatedModules?.generated || [];
    if (!generatedModules.includes(moduleName)) {
      return sendError(res, { 
        status: 404, 
        message: `Module ${moduleName} not found` 
      });
    }
    
    // Get the backend directory
    const backendDir = await getBackendDir(backend.userId, backend.name);
    
    // Check if we're using the ultra-minimal format
    const configPath = path.join(backendDir, 'backend-config.json');
    let backendConfig;
    
    if (fs.existsSync(configPath)) {
      // Read the single configuration file
      backendConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      // Remove module from modules
      if (backendConfig.modules && backendConfig.modules[moduleName]) {
        delete backendConfig.modules[moduleName];
      }
      
      // Remove from generatedModules
      if (backendConfig.generatedModules && backendConfig.generatedModules.generated) {
        backendConfig.generatedModules.generated = backendConfig.generatedModules.generated.filter(
          m => m !== moduleName
        );
      }
      
      backendConfig.updatedAt = new Date().toISOString();
      
      // Save the updated configuration
      fs.writeFileSync(
        path.join(backendDir, 'backend-config.json'),
        JSON.stringify(backendConfig, null, 2)
      );
    } else {
      // Legacy format - update backend object
      const backendModules = backend.modules || {};
      if (backendModules[moduleName]) {
        delete backendModules[moduleName];
      }
      
      backend.modules = backendModules;
      
      const backendGeneratedModules = backend.generatedModules || { generated: [] };
      backendGeneratedModules.generated = backendGeneratedModules.generated.filter(
        m => m !== moduleName
      );
      
      backend.generatedModules = backendGeneratedModules;
    }
    
    await backend.save();
    
    sendSuccess(res, {
      message: `Module ${moduleName} deleted successfully`,
    });
  } catch (err) {
    console.error('Error deleting module:', err);
    sendError(res, { message: 'Failed to delete module', error: err.message });
  }
};

// Update a module in a backend
export const updateModuleInBackend = async (req, res) => {
  try {
    const { backendId, moduleName } = req.params;
    
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
    
    // Check if module exists
    const generatedModules = backend.generatedModules?.generated || [];
    if (!generatedModules.includes(moduleName)) {
      return sendError(res, { 
        status: 404, 
        message: `Module ${moduleName} not found` 
      });
    }
    
    // Add moduleName to the request body before validation
    const requestBody = {
      ...req.body,
      moduleName
    };
    
    const { error, value } = moduleSchema.validate(requestBody);
    
    if (error) {
      return sendError(res, { 
        status: 400, 
        message: 'Invalid input', 
        error: error.message 
      });
    }
    
    const { fields, apis } = value;
    
    // Get the backend directory
    const backendDir = await getBackendDir(backend.userId, backend.name);
    
    // Check if we're using the ultra-minimal format
    const configPath = path.join(backendDir, 'backend-config.json');
    let backendConfig;
    
    if (fs.existsSync(configPath)) {
      // Read the single configuration file
      backendConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      // Build fields object for modules
      const fieldsObj = {};
      fields.forEach(f => {
        fieldsObj[f.name] = { type: f.type };
        if (f.unique) fieldsObj[f.name].unique = true;
      });
      
      // Update the module
      backendConfig.modules[moduleName] = { 
        fields: fieldsObj, 
        apis,
        userId: req.user.id
      };
      
      backendConfig.updatedAt = new Date().toISOString();
      
      // Save the updated configuration
      fs.writeFileSync(
        path.join(backendDir, 'backend-config.json'),
        JSON.stringify(backendConfig, null, 2)
      );
    } else {
      // Legacy format - update backend object
      const backendModules = backend.modules || {};
      
      // Build fields object for modules
      const fieldsObj = {};
      fields.forEach(f => {
        fieldsObj[f.name] = { type: f.type };
        if (f.unique) fieldsObj[f.name].unique = true;
      });
      
      backendModules[moduleName] = {
        fields,
        apis,
      };
      
      backend.modules = backendModules;
    }
    
    await backend.save();
    
    sendSuccess(res, {
      message: `Module ${moduleName} updated successfully`,
      data: {
        moduleName,
        fields,
        apis,
      },
    });
  } catch (err) {
    console.error('Error updating module:', err);
    sendError(res, { message: 'Failed to update module', error: err.message });
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
    
    const backendDir = await getBackendDir(backend.userId, backend.name);
    
    if (!fs.existsSync(backendDir)) {
      return sendError(res, { 
        status: 404, 
        message: 'Backend directory not found' 
      });
    }
    
    // Create a ZIP archive
    const zipFileName = `${backend.name.toLowerCase().replace(/\s+/g, '-')}-backend.zip`;
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
    }
    
    const zipFilePath = path.join(process.cwd(), 'temp', zipFileName);
    
    // Create a write stream for the ZIP file
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });
    
    // Pipe the archive to the file
    archive.pipe(output);
    
    // Check if we're using the ultra-minimal format
    const configPath = path.join(backendDir, 'backend-config.json');
    let backendConfig;
    
    if (fs.existsSync(configPath)) {
      // Read the single configuration file
      backendConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } else {
      // Legacy format - read from backend object
      backendConfig = {
        name: backend.name,
        description: backend.description,
        dbType: backend.dbType,
        dbConfig: backend.dbConfig,
        modules: backend.modules,
        generatedModules: backend.generatedModules
      };
    }
    
    // Parse dbConfig if it's a string
    let dbConfig = backendConfig.dbConfig;
    if (typeof dbConfig === 'string') {
      try {
        dbConfig = JSON.parse(dbConfig);
      } catch (err) {
        console.error('Error parsing dbConfig:', err);
        dbConfig = {};
      }
    }
    
    // Add configuration files directly to the archive
    
    // modules.json
    archive.append(
      JSON.stringify(backendConfig.modules || {}, null, 2),
      { name: 'modules.json' }
    );
    
    // generatedModules.json
    archive.append(
      JSON.stringify(backendConfig.generatedModules || { generated: [] }, null, 2),
      { name: 'generatedModules.json' }
    );
    
    // Generate a random JWT token
    const generateRandomToken = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let token = '';
      for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return token;
    };
    
    const jwtToken = generateRandomToken();
    
    // .env file
    const envContent = `PORT=5000
DB_HOST=${dbConfig?.host || 'localhost'}
DB_USER=${dbConfig?.username || 'root'}
DB_PASSWORD=${dbConfig?.password || ''}
DB_NAME=${dbConfig?.database || backendConfig.name.toLowerCase().replace(/\s+/g, '_')}
JWT_SECRET=${jwtToken}
`;
    
    archive.append(envContent, { name: '.env' });
    
    // package.json
    const packageJson = {
      name: backendConfig.name.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: backendConfig.description || `Backend API for ${backendConfig.name}`,
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
        [backendConfig.dbType === 'mysql' ? 'mysql2' : backendConfig.dbType]: '^3.6.0',
        'bcryptjs': '^2.4.3',
        'jsonwebtoken': '^9.0.1',
      },
      devDependencies: {
        'nodemon': '^3.0.1',
      },
    };
    
    archive.append(
      JSON.stringify(packageJson, null, 2),
      { name: 'package.json' }
    );
    
    // Create config directory and db.js
    const dbConfigContent = `import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || '${dbConfig?.database || backendConfig.name.toLowerCase().replace(/\s+/g, '_')}',
  process.env.DB_USER || '${dbConfig?.username || 'root'}',
  process.env.DB_PASSWORD || '${dbConfig?.password || ''}',
  {
    host: process.env.DB_HOST || '${dbConfig?.host || 'localhost'}',
    dialect: '${backendConfig.dbType === 'postgres' ? 'postgres' : 'mysql'}',
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
    
    archive.append(dbConfigContent, { name: 'config/db.js' });
    
    // Add BaseModel.js
    const baseModelContent = `import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

class BaseModel extends Model {
  static init(attributes, options = {}) {
    return super.init(
      {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
          allowNull: false,
        },
        ...attributes,
        createdAt: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        ...options,
      }
    );
  }
}

export default BaseModel;
`;
    
    archive.append(baseModelContent, { name: 'models/BaseModel.js' });
    
    // Add model files from the backend directory
    const modelsDir = path.join(backendDir, 'models');
    if (fs.existsSync(modelsDir)) {
      const modelFiles = fs.readdirSync(modelsDir);
      for (const file of modelFiles) {
        if (file !== 'BaseModel.js' && file.endsWith('.js')) {
          const filePath = path.join(modelsDir, file);
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          archive.append(fileContent, { name: `models/${file}` });
        }
      }
    }
    
    // Add utility files
    const utilsFiles = [
      'generateId.js',
      'pagination.js',
      'responseHandler.js',
    ];
    
    utilsFiles.forEach(file => {
      const sourcePath = path.join(process.cwd(), 'utils', file);
      if (fs.existsSync(sourcePath)) {
        const fileContent = fs.readFileSync(sourcePath, 'utf-8');
        archive.append(fileContent, { name: `utils/${file}` });
      }
    });
    
    // Generate index.js
    const indexContent = `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to database
connectDB();

// Dynamically import all models
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modelsDir = path.join(__dirname, 'models');

// Array to store model information
const models = [];

// Read model files
if (fs.existsSync(modelsDir)) {
  const files = fs.readdirSync(modelsDir);
  
  for (const file of files) {
    if (file !== 'BaseModel.js' && file.endsWith('.js')) {
      const modelName = file.replace('.js', '');
      try {
        // Import the model dynamically
        const modelModule = await import(\`./models/\${file}\`);
        const Model = modelModule.default;
        
        // Create routes for the model
        const router = express.Router();
        
        // CRUD operations
        router.get('/', async (req, res) => {
          try {
            const items = await Model.findAll();
            res.json(items);
          } catch (error) {
            res.status(500).json({ message: error.message });
          }
        });
        
        router.get('/:id', async (req, res) => {
          try {
            const item = await Model.findByPk(req.params.id);
            if (!item) {
              return res.status(404).json({ message: 'Item not found' });
            }
            res.json(item);
          } catch (error) {
            res.status(500).json({ message: error.message });
          }
        });
        
        router.post('/', async (req, res) => {
          try {
            const item = await Model.create(req.body);
            res.status(201).json(item);
          } catch (error) {
            res.status(400).json({ message: error.message });
          }
        });
        
        router.put('/:id', async (req, res) => {
          try {
            const item = await Model.findByPk(req.params.id);
            if (!item) {
              return res.status(404).json({ message: 'Item not found' });
            }
            await item.update(req.body);
            res.json(item);
          } catch (error) {
            res.status(400).json({ message: error.message });
          }
        });
        
        router.delete('/:id', async (req, res) => {
          try {
            const item = await Model.findByPk(req.params.id);
            if (!item) {
              return res.status(404).json({ message: 'Item not found' });
            }
            await item.destroy();
            res.json({ message: 'Item deleted' });
          } catch (error) {
            res.status(500).json({ message: error.message });
          }
        });
        
        // Register the routes
        app.use(\`/api/\${modelName.toLowerCase()}\`, router);
        
        // Add to models array
        models.push({
          name: modelName,
          endpoints: [
            { method: 'GET', path: \`/api/\${modelName.toLowerCase()}\` },
            { method: 'GET', path: \`/api/\${modelName.toLowerCase()}/:id\` },
            { method: 'POST', path: \`/api/\${modelName.toLowerCase()}\` },
            { method: 'PUT', path: \`/api/\${modelName.toLowerCase()}/:id\` },
            { method: 'DELETE', path: \`/api/\${modelName.toLowerCase()}/:id\` },
          ]
        });
        
        console.log(\`Registered routes for model: \${modelName}\`);
      } catch (error) {
        console.error(\`Error loading model \${modelName}:\`, error);
      }
    }
  }
}

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'API is running',
    models,
    version: '1.0.0'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;
    
    archive.append(indexContent, { name: 'index.js' });
    
    // Generate controller files for each model
    const generatedModules = backendConfig.generatedModules?.generated || [];
    const modules = backendConfig.modules || {};
    
    for (const moduleName of generatedModules) {
      const moduleConfig = modules[moduleName];
      if (moduleConfig) {
        const controllerContent = `import ${moduleName} from '../models/${moduleName}.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { getPagination } from '../utils/pagination.js';

// Get all items with pagination
export const getAll${moduleName}s = async (req, res) => {
  try {
    const { page, size } = req.query;
    const { limit, offset } = getPagination(page, size);
    
    const items = await ${moduleName}.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });
    
    sendSuccess(res, {
      totalItems: items.count,
      items: items.rows,
      totalPages: Math.ceil(items.count / limit),
      currentPage: page ? +page : 0,
    });
  } catch (err) {
    sendError(res, { message: err.message });
  }
};

// Get a single item by ID
export const get${moduleName}ById = async (req, res) => {
  try {
    const item = await ${moduleName}.findByPk(req.params.id);
    
    if (!item) {
      return sendError(res, { status: 404, message: 'Item not found' });
    }
    
    sendSuccess(res, item);
  } catch (err) {
    sendError(res, { message: err.message });
  }
};

// Create a new item
export const create${moduleName} = async (req, res) => {
  try {
    const item = await ${moduleName}.create(req.body);
    sendSuccess(res, item, 201);
  } catch (err) {
    sendError(res, { message: err.message });
  }
};

// Update an item
export const update${moduleName} = async (req, res) => {
  try {
    const item = await ${moduleName}.findByPk(req.params.id);
    
    if (!item) {
      return sendError(res, { status: 404, message: 'Item not found' });
    }
    
    await item.update(req.body);
    sendSuccess(res, item);
  } catch (err) {
    sendError(res, { message: err.message });
  }
};

// Delete an item
export const delete${moduleName} = async (req, res) => {
  try {
    const item = await ${moduleName}.findByPk(req.params.id);
    
    if (!item) {
      return sendError(res, { status: 404, message: 'Item not found' });
    }
    
    await item.destroy();
    sendSuccess(res, { message: 'Item deleted successfully' });
  } catch (err) {
    sendError(res, { message: err.message });
  }
};
`;
        
        archive.append(controllerContent, { name: `controllers/${moduleName.toLowerCase()}Controller.js` });
        
        // Create route file for this module
        const routeContent = `import express from 'express';
import {
  getAll${moduleName}s,
  get${moduleName}ById,
  create${moduleName},
  update${moduleName},
  delete${moduleName}
} from '../controllers/${moduleName.toLowerCase()}Controller.js';

const router = express.Router();

// Get all items
router.get('/', getAll${moduleName}s);

// Get a single item
router.get('/:id', get${moduleName}ById);

// Create a new item
router.post('/', create${moduleName});

// Update an item
router.put('/:id', update${moduleName});

// Delete an item
router.delete('/:id', delete${moduleName});

export default router;
`;
        
        archive.append(routeContent, { name: `routes/${moduleName.toLowerCase()}Routes.js` });
      }
    }
    
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
      
      // Delete the temporary files after sending
      fileStream.on('close', () => {
        fs.unlinkSync(zipFilePath);
      });
    });
  } catch (err) {
    console.error('Error exporting backend:', err);
    sendError(res, { message: 'Failed to export backend', error: err.message });
  }
};

// Function to migrate existing backends to ultra-minimal format
export const migrateToUltraMinimal = async (req, res) => {
  try {
    // Only admins can run this migration
    if (!req.user.isAdmin) {
      return sendError(res, {
        status: 403,
        message: 'Only administrators can perform this operation'
      });
    }

    // Get all backends
    const backends = await UserBackend.findAll();
    const migrationResults = [];

    // Process each backend
    for (const backend of backends) {
      try {
        // Get the backend directory
        const backendDir = await getBackendDir(backend.userId, backend.name);
        
        // Skip if directory doesn't exist
        if (!fs.existsSync(backendDir)) {
          migrationResults.push({
            id: backend.id,
            name: backend.name,
            status: 'skipped',
            reason: 'Directory not found'
          });
          continue;
        }
        
        // Check if already using ultra-minimal format
        const configPath = path.join(backendDir, 'backend-config.json');
        if (fs.existsSync(configPath)) {
          migrationResults.push({
            id: backend.id,
            name: backend.name,
            status: 'skipped',
            reason: 'Already using ultra-minimal format'
          });
          continue;
        }
        
        // Read existing configuration
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
        
        // Create the ultra-minimal configuration
        const backendConfig = {
          name: backend.name,
          description: backend.description,
          dbType: backend.dbType,
          dbConfig: typeof backend.dbConfig === 'string' ? JSON.parse(backend.dbConfig) : backend.dbConfig,
          userId: backend.userId,
          modules,
          generatedModules,
          createdAt: backend.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          settings: backend.settings || {}
        };
        
        // Create a backup directory
        const backupDir = path.join(backendDir, '_backup');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Move all files except models to backup
        const files = fs.readdirSync(backendDir);
        for (const file of files) {
          if (file !== '_backup' && file !== 'models') {
            const sourcePath = path.join(backendDir, file);
            const destPath = path.join(backupDir, file);
            if (fs.statSync(sourcePath).isDirectory()) {
              fs.cpSync(sourcePath, destPath, { recursive: true });
            } else {
              fs.copyFileSync(sourcePath, destPath);
            }
          }
        }
        
        // Save the ultra-minimal configuration
        fs.writeFileSync(
          path.join(backendDir, 'backend-config.json'),
          JSON.stringify(backendConfig, null, 2)
        );
        
        // Delete all files and directories except models and _backup
        for (const file of files) {
          if (file !== '_backup' && file !== 'models') {
            const filePath = path.join(backendDir, file);
            if (fs.statSync(filePath).isDirectory()) {
              fs.rmSync(filePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(filePath);
            }
          }
        }
        
        migrationResults.push({
          id: backend.id,
          name: backend.name,
          status: 'migrated',
          oldSize: 'unknown',
          newSize: 'unknown'
        });
      } catch (error) {
        console.error(`Error migrating backend ${backend.id}:`, error);
        migrationResults.push({
          id: backend.id,
          name: backend.name,
          status: 'error',
          error: error.message
        });
      }
    }
    
    sendSuccess(res, {
      message: 'Backend migration to ultra-minimal format completed',
      data: {
        total: backends.length,
        migrated: migrationResults.filter(r => r.status === 'migrated').length,
        skipped: migrationResults.filter(r => r.status === 'skipped').length,
        errors: migrationResults.filter(r => r.status === 'error').length,
        results: migrationResults
      }
    });
  } catch (err) {
    console.error('Error migrating backends to ultra-minimal format:', err);
    sendError(res, { 
      message: 'Failed to migrate backends', 
      error: err.message 
    });
  }
};