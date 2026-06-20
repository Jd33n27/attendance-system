import { useState, useEffect } from 'react';
import type { User } from './api/client';
import { LoginTab } from './components/LoginTab';
import { RegisterTab } from './components/RegisterTab';
import { ScannerTab } from './components/ScannerTab';
import { HistoryTab } from './components/HistoryTab';
import { AdminTab } from './components/AdminTab';

type Tab = 'login' | 'register' | 'scanner' | 'history' | 'admin';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [user, setUser] = useState<User | null>(null);
  const [unrecognizedKey, setUnrecognizedKey] = useState<string | null>(null);

  // Load user profile on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('oalcda_active_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setActiveTab('scanner'); // switch directly to scanner if logged in
      } catch (e) {
        localStorage.removeItem('oalcda_active_user');
        setActiveTab('login');
      }
    } else {
      setActiveTab('login');
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    localStorage.setItem('oalcda_active_user', JSON.stringify(loggedInUser));
    localStorage.removeItem('oalcda_admin_token'); // Clear admin token to isolate sessions
    setUser(loggedInUser);
    setUnrecognizedKey(null);
    setActiveTab('scanner');
  };

  const handleLoginNotFound = (scannedKey: string) => {
    setUnrecognizedKey(scannedKey);
    setActiveTab('register'); // Redirect to registration
  };

  const handleRegisterSuccess = (newUser: User) => {
    localStorage.setItem('oalcda_active_user', JSON.stringify(newUser));
    localStorage.removeItem('oalcda_admin_token'); // Clear admin token to isolate sessions
    setUser(newUser);
    setUnrecognizedKey(null);
    setActiveTab('scanner'); // switch directly to scanner on registration
  };

  const handleDisconnect = () => {
    if (confirm("Are you sure you want to disconnect? This will log you out from this device.")) {
      localStorage.removeItem('oalcda_active_user');
      localStorage.removeItem('oalcda_admin_token'); // Clear everything on disconnect
      setUser(null);
      setUnrecognizedKey(null);
      setActiveTab('login');
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
              <span>Scanner</span>
            </button>
            <button 
              type="button" 
              className={`nav-button ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <span>Logs</span>
            </button>
          </>
        ) : (
          <>
            <button 
              type="button" 
              className={`nav-button ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setUnrecognizedKey(null);
                setActiveTab('login');
              }}
            >
              <span>Login</span>
            </button>
            <button 
              type="button" 
              className={`nav-button ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              <span>Register</span>
            </button>
            <button 
              type="button" 
              className={`nav-button ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <span>Admin</span>
            </button>
          </>
        )}
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
        {activeTab === 'login' && !user && (
          <LoginTab onLoginSuccess={handleLoginSuccess} onLoginNotFound={handleLoginNotFound} />
        )}

        {activeTab === 'register' && !user && (
          <RegisterTab onRegisterSuccess={handleRegisterSuccess} unrecognizedKey={unrecognizedKey} />
        )}

        {activeTab === 'scanner' && user && (
          <ScannerTab user={user} />
        )}

        {activeTab === 'history' && user && (
          <HistoryTab user={user} />
        )}

        {activeTab === 'admin' && !user && (
          <AdminTab />
        )}

        {/* Catch-all warning if user gets into tab without registering */}
        {activeTab !== 'admin' && !user && activeTab !== 'register' && activeTab !== 'login' && (
          <div className="panel" style={{ textAlign: 'center' }}>
            <h2 style={{ marginBottom: '8px' }}>Profile Required</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              You must register or log in to a worker profile before you can access the scanner or shift logs.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => setActiveTab('login')}
              >
                Go to Login
              </button>
              <button 
                type="button" 
                className="btn-disconnect" 
                style={{ border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '12px 24px' }}
                onClick={() => setActiveTab('register')}
              >
                Go to Registration
              </button>
            </div>
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

