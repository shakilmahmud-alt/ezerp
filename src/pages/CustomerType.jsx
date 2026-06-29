import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { Check, X } from 'lucide-react';

const initialFormState = {
  name: '',
  discount_percent: 0,
  promo_price: 'MRP',
  scan_card_on_sale: false,
  send_sms_to_customer: false,
  visible_in_pos: false,
  other_promotion_applicable: false,
  accounts_head_creation: false,
  welcome_sms: false
};

const CustomerType = () => {
  const [view, setView] = useState('list');
  const [customerTypes, setCustomerTypes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (view === 'list') {
      fetchCustomerTypes();
    }
  }, [view]);

  const fetchCustomerTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_types')
        .select('*')
        .order('code', { ascending: true });
      if (error) throw error;
      setCustomerTypes(data || []);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to fetch Customer Types: ${err.message || err.toString()}`);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }
    setIsLoading(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('customer_types')
          .update({
            name: formData.name,
            discount_percent: formData.discount_percent,
            promo_price: formData.promo_price,
            scan_card_on_sale: formData.scan_card_on_sale,
            send_sms_to_customer: formData.send_sms_to_customer,
            visible_in_pos: formData.visible_in_pos,
            other_promotion_applicable: formData.other_promotion_applicable,
            accounts_head_creation: formData.accounts_head_creation,
            welcome_sms: formData.welcome_sms,
            updated_at: new Date()
          })
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success('Customer Type updated successfully');
      } else {
        // Generate new code
        let newCode = '001';
        const { data: lastRecord } = await supabase
          .from('customer_types')
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
          .from('customer_types')
          .insert([{
            code: newCode,
            name: formData.name,
            discount_percent: formData.discount_percent,
            promo_price: formData.promo_price,
            scan_card_on_sale: formData.scan_card_on_sale,
            send_sms_to_customer: formData.send_sms_to_customer,
            visible_in_pos: formData.visible_in_pos,
            other_promotion_applicable: formData.other_promotion_applicable,
            accounts_head_creation: formData.accounts_head_creation,
            welcome_sms: formData.welcome_sms
          }]);
          
        if (error) throw error;
        toast.success('Customer Type added successfully');
      }
      setView('list');
    } catch (err) {
      console.error(err);
      toast.error('Error saving customer type');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (type) => {
    setFormData({
      name: type.name,
      discount_percent: type.discount_percent,
      promo_price: type.promo_price,
      scan_card_on_sale: type.scan_card_on_sale,
      send_sms_to_customer: type.send_sms_to_customer,
      visible_in_pos: type.visible_in_pos,
      other_promotion_applicable: type.other_promotion_applicable,
      accounts_head_creation: type.accounts_head_creation,
      welcome_sms: type.welcome_sms
    });
    setEditingId(type.id);
    setView('add');
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
              {editingId ? 'Edit Customer Type' : 'Add Customer Type'}
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
                  Discount(%) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  className="input-animated"
                  style={{ width: '100%' }}
                  value={formData.discount_percent}
                  onChange={e => setFormData({...formData, discount_percent: parseFloat(e.target.value) || 0})}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--accent-primary)' }}>
                  Promo Price <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select 
                  className="input-animated"
                  style={{ width: '100%', borderBottom: '2px solid var(--accent-primary)' }}
                  value={formData.promo_price}
                  onChange={e => setFormData({...formData, promo_price: e.target.value})}
                  required
                >
                  <option value="MRP">MRP</option>
                  <option value="Wholesale">Wholesale</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={formData.scan_card_on_sale} onChange={e => setFormData({...formData, scan_card_on_sale: e.target.checked})} style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
                  Scan Card On Sale
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={formData.send_sms_to_customer} onChange={e => setFormData({...formData, send_sms_to_customer: e.target.checked})} style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
                  Send SMS To Customer
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={formData.visible_in_pos} onChange={e => setFormData({...formData, visible_in_pos: e.target.checked})} style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
                  Visible in POS
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={formData.other_promotion_applicable} onChange={e => setFormData({...formData, other_promotion_applicable: e.target.checked})} style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
                  Other Promotion Applicable
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={formData.accounts_head_creation} onChange={e => setFormData({...formData, accounts_head_creation: e.target.checked})} style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
                  Accounts Head Creation
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={formData.welcome_sms} onChange={e => setFormData({...formData, welcome_sms: e.target.checked})} style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
                  Welcome SMS
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Customer Type</h2>
        <button 
          className="btn-theme" 
          onClick={() => { setFormData(initialFormState); setEditingId(null); setView('add'); }}
          style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
        >
          + Add New
        </button>
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
                <th style={{ padding: '12px 15px' }}>Discount(%)</th>
                <th style={{ padding: '12px 15px' }}>Promo Price</th>
                <th style={{ padding: '12px 15px', textAlign: 'center' }}>Visible in POS</th>
                <th style={{ padding: '12px 15px', textAlign: 'center' }}>Send SMS To Customer</th>
                <th style={{ padding: '12px 15px', textAlign: 'center' }}>Other Promotion Applicable</th>
                <th style={{ padding: '12px 15px', textAlign: 'center' }}>Accounts Head Creation</th>
                <th style={{ padding: '12px 15px', textAlign: 'center' }}>Welcome SMS</th>
                <th style={{ padding: '12px 15px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {customerTypes.map((type, idx) => (
                <tr key={type.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 15px' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 15px' }}>{type.code}</td>
                  <td style={{ padding: '10px 15px' }}>{type.name}</td>
                  <td style={{ padding: '10px 15px' }}>{type.discount_percent}</td>
                  <td style={{ padding: '10px 15px' }}>{type.promo_price}</td>
                  <td style={{ padding: '10px 15px', textAlign: 'center' }}><BooleanIcon value={type.visible_in_pos} /></td>
                  <td style={{ padding: '10px 15px', textAlign: 'center' }}><BooleanIcon value={type.send_sms_to_customer} /></td>
                  <td style={{ padding: '10px 15px', textAlign: 'center' }}><BooleanIcon value={type.other_promotion_applicable} /></td>
                  <td style={{ padding: '10px 15px', textAlign: 'center' }}><BooleanIcon value={type.accounts_head_creation} /></td>
                  <td style={{ padding: '10px 15px', textAlign: 'center' }}><BooleanIcon value={type.welcome_sms} /></td>
                  <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                    <span 
                      style={{ cursor: 'pointer', color: 'var(--text-secondary)', textDecoration: 'underline' }}
                      onClick={() => handleEdit(type)}
                    >
                      Edit
                    </span>
                  </td>
                </tr>
              ))}
              {customerTypes.length === 0 && (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                    No Customer Types Found
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

export default CustomerType;
