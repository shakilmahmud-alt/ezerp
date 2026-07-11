import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import CustomSelect from '../components/CustomSelect';

const SectionWrapper = ({ title, children }) => (
  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', backgroundColor: 'var(--card-bg)', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
    {title && (
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
      </div>
    )}
    {children}
  </div>
);

const StoreTransferPermission = () => {
  // Mock Auth State (for demonstration)
  const [isAdmin, setIsAdmin] = useState(true);

  const [stores, setStores] = useState([]);
  const [selectedFromStore, setSelectedFromStore] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // permissions[fromStoreId] = array of toStoreIds
  const [permissions, setPermissions] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchStores();
    
    // Load dummy permissions from localStorage if available
    const saved = localStorage.getItem('storePermissions');
    if (saved) {
      setPermissions(JSON.parse(saved));
    }
  }, []);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, contact_no, address, email')
        .eq('status', 'ACTIVE')
        .order('name');
      
      if (error) throw error;
      setStores(data || []);
    } catch (err) {
      console.error('Error fetching stores:', err);
    }
  };

  const handleTogglePermission = (toStoreId) => {
    if (!isAdmin) return;
    
    setPermissions(prev => {
      const currentPerms = prev[selectedFromStore] || [];
      const newPerms = currentPerms.includes(toStoreId)
        ? currentPerms.filter(id => id !== toStoreId)
        : [...currentPerms, toStoreId];
      
      return { ...prev, [selectedFromStore]: newPerms };
    });
  };

  const handleSave = () => {
    if (!isAdmin) return;
    setIsSaving(true);
    setTimeout(() => {
      localStorage.setItem('storePermissions', JSON.stringify(permissions));
      setIsSaving(false);
      toast.success('Permissions saved successfully!');
    }, 500);
  };

  const availableToStores = stores.filter(s => s.id !== selectedFromStore && s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const currentPermissions = permissions[selectedFromStore] || [];

  if (!isAdmin) {
    return (
      <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '10px' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-secondary)' }}>You do not have permission to view or edit this page.</p>
          <button className="btn-theme" onClick={() => setIsAdmin(true)} style={{ marginTop: '20px', padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Switch to Admin Mode (Demo)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)' }}>
      {/* Mock Admin Switch */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
          Admin Mode
        </label>
      </div>

      <SectionWrapper title="Store Transfer Permission">
        <div style={{ marginBottom: '30px', maxWidth: '300px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', color: 'var(--accent-primary)' }}>Delivery From</label>
          <CustomSelect 
            className="input-animated"
            value={selectedFromStore} 
            onChange={(e) => setSelectedFromStore(e.target.value)}
            style={{ borderBottomColor: 'var(--accent-primary)' }}
          >
            <option value="" disabled>-- Select a Store --</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </CustomSelect>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '20px', color: 'var(--text-primary)' }}>Permission Details</h4>
          
          <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '400px' }}>
            <input 
              type="text" 
              placeholder="Search" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-animated"
              style={{ border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px 10px 10px 35px' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px', width: '50px' }}>SL</th>
                  <th style={{ padding: '12px', width: '50px' }}><input type="checkbox" disabled /></th>
                  <th style={{ padding: '12px' }}>Delivery To</th>
                  <th style={{ padding: '12px' }}>Contact No</th>
                  <th style={{ padding: '12px' }}>Address</th>
                  <th style={{ padding: '12px' }}>Email</th>
                </tr>
              </thead>
              <tbody>
                {availableToStores.map((store, index) => {
                  const isChecked = currentPermissions.includes(store.id);
                  return (
                    <tr key={store.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: isChecked ? 'rgba(46, 111, 64, 0.02)' : 'transparent' }}>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{index + 1}</td>
                      <td style={{ padding: '12px' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleTogglePermission(store.id)}
                          style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{store.name}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{store.contact_no}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{store.address}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{store.email}</td>
                    </tr>
                  );
                })}
                {availableToStores.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No matching stores found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button className="btn-theme" 
              onClick={handleSave}
              disabled={isSaving}
              style={{ padding: '10px 30px', backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
};

export default StoreTransferPermission;
