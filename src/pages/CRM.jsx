import React from 'react';
import { UserCircle } from 'lucide-react';

const CRM = () => {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-h2">CRM</h1>
          <p className="text-muted">Manage customer relationships and leads.</p>
        </div>
        <button className="btn btn-primary btn-theme">Add Customer</button>
      </div>

      <div className="card glass-panel">
        <div className="empty-state">
          <UserCircle size={64} />
          <h3 className="text-h3">No Customers Yet</h3>
          <p className="text-muted" style={{ marginTop: '8px' }}>Add a customer to track interactions and sales.</p>
        </div>
      </div>
    </div>
  );
};

export default CRM;
