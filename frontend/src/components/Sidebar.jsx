import { NavLink } from 'react-router-dom';
import { 
  FaHome, 
  FaCode, 
  FaUsers, 
  FaBoxes, 
  FaTags, 
  FaCog, 
  FaChartBar,
  FaSignOutAlt,
  FaServer
} from 'react-icons/fa';
import ProfileAvatar from './ProfileAvatar';
import './Sidebar.css';

export default function Sidebar({ user, onLogout }) {
  const menuItems = [
    { path: '/dashboard', icon: <FaHome />, label: 'Dashboard' },
    { path: '/api-generator', icon: <FaCode />, label: 'API Generator' },
    { path: '/backends', icon: <FaServer />, label: 'My Backends' },
    { path: '/users', icon: <FaUsers />, label: 'Users' },
    { path: '/settings', icon: <FaCog />, label: 'Settings' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        {user ? (
          <div className="sidebar-user">
            <ProfileAvatar user={user} size={40} />
            <span className="sidebar-username">{user.name || user.username}</span>
          </div>
        ) : (
          <h1>Welcome</h1>
        )}
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink 
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        {onLogout && (
          <button className="logout-button" onClick={onLogout}>
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        )}
        <div className="sidebar-version">v1.0.0</div>
      </div>
    </aside>
  );
} 