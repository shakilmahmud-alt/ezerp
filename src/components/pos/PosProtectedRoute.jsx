import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { ShieldAlert } from 'lucide-react';

export default function PosProtectedRoute({ children, moduleName }) {
  const { user, posTerminal, hasPosPermission, loading } = useAuth();

  const isAllowed = !moduleName || hasPosPermission(moduleName);

  useEffect(() => {
    if (!loading && user && posTerminal && moduleName && !isAllowed) {
      toast.error("You're not authorized to use this module.");
    }
  }, [loading, user, posTerminal, moduleName, isAllowed]);

  if (loading) {
    return null;
  }

  if (!user || !posTerminal) {
    return <Navigate to="/pos/login" replace />;
  }

  if (!isAllowed) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '30px',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: '#fff',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #fee2e2',
          maxWidth: '500px'
        }}>
          <ShieldAlert size={56} color="#dc2626" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#991b1b', marginBottom: '8px' }}>
            Access Restricted
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
            You're not authorized to use this module (<strong>{moduleName}</strong>).
          </p>
          <button
            onClick={() => window.history.back()}
            className="btn-theme"
            style={{
              padding: '8px 24px',
              fontSize: '13px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
}
