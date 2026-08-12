import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Search, CreditCard } from 'lucide-react';

const PosPaymentTypeChange = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal / Form States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    bank_name: '',
    bank_commission: '0',
    bin: '',
    status: 'ACTIVE',
    pos: true,
    mfs: false
  });

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Seed default payment types if empty
        await seedDefaultPaymentTypes();
      } else {
        setPaymentMethods(data);
      }
    } catch (err) {
      console.error("Error fetching payment methods:", err);
      toast.error("Failed to load payment methods");
    } finally {
      setIsLoading(false);
    }
  };

  const seedDefaultPaymentTypes = async () => {
    const defaults = [
      { code: '001', name: 'Cash', bank_name: 'Cash', bank_commission: 0, status: 'ACTIVE', pos: true },
      { code: '002', name: 'AMEX', bank_name: 'City Bank AMEX', bank_commission: 1.5, status: 'ACTIVE', pos: true },
      { code: '003', name: 'bKash', bank_name: 'bKash MFS', bank_commission: 1.2, status: 'ACTIVE', pos: true, mfs: true },
      { code: '004', name: 'BRAC BANK', bank_name: 'BRAC Bank', bank_commission: 1.5, status: 'ACTIVE', pos: true },
      { code: '005', name: 'City Bank', bank_name: 'City Bank', bank_commission: 1.5, status: 'ACTIVE', pos: true },
      { code: '006', name: 'DBBL', bank_name: 'Dutch Bangla Bank', bank_commission: 1.5, status: 'ACTIVE', pos: true },
      { code: '007', name: 'EBL', bank_name: 'Eastern Bank Ltd', bank_commission: 1.5, status: 'ACTIVE', pos: true },
      { code: '008', name: 'NAGAD', bank_name: 'Nagad MFS', bank_commission: 1.2, status: 'ACTIVE', pos: true, mfs: true },
      { code: '009', name: 'NEXUS PAY', bank_name: 'DBBL Nexus', bank_commission: 1.0, status: 'ACTIVE', pos: true },
      { code: '010', name: 'Pubali Bank', bank_name: 'Pubali Bank', bank_commission: 1.5, status: 'ACTIVE', pos: true },
      { code: '011', name: 'SCBL', bank_name: 'Standard Chartered', bank_commission: 1.5, status: 'ACTIVE', pos: true },
      { code: '012', name: 'TBL', bank_name: 'Trust Bank Ltd', bank_commission: 1.5, status: 'ACTIVE', pos: true }
    ];

    try {
      const { data, error } = await supabase.from('payment_methods').insert(defaults).select();
      if (!error && data) {
        setPaymentMethods(data);
      }
    } catch (e) {
      console.warn("Seeding fallback:", e);
    }
  };

  const handleOpenAddModal = async () => {
    // Generate code
    let nextCode = '001';
    if (paymentMethods.length > 0) {
      let maxNum = 0;
      paymentMethods.forEach(pm => {
        const num = parseInt(pm.code, 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      });
      nextCode = String(maxNum + 1).padStart(3, '0');
    }

    setFormData({
      code: nextCode,
      name: '',
      bank_name: '',
      bank_commission: '0',
      bin: '',
      status: 'ACTIVE',
      pos: true,
      mfs: false
    });
    setEditingId(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (method) => {
    setFormData({
      code: method.code || '',
      name: method.name || '',
      bank_name: method.bank_name || '',
      bank_commission: method.bank_commission?.toString() || '0',
      bin: method.bin || '',
      status: method.status || 'ACTIVE',
      pos: method.pos ?? true,
      mfs: method.mfs ?? false
    });
    setEditingId(method.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Payment type name is required');
      return;
    }

    const payload = {
      code: formData.code,
      name: formData.name.trim(),
      bank_name: formData.bank_name.trim() || formData.name.trim(),
      bank_commission: parseFloat(formData.bank_commission) || 0,
      bin: formData.bin || '0',
      status: formData.status,
      pos: formData.pos,
      mfs: formData.mfs,
      updated_at: new Date().toISOString()
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('payment_methods').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Payment type updated successfully');
      } else {
        const { error } = await supabase.from('payment_methods').insert([payload]);
        if (error) throw error;
        toast.success('Payment type created successfully');
      }
      setShowModal(false);
      fetchPaymentMethods();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save payment type');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete payment type "${name}"?`)) {
      try {
        const { error } = await supabase.from('payment_methods').delete().eq('id', id);
        if (error) throw error;
        toast.success('Payment type deleted');
        fetchPaymentMethods();
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete payment type');
      }
    }
  };

  const filteredMethods = paymentMethods.filter(pm => 
    pm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (pm.code && pm.code.includes(searchQuery)) ||
    (pm.bank_name && pm.bank_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ padding: '20px', backgroundColor: 'var(--bg-primary, #f8fafc)', minHeight: '100%' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '15px 20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CreditCard size={24} color="var(--accent-primary, #2e6f40)" />
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary, #1e293b)' }}>Invoice Payment Type Setup / Change</h2>
        </div>

        <button 
          onClick={handleOpenAddModal}
          style={{ 
            backgroundColor: 'var(--accent-primary, #2e6f40)', 
            color: '#fff', 
            border: 'none', 
            padding: '8px 16px', 
            borderRadius: '6px', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Plus size={16} /> Add Payment Type
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', backgroundColor: '#fff', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <input 
            type="text" 
            placeholder="Search payment type..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: '6px' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', fontWeight: 'bold' }}>
          Total Payment Types: <span style={{ color: 'var(--accent-primary, #2e6f40)' }}>{paymentMethods.length}</span>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-secondary, #475569)' }}>
              <th style={{ padding: '12px 16px' }}>Code</th>
              <th style={{ padding: '12px 16px' }}>Payment Type Name</th>
              <th style={{ padding: '12px 16px' }}>Bank / Institution Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Commission (%)</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Visible in POS</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading payment types...</td></tr>
            ) : filteredMethods.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No payment types found.</td></tr>
            ) : (
              filteredMethods.map((pm) => (
                <tr key={pm.id} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--accent-primary, #2e6f40)' }}>{pm.code || '-'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{pm.name}</td>
                  <td style={{ padding: '12px 16px' }}>{pm.bank_name || pm.name}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold' }}>{pm.bank_commission || 0}%</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {pm.pos ? <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Yes</span> : <span style={{ color: '#dc2626' }}>No</span>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '3px 10px', 
                      borderRadius: '12px', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      backgroundColor: pm.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                      color: pm.status === 'ACTIVE' ? '#15803d' : '#b91c1c'
                    }}>
                      {pm.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => handleOpenEditModal(pm)}
                        style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(pm.id, pm.name)}
                        style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2500 }}>
          <div style={{ backgroundColor: '#fff', width: '420px', borderRadius: '8px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--text-primary, #1e293b)', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              {editingId ? 'Edit Payment Type' : 'Add New Payment Type'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Code *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.code} 
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Payment Type Name *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. bKash, City Bank, AMEX" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Bank / Institution Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. City Bank Ltd." 
                  value={formData.bank_name} 
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Bank Commission (%)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.bank_commission} 
                  onChange={(e) => setFormData({ ...formData, bank_commission: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '16px', display: 'flex', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Status</label>
                  <select 
                    value={formData.status} 
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '18px' }}>
                  <input 
                    type="checkbox" 
                    id="posActive" 
                    checked={formData.pos} 
                    onChange={(e) => setFormData({ ...formData, pos: e.target.checked })} 
                  />
                  <label htmlFor="posActive" style={{ fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Show in POS</label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ padding: '8px 20px', backgroundColor: 'var(--accent-primary, #2e6f40)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Save
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default PosPaymentTypeChange;
