import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { client } from '../api/client';
import type { User } from '../api/client';

interface LoginTabProps {
  onLoginSuccess: (user: User) => void;
  onLoginNotFound: (unrecognizedKey: string) => void;
}

export const LoginTab: React.FC<LoginTabProps> = ({ onLoginSuccess, onLoginNotFound }) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualKey, setManualKey] = useState('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "login-qr-reader";

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setError(null);
    setCameraActive(true);

    // Wait for the DOM viewport element to render
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
            await handleLogin(decodedText);
          },
          () => {
            // Quiet frame failures
          }
        );
      } catch (err: any) {
        console.error("Camera access failed:", err);
        setError('Could not access camera. Please allow camera permissions or type your key manually.');
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

  const handleLogin = async (qrKey: string) => {
    if (navigator.vibrate) {
      navigator.vibrate(150);
    }

    setLoading(true);
    setError(null);
    await stopScanner();

    try {
      const user = await client.login(qrKey.trim());
      onLoginSuccess(user);
    } catch (err: any) {
      if (err.message && (err.message.includes('not found') || err.message.includes('404'))) {
        // Unrecognized QR Key: redirect to registration
        onLoginNotFound(qrKey);
      } else {
        setError(err.message || 'An error occurred during verification.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualKey.trim()) return;
    handleLogin(manualKey.trim());
  };

  return (
    <div className="panel">
      <h2 style={{ marginBottom: '8px', fontWeight: 600 }}>Worker Log In</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
        Scan your personal worker QR Badge card to log in and unlock your attendance dashboard.
      </p>

      {error && (
        <div className="feedback-card error" style={{ marginBottom: '20px' }}>
          <div className="feedback-icon">⚠️</div>
          <div>
            <div className="feedback-title">Log In Failed</div>
            <div className="feedback-msg">{error}</div>
          </div>
        </div>
      )}

      {/* Camera Feed Viewport */}
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
            style={{ background: 'var(--error)', boxShadow: '0 4px 12px rgba(239,68,68,0.2)', marginBottom: '16px' }}
            onClick={stopScanner}
            disabled={loading}
          >
            🛑 Cancel Camera
          </button>
        </div>
      ) : (
        <div>
          <div className="scanner-viewport" style={{ background: 'var(--input-bg)', marginBottom: '16px' }}>
            <div className="scanner-placeholder">
              <div className="scanner-placeholder-icon">📇</div>
              <div style={{ fontWeight: 500, fontSize: '15px' }}>Scanner Ready</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Point your worker card badge at your camera
              </div>
            </div>
          </div>

          <button 
            type="button" 
            className="btn-primary" 
            onClick={startScanner}
            disabled={loading}
            style={{ marginBottom: '16px' }}
          >
            🔍 Scan Worker Card QR
          </button>
        </div>
      )}

      {/* Manual input fallback */}
      <div className="manual-scan-box" style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
        {!showManual ? (
          <button 
            type="button"
            className="manual-scan-trigger"
            onClick={() => setShowManual(true)}
          >
            Lost your badge? Enter Worker Key manually
          </button>
        ) : (
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              className="input-control"
              style={{ padding: '10px 12px', fontSize: '14px', flex: 1 }}
              placeholder="e.g. adewale-johnson_e3a9f02b"
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              disabled={loading}
              required
            />
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ width: 'auto', padding: '10px 16px', fontSize: '14px' }}
              disabled={loading || !manualKey.trim()}
            >
              Log In
            </button>
            <button
              type="button"
              className="btn-disconnect"
              style={{ padding: '8px' }}
              onClick={() => { setShowManual(false); setManualKey(''); }}
              disabled={loading}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
