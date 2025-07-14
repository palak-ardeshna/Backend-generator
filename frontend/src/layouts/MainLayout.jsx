import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

// TODO: Get user and onLogout from context or props for authentication
export default function MainLayout({ children, user, onLogout }) {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f7f8fa' }}>
      <Sidebar user={user} onLogout={onLogout} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Topbar user={user} onLogout={onLogout} />
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
} 