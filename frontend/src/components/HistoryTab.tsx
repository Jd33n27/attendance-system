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
  const [showBadge, setShowBadge] = useState(false);

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
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Collapsible Worker Badge Button */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '16px' }}>
        <button
          type="button"
          className="manual-scan-trigger"
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--input-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setShowBadge(!showBadge)}
        >
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{showBadge ? 'Hide' : 'Show'} My Digital Worker Card</span>
          <span style={{ fontSize: '12px' }}>{showBadge ? '▲' : '▼'}</span>
        </button>

        {showBadge && (
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              border: '1px solid var(--panel-border)',
              background: 'linear-gradient(145deg, var(--input-bg), var(--panel-bg))',
              borderRadius: '16px',
              padding: '20px',
              width: '100%',
              maxWidth: '300px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              borderTop: '4px solid var(--primary)',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--primary)', letterSpacing: '1px' }}>ORILE AGEGE LCDA</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Official Staff ID Card</div>
                </div>
                <div className="logo-badge" style={{ padding: '2px 6px', fontSize: '8px' }}>STAFF</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '12px 0' }}>
                <div style={{ background: '#fff', padding: '6px', borderRadius: '8px', display: 'inline-block' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(user.qr_key)}`}
                    alt="Worker QR Code"
                    style={{ width: '120px', height: '120px', display: 'block' }}
                  />
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', background: 'var(--panel-border)', padding: '2px 6px', borderRadius: '4px' }}>
                  {user.qr_key}
                </div>
              </div>

              <div style={{ gap: '8px', display: 'flex', flexDirection: 'column', fontSize: '13px' }}>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Name</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Department</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{user.department}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', borderTop: '1px dashed var(--panel-border)', paddingTop: '6px', marginTop: '2px' }}>
                  <span>ID: {user.id.slice(0, 8)}...</span>
                  <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
        Viewing historical clock-in and clock-out logs for <strong>{user.name}</strong>.
      </p>


      {error && (
        <div className="feedback-card error" style={{ marginBottom: '20px' }}>
          <div className="feedback-icon">!</div>
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
                    {log.duration_hours?.toFixed(2) || '0.00'} hrs
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
