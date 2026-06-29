import React from 'react';
import { useLocation } from 'react-router-dom';

const PlaceholderPage = () => {
  const location = useLocation();
  
  // Format the path into a readable title
  const title = location.pathname
    .split('/')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).replace(/-/g, ' '))
    .join(' / ') || 'Home';

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-h2">{title}</h1>
          <p className="text-muted">This module is under construction.</p>
        </div>
      </div>
      <div className="card glass-panel empty-state">
        <h3 className="text-h3">Coming Soon</h3>
        <p className="text-muted" style={{ marginTop: '8px' }}>
          The {title} functionality will be available in a future update.
        </p>
      </div>
    </div>
  );
};

export default PlaceholderPage;
