"use client";
import { useEffect, useState } from 'react';

export default function SimulationIndicator() {
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const handleStart = () => setIsRunning(true);
    window.addEventListener('simulationStarted', handleStart);

    const checkStatus = () => {
      fetch('/api/status')
        .then(res => res.json())
        .then(data => setIsRunning(data.running))
        .catch(() => {});
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('simulationStarted', handleStart);
    };
  }, []);

  if (!isRunning) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: 'rgba(30, 41, 59, 0.9)',
      border: '1px solid var(--border-color)',
      padding: '12px 20px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
      zIndex: 9999,
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        width: '18px', height: '18px', 
        border: '2px solid rgba(255,255,255,0.2)', 
        borderTopColor: 'var(--accent)', 
        borderRadius: '50%', 
        animation: 'spin 1s linear infinite'
      }}></div>
      <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
        Nyugi, a Monte Carlo szimuláció éppen fut... ⚽
      </span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
