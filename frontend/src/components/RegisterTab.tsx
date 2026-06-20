import React, { useState } from 'react';
import { client } from '../api/client';
import type { User } from '../api/client';

interface RegisterTabProps {
  onRegisterSuccess: (user: User) => void;
}

export const RegisterTab: React.FC<RegisterTabProps> = ({ onRegisterSuccess }) => {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Operations');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await client.register(name.trim(), department);
      onRegisterSuccess(user);
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

  return (
    <div className="panel">
      <h2 style={{ marginBottom: '16px', fontWeight: 600 }}>Worker Registration</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
        Register to generate your unique worker ID and enable digital clock-in/out scans.
      </p>

      {error && (
        <div className="feedback-card error" style={{ marginBottom: '20px' }}>
          <div className="feedback-icon">⚠️</div>
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

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
          {loading ? (
            <>
              Registering...
            </>
          ) : (
            <>
              <span>📝</span> Register & Connect
            </>
          )}
        </button>
      </form>
    </div>
  );
};
