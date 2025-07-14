import fs from 'fs';
import path from 'path';

// Fix path handling to use process.cwd()
const modulesPath = path.join(process.cwd(), 'modules.json');
const generatedModulesPath = path.join(process.cwd(), 'generatedModules.json');
const modelsDir = path.join(process.cwd(), 'models');
const controllersDir = path.join(process.cwd(), 'controllers');
const routesDir = path.join(process.cwd(), 'routes');

// Load modules and tracking file
const modules = JSON.parse(fs.readFileSync(modulesPath, 'utf-8'));
let generatedModules = { generated: [] };
if (fs.existsSync(generatedModulesPath)) {
  generatedModules = JSON.parse(fs.readFileSync(generatedModulesPath, 'utf-8'));
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function lowerFirst(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

// Track which modules are newly generated in this run
const newlyGenerated = [];

for (const [moduleName, moduleDef] of Object.entries(modules)) {
  // Skip modules that don't have a userId (not created through frontend)
  if (!moduleDef.userId) {
    console.log(`Skipping ${moduleName} - not created through frontend`);
    continue;
  }

  // Skip modules that have already been generated
  if (generatedModules.generated.includes(moduleName)) {
    console.log(`Skipping ${moduleName} - already generated`);
    continue;
  }

  console.log(`Generating CRUD for ${moduleName}`);

  // Model
  const modelFields = Object.entries(moduleDef.fields)
    .map(([field, def]) => {
      let dataType = 'DataTypes.STRING';
      if (def.type === 'Number') dataType = 'DataTypes.FLOAT';
      if (def.type === 'Boolean') dataType = 'DataTypes.BOOLEAN';
      let extra = '';
      // Commented out unique constraint to avoid hitting MySQL index limit
      // if (def.unique) extra += ', unique: true';
      return `  ${field}: { type: ${dataType}${extra} }`;
    })
    .join(',\n');
  const modelContent = `import { DataTypes } from 'sequelize';\nimport { sequelize } from '../config/db.js';\nimport { getBaseFields } from './BaseModel.js';\n\nconst ${moduleName} = sequelize.define('${moduleName}', {\n  ...getBaseFields(),\n${modelFields}\n});\n\nexport default ${moduleName};\n`;
  fs.writeFileSync(path.join(modelsDir, `${moduleName}.js`), modelContent);

  // Controller
  const lcModule = lowerFirst(moduleName);
  const joiFields = Object.entries(moduleDef.fields)
    .map(([field, def]) => {
      let joiType = 'Joi.string()';
      if (def.type === 'Number') joiType = 'Joi.number()';
      if (def.type === 'Boolean') joiType = 'Joi.boolean()';
      let required = '.required()';
      if (def.allowNull) required = '';
      // Commented out unique constraint
      // if (def.unique) joiType += '.unique()'; // Not a real Joi method, but for info
      return `  ${field}: ${joiType}${required}`;
    })
    .join(',\n');
  const joiUpdateFields = Object.entries(moduleDef.fields)
    .map(([field, def]) => {
      let joiType = 'Joi.string()';
      if (def.type === 'Number') joiType = 'Joi.number()';
      if (def.type === 'Boolean') joiType = 'Joi.boolean()';
      return `  ${field}: ${joiType}.optional()`;
    })
    .join(',\n');
  const controllerContent = `import ${moduleName} from '../models/${moduleName}.js';\nimport { sendSuccess, sendError } from '../utils/responseHandler.js';\nimport Joi from 'joi';\nimport { getPagination } from '../utils/pagination.js';\n\nconst ${lcModule}Schema = Joi.object({\n${joiFields}\n});\n\nconst ${lcModule}UpdateSchema = Joi.object({\n${joiUpdateFields}\n});\n\nconst getAll${moduleName}s = async (req, res) => {\n  try {\n    const { limit, offset, page } = getPagination(req.query);\n    const { count, rows: items } = await ${moduleName}.findAndCountAll({ limit, offset });\n    sendSuccess(res, {\n      message: '${moduleName}s fetched successfully',\n      data: {\n        items,\n        total: count,\n        page,\n        limit,\n        totalPages: Math.ceil(count / limit),\n      },\n    });\n  } catch (e) {\n    sendError(res, { message: 'Server error' });\n  }\n};\n\nconst get${moduleName}ById = async (req, res) => {\n  try {\n    const item = await ${moduleName}.findByPk(req.params.id);\n    if (!item) {\n      return sendError(res, { status: 404, message: '${moduleName} not found' });\n    }\n    sendSuccess(res, { message: '${moduleName} fetched successfully', data: item });\n  } catch (e) {\n    sendError(res, { message: 'Server error' });\n  }\n};\n\nconst create${moduleName} = async (req, res) => {\n  try {\n    const { error, value } = ${lcModule}Schema.validate(req.body);\n    if (error) {\n      return sendError(res, { status: 400, message: error.message });\n    }\n    const item = await ${moduleName}.create(value);\n    sendSuccess(res, { status: 201, message: '${moduleName} created successfully', data: item });\n  } catch (e) {\n    sendError(res, { message: 'Server error' });\n  }\n};\n\nconst update${moduleName} = async (req, res) => {\n  try {\n    const item = await ${moduleName}.findByPk(req.params.id);\n    if (!item) {\n      return sendError(res, { status: 404, message: '${moduleName} not found' });\n    }\n    const { error, value } = ${lcModule}UpdateSchema.validate(req.body);\n    if (error) {\n      return sendError(res, { status: 400, message: error.message });\n    }\n    await item.update(value);\n    sendSuccess(res, { message: '${moduleName} updated successfully', data: item });\n  } catch (e) {\n    sendError(res, { message: 'Server error' });\n  }\n};\n\nconst delete${moduleName} = async (req, res) => {\n  try {\n    const item = await ${moduleName}.findByPk(req.params.id);\n    if (!item) {\n      return sendError(res, { status: 404, message: '${moduleName} not found' });\n    }\n    await item.destroy();\n    sendSuccess(res, { message: '${moduleName} deleted successfully' });\n  } catch (e) {\n    sendError(res, { message: 'Server error' });\n  }\n};\n\nexport {\n  getAll${moduleName}s,\n  get${moduleName}ById,\n  create${moduleName},\n  update${moduleName},\n  delete${moduleName},\n};\n`;
  fs.writeFileSync(path.join(controllersDir, `${lcModule}Controller.js`), controllerContent);

  // Route
  const routeContent = `import {\n  getAll${moduleName}s,\n  get${moduleName}ById,\n  create${moduleName},\n  update${moduleName},\n  delete${moduleName},\n} from '../controllers/${lcModule}Controller.js';\nimport { createCrudRoutes } from './commonCrudRoutes.js';\n\nconst router = createCrudRoutes({\n  getAll: getAll${moduleName}s,\n  getById: get${moduleName}ById,\n  create: create${moduleName},\n  update: update${moduleName},\n  remove: delete${moduleName},\n});\n\nexport default router;\n`;
  fs.writeFileSync(path.join(routesDir, `${lcModule}Routes.js`), routeContent);

  // Add to the list of newly generated modules
  newlyGenerated.push(moduleName);
  console.log(`Generated CRUD for ${moduleName}`);
}

// Update the generated modules list
if (newlyGenerated.length > 0) {
  generatedModules.generated = [...generatedModules.generated, ...newlyGenerated];
  fs.writeFileSync(generatedModulesPath, JSON.stringify(generatedModules, null, 2));
  console.log(`Updated generated modules tracking: ${newlyGenerated.join(', ')}`);
}

console.log('CRUD generation complete!'); 