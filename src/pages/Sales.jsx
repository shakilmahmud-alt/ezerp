import React from 'react';
import { ShoppingCart } from 'lucide-react';

const Sales = () => {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-h2">Sales & POS</h1>
          <p className="text-muted">Process orders and manage point of sale.</p>
        </div>
        <button className="btn btn-primary btn-theme">New Order</button>
      </div>

      <div className="card glass-panel">
        <div className="empty-state">
          <ShoppingCart size={64} />
          <h3 className="text-h3">No Active Sales</h3>
          <p className="text-muted" style={{ marginTop: '8px' }}>Create a new order to get started.</p>
        </div>
      </div>
    </div>
  );
};

export default Sales;
