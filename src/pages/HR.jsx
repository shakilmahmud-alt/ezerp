import React, { useState } from 'react';
import { Users, Plus, Mail, Phone, Briefcase, Trash2 } from 'lucide-react';

const HR = () => {
  const [employees, setEmployees] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', role: '', department: '', email: '', phone: '', status: 'Active' });

  const handleAddEmployee = (e) => {
    e.preventDefault();
    const id = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1;
    setEmployees([...employees, { id, ...newEmployee }]);
    setNewEmployee({ name: '', role: '', department: '', email: '', phone: '', status: 'Active' });
    setIsAdding(false);
  };

  const handleDelete = (id) => {
    setEmployees(employees.filter(emp => emp.id !== id));
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-h2">Human Resources</h1>
          <p className="text-muted">Manage employees, payroll, and attendance.</p>
        </div>
        <button className="btn btn-primary btn-danger" onClick={() => setIsAdding(!isAdding)}>
          <Plus size={20} /> {isAdding ? 'Cancel' : 'Add Employee'}
        </button>
      </div>

      {isAdding && (
        <div className="card glass-panel" style={{ marginBottom: '24px' }}>
          <h3 className="text-h3" style={{ marginBottom: '16px' }}>Add New Employee</h3>
          <form onSubmit={handleAddEmployee} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <input className="input-glass" placeholder="Full Name" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} required />
            <input className="input-glass" placeholder="Role" value={newEmployee.role} onChange={e => setNewEmployee({...newEmployee, role: e.target.value})} required />
            <input className="input-glass" placeholder="Department" value={newEmployee.department} onChange={e => setNewEmployee({...newEmployee, department: e.target.value})} required />
            <input className="input-glass" type="email" placeholder="Email" value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} required />
            <input className="input-glass" type="tel" placeholder="Phone" value={newEmployee.phone} onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})} required />
            <select className="input-glass" value={newEmployee.status} onChange={e => setNewEmployee({...newEmployee, status: e.target.value})}>
              <option value="Active" style={{ color: 'black' }}>Active</option>
              <option value="On Leave" style={{ color: 'black' }}>On Leave</option>
            </select>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn btn-glass btn-danger" onClick={() => setIsAdding(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-theme">Save Employee</button>
            </div>
          </form>
        </div>
      )}

      <div className="card glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {employees.length === 0 ? (
          <div className="empty-state">
            <Users size={64} />
            <h3 className="text-h3">No Employees Found</h3>
            <p className="text-muted" style={{ marginTop: '8px' }}>Start by adding your first employee to the directory.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>Employee</th>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>Contact</th>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>Department</th>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {emp.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600' }}>{emp.name}</div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{emp.role}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} className="text-muted" /> {emp.email}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} className="text-muted" /> {emp.phone}</div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Briefcase size={16} className="text-muted" /> {emp.department}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem', 
                        fontWeight: '600',
                        background: emp.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: emp.status === 'Active' ? 'var(--success)' : 'var(--warning)'
                      }}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button className="btn-danger" onClick={() => handleDelete(emp.id)} className="btn-glass" style={{ padding: '8px', borderRadius: '8px', color: 'var(--danger)', border: 'none', background: 'transparent', cursor: 'pointer' }}>
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

export default HR;
