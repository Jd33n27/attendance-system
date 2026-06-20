import { useState, useEffect } from 'react';
import type { User } from './api/client';
import { RegisterTab } from './components/RegisterTab';
import { ScannerTab } from './components/ScannerTab';
import { HistoryTab } from './components/HistoryTab';
import { AdminTab } from './components/AdminTab';

type Tab = 'scanner' | 'register' | 'history' | 'admin';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('scanner');
  const [user, setUser] = useState<User | null>(null);

  // Load user profile on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('oalcda_active_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('oalcda_active_user');
      }
    } else {
      // Direct unregistered users to register page
      setActiveTab('register');
    }
  }, []);

  const handleRegisterSuccess = (newUser: User) => {
    localStorage.setItem('oalcda_active_user', JSON.stringify(newUser));
    setUser(newUser);
    setActiveTab('scanner'); // switch directly to scanner on registration
  };

  const handleDisconnect = () => {
    if (confirm("Are you sure you want to disconnect? This will log you out from this device.")) {
      localStorage.removeItem('oalcda_active_user');
      setUser(null);
      setActiveTab('register');
    }
  };

  return (
    <>
      {/* Brand Header */}
      <header>
        <div className="logo-container">
          <div className="logo-badge">OALCDA</div>
          <h1>Attendance</h1>
        </div>
        <p className="subtitle">Lagos Local Council Attendance Portal</p>
      </header>

      {/* Navigation Slider */}
      <nav>
        {user ? (
          <>
            <button 
              type="button" 
              className={`nav-button ${activeTab === 'scanner' ? 'active' : ''}`}
              onClick={() => setActiveTab('scanner')}
            >
              <span className="nav-icon">📷</span>
              <span>Scanner</span>
            </button>
            <button 
              type="button" 
              className={`nav-button ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <span className="nav-icon">📊</span>
              <span>Logs</span>
            </button>
          </>
        ) : (
          <button 
            type="button" 
            className={`nav-button ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            <span className="nav-icon">📝</span>
            <span>Register</span>
          </button>
        )}
        <button 
          type="button" 
          className={`nav-button ${activeTab === 'admin' ? 'active' : ''}`}
          onClick={() => setActiveTab('admin')}
        >
          <span className="nav-icon">🔑</span>
          <span>Admin</span>
        </button>
      </nav>

      {/* Profile disconnect banner (only when registered and not on admin view) */}
      {user && activeTab !== 'admin' && (
        <div style={{ textAlign: 'right', marginBottom: '8px' }}>
          <button 
            type="button" 
            className="btn-disconnect" 
            style={{ fontSize: '11px' }}
            onClick={handleDisconnect}
          >
            Logout Profile ✕
          </button>
        </div>
      )}

      {/* Main Tab Render Views */}
      <main style={{ flexGrow: 1 }}>
        {activeTab === 'register' && !user && (
          <RegisterTab onRegisterSuccess={handleRegisterSuccess} />
        )}

        {activeTab === 'scanner' && user && (
          <ScannerTab user={user} />
        )}

        {activeTab === 'history' && user && (
          <HistoryTab user={user} />
        )}

        {activeTab === 'admin' && (
          <AdminTab />
        )}

        {/* Catch-all warning if user gets into tab without registering */}
        {activeTab !== 'admin' && !user && activeTab !== 'register' && (
          <div className="panel" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>⚠️</span>
            <h2 style={{ marginBottom: '8px' }}>Profile Required</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              You must register a worker profile before you can access the scanner or shift logs.
            </p>
            <button 
              type="button" 
              className="btn-primary" 
              onClick={() => setActiveTab('register')}
            >
              Go to Registration
            </button>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer style={{ marginTop: 'auto', padding: '32px 0 16px 0', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
        © {new Date().getFullYear()} Orile Agege LCDA • Digital Attendance MVPs
      </footer>
    </>
  );
}

export default App;
