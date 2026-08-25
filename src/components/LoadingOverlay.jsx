import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingOverlay = ({ isLoading, message = 'Processing & Saving... Please wait' }) => {
  if (!isLoading) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-in-out'
      }}
    >
      <div 
        style={{
          backgroundColor: 'var(--card-bg, #ffffff)',
          padding: '24px 36px',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          border: '1px solid var(--border-color, #e2e8f0)',
          minWidth: '260px'
        }}
      >
        <div style={{ position: 'relative', width: '56px', height: '56px' }}>
          <Loader2 
            style={{ 
              width: '56px', 
              height: '56px', 
              color: 'var(--accent-primary, #2e6f40)',
              animation: 'spin 1s linear infinite'
            }} 
          />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary, #1e293b)' }}>
            {message}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', marginTop: '4px' }}>
            Updating database records...
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;
