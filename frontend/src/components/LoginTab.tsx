import React, { useState } from 'react';
import { client } from '../api/client';
import type { User } from '../api/client';

interface LoginTabProps {
  onLoginSuccess: (user: User) => void;
  onLoginNotFound?: (unrecognizedKey: string) => void; // kept for TS signature compatibility in App.tsx
}

export const LoginTab: React.FC<LoginTabProps> = ({ onLoginSuccess }) => {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Operations');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await client.login(name.trim(), department, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Invalid name, department, or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2 style={{ marginBottom: '8px', fontWeight: 600 }}>Worker Log In</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
        Enter your Name, Department, and chosen Password to access your portal.
      </p>

      {error && (
        <div className="feedback-card error" style={{ marginBottom: '20px' }}>
          <div className="feedback-icon">!</div>
          <div>
            <div className="feedback-title">Access Denied</div>
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
          <label htmlFor="password">Password</label>
          <div className="password-input-container">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="input-control"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
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
          {loading ? 'Authenticating...' : 'Log In to Portal'}
        </button>
      </form>
    </div>
  );
};
