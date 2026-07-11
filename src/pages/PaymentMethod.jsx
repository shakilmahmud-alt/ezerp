import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const initialFormState = {
  name: '',
  bank_name: '',
  bank_commission: 0,
  bin: '',
  mfs: false,
  ec: false,
  pos: false
};

const PaymentMethod = () => {
  const { hasEditPermission } = useAuth();
  const canEdit = hasEditPermission('Payment Method');
  const [view, setView] = useState('list');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (view === 'list') {
      fetchPaymentMethods();
    }
  }, [view]);

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('code', { ascending: true });
      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to fetch Payment Methods: ${err.message || err.toString()}`);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }
    if (!formData.bank_name) {
      toast.error('Bank Name is required');
      return;
    }
    setIsLoading(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('payment_methods')
          .update({
            name: formData.name,
            bank_name: formData.bank_name,
            bank_commission: formData.bank_commission,
            bin: formData.bin,
            mfs: formData.mfs,
            ec: formData.ec,
            pos: formData.pos,
            updated_at: new Date()
          })
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success('Payment Method updated successfully');
      } else {
        // Generate new code
        let newCode = '001';
        const { data: lastRecord } = await supabase
          .from('payment_methods')
          .select('code')
          .order('code', { ascending: false })
          .limit(1);
          
        if (lastRecord && lastRecord.length > 0) {
          const lastNum = parseInt(lastRecord[0].code, 10);
          if (!isNaN(lastNum)) {
            newCode = String(lastNum + 1).padStart(3, '0');
          }
        }

        const { error } = await supabase
          .from('payment_methods')
          .insert([{
            code: newCode,
            name: formData.name,
            bank_name: formData.bank_name,
            bank_commission: formData.bank_commission,
            bin: formData.bin,
            mfs: formData.mfs,
            ec: formData.ec,
            pos: formData.pos
          }]);
          
        if (error) throw error;
        toast.success('Payment Method added successfully');
      }
      setView('list');
    } catch (err) {
      console.error(err);
      toast.error('Error saving payment method');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (method) => {
    setFormData({
      name: method.name,
      bank_name: method.bank_name,
      bank_commission: method.bank_commission,
      bin: method.bin || '',
      mfs: method.mfs,
      ec: method.ec,
      pos: method.pos
    });
    setEditingId(method.id);
    setView('add');
  };

  const toggleStatus = async (method) => {
    try {
      const newStatus = method.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const { error } = await supabase
        .from('payment_methods')
        .update({ status: newStatus })
        .eq('id', method.id);
      
      if (error) throw error;
      toast.success(`Status updated to ${newStatus}`);
      fetchPaymentMethods();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  const BooleanIcon = ({ value }) => {
    return value ? (
      <Check size={16} color="var(--accent-primary)" style={{ strokeWidth: 3 }} />
    ) : (
      <X size={16} color="var(--danger)" style={{ strokeWidth: 3 }} />
    );
  };

  if (view === 'add') {
    return (
      <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
        <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {editingId ? 'Edit Payment Method' : 'Add Payment Method'}
            </h2>
          </div>
          
          <form onSubmit={handleSave} style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-primary)' }}>
                  Name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className="input-animated"
                  style={{ width: '100%' }}
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-primary)' }}>
                  Bank Name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className="input-animated"
                  style={{ width: '100%' }}
                  value={formData.bank_name}
                  onChange={e => setFormData({...formData, bank_name: e.target.value})}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-primary)' }}>
                  Bank Commission <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  className="input-animated"
                  style={{ width: '100%' }}
                  value={formData.bank_commission}
                  onChange={e => setFormData({...formData, bank_commission: parseFloat(e.target.value) || 0})}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-primary)' }}>
                  BIN
                </label>
                <input 
                  type="text" 
                  className="input-animated"
                  style={{ width: '100%' }}
                  value={formData.bin}
                  onChange={e => setFormData({...formData, bin: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={formData.mfs} onChange={e => setFormData({...formData, mfs: e.target.checked})} style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
                  MFS
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={formData.ec} onChange={e => setFormData({...formData, ec: e.target.checked})} style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
                  EC
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={formData.pos} onChange={e => setFormData({...formData, pos: e.target.checked})} style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
                  POS
                </label>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                <button 
                  type="submit" 
                  className="btn-theme"
                  disabled={isLoading}
                  style={{ padding: '8px 30px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {isLoading ? 'Saving...' : editingId ? 'Update' : 'Add'}
                </button>
                <button 
                  type="button" 
                  className="btn-danger"
                  onClick={() => { setView('list'); setEditingId(null); setFormData(initialFormState); }}
                  disabled={isLoading}
                  style={{ padding: '8px 30px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Close
                </button>
              </div>

            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Payment Method</h2>
        {canEdit && (
          <button 
            className="btn-theme" 
            onClick={() => { setFormData(initialFormState); setEditingId(null); setView('add'); }}
            style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
          >
            + Add New
          </button>
        )}
      </div>

      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--card-bg)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <input type="text" placeholder="Search" style={{ padding: '8px', width: '200px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '12px 15px' }}>SL</th>
                <th style={{ padding: '12px 15px' }}>Code</th>
                <th style={{ padding: '12px 15px' }}>Name</th>
                <th style={{ padding: '12px 15px' }}>Bank Name</th>
                <th style={{ padding: '12px 15px' }}>Bank Commission</th>
                <th style={{ padding: '12px 15px' }}>BIN</th>
                <th style={{ padding: '12px 15px' }}>Status</th>
                <th style={{ padding: '12px 15px', textAlign: 'center' }}>MFS</th>
                <th style={{ padding: '12px 15px', textAlign: 'center' }}>EC</th>
                <th style={{ padding: '12px 15px', textAlign: 'center' }}>POS</th>
                {canEdit && <th style={{ padding: '12px 15px', textAlign: 'center' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {paymentMethods.map((method, idx) => (
                <tr key={method.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 15px' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 15px' }}>{method.code}</td>
                  <td style={{ padding: '10px 15px' }}>{method.name}</td>
                  <td style={{ padding: '10px 15px' }}>{method.bank_name}</td>
                  <td style={{ padding: '10px 15px' }}>{method.bank_commission}</td>
                  <td style={{ padding: '10px 15px' }}>{method.bin || '0'}</td>
                  <td style={{ padding: '10px 15px' }}>{method.status}</td>
                  <td style={{ padding: '10px 15px', textAlign: 'center' }}><BooleanIcon value={method.mfs} /></td>
                  <td style={{ padding: '10px 15px', textAlign: 'center' }}><BooleanIcon value={method.ec} /></td>
                  <td style={{ padding: '10px 15px', textAlign: 'center' }}><BooleanIcon value={method.pos} /></td>
                  {canEdit && (
                    <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                      <span 
                        style={{ cursor: 'pointer', color: 'var(--text-secondary)', textDecoration: 'underline' }}
                        onClick={() => handleEdit(method)}
                      >
                        Edit
                      </span>
                      <span style={{ margin: '0 5px', color: 'var(--text-secondary)' }}>|</span>
                      <span 
                        style={{ cursor: 'pointer', color: 'var(--text-secondary)', textDecoration: 'underline' }}
                        onClick={() => toggleStatus(method)}
                      >
                        {method.status === 'ACTIVE' ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
              {paymentMethods.length === 0 && (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                    No Payment Methods Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethod;
