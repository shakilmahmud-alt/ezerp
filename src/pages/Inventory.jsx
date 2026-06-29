import React, { useState } from 'react';
import { Package, Plus, Trash2, Box, Tag, DollarSign, Layers } from 'lucide-react';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ sku: '', name: '', category: '', stock: '', price: '', status: 'In Stock' });

  const handleAddItem = (e) => {
    e.preventDefault();
    const id = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    setItems([...items, { id, ...newItem, stock: Number(newItem.stock), price: Number(newItem.price) }]);
    setNewItem({ sku: '', name: '', category: '', stock: '', price: '', status: 'In Stock' });
    setIsAdding(false);
  };

  const handleDelete = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'In Stock': return { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' };
      case 'Low Stock': return { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' };
      case 'Out of Stock': return { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' };
      default: return { bg: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)' };
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-h2">Inventory</h1>
          <p className="text-muted">Manage stock, items, and warehouses.</p>
        </div>
        <button className="btn btn-primary btn-danger" onClick={() => setIsAdding(!isAdding)}>
          <Plus size={20} /> {isAdding ? 'Cancel' : 'Add Item'}
        </button>
      </div>

      {isAdding && (
        <div className="card glass-panel" style={{ marginBottom: '24px' }}>
          <h3 className="text-h3" style={{ marginBottom: '16px' }}>Add New Item</h3>
          <form onSubmit={handleAddItem} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <input className="input-glass" placeholder="SKU (e.g. SKU-1003)" value={newItem.sku} onChange={e => setNewItem({...newItem, sku: e.target.value})} required />
            <input className="input-glass" placeholder="Item Name" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
            <input className="input-glass" placeholder="Category" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} required />
            <input className="input-glass" type="number" placeholder="Stock Quantity" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} required min="0" />
            <input className="input-glass" type="number" step="0.01" placeholder="Unit Price ($)" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} required min="0" />
            <select className="input-glass" value={newItem.status} onChange={e => setNewItem({...newItem, status: e.target.value})}>
              <option value="In Stock" style={{ color: 'black' }}>In Stock</option>
              <option value="Low Stock" style={{ color: 'black' }}>Low Stock</option>
              <option value="Out of Stock" style={{ color: 'black' }}>Out of Stock</option>
            </select>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn btn-glass btn-danger" onClick={() => setIsAdding(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-theme">Save Item</button>
            </div>
          </form>
        </div>
      )}

      <div className="card glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {items.length === 0 ? (
          <div className="empty-state">
            <Package size={64} />
            <h3 className="text-h3">Inventory is Empty</h3>
            <p className="text-muted" style={{ marginTop: '8px' }}>Add items to your catalog to track stock.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>Item Details</th>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>Category</th>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>Stock & Price</th>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const statusStyle = getStatusColor(item.status);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <Box size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: '600' }}>{item.name}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Tag size={12} /> {item.sku}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Layers size={16} className="text-muted" /> {item.category}</div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                            <Package size={14} className="text-muted" /> {item.stock} units
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                            <DollarSign size={14} /> ${item.price.toFixed(2)}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          padding: '4px 12px', 
                          borderRadius: '20px', 
                          fontSize: '0.75rem', 
                          fontWeight: '600',
                          background: statusStyle.bg,
                          color: statusStyle.color
                        }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button className="btn-danger" onClick={() => handleDelete(item.id)} className="btn-glass" style={{ padding: '8px', borderRadius: '8px', color: 'var(--danger)', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
