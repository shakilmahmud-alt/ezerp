import React, { useState } from 'react';
import { Calculator, Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Calendar, Tag } from 'lucide-react';

const Accounting = () => {
  const [transactions, setTransactions] = useState([
    { id: 1, date: '2026-06-15', description: 'Client Payment - Project A', type: 'Income', category: 'Sales', amount: 45000 },
    { id: 2, date: '2026-06-18', description: 'Office Supplies', type: 'Expense', category: 'Operations', amount: 3500 },
  ]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTx, setNewTx] = useState({ date: '', description: '', type: 'Income', category: '', amount: '' });

  const handleAddTransaction = (e) => {
    e.preventDefault();
    const id = transactions.length > 0 ? Math.max(...transactions.map(t => t.id)) + 1 : 1;
    setTransactions([...transactions, { id, ...newTx, amount: Number(newTx.amount) }]);
    setNewTx({ date: '', description: '', type: 'Income', category: '', amount: '' });
    setIsAdding(false);
  };

  const handleDelete = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const totalIncome = transactions.filter(t => t.type === 'Income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((acc, curr) => acc + curr.amount, 0);
  const netBalance = totalIncome - totalExpense;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-h2">Accounting & Finance</h1>
          <p className="text-muted">Track income, expenses, and invoices in BDT.</p>
        </div>
        <button className="btn btn-primary btn-theme" onClick={() => setIsAdding(!isAdding)}>
          <Plus size={20} /> {isAdding ? 'Cancel' : 'Add Transaction'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <TrendingUp size={32} />
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: '600' }}>Total Income</p>
            <h2 className="text-h2" style={{ margin: 0 }}>৳{totalIncome.toLocaleString()}</h2>
          </div>
        </div>
        <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
            <TrendingDown size={32} />
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: '600' }}>Total Expense</p>
            <h2 className="text-h2" style={{ margin: 0 }}>৳{totalExpense.toLocaleString()}</h2>
          </div>
        </div>
        <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)' }}>
            <DollarSign size={32} />
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: '600' }}>Net Balance</p>
            <h2 className="text-h2" style={{ margin: 0 }}>৳{netBalance.toLocaleString()}</h2>
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="card glass-panel" style={{ marginBottom: '24px' }}>
          <h3 className="text-h3" style={{ marginBottom: '16px' }}>Add New Transaction</h3>
          <form onSubmit={handleAddTransaction} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <input className="input-glass" type="date" value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} required />
            <input className="input-glass" placeholder="Description" value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} required />
            <select className="input-glass" value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value})}>
              <option value="Income" style={{ color: 'black' }}>Income</option>
              <option value="Expense" style={{ color: 'black' }}>Expense</option>
            </select>
            <input className="input-glass" placeholder="Category (e.g. Sales, Utilities)" value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})} required />
            <input className="input-glass" type="number" placeholder="Amount (৳)" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} required min="0" />
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn btn-glass btn-danger" onClick={() => setIsAdding(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-theme">Save Transaction</button>
            </div>
          </form>
        </div>
      )}

      <div className="card glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <Calculator size={64} />
            <h3 className="text-h3">No Financial Records</h3>
            <p className="text-muted" style={{ marginTop: '8px' }}>Start by recording your first transaction.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>Date</th>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>Description</th>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>Type & Category</th>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={16} className="text-muted" /> {new Date(tx.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontWeight: '500' }}>{tx.description}</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ 
                          display: 'inline-block',
                          width: 'max-content',
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: '600',
                          background: tx.type === 'Income' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: tx.type === 'Income' ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {tx.type}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Tag size={12} /> {tx.category}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', color: tx.type === 'Income' ? 'var(--success)' : 'var(--text-primary)' }}>
                      {tx.type === 'Income' ? '+' : '-'}৳{tx.amount.toLocaleString()}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button className="btn-danger" onClick={() => handleDelete(tx.id)} className="btn-glass" style={{ padding: '8px', borderRadius: '8px', color: 'var(--danger)', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Accounting;
