import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import PageLoader from './PageLoader';

export default function ProtectedRoute({ children, moduleName }) {
  const { user, loading, hasViewPermission } = useAuth();

  // Only show initial app boot loading if user is not yet loaded into state
  if (loading && !user) {
    return <PageLoader fullScreen text="Loading EG ERP..." size={140} />;
  }

  if (!user && !loading) {
    return <Navigate to="/login" replace />;
  }

  if (moduleName && !hasViewPermission(moduleName)) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', marginTop: '100px' }}>
        <h2 style={{ color: 'var(--danger)' }}>Access Denied</h2>
        <p style={{ color: '#666' }}>You do not have permission to view the {moduleName} module.</p>
      </div>
    );
  }

  return children;
}
