import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import CustomSelect from '../../components/CustomSelect';

const Terminal = () => {
  const [stores, setStores] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const initialFormState = {
    store_id: '',
    mac_address: '',
    is_active: true
  };
  
  const [formData, setFormData] = useState(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchStores();
    fetchTerminals();
  }, []);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setStores(data || []);
    } catch (err) {
      console.error('Error fetching stores:', err);
      toast.error('Failed to load stores');
    }
  };

  const fetchTerminals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('terminals')
        .select(`
          *,
          stores (name)
        `)
        .order('store_id', { ascending: true })
        .order('counter_id', { ascending: true });
        
      if (error) throw error;
      setTerminals(data || []);
    } catch (err) {
      console.error('Error fetching terminals:', err);
      toast.error('Failed to load terminals');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (terminal) => {
    setFormData({
      store_id: terminal.store_id,
      mac_address: terminal.mac_address,
      is_active: terminal.status === 'ACTIVE'
    });
    setEditingId(terminal.id);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.store_id) {
      toast.error('Please select a store');
      return;
    }
    
    try {
      const status = formData.is_active ? 'ACTIVE' : 'INACTIVE';
      
      if (isEditing) {
        const { error } = await supabase
          .from('terminals')
          .update({
            mac_address: formData.mac_address,
            status
          })
          .eq('id', editingId);
          
        if (error) throw error;
        toast.success('Terminal updated successfully');
      } else {
        // Find all existing terminals across all stores to generate next globally unique counter_id
        const { data: allTerminals, error: fetchErr } = await supabase
          .from('terminals')
          .select('counter_id');
          
        if (fetchErr) throw fetchErr;
        
        // Generate counter_id (e.g., '01', '02', '03')
        let nextCounter = 1;
        if (allTerminals && allTerminals.length > 0) {
          const maxCounter = Math.max(...allTerminals.map(t => parseInt(t.counter_id) || 0));
          nextCounter = maxCounter + 1;
        }
        
        const counter_id = nextCounter.toString().padStart(2, '0');
        
        const { error } = await supabase
          .from('terminals')
          .insert([{
            store_id: formData.store_id,
            mac_address: formData.mac_address,
            counter_id,
            status
          }]);
          
        if (error) throw error;
        toast.success('Terminal added successfully');
      }
      
      handleCancel();
      fetchTerminals();
    } catch (err) {
      console.error('Error saving terminal:', err);
      toast.error('Failed to save terminal');
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      
      <div className="page-header" style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', padding: '15px', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
          Terminals
        </h2>
      </div>

      <div className="form-container" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '30px' }}>
        <form onSubmit={handleSubmit}>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>Store</label>
            <CustomSelect 
              value={formData.store_id}
              onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', outline: 'none', borderBottom: '1px dashed #ccc' }}
              disabled={isEditing}
            >
              <option value="">-- Select Store --</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </CustomSelect>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>MAC Address <span style={{ color: 'red' }}>*</span></label>
            <input 
              type="text" 
              value={formData.mac_address}
              onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', outline: 'none', borderBottom: '1px dashed #ccc' }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              id="is_active"
              style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
            />
            <label htmlFor="is_active" style={{ fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>Is Active</label>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
            <button 
              type="submit" 
              className="btn-theme" 
              style={{ padding: '8px 30px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {isEditing ? 'Update' : 'Add'}
            </button>
            <button 
              type="button" 
              onClick={handleCancel} 
              className="btn-danger" 
              style={{ padding: '8px 30px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {isEditing ? 'Close' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--card-bg)' }}>
        <div style={{ overflowX: 'auto', minHeight: '300px', paddingBottom: '50px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left', minWidth: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '12px 10px' }}>Store Name</th>
                <th style={{ padding: '12px 10px' }}>Counter ID</th>
                <th style={{ padding: '12px 10px' }}>MAC Address</th>
                <th style={{ padding: '12px 10px' }}>Status</th>
                <th style={{ padding: '12px 10px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '36px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <img src="https://ik.imagekit.io/eg7u6xcn0u/Shopping-Cart.gif" alt="Loading..." style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
                      <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-primary, #2e6f40)' }}>Loading terminals...</span>
                    </div>
                  </td>
                </tr>
              ) : terminals.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No terminals found</td></tr>
              ) : (
                terminals.map((terminal) => (
                  <tr key={terminal.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 10px' }}>{terminal.stores?.name}</td>
                    <td style={{ padding: '12px 10px' }}>{terminal.counter_id}</td>
                    <td style={{ padding: '12px 10px' }}>{terminal.mac_address}</td>
                    <td style={{ padding: '12px 10px' }}>{terminal.status}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleEdit(terminal)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
