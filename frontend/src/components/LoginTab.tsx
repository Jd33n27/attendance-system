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
          <div className="feedback-icon">⚠️</div>
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
          <input
            id="password"
            type="password"
            className="input-control"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
          {loading ? 'Authenticating...' : '🔑 Log In to Portal'}
        </button>
      </form>
    </div>
  );
};
