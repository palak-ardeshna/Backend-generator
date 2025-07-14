import React from 'react';

const ProfileAvatar = ({ user, size = 40 }) => {
  if (!user) return null;
  
  // Get the first letter of the username or name
  const getInitial = () => {
    if (user.name && user.name.length > 0) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user.username && user.username.length > 0) {
      return user.username.charAt(0).toUpperCase();
    }
    return '?';
  };
  
  // Generate a consistent color based on the username
  const getBackgroundColor = () => {
    const colors = [
      '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#34495e',
      '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50',
      '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6', '#f39c12',
      '#d35400', '#c0392b', '#7f8c8d'
    ];
    
    if (!user.username && !user.name) return colors[0];
    
    const name = user.username || user.name;
    // Simple hash function to get a consistent index
    const hashCode = name.split('').reduce(
      (acc, char) => acc + char.charCodeAt(0), 0
    );
    
    return colors[hashCode % colors.length];
  };
  
  const avatarStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    backgroundColor: getBackgroundColor(),
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: `${size / 2}px`,
    userSelect: 'none',
  };
  
  // If user has a profile picture, show it instead
  if (user.profilePic) {
    return (
      <img 
        src={user.profilePic} 
        alt={user.name || user.username} 
        style={{
          ...avatarStyle,
          objectFit: 'cover',
        }}
      />
    );
  }
  
  // Otherwise show the initial letter
  return (
    <div style={avatarStyle}>
      {getInitial()}
    </div>
  );
};

export default ProfileAvatar; 