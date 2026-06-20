import React, { useState, useEffect, useCallback } from 'react';
import { client } from '../api/client';
import type { User, AttendanceLog } from '../api/client';

interface HistoryTabProps {
  user: User;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ user }) => {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.getLogs(user.id);
      setLogs(response.logs || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance logs.');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatLocalTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontWeight: 600 }}>Attendance History</h2>
        <button 
          type="button" 
          onClick={fetchLogs} 
          disabled={loading}
          className="manual-scan-trigger"
          style={{ textDecoration: 'none', border: '1px solid var(--panel-border)', padding: '6px 12px', borderRadius: '8px' }}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
        Viewing historical clock-in and clock-out logs for <strong>{user.name}</strong>.
      </p>

      {error && (
        <div className="feedback-card error" style={{ marginBottom: '20px' }}>
          <div className="feedback-icon">⚠️</div>
          <div>
            <div className="feedback-title">Sync Error</div>
            <div className="feedback-msg">{error}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="logs-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="log-item skeleton" style={{ height: '70px', border: 'none' }}></div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="log-empty">
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📂</span>
          No attendance logs recorded yet.
        </div>
      ) : (
        <div className="logs-list">
          {logs.map((log) => (
            <div key={log.id} className="log-item">
              <div>
                <div className="log-date">{formatDate(log.date)}</div>
                <div className="log-times">
                  <div>
                    <div className="log-time-label">Clock In</div>
                    <div className="log-time-val" style={{ color: 'var(--success)' }}>
                      {formatLocalTime(log.clock_in)}
                    </div>
                  </div>
                  <div>
                    <div className="log-time-label">Clock Out</div>
                    <div className="log-time-val" style={{ color: log.clock_out ? 'var(--text-primary)' : 'var(--warning)' }}>
                      {log.clock_out ? formatLocalTime(log.clock_out) : 'Pending'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                {log.clock_out ? (
                  <span className="log-duration">
                    ⏱️ {log.duration_hours?.toFixed(2) || '0.00'} hrs
                  </span>
                ) : (
                  <span className="status-pill in" style={{ fontSize: '10px' }}>
                    Active Shift
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
