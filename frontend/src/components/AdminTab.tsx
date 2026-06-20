import React, { useState, useEffect, useCallback } from 'react';
import { client } from '../api/client';
import type { DailyQR, AdminLogItem, AdminUserItem } from '../api/client';

type AdminSubTab = 'qr_gen' | 'reports' | 'directory';

export const AdminTab: React.FC = () => {
  const [token, setToken] = useState(() => localStorage.getItem('oalcda_admin_token') || '');
  const [isAuthorized, setIsAuthorized] = useState(() => !!localStorage.getItem('oalcda_admin_token'));
  
  // Sub-navigation inside admin
  const [subTab, setSubTab] = useState<AdminSubTab>('qr_gen');

  // 1. QR code states
  const [activeQR, setActiveQR] = useState<DailyQR | null>(null);
  const [qrLoading, setQRLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [qrSuccessMsg, setQrSuccessMsg] = useState<string | null>(null);

  // 2. Reports/Logs states
  const [logs, setLogs] = useState<AdminLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [filters, setFilters] = useState({
    date: '',
    start_date: '',
    end_date: '',
    department: '',
    user_id: '',
  });

  // 3. User Directory states
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);

  // Common error states
  const [error, setError] = useState<string | null>(null);

  const fetchActiveQR = useCallback(async () => {
    setQRLoading(true);
    try {
      const qr = await client.getActiveQR();
      setActiveQR(qr);
    } catch (err) {
      setActiveQR(null);
    } finally {
      setQRLoading(false);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    if (!isAuthorized) return;
    setLogsLoading(true);
    setError(null);
    try {
      const data = await client.getAdminLogs(token, filters);
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch logs. Verify your token.');
    } finally {
      setLogsLoading(false);
    }
  }, [isAuthorized, token, filters]);

  const fetchUsers = useCallback(async () => {
    if (!isAuthorized) return;
    setUsersLoading(true);
    setError(null);
    try {
      const data = await client.getAdminUsers(token);
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch workers directory.');
    } finally {
      setUsersLoading(false);
    }
  }, [isAuthorized, token]);

  // Load data based on sub-tab navigation
  useEffect(() => {
    if (!isAuthorized) return;
    setError(null);

    if (subTab === 'qr_gen') {
      fetchActiveQR();
    } else if (subTab === 'reports') {
      fetchReports();
    } else if (subTab === 'directory') {
      fetchUsers();
    }
  }, [subTab, isAuthorized, fetchActiveQR, fetchReports, fetchUsers]);

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    localStorage.setItem('oalcda_admin_token', token.trim());
    setIsAuthorized(true);
    setError(null);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('oalcda_admin_token');
    setIsAuthorized(false);
    setToken('');
    setError(null);
    setActiveQR(null);
  };

  const handleGenerateQR = async () => {
    setGenLoading(true);
    setError(null);
    setQrSuccessMsg(null);

    try {
      const newQR = await client.generateDailyQR(token);
      setActiveQR(newQR);
      setQrSuccessMsg(`Generated active QR poster for: ${newQR.date}`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate QR. Admin token may be invalid.');
    } finally {
      setGenLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setToggleLoadingId(userId);
    setError(null);
    try {
      const targetStatus = !currentStatus;
      await client.toggleUserActive(token, userId, targetStatus);
      
      // Update UI state locally
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: targetStatus } : u));
    } catch (err: any) {
      setError(err.message || 'Failed to update user active status.');
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;

    // Build CSV Content
    let csvContent = 'Date,Worker Name,Department,Clock In,Clock Out,Duration (Hours)\n';
    
    logs.forEach(log => {
      const clockInStr = log.clock_in ? new Date(log.clock_in).toLocaleString() : '--:--';
      const clockOutStr = log.clock_out ? new Date(log.clock_out).toLocaleString() : '--:--';
      const durationStr = log.duration_hours ? log.duration_hours.toFixed(2) : 'In progress';
      
      // Escape commas in names/departments
      const nameEscaped = `"${log.user_name.replace(/"/g, '""')}"`;
      const deptEscaped = `"${log.department.replace(/"/g, '""')}"`;

      csvContent += `${log.date},${nameEscaped},${deptEscaped},${clockInStr},${clockOutStr},${durationStr}\n`;
    });

    // Download file locally
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Custom name with timestamp
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `OALCDA_Attendance_Logs_${dateStamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !activeQR) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>OALCDA Daily QR Code - ${activeQR.date}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 90vh;
              text-align: center;
              margin: 0;
            }
            .card {
              border: 4px double #000;
              padding: 40px;
              border-radius: 20px;
              background: #fff;
              max-width: 500px;
            }
            h1 {
              font-size: 28px;
              margin: 0 0 10px 0;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            h2 {
              font-size: 20px;
              color: #555;
              margin: 0 0 30px 0;
            }
            img {
              width: 320px;
              height: 320px;
              margin-bottom: 20px;
            }
            .code {
              font-family: monospace;
              font-size: 14px;
              background: #eee;
              padding: 8px 16px;
              border-radius: 6px;
              word-break: break-all;
            }
            .footer {
              margin-top: 30px;
              font-size: 12px;
              color: #777;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>OALCDA Daily Attendance</h1>
            <h2>Date: ${activeQR.date}</h2>
            <img src="${activeQR.image_url}" alt="Attendance QR Code" />
            <div class="code">${activeQR.qr_code_string}</div>
            <div class="footer">Scan to clock-in or clock-out. Powered by OALCDA Attendance System.</div>
          </div>
          <br/>
          <button class="no-print" onclick="window.print()" style="padding: 12px 24px; font-size: 16px; cursor: pointer; border-radius: 8px; background: #000; color: #fff; border: none;">
            🖨️ Print QR Poster
          </button>
        </body>
      </html>
    `);
    printWindow.document.close();
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

  const formatLocalTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div>
      {!isAuthorized ? (
        <div className="panel">
          <h2 style={{ marginBottom: '16px', fontWeight: 600 }}>Admin Portal Login</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            Enter administrative token key to access daily generator, attendance logs, and staff lists.
          </p>

          {error && (
            <div className="feedback-card error" style={{ marginBottom: '20px' }}>
              <div className="feedback-icon">⚠️</div>
              <div>
                <div className="feedback-title">Authorization Failed</div>
                <div className="feedback-msg">{error}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleAuthorize}>
            <div className="form-group">
              <label htmlFor="adminToken">Admin Security Token</label>
              <input
                id="adminToken"
                type="password"
                className="input-control"
                placeholder="Enter secret token key"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary">
              🔒 Authorise Session
            </button>
          </form>
        </div>
      ) : (
        <div>
          {/* Header Widget */}
          <div className="user-widget">
            <div className="user-widget-info">
              <div className="user-widget-name">🔑 Administrator Mode</div>
              <div className="user-widget-dept">Connected session</div>
            </div>
            <button type="button" className="btn-disconnect" onClick={handleDisconnect}>
              Logout
            </button>
          </div>

          {/* Sub Navigation */}
          <div className="toggle-container" style={{ borderRadius: '12px' }}>
            <div 
              className={`toggle-option ${subTab === 'qr_gen' ? 'active' : ''}`}
              style={{ fontSize: '13px', padding: '10px 4px' }}
              onClick={() => setSubTab('qr_gen')}
            >
              ⚡ QR Code
            </div>
            <div 
              className={`toggle-option ${subTab === 'reports' ? 'active' : ''}`}
              style={{ fontSize: '13px', padding: '10px 4px' }}
              onClick={() => setSubTab('reports')}
            >
              📊 Shift Logs
            </div>
            <div 
              className={`toggle-option ${subTab === 'directory' ? 'active' : ''}`}
              style={{ fontSize: '13px', padding: '10px 4px' }}
              onClick={() => setSubTab('directory')}
            >
              👥 Staff List
            </div>
            {/* Custom slider position */}
            <div 
              className={`toggle-slider`}
              style={{ 
                width: 'calc(33.33% - 4px)',
                transform: subTab === 'qr_gen' ? 'translateX(0)' : subTab === 'reports' ? 'translateX(100%)' : 'translateX(200%)',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                boxShadow: '0 4px 10px var(--primary-glow)'
              }}
            />
          </div>

          {error && (
            <div className="feedback-card error" style={{ marginBottom: '20px' }}>
              <div className="feedback-icon">⚠️</div>
              <div>
                <div className="feedback-title">System Error</div>
                <div className="feedback-msg">{error}</div>
              </div>
            </div>
          )}

          {/* SUB-VIEW 1: QR Generator */}
          {subTab === 'qr_gen' && (
            <div className="panel">
              <h2 style={{ marginBottom: '8px', fontWeight: 600 }}>Daily QR Generator</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                Publish a fresh QR code token for today. Display it on entry gates for workers to log shifts.
              </p>

              {qrSuccessMsg && (
                <div className="feedback-card success" style={{ marginBottom: '20px' }}>
                  <div className="feedback-icon">✨</div>
                  <div>
                    <div className="feedback-title">QR Code Generated</div>
                    <div className="feedback-msg">{qrSuccessMsg}</div>
                  </div>
                </div>
              )}

              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleGenerateQR}
                disabled={genLoading}
                style={{ marginBottom: '24px' }}
              >
                {genLoading ? 'Publishing...' : '⚡ Generate Today\'s QR Code'}
              </button>

              <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', textAlign: 'left' }}>
                  Active QR Code Status
                </h3>

                {qrLoading ? (
                  <div className="skeleton" style={{ height: '240px', width: '100%', borderRadius: '12px' }}></div>
                ) : activeQR ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="status-pill in" style={{ marginBottom: '12px' }}>Active Published</div>
                    <div className="qr-container">
                      <img src={activeQR.image_url} alt="Daily QR" className="qr-image" />
                      <div className="qr-string-code">{activeQR.qr_code_string}</div>
                    </div>
                    <button 
                      type="button" 
                      className="btn-primary"
                      style={{ background: 'var(--accent)', boxShadow: '0 4px 12px var(--accent-glow)' }}
                      onClick={handlePrint}
                    >
                      🖨️ Display / Print Poster
                    </button>
                  </div>
                ) : (
                  <div className="log-empty">
                    No active QR code published for today. Tap the button above to generate.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: Reports & Shift Logs */}
          {subTab === 'reports' && (
            <div className="panel">
              <h2 style={{ marginBottom: '8px', fontWeight: 600 }}>Shift Logs & Reports</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                Filter and export daily clock-in/out logs to CSV for payroll audit logs.
              </p>

              {/* Filters Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <label style={{ fontSize: '12px', marginBottom: '4px' }}>Date</label>
                    <input 
                      type="date" 
                      className="input-control" 
                      style={{ padding: '8px 12px', fontSize: '14px' }}
                      value={filters.date} 
                      onChange={e => setFilters(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <label style={{ fontSize: '12px', marginBottom: '4px' }}>Department</label>
                    <select 
                      className="input-control" 
                      style={{ padding: '8px 12px', fontSize: '14px' }}
                      value={filters.department}
                      onChange={e => setFilters(prev => ({ ...prev, department: e.target.value }))}
                    >
                      <option value="">All Departments</option>
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button 
                    type="button" 
                    className="btn-primary" 
                    style={{ flex: 2, padding: '10px', fontSize: '14px' }}
                    onClick={fetchReports}
                    disabled={logsLoading}
                  >
                    🔍 Apply Filters
                  </button>
                  <button 
                    type="button"
                    className="btn-disconnect" 
                    style={{ flex: 1, border: '1px solid var(--panel-border)', padding: '10px', borderRadius: '12px' }}
                    onClick={() => {
                      setFilters({ date: '', start_date: '', end_date: '', department: '', user_id: '' });
                      // fetch will run via useEffect
                    }}
                    disabled={logsLoading}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Logs display */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Records found: {logs.length}</span>
                {logs.length > 0 && (
                  <button 
                    type="button"
                    className="manual-scan-trigger"
                    style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success)', padding: '6px 12px', borderRadius: '8px' }}
                    onClick={handleExportCSV}
                  >
                    📊 Export CSV
                  </button>
                )}
              </div>

              {logsLoading ? (
                <div className="logs-list">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="log-item skeleton" style={{ height: '70px', border: 'none' }} />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="log-empty">
                  No attendance records found matching the filter criteria.
                </div>
              ) : (
                <div className="logs-list">
                  {logs.map(log => (
                    <div key={log.id} className="log-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '15px' }}>{log.user_name}</strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{log.department}</div>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📅 {log.date}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--panel-border)', paddingTop: '8px', marginTop: '4px' }}>
                        <div className="log-times">
                          <div>
                            <div className="log-time-label">Clock In</div>
                            <div className="log-time-val" style={{ color: 'var(--success)', fontSize: '12px' }}>
                              {formatLocalTime(log.clock_in)}
                            </div>
                          </div>
                          <div>
                            <div className="log-time-label">Clock Out</div>
                            <div className="log-time-val" style={{ color: log.clock_out ? 'var(--text-primary)' : 'var(--warning)', fontSize: '12px' }}>
                              {log.clock_out ? formatLocalTime(log.clock_out) : 'Active Shift'}
                            </div>
                          </div>
                        </div>

                        {log.clock_out ? (
                          <span className="log-duration" style={{ fontSize: '13px' }}>
                            ⏱️ {log.duration_hours?.toFixed(2)} hrs
                          </span>
                        ) : (
                          <span className="status-pill in" style={{ fontSize: '9px' }}>Scanning Shift</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUB-VIEW 3: Staff Directory */}
          {subTab === 'directory' && (
            <div className="panel">
              <h2 style={{ marginBottom: '8px', fontWeight: 600 }}>Staff Directory</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                View and manage registered workers. Deactivate profiles to temporarily disable shift logging.
              </p>

              {usersLoading ? (
                <div className="logs-list">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="log-item skeleton" style={{ height: '70px', border: 'none' }} />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="log-empty">
                  No staff members registered in the database yet.
                </div>
              ) : (
                <div className="logs-list">
                  {users.map(u => (
                    <div key={u.id} className="log-item" style={{ gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <strong style={{ color: u.active ? 'var(--text-primary)' : 'var(--text-muted)' }}>{u.name}</strong>
                          <span className={`status-pill ${u.active ? 'in' : 'out'}`} style={{ fontSize: '8px', padding: '2px 6px' }}>
                            {u.active ? 'Active' : 'Suspended'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.department}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '4px' }}>
                          ID: {u.id.slice(0, 8)}... • QR Prefix: {u.qr_key}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>
                          📊 {u.total_attendance} shifts
                        </span>
                        
                        <button
                          type="button"
                          className="btn-disconnect"
                          style={{ 
                            fontSize: '11px',
                            color: u.active ? 'var(--error)' : 'var(--success)', 
                            background: u.active ? 'var(--error-bg)' : 'var(--success-bg)',
                            border: '1px solid',
                            borderColor: u.active ? 'var(--error-border)' : 'var(--success-border)',
                            padding: '4px 10px',
                            borderRadius: '8px'
                          }}
                          disabled={toggleLoadingId === u.id}
                          onClick={() => handleToggleUserStatus(u.id, u.active)}
                        >
                          {toggleLoadingId === u.id ? 'Updating...' : u.active ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
