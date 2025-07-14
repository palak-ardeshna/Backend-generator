import express from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import ApiModule from '../models/ApiModule.js';
import { getPagination } from '../utils/pagination.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { sequelize } from '../config/db.js';

const router = express.Router();

// Fix path handling to use process.cwd() instead of URL
const modulesPath = path.join(process.cwd(), 'modules.json');
const generatorScript = path.join(process.cwd(), 'generateCrud.js');
const generatedModulesPath = path.join(process.cwd(), 'generatedModules.json');

// GET all generated modules with pagination - filtered by user ID unless admin
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit, offset, page } = getPagination(req.query);
    
    // Filter condition - admins see all, regular users see only their own
    const whereCondition = req.user.isAdmin ? {} : { userId: req.user.id };
    
    const { count, rows: modules } = await ApiModule.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });
    
    res.json({
      message: 'Modules fetched successfully',
      data: {
        modules,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch modules', error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { moduleName, fields, apis } = req.body;
  if (!moduleName || !fields || !Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({ message: 'Invalid input' });
  }

  try {
    // Check if module has already been generated
    let generatedModules = { generated: [] };
    if (fs.existsSync(generatedModulesPath)) {
      generatedModules = JSON.parse(fs.readFileSync(generatedModulesPath, 'utf-8'));
    }

    // If module is already generated, just update the database record
    if (generatedModules.generated.includes(moduleName)) {
      try {
        await ApiModule.upsert({
          moduleName,
          fields,
          apis,
          userId: req.user.id
        });
        
        return res.json({
          message: 'Module already exists and database updated',
          data: {
            moduleName,
            fields,
            apis,
            userId: req.user.id
          },
        });
      } catch (dbErr) {
        return res.status(500).json({ message: 'Failed to update module record', error: dbErr.message });
      }
    }

    // Read current modules.json
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

    // Save APIs info if needed (for now, just store fields)
    modules[moduleName] = { 
      fields: fieldsObj, 
      apis,
      userId: req.user.id // Store the user ID in modules.json
    };

    // Write back to modules.json
    fs.writeFileSync(modulesPath, JSON.stringify(modules, null, 2));

    // Run the generator script
    exec(`node "${generatorScript}"`, async (err, stdout, stderr) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to generate files', error: stderr });
      }
      // Save to ApiModule table with user ID
      try {
        await ApiModule.upsert({
          moduleName,
          fields,
          apis,
          userId: req.user.id // Store the user ID in the database
        });
      } catch (dbErr) {
        return res.status(500).json({ message: 'Generated files but failed to save module record', error: dbErr.message });
      }
      res.json({
        message: 'Module and APIs generated successfully!',
        data: {
          moduleName,
          fields,
          apis,
          userId: req.user.id
        },
      });
    });
  } catch (error) {
    console.error('Error in generate-module:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE a module and all its related files
router.delete('/:moduleName', authMiddleware, async (req, res) => {
  const { moduleName } = req.params;
  
  try {
    // Check if module exists in the database
    const module = await ApiModule.findOne({ 
      where: { 
        moduleName,
        ...(req.user.isAdmin ? {} : { userId: req.user.id }) // Only allow admins to delete any module
      } 
    });
    
    if (!module) {
      return res.status(404).json({ 
        message: 'Module not found or you do not have permission to delete it' 
      });
    }
    
    // 1. Remove from generatedModules.json
    let generatedModules = { generated: [] };
    if (fs.existsSync(generatedModulesPath)) {
      generatedModules = JSON.parse(fs.readFileSync(generatedModulesPath, 'utf-8'));
      generatedModules.generated = generatedModules.generated.filter(m => m !== moduleName);
      fs.writeFileSync(generatedModulesPath, JSON.stringify(generatedModules, null, 2));
    }
    
    // 2. Remove from modules.json
    if (fs.existsSync(modulesPath)) {
      const modules = JSON.parse(fs.readFileSync(modulesPath, 'utf-8'));
      delete modules[moduleName];
      fs.writeFileSync(modulesPath, JSON.stringify(modules, null, 2));
    }
    
    // 3. Delete related files
    const filesToDelete = [
      path.join(process.cwd(), 'models', `${moduleName}.js`),
      path.join(process.cwd(), 'controllers', `${moduleName}Controller.js`),
      path.join(process.cwd(), 'routes', `${moduleName}Routes.js`)
    ];
    
    filesToDelete.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`Deleted file: ${file}`);
      }
    });
    
    // 4. Delete from database
    await module.destroy();
    
    // 5. Drop the table if it exists
    try {
      // Convert moduleName to table name format (usually pluralized)
      const tableName = `${moduleName}s`.toLowerCase();
      await sequelize.query(`DROP TABLE IF EXISTS ${tableName}`);
    } catch (dbErr) {
      console.error('Error dropping table:', dbErr);
      // Continue with the deletion process even if table drop fails
    }
    
    res.json({
      message: `Module ${moduleName} and all related files have been deleted successfully`,
      data: { moduleName }
    });
    
  } catch (error) {
    console.error('Error deleting module:', error);
    res.status(500).json({ 
      message: 'Failed to delete module', 
      error: error.message 
    });
  }
});

export default router; 