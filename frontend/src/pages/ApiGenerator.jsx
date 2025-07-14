import { useState } from 'react';
import { useGenerateModuleMutation, useGetModulesQuery, useDeleteModuleMutation } from '../features/apiGenerator/apiGeneratorApi';
import { FaPlus, FaMinus, FaCode, FaTrash, FaCheck, FaEye, FaDownload } from 'react-icons/fa';
import './ApiGenerator.css';
import React from 'react'; // Added missing import for React.Fragment

const FIELD_TYPES = [
  { label: 'String', value: 'String' },
  { label: 'Number', value: 'Number' },
  { label: 'Boolean', value: 'Boolean' },
  { label: 'Date', value: 'Date' },
  { label: 'Object', value: 'Object' },
  { label: 'Array', value: 'Array' },
];

const DEFAULT_APIS = {
  post: true,
  get: true,
  getById: true,
  put: true,
  delete: true,
};

const API_LABELS = {
  post: { method: 'POST', path: (m) => `/api/${m}`, color: '#10b981' },
  get: { method: 'GET', path: (m) => `/api/${m}`, color: '#3b82f6' },
  getById: { method: 'GET', path: (m) => `/api/${m}/:id`, color: '#3b82f6' },
  put: { method: 'PUT', path: (m) => `/api/${m}/:id`, color: '#f59e0b' },
  delete: { method: 'DELETE', path: (m) => `/api/${m}/:id`, color: '#ef4444' },
};

export default function ApiGenerator() {
  const [moduleName, setModuleName] = useState('');
  const [fields, setFields] = useState([
    { name: '', type: 'String', unique: false },
  ]);
  const [apis, setApis] = useState(DEFAULT_APIS);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [generateModule, { isLoading }] = useGenerateModuleMutation();
  const [deleteModule, { isLoading: isDeleting }] = useDeleteModuleMutation();
  const { data: modulesData, refetch } = useGetModulesQuery();
  
  // Get user from localStorage
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  const handleFieldChange = (idx, key, value) => {
    setFields(fields.map((f, i) => (i === idx ? { ...f, [key]: value } : f)));
  };

  const addField = () => setFields([...fields, { name: '', type: 'String', unique: false }]);
  
  const removeField = (idx) => {
    if (fields.length > 1) {
      setFields(fields.filter((_, i) => i !== idx));
    }
  };

  const handleApiChange = (key) => setApis({ ...apis, [key]: !apis[key] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!moduleName.trim()) {
      setMessage('Module name is required');
      setMessageType('error');
      return;
    }
    
    if (fields.some(f => !f.name.trim())) {
      setMessage('All fields must have a name');
      setMessageType('error');
      return;
    }
    
    if (!Object.values(apis).some(v => v)) {
      setMessage('At least one API must be selected');
      setMessageType('error');
      return;
    }
    
    setMessage('');
    try {
      await generateModule({ moduleName, fields, apis }).unwrap();
      setMessage('Module and APIs generated successfully!');
      setMessageType('success');
      setModuleName('');
      setFields([{ name: '', type: 'String', unique: false }]);
      setApis(DEFAULT_APIS);
      refetch(); // Refresh the list of modules
    } catch (err) {
      setMessage(err?.data?.error || 'Error generating module');
      setMessageType('error');
    }
  };

  const handleDeleteModule = async (moduleName) => {
    try {
      await deleteModule(moduleName).unwrap();
      setMessage(`Module ${moduleName} deleted successfully!`);
      setMessageType('success');
      setDeleteConfirm(null);
      refetch(); // Refresh the list of modules
    } catch (err) {
      setMessage(err?.data?.message || 'Error deleting module');
      setMessageType('error');
    }
  };

  // Helper to parse fields/apis
  const parseFields = (fields) => {
    if (Array.isArray(fields)) return fields;
    if (typeof fields === 'string') try { return JSON.parse(fields); } catch { return []; }
    return [];
  };
  
  const parseApis = (apis) => {
    if (typeof apis === 'object') return apis;
    if (typeof apis === 'string') try { return JSON.parse(apis); } catch { return {}; }
    return {};
  };

  // Generate sample body from fields
  const sampleBody = (fields) => {
    const obj = {};
    fields.forEach(f => {
      if (f.type === 'String') obj[f.name] = 'string';
      else if (f.type === 'Number') obj[f.name] = 0;
      else if (f.type === 'Boolean') obj[f.name] = false;
      else if (f.type === 'Date') obj[f.name] = new Date().toISOString();
      else if (f.type === 'Object') obj[f.name] = {};
      else if (f.type === 'Array') obj[f.name] = [];
    });
    return obj;
  };

  // Generate sample response
  const sampleResponse = (fields, isArray = false) => {
    const obj = sampleBody(fields);
    return isArray ? [obj] : obj;
  };
  
  // Render modules list
  const renderModulesList = () => {
    if (!modulesData || !modulesData.data || !modulesData.data.modules || modulesData.data.modules.length === 0) {
      return (
        <div className="empty-state">
          <FaCode size={48} />
          <p>No modules generated yet.</p>
          <p>Use the form above to create your first API module.</p>
        </div>
      );
    }

    return (
      <div className="modules-table-container">
        <table className="modules-table">
          <thead>
            <tr>
              <th>Module Name</th>
              <th>Fields</th>
              <th>APIs</th>
              {user?.isAdmin && <th>Created By</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {modulesData.data.modules.map((module) => {
              const moduleFields = parseFields(module.fields);
              const moduleApis = parseApis(module.apis);
              const isOpen = expanded === module.moduleName;
              const isConfirmingDelete = deleteConfirm === module.moduleName;
              
              return (
                <React.Fragment key={module.id || module.moduleName}>
                  <tr className={isOpen ? 'expanded-row' : ''}>
                    <td>{module.moduleName}</td>
                    <td>
                      <div className="field-chips">
                        {moduleFields.slice(0, 3).map(f => (
                          <span key={f.name} className="field-chip">
                            {f.name} <small>({f.type})</small>
                          </span>
                        ))}
                        {moduleFields.length > 3 && (
                          <span className="field-chip more">
                            +{moduleFields.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="api-method-chips">
                        {Object.entries(moduleApis).filter(([k, v]) => v).map(([k]) => (
                          <span 
                            key={k} 
                            className="api-method-chip"
                            style={{ backgroundColor: API_LABELS[k].color }}
                          >
                            {API_LABELS[k].method}
                          </span>
                        ))}
                      </div>
                    </td>
                    {user?.isAdmin && (
                      <td>
                        {module.userId ? (
                          <span className="user-badge">
                            {module.userId === user.id ? 'You' : `User ID: ${module.userId.substring(0, 8)}...`}
                          </span>
                        ) : (
                          <span className="user-badge system">System</span>
                        )}
                      </td>
                    )}
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="action-button view-button"
                          onClick={() => setExpanded(isOpen ? null : module.moduleName)}
                        >
                          <FaEye /> {isOpen ? 'Hide' : 'View'}
                        </button>
                        
                        {isConfirmingDelete ? (
                          <>
                            <button 
                              className="action-button delete-confirm-button"
                              onClick={() => handleDeleteModule(module.moduleName)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button 
                              className="action-button cancel-button"
                              onClick={() => setDeleteConfirm(null)}
                              disabled={isDeleting}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button 
                            className="action-button delete-button"
                            onClick={() => setDeleteConfirm(module.moduleName)}
                          >
                            <FaTrash /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="details-row">
                      <td colSpan={user?.isAdmin ? 5 : 4}>
                        <div className="api-details">
                          <h4>API Endpoints</h4>
                          <div className="api-endpoints-list">
                            {Object.entries(moduleApis).filter(([k, v]) => v).map(([k]) => (
                              <div key={k} className="api-endpoint-block">
                                <div 
                                  className="api-endpoint-method"
                                  style={{ backgroundColor: API_LABELS[k].color }}
                                >
                                  {API_LABELS[k]?.method || k.toUpperCase()}
                                </div>
                                <div className="api-endpoint-path">{API_LABELS[k]?.path(module.moduleName) || ''}</div>
                                {(k === 'post' || k === 'put') && (
                                  <>
                                    <div className="api-endpoint-label">
                                      Request Body:
                                      <button className="copy-button">
                                        <FaDownload /> Copy
                                      </button>
                                    </div>
                                    <pre className="api-endpoint-json">{JSON.stringify(sampleBody(moduleFields), null, 2)}</pre>
                                  </>
                                )}
                                <div className="api-endpoint-label">
                                  Response:
                                  <button className="copy-button">
                                    <FaDownload /> Copy
                                  </button>
                                </div>
                                <pre className="api-endpoint-json">{JSON.stringify(
                                  k === 'get' ? sampleResponse(moduleFields, true)
                                  : k === 'getById' || k === 'post' || k === 'put' ? sampleResponse(moduleFields, false)
                                  : { message: `${module.moduleName} deleted successfully` },
                                  null, 2
                                )}</pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="api-generator-container">
      <div className="api-generator-inner">
        <div className="page-header">
          <h1>API Generator</h1>
          <p>Generate RESTful APIs with a few clicks</p>
        </div>
        
        <div className="api-generator-card">
          <h2>Create New Module</h2>
          
          <form onSubmit={handleSubmit} className="api-generator-form">
            <div className="form-group">
              <label htmlFor="moduleName">Module Name:</label>
              <input 
                id="moduleName"
                value={moduleName} 
                onChange={e => setModuleName(e.target.value)} 
                placeholder="Enter module name (e.g. Product, User, Order)"
                required 
              />
            </div>
            
            <div className="form-section">
              <h3>Fields</h3>
              <div className="fields-container">
                {fields.map((field, idx) => (
                  <div key={idx} className="field-row">
                    <input
                      placeholder="Field name"
                      value={field.name}
                      onChange={e => handleFieldChange(idx, 'name', e.target.value)}
                      required
                    />
                    <select
                      value={field.type}
                      onChange={e => handleFieldChange(idx, 'type', e.target.value)}
                    >
                      {FIELD_TYPES.map(ft => (
                        <option key={ft.value} value={ft.value}>{ft.label}</option>
                      ))}
                    </select>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={field.unique}
                        onChange={e => handleFieldChange(idx, 'unique', e.target.checked)}
                      /> 
                      <span>Unique</span>
                    </label>
                    <button 
                      type="button" 
                      onClick={() => removeField(idx)} 
                      className="icon-button remove-button"
                      disabled={fields.length <= 1}
                    >
                      <FaMinus />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addField} className="icon-button add-button">
                <FaPlus /> Add Field
              </button>
            </div>
            
            <div className="form-section">
              <h3>APIs to Generate</h3>
              <div className="api-options">
                {Object.entries(DEFAULT_APIS).map(([key, _]) => (
                  <div key={key} className="api-option">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={apis[key]} 
                        onChange={() => handleApiChange(key)} 
                      />
                      <span className="api-method" style={{ backgroundColor: API_LABELS[key].color }}>
                        {API_LABELS[key].method}
                      </span>
                      <span className="api-path">{API_LABELS[key].path(moduleName || '{module}')}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <button 
              type="submit" 
              className="generate-button" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>Generating... <span className="spinner"></span></>
              ) : (
                <>Generate Module & APIs <FaCode /></>
              )}
            </button>
            
            {message && (
              <div className={`message ${messageType}`}>
                {messageType === 'success' ? <FaCheck /> : null}
                {message}
              </div>
            )}
          </form>
        </div>
        
        <div className="api-generator-card">
          <div className="card-header">
            <h2>Generated Modules</h2>
            <button className="refresh-button" onClick={() => refetch()}>
              Refresh
            </button>
          </div>
          
          {renderModulesList()}
        </div>
      </div>
    </div>
  );
} 