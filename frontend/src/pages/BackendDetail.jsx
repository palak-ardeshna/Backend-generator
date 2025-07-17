import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  useGetBackendByIdQuery,
  useGenerateModuleForBackendMutation,
  useUpdateBackendMutation,
  useLazyExportBackendQuery,
  useDeleteModuleFromBackendMutation,
  useUpdateModuleInBackendMutation
} from '../features/apiGenerator/apiGeneratorApi';
import { FaPlus, FaMinus, FaCode, FaTrash, FaCheck, FaDownload, FaArrowLeft, FaEdit } from 'react-icons/fa';
import './BackendDetail.css';

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

export default function BackendDetail() {
  const { backendId } = useParams();
  const { data: backendData, isLoading, refetch } = useGetBackendByIdQuery(backendId);
  const [generateModule, { isLoading: isGenerating }] = useGenerateModuleForBackendMutation();
  const [updateBackend, { isLoading: isUpdating }] = useUpdateBackendMutation();
  const [exportBackend, { isLoading: isExporting }] = useLazyExportBackendQuery();
  const [deleteModule, { isLoading: isDeleting }] = useDeleteModuleFromBackendMutation();
  const [updateModule, { isLoading: isUpdatingModule }] = useUpdateModuleInBackendMutation();
  
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentModuleName, setCurrentModuleName] = useState('');
  const [moduleFormData, setModuleFormData] = useState({
    moduleName: '',
    fields: [
      { name: '', type: 'String', unique: false },
    ],
    apis: DEFAULT_APIS,
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setModuleFormData({ ...moduleFormData, [name]: value });
  };
  
  const handleFieldChange = (idx, key, value) => {
    setModuleFormData({
      ...moduleFormData,
      fields: moduleFormData.fields.map((f, i) => (i === idx ? { ...f, [key]: value } : f)),
    });
  };
  
  const addField = () => {
    setModuleFormData({
      ...moduleFormData,
      fields: [...moduleFormData.fields, { name: '', type: 'String', unique: false }],
    });
  };
  
  const removeField = (idx) => {
    if (moduleFormData.fields.length > 1) {
      setModuleFormData({
        ...moduleFormData,
        fields: moduleFormData.fields.filter((_, i) => i !== idx),
      });
    }
  };
  
  const handleApiChange = (key) => {
    setModuleFormData({
      ...moduleFormData,
      apis: {
        ...moduleFormData.apis,
        [key]: !moduleFormData.apis[key],
      },
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!moduleFormData.moduleName.trim()) {
      setMessage('Module name is required');
      setMessageType('error');
      return;
    }
    
    if (moduleFormData.fields.some(f => !f.name.trim())) {
      setMessage('All fields must have a name');
      setMessageType('error');
      return;
    }
    
    if (!Object.values(moduleFormData.apis).some(v => v)) {
      setMessage('At least one API must be selected');
      setMessageType('error');
      return;
    }
    
    try {
      if (isEditMode) {
        await updateModule({
          backendId,
          moduleName: currentModuleName,
          fields: moduleFormData.fields,
          apis: moduleFormData.apis,
        }).unwrap();
        
        setMessage(`Module ${currentModuleName} updated successfully!`);
      } else {
        await generateModule({
          backendId,
          ...moduleFormData,
        }).unwrap();
        
        setMessage(`Module ${moduleFormData.moduleName} generated successfully!`);
      }
      
      setMessageType('success');
      setShowModuleForm(false);
      setIsEditMode(false);
      setCurrentModuleName('');
      setModuleFormData({
        moduleName: '',
        fields: [
          { name: '', type: 'String', unique: false },
        ],
        apis: DEFAULT_APIS,
      });
      refetch();
    } catch (err) {
      setMessage(err?.data?.message || (isEditMode ? 'Error updating module' : 'Error generating module'));
      setMessageType('error');
    }
  };
  
  const handleDeleteModule = async (moduleName) => {
    if (window.confirm(`Are you sure you want to delete the module "${moduleName}"?`)) {
      try {
        await deleteModule({
          backendId,
          moduleName,
        }).unwrap();
        
        setMessage(`Module ${moduleName} deleted successfully!`);
        setMessageType('success');
        refetch();
      } catch (err) {
        setMessage(err?.data?.message || 'Error deleting module');
        setMessageType('error');
      }
    }
  };
  
  const handleEditModule = (moduleName) => {
    if (!backendData || !backendData.data || !backendData.data.modules) return;
    
    const moduleData = backendData.data.modules[moduleName];
    if (!moduleData) return;
    
    // Convert fields from object to array format
    const fieldsArray = Object.entries(moduleData.fields).map(([name, config]) => ({
      name,
      type: config.type || 'String',
      unique: !!config.unique,
    }));
    
    setIsEditMode(true);
    setCurrentModuleName(moduleName);
    setModuleFormData({
      moduleName,
      fields: fieldsArray.length > 0 ? fieldsArray : [{ name: '', type: 'String', unique: false }],
      apis: moduleData.apis || DEFAULT_APIS,
    });
    setShowModuleForm(true);
  };
  
  const handleExportBackend = async () => {
    try {
      const result = await exportBackend(backendId);
      
      if (result.data) {
        // Create a download link
        const url = window.URL.createObjectURL(result.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${backendData.data.name.toLowerCase().replace(/\s+/g, '-')}-backend.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (err) {
      setMessage('Error exporting backend');
      setMessageType('error');
    }
  };
  
  if (isLoading) {
    return <div className="loading">Loading backend details...</div>;
  }
  
  if (!backendData || !backendData.data) {
    return <div className="error">Backend not found</div>;
  }
  
  const backend = backendData.data;
  const generatedModules = backend.generatedModules?.generated || [];
  
  return (
    <div className="backend-detail-container">
      <div className="backend-detail-inner">
        <div className="page-header">
          <Link to="/backends" className="back-link">
            <FaArrowLeft /> Back to Backends
          </Link>
          <h1>{backend.name}</h1>
          <p>{backend.description || 'No description provided'}</p>
        </div>
        
        <div className="backend-info-card">
          <div className="info-header">
            <h2>Backend Information</h2>
            <div className="info-actions">
              <button
                className="action-button export-button"
                onClick={handleExportBackend}
                disabled={isExporting}
              >
                <FaDownload /> Export Backend
              </button>
            </div>
          </div>
          
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Database Type</span>
              <span className="info-value">{backend.dbType}</span>
            </div>
            
            <div className="info-item">
              <span className="info-label">Database Host</span>
              <span className="info-value">{backend.dbConfig?.host || 'localhost'}</span>
            </div>
            
            <div className="info-item">
              <span className="info-label">Database Name</span>
              <span className="info-value">{backend.dbConfig?.database || backend.name.toLowerCase().replace(/\s+/g, '_')}</span>
            </div>
            
            <div className="info-item">
              <span className="info-label">Created At</span>
              <span className="info-value">{new Date(backend.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="modules-section">
          <div className="section-header">
            <h2>API Modules</h2>
            <button
              className="create-module-button"
              onClick={() => {
                setIsEditMode(false);
                setCurrentModuleName('');
                setModuleFormData({
                  moduleName: '',
                  fields: [
                    { name: '', type: 'String', unique: false },
                  ],
                  apis: DEFAULT_APIS,
                });
                setShowModuleForm(!showModuleForm);
              }}
            >
              {showModuleForm && !isEditMode ? 'Cancel' : <><FaPlus /> Create New Module</>}
            </button>
          </div>
          
          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}
          
          {showModuleForm && (
            <div className="module-form-card">
              <h3>{isEditMode ? `Edit Module: ${currentModuleName}` : 'Create New Module'}</h3>
              <form onSubmit={handleSubmit} className="module-form">
                <div className="form-group">
                  <label htmlFor="moduleName">Module Name:</label>
                  <input
                    id="moduleName"
                    name="moduleName"
                    value={moduleFormData.moduleName}
                    onChange={handleInputChange}
                    placeholder="Enter module name (e.g. Product, User, Order)"
                    required
                    disabled={isEditMode}
                  />
                </div>
                
                <div className="form-section">
                  <h4>Fields</h4>
                  <div className="fields-container">
                    {moduleFormData.fields.map((field, idx) => (
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
                          disabled={moduleFormData.fields.length <= 1}
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
                  <h4>APIs to Generate</h4>
                  <div className="api-options">
                    {Object.entries(DEFAULT_APIS).map(([key, _]) => (
                      <div key={key} className="api-option">
                        <label className="checkbox-label">
                          <input 
                            type="checkbox" 
                            checked={moduleFormData.apis[key]} 
                            onChange={() => handleApiChange(key)} 
                          />
                          <span className="api-method" style={{ backgroundColor: API_LABELS[key].color }}>
                            {API_LABELS[key].method}
                          </span>
                          <span className="api-path">{API_LABELS[key].path(moduleFormData.moduleName || '{module}')}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  className="generate-button" 
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>Generating... <span className="spinner"></span></>
                  ) : (
                    <>Generate Module & APIs <FaCode /></>
                  )}
                </button>
              </form>
            </div>
          )}
          
          <div className="modules-list">
            {generatedModules.length === 0 ? (
              <div className="no-modules">No modules generated yet. Create your first module!</div>
            ) : (
              generatedModules.map((moduleName) => {
                const moduleData = backend.modules?.[moduleName] || {};
                const fields = moduleData.fields || {};
                const apis = moduleData.apis || {};
                
                return (
                  <div key={moduleName} className="module-card">
                    <div className="module-header">
                      <h3>{moduleName}</h3>
                      <div className="module-actions">
                        <button
                          className="action-button edit-button"
                          onClick={() => handleEditModule(moduleName)}
                          disabled={isUpdatingModule}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="action-button delete-button"
                          onClick={() => handleDeleteModule(moduleName)}
                          disabled={isDeleting}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    
                    <div className="module-content">
                      <div className="module-fields">
                        <h4>Fields</h4>
                        <ul>
                          {Object.entries(fields).map(([fieldName, fieldConfig]) => (
                            <li key={fieldName}>
                              <strong>{fieldName}</strong>: {fieldConfig.type}
                              {fieldConfig.unique && <span className="unique-badge">Unique</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="module-apis">
                        <h4>API Endpoints</h4>
                        <div className="api-list">
                          {Object.entries(API_LABELS).map(([key, { method, path, color }]) => {
                            const isEnabled = apis[key] !== false;
                            return (
                              <div
                                key={key}
                                className={`api-item ${isEnabled ? 'enabled' : 'disabled'}`}
                              >
                                <span className="api-method" style={{ backgroundColor: isEnabled ? color : '#ccc' }}>
                                  {method}
                                </span>
                                <span className="api-path">{path(moduleName)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 