import React from 'react';
import { Truck } from 'lucide-react';

const Procurement = () => {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-h2">Procurement</h1>
          <p className="text-muted">Manage suppliers and purchase orders.</p>
        </div>
        <button className="btn btn-primary btn-theme">Create PO</button>
      </div>

      <div className="card glass-panel">
        <div className="empty-state">
          <Truck size={64} />
          <h3 className="text-h3">No Purchase Orders</h3>
          <p className="text-muted" style={{ marginTop: '8px' }}>Create a purchase order to restock inventory.</p>
        </div>
      </div>
    </div>
  );
};

export default Procurement;
