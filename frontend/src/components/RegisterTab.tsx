import React, { useState } from 'react';
import { client } from '../api/client';
import type { User } from '../api/client';

interface RegisterTabProps {
  onRegisterSuccess: (user: User) => void;
  unrecognizedKey?: string | null;
}

export const RegisterTab: React.FC<RegisterTabProps> = ({ onRegisterSuccess, unrecognizedKey }) => {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Operations');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!password.trim() || password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await client.register(name.trim(), department, password);
      setRegisteredUser(user);
    } catch (err: any) {
      setError(err.message || 'Failed to register. Please check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const departments = [
    'Operations',
    'Administration',
    'Finance',
    'Security',
    'Engineering & Works',
    'Waste Management',
    'Transport & Logistics',
    'Health Services',
    'Environment & Sanitation'
  ];

  if (registeredUser) {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(registeredUser.qr_key)}`;
    return (
      <div className="panel" style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: '8px', fontWeight: 600 }}>Registration Successful!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          Your digital worker badge is ready. <strong>Please screenshot this badge</strong> to scan when logging in or clocking shifts on other devices.
        </p>

        {/* Worker Badge Card */}
        <div style={{
          border: '1px solid var(--panel-border)',
          background: 'linear-gradient(145deg, var(--input-bg), var(--panel-bg))',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '340px',
          margin: '0 auto 24px auto',
          boxShadow: '0 8px 32px var(--primary-glow)',
          borderTop: '5px solid var(--primary)',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--primary)', letterSpacing: '1px' }}>ORILE AGEGE LCDA</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Official Attendance Card</div>
            </div>
            <div className="logo-badge" style={{ padding: '3px 8px', fontSize: '9px' }}>STAFF</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '16px 0' }}>
            <div style={{ background: '#fff', padding: '8px', borderRadius: '12px', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <img src={qrCodeUrl} alt="Worker QR Code" style={{ width: '160px', height: '160px', display: 'block' }} />
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', background: 'var(--panel-border)', padding: '2px 8px', borderRadius: '4px' }}>
              {registeredUser.qr_key}
            </div>
          </div>

          <div style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Worker Name</div>
              <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{registeredUser.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Department</div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-secondary)' }}>{registeredUser.department}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', borderTop: '1px dashed var(--panel-border)', paddingTop: '8px', marginTop: '4px' }}>
              <span>ID: {registeredUser.id.slice(0, 8)}...</span>
              <span>Joined: {new Date(registeredUser.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <button 
          type="button" 
          className="btn-primary" 
          onClick={() => onRegisterSuccess(registeredUser)}
        >
          Proceed to Scanner Tab ➔
        </button>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2 style={{ marginBottom: '16px', fontWeight: 600 }}>Worker Registration</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
        Register to generate your unique worker ID and enable digital clock-in/out scans.
      </p>

      {unrecognizedKey && (
        <div className="feedback-card error" style={{ marginBottom: '20px', background: 'var(--warning-bg)', borderColor: 'var(--warning-border)', color: 'var(--warning)' }}>
          <div className="feedback-icon">!</div>
          <div>
            <div className="feedback-title" style={{ color: 'var(--text-primary)' }}>Unregistered Worker Card</div>
            <div className="feedback-msg" style={{ fontSize: '13px' }}>
              The key <code>{unrecognizedKey}</code> is not registered. Fill in details below to register and link your profile.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="feedback-card error" style={{ marginBottom: '20px' }}>
          <div className="feedback-icon">!</div>
          <div>
            <div className="feedback-title">Registration Failed</div>
            <div className="feedback-msg">{error}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            type="text"
            className="input-control"
            placeholder="e.g. Adewale Johnson"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="dept">Department</label>
          <select
            id="dept"
            className="input-control"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={loading}
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="password">Choose Password</label>
          <div className="password-input-container">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="input-control"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              minLength={6}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              )}
            </button>
          </div>
        </div>


        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
          {loading ? 'Registering...' : 'Register & Connect'}
        </button>
      </form>
    </div>
  );
};

