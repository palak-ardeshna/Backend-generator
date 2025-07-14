import express from 'express';
import fs from 'fs';
import path from 'path';
import userRoutes from './userRoutes.js';
import generatorRoutes from './generatorRoutes.js';
import authRoutes from './authRoutes.js';
import userBackendRoutes from './userBackendRoutes.js';

const router = express.Router();

// Core routes
router.use('/users', userRoutes);
router.use('/generate-module', generatorRoutes);
router.use('/auth', authRoutes);
router.use('/user-backends', userBackendRoutes);

// Dynamically load generated module routes
const generatedModulesPath = path.join(process.cwd(), 'generatedModules.json');
if (fs.existsSync(generatedModulesPath)) {
  try {
    const { generated } = JSON.parse(fs.readFileSync(generatedModulesPath, 'utf-8'));
    
    // Import and mount each generated module's routes
    generated.forEach(moduleName => {
      try {
        // Convert module name to route file name (camelCase)
        const routeFileName = `${moduleName.charAt(0).toLowerCase() + moduleName.slice(1)}Routes.js`;
        const routePath = `./${routeFileName}`;
        
        // Check if the route file exists
        const routeFilePath = path.join(process.cwd(), 'routes', routeFileName);
        if (fs.existsSync(routeFilePath)) {
          // Dynamically import the route
          import(routePath).then(moduleRoutes => {
            // Mount the route using the module name as the path
            router.use(`/${moduleName.toLowerCase()}`, moduleRoutes.default);
            console.log(`Mounted route for module: ${moduleName}`);
          }).catch(err => {
            console.error(`Error importing route for ${moduleName}:`, err);
          });
        }
      } catch (err) {
        console.error(`Error setting up route for ${moduleName}:`, err);
      }
    });
  } catch (err) {
    console.error('Error loading generated modules:', err);
  }
}

export default router;