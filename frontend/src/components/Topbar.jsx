import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaSearch, FaBell, FaEnvelope, FaCog, FaSignOutAlt } from 'react-icons/fa';
import ProfileAvatar from './ProfileAvatar';
import './Topbar.css';

export default function Topbar({ user, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  
  // Get current page name from location path
  const getPageName = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/api-generator') return 'API Generator';
    if (path === '/users') return 'Users';
    if (path === '/settings') return 'Settings';
    return 'Dashboard';
  };
  
  // Sample notifications for UI
  const notifications = [
    { id: 1, type: 'message', text: 'New message from John Doe', time: '5 min ago' },
    { id: 2, type: 'alert', text: 'System update completed', time: '1 hour ago' },
    { id: 3, type: 'info', text: 'Welcome to the dashboard!', time: '1 day ago' },
  ];

  return (
    <header className="topbar">
      <div className="topbar-left">
        <nav className="breadcrumbs">
          <span>Home</span> <span>/</span> <span>{getPageName()}</span>
        </nav>
      </div>
      
      <div className="topbar-right">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input type="text" placeholder="Search..." />
        </div>
        
        <div className="notification-container">
          <button 
            className="topbar-icon-button" 
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <FaBell />
            <span className="notification-badge">3</span>
          </button>
          
          {showNotifications && (
            <div className="dropdown-menu notification-menu">
              <div className="dropdown-header">
                <h3>Notifications</h3>
                <button className="mark-all-read">Mark all as read</button>
              </div>
              
              <div className="notification-list">
                {notifications.map(notification => (
                  <div key={notification.id} className="notification-item">
                    <div className={`notification-icon ${notification.type}`}>
                      {notification.type === 'message' ? <FaEnvelope /> : <FaBell />}
                    </div>
                    <div className="notification-content">
                      <p>{notification.text}</p>
                      <span className="notification-time">{notification.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="dropdown-footer">
                <button>View all notifications</button>
              </div>
            </div>
          )}
        </div>
        
        <div className="profile-container">
          <button 
            className="topbar-icon-button profile-button" 
            onClick={() => setShowMenu(!showMenu)}
          >
            <ProfileAvatar user={user} />
          </button>
          
          {showMenu && (
            <div className="dropdown-menu profile-menu">
              {user ? (
                <>
                  <div className="dropdown-header user-header">
                    <div className="user-avatar">
                      <ProfileAvatar user={user} size={50} />
                    </div>
                    <div className="user-info">
                      <h4>{user.name || user.username}</h4>
                      <p>{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="dropdown-items">
                    <button className="dropdown-item">
                      <ProfileAvatar user={user} size={24} />
                      <span>My Profile</span>
                    </button>
                    <button className="dropdown-item">
                      <FaCog />
                      <span>Account Settings</span>
                    </button>
                    <button className="dropdown-item logout-item" onClick={onLogout}>
                      <FaSignOutAlt />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="dropdown-items">
                  <p className="not-logged-in">Not logged in</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 