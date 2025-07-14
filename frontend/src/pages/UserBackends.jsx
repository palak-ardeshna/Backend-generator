import { useState } from 'react';
import { 
  useGetUserBackendsQuery,
  useCreateBackendMutation,
  useDeleteBackendMutation,
  useLazyExportBackendQuery
} from '../features/apiGenerator/apiGeneratorApi';
import { FaPlus, FaTrash, FaDownload, FaEdit, FaCog, FaCode } from 'react-icons/fa';
import './UserBackends.css';
import { Link } from 'react-router-dom';

const DATABASE_TYPES = [
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'mongodb', label: 'MongoDB' },
];

export default function UserBackends() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dbType: 'mysql',
    dbConfig: {
      host: 'localhost',
      port: 3306,
      database: '',
      username: 'root',
      password: '',
    },
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  
  const { data: backendsData, isLoading, refetch } = useGetUserBackendsQuery();
  const [createBackend, { isLoading: isCreating }] = useCreateBackendMutation();
  const [deleteBackend, { isLoading: isDeleting }] = useDeleteBackendMutation();
  const [exportBackend, { isLoading: isExporting }] = useLazyExportBackendQuery();
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleDbConfigChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      dbConfig: {
        ...formData.dbConfig,
        [name]: value,
      },
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await createBackend(formData).unwrap();
      setMessage('Backend created successfully!');
      setMessageType('success');
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        dbType: 'mysql',
        dbConfig: {
          host: 'localhost',
          port: 3306,
          database: '',
          username: 'root',
          password: '',
        },
      });
      refetch();
    } catch (err) {
      setMessage(err?.data?.message || 'Error creating backend');
      setMessageType('error');
    }
  };
  
  const handleDeleteBackend = async (backendId) => {
    try {
      await deleteBackend(backendId).unwrap();
      setMessage('Backend deleted successfully!');
      setMessageType('success');
      setDeleteConfirm(null);
      refetch();
    } catch (err) {
      setMessage(err?.data?.message || 'Error deleting backend');
      setMessageType('error');
    }
  };
  
  const handleExportBackend = async (backendId, backendName) => {
    try {
      const result = await exportBackend(backendId);
      
      if (result.data) {
        // Create a download link
        const url = window.URL.createObjectURL(result.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${backendName.toLowerCase().replace(/\s+/g, '-')}-backend.zip`;
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
  
  return (
    <div className="user-backends-container">
      <div className="user-backends-inner">
        <div className="page-header">
          <h1>My Backends</h1>
          <p>Create and manage your backend APIs</p>
        </div>
        
        <div className="action-bar">
          <button
            className="create-backend-button"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancel' : <><FaPlus /> Create New Backend</>}
          </button>
        </div>
        
        {showCreateForm && (
          <div className="backend-form-card">
            <h2>Create New Backend</h2>
            <form onSubmit={handleSubmit} className="backend-form">
              <div className="form-group">
                <label htmlFor="name">Backend Name:</label>
                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter backend name"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description:</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter backend description"
                  rows={3}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="dbType">Database Type:</label>
                <select
                  id="dbType"
                  name="dbType"
                  value={formData.dbType}
                  onChange={handleInputChange}
                >
                  {DATABASE_TYPES.map((db) => (
                    <option key={db.value} value={db.value}>
                      {db.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-section">
                <h3>Database Configuration</h3>
                
                <div className="form-group">
                  <label htmlFor="host">Host:</label>
                  <input
                    id="host"
                    name="host"
                    value={formData.dbConfig.host}
                    onChange={handleDbConfigChange}
                    placeholder="localhost"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="port">Port:</label>
                  <input
                    id="port"
                    name="port"
                    type="number"
                    value={formData.dbConfig.port}
                    onChange={handleDbConfigChange}
                    placeholder="3306"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="database">Database Name:</label>
                  <input
                    id="database"
                    name="database"
                    value={formData.dbConfig.database}
                    onChange={handleDbConfigChange}
                    placeholder="my_database"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="username">Username:</label>
                  <input
                    id="username"
                    name="username"
                    value={formData.dbConfig.username}
                    onChange={handleDbConfigChange}
                    placeholder="root"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="password">Password:</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.dbConfig.password}
                    onChange={handleDbConfigChange}
                    placeholder="Enter database password"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="create-button"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>Creating... <span className="spinner"></span></>
                ) : (
                  <>Create Backend <FaCode /></>
                )}
              </button>
            </form>
          </div>
        )}
        
        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}
        
        <div className="backends-grid">
          {isLoading ? (
            <div className="loading">Loading backends...</div>
          ) : backendsData?.data?.backends?.length > 0 ? (
            backendsData.data.backends.map((backend) => (
              <div key={backend.id} className="backend-card">
                <div className="backend-header">
                  <h3>{backend.name}</h3>
                  <span className="db-badge">{backend.dbType}</span>
                </div>
                
                <p className="backend-description">
                  {backend.description || 'No description provided'}
                </p>
                
                <div className="backend-stats">
                  <div className="stat">
                    <span className="stat-label">Modules:</span>
                    <span className="stat-value">
                      {backend.generatedModules?.generated?.length || 0}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Created:</span>
                    <span className="stat-value">
                      {new Date(backend.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="backend-actions">
                  <Link
                    to={`/backends/${backend.id}`}
                    className="action-button manage-button"
                  >
                    <FaCog /> Manage
                  </Link>
                  
                  <button
                    className="action-button export-button"
                    onClick={() => handleExportBackend(backend.id, backend.name)}
                    disabled={isExporting}
                  >
                    <FaDownload /> Export
                  </button>
                  
                  {deleteConfirm === backend.id ? (
                    <>
                      <button
                        className="action-button confirm-button"
                        onClick={() => handleDeleteBackend(backend.id)}
                        disabled={isDeleting}
                      >
                        Confirm
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
                      onClick={() => setDeleteConfirm(backend.id)}
                    >
                      <FaTrash /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <FaCode size={48} />
              <p>No backends created yet.</p>
              <p>Click the "Create New Backend" button to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 