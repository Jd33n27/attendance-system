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
  
  // Material You Dynamic Color theme selection
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('oalcda_m3_theme') || 'lagos-lagoon';
  });

  // Apply M3 theme classes to the document body
  useEffect(() => {
    document.body.classList.remove('theme-lagos-lagoon', 'theme-yoruba-indigo', 'theme-golden-sun', 'theme-terracotta');
    document.body.classList.add(`theme-${currentTheme}`);
    
    // Auto-detect and sync dark mode settings
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const syncDarkMode = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        document.body.classList.add('dark-mode-detected');
      } else {
        document.body.classList.remove('dark-mode-detected');
      }
    };
    
    syncDarkMode(mq);
    mq.addEventListener('change', syncDarkMode);
    return () => mq.removeEventListener('change', syncDarkMode);
  }, [currentTheme]);

  const handleThemeChange = (themeName: string) => {
    setCurrentTheme(themeName);
    localStorage.setItem('oalcda_m3_theme', themeName);
  };

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

        {/* Dynamic Color Palette Picker (Material You emulation) */}
        <div className="theme-picker-container">
          <span className="theme-picker-label">Dynamic Theme:</span>
          <div className="theme-picker-options">
            <button 
              type="button"
              className={`theme-dot lagos-lagoon ${currentTheme === 'lagos-lagoon' ? 'active' : ''}`}
              title="Lagos Lagoon (Teal)"
              onClick={() => handleThemeChange('lagos-lagoon')}
            />
            <button 
              type="button"
              className={`theme-dot yoruba-indigo ${currentTheme === 'yoruba-indigo' ? 'active' : ''}`}
              title="Yoruba Indigo (Blue)"
              onClick={() => handleThemeChange('yoruba-indigo')}
            />
            <button 
              type="button"
              className={`theme-dot golden-sun ${currentTheme === 'golden-sun' ? 'active' : ''}`}
              title="Golden Sun (Amber)"
              onClick={() => handleThemeChange('golden-sun')}
            />
            <button 
              type="button"
              className={`theme-dot terracotta ${currentTheme === 'terracotta' ? 'active' : ''}`}
              title="Terracotta Earth (Red)"
              onClick={() => handleThemeChange('terracotta')}
            />
          </div>
        </div>
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
              <div className="nav-icon-wrapper">
                <svg className="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                  <path d="M120-120v-180h60v120h120v60H120Zm560 0v-60h120v-120h60v180H680ZM120-660v-180h180v60H180v120h-60Zm560-180h180v180h-60v-120H680v-60ZM240-240v-480h480v480H240Zm60-60h360v-360H300v360Zm40-40h280v-280H340v280Z"/>
                </svg>
              </div>
              <span>Scanner</span>
            </button>
            <button 
              type="button" 
              className={`nav-button ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <div className="nav-icon-wrapper">
                <svg className="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                  <path d="M320-240h320v-60H320v60Zm0-120h320v-60H320v60Zm0-120h320v-60H320v60ZM200-80q-33 0-56.5-23.5T120-160v-640q0-33 23.5-56.5T200-880h320l240 240v480q0 33-23.5 56.5T680-80H200Zm0-80h480v-400H480v-200H200v600Zm0 0v-600 600Z"/>
                </svg>
              </div>
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
              <div className="nav-icon-wrapper">
                <svg className="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                  <path d="M480-120v-80h280v-560H480v-80h280q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H480Zm-80-160-55-58 102-102H120v-80h327L345-622l55-58 200 200-200 200Z"/>
                </svg>
              </div>
              <span>Login</span>
            </button>
            <button 
              type="button" 
              className={`nav-button ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              <div className="nav-icon-wrapper">
                <svg className="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                  <path d="M720-400v-120H600v-80h120v-120h80v120h120v80H800v120h-80Zm-360-80q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm0-80q33 0 56.5-23.5T440-640q0-33-23.5-56.5T360-720q-33 0-56.5 23.5T280-640q0 33 23.5 56.5T360-560Zm0 480q-83 0-156-31.5T78-197q-8-8-7.5-20t8.5-20q30-27 71-45t88-25q54-13 110-13t110 13q47 7 88 25t71 45q8 8 8.5 20t-7.5 20q-53 51-126 82.5T360-80Zm0-80q64 0 120-19t102-53q-46-24-99-36t-123-12q-70 0-123 12t-99 36q46 34 102 53t120 19Zm0-480Z"/>
                </svg>
              </div>
              <span>Register</span>
            </button>
            <button 
              type="button" 
              className={`nav-button ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <div className="nav-icon-wrapper">
                <svg className="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                  <path d="M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Zm0-84q104-33 172-127.5T720-516v-190l-240-90-240 90v190q0 130 68 224.5T480-164Zm0-316Zm0-120q-33 0-56.5-23.5T400-680q0-33 23.5-56.5T480-760q33 0 56.5 23.5T560-680q0 33-23.5 56.5T480-600Zm0 240q-68 0-126-29t-94-81q2-37 32.5-63.5T368-560q49 24 112 24t112-24q45 0 75.5 26.5T700-470q-36 52-94 81t-126 29Z"/>
                </svg>
              </div>
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
                style={{ border: '1px solid var(--panel-border)', borderRadius: '24px', padding: '12px 24px' }}
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
