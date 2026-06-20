import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { client } from '../api/client';
import type { User, ScanResponse } from '../api/client';

interface ScannerTabProps {
  user: User;
}

interface ScanResultState {
  status: 'success' | 'error' | null;
  message: string;
  clockTime?: string;
  action?: 'in' | 'out';
}

export const ScannerTab: React.FC<ScannerTabProps> = ({ user }) => {
  const [action, setAction] = useState<'in' | 'out'>('in');
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResultState>({ status: null, message: '' });
  const [showManual, setShowManual] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader-viewport";

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setResult({ status: null, message: '' });
    setCameraActive(true);

    // Wait for the DOM element to mount
    setTimeout(async () => {
      try {
        const html5Qrcode = new Html5Qrcode(scannerId);
        scannerRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            },
          },
          async (decodedText) => {
            // Success callback
            await handleScanSubmission(decodedText);
          },
          () => {
            // Failure callback (silent)
          }
        );
      } catch (err: any) {
        console.error("Camera access failed:", err);
        setResult({
          status: 'error',
          message: 'Could not access the camera. Please check permissions or type the code manually below.'
        });
        setCameraActive(false);
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error("Failed to stop scanner:", err);
      } finally {
        scannerRef.current = null;
        setCameraActive(false);
      }
    }
  };

  const handleScanSubmission = async (qrString: string) => {
    // Vibrate to simulate scanner feedback if API exists
    if (navigator.vibrate) {
      navigator.vibrate(150);
    }

    setLoading(true);
    setResult({ status: null, message: '' });
    
    // Auto stop camera on scan to save resource and show result
    await stopScanner();

    try {
      const response: ScanResponse = await client.scanQR(qrString, user.id, action);
      
      // Format response clock time to local timezone
      const localTime = new Date(response.clock_time).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      setResult({
        status: 'success',
        message: response.message,
        clockTime: localTime,
        action: response.action
      });
      setManualCode('');
    } catch (err: any) {
      setResult({
        status: 'error',
        message: err.message || 'An error occurred during submission.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanSubmission(manualCode.trim());
  };

  return (
    <div>
      {/* User display widget */}
      <div className="user-widget">
        <div className="user-widget-info">
          <div className="user-widget-name">👤 {user.name}</div>
          <div className="user-widget-dept">🏢 {user.department}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="status-pill out" style={{ fontSize: '10px' }}>Connected</span>
        </div>
      </div>

      <div className="panel">
        <h2 style={{ marginBottom: '8px', fontWeight: 600 }}>Attendance Scanner</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          Choose your action, scan today's printed council QR code to log your attendance.
        </p>

        {/* Action Toggle Switch */}
        <div className="toggle-container">
          <div 
            className={`toggle-option ${action === 'in' ? 'active' : ''}`}
            onClick={() => { if (!loading) setAction('in'); }}
          >
            📥 Clock In
          </div>
          <div 
            className={`toggle-option ${action === 'out' ? 'active' : ''}`}
            onClick={() => { if (!loading) setAction('out'); }}
          >
            📤 Clock Out
          </div>
          <div className={`toggle-slider ${action}`} />
        </div>

        {/* Feedback results */}
        {result.status === 'success' && (
          <div className="feedback-card success">
            <div className="feedback-icon">✅</div>
            <div>
              <div className="feedback-title">Success - Clocked {result.action === 'in' ? 'In' : 'Out'}</div>
              <div className="feedback-msg">{result.message}</div>
              {result.clockTime && (
                <div className="feedback-time">Verified Local Time: {result.clockTime}</div>
              )}
            </div>
          </div>
        )}

        {result.status === 'error' && (
          <div className="feedback-card error">
            <div className="feedback-icon">❌</div>
            <div>
              <div className="feedback-title">Scan Rejected</div>
              <div className="feedback-msg">{result.message}</div>
            </div>
          </div>
        )}

        {/* Camera container */}
        {cameraActive ? (
          <div>
            <div className="scanner-viewport">
              <div id={scannerId} style={{ width: '100%', height: '100%' }}></div>
              <div className="scanner-overlay">
                <div className="scanner-target">
                  <div className="scanner-laser"></div>
                </div>
              </div>
            </div>
            
            <button 
              type="button" 
              className="btn-primary" 
              style={{ background: 'var(--error)', boxShadow: '0 4px 12px rgba(239,68,68,0.2)' }}
              onClick={stopScanner}
              disabled={loading}
            >
              🛑 Cancel Camera
            </button>
          </div>
        ) : (
          <div>
            <div className="scanner-viewport" style={{ background: 'var(--input-bg)' }}>
              <div className="scanner-placeholder">
                <div className="scanner-placeholder-icon">📷</div>
                <div style={{ fontWeight: 500, fontSize: '15px' }}>Camera Inactive</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Tap below to open webcam and scan QR
                </div>
              </div>
            </div>

            <button 
              type="button" 
              className="btn-primary" 
              onClick={startScanner}
              disabled={loading}
            >
              🔍 Open QR Scanner
            </button>
          </div>
        )}

        {/* Manual code input fallback */}
        <div className="manual-scan-box">
          {!showManual ? (
            <button 
              type="button"
              className="manual-scan-trigger"
              onClick={() => setShowManual(true)}
            >
              Can't scan? Enter code manually
            </button>
          ) : (
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                className="input-control"
                style={{ padding: '10px 12px', fontSize: '14px', flex: 1 }}
                placeholder="Paste code (e.g. OALCDA_2026-06-20_abc)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                disabled={loading}
              />
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: 'auto', padding: '10px 16px', fontSize: '14px' }}
                disabled={loading || !manualCode.trim()}
              >
                Submit
              </button>
              <button
                type="button"
                className="btn-disconnect"
                style={{ padding: '8px' }}
                onClick={() => { setShowManual(false); setManualCode(''); }}
                disabled={loading}
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
