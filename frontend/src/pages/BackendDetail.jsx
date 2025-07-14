import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  useGetBackendByIdQuery,
  useGenerateModuleForBackendMutation,
  useUpdateBackendMutation,
  useLazyExportBackendQuery
} from '../features/apiGenerator/apiGeneratorApi';
import { FaPlus, FaMinus, FaCode, FaTrash, FaCheck, FaDownload, FaArrowLeft } from 'react-icons/fa';
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
  
  const [showModuleForm, setShowModuleForm] = useState(false);
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
      await generateModule({
        backendId,
        ...moduleFormData,
      }).unwrap();
      
      setMessage(`Module ${moduleFormData.moduleName} generated successfully!`);
      setMessageType('success');
      setShowModuleForm(false);
      setModuleFormData({
        moduleName: '',
        fields: [
          { name: '', type: 'String', unique: false },
        ],
        apis: DEFAULT_APIS,
      });
      refetch();
    } catch (err) {
      setMessage(err?.data?.message || 'Error generating module');
      setMessageType('error');
    }
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
              onClick={() => setShowModuleForm(!showModuleForm)}
            >
              {showModuleForm ? 'Cancel' : <><FaPlus /> Create New Module</>}
            </button>
          </div>
          
          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}
          
          {showModuleForm && (
            <div className="module-form-card">
              <h3>Create New Module</h3>
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
            {generatedModules.length > 0 ? (
              generatedModules.map((moduleName) => {
                const moduleData = backend.modules?.[moduleName] || {};
                const apis = moduleData.apis || {};
                
                return (
                  <div key={moduleName} className="module-card">
                    <div className="module-header">
                      <h3>{moduleName}</h3>
                      <div className="api-method-chips">
                        {Object.entries(apis).filter(([k, v]) => v).map(([k]) => (
                          <span 
                            key={k} 
                            className="api-method-chip"
                            style={{ backgroundColor: API_LABELS[k]?.color }}
                          >
                            {API_LABELS[k]?.method || k.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="module-fields">
                      <h4>Fields</h4>
                      <div className="fields-list">
                        {moduleData.fields && (
                          Array.isArray(moduleData.fields)
                            ? moduleData.fields.map((field, idx) => (
                                <div key={idx} className="field-item">
                                  <span className="field-name">{field.name}</span>
                                  <span className="field-type">{field.type}</span>
                                  {field.unique && <span className="field-unique">Unique</span>}
                                </div>
                              ))
                            : Object.entries(moduleData.fields).map(([fieldName, fieldData], idx) => (
                                <div key={idx} className="field-item">
                                  <span className="field-name">{fieldName}</span>
                                  <span className="field-type">{fieldData.type}</span>
                                  {fieldData.unique && <span className="field-unique">Unique</span>}
                                </div>
                              ))
                        )}
                      </div>
                    </div>
                    
                    <div className="module-endpoints">
                      <h4>API Endpoints</h4>
                      <div className="endpoints-list">
                        {Object.entries(apis).filter(([k, v]) => v).map(([k]) => (
                          <div key={k} className="endpoint-item">
                            <span 
                              className="endpoint-method"
                              style={{ backgroundColor: API_LABELS[k]?.color }}
                            >
                              {API_LABELS[k]?.method || k.toUpperCase()}
                            </span>
                            <span className="endpoint-path">{API_LABELS[k]?.path(moduleName) || ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <FaCode size={48} />
                <p>No modules generated yet.</p>
                <p>Use the "Create New Module" button to generate your first API module.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 